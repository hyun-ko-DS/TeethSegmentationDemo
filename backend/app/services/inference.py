"""
WMF(Weighted Mask Fusion) 앙상블 단일 이미지 추론.
- YOLO 3개 모델: asyncio.gather() 병렬 실행 + asyncio.to_thread()로 비블로킹
- WMF 앙상블: asyncio.to_thread()로 비블로킹
"""
import asyncio
from dataclasses import dataclass
import time

import cv2
import numpy as np

from app.services.preprocessing import CropResult
from app.services.model_manager import CLASS_NAMES, MODEL_CONFIGS


# ============================================================
# 데이터 클래스
# ============================================================

@dataclass
class PredictionResult:
    class_id: int
    class_name: str
    confidence: float
    polygon: list[list[float]]


# ============================================================
# WMF 유틸리티
# ============================================================

class WMFConfig:
    def __init__(self, config: dict, target_w: int, target_h: int):
        self.canvas_w = target_w
        self.canvas_h = target_h
        self.iou_thr = config["wmf_iou_thres"]
        self.mask_thr = config["wmf_mask_thres"]
        self.weights = config["wmf_weights"]
        self.single_model_thr = config["wmf_single_model_thres"]
        self.agreement_boost_thr = config["wmf_agreement_boost_thres"]


def poly_to_mask(poly_str: str, config: WMFConfig) -> np.ndarray:
    mask = np.zeros((config.canvas_h, config.canvas_w), dtype=np.float32)
    try:
        coords = np.array(list(map(float, poly_str.split()))).reshape(-1, 2)
        coords[:, 0] *= config.canvas_w
        coords[:, 1] *= config.canvas_h
        pts = coords.astype(np.int32).reshape((-1, 1, 2))
        cv2.fillPoly(mask, [pts], 1.0)
    except Exception:
        pass
    return mask


