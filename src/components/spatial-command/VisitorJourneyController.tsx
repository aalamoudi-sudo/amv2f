import { Expand, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import type { NarrativeJourneyStep } from '../../types/spatialCommand';

export function VisitorJourneyController({
  steps,
  activeStepId,
  playing,
  onPlay,
  onPause,
  onPrevious,
  onNext,
  onReset,
  onSelectStep,
  onFullView
}: {
  steps: NarrativeJourneyStep[];
  activeStepId: string;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onReset: () => void;
  onSelectStep: (stepId: string) => void;
  onFullView: () => void;
}) {
  const activeIndex = Math.max(0, steps.findIndex((step) => step.stepId === activeStepId));
  return (
    <section data-testid="visitor-journey-controller" className="sc-journey-controller" aria-label="تشغيل قصة رحلة الزائر">
      <div className="sc-playback-buttons">
        {playing ? (
          <button data-testid="journey-pause" type="button" className="is-primary" onClick={onPause}><Pause aria-hidden="true" />إيقاف مؤقت</button>
        ) : (
          <button data-testid="journey-play" type="button" className="is-primary" onClick={onPlay}><Play aria-hidden="true" />تشغيل</button>
        )}
        <button data-testid="journey-previous" type="button" aria-label="الخطوة السابقة" onClick={onPrevious}><SkipForward aria-hidden="true" />السابق</button>
        <button data-testid="journey-next" type="button" aria-label="الخطوة التالية" onClick={onNext}>التالي<SkipBack aria-hidden="true" /></button>
        <button data-testid="journey-reset" type="button" aria-label="إعادة الرحلة إلى البداية" onClick={onReset}><RotateCcw aria-hidden="true" />إعادة</button>
        <button data-testid="journey-full-view" type="button" aria-label="عرض القصة بملء الشاشة" onClick={onFullView}><Expand aria-hidden="true" />عرض كامل</button>
      </div>
      <div className="sc-journey-track" aria-label="خطوات رحلة الزائر">
        {steps.map((step, index) => (
          <button
            key={step.stepId}
            data-testid={`journey-step-${step.stepId}`}
            type="button"
            aria-current={step.stepId === activeStepId ? 'step' : undefined}
            className={[
              step.stepId === activeStepId ? 'is-active' : '',
              index < activeIndex ? 'is-complete' : '',
              `is-${step.status}`
            ].filter(Boolean).join(' ')}
            onClick={() => onSelectStep(step.stepId)}
          >
            <span>{index + 1}</span>
            <strong>{step.labelAr}</strong>
            <small>{step.status === 'unresolved' ? 'الموقع غير محسوم' : step.status === 'conflicted' ? 'تعارض ظاهر' : 'تسلسل مرشح'}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
