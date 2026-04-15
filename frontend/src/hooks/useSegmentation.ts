import { useRef, useState } from "react";
import type { FilterState, Prediction, PredictResponse } from "../types/prediction";
import { NUM_CLASSES } from "../constants/classes";

/**
 * 업로드 전 이미지를 maxPx 이내로 리사이즈.
 * blob: 서버 업로드용, dataUrl: 화면 표시용 (data URL은 revoke 없이 안전)
 */
async function resizeForUpload(
  file: File,
  maxPx = 1024,
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      canvas.toBlob(
        (blob) => (blob ? resolve({ blob, dataUrl }) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        0.88,
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const defaultFilters: FilterState = {
  globalThreshold: 0.01,
  classThresholds: Array(NUM_CLASSES).fill(0.01).map((v, i) => (i < 3 ? 0.25 : v)),
  classVisibility: Array(NUM_CLASSES).fill(true).map((_, i) => i >= 3),
};

type StagedSource =
  | { kind: "file"; file: File; previewUrl: string }
  | { kind: "sample"; filename: string; split: "valid" | "test" };

export function useSegmentation() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingTimeMs, setProcessingTimeMs] = useState<number | null>(null);
  const [sampleFilename, setSampleFilename] = useState<string | null>(null);
  // 진료 기록 저장용 이미지 URL — 업로드 파일은 리사이즈된 blob URL, 샘플은 정적 서버 URL
  const [recordImageUrl, setRecordImageUrl] = useState<string | null>(null);

  // 이미지가 선택됐지만 아직 추론 전인 상태
  const stagedRef = useRef<StagedSource | null>(null);
  const [isStaged, setIsStaged] = useState(false);

  // ── 이미지 스테이징 (추론 없이 화면 전환만) ──────────────────────

  const stageFile = (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    stagedRef.current = { kind: "file", file, previewUrl };
    setImageUrl(previewUrl);
    setIsStaged(true);
    setPredictions([]);
    setProcessingTimeMs(null);
    setSampleFilename(null);
    setError(null);
  };

  const stageSample = (filename: string, split: "valid" | "test") => {
    stagedRef.current = { kind: "sample", filename, split };
    setImageUrl(`${API_BASE_URL}/thumbnail/${split}/${filename}`);
    setIsStaged(true);
    setPredictions([]);
    setProcessingTimeMs(null);
    setSampleFilename(null);
    setError(null);
  };

  // ── Analyze 버튼 클릭 시 실행 ────────────────────────────────────

  const analyze = async () => {
    const staged = stagedRef.current;
    if (!staged) return;

    setIsLoading(true);
    setIsStaged(false);
    setError(null);
    setPredictions([]);
    setProcessingTimeMs(null);

    if (staged.kind === "file") {
      const { file } = staged;
      const t0 = performance.now();
      const { blob: uploadBlob, dataUrl: resizedDataUrl } = await resizeForUpload(file, 1024);
      console.log(`[FE] 리사이즈     — ${(file.size / 1024).toFixed(0)} KB → ${(uploadBlob.size / 1024).toFixed(0)} KB  (${(performance.now() - t0).toFixed(0)} ms)`);

      // data URL을 표시 이미지로 — blob URL과 달리 revoke 없이 항상 유효
      setImageUrl(resizedDataUrl);

      // 진료 기록 저장용으로는 blob URL 사용 (서버에 저장할 파일 경로가 필요)
      const resizedObjectUrl = URL.createObjectURL(uploadBlob);

      const formData = new FormData();
      formData.append("image", uploadBlob, file.name);

      try {
        const t1 = performance.now();
        const res = await fetch(`${API_BASE_URL}/predict`, { method: "POST", body: formData });
        const t2 = performance.now();
        console.log(`[FE] 서버 응답 수신  — ${((t2 - t1) / 1000).toFixed(2)}s`);

        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(err.detail ?? "Prediction failed");
        }

        const data: PredictResponse = await res.json();
        console.log(`[FE] JSON 파싱     — ${((performance.now() - t2) / 1000).toFixed(2)}s  (${data.predictions.length} predictions)`);

        setPredictions(data.predictions);
        setImageSize({ width: data.image_width, height: data.image_height });
        setProcessingTimeMs(data.processing_time_ms);
        setRecordImageUrl(resizedObjectUrl);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
        setIsStaged(true); // 실패 시 Analyze 버튼 복원
      } finally {
        setIsLoading(false);
      }

    } else {
      const { filename, split } = staged;
      console.log(`[FE] 샘플 추론 시작 — ${filename}`);
      const t0 = performance.now();

      try {
        const res = await fetch(
          `${API_BASE_URL}/predict-sample/${split}/${encodeURIComponent(filename)}`,
          { method: "POST" },
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(err.detail ?? "Prediction failed");
        }

        const t1 = performance.now();
        const data: PredictResponse = await res.json();
        console.log(`[FE] 서버 응답     — ${((t1 - t0) / 1000).toFixed(2)}s  (${data.predictions.length} predictions)`);

        // thumbnail URL은 staging 때 이미 imageUrl로 설정됨 — analyze 후에도 유지
        // StaticFiles 마운트는 서버 시작 시 디렉토리 유무에 따라 스킵될 수 있어 사용 불가
        const thumbnailUrl = `${API_BASE_URL}/thumbnail/${split}/${filename}`;
        setPredictions(data.predictions);
        setImageSize({ width: data.image_width, height: data.image_height });
        setProcessingTimeMs(data.processing_time_ms);
        setSampleFilename(split === "valid" ? filename : null);
        setRecordImageUrl(thumbnailUrl);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
        setIsStaged(true); // 실패 시 Analyze 버튼 복원
      } finally {
        setIsLoading(false);
      }
    }
  };

  // ── 필터 제어 ─────────────────────────────────────────────────────

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
    stagedRef.current = null;
    setIsStaged(false);
    setImageUrl(null);
    setImageSize(null);
    setPredictions([]);
    setFilters(defaultFilters);
    setError(null);
    setProcessingTimeMs(null);
    setSampleFilename(null);
    setRecordImageUrl(null);
  };

  return {
    imageUrl,
    imageSize,
    recordImageUrl,
    predictions,
    filters,
    isLoading,
    isStaged,
    error,
    processingTimeMs,
    sampleFilename,
    stageFile,
    stageSample,
    analyze,
    updateGlobalThreshold,
    updateClassThreshold,
    toggleClassVisibility,
    reset,
  };
}
