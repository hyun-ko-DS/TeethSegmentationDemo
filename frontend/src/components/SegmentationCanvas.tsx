import { useCallback, useEffect, useRef, useState } from "react";
import { GitCompareArrows, RotateCcw, ZoomIn } from "lucide-react";
import type { FilterState, Prediction } from "../types/prediction";
import { CLASS_COLORS, colorToCss, NUM_CLASSES } from "../constants/classes";
import { useCanvasRenderer } from "../hooks/useCanvasRenderer";
import { CompareModal } from "./CompareModal";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// 비교 뷰에서 사용할 고정 필터 — 기본값과 동일 (non-pathologies 숨김)
const COMPARE_FILTERS: FilterState = {
  globalThreshold: 0.01,
  classThresholds: Array(NUM_CLASSES).fill(0.01).map((v, i) => (i < 3 ? 0.25 : v)),
  classVisibility: Array(NUM_CLASSES).fill(true).map((_, i) => i >= 3),
};

interface Props {
  imageUrl: string;
  predictions: Prediction[];
  filters: FilterState;
  sampleFilename?: string | null;
}

interface Tooltip {
  x: number;
  y: number;
  text: string;
  color: string;
}

interface ViewState {
  scale: number;
  x: number; // translate X
  y: number; // translate Y
}

const INITIAL_VIEW: ViewState = { scale: 1, x: 0, y: 0 };
const MIN_SCALE = 1;
const MAX_SCALE = 8;
const ZOOM_FACTOR = 1.1; // 10%씩 — nested setState 없이 단일 setView로 처리

