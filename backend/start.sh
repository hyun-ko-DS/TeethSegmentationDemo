#!/bin/bash
set -e

echo "🚀 Starting Teeth Segmentation API..."

# ── 0. Python 3.12 pkgutil.ImpImporter 패치 ─────────────────────
# Python 3.12에서 제거된 pkgutil.ImpImporter를 참조하는 시스템 pkg_resources 패치
# 모든 Python 작업보다 먼저 실행해야 함 (convert_to_engine.py, uvicorn 등)
PKG_RESOURCES="/usr/lib/python3/dist-packages/pkg_resources/__init__.py"
if [ -f "$PKG_RESOURCES" ] && grep -q "pkgutil.ImpImporter" "$PKG_RESOURCES"; then
    echo "🔧 Python 3.12 pkgutil.ImpImporter 패치 적용..."
    sed -i '/pkgutil.ImpImporter/s/^/# /' "$PKG_RESOURCES"
fi

# ── 1. 모델 볼륨 연결 ──────────────────────────────────────────────
if [ -d "/workspace/models" ] && [ "$(ls -A /workspace/models 2>/dev/null)" ]; then
    # 중첩 models 폴더 자동 수정 (models/models/ → models/)
    if [ -d "/workspace/models/models" ]; then
        echo "⚠️  중첩 models 디렉토리 감지 — 자동 정리 중..."
        mv /workspace/models/models/* /workspace/models/ 2>/dev/null || true
        rmdir /workspace/models/models 2>/dev/null || true
    fi
    echo "📁 /workspace/models → /app/models 심볼릭 링크 설정"
    ln -sfn /workspace/models /app/models
else
    echo "⚠️  /workspace/models 없음 — 자동 다운로드 시작..."
    cd /workspace && python3 /app/download.py && cd /app
    ln -sfn /workspace/models /app/models
fi

# ── 1b. 데이터(샘플 이미지) 볼륨 연결 ─────────────────────────────
if [ -d "/workspace/data" ] && [ "$(ls -A /workspace/data 2>/dev/null)" ]; then
    echo "📁 /workspace/data → /app/data 심볼릭 링크 설정"
    ln -sfn /workspace/data /app/data
else
    echo "⚠️  /workspace/data 없음 — 샘플 이미지 기능 비활성화"
fi

# ── 2. .env 파일 로드 ──────────────────────────────────────────────
if [ -f "/workspace/.env" ]; then
    echo "📄 /workspace/.env → /app/.env 복사"
    cp /workspace/.env /app/.env
elif [ -n "$HUGGINGFACE_API_KEY" ]; then
    # Runpod Pod 환경변수에서 .env 자동 생성
    echo "📄 환경변수에서 /workspace/.env 자동 생성"
    printf "HUGGINGFACE_API_KEY=%s\nMODEL_DIR=%s\nWEIGHT_TYPE=%s\nCONFIG_PATH=%s\n" \
        "$HUGGINGFACE_API_KEY" \
        "${MODEL_DIR:-models}" \
        "${WEIGHT_TYPE:-engine}" \
        "${CONFIG_PATH:-config.json}" \
        > /workspace/.env
    cp /workspace/.env /app/.env
elif [ -f "/app/.env" ]; then
    echo "📄 /app/.env 사용 (이미지 내장)"
else
    echo "⚠️  .env 파일 없음. HUGGINGFACE_API_KEY 미설정 시 SAM-3 로딩 실패 가능."
fi

# ── 3. TensorRT .engine 자동 변환 ────────────────────────────────
# .pt 파일은 있지만 .engine 파일이 없는 모델만 변환 (GPU별 재컴파일 필요)
ENGINE_MISSING=0
for MODEL in model_365 model_357 model_355; do
    SUFFIX=${MODEL##*_}  # 365, 357, 355
    ENGINE_PATH="/app/models/${MODEL}/best_${SUFFIX}.engine"
    PT_PATH="/app/models/${MODEL}/best_${SUFFIX}.pt"
    if [ -f "$PT_PATH" ] && [ ! -f "$ENGINE_PATH" ]; then
        ENGINE_MISSING=1
        break
    fi
done

if [ "$ENGINE_MISSING" -eq 1 ]; then
    echo "🔧 .engine 파일 누락 감지 — TensorRT 변환 시작 (FP32, workspace 8GB)..."
    echo "   ⏳ 모델당 3~5분 소요 (최초 1회만)"
    if ! python3 /app/convert_to_engine.py --no-half --workspace 8; then
        echo "❌ TensorRT 변환 실패 — .engine 없이 서버 기동 불가"
        echo "   수동 디버깅: python3 /app/convert_to_engine.py --workspace 8"
        exit 1
    fi
else
    echo "✅ TensorRT .engine 파일 확인 완료"
fi

# ── 4. HuggingFace 캐시를 영구 볼륨으로 ───────────────────────────
# SAM-3 최초 실행 시 HuggingFace에서 체크포인트를 다운로드함.
# /workspace에 저장해 컨테이너 재시작 시 재다운로드 방지.
export HF_HOME=/workspace/.cache/huggingface
mkdir -p "$HF_HOME"

# ── 5. CUDA 환경 설정 ─────────────────────────────────────────────
# TensorRT + SAM-3 공존 시 CUDA 메모리 단편화 방지
export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True

# ── 6. 환경 요약 출력 ─────────────────────────────────────────────
echo "🔧 Environment:"
echo "   WEIGHT_TYPE : ${WEIGHT_TYPE:-engine}"
echo "   MODEL_DIR   : ${MODEL_DIR:-models}"
echo "   HF_HOME     : $HF_HOME"
echo "   CUDA        : $(python3 -c 'import torch; print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else "not available")' 2>/dev/null || echo 'torch not importable yet')"

# ── 7. uvicorn 기동 ───────────────────────────────────────────────
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 1 \
    --log-level info
