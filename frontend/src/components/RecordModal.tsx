import { useEffect, useRef, useState } from "react";
import { X, ClipboardCheck } from "lucide-react";
import { useLang } from "../contexts/LangContext";
import { UI } from "../constants/uiStrings";

function formatDatetime(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}`
  );
}

interface Props {
  onClose: () => void;
}

export function RecordModal({ onClose }: Props) {
  const t = UI[useLang()];
  const [patientName, setPatientName] = useState("");
  const [registered, setRegistered] = useState(false);
  const datetime = useRef(formatDatetime());
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ESC 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // 열릴 때 input 포커스
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleRegister = () => {
    if (!patientName.trim()) {
      inputRef.current?.focus();
      return;
    }
    setRegistered(true);
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div className="relative w-[360px] max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">

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
        <div className="px-5 py-5">
          {!registered ? (
            <div className="flex flex-col gap-4">
              {/* 환자명 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">{t.patientName}</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRegister(); }}
                  placeholder={t.patientNamePlaceholder}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white
                             text-foreground placeholder:text-muted-foreground
                             focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                             transition-colors"
                />
              </div>

              {/* 진료 일시 (read-only) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">{t.visitDatetime}</label>
                <div className="px-3 py-2 text-sm rounded-lg border border-border bg-muted text-muted-foreground select-none">
                  {datetime.current}
                </div>
              </div>

              {/* 등록 버튼 */}
              <button
                onClick={handleRegister}
                className="w-full py-2 mt-1 rounded-lg bg-primary text-white text-sm font-semibold
                           hover:bg-primary/90 active:bg-primary/80 transition-colors"
              >
                {t.register}
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