/** translate를 이미지 경계 밖으로 패닝되지 않도록 클램핑 */
function clamp(tx: number, ty: number, scale: number, containerW: number, containerH: number): ViewState {
  return {
    scale,
    x: Math.min(0, Math.max(containerW  * (1 - scale), tx)),
    y: Math.min(0, Math.max(containerH * (1 - scale), ty)),
  };
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

export function SegmentationCanvas({ imageUrl, predictions, filters, sampleFilename }: Props) {
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const innerRef    = useRef<HTMLDivElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);

  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });
  const [tooltip, setTooltip]   = useState<Tooltip | null>(null);

  // ── Ground Truth 비교 상태 ──────────────────────────────────
  const [showCompare, setShowCompare] = useState(false);
  const [gtPredictions, setGtPredictions] = useState<Prediction[]>([]);
  const [gtLoading, setGtLoading] = useState(false);
  const [gtError, setGtError] = useState<string | null>(null);

  // 샘플이 바뀌면 캐시된 GT 초기화
  useEffect(() => {
    setGtPredictions([]);
    setGtError(null);
    setShowCompare(false);
  }, [sampleFilename]);

  const openCompare = useCallback(async () => {
    if (!sampleFilename) return;
    if (gtPredictions.length > 0) {
      setShowCompare(true);
      return;
    }
    if (gtError) {
      setGtError(null);
    }
    setGtLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/ground-truth/${encodeURIComponent(sampleFilename)}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "GT not found" }));
        throw new Error(err.detail ?? "Ground truth not found");
      }
      const data = await res.json();
      setGtPredictions(data.predictions);
      setShowCompare(true);
    } catch (e) {
      setGtError(e instanceof Error ? e.message : "Failed to load ground truth");
    } finally {
      setGtLoading(false);
    }
  }, [sampleFilename, gtPredictions.length, gtError]);

  const onCompareButtonClick = useCallback(() => {
    if (showCompare) {
      setShowCompare(false);
      return;
    }
    void openCompare();
  }, [showCompare, openCompare]);
  const [zoomMode, setZoomMode] = useState(false);
  const [view, setView]         = useState<ViewState>(INITIAL_VIEW);
  const [isGrabbing, setIsGrabbing] = useState(false);

  const isDragging = useRef(false);
  const dragStart  = useRef({ mouseX: 0, mouseY: 0, viewX: 0, viewY: 0, containerW: 0, containerH: 0 });

  const { drawContours } = useCanvasRenderer(canvasRef, predictions, filters);

  // drawContours를 ref로 보관 — ResizeObserver 콜백에서 항상 최신 함수를 참조하기 위함
  const drawContoursRef = useRef(drawContours);
  useEffect(() => { drawContoursRef.current = drawContours; }, [drawContours]);

  const syncCanvasSize = () => {
    const inner  = innerRef.current;
    const canvas = canvasRef.current;
    if (!inner || !canvas) return;
    const img = inner.querySelector("img");
    if (!img) return;
    // canvas.width/height 재할당은 캔버스를 지우므로, 이후 반드시 다시 그려야 함
    canvas.width  = img.offsetWidth;
    canvas.height = img.offsetHeight;
    drawContoursRef.current();
  };

  useEffect(() => {
    syncCanvasSize();
    const observer = new ResizeObserver(syncCanvasSize);
    if (innerRef.current) observer.observe(innerRef.current);
    return () => observer.disconnect();
  }, [imageUrl, imgNaturalSize]);

  const resetZoom = useCallback(() => setView(INITIAL_VIEW), []);

  const toggleZoomMode = useCallback(() => {
    setZoomMode((prev) => {
      if (prev) setView(INITIAL_VIEW);
      return !prev;
    });
    setTooltip(null);
  }, []);

  /* ── 휠: scale + translate를 단일 setView 호출로 원자적 업데이트 ── */
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const vp = viewportRef.current;
    if (!vp) return;

    const rect   = vp.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;

    setView((prev) => {
      const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * factor));
      const ratio     = nextScale / prev.scale;
      // 커서 아래 이미지 좌표가 화면에서 움직이지 않도록 translate 보정
      const nextX = mouseX - (mouseX - prev.x) * ratio;
      const nextY = mouseY - (mouseY - prev.y) * ratio;
      return clamp(nextX, nextY, nextScale, rect.width, rect.height);
    });
  }, []);

  /* ── 드래그: document 레벨에서 처리 ──
     React onMouseLeave가 isDragging을 리셋하는 문제를 막으려면
     mousemove / mouseup을 document에 등록해야 한다.            */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!zoomMode) return;
    const vp = viewportRef.current;
    if (!vp) return;
    const { width, height } = vp.getBoundingClientRect();
    isDragging.current = true;
    setIsGrabbing(true);
    dragStart.current = {
      mouseX: e.clientX, mouseY: e.clientY,
      viewX: view.x,     viewY: view.y,
      containerW: width, containerH: height,
    };
    e.preventDefault(); // 텍스트 선택 방지
  }, [zoomMode, view.x, view.y]);

  useEffect(() => {
    const onDocMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      setView((prev) =>
        clamp(
          dragStart.current.viewX + dx,
          dragStart.current.viewY + dy,
          prev.scale,
          dragStart.current.containerW,
          dragStart.current.containerH,
        ),
      );
    };
    const onDocUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setIsGrabbing(false);
    };
    document.addEventListener("mousemove", onDocMove);
    document.addEventListener("mouseup",   onDocUp);
    return () => {
      document.removeEventListener("mousemove", onDocMove);
      document.removeEventListener("mouseup",   onDocUp);
    };
  }, []); // 마운트 시 1회 등록 — refs로만 값 참조하므로 deps 불필요

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      /* 드래그 중 툴팁 억제 */
      if (isDragging.current) { setTooltip(null); return; }

      /* 툴팁 히트테스트
         canvas.getBoundingClientRect()는 CSS transform 후 실제 화면 크기를 반환하므로
         줌 상태에서도 정규화 좌표 변환이 정확하다. */
      const canvas = canvasRef.current;
      if (!canvas || predictions.length === 0) { setTooltip(null); return; }

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

        if (pointInPolygon(nx, ny, polygon)) {
          const xs   = polygon.map((p) => p[0]);
          const ys   = polygon.map((p) => p[1]);
          const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
          if (area < minArea) { minArea = area; hit = pred; }
        }
      }

      const wr = wrapperRef.current?.getBoundingClientRect();
      const tx = e.clientX - (wr?.left ?? 0);
      const ty = e.clientY - (wr?.top  ?? 0);

      setTooltip(
        hit
          ? {
              x: tx,
              y: ty,
              text: `${hit.class_name}  conf = ${hit.confidence.toFixed(2)}`,
              color: colorToCss(CLASS_COLORS[hit.class_id]),
            }
          : null,
      );
    },
    [zoomMode, predictions, filters],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    // isDragging은 document mouseup에서 처리 — 여기서 리셋하면 빠른 드래그 시 끊김
  }, []);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* ── 툴바 (이미지 바깥 상단 우측) ─────────────────── */}
      <div className="flex justify-end items-center gap-1.5">
        {/* Compare with Ground Truth — 샘플 이미지 추론 후에만 표시 */}
        {sampleFilename && (
          <button
            type="button"
            onClick={onCompareButtonClick}
            disabled={gtLoading}
            title={showCompare ? "비교 뷰 닫기" : "Ground Truth와 나란히 비교"}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border
                       border-border bg-card text-muted-foreground
                       hover:text-foreground hover:border-foreground/40 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GitCompareArrows className="w-3.5 h-3.5 shrink-0" />
            {gtLoading ? "Loading…" : showCompare ? "Close comparison" : "Compare with Ground Truth"}
          </button>
        )}

        {zoomMode && view.scale > 1 && (
          <button
            onClick={resetZoom}
            title="원래 크기로"
            className="p-1.5 rounded border border-border bg-card text-muted-foreground
                       hover:text-foreground hover:border-foreground/40 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={toggleZoomMode}
          title={zoomMode ? "줌 모드 끄기" : "줌 모드 켜기"}
          className={`p-1.5 rounded border transition-colors ${
            zoomMode
              ? "bg-foreground text-background border-foreground"
              : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/40"
          }`}
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── 이미지 뷰포트 + 툴팁 / 또는 인라인 GT vs Pred ───────── */}
      <div
        ref={wrapperRef}
        className="relative w-full flex flex-col gap-3"
        onMouseMove={showCompare ? undefined : handleMouseMove}
        onMouseLeave={showCompare ? undefined : handleMouseLeave}
      >
        {showCompare && !gtError ? (
          <CompareModal
            imageUrl={imageUrl}
            gtPredictions={gtPredictions}
            predictions={predictions}
            filters={filters}
            onClose={() => setShowCompare(false)}
          />
        ) : (
          <>
            <div
              ref={viewportRef}
              className="overflow-hidden rounded-lg"
              style={{ cursor: zoomMode ? (isGrabbing ? "grabbing" : "grab") : "default" }}
              onWheel={zoomMode ? handleWheel : undefined}
              onMouseDown={zoomMode ? handleMouseDown : undefined}
            >
              <div
                ref={innerRef}
                className="relative w-full"
                style={{
                  transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                  transformOrigin: "0 0",
                  willChange: "transform",
                }}
              >
                <img
                  src={imageUrl}
                  alt="Uploaded dental"
                  className="w-full h-auto block"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                  }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 pointer-events-none"
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
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
          </>
        )}
      </div>

      {/* ── GT 에러 메시지 ─────────────────────────────────── */}
      {gtError && (
        <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-md px-3 py-1.5">
          GT 로드 실패: {gtError}
        </div>
      )}

    </div>
  );
}
