import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { gardenById, crescentBuilding, crescentStorySteps } from '../knowledge';
import { MetricValue } from '../shared/MetricValue';
import {
  crescentRegistration,
  executiveGardenRegistrations,
  gardenRegistrationById,
} from '../spatial/gardenRegistration';
import { registeredJourneyById, registeredJourneys } from '../spatial/registeredJourneys';
import { useRegisteredSpatialStore } from '../spatial/registeredSpatialStore';
import { OrganicPresentationFrame, kagaThemeCssVariables } from '../theme';
import { KagaV2Intro } from './KagaV2Intro';
import { RegisteredMasterplan } from './RegisteredMasterplan';
import './kagaV2Gate1.css';

type KagaV2MapMode = 'event' | 'gardens';
type DetailView = 'default' | 'garden' | 'crescentAudit' | 'crescentStory';

export function KagaV2Gate1() {
  const [entered, setEntered] = useState(false);
  const [mode, setMode] = useState<KagaV2MapMode>('event');
  const [selectedGardenId, setSelectedGardenId] = useState<string>('devonianGarden');
  const [detailView, setDetailView] = useState<DetailView>('default');
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
  const selectedGarden = gardenById[selectedGardenId];

  useEffect(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    document.title = 'حدائق الملك عبدالله | التسجيل المكاني V2';
  }, []);

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

  const registeredGardenKnowledge = useMemo(
    () => executiveGardenRegistrations.map((registration) => gardenById[registration.canonicalGardenId]!).filter(Boolean),
    [],
  );

  const openMap = (nextMode: KagaV2MapMode) => {
    setMode(nextMode);
    setDetailView(nextMode === 'gardens' ? 'garden' : 'default');
    setEntered(true);
  };

  const openGarden = (gardenId: string) => {
    setSelectedGardenId(gardenId);
    setDetailView('garden');
  };

  const discoverActiveStop = () => {
    if (!activeStop.physicalEntityId) return;
    setSelectedGardenId(activeStop.physicalEntityId);
    setMode('gardens');
    setDetailView('garden');
  };

  const renderGardenDetail = () => {
    if (!selectedGarden) return null;
    const registration = gardenRegistrationById[selectedGarden.id]!;
    const journeyRelations = registeredJourneys.filter((journey) =>
      journey.stops.some((stop) => stop.physicalEntityId === selectedGarden.id),
    );
    return (
      <div className="kaga-v2-knowledge-detail" data-testid="garden-detail">
        <button type="button" className="kaga-v2-panel-back" onClick={() => setDetailView('default')}>العودة إلى الدليل</button>
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
          <strong>مسجلة على المخطط · ثقة {registration.confidence === 'high' ? 'عالية' : 'دقيقة'}</strong>
        </div>
        {journeyRelations.length ? (
          <div className="kaga-v2-knowledge-detail__relations">
            <span>مرتبطة برحلة التدشين</span>
            {journeyRelations.map((journey) => <small key={journey.journeyId}>{journey.titleAr}</small>)}
          </div>
        ) : null}
        <details className="kaga-v2-provenance">
          <summary>اعرف أكثر</summary>
          <p>الدليل المعرفي: ص {selectedGarden.source.flatMap((source) => source.sourcePages).join('، ')} · دليل الموقع: ص ١٣ · منحنى Rhino: {registration.footprintId}</p>
        </details>
      </div>
    );
  };

  const renderCrescentAudit = () => (
    <div className="kaga-v2-knowledge-detail" data-testid="crescent-registration">
      <button type="button" className="kaga-v2-panel-back" onClick={() => setDetailView('default')}>العودة</button>
      <p className="kaga-v2-kicker">تدقيق التسجيل المكاني</p>
      <h2>مبنى الهلالين</h2>
      <strong className="kaga-v2-registration-status">التسجيل المكاني: غير محسوم</strong>
      <p>{crescentRegistration.notesAr}</p>
      <p className="kaga-v2-audit-note">يظهر النطاق المتقطع للمراجعة فقط، ولا يعمل كبصمة تنفيذية أو نقطة تركيز للمشهد.</p>
      <button type="button" className="kaga-v2-action kaga-v2-action--secondary" onClick={() => setDetailView('crescentStory')}>قصة مبنى الهلالين</button>
    </div>
  );

  const renderCrescentStory = () => (
    <div className="kaga-v2-crescent-story" data-testid="crescent-story">
      <button type="button" className="kaga-v2-panel-back" onClick={() => setDetailView('crescentAudit')}>العودة إلى حالة التسجيل</button>
      <p className="kaga-v2-kicker">{crescentBuilding.roleAr}</p>
      <h2>{crescentBuilding.titleAr}</h2>
      <p>{crescentBuilding.summaryAr}</p>
      <ol>
        {crescentStorySteps.map((step) => (
          <li key={step.id}>
            <small>{step.eyebrowAr}</small>
            <strong>{step.titleAr}</strong>
            <span>{step.descriptionAr}</span>
          </li>
        ))}
        <li>
          <small>اللحظة</small>
          <strong>لحظة التدشين</strong>
          <span>تلتقي قصة المكان مع التسلسل الاحتفالي المصدر من عرض التدشين.</span>
        </li>
      </ol>
    </div>
  );

  const renderPanel = () => {
    if (detailView === 'garden') return renderGardenDetail();
    if (detailView === 'crescentAudit') return renderCrescentAudit();
    if (detailView === 'crescentStory') return renderCrescentStory();
    return (
      <div className="kaga-v2-map-panel">
        <p className="kaga-v2-kicker">KAGA-SPATIAL-REGISTERED-V1</p>
        <h1 id="kaga-v2-map-heading">{mode === 'event' ? 'رحلة التدشين' : 'استكشف الحدائق'}</h1>
        <div className="kaga-v2-mode-switch" role="tablist" aria-label="وضع المخطط">
          <button type="button" role="tab" aria-selected={mode === 'event'} onClick={() => { setMode('event'); setDetailView('default'); }}>رحلة التدشين</button>
          <button type="button" role="tab" aria-selected={mode === 'gardens'} onClick={() => { setMode('gardens'); setDetailView('default'); }}>استكشف الحدائق</button>
        </div>
        {mode === 'event' ? (
          <>
            <p className="kaga-v2-map-panel__summary">ترتيب المحطات وبروتوكول الرحلة من عرض التدشين، فوق مخطط Rhino المسجل. لم يُستخدم أي مسار أقصر آلي.</p>
            <nav className="kaga-v2-route-list" aria-label="رحلات التدشين الست">
              {registeredJourneys.map((journey) => (
                <button key={journey.journeyId} type="button" aria-pressed={journey.journeyId === journeyId} onClick={() => selectJourney(journey.journeyId)}>
                  <span>{journey.titleAr}</span>
                  <small>ص {journey.eventSourcePages.join('، ')}</small>
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
            <section className="kaga-v2-stop-inspector" data-testid="stop-inspector">
              <span>المحطة {activeStop.code}</span>
              <h2>{activeStop.eventLabel}</h2>
              {activeStop.durationMinutes ? <p>المدة | {activeStop.durationMinutes} دقيقة</p> : null}
              {activeStop.detailAr ? <p className="is-detail">{activeStop.detailAr}</p> : null}
              {activeStop.physicalEntityId ? <button type="button" onClick={discoverActiveStop}>اكتشف الموقع</button> : null}
            </section>
          </>
        ) : (
          <>
            <p className="kaga-v2-map-panel__summary">تظهر فقط الكيانات المسماة ذات التسجيل العالي أو الدقيق. تبقى المعرفة المصدرية غير المسجلة متاحة بلا ادعاء مكاني.</p>
            <nav className="kaga-v2-garden-list" aria-label="الحدائق المسجلة">
              {registeredGardenKnowledge.map((garden) => (
                <button key={garden.id} type="button" onClick={() => openGarden(garden.id)}>
                  <span>{garden.titleAr}</span>
                  <small>{garden.category === 'internal' ? 'داخلية' : 'خارجية'}</small>
                </button>
              ))}
            </nav>
            <div className="kaga-v2-map-panel__source-note">
              <strong>{executiveGardenRegistrations.length} كيانات مسماة مسجلة</strong>
              <span>لا تُعرض المضلعات المرشحة المجهولة في الوضع التنفيذي</span>
            </div>
            <button type="button" className="kaga-v2-crescent-audit-action" onClick={() => setDetailView('crescentAudit')}>حالة تسجيل مبنى الهلالين</button>
          </>
        )}
      </div>
    );
  };

  return (
    <main className="kaga-v2-app" lang="ar" dir="rtl" style={kagaThemeCssVariables as CSSProperties} data-testid="kaga-v2-app">
      {!entered ? (
        <KagaV2Intro onEnterEvent={() => openMap('event')} onExploreGardens={() => openMap('gardens')} />
      ) : (
        <section className="kaga-v2-map-screen" aria-labelledby="kaga-v2-map-heading">
          <header className="kaga-v2-map-screen__header">
            <div><span>حدائق الملك عبدالله</span><strong>التسجيل المكاني الدلالي · Gate 2/3</strong></div>
            <button type="button" onClick={() => setEntered(false)}>العودة إلى الافتتاحية</button>
          </header>
          <OrganicPresentationFrame
            variant="portal"
            tone="ivory"
            visual={(
              <RegisteredMasterplan
                mode={mode}
                journeyId={journeyId}
                progress={progress}
                selectedGardenId={selectedGardenId}
                selectedStopIndex={selectedStopIndex}
                provenanceMode={detailView === 'crescentAudit'}
                onGardenSelect={openGarden}
                onStopSelect={selectStop}
              />
            )}
            content={renderPanel()}
          />
        </section>
      )}
    </main>
  );
}
