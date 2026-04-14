import base64
import os
import uuid

from fastapi import APIRouter, HTTPException

from app.db.crud import get_record, insert_record, list_records, update_status
from app.db.database import RECORD_IMAGES_DIR, VALID_STATUSES
from app.schemas.record import RecordCreate, RecordItem, RecordsListResponse, StatusUpdate

router = APIRouter(prefix="/records", tags=["records"])

_STATIC_PREFIX = "/static/record-images"


def _record_to_item(record: dict) -> RecordItem:
    return RecordItem(
        id=record["id"],
        patient_name=record["patient_name"],
        gender=record["gender"],
        age=record["age"],
        visit_datetime=record["visit_datetime"],
        predictions=record["predictions"],
        severity=record["severity"],
        image_url=f"{_STATIC_PREFIX}/{record['image_filename']}",
        created_at=record["created_at"],
        status=record["status"],
    )


@router.post("", response_model=RecordItem, status_code=201)
async def create_record(body: RecordCreate):
    # 이미지 저장
    try:
        image_bytes = base64.b64decode(body.image_base64)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid base64 image")

    filename = f"{uuid.uuid4().hex}.jpg"
    filepath = os.path.join(RECORD_IMAGES_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(image_bytes)

    # DB 저장
    predictions_dicts = [p.model_dump() for p in body.predictions]
    record = await insert_record(
        patient_name=body.patient_name,
        gender=body.gender,
        age=body.age,
        visit_datetime=body.visit_datetime,
        predictions=predictions_dicts,
        image_filename=filename,
    )
    return _record_to_item(record)


@router.get("", response_model=RecordsListResponse)
async def get_records():
    records = await list_records()
    return RecordsListResponse(records=[_record_to_item(r) for r in records])


@router.get("/{record_id}", response_model=RecordItem)
async def get_record_by_id(record_id: int):
    record = await get_record(record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return _record_to_item(record)


@router.patch("/{record_id}/status", response_model=RecordItem)
async def patch_record_status(record_id: int, body: StatusUpdate):
    if body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}",
        )
    record = await update_status(record_id, body.status)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return _record_to_item(record)
