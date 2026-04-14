import json
from datetime import datetime, timezone

import aiosqlite

from app.db.database import get_db


def _calculate_severity(predictions: list[dict]) -> str:
    """predictions 리스트에서 Caries class_id(3~8) 기준으로 중증도 계산."""
    caries_ids = [p["class_id"] for p in predictions if 3 <= p["class_id"] <= 8]
    if not caries_ids:
        return "None"
    max_id = max(caries_ids)
    if max_id <= 4:   # Caries Class 1–2
        return "Mild"
    elif max_id <= 6: # Caries Class 3–4
        return "Moderate"
    else:             # Caries Class 5–6
        return "Severe"


def _row_to_dict(row: aiosqlite.Row) -> dict:
    return {
        "id":             row[0],
        "patient_name":   row[1],
        "gender":         row[2],
        "age":            row[3],
        "visit_datetime": row[4],
        "predictions":    json.loads(row[5]),
        "severity":       row[6],
        "image_filename": row[7],
        "created_at":     row[8],
        "status":         row[9],
    }


async def insert_record(
    patient_name: str,
    gender: str,
    age: int,
    visit_datetime: str,
    predictions: list[dict],
    image_filename: str,
) -> dict:
    severity   = _calculate_severity(predictions)
    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")

    async with get_db() as db:
        cursor = await db.execute(
            """
            INSERT INTO records
                (patient_name, gender, age, visit_datetime, predictions, severity, image_filename, created_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, '스크리닝 완료')
            """,
            (
                patient_name,
                gender,
                age,
                visit_datetime,
                json.dumps(predictions, ensure_ascii=False),
                severity,
                image_filename,
                created_at,
            ),
        )
        await db.commit()
        row_id = cursor.lastrowid

    return await get_record(row_id)


async def get_record(record_id: int) -> dict | None:
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT id, patient_name, gender, age, visit_datetime, predictions, severity, image_filename, created_at, status FROM records WHERE id = ?",
            (record_id,),
        ) as cursor:
            row = await cursor.fetchone()
    return _row_to_dict(row) if row else None


async def list_records() -> list[dict]:
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT id, patient_name, gender, age, visit_datetime, predictions, severity, image_filename, created_at, status FROM records ORDER BY id DESC",
        ) as cursor:
            rows = await cursor.fetchall()
    return [_row_to_dict(r) for r in rows]


async def update_status(record_id: int, status: str) -> dict | None:
    async with get_db() as db:
        await db.execute(
            "UPDATE records SET status = ? WHERE id = ?",
            (status, record_id),
        )
        await db.commit()
    return await get_record(record_id)
