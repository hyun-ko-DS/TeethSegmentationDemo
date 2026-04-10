"""
convert_to_engine.py — YOLO .pt → TensorRT .engine 변환 스크립트

RTX 4000 Ada (20 GB VRAM) 등 충분한 VRAM이 있는 Runpod 인스턴스에서 실행.
변환된 .engine 파일은 동일 디렉토리에 저장됨.

사용법:
    python convert_to_engine.py
    python convert_to_engine.py --half       # FP16 (기본값)
    python convert_to_engine.py --no-half    # FP32
    python convert_to_engine.py --workspace 8  # TRT workspace GB (기본 4)
"""

import argparse
import gc
import os
import sys
import time

import torch

# 프로젝트 루트를 sys.path에 추가 (caf, utils import 용)
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

# CAFBlock 등 커스텀 클래스를 __main__ 네임스페이스에 등록해야
# torch.load 역직렬화 시 찾을 수 있음
import __main__
from caf import ACFM, CAFBlock, ChannelShuffle, MSNN

__main__.CAFBlock = CAFBlock
__main__.ACFM = ACFM
__main__.MSNN = MSNN
__main__.ChannelShuffle = ChannelShuffle

from ultralytics import YOLO

# ──────────────────────────────────────────────
# 변환 대상 모델 목록
# ──────────────────────────────────────────────
MODEL_CONFIGS = [
    {"name": "model_365", "imgsz": 1536},
    {"name": "model_357", "imgsz": 1536},
    {"name": "model_355", "imgsz": 1536},
]

MODEL_DIR = os.path.join(_SCRIPT_DIR, "models")


def _gpu_info() -> str:
    if not torch.cuda.is_available():
        return "CUDA unavailable"
    free, total = torch.cuda.mem_get_info()
    return f"여유 {free/1024**3:.1f} GB / 전체 {total/1024**3:.1f} GB"


def convert_model(name: str, imgsz: int, half: bool, workspace_gb: int) -> bool:
    suffix = name.rsplit("_", 1)[-1]
    pt_path = os.path.join(MODEL_DIR, name, f"best_{suffix}.pt")
    engine_path = os.path.join(MODEL_DIR, name, f"best_{suffix}.engine")

    if not os.path.exists(pt_path):
        print(f"   ⚠️  .pt 파일 없음: {pt_path}")
        return False

    print(f"\n{'='*60}")
    print(f"  모델: {name}")
    print(f"  입력: {pt_path}")
    print(f"  출력: {engine_path}")
    print(f"  imgsz={imgsz}, half={'FP16' if half else 'FP32'}, workspace={workspace_gb} GB")
    print(f"  GPU — {_gpu_info()}")
    print(f"{'='*60}")

    t0 = time.perf_counter()
    try:
        model = YOLO(pt_path)

        # export()는 동기 함수이며 변환된 .engine 파일 경로를 반환
        exported = model.export(
            format="engine",
            imgsz=imgsz,
            half=half,
            device=0,
            workspace=workspace_gb,  # TensorRT builder workspace (GB)
            verbose=True,
        )
        elapsed = time.perf_counter() - t0
        print(f"\n✅ 완료: {exported}  ({elapsed:.1f}s)")
        print(f"   GPU — {_gpu_info()}")
        return True

    except Exception as e:
        elapsed = time.perf_counter() - t0
        print(f"\n❌ 실패: {name}  ({elapsed:.1f}s)")
        print(f"   오류: {e}")
        return False

    finally:
        # 메모리 해제
        try:
            del model
        except NameError:
            pass
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()


def main():
    parser = argparse.ArgumentParser(description="YOLO .pt → TensorRT .engine 변환")
    parser.add_argument(
        "--half", dest="half", action="store_true", default=False,
        help="FP16 변환 (기본값: False)",
    )
    parser.add_argument(
        "--no-half", dest="half", action="store_false",
        help="FP32 변환 (기본값)",
    )
    parser.add_argument(
        "--workspace", type=int, default=4,
        help="TensorRT builder workspace 크기 GB (기본값: 4)",
    )
    parser.add_argument(
        "--models", nargs="+",
        help="변환할 모델 이름 선택 (예: model_365 model_357). 미지정 시 전체 변환.",
    )
    args = parser.parse_args()

    if not torch.cuda.is_available():
        print("❌ CUDA를 사용할 수 없습니다. GPU 환경에서 실행하세요.")
        sys.exit(1)

    device_name = torch.cuda.get_device_name(0)
    free, total = torch.cuda.mem_get_info()
    print(f"🖥️  GPU: {device_name}")
    print(f"   VRAM — 여유 {free/1024**3:.1f} GB / 전체 {total/1024**3:.1f} GB")
    print(f"   변환 설정 — {'FP16' if args.half else 'FP32'}, workspace={args.workspace} GB")

    # 변환 대상 필터
    targets = MODEL_CONFIGS
    if args.models:
        targets = [mc for mc in MODEL_CONFIGS if mc["name"] in args.models]
        if not targets:
            print(f"❌ 지정한 모델 이름이 MODEL_CONFIGS에 없습니다: {args.models}")
            sys.exit(1)

    results = {}
    total_t0 = time.perf_counter()

    for mc in targets:
        ok = convert_model(
            name=mc["name"],
            imgsz=mc["imgsz"],
            half=args.half,
            workspace_gb=args.workspace,
        )
        results[mc["name"]] = ok

    total_elapsed = time.perf_counter() - total_t0
    print(f"\n{'='*60}")
    print(f"  변환 완료 — 총 {total_elapsed:.1f}s")
    for name, ok in results.items():
        status = "✅" if ok else "❌"
        print(f"  {status} {name}")
    print(f"{'='*60}")

    if not all(results.values()):
        sys.exit(1)


if __name__ == "__main__":
    main()

# ──────────────────────────────────────────────
# 실행 예시
# ──────────────────────────────────────────────
# [전체 변환 - FP32 (기본, 정확도 유지)]
#   python convert_to_engine.py
#
# [전체 변환 - FP16 (속도/메모리 우선)]
#   python convert_to_engine.py --half
#
# [특정 모델만 변환]
#   python convert_to_engine.py --models model_365
#   python convert_to_engine.py --models model_365 model_357
#
# [TRT builder workspace 크기 조정 (VRAM 여유 있을 때 늘리면 최적화 품질 향상)]
#   python convert_to_engine.py --workspace 8
