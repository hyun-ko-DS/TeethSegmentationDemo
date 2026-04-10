#!/bin/bash
set -e

echo "🚀 Starting Teeth Segmentation API..."

# /workspace/models 볼륨이 마운트된 경우 심볼릭 링크 설정
if [ -d "/workspace/models" ]; then
    echo "📁 Linking /workspace/models → /app/models"
    ln -sfn /workspace/models /app/models
else
    echo "⚠️  /workspace/models not found. Using /app/models if it exists."
fi

# .env 파일이 /workspace에 있으면 복사
if [ -f "/workspace/.env" ]; then
    echo "📄 Loading .env from /workspace"
    cp /workspace/.env /app/.env
fi

# CUDA 메모리 단편화 방지 (TensorRT + SAM-3 공존 시 필요)
export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True

echo "🔧 Environment:"
echo "   MODEL_DIR=${MODEL_DIR:-models}"
echo "   WEIGHT_TYPE=${WEIGHT_TYPE:-pt}"
echo "   CUDA: $(python3 -c 'import torch; print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else "not available")')"

exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 1 \
    --log-level info
