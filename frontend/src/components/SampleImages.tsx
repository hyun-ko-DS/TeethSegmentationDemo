import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const VISIBLE = 5; // 한 번에 보이는 썸네일 수

interface Props {
  onSelect: (file: File) => void;
  disabled?: boolean;
}

export function SampleImages({ onSelect, disabled }: Props) {
  const [filenames, setFilenames] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const url = `${API_BASE_URL}/samples`;
    console.log("[SampleImages] fetching", url);
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        console.log("[SampleImages] loaded", data.filenames?.length, "files");
        setFilenames(data.filenames ?? []);
      })
      .catch((e) => {
        console.error("[SampleImages] fetch failed", e);
        setFetchError(String(e));
      });
  }, []);

  if (fetchError) {
    return (
      <p className="text-xs text-red-400 px-1">
        샘플 이미지 로드 실패: {fetchError}
      </p>
    );
  }

  if (filenames.length === 0) return null;

  const canLeft = offset > 0;
  const canRight = offset + VISIBLE < filenames.length;
  const visible = filenames.slice(offset, offset + VISIBLE);

  const handleSelect = async (filename: string, idx: number) => {
    if (disabled || loadingIdx !== null) return;
    setLoadingIdx(idx);
    try {
      const res = await fetch(`${API_BASE_URL}/static/samples/${filename}`);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
      onSelect(file);
    } catch {
      /* ignore */
    } finally {
      setLoadingIdx(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground px-1">Pre-uploaded options</span>
      <div className="flex items-center gap-2">
        {/* 왼쪽 화살표 */}
        <button
          onClick={() => setOffset((o) => Math.max(0, o - VISIBLE))}
          disabled={!canLeft || disabled}
          className={cn(
            "shrink-0 p-1 rounded border border-border hover:border-foreground/40 transition-colors",
            (!canLeft || disabled) && "opacity-30 pointer-events-none",
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* 썸네일 목록 */}
        <div className="flex gap-2 flex-1 overflow-hidden">
          {visible.map((filename, i) => {
            const globalIdx = offset + i;
            const isLoading = loadingIdx === globalIdx;
            return (
              <button
                key={filename}
                onClick={() => handleSelect(filename, globalIdx)}
                disabled={disabled || loadingIdx !== null}
                className={cn(
                  "flex-1 aspect-video rounded overflow-hidden border border-border",
                  "hover:border-foreground/50 transition-colors relative",
                  (disabled || loadingIdx !== null) && "pointer-events-none opacity-60",
                )}
                title={filename}
              >
                <img
                  src={`${API_BASE_URL}/static/samples/${filename}`}
                  alt={filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {isLoading && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-foreground/40 border-t-foreground rounded-full animate-spin" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 오른쪽 화살표 */}
        <button
          onClick={() => setOffset((o) => Math.min(filenames.length - VISIBLE, o + VISIBLE))}
          disabled={!canRight || disabled}
          className={cn(
            "shrink-0 p-1 rounded border border-border hover:border-foreground/40 transition-colors",
            (!canRight || disabled) && "opacity-30 pointer-events-none",
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 페이지 인디케이터 */}
      <p className="text-xs text-muted-foreground text-center tabular-nums">
        {offset + 1}–{Math.min(offset + VISIBLE, filenames.length)} / {filenames.length}
      </p>
    </div>
  );
}
