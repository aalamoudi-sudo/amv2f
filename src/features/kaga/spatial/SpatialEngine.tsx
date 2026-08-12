import { useEffect, useMemo, useRef } from "react";
import { getJourneyTimeline, journeys, journeyById } from "../data/journeys";
import type { JourneyId } from "../data/spatialTypes";
import { SpatialMasterplan } from "./SpatialMasterplan";
import { playbackSpeeds, useSpatialStore } from "./spatialStore";
import "./spatial.css";

export interface SpatialEngineProps {
  initialJourneyId?: JourneyId;
  onOpenExperience?: (experienceId: string) => void;
  className?: string;
}

export function SpatialEngine({ initialJourneyId = "workers", onOpenExperience, className = "" }: SpatialEngineProps) {
  const state = useSpatialStore();
  const selectJourney = state.selectJourney;
  const frameRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const pauseUntilRef = useRef(0);
  const pausedStopIdRef = useRef<string | null>(null);
  const journey = journeyById[state.activeJourneyId];

  useEffect(() => {
    if (initialJourneyId !== useSpatialStore.getState().activeJourneyId) selectJourney(initialJourneyId);
  }, [initialJourneyId, selectJourney]);

  useEffect(() => {
    pausedStopIdRef.current = null;
    pauseUntilRef.current = 0;
  }, [state.activeBranchId, state.activeJourneyId]);

  useEffect(() => {
    if (state.progress <= 0.000_001) pausedStopIdRef.current = null;
  }, [state.progress]);

  useEffect(() => {
    if (!state.isPlaying) {
      previousTimeRef.current = null;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      return;
    }
    const tick = (time: number) => {
      if (time < pauseUntilRef.current) {
        previousTimeRef.current = time;
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      const previous = previousTimeRef.current ?? time;
      previousTimeRef.current = time;
      const delta = (time - previous) / 1000;
      const current = useSpatialStore.getState();
      const currentJourney = journeyById[current.activeJourneyId];
      const timeline = getJourneyTimeline(currentJourney, current.activeBranchId);
      const next = current.progress + (delta * current.speed) / currentJourney.presentationDurationSeconds;
      const reachedMajorStop = timeline.find((stop) => (
        stop.isMajor
        && stop.id !== pausedStopIdRef.current
        && stop.pathProgress > current.progress + 0.000_001
        && stop.pathProgress <= next + 0.000_001
      ));
      if (reachedMajorStop) {
        current.setProgress(reachedMajorStop.pathProgress);
        pausedStopIdRef.current = reachedMajorStop.id;
        pauseUntilRef.current = time + 700;
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      current.setProgress(next);
      if (next < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
  }, [state.activeBranchId, state.activeJourneyId, state.isPlaying]);

  const timeline = getJourneyTimeline(journey, state.activeBranchId);
  const activeStop = timeline[state.activeStopIndex];
  const selectedStop = useMemo(
    () => timeline.find((stop) => stop.id === state.selectedStopId) ?? activeStop,
    [activeStop, state.selectedStopId, timeline],
  );

  return (
    <section className={`kaga-spatial-engine ${className}`} dir="rtl" aria-label="المخطط والرحلات التفاعلية">
      <header className="kaga-spatial-engine__header">
        <div>
          <p className="kaga-spatial-engine__eyebrow">المخطط المكاني · صفحات المصدر {journey.source.pdfPages.join("، ")}</p>
          <h2>ادخل إلى مسار الافتتاح</h2>
          <p>اختر الرحلة وشاهد تسلسلها على هندسة مستخرجة من المخطط المرجعي.</p>
        </div>
        <div className="kaga-spatial-engine__header-actions">
          {journey.optionalBranches?.map((branch) => (
            <button
              key={branch.id}
              type="button"
              className={state.activeBranchId === branch.id ? "is-active" : ""}
              aria-pressed={state.activeBranchId === branch.id}
              onClick={() => state.selectBranch(state.activeBranchId === branch.id ? null : branch.id)}
            >
              {state.activeBranchId === branch.id ? "العودة إلى المسار الأساسي" : "عرض المسار الاختياري"}
            </button>
          ))}
          <button type="button" onClick={state.focusRoute} aria-label="تركيز الخريطة على المسار">تركيز المسار</button>
          <button type="button" onClick={state.resetMap} aria-label="إعادة ضبط الخريطة">إعادة الضبط</button>
        </div>
      </header>

      <nav className="kaga-journey-selector" aria-label="اختيار الرحلة">
        {journeys.map((item) => (
          <button key={item.id} type="button" className={item.id === journey.id ? "is-active" : ""} aria-pressed={item.id === journey.id} onClick={() => state.selectJourney(item.id)}>
            <span>{item.title}</span><small>ص {item.source.pdfPages.join("، ")}</small>
          </button>
        ))}
      </nav>

      <div className="kaga-spatial-engine__stage">
        <SpatialMasterplan journey={journey} activeBranchId={state.activeBranchId} progress={state.progress} activeStopIndex={state.activeStopIndex} selectedStopId={state.selectedStopId} focusRequest={state.focusRequest} resetRequest={state.resetRequest} onSelectStop={state.selectStop} />
        <aside className="kaga-stop-inspector" aria-live="polite">
          <span className="kaga-stop-inspector__code">المحطة {selectedStop?.code ?? "—"}</span>
          <h3>{selectedStop?.title ?? "اختر محطة"}</h3>
          {selectedStop?.durationMinutes ? <p>المدة المصدرية: <strong>{selectedStop.durationMinutes} دقيقة</strong></p> : <p>لا توجد مدة مستقلة في المصدر.</p>}
          {selectedStop?.detailAr ? <p className="kaga-stop-inspector__detail">{selectedStop.detailAr}</p> : null}
          <p className="kaga-stop-inspector__source">المصدر: صفحة {selectedStop?.source.pdfPages.join("، ")}</p>
          {selectedStop?.experienceId && onOpenExperience ? (
            <button type="button" onClick={() => onOpenExperience(selectedStop.experienceId!)}>فتح التجربة المرتبطة</button>
          ) : null}
        </aside>
      </div>

      <div className="kaga-playback-controls" aria-label="أدوات تشغيل الرحلة">
        <div className="kaga-playback-controls__primary">
          <button type="button" onClick={state.previousStop} aria-label="المحطة السابقة">السابق</button>
          {state.isPlaying ? <button className="is-primary" type="button" onClick={state.pause} aria-label="إيقاف الرحلة مؤقتاً">إيقاف مؤقت</button> : <button className="is-primary" type="button" onClick={state.play} aria-label="تشغيل الرحلة">تشغيل</button>}
          <button type="button" onClick={state.nextStop} aria-label="المحطة التالية">التالي</button>
          <button type="button" onClick={state.restart} aria-label="إعادة تشغيل الرحلة">إعادة التشغيل</button>
        </div>
        <label className="kaga-playback-progress">
          <span>تقدم المسار {Math.round(state.progress * 100)}٪</span>
          <input type="range" min="0" max="100" value={Math.round(state.progress * 100)} onChange={(event) => state.setProgress(Number(event.target.value) / 100)} aria-label="تقدم عرض الرحلة" />
        </label>
        <div className="kaga-playback-speed" aria-label="سرعة العرض">
          <span>سرعة العرض</span>
          {playbackSpeeds.map((speed) => <button type="button" key={speed} className={state.speed === speed ? "is-active" : ""} aria-pressed={state.speed === speed} onClick={() => state.setSpeed(speed)}>{speed}×</button>)}
        </div>
      </div>
    </section>
  );
}
