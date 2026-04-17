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
    // Landing page
    landingHeadline: string;
    landingSubcopy: string;
    landingCTA: string;
    benefitTitle1: string;
    benefitDesc1: string;
    benefitTitle2: string;
    benefitDesc2: string;
    benefitTitle3: string;
    benefitDesc3: string;
    benefitTitle4: string;
    benefitDesc4: string;
    asIsHeader: string;
    toBeHeader: string;
    asIs1: string;
    toBe1: string;
    asIs2: string;
    toBe2: string;
    asIs3: string;
    toBe3: string;
    asIs4: string;
    toBe4: string;
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
    landingHeadline: "AI-Powered Real-Time Caries Detection",
    landingSubcopy: "Before costly CT or X-ray diagnostics, AI screens lesion distribution and severity from a single visible-light oral image.",
    landingCTA: "Try it now",
    benefitTitle1: "Accurate Yet Fast Real-Time Screening",
    benefitDesc1: "Ranked #1 on public datasets — identifies lesion distribution and severity within 5 seconds.",
    benefitTitle2: "Detailed Analysis",
    benefitDesc2: "Based on GV Black's Classification, provides lesion region masking across 9 classes.",
    benefitTitle3: "Efficient Dental Workflow",
    benefitDesc3: "Before costly and time-consuming precision diagnostics,\nutilized during visual consultation to reduce chair time.",
    benefitTitle4: "Records & Precision Diagnosis Integration",
    benefitDesc4: "Integrates with in-clinic databases to provide\na seamless care management system.",
    asIsHeader: "As-Is",
    toBeHeader: "To-Be",
    asIs1: "Visual exam → subjective judgment",
    toBe1: "AI detects lesions automatically in 5 seconds",
    asIs2: "CT / X-ray required",
    toBe2: "Visible-light image only for first-pass screening",
    asIs3: "Consultation + imaging + reading wait",
    toBe3: "Real-time analysis enables immediate consultation",
    asIs4: "Manual or separate system entry",
    toBe4: "Analysis results auto-saved to DB",
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
    landingHeadline: "AI 기반 실시간 충치 병변 탐지",
    landingSubcopy: "CT·X-ray 정밀 진단 전, AI가 가시광선 구강 이미지를\n실시간으로 병변 분포와 중증도를 1차 판별합니다.",
    landingCTA: "지금 체험하기",
    benefitTitle1: "정확하지만 빠른 실시간 스크리닝",
    benefitDesc1: "공개 데이터셋에서 압도적 1위를 차지한 AI 모델이,\n5초 이내에 병변 분포와 중증도를 자동 마스킹합니다.",
    benefitTitle2: "디테일한 분석",
    benefitDesc2: "GV Black 분류 기반, 총 9개 클래스에 대한\n병변 영역 마스킹을 제공합니다.",
    benefitTitle3: "효율적인 치과 진료 프로세스 구축",
    benefitDesc3: "비용·촬영 및 판독 시간이 소요되는 정밀 진단 이전,\n육안 상담 단계에서 활용해 진료 체어 타임을 단축합니다.",
    benefitTitle4: "환자 기록 및 정밀 진단 연계",
    benefitDesc4: "원내 진료 DB 및 2차 정밀 진단 프로세스와 연계해,\n심리스한 진료 관리 체계를 제공합니다.",
    asIsHeader: "As-Is",
    toBeHeader: "To-Be",
    asIs1: "주관적인 육안 검진으로 인한 오진 가능성",
    toBe1: "4개의 AI 모델 앙상블을 통한 객관적인 진단",
    asIs2: "모든 환자에게 고비용 CT·X-ray 일괄 촬영",
    toBe2: "가시광선 이미지만으로 1차 판별해,\n중증도에 따른 선별적인 2차 정밀 진단",
    asIs3: "전문의만 판독 가능한 비효율적 진료 병목",
    toBe3: "비전문 의료인력도 활용 가능한 쉬운 UI/UX로,\n전문의의 진료 시간 단축",
    asIs4: "수기 기록 및 분산된 시스템으로 데이터 단절",
    toBe4: "분석 결과 DB 자동 연계 저장",
  },
};
