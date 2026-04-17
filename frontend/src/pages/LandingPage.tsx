import { useCallback, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useLang } from "../contexts/LangContext";
import { UI } from "../constants/uiStrings";
import type { Lang } from "../constants/classDescriptions";

interface Props {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export function LandingPage({ lang, setLang }: Props) {
  const t = UI[useLang()];
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isScrolling = useRef(false);

  const smoothScrollTo = useCallback((target: number) => {
    const el = mainRef.current;
    if (!el) return;
    const start = el.scrollTop;
    const distance = target - start;
    const duration = 800;
    let startTime: number | null = null;

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      el.scrollTop = start + distance * easeInOutCubic(progress);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setTimeout(() => { isScrolling.current = false; }, 50);
      }
    };

    isScrolling.current = true;
    requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const sections = el.querySelectorAll<HTMLElement>("[data-section]");
    const sectionHeight = () => el.clientHeight;

    const handleWheel = (e: WheelEvent) => {
      if (isScrolling.current) { e.preventDefault(); return; }

      const currentIndex = Math.round(el.scrollTop / sectionHeight());
      const direction = e.deltaY > 0 ? 1 : -1;
      const nextIndex = Math.max(0, Math.min(sections.length - 1, currentIndex + direction));

      if (nextIndex !== currentIndex) {
        e.preventDefault();
        smoothScrollTo(nextIndex * sectionHeight());
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [smoothScrollTo]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">

      {/* 헤더 */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm fixed top-0 w-full z-50">
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
              <span className="text-base font-bold tracking-tight text-foreground group-hover:text-foreground/70 transition-colors">CariesOn</span>
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

          {/* EN / KO 토글 — 우 */}
          <div className="flex items-center justify-end">
            <div className="flex items-center rounded-md border border-border overflow-hidden text-xs">
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
          </div>
        </div>
      </header>

      {/* 스크롤 스냅 컨테이너 */}
      <main ref={mainRef} className="flex-1 overflow-y-auto pt-16">

        {/* 섹션 1: Hero */}
        <section data-section className="h-[calc(100vh-4rem)] flex items-center px-6">
          <div className="w-full max-w-6xl mx-auto grid grid-cols-[1.3fr_1fr] items-center gap-10">

            {/* 좌측: 텍스트 */}
            <div className="flex flex-col gap-7">
              {/* 로고 */}
              <div className="flex items-center gap-4">
                <svg width="64" height="64" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 2C8 2 5 4.5 5 8.5c0 3.5.5 5.5 1.5 8L8 23q.5 1.5 2 .5l1-4.5q.5-1.5 1-1.5t1 1.5l1 4.5q1.5 1 2-.5l1.5-6.5C18.5 14 19 12 19 8.5 19 4.5 16 2 12 2z"
                    fill="hsl(222,68%,27%)"
                  />
                  <circle cx="9.5" cy="9" r="2.2" fill="#ef4444" />
                </svg>
                <h1 className="text-5xl font-bold tracking-tight text-foreground">
                  CariesOn
                </h1>
              </div>

              {/* 헤드라인 */}
              <h2 className="text-[2.8rem] font-bold text-foreground leading-snug">
                {t.landingHeadline}
              </h2>

              {/* 서브카피 */}
              <p className="text-xl text-muted-foreground leading-relaxed break-keep whitespace-pre-line">
                {t.landingSubcopy}
              </p>

              {/* CTA 버튼 */}
              <Link
                to="/diagnosis"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg
                           bg-primary text-white text-base font-semibold
                           hover:bg-primary/90 active:bg-primary/80
                           transition-colors shadow-lg shadow-primary/20 w-fit"
              >
                {t.landingCTA}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* 우측: iMac 모니터 프레임 */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-full max-w-[560px]">
                {/* 모니터 본체 */}
                <div className="bg-[#1a1a1a] rounded-xl p-2.5 shadow-2xl">
                  <div className="bg-muted rounded-lg aspect-[16/10] flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">Demo Preview</span>
                  </div>
                </div>
                {/* 모니터 스탠드 */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-7 bg-[#c0c0c0] rounded-b-sm" />
                  <div className="w-32 h-2.5 bg-[#d4d4d4] rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 섹션 2: 기대 효과 */}
        <section data-section className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-5xl my-auto pt-10 flex flex-col gap-6">

            {/* 1. 좌 정렬 */}
            <div className="flex items-start gap-6 ml-0 mr-auto w-1/2">
              <div className="shrink-0 w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                <span className="text-xl font-bold text-white">1</span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-[1.7rem] font-bold text-foreground">{t.benefitTitle1}</h3>
                <p className="text-[1.05rem] text-muted-foreground leading-relaxed break-keep whitespace-pre-line">{t.benefitDesc1}</p>
              </div>
            </div>

            {/* 2. 우 정렬 */}
            <div className="flex items-start gap-6 ml-auto mr-0 w-1/2">
              <div className="shrink-0 w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                <span className="text-xl font-bold text-white">2</span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-[1.7rem] font-bold text-foreground">{t.benefitTitle2}</h3>
                <p className="text-[1.05rem] text-muted-foreground leading-relaxed break-keep whitespace-pre-line">{t.benefitDesc2}</p>
              </div>
            </div>

            {/* 3. 좌 정렬 */}
            <div className="flex items-start gap-6 ml-0 mr-auto w-1/2">
              <div className="shrink-0 w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                <span className="text-xl font-bold text-white">3</span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-[1.7rem] font-bold text-foreground">{t.benefitTitle3}</h3>
                <p className="text-[1.05rem] text-muted-foreground leading-relaxed break-keep whitespace-pre-line">{t.benefitDesc3}</p>
              </div>
            </div>

            {/* 4. 우 정렬 */}
            <div className="flex items-start gap-6 ml-auto mr-0 w-1/2">
              <div className="shrink-0 w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                <span className="text-xl font-bold text-white">4</span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-[1.7rem] font-bold text-foreground">{t.benefitTitle4}</h3>
                <p className="text-[1.05rem] text-muted-foreground leading-relaxed break-keep whitespace-pre-line">{t.benefitDesc4}</p>
              </div>
            </div>

          </div>
        </section>

        {/* 섹션 3: As-Is / To-Be */}
        <section data-section className="min-h-[calc(100vh-4rem)] flex items-center py-20 px-6">
          <div className="w-full max-w-4xl mx-auto">
            <table className="w-full border-collapse">
              {/* 헤더 */}
              <thead>
                <tr>
                  <th className="w-1/2 py-5 px-8 text-2xl font-bold text-muted-foreground bg-muted/40 border border-border rounded-tl-xl">
                    {t.asIsHeader}
                  </th>
                  <th className="w-1/2 py-5 px-8 text-2xl font-bold text-white bg-primary border border-primary rounded-tr-xl">
                    {t.toBeHeader}
                  </th>
                </tr>
              </thead>
              <tbody>
                {([
                  { left: t.asIs1, right: t.toBe1 },
                  { left: t.asIs2, right: t.toBe2 },
                  { left: t.asIs3, right: t.toBe3 },
                  { left: t.asIs4, right: t.toBe4 },
                ] as const).map(({ left, right }, i) => (
                  <tr key={i}>
                    <td className="py-8 px-8 text-lg text-muted-foreground border border-border bg-muted/10 text-center whitespace-pre-line">
                      {left}
                    </td>
                    <td className="py-8 px-8 text-lg font-medium text-foreground border border-border bg-primary/5 text-center whitespace-pre-line">
                      {right}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}
