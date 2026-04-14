# ⚠️ 버전 고정: CUDA 12.4 + Python 3.12 + PyTorch 2.8.0 (Runpod RTX 4000 Ada 기준)
# 빌드 컨텍스트: repo 루트에서 실행
#   docker build -f backend/Dockerfile .

FROM nvidia/cuda:12.4.1-cudnn-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Python 3.12 설치
RUN apt-get update && apt-get install -y \
    software-properties-common && \
    add-apt-repository ppa:deadsnakes/ppa -y && \
    apt-get update && apt-get install -y \
    python3.12 python3.12-dev python3.12-distutils \
    git curl libgl1 libglib2.0-0 \
    && curl -sS https://bootstrap.pypa.io/get-pip.py | python3.12 \
    && ln -sf /usr/bin/python3.12 /usr/bin/python3 \
    && ln -sf /usr/bin/python3.12 /usr/bin/python \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# requirements 먼저 설치 (캐시 활용)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 백엔드 소스 복사 (models/ 제외 — 볼륨 마운트로 처리)
COPY backend/app/ app/
COPY backend/start.sh .
RUN chmod +x start.sh

# 루트 레벨 공유 파일
COPY caf.py utils.py config.json download.py ./

EXPOSE 8000

CMD ["./start.sh"]
