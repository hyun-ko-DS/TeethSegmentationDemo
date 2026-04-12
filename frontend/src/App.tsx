import { ControlSidebar } from "./components/ControlSidebar";
import { ImageUpload } from "./components/ImageUpload";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { SamplePicker } from "./components/SamplePicker";
import { SegmentationCanvas } from "./components/SegmentationCanvas";
import { useSegmentation } from "./hooks/useSegmentation";

function App() {
  const {
    imageUrl,
    predictions,
    filters,
    isLoading,
    error,
    processingTimeMs,
    sampleFilename,
    predict,
    predictSample,
    updateGlobalThreshold,
    updateClassThreshold,
    toggleClassVisibility,
    reset,
  } = useSegmentation();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* 헤더 */}
      <header className="border-b border-border px-6 py-3 flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Teeth Segmentation Demo</h1>
        {imageUrl && (
          <button
            onClick={reset}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded border border-border hover:border-foreground/40"
          >
            Reset
          </button>
        )}
      </header>

      {/* 메인 */}
      <main className="flex flex-1 gap-6 p-6 overflow-hidden">
        {/* 왼쪽: 이미지 영역 */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {!imageUrl ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground px-1">Choose an option</p>
              <div className="grid grid-cols-2 gap-4" style={{ minHeight: "220px" }}>
                <ImageUpload onFileSelect={predict} disabled={isLoading} />
                <SamplePicker onSelect={predict} onSamplePredict={predictSample} disabled={isLoading} />
              </div>
            </div>
          ) : (
            <div className="relative flex-1">
              <SegmentationCanvas
                imageUrl={imageUrl}
                predictions={predictions}
                filters={filters}
                sampleFilename={sampleFilename}
              />
              {isLoading && <LoadingOverlay />}
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-md px-4 py-2">
              {error}
            </div>
          )}

          {/* 결과 요약 */}
          {!isLoading && predictions.length > 0 && (
            <div className="text-xs text-muted-foreground px-1">
              {predictions.length} instance{predictions.length !== 1 ? "s" : ""} detected
              {processingTimeMs !== null && ` · ${(processingTimeMs / 1000).toFixed(1)}s`}
            </div>
          )}
        </div>

        {/* 오른쪽: 사이드바 — 이미지 선택 후에만 표시 */}
        {imageUrl && (
          <ControlSidebar
            filters={filters}
            onGlobalThresholdChange={updateGlobalThreshold}
            onClassThresholdChange={updateClassThreshold}
            onClassVisibilityToggle={toggleClassVisibility}
            processingTimeMs={processingTimeMs}
          />
        )}
      </main>
    </div>
  );
}

export default App;
