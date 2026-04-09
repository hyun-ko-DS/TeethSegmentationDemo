import type { ClassInfo } from "../types/prediction";

// config.json의 colors 배열에서 이식 (RGB 0~1 float)
export const CLASS_COLORS: [number, number, number][] = [
  [0.0, 1.0, 1.0],  // 0: Abrasion      — cyan
  [0.0, 0.0, 1.0],  // 1: Filling       — blue
  [0.5, 0.0, 0.5],  // 2: Crown         — purple
  [1.0, 1.0, 0.0],  // 3: Caries Cls 1  — yellow
  [1.0, 0.5, 0.0],  // 4: Caries Cls 2  — orange
  [1.0, 0.0, 0.0],  // 5: Caries Cls 3  — red
  [1.0, 0.0, 1.0],  // 6: Caries Cls 4  — magenta
  [0.0, 1.0, 0.0],  // 7: Caries Cls 5  — green
  [0.6, 0.3, 0.1],  // 8: Caries Cls 6  — brown
];

export const CLASS_NAMES = [
  "Abrasion",
  "Filling",
  "Crown",
  "Caries Class 1",
  "Caries Class 2",
  "Caries Class 3",
  "Caries Class 4",
  "Caries Class 5",
  "Caries Class 6",
] as const;

export const NUM_CLASSES = CLASS_NAMES.length;

export const CLASSES: ClassInfo[] = CLASS_NAMES.map((name, i) => ({
  class_id: i,
  class_name: name,
  color: CLASS_COLORS[i],
}));

/** [R, G, B] (0~1) → CSS rgb() 문자열 */
export function colorToCss(color: [number, number, number]): string {
  const [r, g, b] = color.map((v) => Math.round(v * 255));
  return `rgb(${r}, ${g}, ${b})`;
}
