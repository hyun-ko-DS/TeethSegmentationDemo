from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.services.model_manager import ModelManager
from app.routers import predict


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
