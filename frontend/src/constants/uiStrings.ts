import type { Lang } from "./classDescriptions";

export const UI: Record<
  Lang,
  {
    // 메인 진입
    chooseOption: string;
    // ImageUpload
    dropTitle: string;
    dropSubtitle: string;
    // SamplePicker 버튼
    sampleTitle: string;
    sampleCount: (n: number) => string;
    // SamplePicker 모달
    splitValid: string;
    splitTest: string;
    imageCount: (n: number) => string;
    loading: string;
    // Analyze 버튼
    analyze: string;
    // 결과 요약
    detected: (n: number, timeS: string | null) => string;
    // ControlSidebar
    controls: string;
    nonPathologies: string;
    pathologies: string;
    // SegmentationCanvas
    compareGT: string;
    closeComparison: string;
    gtLoading: string;
    gtLoadFailed: string;
    // CompareModal
    gtVsPred: string;
    groundTruth: string;
    prediction: string;
    // LoadingOverlay
    analyzing: string;
    stages: readonly [string, string, string, string];
    done: string;
    running: string;
    // RecordModal
    recordButton: string;
    recordTitle: string;
    patientName: string;
    patientNamePlaceholder: string;
    visitDatetime: string;
    register: string;
    recordSuccess: string;
    close: string;
  }
> = {
  en: {
    chooseOption: "Choose an option",
    dropTitle: "Drop a dental image here",
    dropSubtitle: "or click to browse — JPG, PNG, WebP up to 20 MB",
    sampleTitle: "Choose from existing images",
    sampleCount: (n) => `${n} images available`,
    splitValid: "Valid (with GT)",
    splitTest: "Test (without GT)",
    imageCount: (n) => `${n} images`,
    loading: "Loading…",
    analyze: "Analyze",
    detected: (n, t) =>
      t !== null
        ? `${n} instance${n !== 1 ? "s" : ""} detected · ${t}s`
        : `${n} instance${n !== 1 ? "s" : ""} detected`,
    controls: "Controls",
    nonPathologies: "Non-Pathologies",
    pathologies: "Pathologies",
    compareGT: "Compare with Ground Truth",
    closeComparison: "Close comparison",
    gtLoading: "Loading…",
    gtLoadFailed: "GT load failed:",
    gtVsPred: "Ground Truth vs Prediction",
    groundTruth: "Ground Truth",
    prediction: "Prediction",
    analyzing: "Analyzing…",
    stages: ["Reading image", "Preprocessing", "Inference", "Ensemble"],
    done: "Done",
    running: "Running…",
    recordButton: "Update Medical Record",
    recordTitle: "Update Medical Record",
    patientName: "Patient Name",
    patientNamePlaceholder: "Enter patient name",
    visitDatetime: "Visit Date & Time",
    register: "Register",
    recordSuccess: "Medical record has been updated.",
    close: "Close",
  },
  ko: {
    chooseOption: "분석할 이미지를 선택하세요",
    dropTitle: "치아 이미지를 여기에 드래그하세요",
    dropSubtitle: "또는 클릭하여 업로드 — JPG, PNG, WebP, 최대 20MB",
    sampleTitle: "샘플 이미지에서 선택",
    sampleCount: (n) => `${n}개 이미지`,
    splitValid: "검증셋 (GT 포함)",
    splitTest: "테스트셋 (GT 없음)",
    imageCount: (n) => `${n}개`,
    loading: "불러오는 중…",
    analyze: "분석",
    detected: (n, t) =>
      t !== null ? `${n}개 병변 감지됨 · ${t}초` : `${n}개 병변 감지됨`,
    controls: "설정",
    nonPathologies: "비병변",
    pathologies: "병변",
    compareGT: "Ground Truth와 비교",
    closeComparison: "비교 닫기",
    gtLoading: "불러오는 중…",
    gtLoadFailed: "GT 로드 실패:",
    gtVsPred: "Ground Truth vs 예측 결과",
    groundTruth: "Ground Truth",
    prediction: "예측 결과",
    analyzing: "분석 중…",
    stages: ["이미지 불러오기", "전처리", "추론", "앙상블"],
    done: "완료",
    running: "진행 중…",
    recordButton: "진료 기록 업데이트",
    recordTitle: "진료 기록 업데이트",
    patientName: "환자명",
    patientNamePlaceholder: "환자명을 입력하세요",
    visitDatetime: "진료 일시",
    register: "등록",
    recordSuccess: "진료 기록이 업데이트되었습니다.",
    close: "닫기",
  },
};
