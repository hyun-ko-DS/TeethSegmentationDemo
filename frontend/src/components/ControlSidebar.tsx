import * as Slider from "@radix-ui/react-slider";
import { SlidersHorizontal } from "lucide-react";
import { CLASS_NAMES } from "../constants/classes";
import type { FilterState } from "../types/prediction";
import { ClassControl } from "./ClassControl";

interface Props {
  filters: FilterState;
  onGlobalThresholdChange: (value: number) => void;
  onClassThresholdChange: (classId: number, value: number) => void;
  onClassVisibilityToggle: (classId: number) => void;
  processingTimeMs: number | null;
}

export function ControlSidebar({
  filters,
  onGlobalThresholdChange,
  onClassThresholdChange,
  onClassVisibilityToggle,
  processingTimeMs,
}: Props) {
  return (
    <aside className="flex flex-col gap-4 w-72 shrink-0 h-full overflow-y-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-1">
        <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">Controls</span>
        {processingTimeMs !== null && (
          <span className="ml-auto text-xs text-muted-foreground">
            {(processingTimeMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {/* 전체 Threshold */}
      <div className="flex flex-col gap-2 p-3 rounded-md bg-card border border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">Global Threshold</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {filters.globalThreshold.toFixed(2)}
          </span>
        </div>
        <Slider.Root
          min={0}
          max={1}
          step={0.01}
          value={[filters.globalThreshold]}
          onValueChange={([v]) => onGlobalThresholdChange(v)}
          className="relative flex items-center select-none touch-none w-full h-4"
        >
          <Slider.Track className="bg-muted relative grow rounded-full h-1.5">
            <Slider.Range className="absolute h-full rounded-full bg-foreground/70" />
          </Slider.Track>
          <Slider.Thumb className="block w-4 h-4 rounded-full border-2 border-foreground bg-background focus:outline-none focus:ring-1 focus:ring-border" />
        </Slider.Root>
      </div>

      {/* 구분선 */}
      <div className="border-t border-border" />

      {/* 클래스별 컨트롤 */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground px-1">Per-Class</span>
        {CLASS_NAMES.map((name, i) => (
          <ClassControl
            key={i}
            classId={i}
            className={name}
            threshold={filters.classThresholds[i]}
            visible={filters.classVisibility[i]}
            onThresholdChange={(v) => onClassThresholdChange(i, v)}
            onVisibilityToggle={() => onClassVisibilityToggle(i)}
          />
        ))}
      </div>
    </aside>
  );
}
