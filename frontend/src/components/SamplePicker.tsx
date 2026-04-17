import { useEffect, useRef, useState } from "react";
import { Images, X } from "lucide-react";
import { cn } from "../lib/utils";
import { useLang } from "../contexts/LangContext";
import { UI } from "../constants/uiStrings";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type Split = "valid" | "test";

interface Props {
  onSampleStage: (filename: string, split: Split) => void;
  disabled?: boolean;
}

export function SamplePicker({ onSampleStage, disabled }: Props) {
  const t = UI[useLang()];
  const [open, setOpen] = useState(false);
  const [split, setSplit] = useState<Split>("valid");
  const [filenames, setFilenames] = useState<string[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);

  // split 바뀔 때마다 해당 폴더 파일 목록 재조회
  useEffect(() => {
    if (!open) return;
    setFilenames([]);
    fetch(`${API_BASE_URL}/samples/${split}`)
      .then((r) => r.json())
      .then((d) => setFilenames(d.filenames ?? []))
      .catch(() => {});
  }, [open, split]);

  // 초기 전체 이미지 수 표시용 (valid + test 합산)
  const [totalCount, setTotalCount] = useState(0);
  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/samples/valid`).then((r) => r.json()).catch(() => ({ filenames: [] })),
      fetch(`${API_BASE_URL}/samples/test`).then((r) => r.json()).catch(() => ({ filenames: [] })),
    ]).then(([v, t]) => {
      setTotalCount((v.filenames ?? []).length + (t.filenames ?? []).length);
    });
  }, []);

  // 모달 바깥 클릭 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    if (disabled) return;
    setSplit("valid");   // 열 때마다 valid로 초기화
    setOpen(true);
  };

  const handlePick = (filename: string) => {
    setOpen(false);
    onSampleStage(filename, split);
  };

  return (
    <>
      {/* 진입 버튼 */}
      <button
        onClick={handleOpen}
        disabled={disabled}
        className={cn(
          "flex flex-col items-center justify-center gap-3 w-full h-full",
          "border-2 border-dashed rounded-xl p-12 cursor-pointer",
          "transition-colors duration-150",
          "border-border hover:border-primary/60 hover:bg-primary/5",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <Images className="w-10 h-10 text-muted-foreground" />
        <div className="text-center">
          <p className="text-base font-medium text-foreground">{t.sampleTitle}</p>
          <p className="text-sm text-muted-foreground mt-1">{t.sampleCount(totalCount)}</p>
        </div>
      </button>

      {/* 팝업 모달 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            ref={dialogRef}
            className="bg-background border border-border rounded-xl shadow-2xl w-[720px] max-w-[95vw] max-h-[80vh] flex flex-col"
          >
            {/* 모달 헤더 */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border shrink-0">
              {/* Split 토글 */}
              <div className="flex rounded-md border border-border overflow-hidden text-xs">
                <button
                  onClick={() => setSplit("valid")}
                  className={cn(
                    "px-3 py-1.5 transition-colors",
                    split === "valid"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  )}
                >
                  {t.splitValid}
                </button>
                <div className="w-px bg-border" />
                <button
                  onClick={() => setSplit("test")}
                  className={cn(
                    "px-3 py-1.5 transition-colors",
                    split === "test"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  )}
                >
                  {t.splitTest}
                </button>
              </div>

              <span className="text-xs text-muted-foreground ml-auto">
                {t.imageCount(filenames.length)}
              </span>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 이미지 그리드 */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              <div className="grid grid-cols-4 gap-3">
                {filenames.length === 0 ? (
                  <p className="col-span-4 text-center text-xs text-muted-foreground py-8">
                    {t.loading}
                  </p>
                ) : (
                  filenames.map((filename, idx) => {
                    const label = `image_${String(idx + 1).padStart(2, "0")}`;
                    return (
                      <button
                        key={filename}
                        onClick={() => handlePick(filename)}
                        disabled={disabled}
                        className={cn(
                          "flex flex-col rounded-lg overflow-hidden border border-border",
                          "hover:border-primary/60 hover:scale-[1.02] transition-all",
                          disabled && "opacity-50 pointer-events-none",
                        )}
                        title={filename}
                      >
                        <div className="aspect-video w-full overflow-hidden bg-muted shrink-0">
                          <img
                            src={`${API_BASE_URL}/thumbnail/${split}/${filename}`}
                            alt={label}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="bg-black/70 px-1.5 py-0.5 w-full">
                          <p className="text-[10px] text-white truncate text-left">{label}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
