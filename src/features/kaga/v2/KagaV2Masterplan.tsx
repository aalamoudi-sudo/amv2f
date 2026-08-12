import { useEffect, useMemo, useState } from 'react';
import { journeyById } from '../data/journeys';
import type { JourneyId } from '../data/spatialTypes';
import { IllustratedMapSwitcher } from '../illustratedMap/IllustratedMapLayers';
import type { IllustratedMapReading } from '../illustratedMap/illustratedMapRegistration';
import { gardenById } from '../knowledge';
import { MetricValue } from '../shared/MetricValue';
import {
  executiveGardenRegistrations,
  gardenRegistrationById,
} from '../spatial/gardenRegistration';
import { registeredJourneyById, registeredJourneys } from '../spatial/registeredJourneys';
import { useRegisteredSpatialStore } from '../spatial/registeredSpatialStore';
import { PresentationContourFrame, presentationSurfaceAttributes } from '../theme';
import { RegisteredMasterplan } from './RegisteredMasterplan';
import { GuestJourneyPanel } from './GuestJourneyPanel';
import './guestJourneyMythic.css';

type MapMode = 'event' | 'gardens';
type DetailView = 'default' | 'garden';

interface JourneyReturnState {
  journeyId: keyof typeof registeredJourneyById;
  progress: number;
  stopIndex: number;
  wasPlaying: boolean;
}

export interface KagaV2MasterplanProps {
  initialMode?: MapMode;
  provenanceMode?: boolean;
  onOpenCrescentStory: () => void;
  onOpenExperience?: (experienceId: string) => void;
  onOpenLegendaryJourney?: (journeyId: JourneyId) => void;
  onReturnToProject?: () => void;
}

