import { useEffect, useRef, useState } from "react";
import { useLang } from "../contexts/LangContext";
import { UI } from "../constants/uiStrings";

const ESTIMATED_MS = [400, 5000, 3500, 600] as const;

const TICK_MS = 50;

export function LoadingOverlay() {
  const t = UI[useLang()];
  const [stageIdx, setStageIdx] = useState(0);
  const startTimeRef = useRef(performance.now());

  useEffect(() => {
    if (stageIdx >= ESTIMATED_MS.length) return;

    startTimeRef.current = performance.now();
    const isLast = stageIdx === ESTIMATED_MS.length - 1;
    if (isLast) return; // 마지막 단계는 실제 응답까지 대기

    const estimated = ESTIMATED_MS[stageIdx];

    const id = setInterval(() => {
      const elapsed = performance.now() - startTimeRef.current;
      if (elapsed >= estimated) {
        clearInterval(id);
        setStageIdx((prev) => prev + 1);
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, [stageIdx]);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg z-10">
      <div className="flex flex-col gap-3 w-56 px-6 py-5 rounded-xl bg-white border-2 border-primary/20 shadow-2xl">
        <p className="text-sm font-semibold text-foreground tracking-tight">{t.analyzing}</p>

        <div className="flex flex-col gap-2">
          {t.stages.map((label, i) => {
            const isDone   = i < stageIdx;
            const isActive = i === stageIdx;

            return (
              <div key={label} className="flex items-center justify-between">
                <span
                  className={`text-xs ${
                    isDone || isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
                {isDone && <span className="text-[10px] text-emerald-400">{t.done}</span>}
                {isActive && (
                  <span className="text-[10px] text-muted-foreground animate-pulse">
                    {t.running}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
