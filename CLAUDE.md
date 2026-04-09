# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RGB 치아 구강 이미지를 입력받아 **9개 클래스**로 instance segmentation 후 결과를 시각화하는 데모 페이지.  
목표 스택: **React (FE) + FastAPI (BE)**, 배포는 **Vercel**, GPU 추론은 **Runpod (RTX 2000 Ada)**.

### 9 Classes
| ID | Name |
|----|------|
| 0 | Abrasion |
| 1 | Filling |
| 2 | Crown |
| 3 | Caries Class 1 |
| 4 | Caries Class 2 |
| 5 | Caries Class 3 |
| 6 | Caries Class 4 |
| 7 | Caries Class 5 |
| 8 | Caries Class 6 |

## Repository Structure

```
TeethSegmentationDemo/
├── models/                    # YOLO weights (pt / onnx / engine per model)
│   ├── model_355/             # mAP50=0.355, ROI-based
│   ├── model_357/             # mAP50=0.357, Instance-based
│   ├── model_360/             # mAP50=0.360, ROI-based
│   └── model_365/             # mAP50=0.365, ROI-based (best)
├── sam3_preprocessing.py      # SAM-3 기반 전처리 (ROI / instance crop) — 학습용 배치 스크립트
├── ensemble.py                # WMF(Weighted Mask Fusion) 앙상블 파이프라인 — 학습용 배치 스크립트
├── caf.py                     # CAFBlock / ACFM / MSNN (커스텀 YOLO 백본 모듈)
├── utils.py                   # load_config(), set_seed()
└── config.json                # 전역 하이퍼파라미터 및 클래스 색상
```

## Inference Pipeline

```
입력 이미지
    ↓
[sam3_preprocessing.py → 웹 데모용으로 리팩토링 필요]
  • is_instance=False → 전체 구강 ROI 크롭  (model_365, model_360, model_355 대상)
  • is_instance=True  → 치아 인스턴스별 개별 크롭  (model_357 대상)
    ↓
[ensemble.py → 웹 데모용으로 리팩토링 필요]
  • 각 모델 개별 추론 (YOLO.predict)
  • crop 좌표를 원본 이미지 좌표계로 역변환 (crop_coords 메타데이터 참조)
  • perform_wmf_direct() → IoU 기반 클러스터링 → 가중합 마스크 융합
    ↓
결과: confidence, class_id, poly (정규화 polygon 문자열)
```

### Model–Preprocessing Mapping
| Model | Weight type | is_roi | imgsz |
|-------|-------------|--------|-------|
| model_365 | best_365.{pt/onnx/engine} | True (ROI) | 1536 |
| model_360 | best_360.{pt/onnx/engine} | False (Instance) | 768 |
| model_357 | best_357.{pt/onnx/engine} | True (ROI) | 1536 |
| model_355 | best_355.{pt/onnx/engine} | True (ROI) | 1536 |

### WMF Config (config.json)
- `wmf_iou_thres`: 클러스터 병합 IoU 기준 (0.25)
- `wmf_mask_thres`: 마스크 이진화 임계값 (0.35)
- `wmf_weights`: 모델별 가중치 `[0.25, 0.25, 0.25, 0.25]`
- `wmf_agreement_boost_thr`: 다수결 동의 시 confidence 부스트 계수

## Web Demo vs. Batch Scripts

현재 `sam3_preprocessing.py`와 `ensemble.py`는 **train/valid/test 분할 데이터셋을 배치 처리**하는 스크립트로 작성되어 있음.  
웹 데모 FastAPI 서버에서는 **유저가 업로드한 이미지 한 장**을 입력받아 실시간 추론해야 하므로, 아래 부분을 리팩토링해야 함:

- `sam3_preprocessing.py`: 디렉토리 순회 루프 → **단일 이미지 in-memory 처리** 함수로 변환
- `ensemble.py`: 파일 경로 기반 glob/tqdm 루프 → **단일 이미지 추론 후 결과 반환** 함수로 변환
- 파일시스템에 crop 이미지/메타데이터를 저장하는 대신 **메모리 내에서 numpy 배열로 전달**하는 방식으로 변경

## FastAPI Backend (예정)

- **언어**: Python 3.12 (Runpod 환경과 동일하게 고정)
- **프레임워크**: FastAPI (비동기 함수는 `async def` 사용)
- **타입 힌트 필수**, Pydantic 스키마로 요청/응답 정의
- **DB**: 현재 미정. 단순 데모 특성상 불필요할 수 있음 — 추가 여부 결정 전까지 DB 의존성 없이 설계

### 주요 엔드포인트 (예정)
```
POST /predict   # 이미지 업로드 → 추론 → 결과 반환
```

### 개발 서버 실행
```bash
uvicorn app.main:app --reload
```

## Code Style

- Type hints 필수
- 비동기 함수는 `async def` 사용
- 포맷팅: `black .`
- 테스트: `pytest`

## Key Design Notes

- **SAM-3 전처리 메타데이터**: 기존 배치 스크립트에서는 crop 좌표(`crop_coords`)를 JSON 파일로 저장했지만, 웹 데모에서는 이를 메모리 딕셔너리로 대체.
- **CAFBlock (`caf.py`)**: YOLO 백본에 삽입된 커스텀 Attention + Multi-Scale 모듈. 학습 시에만 사용되며 추론 시에는 YOLO 내부에 이미 포함.
- **WMF 최소 합의 조건**: 클러스터에 최소 2개 모델의 예측이 있어야 최종 출력에 포함됨 (`len(cluster) < 2` 필터).
- **weight_type**: `pt` → 개발/디버깅, `onnx` → 크로스 플랫폼, `engine` → Runpod TensorRT 최적화 추론.

## Environment Setup

> **⚠️ 버전 고정: PyTorch 2.8.0 + CUDA 12.4 — 절대 변경하지 말 것**
> Runpod RTX 2000 Ada 환경에서 검증된 조합. 다른 버전 제안 금지.

```bash
pip install -r requirements.txt
```

- PyTorch: `2.8.0` (`torch==2.8.0`, `--extra-index-url https://download.pytorch.org/whl/cu124`)
- CUDA: `12.4`
- Python: `3.12` (Runpod 환경 기준)
- SAM-3: GitHub에서 직접 설치 (`git+https://github.com/facebookresearch/sam3.git`)
- HuggingFace 토큰: `.env` 파일에 `HUGGINGFACE_API_KEY=...`로 설정
- SAM-3는 `triton` 의존성으로 인해 **macOS에서 실행 불가** (Linux + CUDA 전용)
