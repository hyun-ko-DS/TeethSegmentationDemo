import { useState } from "react";
import type { FilterState, Prediction, PredictResponse } from "../types/prediction";
import { NUM_CLASSES } from "../constants/classes";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const defaultFilters: FilterState = {
  globalThreshold: 0.01,
  classThresholds: Array(NUM_CLASSES).fill(0.01).map((v, i) => (i < 3 ? 0.25 : v)),
  // Non-pathologies (0: Abrasion, 1: Filling, 2: Crown) 기본 숨김
  // Pathologies (3~8: Caries Class 1~6) 기본 표시
  classVisibility: Array(NUM_CLASSES).fill(true).map((_, i) => i >= 3),
};

export function useSegmentation() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingTimeMs, setProcessingTimeMs] = useState<number | null>(null);

  const predict = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setPredictions([]);
    setProcessingTimeMs(null);

    // 미리보기 URL 생성
    const objectUrl = URL.createObjectURL(file);
    setImageUrl(objectUrl);

    const formData = new FormData();
    formData.append("image", file);

    const t0 = performance.now();
    console.log(`[FE] 업로드 시작  — ${(file.size / 1024).toFixed(0)} KB`);

    try {
      const t1 = performance.now();
      const res = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        body: formData,
      });
      const t2 = performance.now();
      console.log(`[FE] 서버 응답 수신  — ${((t2 - t1) / 1000).toFixed(2)}s (업로드+추론+전송)`);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Prediction failed");
      }

      const data: PredictResponse = await res.json();
      const t3 = performance.now();
      console.log(`[FE] JSON 파싱     — ${((t3 - t2) / 1000).toFixed(2)}s  (${data.predictions.length} predictions)`);

      setPredictions(data.predictions);
      setImageSize({ width: data.image_width, height: data.image_height });
      setProcessingTimeMs(data.processing_time_ms);

      requestAnimationFrame(() => {
        const t4 = performance.now();
        console.log(`[FE] 캔버스 렌더링 — ${((t4 - t3) / 1000).toFixed(2)}s`);
        console.log(`[FE] 전체 소요     — ${((t4 - t0) / 1000).toFixed(2)}s  (업로드~시각화 완료)`);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const updateGlobalThreshold = (value: number) => {
    setFilters((prev) => ({ ...prev, globalThreshold: value }));
  };

  const updateClassThreshold = (classId: number, value: number) => {
    setFilters((prev) => {
      const next = [...prev.classThresholds];
      next[classId] = value;
      return { ...prev, classThresholds: next };
    });
  };

  const toggleClassVisibility = (classId: number) => {
    setFilters((prev) => {
      const next = [...prev.classVisibility];
      next[classId] = !next[classId];
      return { ...prev, classVisibility: next };
    });
  };

  const predictSample = async (filename: string) => {
    setIsLoading(true);
    setError(null);
    setPredictions([]);
    setProcessingTimeMs(null);

    // 미리보기: 썸네일로 먼저 표시 (원본 5MB+ 다운로드가 POST 요청과 경합하지 않도록)
    setImageUrl(`${API_BASE_URL}/thumbnail/${filename}`);

    const t0 = performance.now();
    console.log(`[FE] 샘플 추론 시작 — ${filename}`);

    try {
      const res = await fetch(`${API_BASE_URL}/predict-sample/${encodeURIComponent(filename)}`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Prediction failed");
      }

      const t1 = performance.now();
      const data: PredictResponse = await res.json();
      const t2 = performance.now();
      console.log(`[FE] 서버 응답     — ${((t1 - t0) / 1000).toFixed(2)}s`);
      console.log(`[FE] JSON 파싱     — ${((t2 - t1) / 1000).toFixed(2)}s  (${data.predictions.length} predictions)`);

      setPredictions(data.predictions);
      setImageSize({ width: data.image_width, height: data.image_height });
      setProcessingTimeMs(data.processing_time_ms);
      // 추론 완료 후 원본 이미지로 교체 (폴리곤 정확도를 위해)
      setImageUrl(`${API_BASE_URL}/static/samples/${filename}`);

      requestAnimationFrame(() => {
        const t3 = performance.now();
        console.log(`[FE] 전체 소요     — ${((t3 - t0) / 1000).toFixed(2)}s`);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setImageUrl(null);
    setImageSize(null);
    setPredictions([]);
    setFilters(defaultFilters);
    setError(null);
    setProcessingTimeMs(null);
  };

  return {
    imageUrl,
    imageSize,
    predictions,
    filters,
    isLoading,
    error,
    processingTimeMs,
    predict,
    predictSample,
    updateGlobalThreshold,
    updateClassThreshold,
    toggleClassVisibility,
    reset,
  };
}
