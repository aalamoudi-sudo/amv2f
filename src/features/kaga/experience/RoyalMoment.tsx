import { useEffect, useRef, useState } from "react";
import { OrganicPresentationFrame, presentationSurfaceAttributes } from "../theme";
import type { ExperienceSourceReference } from "./types";
import { useReducedMotion } from "./useReducedMotion";
import "./experience.css";

export interface RoyalMomentProps {
  source: ExperienceSourceReference;
  onComplete?: () => void;
  onContinue?: () => void;
}

type RoyalPhase = "ready" | "focus" | "illumination" | "reveal" | "garden";

const phaseLabels: Record<RoyalPhase, string> = {
  ready: "جاهز للعرض",
  focus: "تهيئة المشهد",
  illumination: "انتقال الإضاءة عبر التكوين",
  reveal: "الكشف الاحتفائي",
  garden: "الانتقال نحو الحدائق",
};

export function RoyalMoment({ source, onComplete, onContinue }: RoyalMomentProps) {
  const [phase, setPhase] = useState<RoyalPhase>("ready");
  const [runId, setRunId] = useState(0);
  const reducedMotion = useReducedMotion();
  const completeRef = useRef(onComplete);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (runId === 0) return;
    const scale = reducedMotion ? 0.08 : 1;
    const schedule: Array<[RoyalPhase, number]> = [
      ["focus", 50],
      ["illumination", 1800],
      ["reveal", 5200],
      ["garden", 7900],
    ];
    const timers = schedule.map(([nextPhase, delay]) => window.setTimeout(() => {
      setPhase(nextPhase);
      if (nextPhase === "garden") completeRef.current?.();
    }, delay * scale));
    return () => timers.forEach(window.clearTimeout);
  }, [runId, reducedMotion]);

  const play = () => {
    setPhase("focus");
    setRunId((value) => value + 1);
  };

  return (
    <section
      className="kaga-royal"
      data-phase={phase}
      data-source-pages={source.pdfPages.join(",")}
      aria-labelledby="kaga-royal-title"
      {...presentationSurfaceAttributes('royal-moment')}
    >
      <OrganicPresentationFrame
        variant="portal"
        tone="green"
        visualPosition="start"
        fullBleed
        className="kaga-royal__frame"
        labelledBy="kaga-royal-title"
        visual={(
          <div className="kaga-royal__scene">
            <div className="kaga-royal__stars" />
            <div className="kaga-royal__model-image" role="img" aria-label="مجسم التدشين الملكي المعتمد" />
            <div className="kaga-royal__model-shade" aria-hidden="true" />
            <svg className="kaga-royal__illumination" viewBox="0 0 900 520" role="presentation" aria-hidden="true">
              <defs>
                <radialGradient id="kagaRoyalGlow">
                  <stop offset="0" stopColor="#f5df9b" stopOpacity=".95" />
                  <stop offset=".5" stopColor="#b99645" stopOpacity=".35" />
                  <stop offset="1" stopColor="#b99645" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="kagaRoyalGold" x1="0" x2="1">
                  <stop stopColor="#8a6a28" /><stop offset=".5" stopColor="#f3d985" /><stop offset="1" stopColor="#9d7731" />
                </linearGradient>
              </defs>
              <ellipse className="kaga-royal__aura" cx="405" cy="285" rx="310" ry="205" fill="url(#kagaRoyalGlow)" />
              <path className="kaga-royal__crescent kaga-royal__crescent--one" d="M120 328 C195 174 430 126 666 213 C576 202 499 230 439 282 C373 339 287 367 120 328" />
              <path className="kaga-royal__crescent kaga-royal__crescent--two" d="M147 371 C260 431 440 430 586 338 C526 379 434 389 351 365 C282 345 218 348 147 371" />
              <circle className="kaga-royal__core" cx="690" cy="382" r="18" fill="url(#kagaRoyalGold)" />
              <path className="kaga-royal__garden-line" d="M82 446 C260 414 465 458 748 423" />
            </svg>
          </div>
        )}
        content={(
          <div className="kaga-royal__copy">
            <span className="kaga-kicker">لحظة التدشين</span>
            <h2 id="kaga-royal-title">لحظة تنطلق منها الحديقة</h2>
            <p>تصور مفاهيمي مُعتمد يعرض تسلسل الإضاءة والكشف الاحتفائي، ولا يمثل محاكاة فيزيائية.</p>
            <div className="kaga-royal__status" role="status" aria-live="polite">
              <span data-phase={phase} /> {phaseLabels[phase]}
            </div>
            <div className="kaga-action-row">
              <button className="kaga-primary-action" type="button" onClick={play} disabled={phase !== "ready" && phase !== "garden"}>
                {phase === "garden" ? "إعادة التصور المفاهيمي" : "تشغيل لحظة التدشين"}
              </button>
              {phase === "garden" && onContinue && <button className="kaga-secondary-action" type="button" onClick={onContinue}>الانتقال إلى عرض التدشين</button>}
            </div>
          </div>
        )}
      />
    </section>
  );
}
