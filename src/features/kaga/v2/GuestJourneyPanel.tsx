import type { CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, Gift, MapPinned } from 'lucide-react';
import { journeyById } from '../data/journeys';
import type { RegisteredJourney, RegisteredJourneyStop } from '../spatial/registeredJourneys';
import {
  guestJourneyMovementSummary,
  guestStopPresentationByCode,
  guestTransportLabels,
  type GuestTransportMode,
} from './guestJourneyPresentation';

const TransportIcon = ({ mode }: { mode: GuestTransportMode }) => {
  const isGolfCart = mode === 'golf-cart' || mode === 'tour';

  return (
    <svg
      className="kaga-mythic-transport-icon"
      data-transport-mode={mode}
      viewBox="0 0 32 20"
      aria-hidden="true"
    >
      {isGolfCart ? (
        <>
          <path d="M6 13.5h19l-1.5-6H11L8 10H5.5" />
          <path d="M12 7.5V3.5h10.5l2 4" />
          <path d="M10.5 3.5h13.8" />
          <circle cx="10" cy="15.5" r="2.2" />
          <circle cx="23" cy="15.5" r="2.2" />
          {mode === 'tour' ? <path className="is-direction" d="M3 5h5M5.5 2.5 8 5 5.5 7.5" /> : null}
        </>
      ) : (
        <>
          <path d="M5 13.5h22l-1.2-6.2-4.3-3H11.2l-3.7 5H5z" />
          <path d="M11 4.5 9 9h14.5l-3-4.5" />
          <circle cx="10" cy="15.5" r="2.2" />
          <circle cx="23" cy="15.5" r="2.2" />
          {mode === 'exit' ? <path className="is-direction" d="M29 4h-5M26.5 1.5 24 4l2.5 2.5" /> : null}
        </>
      )}
    </svg>
  );
};

interface GuestJourneyPanelProps {
  journey: RegisteredJourney;
  activeStop: RegisteredJourneyStop;
  selectedStopIndex: number;
  progress: number;
  playing: boolean;
  sourceFidelityMode: boolean;
  onSourceFidelityModeChange: (enabled: boolean) => void;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSelectStop: (index: number) => void;
  onSetProgress: (progress: number) => void;
  onDiscoverPlace: () => void;
  onOpenExperience: (experienceId: string) => void;
  onWatchStory: () => void;
  onReturnToProject: () => void;
  experienceId?: string;
  journeyChoices: Array<{ id: string; titleAr: string }>;
  onSelectJourney: (journeyId: string) => void;
}