export function KagaV2Masterplan({
  initialMode = 'event',
  provenanceMode = false,
  onOpenCrescentStory,
  onOpenExperience = () => undefined,
  onOpenLegendaryJourney = () => undefined,
  onReturnToProject = () => undefined,
}: KagaV2MasterplanProps) {
  const [mode, setMode] = useState<MapMode>(initialMode);
  const [selectedGardenId, setSelectedGardenId] = useState('devonianGarden');
  const [detailView, setDetailView] = useState<DetailView>('default');
  const [journeyReturn, setJourneyReturn] = useState<JourneyReturnState | null>(null);
  const [mapReading, setMapReading] = useState<IllustratedMapReading>(() =>
    useRegisteredSpatialStore.getState().journeyId === 'guests' ? 'illustrated' : 'masterplan');
  const [sourceFidelityMode, setSourceFidelityMode] = useState(() =>
    useRegisteredSpatialStore.getState().journeyId === 'guests');
  const {
    journeyId,
    progress,
    playing,
    selectedStopIndex,
    selectJourney,
    setProgress,
    play,
    pause,
    restart,
    nextStop,
    previousStop,
    selectStop,
  } = useRegisteredSpatialStore();

  const activeJourney = registeredJourneyById[journeyId];
  const activeStop = activeJourney.stops[selectedStopIndex]!;
  const sourceStop = journeyById[journeyId].stops.find((stop) => stop.id === activeStop.stopId);
  const selectedGarden = gardenById[selectedGardenId];
  const registeredIds = useMemo(
    () => new Set(executiveGardenRegistrations.map((registration) => registration.canonicalGardenId)),
    [],
  );
  const registeredGardenKnowledge = useMemo(
    () => executiveGardenRegistrations
      .map((registration) => gardenById[registration.canonicalGardenId])
      .filter((garden) => garden !== undefined),
    [],
  );

  useEffect(() => {
    if (!playing) return undefined;
    let previous = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = (now - previous) / 1000;
      previous = now;
      const next = progress + elapsed / activeJourney.presentationDurationSeconds;
      if (next >= 1) {
        setProgress(1);
        pause();
        return;
      }
      setProgress(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activeJourney.presentationDurationSeconds, pause, playing, progress, setProgress]);

  const selectJourneyWithPresentation = (nextJourneyId: JourneyId) => {
    setMapReading(nextJourneyId === 'guests' ? 'illustrated' : 'masterplan');
    setSourceFidelityMode(nextJourneyId === 'guests');
    selectJourney(nextJourneyId);
  };

  const switchMode = (nextMode: MapMode) => {
    setMode(nextMode);
    setDetailView('default');
  };

  const openGarden = (gardenId: string) => {
    setSelectedGardenId(gardenId);
    setDetailView('garden');
  };

  const discoverActiveStop = () => {
    if (!activeStop.physicalEntityId) return;
    setJourneyReturn({
      journeyId,
      progress,
      stopIndex: selectedStopIndex,
      wasPlaying: playing,
    });
    pause();
    setSelectedGardenId(activeStop.physicalEntityId);
    setMode('gardens');
    setDetailView('garden');
  };

  const returnToJourney = () => {
    const returnState = journeyReturn;
    setMode('event');
    setDetailView('default');
    if (!returnState) return;
    selectJourney(returnState.journeyId);
    selectStop(returnState.stopIndex);
    setProgress(returnState.progress);
    if (returnState.wasPlaying) window.requestAnimationFrame(play);
    setJourneyReturn(null);
  };

  const renderGardenDetail = () => {
    if (!selectedGarden) return null;
    const isRegistered = registeredIds.has(selectedGarden.id);
    const journeyRelations = registeredJourneys.filter((journey) =>
      journey.stops.some((stop) => stop.physicalEntityId === selectedGarden.id),
    );
    return (
      <article className="kaga-v2-knowledge-detail" data-testid="garden-detail" {...presentationSurfaceAttributes('garden-detail')}>
        <button
          type="button"
          className="kaga-v2-panel-back"
          onClick={journeyReturn ? returnToJourney : () => setDetailView('default')}
        >
          {journeyReturn ? 'العودة إلى الرحلة' : 'العودة إلى دليل الحدائق'}
        </button>
        <p className="kaga-v2-kicker">{selectedGarden.category === 'internal' ? 'حديقة داخلية' : 'حديقة خارجية'}</p>
        <h2>{selectedGarden.titleAr}</h2>
        {selectedGarden.areaSqm ? (
          <strong className="kaga-v2-knowledge-detail__area">
            <MetricValue value={selectedGarden.areaSqm.toLocaleString('en-US')} unitAr="م" exponent={2} />
          </strong>
        ) : null}
        <p>{selectedGarden.descriptionAr}</p>
        <div className="kaga-v2-knowledge-detail__location">
          <span>موقعها في الحدائق</span>
          <strong>{isRegistered ? 'موضّحة على المخطط التفاعلي' : 'متاحة معرفياً، ولم يُحدد موقعها على المخطط بعد'}</strong>
        </div>
        {journeyRelations.length ? (
          <div className="kaga-v2-knowledge-detail__relations">
            <span>مرتبطة برحلة التدشين</span>
            {journeyRelations.map((journey) => <small key={journey.journeyId}>{journey.titleAr}</small>)}
          </div>
        ) : null}
        {isRegistered ? (
          <button type="button" className="kaga-v2-action kaga-v2-action--secondary" onClick={() => setDetailView('default')}>
            عرض على الخريطة
          </button>
        ) : null}
        <details className="kaga-v2-more">
          <summary>اعرف أكثر</summary>
          <p>{selectedGarden.descriptionAr}</p>
        </details>
        {provenanceMode ? (
          <details className="kaga-v2-provenance" open>
            <summary>Provenance / QA</summary>
            <p>
              Knowledge Guide: pages {selectedGarden.source.flatMap((source) => source.sourcePages).join(', ')}
              {isRegistered ? ` · ${gardenRegistrationById[selectedGarden.id]?.footprintId ?? ''} · confidence ${gardenRegistrationById[selectedGarden.id]?.confidence ?? ''}` : ' · no registered footprint'}
            </p>
          </details>
        ) : null}
      </article>
    );
  };

  const renderPanel = () => {
    if (detailView === 'garden') return renderGardenDetail();
    if (mode === 'event' && journeyId === 'guests') {
      return (
        <GuestJourneyPanel
          journey={activeJourney}
          activeStop={activeStop}
          selectedStopIndex={selectedStopIndex}
          progress={progress}
          playing={playing}
          sourceFidelityMode={sourceFidelityMode}
          onSourceFidelityModeChange={setSourceFidelityMode}
          onPlay={play}
          onPause={pause}
          onRestart={restart}
          onPrevious={previousStop}
          onNext={nextStop}
          onSelectStop={selectStop}
          onSetProgress={setProgress}
          onDiscoverPlace={discoverActiveStop}
          onOpenExperience={onOpenExperience}
          onWatchStory={() => onOpenLegendaryJourney('guests')}
          onReturnToProject={onReturnToProject}
          experienceId={sourceStop?.experienceId}
          journeyChoices={registeredJourneys.map((journey) => ({ id: journey.journeyId, titleAr: journey.titleAr }))}
          onSelectJourney={(nextJourneyId) => selectJourneyWithPresentation(nextJourneyId as JourneyId)}
        />
      );
    }
    return (
      <div className="kaga-v2-map-panel">
        <p className="kaga-v2-kicker">المخطط التفاعلي</p>
        <h1 id="kaga-v2-map-heading">{mode === 'event' ? 'رحلة التدشين' : 'استكشف الحدائق'}</h1>
        <div className="kaga-v2-mode-switch" role="tablist" aria-label="وضع المخطط">
          <button type="button" role="tab" aria-selected={mode === 'event'} onClick={() => switchMode('event')}>رحلة التدشين</button>
          <button type="button" role="tab" aria-selected={mode === 'gardens'} onClick={() => switchMode('gardens')}>استكشف الحدائق</button>
        </div>
        {mode === 'event' ? (
          <>
            <p className="kaga-v2-map-panel__summary">اختر رحلة لاستعراض محطاتها ومسارها على المخطط، ثم اكتشف معرفة المكان عند المحطات المرتبطة بالحدائق.</p>
            <nav className="kaga-v2-route-list" aria-label="رحلات التدشين الست">
              {registeredJourneys.map((journey) => (
                <button
                  key={journey.journeyId}
                  type="button"
                  aria-pressed={journey.journeyId === journeyId}
                  onClick={() => selectJourneyWithPresentation(journey.journeyId)}
                >
                  <span>{journey.titleAr}</span>
                  <small>عرض المسار</small>
                </button>
              ))}
            </nav>
            <section className="kaga-v2-playback" aria-label="تشغيل الرحلة">
              <div className="kaga-v2-playback__controls">
                <button type="button" onClick={previousStop} aria-label="المحطة السابقة">السابق</button>
                <button type="button" onClick={playing ? pause : play}>{playing ? 'إيقاف مؤقت' : 'تشغيل'}</button>
                <button type="button" onClick={nextStop} aria-label="المحطة التالية">التالي</button>
                <button type="button" onClick={restart}>إعادة</button>
              </div>
              <input aria-label="تقدم الرحلة" type="range" min="0" max="1" step="0.001" value={progress} onChange={(event) => setProgress(Number(event.target.value))} />
            </section>
            <section className="kaga-v2-stop-inspector" data-testid="stop-inspector" {...presentationSurfaceAttributes('stop-inspector')}>
              <span>المحطة {activeStop.code}</span>
              <h2>{activeStop.eventLabel}</h2>
              {activeStop.durationMinutes ? <p>المدة | {activeStop.durationMinutes} دقيقة</p> : null}
              {activeStop.detailAr ? <p className="is-detail">{activeStop.detailAr}</p> : null}
              {activeStop.physicalEntityId ? <button type="button" onClick={discoverActiveStop}>اكتشف الموقع</button> : null}
            </section>
          </>
        ) : (
          <>
            <p className="kaga-v2-map-panel__summary">تعرّف إلى الحدائق الموثقة في الدليل، واستكشف مواقع الحدائق التي تظهر على المخطط.</p>
            <section className="kaga-v2-garden-discovery" aria-labelledby="gardens-on-map">
              <h2 id="gardens-on-map">على المخطط</h2>
              <nav className="kaga-v2-garden-list" aria-label="الحدائق على المخطط">
                {registeredGardenKnowledge.map((garden) => (
                  <button
                    key={garden.id}
                    type="button"
                    aria-pressed={selectedGardenId === garden.id}
                    onClick={() => openGarden(garden.id)}
                  >
                    <span>{garden.titleAr}</span>
                    <small>{garden.category === 'internal' ? 'داخلية' : 'خارجية'}</small>
                  </button>
                ))}
              </nav>
            </section>
            {provenanceMode ? (
              <p className="kaga-v2-audit-note">تعرض طبقة التنفيذ فقط حدائق عرض التدشين ذات التسجيل المكاني الموثوق؛ وتبقى كيانات الدليل الأخرى في سجل المصدر الداخلي.</p>
            ) : null}
            <button type="button" className="kaga-v2-crescent-story-action" onClick={onOpenCrescentStory}>قصة مبنى الهلالين</button>
          </>
        )}
        {provenanceMode ? (
          <details className="kaga-v2-provenance" open data-testid="provenance-panel">
            <summary>Provenance / QA</summary>
            <p>KAGA-SPATIAL-REGISTERED-V1 · KAGA-SOURCE-2D-V1 · Rhino source registration review.</p>
          </details>
        ) : null}
      </div>
    );
  };

  const isGuestWorld = mode === 'event' && journeyId === 'guests' && detailView === 'default';
  const guestCameraState = activeStop.code === 'C' ? 'arrival' : playing ? 'approach' : 'overview';
  const guestWorldStyle = {
    '--rebirth-focus-x': `${(activeStop.mapPoint[0] / 1703.16) * 100}%`,
    '--rebirth-focus-y': `${(activeStop.mapPoint[1] / 1371.235) * 100}%`,
  } as React.CSSProperties;

  if (isGuestWorld) {
    return (
      <section
        className="kaga-v2-map-screen kaga-pf-masterplan kaga-rebirth-guest-world"
        aria-labelledby="kaga-v2-map-heading"
        data-testid="kaga-v2-masterplan-experience"
        data-visual-rebirth="guest-journey"
        data-camera-state={guestCameraState}
        data-active-stop={activeStop.code}
        data-playing={playing}
        style={guestWorldStyle}
        {...presentationSurfaceAttributes('masterplan')}
      >
        <div className="kaga-rebirth-guest-world__canvas" aria-label="المخطط الحي لرحلة الضيوف">
          <IllustratedMapSwitcher value={mapReading} onChange={setMapReading} />
          <div className="kaga-rebirth-guest-world__map">
            <RegisteredMasterplan
              mode="event"
              journeyId="guests"
              progress={progress}
              playing={playing}
              reading={mapReading}
              sourceFidelityMode={sourceFidelityMode}
              selectedGardenId={selectedGardenId}
              selectedStopIndex={selectedStopIndex}
              provenanceMode={provenanceMode}
              onGardenSelect={openGarden}
              onStopSelect={selectStop}
            />
          </div>
          <div className="kaga-rebirth-guest-world__atmosphere" aria-hidden="true" />
          <div className="kaga-rebirth-guest-world__focus" aria-hidden="true"><i /><span /></div>
        </div>
        {renderPanel()}
      </section>
    );
  }

  return (
    <section
      className="kaga-v2-map-screen kaga-pf-masterplan"
      aria-labelledby="kaga-v2-map-heading"
      data-testid="kaga-v2-masterplan-experience"
      {...presentationSurfaceAttributes(mode === 'gardens' ? 'garden-explorer' : 'masterplan')}
    >
      <PresentationContourFrame
        variant="map"
        className="kaga-pf-masterplan__frame"
        ariaLabel="المخطط التفاعلي ورحلات التدشين"
        visual={(
          <div className="kaga-mythic-map-stage" data-journey={journeyId}>
            {mode === 'event' && journeyId === 'guests' ? <IllustratedMapSwitcher value={mapReading} onChange={setMapReading} /> : null}
            <RegisteredMasterplan
              mode={mode}
              journeyId={journeyId}
              progress={progress}
              playing={playing}
              reading={mode === 'event' && journeyId === 'guests' ? mapReading : 'masterplan'}
              sourceFidelityMode={mode === 'event' && journeyId === 'guests' && sourceFidelityMode}
              selectedGardenId={selectedGardenId}
              selectedStopIndex={selectedStopIndex}
              provenanceMode={provenanceMode}
              onGardenSelect={openGarden}
              onStopSelect={selectStop}
            />
          </div>
        )}
        content={renderPanel()}
      />
    </section>
  );
}
