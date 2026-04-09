import { useEffect, useRef, useState } from "react";
import { Images, X } from "lucide-react";
import { cn } from "../lib/utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

interface Props {
  onSelect: (file: File) => void;
  onSamplePredict: (filename: string) => void;
  disabled?: boolean;
}

export function SamplePicker({ onSelect: _onSelect, onSamplePredict, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [filenames, setFilenames] = useState<string[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/samples`)
      .then((r) => r.json())
      .then((d) => setFilenames(d.filenames ?? []))
      .catch(() => {});
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

  const handlePick = (filename: string) => {
    setOpen(false);
    onSamplePredict(filename);
  };

  return (
    <>
      {/* 오른쪽 사각형 버튼 */}
      <button
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={cn(
          "flex flex-col items-center justify-center gap-3 w-full h-full",
          "border-2 border-dashed rounded-xl p-12 cursor-pointer",
          "transition-colors duration-150",
          "border-border hover:border-foreground/40 hover:bg-muted/20",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <Images className="w-8 h-8 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Choose from existing images</p>
          <p className="text-xs text-muted-foreground mt-1">{filenames.length} images available</p>
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
            <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
              <span className="text-sm font-semibold">Select an image</span>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 이미지 그리드 */}
            <div className="overflow-y-auto p-4 grid grid-cols-4 gap-3">
              {filenames.map((filename) => (
                  <button
                    key={filename}
                    onClick={() => handlePick(filename)}
                    disabled={disabled}
                    className={cn(
                      "relative aspect-video rounded-lg overflow-hidden border border-border",
                      "hover:border-foreground/50 hover:scale-[1.02] transition-all",
                      disabled && "opacity-50 pointer-events-none",
                    )}
                    title={filename}
                  >
                    <img
                      src={`${API_BASE_URL}/thumbnail/${filename}`}
                      alt={filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1.5 py-0.5">
                      <p className="text-[10px] text-white truncate">{filename}</p>
                    </div>
                  </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
