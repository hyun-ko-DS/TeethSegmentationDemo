import { useCallback, useEffect } from "react";
import type { FilterState, Prediction } from "../types/prediction";
import { CLASS_COLORS, colorToCss } from "../constants/classes";

export function useCanvasRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  predictions: Prediction[],
  filters: FilterState,
) {
  const drawContours = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const pred of predictions) {
      const { class_id, confidence, polygon } = pred;

      // visibility 체크
      if (!filters.classVisibility[class_id]) continue;

      // threshold 체크: 전체 OR 클래스별 중 큰 값 적용
      const effectiveThreshold = Math.max(
        filters.globalThreshold,
        filters.classThresholds[class_id] ?? 0,
      );
      if (confidence < effectiveThreshold) continue;

      if (polygon.length < 3) continue;

      // 정규화 좌표 → Canvas 픽셀 좌표 변환
      ctx.beginPath();
      ctx.moveTo(polygon[0][0] * canvas.width, polygon[0][1] * canvas.height);
      for (let i = 1; i < polygon.length; i++) {
        ctx.lineTo(polygon[i][0] * canvas.width, polygon[i][1] * canvas.height);
      }
      ctx.closePath();

      // 윤곽선만 그리기 (채우기 없음)
      ctx.strokeStyle = colorToCss(CLASS_COLORS[class_id]);
      ctx.lineWidth = Math.max(2, canvas.width / 600);
      ctx.lineJoin = "round";
      ctx.stroke();
    }
  }, [canvasRef, predictions, filters]);

  // filters 또는 predictions 변경 시 즉각 재렌더링 (API 재호출 없음)
  useEffect(() => {
    drawContours();
  }, [drawContours]);

  return { drawContours };
}
