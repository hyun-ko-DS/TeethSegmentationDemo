import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.services.model_manager import ModelManager
from app.routers import predict

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SAMPLES_DIR = os.path.join(_REPO_ROOT, "data", "images", "valid")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ModelManager.get_instance().initialize()
    yield


app = FastAPI(title="Teeth Segmentation API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(predict.router)

# 샘플 이미지 정적 파일 서빙
if os.path.isdir(SAMPLES_DIR):
    app.mount("/static/samples", StaticFiles(directory=SAMPLES_DIR), name="samples")
