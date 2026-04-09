import { Loader2 } from "lucide-react";

export function LoadingOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm rounded-lg z-10">
      <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      <p className="text-sm text-foreground font-medium">Running inference…</p>
      <p className="text-xs text-muted-foreground">SAM-3 + 4-model ensemble</p>
    </div>
  );
}
