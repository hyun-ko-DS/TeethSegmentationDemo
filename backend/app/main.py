import os
import time

# CUDA 메모리 단편화 방지 — torch import 및 CUDA 컨텍스트 초기화 전에 설정해야 효과 있음.
# TensorRT execution context가 연속된 대용량 블록을 요구할 때 PyTorch 캐시가 방해하는 문제를 해결.
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.services.model_manager import ModelManager
from app.routers import predict
from app.routers import records as records_router
from app.db.database import init_db, RECORD_IMAGES_DIR

_REPO_ROOT   = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_VALID_DIR   = os.path.join(_REPO_ROOT, "data", "images", "valid")
_TEST_DIR    = os.path.join(_REPO_ROOT, "data", "images", "test")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await ModelManager.get_instance().initialize()
    yield


class RequestArrivalMiddleware(BaseHTTPMiddleware):
    """/predict POST 요청의 단계별 시각을 request.state에 기록."""
    async def dispatch(self, request: Request, call_next):
        request.state.t_arrived = time.perf_counter()
        if request.url.path == "/predict" and request.method == "POST":
            # 바디 전체를 수신·버퍼링하는 데 걸리는 시간 측정
            # request.body()는 결과를 캐시하므로 이후 UploadFile.read()도 정상 동작
            body = await request.body()
            request.state.t_body_done = time.perf_counter()
            request.state.body_size = len(body)
        return await call_next(request)


app = FastAPI(title="Teeth Segmentation API", lifespan=lifespan)

app.add_middleware(RequestArrivalMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["*"],
)

app.include_router(predict.router)
app.include_router(records_router.router)

# 샘플 이미지 정적 파일 서빙 (valid / test 분리)
if os.path.isdir(_VALID_DIR):
    app.mount("/static/samples/valid", StaticFiles(directory=_VALID_DIR), name="samples_valid")
if os.path.isdir(_TEST_DIR):
    app.mount("/static/samples/test", StaticFiles(directory=_TEST_DIR), name="samples_test")

# 진료 기록 이미지 서빙
if os.path.isdir(RECORD_IMAGES_DIR):
    app.mount("/static/record-images", StaticFiles(directory=RECORD_IMAGES_DIR), name="record_images")
