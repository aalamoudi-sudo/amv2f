import { useCallback, useEffect, useMemo, useState } from "react";
import type { ExperienceNavigationItem } from "./types";
import "./experience.css";

export interface PresenterNavigationProps {
  items: ExperienceNavigationItem[];
  presenterItems?: ExperienceNavigationItem[];
  activeId: string;
  title?: string;
  onNavigate: (id: string) => void;
  onExit?: () => void;
}

export function PresenterNavigation({ items, presenterItems, activeId, title = "تجربة التدشين", onNavigate, onExit }: PresenterNavigationProps) {
  const [presenterMode, setPresenterMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const presenterSequence = useMemo(
    () => presenterItems?.length ? presenterItems : items,
    [items, presenterItems],
  );
  const activeIndex = Math.max(0, presenterSequence.findIndex((item) => item.id === activeId));
  const activeLabel = items.find((item) => item.id === activeId)?.label ?? title;

  const navigateBy = useCallback((step: number) => {
    if (presenterSequence.length === 0) return;
    const next = Math.min(presenterSequence.length - 1, Math.max(0, activeIndex + step));
    const target = presenterSequence[next];
    if (target && next !== activeIndex) onNavigate(target.id);
  }, [activeIndex, onNavigate, presenterSequence]);

  const leavePresenterMode = useCallback(() => {
    setPresenterMode(false);
    if (document.fullscreenElement && document.exitFullscreen) {
      void document.exitFullscreen().catch(() => undefined);
    }
    onExit?.();
  }, [onExit]);

  useEffect(() => {
    if (!presenterMode) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "PageDown") { event.preventDefault(); navigateBy(1); }
      if (event.key === "ArrowRight" || event.key === "PageUp") { event.preventDefault(); navigateBy(-1); }
      if (event.key === "Escape") leavePresenterMode();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [leavePresenterMode, navigateBy, presenterMode]);

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      // Fullscreen can be denied by the browser; presenter navigation remains usable.
    }
  };

  const enterPresenterMode = async () => {
    setPresenterMode(true);
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Presenter mode remains available when fullscreen permission is denied.
    }
  };

  return (
    <nav className="kaga-nav" data-presenter={presenterMode} aria-label="التنقل الرئيسي">
      <div className="kaga-nav__brand"><span aria-hidden="true" /><b>{title}</b></div>
      {!presenterMode && (
        <div className="kaga-nav__items">
          {items.map((item) => (
            <button key={item.id} type="button" data-active={item.id === activeId} aria-current={item.id === activeId ? "page" : undefined} onClick={() => onNavigate(item.id)}>
              {item.shortLabel ?? item.label}
            </button>
          ))}
        </div>
      )}
      <div className="kaga-nav__presenter">
        {presenterMode && <>
          <button type="button" onClick={() => navigateBy(-1)} disabled={activeIndex === 0} aria-label="القسم السابق">→</button>
          <span>{activeLabel}<small><bdi>{activeIndex + 1}</bdi> / <bdi>{presenterSequence.length}</bdi></small></span>
          <button type="button" onClick={() => navigateBy(1)} disabled={activeIndex >= presenterSequence.length - 1} aria-label="القسم التالي">←</button>
        </>}
        <button type="button" className="kaga-nav__fullscreen" onClick={toggleFullscreen} aria-label={fullscreen ? "إنهاء ملء الشاشة" : "ملء الشاشة"}>⛶</button>
        <button type="button" className="kaga-nav__mode" onClick={presenterMode ? leavePresenterMode : enterPresenterMode} aria-pressed={presenterMode}>
          {presenterMode ? "إنهاء العرض" : "وضع التقديم"}
        </button>
      </div>
    </nav>
  );
}
