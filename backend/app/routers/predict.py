import asyncio
import io
import os
import time

import numpy as np
from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
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

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
_SAMPLES_DIR = os.path.join(_REPO_ROOT, "data", "images", "valid")
_SAMPLE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


@router.get("/samples")
async def list_samples():
    if not os.path.isdir(_SAMPLES_DIR):
        return JSONResponse(content={"filenames": []})
    filenames = sorted(
        f for f in os.listdir(_SAMPLES_DIR)
        if os.path.splitext(f)[1].lower() in _SAMPLE_EXTS
    )
    return JSONResponse(content={"filenames": filenames})


@router.get("/thumbnail/{filename}")
async def thumbnail(filename: str):
    from fastapi.responses import Response
    import re
    if not re.match(r'^[\w\-. ]+$', filename):
        raise HTTPException(status_code=400, detail="Invalid filename")
    filepath = os.path.join(_SAMPLES_DIR, filename)
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    img = Image.open(filepath).convert("RGB")
    img.thumbnail((320, 320), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=70)
    return Response(content=buf.getvalue(), media_type="image/jpeg")


@router.post("/predict-sample/{filename}", response_model=PredictResponse)
async def predict_sample(filename: str):
    """샘플 이미지를 서버에서 직접 읽어 추론 — 브라우저 업로드 왕복 없음."""
    import re
    if not re.match(r'^[\w\-. ]+$', filename):
        raise HTTPException(status_code=400, detail="Invalid filename")
    filepath = os.path.join(_SAMPLES_DIR, filename)
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="Sample not found")

    mm = ModelManager.get_instance()
    if not mm.is_ready:
        raise HTTPException(status_code=503, detail="Models not loaded yet")
    if mm.sam_processor is None:
        raise HTTPException(status_code=503, detail="SAM-3 model not loaded")

    t_pipeline_start = time.perf_counter()
    print("─" * 55)

    # [1] 서버 직접 파일 읽기 + 디코드 (blocking → thread)
    t0 = time.perf_counter()
    def _read_and_decode():
        raw = open(filepath, "rb").read()
        img = np.array(Image.open(io.BytesIO(raw)).convert("RGB"))
        return img, len(raw)
    image_rgb, raw_size = await asyncio.to_thread(_read_and_decode)
    orig_h, orig_w = image_rgb.shape[:2]
    t_read_s = time.perf_counter() - t0
    print(f"[1] 파일 읽기+디코드 {t_read_s:.2f}s  ({orig_w}×{orig_h}, {raw_size//1024} KB)")

    # [2] SAM-3 전처리
    t0 = time.perf_counter()
    roi_crops = await preprocess_single_image(
        image_rgb=image_rgb,
        sam_processor=mm.sam_processor,
        is_instance=False,
        sam_thres=mm.config.get("sam_thres", 0.5),
        sam_input_size=mm.config.get("sam_input_size", 1024),

    )
    t_sam_s = time.perf_counter() - t0
    print(f"[2] SAM-3 전처리     {t_sam_s:.2f}s  ({len(roi_crops)} crop(s))")

    if not roi_crops:
        raise HTTPException(status_code=422, detail="No teeth detected in the image")

    # [3~5] YOLO 추론 + WMF 앙상블
    predictions, elapsed_ms = await infer_single_image(
        original_image_rgb=image_rgb,
        roi_crops=roi_crops,
        yolo_models=mm.yolo_models,
        config=mm.config,
    )

    # [6] 응답 직렬화
    t0 = time.perf_counter()
    response = PredictResponse(
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
    t_serial_s = time.perf_counter() - t0
    t_total_s = time.perf_counter() - t_pipeline_start
    print(f"[6] 응답 직렬화      {t_serial_s:.2f}s")
    print(f"─" * 55)
    print(f"    백엔드 총 소요    {t_total_s:.2f}s")
    print("─" * 55)
    return response


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
async def predict(request: Request, image: UploadFile = File(...)):
    mm = ModelManager.get_instance()
    if not mm.is_ready:
        raise HTTPException(status_code=503, detail="Models not loaded yet")

    t_pipeline_start = time.perf_counter()
    t_arrived   = getattr(request.state, "t_arrived",   t_pipeline_start)
    t_body_done = getattr(request.state, "t_body_done", t_pipeline_start)
    body_size   = getattr(request.state, "body_size",   0)
    print("─" * 55)

    # [0a] 네트워크 전송 + Starlette 바디 버퍼링
    t_0a_s = t_body_done - t_arrived
    print(f"[0a] 네트워크+버퍼링  {t_0a_s:.2f}s  ({body_size // 1024} KB 수신)")

    # [0b] multipart 파싱 + FastAPI 의존성 주입
    t_0b_s = t_pipeline_start - t_body_done
    print(f"[0b] multipart 파싱   {t_0b_s:.2f}s")

    # [1] 이미지 바디 읽기 (캐시된 버퍼에서 복사 — 거의 0s)
    t0 = time.perf_counter()
    raw_bytes = await image.read()
    if len(raw_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image size exceeds 20MB limit")
    t_upload_s = time.perf_counter() - t0
    print(f"[1] 이미지 수신       {t_upload_s:.2f}s  ({len(raw_bytes)/1024:.0f} KB)")

    # [2] 이미지 디코드 (blocking → thread)
    t0 = time.perf_counter()
    def _decode():
        return np.array(Image.open(io.BytesIO(raw_bytes)).convert("RGB"))
    try:
        image_rgb = await asyncio.to_thread(_decode)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid image file")
    orig_h, orig_w = image_rgb.shape[:2]
    t_decode_s = time.perf_counter() - t0
    print(f"[2] 이미지 디코드    {t_decode_s:.2f}s  ({orig_w}×{orig_h})")

    # [3] SAM-3 전처리
    if mm.sam_processor is None:
        raise HTTPException(status_code=503, detail="SAM-3 model not loaded")
    t0 = time.perf_counter()
    roi_crops = await preprocess_single_image(
        image_rgb=image_rgb,
        sam_processor=mm.sam_processor,
        is_instance=False,
        sam_thres=mm.config.get("sam_thres", 0.5),
        sam_input_size=mm.config.get("sam_input_size", 1024),

    )
    t_sam_s = time.perf_counter() - t0
    print(f"[3] SAM-3 전처리     {t_sam_s:.2f}s  ({len(roi_crops)} crop(s))")

    if not roi_crops:
        raise HTTPException(status_code=422, detail="No teeth detected in the image")

    # [4~6] YOLO 추론 + WMF 앙상블 (infer_single_image 내부에서 출력)
    predictions, elapsed_ms = await infer_single_image(
        original_image_rgb=image_rgb,
        roi_crops=roi_crops,
        yolo_models=mm.yolo_models,
        config=mm.config,
    )

    # [7] 응답 직렬화
    t0 = time.perf_counter()
    response = PredictResponse(
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
    t_serial_s = time.perf_counter() - t0
    print(f"[7] 응답 직렬화      {t_serial_s:.2f}s  ({len(predictions)} predictions)")

    t_total_s = time.perf_counter() - t_pipeline_start
    print(f"─" * 55)
    print(f"    백엔드 총 소요    {t_total_s:.2f}s")
    print("─" * 55)

    return response