export function GuestJourneyPanel({
  journey,
  activeStop,
  selectedStopIndex,
  progress,
  playing,
  sourceFidelityMode,
  onSourceFidelityModeChange,
  onPlay,
  onPause,
  onRestart,
  onPrevious,
  onNext,
  onSelectStop,
  onSetProgress,
  onDiscoverPlace,
  onOpenExperience,
  onWatchStory,
  onReturnToProject,
  experienceId,
  journeyChoices,
  onSelectJourney,
}: GuestJourneyPanelProps) {
  const sourceJourney = journeyById.guests;
  const activePresentation = guestStopPresentationByCode[activeStop.code]!;
  const nextStop = journey.stops[selectedStopIndex + 1];
  const completed = progress >= 1;
  const primaryLabel = progress === 0 ? 'ابدأ الرحلة' : 'متابعة الرحلة';

  return (
    <article
      className="kaga-mythic-guest"
      data-testid="mythic-guest-journey"
      data-complete={completed}
      data-active-stop={activeStop.code}
      data-playing={playing}
      data-source-version="V.15"
    >
      <header className="kaga-mythic-guest__header">
        <div>
          <p>الرحلة · صفحة 26</p>
          <h1 id="kaga-v2-map-heading">{sourceJourney.title}</h1>
          <span dir="rtl">{sourceJourney.window}</span>
        </div>
        <button type="button" className="kaga-mythic-guest__story" onClick={onWatchStory}>شاهد رحلة الضيوف</button>
      </header>

      <div className="kaga-mythic-guest__transport" aria-label="أنماط حركة رحلة الضيوف">
        {(['car', 'golf-cart', 'tour', 'exit'] as const).map((mode) => (
          <span key={mode} data-active={activePresentation.transport === mode}>
            <TransportIcon mode={mode} />
            {guestTransportLabels[mode]}
          </span>
        ))}
      </div>

      <nav
        className="kaga-mythic-rail"
        aria-label="تسلسل محطات رحلة الضيوف"
        data-continuous-sequence="A-L"
      >
        {journey.stops.map((stop, index) => {
          const presentation = guestStopPresentationByCode[stop.code]!;
          const state = index < selectedStopIndex ? 'complete' : index === selectedStopIndex ? 'current' : index === selectedStopIndex + 1 ? 'next' : 'future';
          return (
            <button
              key={stop.stopId}
              type="button"
              data-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
              aria-label={`${stop.code}، ${presentation.shortTitleAr}${stop.durationMinutes ? `، ${stop.durationMinutes} دقيقة` : ''}`}
              onClick={() => onSelectStop(index)}
            >
              <b>
                <span>{stop.code}</span>
                {state === 'complete' ? <i aria-hidden="true">✓</i> : null}
              </b>
              <span>
                {presentation.shortTitleAr}
                <small><TransportIcon mode={presentation.transport} />{stop.durationMinutes ? `${stop.durationMinutes} د` : guestTransportLabels[presentation.transport]}</small>
              </span>
            </button>
          );
        })}
      </nav>

      {!completed ? (
        <section className="kaga-mythic-stop" data-testid="mythic-active-stop">
          <div className="kaga-mythic-stop__identity">
            <strong>{activeStop.code}</strong>
            <div>
              <p>المحطة الحالية</p>
              <h2>{activeStop.eventLabel}</h2>
            </div>
            {activeStop.durationMinutes ? <time>{activeStop.durationMinutes} دقيقة</time> : null}
          </div>
          <p className="kaga-mythic-stop__description">{activePresentation.descriptionAr}</p>
          {activeStop.detailAr ? (
            <details className="kaga-mythic-stop__more">
              <summary>اعرف أكثر</summary>
              <p className="kaga-mythic-stop__source-detail">{activeStop.detailAr}</p>
            </details>
          ) : null}
          {nextStop ? (
            <p className="kaga-mythic-stop__next">
              <span>التالي</span>
              <b>{nextStop.code} · {guestStopPresentationByCode[nextStop.code]?.shortTitleAr}</b>
              {nextStop.durationMinutes ? <small>{nextStop.durationMinutes} دقيقة</small> : null}
            </p>
          ) : null}
          <div className="kaga-mythic-stop__actions">
            {activeStop.physicalEntityId ? <button type="button" onClick={onDiscoverPlace}><MapPinned />اكتشف الموقع</button> : null}
            {experienceId ? <button type="button" onClick={() => onOpenExperience(experienceId)}><Gift />شاهد التجربة</button> : null}
          </div>
        </section>
      ) : (
        <section className="kaga-mythic-ending" data-testid="mythic-guest-ending">
          <p>رحلة الضيوف</p>
          <h2>اكتملت الرحلة بهدوءٍ في موقعها.</h2>
          <div><button type="button" onClick={onRestart}>إعادة الرحلة</button><button type="button" onClick={onReturnToProject}>العودة إلى المشروع</button></div>
          <svg viewBox="0 0 280 54" aria-hidden="true"><path d="M0 48 C46 16 87 18 126 39 C163 59 203 49 229 24 C245 9 262 3 280 4" /><path d="M29 42 C43 30 49 16 49 3 M46 20 C35 15 29 8 25 0 M48 24 C60 17 67 9 71 0 M210 36 C220 28 225 17 225 4 M223 19 C214 14 208 7 205 0" /></svg>
        </section>
      )}

      {!completed ? (
        <>
          <section className="kaga-mythic-playback" aria-label="تشغيل رحلة الضيوف">
            <div>
              <button type="button" onClick={onPrevious} aria-label="المحطة السابقة"><ChevronRight /></button>
              <button type="button" className="is-primary" onClick={playing ? onPause : onPlay}>{playing ? 'إيقاف مؤقت' : primaryLabel}</button>
              <button type="button" onClick={onNext} aria-label="المحطة التالية"><ChevronLeft /></button>
            </div>
            <label>
              <span>المتبقي من الرحلة</span>
              <bdi>{Math.round((1 - progress) * 100)}٪</bdi>
              <input aria-label="تقدم رحلة الضيوف" type="range" min="0" max="1" step="0.001" value={progress} onChange={(event) => onSetProgress(Number(event.target.value))} />
            </label>
          </section>

          <div className="kaga-mythic-guest__source-mode">
            <button type="button" aria-pressed={sourceFidelityMode} onClick={() => onSourceFidelityModeChange(!sourceFidelityMode)}>
              {sourceFidelityMode ? 'عرض المسار الموحّد' : 'عرض المسار كما في الملف'}
            </button>
            <details>
              <summary>دليل ألوان الحركة</summary>
              {guestJourneyMovementSummary.map((item) => (
                <p key={item.id} data-pattern={item.sourcePattern}>
                  <i aria-hidden="true" style={{ '--movement-color': item.sourceColor } as CSSProperties} />
                  <span>{item.sourceLabelAr ?? item.labelAr}</span>
                  <small><TransportIcon mode={item.transportAr === 'سيارة' ? 'car' : 'golf-cart'} /> {item.transportAr}{item.distanceMeters ? ` · ${item.distanceMeters} م` : ''}{item.realDurationMinutes ? ` · ${item.realDurationMinutes} دقائق` : ''}</small>
                </p>
              ))}
              {sourceJourney.contextNotesAr?.map((note) => <em key={note}>{note}</em>)}
            </details>
          </div>
          <details className="kaga-mythic-guest__journey-index">
            <summary>رحلات التدشين الأخرى</summary>
            <nav aria-label="اختيار رحلة أخرى">
              {journeyChoices.filter((item) => item.id !== 'guests').map((item) => (
                <button key={item.id} type="button" onClick={() => onSelectJourney(item.id)}>{item.titleAr}</button>
              ))}
            </nav>
          </details>
        </>
      ) : null}
    </article>
  );
}
