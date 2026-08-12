import { ArrowLeft, ArrowRight, Camera, Compass, FileClock, MapPinned, Pause, Play, RefreshCcw, Sparkles, UtensilsCrossed, Waypoints, X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { EventThemePackage } from '../../types/eventThemePackage';
import type { ExperienceIntelligencePack } from '../../types/experienceIntelligence';

interface KapExperienceJourneyReviewScreenProps {
  theme: EventThemePackage;
  pack: ExperienceIntelligencePack;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onOpenGovernance: () => void;
}

const stageIcons: LucideIcon[] = [Compass, Waypoints, Sparkles, Camera, UtensilsCrossed];

function storyImage(theme: EventThemePackage): string | undefined {
  return theme.imagery.find((asset) => asset.role === 'story')?.uri;
}

export function KapExperienceJourneyReviewScreen({
  theme,
  pack,
  currentIndex,
  onIndexChange,
  onOpenGovernance
}: KapExperienceJourneyReviewScreenProps) {
  const [playback, setPlayback] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [projectionPreviewOpen, setProjectionPreviewOpen] = useState(false);
  const projectionRef = useRef<HTMLDivElement>(null);
  const projectionCloseRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const point = pack.experiencePoints[currentIndex] ?? pack.experiencePoints[0]!;
  const stop = pack.journeyStops[currentIndex] ?? pack.journeyStops[0]!;
  const storyBeat = pack.storyBeats.find((beat) => beat.storyBeatId === stop.storyBeatId);
  const StageIcon = stageIcons[currentIndex] ?? Compass;

  useEffect(() => {
    if (playback !== 'playing') return;
    const timer = window.setTimeout(() => {
      if (currentIndex >= pack.experiencePoints.length - 1) {
        setPlayback('paused');
        return;
      }
      onIndexChange(currentIndex + 1);
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [currentIndex, onIndexChange, pack.experiencePoints.length, playback]);

  useEffect(() => {
    if (!projectionPreviewOpen) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    projectionCloseRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setProjectionPreviewOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !projectionRef.current) return;
      const focusable = [...projectionRef.current.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [projectionPreviewOpen]);

  const previous = () => onIndexChange(Math.max(0, currentIndex - 1));
  const next = () => onIndexChange(Math.min(pack.experiencePoints.length - 1, currentIndex + 1));
  const reset = () => {
    setPlayback('idle');
    onIndexChange(0);
  };

  return (
    <section data-testid="visual-screen-experience" className="vd-screen vd-experience-screen" aria-labelledby="vd-experience-title">
      <header className="vd-experience-heading">
        <div>
          <span className="vd-truth-marker vd-truth-marker-candidate"><FileClock aria-hidden="true" />رحلة مرشحة</span>
          <p className="vd-overline">KAP Experience + Visitor Journey</p>
          <h1 id="vd-experience-title">قصة زيارة تُراجع قبل أن تصبح مسارًا</h1>
          <p>تسلسل من خمس محطات مثبت منطقيًا، لكنه غير معتمد مكانيًا ولا يحمل نصًا سرديًا نهائيًا.</p>
        </div>
        <div className="vd-experience-identity">
          <strong>حدائق الملك عبدالله</strong>
          <span>افتتاح وتدشين · candidate</span>
          <small>{pack.dateAssumptionMessageAr}</small>
        </div>
      </header>

      <nav className="vd-journey-progress" aria-label="مراحل رحلة الزائر المرشحة">
        <span className="vd-journey-line" aria-hidden="true" />
        {pack.experiencePoints.map((experiencePoint, index) => {
          const Icon = stageIcons[index] ?? Compass;
          return (
            <button
              key={experiencePoint.experiencePointId}
              data-testid={`journey-stage-${index + 1}`}
              type="button"
              className={index === currentIndex ? 'is-current' : index < currentIndex ? 'is-past' : undefined}
              aria-current={index === currentIndex ? 'step' : undefined}
              onClick={() => onIndexChange(index)}
            >
              <span><Icon aria-hidden="true" /></span>
              <small>{String(index + 1).padStart(2, '0')}</small>
              <strong>{experiencePoint.nameAr}</strong>
            </button>
          );
        })}
      </nav>

      <div className="vd-story-layout">
        <article className="vd-story-stage" aria-live="polite">
          <div className="vd-story-sequence">
            <span>{String(currentIndex + 1).padStart(2, '0')}</span>
            <small>من {String(pack.experiencePoints.length).padStart(2, '0')}</small>
          </div>
          <div className="vd-story-copy">
            <StageIcon aria-hidden="true" />
            <p className="vd-overline">المحطة المحددة</p>
            <h2>{point.nameAr}</h2>
            <p className="vd-story-placeholder">
              {storyBeat?.descriptionAr ?? 'لم يُرفق نص سردي معتمد لهذه المحطة. تعرض المعاينة موضعها في التسلسل المرشح فقط.'}
            </p>
            <div className="vd-story-truth">
              <span><FileClock aria-hidden="true" />المصدر: مرشح</span>
              <span><MapPinned aria-hidden="true" />الهندسة: غير مربوطة</span>
              <span><Sparkles aria-hidden="true" />المحتوى: {point.contentStatus === 'partial' ? 'جزئي' : point.contentStatus === 'missing' ? 'مفقود' : 'غير محسوم'}</span>
            </div>
          </div>
        </article>

        <div
          className="vd-story-image"
          style={storyImage(theme) ? { backgroundImage: `url(${storyImage(theme)})` } : undefined}
          role="img"
          aria-label="صورة نباتية مرجعية من عرض KAP المرشح"
        >
          <div className="vd-story-image-caption">
            <span>صورة مرجعية · review-only</span>
            <strong>لا تمثل موقع المحطة المحددة</strong>
          </div>
        </div>
      </div>

      <footer className="vd-journey-controls">
        <div className="vd-playback-controls" aria-label="التحكم في رحلة الزائر">
          <button type="button" onClick={previous} disabled={currentIndex === 0} aria-label="المحطة السابقة"><ArrowRight aria-hidden="true" /></button>
          <button data-testid="journey-play" type="button" onClick={() => setPlayback('playing')} aria-pressed={playback === 'playing'}><Play aria-hidden="true" />تشغيل</button>
          <button data-testid="journey-pause" type="button" onClick={() => setPlayback('paused')} aria-pressed={playback === 'paused'}><Pause aria-hidden="true" />إيقاف مؤقت</button>
          <button type="button" onClick={next} disabled={currentIndex === pack.experiencePoints.length - 1} aria-label="المحطة التالية"><ArrowLeft aria-hidden="true" /></button>
          <button data-testid="journey-reset" type="button" onClick={reset}><RefreshCcw aria-hidden="true" />إعادة</button>
        </div>
        <div className="vd-journey-secondary-actions">
          <button type="button" className="vd-text-action" onClick={onOpenGovernance}>المصادر والحوكمة</button>
          <button data-testid="projection-preview-open" type="button" className="vd-secondary-action" onClick={() => setProjectionPreviewOpen(true)}>
            <Sparkles aria-hidden="true" />معاينة الإسقاط
          </button>
        </div>
      </footer>

      {projectionPreviewOpen ? (
        <div ref={projectionRef} data-testid="projection-preview" className="vd-projection-preview" role="dialog" aria-modal="true" aria-labelledby="vd-projection-title">
          <div className="vd-projection-image" style={storyImage(theme) ? { backgroundImage: `url(${storyImage(theme)})` } : undefined} />
          <button ref={projectionCloseRef} data-testid="projection-preview-close" type="button" className="vd-projection-close" onClick={() => setProjectionPreviewOpen(false)} aria-label="إغلاق معاينة الإسقاط"><X aria-hidden="true" /></button>
          <div className="vd-projection-copy">
            <p>معاينة إخراج · ليست معايرة</p>
            <bdi dir="ltr">{String(currentIndex + 1).padStart(2, '0')} / {String(pack.experiencePoints.length).padStart(2, '0')}</bdi>
            <h2 id="vd-projection-title">{point.nameAr}</h2>
            <small>رحلة مرشحة وغير معتمدة مكانيًا · المصدر ظاهر ولا توجد هندسة أو مدة مخمّنة</small>
          </div>
          <div className="vd-projection-controls">
            <button type="button" onClick={previous} disabled={currentIndex === 0}><ArrowRight aria-hidden="true" />السابق</button>
            <button type="button" onClick={() => setPlayback(playback === 'playing' ? 'paused' : 'playing')}>
              {playback === 'playing' ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              {playback === 'playing' ? 'إيقاف' : 'تشغيل'}
            </button>
            <button type="button" onClick={next} disabled={currentIndex === pack.experiencePoints.length - 1}>التالي<ArrowLeft aria-hidden="true" /></button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
