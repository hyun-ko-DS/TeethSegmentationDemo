from pydantic import BaseModel


class PredictionItem(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    polygon: list[list[float]]   # [[x_norm, y_norm], ...]


class PredictResponse(BaseModel):
    image_width: int
    image_height: int
    predictions: list[PredictionItem]
    processing_time_ms: int


class ClassInfo(BaseModel):
    class_id: int
    class_name: str
    color: list[float]   # [R, G, B] 0~1 float


class ClassesResponse(BaseModel):
    classes: list[ClassInfo]


class HealthResponse(BaseModel):
    status: str
    models_loaded: bool
    model_count: int
    sam_loaded: bool
