import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, X } from "lucide-react";
import type { RecordItem } from "../types/prediction";
import { CLASS_COLORS, colorToCss } from "../constants/classes";
import { useLang } from "../contexts/LangContext";
import { UI } from "../constants/uiStrings";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const STATUS_OPTIONS = ["스크리닝 완료", "정밀 진단 권고", "정밀 진단 완료", "치료 완료"] as const;
type Status = typeof STATUS_OPTIONS[number];

// inline style로 색상 지정 — Tailwind purge 영향 없음
const STATUS_COLOR: Record<Status, { bg: string; text: string; border: string; dot: string }> = {
  "스크리닝 완료":  { bg: "#e0f2fe", text: "#0369a1", border: "#bae6fd", dot: "#0ea5e9" },
  "정밀 진단 권고": { bg: "#fef3c7", text: "#b45309", border: "#fde68a", dot: "#f59e0b" },
  "정밀 진단 완료": { bg: "#ede9fe", text: "#6d28d9", border: "#ddd6fe", dot: "#8b5cf6" },
  "치료 완료":     { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0", dot: "#10b981" },
};
const FALLBACK_COLOR = { bg: "#f3f4f6", text: "#4b5563", border: "#e5e7eb", dot: "#9ca3af" };

function StatusDropdown({
  recordId,
  current,
  onChange,
}: {
  recordId: number;
  current: string;
  onChange: (updated: RecordItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const select = async (next: Status) => {
    setOpen(false);
    if (next === current || isUpdating) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/records/${recordId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) return;
      const updated: RecordItem = await res.json();
      onChange(updated);
    } finally {
      setIsUpdating(false);
    }
  };

  const c = STATUS_COLOR[current as Status] ?? FALLBACK_COLOR;

  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      {/* 트리거 버튼 */}
      <button
        type="button"
        disabled={isUpdating}
        onClick={() => setOpen((o) => !o)}
        style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold
                   transition-opacity whitespace-nowrap select-none disabled:opacity-50"
      >
        <span
          style={{ backgroundColor: c.dot }}
          className="w-1.5 h-1.5 rounded-full shrink-0"
        />
        {current}
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* 드롭다운 메뉴 */}
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-white border border-border rounded-lg shadow-lg overflow-hidden min-w-[140px]">
          {STATUS_OPTIONS.map((s) => {
            const sc = STATUS_COLOR[s];
            const isCurrent = s === current;
            return (
              <button
                key={s}
                type="button"
                onClick={() => select(s)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left
                            transition-colors whitespace-nowrap
                            ${isCurrent ? "bg-gray-100 font-semibold" : "font-medium hover:bg-gray-50"}`}
              >
                <span
                  style={{ backgroundColor: sc.dot }}
                  className="w-2 h-2 rounded-full shrink-0"
                />
                <span className="flex-1" style={{ color: sc.text }}>{s}</span>
                {isCurrent && (
                  <span
                    style={{ backgroundColor: sc.bg, color: sc.text, borderColor: sc.border }}
                    className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full border"
                  >현재</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 중증도 배지 ────────────────────────────────────────────────

const SEVERITY_STYLE: Record<string, string> = {
  None:     "bg-gray-100 text-gray-500",
  Mild:     "bg-green-100 text-green-700",
  Moderate: "bg-orange-100 text-orange-700",
  Severe:   "bg-red-100 text-red-600",
  없음: "bg-gray-100 text-gray-500",
  경증: "bg-green-100 text-green-700",
  중증: "bg-orange-100 text-orange-700",
  심각: "bg-red-100 text-red-600",
};

function SeverityBadge({ severity }: { severity: string }) {
  const cls = SEVERITY_STYLE[severity] ?? "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {severity}
    </span>
  );
}

// ── 중증도 계기판 (반원형) ────────────────────────────────────

function SeverityGauge({ severity, t }: { severity: string; t: typeof UI["en"] }) {
  // severity → 각도 (0° = 좌, 180° = 우)
  // None → 건강 텍스트, Mild → 30°, Moderate → 90°, Severe → 150°
  const angleMap: Record<string, number> = {
    None: 0, Mild: 30, Moderate: 90, Severe: 150,
    없음: 0, 경증: 30, 중증: 90, 심각: 150,
  };
  const angle = angleMap[severity] ?? 0;

  // 반원 파라미터
  const cx = 100;
  const cy = 100;
  const r = 80;

  const polarToCartesian = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  };

  // 아크 3단계 경로
  const arcPath = (fromDeg: number, toDeg: number) => {
    const start = polarToCartesian(fromDeg);
    const end = polarToCartesian(toDeg);
    return `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;
  };

  // 바늘 끝 좌표 (180 - angle 로 변환: 좌측이 180, 우측이 0)
  const needleAngle = 180 - angle;
  const needleEnd = polarToCartesian(needleAngle);

  const isHealthy = severity === "None" || severity === "없음";

  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <svg viewBox="0 0 200 120" className="w-48 h-28">
        {/* 3단계 아크 (왼쪽 초록, 가운데 주황, 오른쪽 빨강) */}
        <path d={arcPath(180, 120)} fill="none" stroke="#22c55e" strokeWidth="14" strokeLinecap="butt" />
        <path d={arcPath(120, 60)}  fill="none" stroke="#f59e0b" strokeWidth="14" strokeLinecap="butt" />
        <path d={arcPath(60, 0)}    fill="none" stroke="#ef4444" strokeWidth="14" strokeLinecap="butt" />

        {/* 바늘 (건강 상태가 아닐 때만) */}
        {!isHealthy && (
          <>
            <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y}
                  stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
            <circle cx={cx} cy={cy} r="6" fill="#1f2937" />
          </>
        )}
        {isHealthy && <circle cx={cx} cy={cy} r="6" fill="#22c55e" />}
      </svg>
      <span className="text-sm font-semibold text-foreground">
        {isHealthy ? t.healthyStatus : severity}
      </span>
    </div>
  );
}

// ── 상세 모달 ─────────────────────────────────────────────────

function DetailModal({ record, onClose, onStatusChange }: { record: RecordItem; onClose: () => void; onStatusChange: (updated: RecordItem) => void }) {
  const t = UI[useLang()];
  const [requestedPrecisionDx, setRequestedPrecisionDx] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // severity는 영어 기준으로 저장됨 — t는 이미 컴포넌트 최상단에서 가져옴
  const severityMap: Partial<Record<string, keyof typeof t>> = {
    None: "severityNone", Mild: "severityMild",
    Moderate: "severityModerate", Severe: "severitySevere",
  };
  const severityKey = severityMap[record.severity];
  const severityLabel = severityKey ? t[severityKey] : record.severity;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-primary/5 sticky top-0">
          <span className="text-sm font-semibold">{t.detailTitle}</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">

          {/* 환자 정보 */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div className="text-muted-foreground">{t.colPatient}</div>
            <div className="font-medium">{record.patient_name}</div>
            <div className="text-muted-foreground">{t.colGender}</div>
            <div className="font-medium">{record.gender === "M" ? t.genderMale : t.genderFemale}</div>
            <div className="text-muted-foreground">{t.colAge}</div>
            <div className="font-medium">{record.age}</div>
            <div className="text-muted-foreground">{t.colDatetime}</div>
            <div className="font-medium">{record.visit_datetime}</div>
            <div className="text-muted-foreground">{t.colSeverity}</div>
            <div><SeverityBadge severity={String(severityLabel)} /></div>
            <div className="text-muted-foreground">{t.colStatus}</div>
            <div><StatusDropdown recordId={record.id} current={record.status} onChange={onStatusChange} /></div>
          </div>

          {/* 저장된 이미지 (Pathology overlay가 이미 bake-in됨) */}
          <div className="rounded-lg overflow-hidden bg-muted">
            <img
              src={`${API_BASE_URL}${record.image_url}`}
              alt="record"
              className="w-full h-auto block"
            />
          </div>

          {/* 중증도 계기판 */}
          <div className="flex flex-col items-center gap-1 border border-border rounded-lg bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-3">{t.severityGauge}</p>
            <SeverityGauge severity={record.severity} t={t} />
          </div>

          {/* Caries 클래스별 개수 (Class 1~6 만) */}
          {(() => {
            const caries = record.predictions.filter((p) => p.class_id >= 3 && p.class_id <= 8);
            const counts = new Map<number, { name: string; count: number }>();
            for (const p of caries) {
              const prev = counts.get(p.class_id);
              counts.set(p.class_id, { name: p.class_name, count: (prev?.count ?? 0) + 1 });
            }
            if (counts.size === 0) return null;
            const sorted = [...counts.entries()].sort((a, b) => a[0] - b[0]);
            return (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t.detailDetections}</p>
                <div className="flex flex-col gap-1">
                  {sorted.map(([classId, { name, count }]) => (
                    <div key={classId} className="flex items-center gap-2 text-sm">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: colorToCss(CLASS_COLORS[classId]) }}
                      />
                      <span className="flex-1">{name}</span>
                      <span className="font-semibold tabular-nums">{t.detectionCount(count)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 정밀 진단 처리 요청 */}
          <button
            type="button"
            onClick={async () => {
              if (requestedPrecisionDx || record.status === "정밀 진단 권고") return;
              try {
                const res = await fetch(`${API_BASE_URL}/records/${record.id}/status`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "정밀 진단 권고" }),
                });
                if (!res.ok) return;
                const updated: RecordItem = await res.json();
                onStatusChange(updated);
                setRequestedPrecisionDx(true);
              } catch { /* ignore */ }
            }}
            disabled={requestedPrecisionDx || record.status === "정밀 진단 권고"}
            className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold
                       hover:bg-primary/90 active:bg-primary/80 transition-colors
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {requestedPrecisionDx || record.status === "정밀 진단 권고"
              ? t.precisionDxRequested
              : t.requestPrecisionDx}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Records 페이지 ─────────────────────────────────────────────

export function RecordsPage() {
  const t = UI[useLang()];
  const { pathname } = useLocation();
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null);

  const handleStatusChange = (updated: RecordItem) => {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSelectedRecord((prev) => (prev?.id === updated.id ? updated : prev));
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/records`)
      .then((r) => r.json())
      .then((data) => setRecords(data.records ?? []))
      .catch(() => setLoadError(t.recordsLoadError))
      .finally(() => setIsLoading(false));
  }, []);

  const severityLabel = (s: string) => {
    const map: Record<string, keyof typeof t> = {
      None: "severityNone", Mild: "severityMild",
      Moderate: "severityModerate", Severe: "severitySevere",
    };
    const key = map[s];
    return key ? t[key] : s;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">

      {/* 헤더 */}
      <header className="border-b border-border bg-white shadow-sm">
        <div className="grid grid-cols-3 items-stretch h-16 px-6">

          {/* 로고 — 좌 */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group" aria-label="CariesOn — 홈으로">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
                <path
                  d="M12 2C8 2 5 4.5 5 8.5c0 3.5.5 5.5 1.5 8L8 23q.5 1.5 2 .5l1-4.5q.5-1.5 1-1.5t1 1.5l1 4.5q1.5 1 2-.5l1.5-6.5C18.5 14 19 12 19 8.5 19 4.5 16 2 12 2z"
                  fill="hsl(222,68%,27%)"
                />
                <circle cx="9.5" cy="9" r="2.2" fill="#ef4444" />
              </svg>
              <h1 className="text-base font-bold tracking-tight text-foreground group-hover:text-foreground/70 transition-colors">
                CariesOn
              </h1>
            </Link>
          </div>

          {/* GNB 탭 — 중앙 */}
          <nav className="flex items-stretch justify-center gap-2">
            {([
              { to: "/diagnosis", label: t.navQuickDiagnosis },
              { to: "/records",   label: t.recordsNav        },
            ] as const).map(({ to, label }) => {
              const isActive = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center px-4 text-[15px] font-semibold border-b-[3px] transition-colors ${
                    isActive
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* 우측 여백 — 균형 */}
          <div />
        </div>
      </header>

      {/* 본문 */}
      <main className="flex-1 p-6">
        {isLoading && (
          <p className="text-sm text-muted-foreground">{t.loading}</p>
        )}
        {loadError && (
          <p className="text-sm text-red-500">{loadError}</p>
        )}
        {!isLoading && !loadError && records.length === 0 && (
          <p className="text-sm text-muted-foreground">{t.recordsEmpty}</p>
        )}
        {!isLoading && records.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-muted-foreground text-xs uppercase tracking-wide">
                <tr>
                  {[t.colNo, t.colPatient, t.colGender, t.colAge, t.colDatetime, t.colSeverity, t.colStatus].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((rec) => (
                  <tr
                    key={rec.id}
                    onClick={() => setSelectedRecord(rec)}
                    className="hover:bg-primary/5 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{rec.id}</td>
                    <td className="px-4 py-2.5 font-medium">{rec.patient_name}</td>
                    <td className="px-4 py-2.5">{rec.gender === "M" ? t.genderMale : t.genderFemale}</td>
                    <td className="px-4 py-2.5 tabular-nums">{rec.age}</td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{rec.visit_datetime}</td>
                    <td className="px-4 py-2.5"><SeverityBadge severity={String(severityLabel(rec.severity))} /></td>
                    <td className="px-4 py-2.5">
                      <StatusDropdown recordId={rec.id} current={rec.status} onChange={handleStatusChange} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {selectedRecord && (
        <DetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} onStatusChange={handleStatusChange} />
      )}
    </div>
  );
}
