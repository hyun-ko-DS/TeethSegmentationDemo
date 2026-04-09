import * as Checkbox from "@radix-ui/react-checkbox";
import * as Slider from "@radix-ui/react-slider";
import * as Label from "@radix-ui/react-label";
import { Check } from "lucide-react";
import { colorToCss, CLASS_COLORS } from "../constants/classes";
import { cn } from "../lib/utils";

interface Props {
  classId: number;
  className: string;
  threshold: number;
  visible: boolean;
  onThresholdChange: (value: number) => void;
  onVisibilityToggle: () => void;
}

export function ClassControl({
  classId,
  className,
  threshold,
  visible,
  onThresholdChange,
  onVisibilityToggle,
}: Props) {
  const color = colorToCss(CLASS_COLORS[classId]);
  const checkboxId = `class-vis-${classId}`;

  return (
    <div className={cn("flex flex-col gap-1.5 py-2 px-3 rounded-md", "bg-card/50 border border-border/50")}>
      {/* 상단: 체크박스 + 색상 도트 + 클래스명 */}
      <div className="flex items-center gap-2">
        <Checkbox.Root
          id={checkboxId}
          checked={visible}
          onCheckedChange={onVisibilityToggle}
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded",
            "border border-border bg-background",
            "data-[state=checked]:bg-primary data-[state=checked]:border-primary",
            "focus:outline-none focus:ring-1 focus:ring-border",
          )}
          style={visible ? { backgroundColor: color, borderColor: color } : undefined}
        >
          <Checkbox.Indicator>
            <Check className="h-3 w-3 text-white" />
          </Checkbox.Indicator>
        </Checkbox.Root>

        {/* 색상 도트 */}
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />

        <Label.Root
          htmlFor={checkboxId}
          className={cn(
            "text-xs font-medium cursor-pointer select-none flex-1",
            visible ? "text-foreground" : "text-muted-foreground line-through",
          )}
        >
          {className}
        </Label.Root>

        <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
          {threshold.toFixed(2)}
        </span>
      </div>

      {/* 슬라이더 */}
      <Slider.Root
        min={0.01}
        max={1}
        step={0.01}
        value={[threshold]}
        onValueChange={([v]) => onThresholdChange(v)}
        disabled={!visible}
        className="relative flex items-center select-none touch-none w-full h-4"
      >
        <Slider.Track className="bg-muted relative grow rounded-full h-1">
          <Slider.Range
            className="absolute h-full rounded-full"
            style={{ backgroundColor: visible ? color : undefined }}
          />
        </Slider.Track>
        <Slider.Thumb
          className={cn(
            "block w-3 h-3 rounded-full border-2 bg-background",
            "focus:outline-none focus:ring-1 focus:ring-border",
            "disabled:opacity-40 disabled:cursor-not-allowed",
          )}
          style={{ borderColor: visible ? color : undefined }}
        />
      </Slider.Root>
    </div>
  );
}
