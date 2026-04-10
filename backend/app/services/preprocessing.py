"""
SAM-3 기반 단일 이미지 전처리.
sam3_preprocessing.py의 run_sam3_preprocessing() 핵심 로직을 추출하여
파일 I/O 없이 in-memory로 동작하도록 리팩토링.
"""
import asyncio
from dataclasses import dataclass

import cv2
import numpy as np
import torch
from PIL import Image


@dataclass
class CropResult:
    crop_image: np.ndarray               # RGB numpy array (H, W, 3)
    crop_coords: tuple[int, int, int, int]  # (x1, y1, x2, y2) 원본 이미지 좌표
    original_size: tuple[int, int]        # (resized_w, resized_h)
    score: float
    mode: str                             # "roi" | "instance"


def _run_sam3(sam_processor, pil_image: Image.Image, prompt: str) -> dict:
    """blocking SAM-3 추론 — asyncio.to_thread()로 호출."""
    device = "cuda" if torch.cuda.is_available() else "cpu"
    with torch.inference_mode(), torch.amp.autocast(device):
        inference_state = sam_processor.set_image(pil_image)
        output = sam_processor.set_text_prompt(state=inference_state, prompt=prompt)
    return output


async def preprocess_single_image(
    image_rgb: np.ndarray,
    sam_processor,
    is_instance: bool,
    sam_thres: float = 0.5,
    margin_ratio: float = 0.15,
    sam_input_size: int = 1024,
) -> list[CropResult]:
    mode_str = "instance" if is_instance else "roi"
    prompt = "teeth" if is_instance else "The complete intraoral area including all teeth and gingiva"

    # 1. 이미지 리사이즈 (sam_input_size 기준)
    orig_h_pre, orig_w_pre = image_rgb.shape[:2]
    pil_image = Image.fromarray(image_rgb)
    pil_image.thumbnail((sam_input_size, sam_input_size), Image.Resampling.LANCZOS)
    img_np = np.array(pil_image)
    img_h, img_w = img_np.shape[:2]
    print(f"[preproc] SAM-3 input  — {orig_w_pre}×{orig_h_pre}  →  {img_w}×{img_h}  (thumbnail {sam_input_size})")

    # 2. SAM-3 추론 (blocking → thread)
    output = await asyncio.to_thread(_run_sam3, sam_processor, pil_image, prompt)

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

        # 5. 크롭 (in-memory)
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
