from pydantic import BaseModel

from app.schemas.prediction import PredictionItem


class RecordCreate(BaseModel):
    patient_name:   str
    gender:         str          # "M" | "F"
    age:            int
    visit_datetime: str
    predictions:    list[PredictionItem]
    image_base64:   str          # base64 인코딩된 원본 이미지


class RecordItem(BaseModel):
    id:             int
    patient_name:   str
    gender:         str
    age:            int
    visit_datetime: str
    predictions:    list[PredictionItem]
    severity:       str
    image_url:      str
    created_at:     str
    status:         str


class StatusUpdate(BaseModel):
    status: str


class RecordsListResponse(BaseModel):
    records: list[RecordItem]
