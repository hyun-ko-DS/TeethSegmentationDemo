import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { FilterState, Prediction } from "../types/prediction";
import { CLASS_COLORS, colorToCss } from "../constants/classes";
import { useLang } from "../contexts/LangContext";
import { UI } from "../constants/uiStrings";

// ── 캔버스 렌더링 ─────────────────────────────────────────────

function drawPredictions(
  canvas: HTMLCanvasElement,
  predictions: Prediction[],
  filters: FilterState,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const pred of predictions) {
    const { class_id, confidence, polygon } = pred;
    if (!filters.classVisibility[class_id]) continue;
    const thr = Math.max(filters.globalThreshold, filters.classThresholds[class_id] ?? 0);
    if (confidence < thr) continue;
    if (polygon.length < 3) continue;
    ctx.beginPath();
    ctx.moveTo(polygon[0][0] * canvas.width, polygon[0][1] * canvas.height);
    for (let i = 1; i < polygon.length; i++) {
      ctx.lineTo(polygon[i][0] * canvas.width, polygon[i][1] * canvas.height);
    }
    ctx.closePath();
    ctx.strokeStyle = colorToCss(CLASS_COLORS[class_id]);
    ctx.lineWidth = Math.max(1.5, canvas.width / 600);
    ctx.lineJoin = "round";
    ctx.stroke();
  }
}

/** Ray-casting point-in-polygon (정규화 좌표 기준) */
function pointInPolygon(px: number, py: number, polygon: [number, number][]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ── 단일 비교 패널 ─────────────────────────────────────────────

interface Tooltip {
  x: number;
  y: number;
  text: string;
  color: string;
}

interface PanelProps {
  title: string;
  imageUrl: string;
  predictions: Prediction[];
  filters: FilterState;
  /** true이면 툴팁에 confidence 표시, false이면 클래스명만 */
  showConfidence: boolean;
}

function ComparePanel({ title, imageUrl, predictions, filters, showConfidence }: PanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  // drawContoursRef: predictions/filters 변경 시 항상 최신 함수 참조
  const drawContoursRef = useRef(() => {});
  const syncAndDraw = () => {
    const canvas = canvasRef.current;
    const img    = containerRef.current?.querySelector("img");
    if (!canvas || !img) return;
    canvas.width  = img.offsetWidth;
    canvas.height = img.offsetHeight;
    drawPredictions(canvas, predictions, filters);
  };
  drawContoursRef.current = syncAndDraw;

  useEffect(() => {
    drawContoursRef.current();
  }, [predictions, filters]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container || predictions.length === 0) {
        setTooltip(null);
        return;
      }

      const cr = canvas.getBoundingClientRect();
      const mx = e.clientX - cr.left;
      const my = e.clientY - cr.top;

      if (mx < 0 || my < 0 || mx > cr.width || my > cr.height) {
        setTooltip(null);
        return;
      }

      const nx = mx / cr.width;
      const ny = my / cr.height;

      let hit: Prediction | null = null;
      let minArea = Infinity;

      for (const pred of predictions) {
        const { class_id, confidence, polygon } = pred;
        if (!filters.classVisibility[class_id]) continue;
        const thr = Math.max(filters.globalThreshold, filters.classThresholds[class_id] ?? 0);
        if (confidence < thr) continue;
        if (polygon.length < 3) continue;

        if (pointInPolygon(nx, ny, polygon as [number, number][])) {
          const xs   = polygon.map((p) => p[0]);
          const ys   = polygon.map((p) => p[1]);
          const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
          if (area < minArea) { minArea = area; hit = pred; }
        }
      }

      // 툴팁 위치는 container 기준
      const wr = container.getBoundingClientRect();
      const tx = e.clientX - wr.left;
      const ty = e.clientY - wr.top;

      setTooltip(
        hit
          ? {
              x: tx,
              y: ty,
              text: showConfidence
                ? `${hit.class_name}  conf = ${hit.confidence.toFixed(2)}`
                : hit.class_name,
              color: colorToCss(CLASS_COLORS[hit.class_id]),
            }
          : null,
      );
    },
    [predictions, filters, showConfidence],
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  return (
    <div className="flex flex-col gap-2 flex-1 min-w-0">
      <p className="text-[11px] font-semibold text-center text-muted-foreground uppercase tracking-widest">
        {title}
      </p>
      {/* relative wrapper — 툴팁 절대 위치 기준 */}
      <div
        className="relative"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div ref={containerRef} className="rounded-lg overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-auto block"
            onLoad={() => drawContoursRef.current()}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 px-2 py-1 text-xs rounded whitespace-nowrap"
            style={{
              left: tooltip.x + 14,
              top:  tooltip.y + 14,
              backgroundColor: "rgba(0, 0, 0, 0.78)",
              color:  tooltip.color,
              border: `1px solid ${tooltip.color}`,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 인라인 비교 (메인 레이아웃 안에서 좌우 배치, 별도 탭/전체화면 오버레이 없음) ──

interface Props {
  imageUrl: string;
  gtPredictions: Prediction[];
  predictions: Prediction[];
  filters: FilterState;
  onClose: () => void;
}

export function CompareModal({
  imageUrl,
  gtPredictions,
  predictions,
  filters,
  onClose,
}: Props) {
  const t = UI[useLang()];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="w-full flex flex-col gap-3 rounded-lg border border-border bg-card/30 p-4"
    >
      <div className="flex items-center justify-between shrink-0 gap-2">
        <span className="text-sm font-semibold">{t.gtVsPred}</span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="비교 닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 min-h-0 w-full">
        <ComparePanel
          title={t.groundTruth}
          imageUrl={imageUrl}
          predictions={gtPredictions}
          filters={filters}
          showConfidence={false}
        />
        <div className="hidden sm:block w-px bg-border shrink-0 self-stretch" />
        <div className="sm:hidden h-px w-full bg-border shrink-0" aria-hidden />
        <ComparePanel
          title={t.prediction}
          imageUrl={imageUrl}
          predictions={predictions}
          filters={filters}
          showConfidence={true}
        />
      </div>
    </div>
  );
}
