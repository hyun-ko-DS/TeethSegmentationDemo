import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "../lib/utils";

interface Props {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function ImageUpload({ onFileSelect, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED.includes(file.type)) return;
      onFileSelect(file);
    },
    [onFileSelect],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        "border-2 border-dashed rounded-xl p-12 cursor-pointer",
        "transition-colors duration-150",
        isDragging
          ? "border-foreground/60 bg-muted/40"
          : "border-border hover:border-foreground/40 hover:bg-muted/20",
        disabled && "pointer-events-none opacity-50",
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      <Upload className="w-8 h-8 text-muted-foreground" />
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          Drop a dental image here
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          or click to browse — JPG, PNG, WebP up to 20 MB
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
