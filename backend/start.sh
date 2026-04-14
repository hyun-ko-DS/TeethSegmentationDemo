#!/bin/bash
set -e

echo "🚀 Starting Teeth Segmentation API..."

# ── 1. 모델 볼륨 연결 ──────────────────────────────────────────────
if [ -d "/workspace/models" ] && [ "$(ls -A /workspace/models 2>/dev/null)" ]; then
    echo "📁 /workspace/models → /app/models 심볼릭 링크 설정"
    ln -sfn /workspace/models /app/models
else
    echo "⚠️  /workspace/models 없음 또는 비어있음."
    echo "    모델 가중치 다운로드가 필요하면 아래 명령을 먼저 실행하세요:"
    echo "    python download.py"
fi

# ── 2. .env 파일 로드 ──────────────────────────────────────────────
if [ -f "/workspace/.env" ]; then
    echo "📄 /workspace/.env → /app/.env 복사"
    cp /workspace/.env /app/.env
elif [ -f "/app/.env" ]; then
    echo "📄 /app/.env 사용 (이미지 내장)"
else
    echo "⚠️  .env 파일 없음. HUGGINGFACE_API_KEY 미설정 시 SAM-3 로딩 실패 가능."
fi

# ── 3. HuggingFace 캐시를 영구 볼륨으로 ───────────────────────────
# SAM-3 최초 실행 시 HuggingFace에서 체크포인트를 다운로드함.
# /workspace에 저장해 컨테이너 재시작 시 재다운로드 방지.
export HF_HOME=/workspace/.cache/huggingface
mkdir -p "$HF_HOME"

# ── 4. CUDA 환경 설정 ─────────────────────────────────────────────
# TensorRT + SAM-3 공존 시 CUDA 메모리 단편화 방지
export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True

# ── 5. 환경 요약 출력 ─────────────────────────────────────────────
echo "🔧 Environment:"
echo "   WEIGHT_TYPE : ${WEIGHT_TYPE:-engine}"
echo "   MODEL_DIR   : ${MODEL_DIR:-models}"
echo "   HF_HOME     : $HF_HOME"
echo "   CUDA        : $(python3 -c 'import torch; print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else "not available")' 2>/dev/null || echo 'torch not importable yet')"

# ── 6. uvicorn 기동 ───────────────────────────────────────────────
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 1 \
    --log-level info
