import os
import sys
from typing import Optional

import torch
from ultralytics import YOLO

# backend/ 루트를 sys.path에 추가해서 caf, utils import 가능하도록
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

from utils import load_config  # noqa: E402

# 모델 .pt 파일이 __main__에서 정의된 커스텀 클래스를 포함하고 있어
# torch.load 역직렬화 시 __main__ 네임스페이스에서 찾으므로 명시적으로 등록
import __main__
from caf import CAFBlock, ACFM, MSNN, ChannelShuffle
__main__.CAFBlock = CAFBlock
__main__.ACFM = ACFM
__main__.MSNN = MSNN
__main__.ChannelShuffle = ChannelShuffle

from app.core.config import settings


CLASS_INFO = {
    0: "Abrasion",
    1: "Filling",
    2: "Crown",
    3: "Caries Class 1",
    4: "Caries Class 2",
    5: "Caries Class 3",
    6: "Caries Class 4",
    7: "Caries Class 5",
    8: "Caries Class 6",
}
CLASS_NAMES = [CLASS_INFO[i] for i in range(len(CLASS_INFO))]

# model_360(instance 전용)은 파이프라인에서 제외 — ROI 기반 3개 모델만 사용
# weight_type을 per-model로 오버라이드 가능 (미지정 시 settings.weight_type 사용)
# RTX 2000 Ada (15.6 GB): SAM-3(3.4) + 365-engine(4.2) + 357-engine(3.8) = 11.4 GB
#   → model_355는 TRT 4.3 GB 추가 시 OOM → pt fallback (동적 할당으로 추론 시 ~1-2 GB)
MODEL_CONFIGS = [
    {"name": "model_365", "is_roi": True},
    {"name": "model_357", "is_roi": True},
    {"name": "model_355", "is_roi": True, "weight_type": "pt"},  # TRT OOM fallback
]


class ModelManager:
    _instance: Optional["ModelManager"] = None

    def __init__(self):
        self.yolo_models: dict[str, YOLO] = {}
        self.is_roi_map: dict[str, bool] = {}
        self.sam_processor = None
        self.config: dict = {}
        self._initialized = False

    @classmethod
    def get_instance(cls) -> "ModelManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def initialize(self):
        if self._initialized:
            return

        print("🚀 Initializing ModelManager...")

        # 1. config.json 로딩
        config_path = settings.config_path
        if not os.path.isabs(config_path):
            config_path = os.path.join(_BACKEND_ROOT, config_path)
        self.config = load_config(config_path)
        print(f"✅ Config loaded from {config_path}")

        # 2. SAM-3 먼저 로딩 — TensorRT보다 먼저 GPU 메모리 확보
        #    (TensorRT engine은 execution context 생성 시 메모리를 통째로 예약하므로
        #     SAM-3를 나중에 로드하면 OOM 발생)
        try:
            from huggingface_hub import login
            from sam3.model_builder import build_sam3_image_model
            from sam3.model.sam3_image_processor import Sam3Processor

            if settings.huggingface_api_key:
                login(token=settings.huggingface_api_key, add_to_git_credential=False)

            device = "cuda" if torch.cuda.is_available() else "cpu"
            if torch.cuda.is_available():
                free, total = torch.cuda.mem_get_info()
                print(f"   • GPU 메모리 — 여유: {free/1024**3:.1f} GB / 전체: {total/1024**3:.1f} GB")
            print(f"   • Loading SAM-3 on {device} (fp32)...")
            sam_model = build_sam3_image_model().to(device)
            sam_model.eval()
            self.sam_processor = Sam3Processor(sam_model)
            print("✅ SAM-3 loaded")
        except Exception as e:
            print(f"   ⚠️  SAM-3 load failed: {e}")
            self.sam_processor = None

        # 3. SAM-3 로딩 후 GPU 캐시 정리 후 YOLO 로딩
        if torch.cuda.is_available():
            import gc
            gc.collect()
            torch.cuda.synchronize()
            torch.cuda.empty_cache()
            free, total = torch.cuda.mem_get_info()
            print(f"   • GPU 메모리 정리 완료 — 여유: {free/1024**3:.1f} GB / 전체: {total/1024**3:.1f} GB")

        # 4. YOLO 모델 로딩
        model_dir = settings.model_dir
        if not os.path.isabs(model_dir):
            model_dir = os.path.join(_BACKEND_ROOT, model_dir)

        default_ext = settings.weight_type
        engine_models: list[str] = []

        for mc in MODEL_CONFIGS:
            name = mc["name"]
            ext = mc.get("weight_type", default_ext)
            suffix = name.rsplit("_", 1)[-1]
            weight_path = os.path.join(model_dir, name, f"best_{suffix}.{ext}")

            if not os.path.exists(weight_path):
                print(f"   ⚠️  Weight not found: {weight_path}")
                continue

            print(f"   • Loading {name} from {weight_path}")
            if ext in ("onnx", "engine"):
                self.yolo_models[name] = YOLO(weight_path, task="segment")
                engine_models.append(name)
            else:
                self.yolo_models[name] = YOLO(weight_path)
            self.is_roi_map[name] = mc["is_roi"]

        print(f"✅ {len(self.yolo_models)}/3 YOLO models loaded")

        # 5. TensorRT engine: warmup으로 execution context 미리 초기화
        if engine_models:
            import numpy as np
            dummy = np.zeros((64, 64, 3), dtype=np.uint8)
            for name in engine_models:
                print(f"   • Warming up TensorRT context: {name}")
                self.yolo_models[name].predict(source=dummy, imgsz=64, verbose=False)
            print("✅ TensorRT warmup complete")

        if torch.cuda.is_available():
            free, total = torch.cuda.mem_get_info()
            print(f"   • 최종 GPU 메모리 — 여유: {free/1024**3:.1f} GB / 전체: {total/1024**3:.1f} GB")

        self._initialized = True
        print("🎉 ModelManager initialization complete")

    @property
    def is_ready(self) -> bool:
        return self._initialized and len(self.yolo_models) > 0
