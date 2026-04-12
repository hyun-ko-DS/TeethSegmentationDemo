import { SlidersHorizontal } from "lucide-react";
import type { FilterState } from "../types/prediction";
import { ClassControl } from "./ClassControl";

interface Props {
  filters: FilterState;
  onGlobalThresholdChange: (value: number) => void;
  onClassThresholdChange: (classId: number, value: number) => void;
  onClassVisibilityToggle: (classId: number) => void;
  processingTimeMs: number | null;
}

const NON_PATHOLOGIES = [
  { id: 0, name: "Abrasion" },
  { id: 1, name: "Filling" },
  { id: 2, name: "Crown" },
];

const PATHOLOGIES = [
  { id: 3, name: "Caries Class 1" },
  { id: 4, name: "Caries Class 2" },
  { id: 5, name: "Caries Class 3" },
  { id: 6, name: "Caries Class 4" },
  { id: 7, name: "Caries Class 5" },
  { id: 8, name: "Caries Class 6" },
];

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

      {/* Non-Pathologies 그룹 */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-muted-foreground px-1 uppercase tracking-wide">
          Non-Pathologies
        </span>
        {NON_PATHOLOGIES.map(({ id, name }) => (
          <ClassControl
            key={id}
            classId={id}
            className={name}
            threshold={filters.classThresholds[id]}
            visible={filters.classVisibility[id]}
            onThresholdChange={(v) => onClassThresholdChange(id, v)}
            onVisibilityToggle={() => onClassVisibilityToggle(id)}
          />
        ))}
      </div>

      {/* 구분선 */}
      <div className="border-t border-border" />

      {/* Pathologies 그룹 */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-muted-foreground px-1 uppercase tracking-wide">
          Pathologies
        </span>
        {PATHOLOGIES.map(({ id, name }) => (
          <ClassControl
            key={id}
            classId={id}
            className={name}
            threshold={filters.classThresholds[id]}
            visible={filters.classVisibility[id]}
            onThresholdChange={(v) => onClassThresholdChange(id, v)}
            onVisibilityToggle={() => onClassVisibilityToggle(id)}
          />
        ))}
      </div>
    </aside>
  );
}
