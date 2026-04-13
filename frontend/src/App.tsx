import { useState } from "react";
import { ControlSidebar } from "./components/ControlSidebar";
import { ImageUpload } from "./components/ImageUpload";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { RecordModal } from "./components/RecordModal";
import { SamplePicker } from "./components/SamplePicker";
import { SegmentationCanvas } from "./components/SegmentationCanvas";
import { useSegmentation } from "./hooks/useSegmentation";
import type { Lang } from "./constants/classDescriptions";
import { LangContext } from "./contexts/LangContext";
import { UI } from "./constants/uiStrings";

function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [showRecord, setShowRecord] = useState(false);

  const {
    imageUrl,
    predictions,
    filters,
    isLoading,
    isStaged,
    error,
    processingTimeMs,
    sampleFilename,
    stageFile,
    stageSample,
    analyze,
    updateGlobalThreshold,
    updateClassThreshold,
    toggleClassVisibility,
    reset,
  } = useSegmentation();

  const t = UI[lang];

  return (
    <LangContext.Provider value={lang}>
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* 헤더 */}
      <header className="border-b-2 border-primary/30 bg-white px-6 py-3 flex items-center gap-3 shadow-sm">
        <button
          onClick={reset}
          className="flex items-center gap-2.5 group"
          aria-label="CariesOn — 홈으로"
        >
          {/* 치아 + 충치 포인트 로고 */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="shrink-0"
          >
            {/* 치아 몸체 */}
            <path
              d="M12 2C8 2 5 4.5 5 8.5c0 3.5.5 5.5 1.5 8L8 23q.5 1.5 2 .5l1-4.5q.5-1.5 1-1.5t1 1.5l1 4.5q1.5 1 2-.5l1.5-6.5C18.5 14 19 12 19 8.5 19 4.5 16 2 12 2z"
              fill="hsl(222,68%,27%)"
            />
            {/* 충치 포인트 (red dot) */}
            <circle cx="9.5" cy="9" r="2.2" fill="#ef4444" />
          </svg>

          <h1 className="text-lg font-semibold tracking-tight text-foreground group-hover:text-foreground/80 transition-colors">
            CariesOn
          </h1>
        </button>

        {/* EN / KO 토글 */}
        <div className="ml-auto flex items-center rounded-md border border-border overflow-hidden text-xs">
          {(["en", "ko"] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 transition-colors ${
                lang === l
                  ? "bg-primary text-white font-semibold"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/10"
              }`}
            >
              {l === "en" ? "EN" : "KO"}
            </button>
          ))}
        </div>
      </header>

      {/* 메인 */}
      <main className="flex flex-1 gap-6 p-6 overflow-hidden">
        {/* 왼쪽: 이미지 영역 */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {!imageUrl ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground px-1">{t.chooseOption}</p>
              <div className="grid grid-cols-2 gap-4" style={{ minHeight: "220px" }}>
                <ImageUpload onFileSelect={stageFile} disabled={isLoading} />
                <SamplePicker onSampleStage={stageSample} disabled={isLoading} />
              </div>
            </div>
          ) : (
            <div className="relative flex-1">
              <SegmentationCanvas
                imageUrl={imageUrl}
                predictions={predictions}
                filters={filters}
                sampleFilename={sampleFilename}
                isStaged={isStaged}
                onAnalyze={analyze}
                onRecordClick={() => setShowRecord(true)}
              />
              {isLoading && <LoadingOverlay />}
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2">
              {error}
            </div>
          )}

          {/* 결과 요약 */}
          {!isLoading && predictions.length > 0 && (
            <div className="text-xs text-muted-foreground px-1">
              {t.detected(
                predictions.length,
                processingTimeMs !== null ? (processingTimeMs / 1000).toFixed(1) : null,
              )}
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

    {showRecord && <RecordModal onClose={() => setShowRecord(false)} />}
    </LangContext.Provider>
  );
}

export default App;
