import { useState } from "react";
import type { FilterState, Prediction, PredictResponse } from "../types/prediction";
import { NUM_CLASSES } from "../constants/classes";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const defaultFilters: FilterState = {
  globalThreshold: 0.0,
  classThresholds: Array(NUM_CLASSES).fill(0.0),
  classVisibility: Array(NUM_CLASSES).fill(true),
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

    try {
      const res = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Prediction failed");
      }

      const data: PredictResponse = await res.json();
      setPredictions(data.predictions);
      setImageSize({ width: data.image_width, height: data.image_height });
      setProcessingTimeMs(data.processing_time_ms);
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
    updateGlobalThreshold,
    updateClassThreshold,
    toggleClassVisibility,
    reset,
  };
}
