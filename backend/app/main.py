import os
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.services.model_manager import ModelManager
from app.routers import predict

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SAMPLES_DIR = os.path.join(_REPO_ROOT, "data", "images", "valid")


@asynccontextmanager
async def lifespan(app: FastAPI):
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
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(predict.router)

# 샘플 이미지 정적 파일 서빙
if os.path.isdir(SAMPLES_DIR):
    app.mount("/static/samples", StaticFiles(directory=SAMPLES_DIR), name="samples")
