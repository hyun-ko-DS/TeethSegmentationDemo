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
    // GNB nav
    navQuickDiagnosis: string;
    recordsNav: string;
    // Records page
    backToMain: string;
    recordsEmpty: string;
    recordsLoadError: string;
    colNo: string;
    colPatient: string;
    colGender: string;
    colAge: string;
    colDatetime: string;
    colSeverity: string;
    colStatus: string;
    severityNone: string;
    severityMild: string;
    severityModerate: string;
    severitySevere: string;
    detailTitle: string;
    detailDetections: string;
    savingRecord: string;
    saveError: string;
    // RecordModal
    recordButton: string;
    recordTitle: string;
    patientName: string;
    patientNamePlaceholder: string;
    gender: string;
    genderMale: string;
    genderFemale: string;
    age: string;
    agePlaceholder: string;
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
    navQuickDiagnosis: "Quick Diagnosis",
    recordsNav: "Records",
    backToMain: "Back",
    recordsEmpty: "No records yet.",
    recordsLoadError: "Failed to load records.",
    colNo: "#",
    colPatient: "Patient",
    colGender: "Gender",
    colAge: "Age",
    colDatetime: "Visit Date",
    colSeverity: "Severity",
    colStatus: "Status",
    severityNone: "None",
    severityMild: "Mild",
    severityModerate: "Moderate",
    severitySevere: "Severe",
    detailTitle: "Record Detail",
    detailDetections: "Detections",
    savingRecord: "Saving…",
    saveError: "Failed to save record.",
    recordButton: "Update Medical Record",
    recordTitle: "Update Medical Record",
    patientName: "Patient Name",
    patientNamePlaceholder: "Enter patient name",
    gender: "Gender",
    genderMale: "Male",
    genderFemale: "Female",
    age: "Age",
    agePlaceholder: "Enter age",
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
    navQuickDiagnosis: "빠른 진단",
    recordsNav: "진료 기록",
    backToMain: "돌아가기",
    recordsEmpty: "저장된 기록이 없습니다.",
    recordsLoadError: "기록을 불러오지 못했습니다.",
    colNo: "#",
    colPatient: "환자명",
    colGender: "성별",
    colAge: "나이",
    colDatetime: "진료일시",
    colSeverity: "중증도",
    colStatus: "진행 상태",
    severityNone: "없음",
    severityMild: "경증",
    severityModerate: "중증",
    severitySevere: "심각",
    detailTitle: "진료 기록 상세",
    detailDetections: "검출 결과",
    savingRecord: "저장 중…",
    saveError: "저장에 실패했습니다.",
    recordButton: "진료 기록 업데이트",
    recordTitle: "진료 기록 업데이트",
    patientName: "환자명",
    patientNamePlaceholder: "환자명을 입력하세요",
    gender: "성별",
    genderMale: "남",
    genderFemale: "여",
    age: "나이",
    agePlaceholder: "나이를 입력하세요",
    visitDatetime: "진료 일시",
    register: "등록",
    recordSuccess: "진료 기록이 업데이트되었습니다.",
    close: "닫기",
  },
};
