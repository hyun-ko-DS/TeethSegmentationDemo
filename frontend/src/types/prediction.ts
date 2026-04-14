export interface Prediction {
  class_id: number;
  class_name: string;
  confidence: number;
  polygon: [number, number][]; // [[x_norm, y_norm], ...]
}

export interface PredictResponse {
  image_width: number;
  image_height: number;
  predictions: Prediction[];
  processing_time_ms: number;
}

export interface ClassInfo {
  class_id: number;
  class_name: string;
  color: [number, number, number]; // [R, G, B] 0~1 float
}

export interface RecordItem {
  id: number;
  patient_name: string;
  gender: string;
  age: number;
  visit_datetime: string;
  predictions: Prediction[];
  severity: string;
  image_url: string;
  created_at: string;
  status: string;
}

export interface FilterState {
  globalThreshold: number;      // 0~1
  classThresholds: number[];    // length 9, 클래스별 threshold
  classVisibility: boolean[];   // length 9, 클래스별 표시 여부
}
