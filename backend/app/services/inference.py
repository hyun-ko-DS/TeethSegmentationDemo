"""
WMF(Weighted Mask Fusion) 앙상블 단일 이미지 추론.
ensemble.py의 핵심 로직을 추출하여 파일 I/O 없이 in-memory로 동작하도록 리팩토링.

핵심 변경: r.path 기반 메타데이터 파일 역조회 →
          CropResult 인덱스 기반 1:1 직접 매핑으로 교체.
"""
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
    polygon: list[list[float]]   # [[x_norm, y_norm], ...] 정규화 좌표


# ============================================================
# WMF 유틸리티 (ensemble.py에서 이식, 수정 없음)
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
    """
    WMF 앙상블 수행.
    model_outputs: 모델별 detection 딕셔너리 리스트
                   각 dict: {class_id, confidence, poly (정규화 polygon 문자열)}
    반환: 앙상블된 detection 딕셔너리 리스트 (confidence 내림차순)
    """
    weights = config.weights
    num_models = len(model_outputs)

    # [Step 1] 클러스터링
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

    # [Step 2] 융합
    ensemble_results: list[dict] = []
    for cluster in clusters:
        if len(cluster) < 2:  # 최소 2개 모델 동의 필요
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
# 단일 이미지 추론 메인 함수
# ============================================================

async def infer_single_image(
    original_image_rgb: np.ndarray,
    roi_crops: list[CropResult],
    yolo_models: dict,
    config: dict,
) -> tuple[list[PredictionResult], int]:
    """
    단일 원본 이미지에 대해 ROI 기반 3개 모델(model_365, model_357, model_355) 앙상블 추론.

    Args:
        original_image_rgb: 원본 RGB 이미지 (H, W, 3)
        roi_crops: SAM-3 ROI 전처리 결과
        yolo_models: 로딩된 YOLO 모델 딕셔너리
        config: config.json 내용

    Returns:
        (PredictionResult 리스트, 처리 시간 ms)
    """
    start_time = time.time()

    orig_h, orig_w = original_image_rgb.shape[:2]
    wmf_config = WMFConfig(config, orig_w, orig_h)

    all_model_detections: list[list[dict]] = []

    for mc in MODEL_CONFIGS:
        name = mc["name"]
        if name not in yolo_models:
            all_model_detections.append([])
            continue

        model = yolo_models[name]
        crops = roi_crops  # 모든 모델이 ROI 기반

        if not crops:
            all_model_detections.append([])
            continue

        imgsz = config["roi_image_size"]
        model_detections: list[dict] = []

        # 핵심 변경: 파일 경로 대신 numpy 배열로 직접 predict,
        # r.path 대신 crop 인덱스로 crop_coords 직접 접근
        for crop in crops:
            crop_bgr = cv2.cvtColor(crop.crop_image, cv2.COLOR_RGB2BGR)
            x_off, y_off = crop.crop_coords[0], crop.crop_coords[1]
            crop_w = crop.crop_coords[2] - crop.crop_coords[0]
            crop_h = crop.crop_coords[3] - crop.crop_coords[1]

            results = model.predict(
                source=crop_bgr,
                imgsz=imgsz,
                conf=config["conf_thres"],
                iou=config["iou_thres"],
                retina_masks=False,
                verbose=False,
            )

            for r in results:
                if r.masks is None:
                    continue
                for i, mask_coords in enumerate(r.masks.xy):
                    # crop 좌표계 → 원본 이미지 좌표계로 역변환
                    global_pts = mask_coords.copy()
                    global_pts[:, 0] += x_off
                    global_pts[:, 1] += y_off

                    # 정규화 (원본 이미지 크기 기준)
                    norm_poly = global_pts.copy()
                    norm_poly[:, 0] /= orig_w
                    norm_poly[:, 1] /= orig_h
                    norm_poly = np.clip(norm_poly, 0.0, 1.0)

                    model_detections.append({
                        "class_id": int(r.boxes.cls[i]),
                        "confidence": float(r.boxes.conf[i]),
                        "poly": " ".join(map(str, norm_poly.flatten())),
                    })

        all_model_detections.append(model_detections)

    # WMF 앙상블
    ensemble_raw = perform_wmf_direct(all_model_detections, wmf_config)

    # PredictionResult 변환
    predictions: list[PredictionResult] = []
    for det in ensemble_raw:
        cid = det["class_id"]
        coords = np.array(list(map(float, det["poly"].split()))).reshape(-1, 2)
        polygon = coords.tolist()
        predictions.append(PredictionResult(
            class_id=cid,
            class_name=CLASS_NAMES[cid] if cid < len(CLASS_NAMES) else f"Class {cid}",
            confidence=det["confidence"],
            polygon=polygon,
        ))

    elapsed_ms = int((time.time() - start_time) * 1000)
    return predictions, elapsed_ms