def mask_to_poly(mask: np.ndarray, config: WMFConfig) -> str:
    mask_ui8 = (mask > 0).astype(np.uint8)
    contours, _ = cv2.findContours(mask_ui8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return ""
    cnt = max(contours, key=cv2.contourArea)
    poly = cnt.reshape(-1, 2).astype(np.float32)
    poly[:, 0] /= config.canvas_w
    poly[:, 1] /= config.canvas_h
    return " ".join(map(str, poly.flatten()))


def get_iou(m1: np.ndarray, m2: np.ndarray) -> float:
    intersection = np.logical_and(m1, m2).sum()
    union = np.logical_or(m1, m2).sum()
    return float(intersection / union) if union > 0 else 0.0


def perform_wmf_direct(
    model_outputs: list[list[dict]],
    config: WMFConfig,
) -> list[dict]:
    weights = config.weights
    num_models = len(model_outputs)

    clusters: list[list[dict]] = []
    for model_idx, detections in enumerate(model_outputs):
        weight = weights[model_idx] if model_idx < len(weights) else 1.0 / num_models
        for det in detections:
            det_mask = poly_to_mask(det["poly"], config)
            det["mask"] = det_mask
            det["model_weight"] = weight

            matched = False
            for cluster in clusters:
                if det["class_id"] == cluster[0]["class_id"]:
                    iou = get_iou(det_mask, cluster[0]["mask"])
                    if iou >= config.iou_thr:
                        cluster.append(det)
                        matched = True
                        break
            if not matched:
                clusters.append([det])

    ensemble_results: list[dict] = []
    for cluster in clusters:
        if len(cluster) < 2:
            continue

        fused_mask = np.zeros((config.canvas_h, config.canvas_w), dtype=np.float32)
        total_weight, weighted_conf = 0.0, 0.0

        for det in cluster:
            w = det["model_weight"]
            fused_mask += det["mask"] * w
            weighted_conf += det["confidence"] * w
            total_weight += w

        avg_conf = weighted_conf / total_weight
        agreement_ratio = len(cluster) / num_models
        final_conf = avg_conf * (agreement_ratio ** config.agreement_boost_thr)

        fused_mask /= total_weight
        fused_mask = cv2.GaussianBlur(fused_mask, (3, 3), 0)
        final_mask = (fused_mask >= config.mask_thr).astype(np.uint8)

        final_poly = mask_to_poly(final_mask, config)
        if final_poly:
            ensemble_results.append({
                "class_id": cluster[0]["class_id"],
                "confidence": float(final_conf),
                "poly": final_poly,
            })

    ensemble_results.sort(key=lambda x: x["confidence"], reverse=True)
    return ensemble_results


# ============================================================
# 단일 모델 추론 (병렬 실행 단위)
# ============================================================

def _predict_crop(model, crop_bgr: np.ndarray, imgsz: int, config: dict) -> list:
    """blocking YOLO 추론 — asyncio.to_thread()로 호출."""
    return model.predict(
        source=crop_bgr,
        imgsz=imgsz,
        conf=config["conf_thres"],
        iou=config["iou_thres"],
        retina_masks=False,
        verbose=False,
    )


async def _run_model(
    name: str,
    model,
    crops: list[CropResult],
    config: dict,
    orig_w: int,
    orig_h: int,
    model_num: int,
) -> list[dict]:
    """단일 YOLO 모델 추론 — thread에서 실행하여 이벤트 루프 비블로킹."""
    imgsz = config["roi_image_size"]
    model_detections: list[dict] = []
    t_start = time.perf_counter()

    for crop in crops:
        crop_bgr = cv2.cvtColor(crop.crop_image, cv2.COLOR_RGB2BGR)
        crop_h_px, crop_w_px = crop_bgr.shape[:2]
        x_off, y_off = crop.crop_coords[0], crop.crop_coords[1]
        resized_w, resized_h = crop.original_size
        print(f"    {name} crop: {crop_w_px}×{crop_h_px} → imgsz={imgsz}")

        results = await asyncio.to_thread(_predict_crop, model, crop_bgr, imgsz, config)

        for r in results:
            if r.masks is None:
                continue
            for i, mask_coords in enumerate(r.masks.xy):
                global_pts = mask_coords.copy()
                global_pts[:, 0] += x_off
                global_pts[:, 1] += y_off
                global_pts[:, 0] *= orig_w / resized_w
                global_pts[:, 1] *= orig_h / resized_h
                norm_poly = global_pts.copy()
                norm_poly[:, 0] /= orig_w
                norm_poly[:, 1] /= orig_h
                norm_poly = np.clip(norm_poly, 0.0, 1.0)
                model_detections.append({
                    "class_id": int(r.boxes.cls[i]),
                    "confidence": float(r.boxes.conf[i]),
                    "poly": " ".join(map(str, norm_poly.flatten())),
                })

    t_s = time.perf_counter() - t_start
    print(f"[{model_num}] YOLO {name}   {t_s:.2f}s  ({len(model_detections)} detections)")
    return model_detections


# ============================================================
# 단일 이미지 추론 메인 함수
# ============================================================

async def infer_single_image(
    original_image_rgb: np.ndarray,
    roi_crops: list[CropResult],
    yolo_models: dict,
    config: dict,
) -> tuple[list[PredictionResult], int]:
    t_total_start = time.perf_counter()

    orig_h, orig_w = original_image_rgb.shape[:2]

    roi_sz = config["roi_image_size"]
    scale = roi_sz / max(orig_w, orig_h)
    canvas_w = round(orig_w * scale)
    canvas_h = round(orig_h * scale)
    wmf_config = WMFConfig(config, canvas_w, canvas_h)
    print(f"    WMF canvas: {canvas_w}×{canvas_h}  (원본 {orig_w}×{orig_h}, scale={scale:.3f})")

    # YOLO 3개 모델 병렬 실행
    t_yolo_start = time.perf_counter()
    tasks = []
    model_nums = {mc["name"]: i + 4 for i, mc in enumerate(MODEL_CONFIGS)}
    async def _empty() -> list[dict]:
        return []

    for mc in MODEL_CONFIGS:
        name = mc["name"]
        if name not in yolo_models or not roi_crops:
            print(f"    {name}  — skipped")
            tasks.append(_empty())
        else:
            tasks.append(_run_model(
                name, yolo_models[name], roi_crops,
                config, orig_w, orig_h, model_nums[name],
            ))

    all_model_detections: list[list[dict]] = list(await asyncio.gather(*tasks))
    t_yolo_s = time.perf_counter() - t_yolo_start
    print(f"    YOLO 3모델 병렬 완료  {t_yolo_s:.2f}s")

    # WMF 앙상블 (blocking → thread)
    total_dets = sum(len(d) for d in all_model_detections)
    t_wmf_start = time.perf_counter()
    ensemble_raw = await asyncio.to_thread(perform_wmf_direct, all_model_detections, wmf_config)
    t_wmf_s = time.perf_counter() - t_wmf_start
    print(f"[6] WMF 앙상블        {t_wmf_s:.2f}s  ({total_dets} dets → {len(ensemble_raw)} fused)")

    # PredictionResult 변환
    predictions: list[PredictionResult] = []
    for det in ensemble_raw:
        cid = det["class_id"]
        coords = np.array(list(map(float, det["poly"].split()))).reshape(-1, 2)
        predictions.append(PredictionResult(
            class_id=cid,
            class_name=CLASS_NAMES[cid] if cid < len(CLASS_NAMES) else f"Class {cid}",
            confidence=det["confidence"],
            polygon=coords.tolist(),
        ))

    elapsed_ms = int((time.perf_counter() - t_total_start) * 1000)
    print(f"    추론+앙상블 소계   {elapsed_ms / 1000:.2f}s")
    return predictions, elapsed_ms
