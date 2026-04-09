import io

import numpy as np
from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image

from app.schemas.prediction import (
    ClassInfo,
    ClassesResponse,
    HealthResponse,
    PredictResponse,
    PredictionItem,
)
from app.services.inference import infer_single_image
from app.services.model_manager import CLASS_NAMES, ModelManager
from app.services.preprocessing import preprocess_single_image

router = APIRouter()

MAX_IMAGE_BYTES = 20 * 1024 * 1024  # 20MB


@router.get("/health", response_model=HealthResponse)
async def health():
    mm = ModelManager.get_instance()
    return HealthResponse(
        status="ok",
        models_loaded=mm.is_ready,
        model_count=len(mm.yolo_models),
        sam_loaded=mm.sam_processor is not None,
    )


@router.get("/classes", response_model=ClassesResponse)
async def classes():
    mm = ModelManager.get_instance()
    colors = mm.config.get("colors", [[1.0, 1.0, 1.0]] * 9)
    return ClassesResponse(
        classes=[
            ClassInfo(class_id=i, class_name=CLASS_NAMES[i], color=colors[i])
            for i in range(len(CLASS_NAMES))
        ]
    )


@router.post("/predict", response_model=PredictResponse)
async def predict(image: UploadFile = File(...)):
    mm = ModelManager.get_instance()
    if not mm.is_ready:
        raise HTTPException(status_code=503, detail="Models not loaded yet")

    # 1. 이미지 수신 및 검증
    raw_bytes = await image.read()
    if len(raw_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image size exceeds 20MB limit")

    try:
        pil_img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
        image_rgb = np.array(pil_img)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid image file")

    orig_h, orig_w = image_rgb.shape[:2]

    # 2. SAM-3 ROI 전처리
    if mm.sam_processor is None:
        raise HTTPException(status_code=503, detail="SAM-3 model not loaded")

    roi_crops = await preprocess_single_image(
        image_rgb=image_rgb,
        sam_processor=mm.sam_processor,
        is_instance=False,
        sam_thres=mm.config.get("sam_thres", 0.5),
    )

    if not roi_crops:
        raise HTTPException(status_code=422, detail="No teeth detected in the image")

    # 3. ROI 기반 3-모델 앙상블 추론
    predictions, elapsed_ms = await infer_single_image(
        original_image_rgb=image_rgb,
        roi_crops=roi_crops,
        yolo_models=mm.yolo_models,
        config=mm.config,
    )

    return PredictResponse(
        image_width=orig_w,
        image_height=orig_h,
        predictions=[
            PredictionItem(
                class_id=p.class_id,
                class_name=p.class_name,
                confidence=p.confidence,
                polygon=p.polygon,
            )
            for p in predictions
        ],
        processing_time_ms=elapsed_ms,
    )
