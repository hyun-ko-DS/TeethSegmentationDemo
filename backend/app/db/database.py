import os
import aiosqlite

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(_BACKEND_DIR, "data", "records.db")
RECORD_IMAGES_DIR = os.path.join(_BACKEND_DIR, "data", "record_images")

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
os.makedirs(RECORD_IMAGES_DIR, exist_ok=True)

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS records (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_name   TEXT    NOT NULL,
    gender         TEXT    NOT NULL,
    age            INTEGER NOT NULL,
    visit_datetime TEXT    NOT NULL,
    predictions    TEXT    NOT NULL,
    severity       TEXT    NOT NULL,
    image_filename TEXT    NOT NULL,
    created_at     TEXT    NOT NULL,
    status         TEXT    NOT NULL DEFAULT '스크리닝 완료'
)
"""

VALID_STATUSES = ("스크리닝 완료", "정밀 진단 권고", "정밀 진단 완료", "치료 완료")


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_TABLE_SQL)
        # migrate existing DB: add status column if it doesn't exist
        try:
            await db.execute(
                "ALTER TABLE records ADD COLUMN status TEXT NOT NULL DEFAULT '스크리닝 완료'"
            )
        except Exception:
            pass  # column already exists
        await db.commit()


def get_db():
    return aiosqlite.connect(DB_PATH)
