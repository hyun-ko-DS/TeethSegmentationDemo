import { useEffect, useRef, useState } from "react";
import { X, ClipboardCheck } from "lucide-react";
import { useLang } from "../contexts/LangContext";
import { UI } from "../constants/uiStrings";
import { CLASS_COLORS, colorToCss } from "../constants/classes";
import type { Prediction } from "../types/prediction";

const PATHOLOGY_IDS = new Set([3, 4, 5, 6, 7, 8]); // Caries Class 1–6

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

function formatDatetime(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}`
  );
}

/**
 * imageUrl → 최대 1024px 리사이즈 후 JPEG base64 반환.
 * fetch() 대신 Image 요소를 사용해 blob URL / 서버 URL 모두 안전하게 처리.
 * - blob URL (업로드 파일): same-origin → crossOrigin 불필요, canvas taint 없음
 * - http URL (서버 정적): crossOrigin="anonymous" + 서버 CORS(*)로 taint 없음
 */
/**
 * imageUrl → 최대 1024px 리사이즈 + Pathology polygon overlay 후 JPEG base64 반환.
 * predictions 중 class_id 3~8 (Caries Class 1–6) 만 그림.
 *
 * 서버 URL: ?_t=timestamp 캐시버스터로 CORS 헤더 포함 재요청.
 * blob URL: same-origin → crossOrigin 불필요.
 */
function imageToBase64WithOverlay(
  url: string,
  predictions: Prediction[],
  maxPx = 1024,
): Promise<string> {
  const isBlobUrl = url.startsWith("blob:");
  const loadUrl = isBlobUrl ? url : `${url}?_t=${Date.now()}`;

  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!isBlobUrl) img.crossOrigin = "anonymous";

    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      // 1. 이미지 그리기
      ctx.drawImage(img, 0, 0, w, h);

      // 2. Pathology polygon overlay (class_id 3–8)
      const pathologies = predictions.filter((p) => PATHOLOGY_IDS.has(p.class_id));
      for (const pred of pathologies) {
        const { class_id, polygon } = pred;
        if (polygon.length < 3) continue;
        ctx.beginPath();
        ctx.moveTo(polygon[0][0] * w, polygon[0][1] * h);
        for (let i = 1; i < polygon.length; i++) {
          ctx.lineTo(polygon[i][0] * w, polygon[i][1] * h);
        }
        ctx.closePath();
        ctx.strokeStyle = colorToCss(CLASS_COLORS[class_id]);
        ctx.lineWidth = Math.max(1.5, w / 600);
        ctx.lineJoin = "round";
        ctx.stroke();
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Canvas toBlob failed")); return; }
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.88,
      );
    };

    img.onerror = () => reject(new Error(`Image load failed (${loadUrl})`));
    img.src = loadUrl;
  });
}

type Gender = "M" | "F" | "";

interface Props {
  onClose: () => void;
  predictions: Prediction[];
  imageUrl: string;
}

export function RecordModal({ onClose, predictions, imageUrl }: Props) {
  const t = UI[useLang()];
  const [patientName, setPatientName] = useState("");
  const [gender, setGender] = useState<Gender>("");
  const [age, setAge] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const datetime = useRef(formatDatetime());
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const isValid = patientName.trim() !== "" && gender !== "" && age.trim() !== "";

  const handleRegister = async () => {
    if (!isValid) { inputRef.current?.focus(); return; }

    setIsSaving(true);
    setSaveError(null);

    try {
      let image_base64: string;
      try {
        image_base64 = await imageToBase64WithOverlay(imageUrl, predictions);
      } catch (e) {
        throw new Error(`이미지 변환 실패: ${e instanceof Error ? e.message : String(e)}`);
      }

      const res = await fetch(`${API_BASE_URL}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_name: patientName.trim(),
          gender,
          age: parseInt(age, 10),
          visit_datetime: datetime.current,
          predictions,
          image_base64,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail ?? "Save failed");
      }

      setRegistered(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div className="relative w-[380px] max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-foreground">{t.recordTitle}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 본문 */}
        <div className="px-4 py-4">
          {!registered ? (
            <div className="flex flex-col gap-3">

              {/* 2×2 그리드 */}
              <div className="grid grid-cols-2 gap-2">

                {/* 환자명 */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">{t.patientName}</label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleRegister(); }}
                    placeholder=""
                    className="w-full px-2.5 py-1.5 text-sm rounded-md border border-border bg-white
                               text-foreground
                               focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                               transition-colors"
                  />
                </div>

                {/* 성별 */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">{t.gender}</label>
                  <div className="flex rounded-md border border-border overflow-hidden text-sm h-[34px]">
                    {(["M", "F"] as const).map((g, idx) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`flex-1 transition-colors font-medium text-sm ${
                          idx === 0 ? "border-r border-border" : ""
                        } ${
                          gender === g
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        {g === "M" ? t.genderMale : t.genderFemale}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 나이 */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">{t.age}</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleRegister(); }}
                    placeholder=""
                    className="w-full px-2.5 py-1.5 text-sm rounded-md border border-border bg-white
                               text-foreground
                               focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                               transition-colors"
                  />
                </div>

                {/* 진료 일시 (read-only) */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">{t.visitDatetime}</label>
                  <div className="px-2.5 py-1.5 text-sm rounded-md border border-border bg-muted text-muted-foreground select-none h-[34px] flex items-center">
                    {datetime.current}
                  </div>
                </div>

              </div>

              {/* 에러 메시지 */}
              {saveError && (
                <p className="text-xs text-red-500">{saveError}</p>
              )}

              {/* 등록 버튼 */}
              <button
                onClick={() => void handleRegister()}
                disabled={!isValid || isSaving}
                className="w-full py-1.5 rounded-lg bg-primary text-white text-sm font-semibold
                           hover:bg-primary/90 active:bg-primary/80 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSaving ? t.savingRecord : t.register}
              </button>
            </div>
          ) : (
            /* 등록 완료 */
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <ClipboardCheck className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground text-center">{t.recordSuccess}</p>
              <button
                onClick={onClose}
                className="w-full py-2 rounded-lg border border-border text-sm text-muted-foreground
                           hover:bg-muted/50 hover:text-foreground transition-colors"
              >
                {t.close}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
