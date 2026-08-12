import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import type { IntroExperienceProps } from "./types";
import "./experience.css";

export function IntroExperience({
  title,
  subtitle,
  eyebrow = "حدائق الملك عبدالله العالمية",
  backgroundImageUrl,
  source,
  onEnter,
}: IntroExperienceProps) {
  const style = backgroundImageUrl
    ? ({ "--kaga-intro-image": `url(${backgroundImageUrl})` } as CSSProperties)
    : undefined;

  return (
    <section className="kaga-intro" style={style} aria-labelledby="kaga-intro-title">
      <div className="kaga-intro__botanical" aria-hidden="true" />
      <div className="kaga-intro__veil" aria-hidden="true" />
      <motion.div
        className="kaga-intro__content"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="kaga-kicker">{eyebrow}</span>
        <div className="kaga-intro__rule" aria-hidden="true"><span /></div>
        <h1 id="kaga-intro-title">{title}</h1>
        <p>{subtitle}</p>
        <button className="kaga-primary-action" type="button" onClick={onEnter}>
          <span>دخول تجربة التدشين</span>
          <span aria-hidden="true">←</span>
        </button>
        {source && (
          <small className="kaga-source-note">
            المصدر: الصفحات {source.pdfPages.join("، ")}
          </small>
        )}
      </motion.div>
      <div className="kaga-intro__scroll-cue" aria-hidden="true">
        <span />
        <b>اكتشف الخطة</b>
      </div>
    </section>
  );
}
