"""
SAM-3 기반 단일 이미지 전처리.
sam3_preprocessing.py의 run_sam3_preprocessing() 핵심 로직을 추출하여
파일 I/O 없이 in-memory로 동작하도록 리팩토링.
"""
from dataclasses import dataclass

import cv2
import numpy as np
import torch
from PIL import Image


@dataclass
class CropResult:
    crop_image: np.ndarray               # RGB numpy array (H, W, 3)
    crop_coords: tuple[int, int, int, int]  # (x1, y1, x2, y2) 원본 이미지 좌표
    original_size: tuple[int, int]        # (original_w, original_h)
    score: float
    mode: str                             # "roi" | "instance"


async def preprocess_single_image(
    image_rgb: np.ndarray,
    sam_processor,
    is_instance: bool,
    sam_thres: float = 0.5,
    margin_ratio: float = 0.15,
) -> list[CropResult]:
    """
    단일 RGB 이미지를 SAM-3로 전처리하여 CropResult 리스트 반환.

    Args:
        image_rgb: RGB numpy array (H, W, 3). 원본 이미지.
        sam_processor: 초기화된 Sam3Processor 인스턴스.
        is_instance: True → 치아 인스턴스별 개별 크롭, False → 전체 구강 ROI 크롭.
        sam_thres: SAM-3 score 최소 임계값 (instance 모드에서 사용).
        margin_ratio: Bbox 주변 여백 비율 (기본 15%).

    Returns:
        CropResult 리스트. SAM-3 검출 실패 시 빈 리스트 반환.
    """
    mode_str = "instance" if is_instance else "roi"
    prompt = "teeth" if is_instance else "The complete intraoral area including all teeth and gingiva"

    # 1. 이미지 리사이즈 (최대 1024px, SAM-3 권장)
    pil_image = Image.fromarray(image_rgb)
    pil_image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    img_np = np.array(pil_image)
    img_h, img_w = img_np.shape[:2]

    # 2. SAM-3 추론
    with torch.inference_mode(), torch.amp.autocast("cuda" if torch.cuda.is_available() else "cpu"):
        inference_state = sam_processor.set_image(pil_image)
        output = sam_processor.set_text_prompt(state=inference_state, prompt=prompt)

    masks = output["masks"]
    scores = output["scores"]

    if len(masks) == 0:
        return []

    # 3. 처리할 마스크 목록 구성
    if is_instance:
        process_masks = [
            (masks[i].cpu().numpy().squeeze(), float(scores[i]), i)
            for i in range(len(masks))
            if scores[i] >= sam_thres
        ]
    else:
        combined_mask = torch.any(masks, dim=0).cpu().numpy().squeeze()
        avg_score = float(torch.mean(scores))
        process_masks = [(combined_mask, avg_score, None)]

    results: list[CropResult] = []

    for mask_2d, score, idx in process_masks:
        y_indices, x_indices = np.where(mask_2d > 0)
        if len(x_indices) == 0:
            continue

        # 4. Bbox + 여백 계산
        x_min, x_max = int(x_indices.min()), int(x_indices.max())
        y_min, y_max = int(y_indices.min()), int(y_indices.max())
        w_box, h_box = x_max - x_min, y_max - y_min
        pad_x, pad_y = int(w_box * margin_ratio), int(h_box * margin_ratio)

        x1 = max(0, x_min - pad_x)
        y1 = max(0, y_min - pad_y)
        x2 = min(img_w, x_max + pad_x)
        y2 = min(img_h, y_max + pad_y)

        # 5. 크롭 (in-memory, 파일 저장 없음)
        crop_rgb = img_np[y1:y2, x1:x2]

        results.append(
            CropResult(
                crop_image=crop_rgb,
                crop_coords=(x1, y1, x2, y2),
                original_size=(img_w, img_h),
                score=score,
                mode=mode_str,
            )
        )

    return results
