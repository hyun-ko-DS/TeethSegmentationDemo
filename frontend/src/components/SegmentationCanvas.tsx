import { useEffect, useRef, useState } from "react";
import type { FilterState, Prediction } from "../types/prediction";
import { useCanvasRenderer } from "../hooks/useCanvasRenderer";

interface Props {
  imageUrl: string;
  predictions: Prediction[];
  filters: FilterState;
}

export function SegmentationCanvas({ imageUrl, predictions, filters }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });

  useCanvasRenderer(canvasRef, predictions, filters);

  // 이미지 로드 시 canvas 크기를 표시 크기에 맞춤
  const syncCanvasSize = () => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const img = container.querySelector("img");
    if (!img) return;
    canvas.width = img.offsetWidth;
    canvas.height = img.offsetHeight;
  };

  useEffect(() => {
    syncCanvasSize();
    const observer = new ResizeObserver(syncCanvasSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [imageUrl, imgNaturalSize]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* 원본 이미지 레이어 */}
      <img
        src={imageUrl}
        alt="Uploaded dental"
        className="w-full h-auto block rounded-lg"
        onLoad={(e) => {
          const img = e.currentTarget;
          setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
        }}
      />
      {/* 윤곽선 오버레이 Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none rounded-lg"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
