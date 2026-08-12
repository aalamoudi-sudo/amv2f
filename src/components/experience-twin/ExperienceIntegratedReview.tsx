import {
  AlertOctagon,
  Boxes,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  Film,
  MapPin,
  Pause,
  Play,
  Presentation,
  Route,
  ShieldAlert,
  X
} from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ExperienceMapMode, ExperienceReviewMode, ExperienceSelectionContext } from '../../types/experienceTwin';
import type { FourDayExperienceTruthProjection } from '../../types/experienceSourceReconciliation';
import type { ExperienceDeliveryControlCenterProjection, ExperienceDeliveryReadinessProjection } from '../../types/experienceDelivery';

const ExperienceDeliveryControlCenter = lazy(() => import('./ExperienceDeliveryControlCenter'));

const classificationLabelAr: Record<string, string> = {
  'approved-source': 'مصدر معتمد',
  'founder-supplied-working-candidate': 'مرشح عمل مقدم من المؤسس',
  'source-backed-candidate': 'مرشح مسند إلى مصدر',
  'rehearsal-only': 'للبروفة فقط',
  proposed: 'مقترح',
  conflicted: 'متعارض',
  unresolved: 'غير محسوم',
  missing: 'مفقود',
  restricted: 'مقيد',
  'reported-unverified': 'مبلّغ وغير متحقق',
  'not-applicable': 'غير منطبق'
};

export interface ExperienceReviewActiveContext {
  eventWindowAr: string;
  dayCountLabelAr: string;
  dayLabelAr: string;
  personaLabelAr: string;
  momentLabelAr: string;
  destinationLabelAr: string;
  truthStatusAr: string;
  sceneStatusAr: string;
  readinessStatusAr: string;
}

interface ExperienceIntegratedReviewProps {
  projectLabelAr: string;
  activeContext: ExperienceReviewActiveContext;
  projection: FourDayExperienceTruthProjection;
  deliveryReadiness: ExperienceDeliveryReadinessProjection;
  deliveryControl: Readonly<ExperienceDeliveryControlCenterProjection>;
  selection: ExperienceSelectionContext;
  onReviewModeChange: (mode: ExperienceReviewMode) => void;
  onPresentationPauseChange: (paused: boolean) => void;
  onApplyPresentationStep: (input: { presentationStep: number; dayId: string | null; entityId: string | null; mapMode: ExperienceMapMode | null }) => void;
  onSelectDay: (dayId: string) => void;
  onSelectEntity: (entityId: string) => void;
  onStartJourney: () => void;
  onOpenDesignScene: () => void;
  designSceneAvailable: boolean;
  heroPreviewUri: string | null;
  heroPreviewAvailable: boolean;
}

export default function ExperienceIntegratedReview({
  projectLabelAr,
  activeContext,
  projection,
  deliveryReadiness,
  deliveryControl,
  selection,
  onReviewModeChange,
  onPresentationPauseChange,
  onApplyPresentationStep,
  onSelectDay,
  onSelectEntity,
  onStartJourney,
  onOpenDesignScene,
  designSceneAvailable,
  heroPreviewUri,
  heroPreviewAvailable
}: ExperienceIntegratedReviewProps) {
  const [selectedConflictId, setSelectedConflictId] = useState(projection.sourceConflicts[0]?.conflictId ?? null);
  const presentationRef = useRef<HTMLElement>(null);
  const selectedConflict = projection.sourceConflicts.find((item) => item.conflictId === selectedConflictId) ?? projection.sourceConflicts[0] ?? null;
  const activeDay = projection.days.find((day) => day.dayId === selection.eventDayId) ?? projection.days[0] ?? null;
  const presentationIndex = Math.max(0, Math.min(projection.clientPresentationSteps.length - 1, selection.presentationStep - 1));
  const presentationStep = projection.clientPresentationSteps[presentationIndex] ?? null;
  const stationCandidates = projection.contentCandidates.filter((item) => item.contentType === 'ages-station');
  const technologyCandidates = projection.contentCandidates.filter((item) => item.contentType === 'experience-technology');
  const stationDurationMinutes = stationCandidates.reduce((total, item) => total + (item.durationMinutes ?? 0), 0);
  const missingStudioAssetCount = projection.sceneAssetRequirements.filter((item) => item.availability === 'missing' && (item.medium === '360-panorama' || item.medium === 'production-glb')).length;
  const presentationVisualKind = presentationIndex <= 1
    ? 'spatial'
    : presentationIndex <= 5
      ? 'days'
      : presentationIndex <= 8
        ? 'journey'
        : presentationIndex <= 11
          ? 'scenes'
          : presentationIndex === 12
            ? 'command'
            : 'roadmap';

  const setPresentationStep = (nextIndex: number) => {
    const bounded = Math.max(0, Math.min(projection.clientPresentationSteps.length - 1, nextIndex));
    const step = projection.clientPresentationSteps[bounded];
    if (!step) return;
    onApplyPresentationStep({ presentationStep: bounded + 1, dayId: step.dayId, entityId: step.entityId, mapMode: step.mapMode });
  };

  useEffect(() => {
    if (selection.reviewMode !== 'presentation') return;
    presentationRef.current?.focus();
  }, [selection.reviewMode]);

  useEffect(() => {
    if (selection.reviewMode !== 'presentation' || selection.presentationPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => {
      if (presentationIndex >= projection.clientPresentationSteps.length - 1) onPresentationPauseChange(true);
      else {
        const step = projection.clientPresentationSteps[presentationIndex + 1];
        if (step) onApplyPresentationStep({ presentationStep: presentationIndex + 2, dayId: step.dayId, entityId: step.entityId, mapMode: step.mapMode });
      }
    }, 8_000);
    return () => window.clearTimeout(timer);
  }, [onApplyPresentationStep, onPresentationPauseChange, presentationIndex, projection.clientPresentationSteps, selection.presentationPaused, selection.reviewMode]);

  return (
    <>
      <section className="experience-review-command" data-testid="experience-integrated-review" data-review-mode={selection.reviewMode}>
        <div className="experience-review-context-sr" data-testid="experience-review-context-strip">
          {activeContext.eventWindowAr} · {activeContext.dayCountLabelAr} · {activeContext.dayLabelAr} · {activeContext.personaLabelAr} · {activeContext.momentLabelAr} · {activeContext.destinationLabelAr} · {activeContext.sceneStatusAr} · الجاهزية التشغيلية: {activeContext.readinessStatusAr}
        </div>

        {selection.reviewMode === 'overview' ? (
          <div className="experience-review-panel experience-review-overview" data-testid="experience-review-overview">
            <div className="experience-hero-copy">
              <span className="experience-hero-eyebrow">MAYADEEN · EXPERIENCE TWIN</span>
              <h2>{projectLabelAr}</h2>
              <p className="experience-hero-window">{activeContext.eventWindowAr} <i /> {activeContext.dayCountLabelAr}</p>
              <div className="experience-hero-current"><span>تعيش الآن</span><strong>{activeContext.dayLabelAr}</strong><small>{activeContext.personaLabelAr} · {activeContext.momentLabelAr}</small></div>
              <p className="experience-hero-intro">عالم فعالية واحد يجمع التجربة والمكان والعمليات والقرار والدليل والبروفة، مع فصل الحقيقة المرشحة عن الجاهزية التشغيلية.</p>
              <div className="experience-hero-actions"><button data-testid="experience-start-from-gate" type="button" className="is-primary" onClick={onStartJourney}><Play />ابدأ رحلة التجربة</button><button data-testid="experience-open-design-web3d" type="button" disabled={!designSceneAvailable} onClick={onOpenDesignScene}><Boxes />استكشف التصميم ثلاثي الأبعاد</button><button type="button" onClick={() => setPresentationStep(0)}><Presentation />شغّل العرض التنفيذي</button></div>
              <div className="experience-hero-truth"><ShieldAlert /><span><b>حزمة تجربة مرشحة</b>{activeContext.readinessStatusAr} · {designSceneAvailable ? 'مشتق Web3D تشخيصي متاح · لا 360 أو 3D إنتاجي' : 'لا 360 أو 3D إنتاجي حاليًا'}</span></div>
            </div>
            <div className="experience-hero-spatial" data-testid="experience-hero-spatial">
              {heroPreviewAvailable && heroPreviewUri ? <img src={heroPreviewUri} alt="مرجع مسطح مرشح لخريطة مشروع حدائق الملك عبدالله" /> : <div className="experience-hero-missing"><Camera /><strong>المعاينة المكانية المحلية غير متاحة</strong><span>تبقى خريطة القصة المرشحة متاحة بعد بدء الرحلة.</span></div>}
              <div className="experience-hero-veil" />
              <div className="experience-hero-destination"><MapPin /><span>الوجهة الحالية</span><strong>{activeContext.destinationLabelAr}</strong><small>{activeContext.sceneStatusAr}</small></div>
              <span className="experience-hero-reference">مرجع 2D محسن · ليس 3D أو 360°</span>
            </div>
            <div className="experience-review-days" aria-label="التنقل بين الأيام الأربعة">
              {projection.days.map((day) => <button key={day.dayId} type="button" aria-pressed={activeDay?.dayId === day.dayId} onClick={() => onSelectDay(day.dayId)}><i>{day.order}</i><span><strong>{day.labelAr.split('·').at(-1)?.trim()}</strong><small>{day.purposeAr}</small></span><em>{classificationLabelAr[day.truthClassification]}</em></button>)}
            </div>
            <details className="experience-hero-disclosure"><summary>استكشف الوجهات وحالة البناء</summary><div className="experience-review-pulse"><article><MapPin /><span><b>{projection.destinations.length}</b> وجهة مرشحة</span><small>الهويات التشغيلية محفوظة</small></article><article><Film /><span><b>{projection.contentCandidates.filter((item) => item.contentType === 'main-show').length}</b> بدائل عرض رئيسي</span><small>لا خيار معتمد</small></article><article><Route /><span><b>{projection.routePlans.length}</b> بدائل مسار</span><small>لا مسار مختار</small></article><article><CircleOff /><span><b>{missingStudioAssetCount}</b> أصول استوديو مفقودة</span><small>360 وGLB إنتاجي</small></article></div><div className="experience-review-destinations" aria-label="الوجهات التشغيلية الإحدى عشرة">{projection.destinations.map((destination, index) => <button key={destination.destinationId} type="button" aria-pressed={selection.selectedEntityId === destination.entityId} onClick={() => onSelectEntity(destination.entityId)}><i>{index + 1}</i><span>{destination.labelAr}</span>{destination.destinationType === 'independent-landmark' ? <em>معلم مستقل</em> : destination.spatialStatus === 'conflicted' ? <em>متعارض</em> : null}</button>)}</div></details>
          </div>
        ) : null}

        {selection.reviewMode === 'days' ? (
          <div className="experience-review-panel experience-review-days-workspace" data-testid="experience-review-days-workspace">
            {projection.days.map((day) => (
              <button key={day.dayId} type="button" aria-pressed={activeDay?.dayId === day.dayId} onClick={() => onSelectDay(day.dayId)}>
                <header><i>{day.order}</i><div><span>{new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { day: 'numeric', month: 'long' }).format(new Date(`${day.date}T12:00:00+03:00`))}</span><strong>{day.labelAr.split('·').at(-1)?.trim()}</strong></div><em className={`truth-${day.truthClassification}`}>{classificationLabelAr[day.truthClassification]}</em></header>
                <p>{day.purposeAr}</p>
                <dl><div><dt>الجمهور</dt><dd>{day.audienceAr}</dd></div><div><dt>المسار</dt><dd>{day.visitorJourneyStatus === 'not-applicable' ? 'غير منطبق · لا رحلة تشغيلية' : day.routeSelectionStatus === 'unselected' ? '3 بدائل غير مختارة' : day.transitionStatus === 'unknown' ? 'انتقال غير معروف' : 'مرشح غير معتمد'}</dd></div><div><dt>المشهد</dt><dd>{designSceneAvailable ? 'Web3D تصميمي متحقق · غير مسجل هندسيًا' : 'مرجع مسطح فقط'}</dd></div><div><dt>البروفة</dt><dd>{day.visitorJourneyStatus === 'not-applicable' ? 'تسلسل محتوى احتفالي' : 'مرشحة'} · {projection.journeys.find((journey) => journey.dayId === day.dayId)?.momentIds.length ?? 0} لحظة</dd></div></dl>
                <footer>{day.conflictIds.length ? `${day.conflictIds.length} تعارضات مفتوحة` : 'لا تعارض يومي مسجل'}<ChevronLeft /></footer>
              </button>
            ))}
          </div>
        ) : null}

        {selection.reviewMode === 'sources' ? (
          <div className="experience-review-panel experience-review-sources" data-testid="experience-review-sources">
            <div className="experience-source-cards">{projection.sourceManifests.map((source) => <article key={source.sourceId}><CheckCircle2 /><div><strong>{source.sourceName}</strong><span>{classificationLabelAr[source.sourceClassification]}</span><small>{source.pageCount} صفحة · تحقق الحجم والبصمة · الأصل خارج Git</small></div></article>)}</div>
            <div className="experience-conflict-register">
              <div className="experience-conflict-list" role="listbox" aria-label="سجل تعارضات المصدر">{projection.sourceConflicts.map((conflict, index) => <button key={conflict.conflictId} type="button" role="option" aria-selected={selectedConflict?.conflictId === conflict.conflictId} onClick={() => setSelectedConflictId(conflict.conflictId)}><i>{index + 1}</i><span>{conflict.titleAr}</span><em>{conflict.resolutionStatus === 'not-applicable' ? 'مصحح' : conflict.classification === 'restricted' ? 'مقيد' : 'مفتوح'}</em></button>)}</div>
              {selectedConflict ? <article className="experience-conflict-detail" data-testid="experience-review-conflict-detail"><AlertOctagon /><div><span>{classificationLabelAr[selectedConflict.classification]}</span><h3>{selectedConflict.titleAr}</h3><p>{selectedConflict.descriptionAr}</p><strong>الحسم المطلوب</strong><small>{selectedConflict.requiredResolverAr}</small>{selectedConflict.classification === 'restricted' ? <em>التفاصيل المقيدة مستبعدة من المتصفح وعرض العميل.</em> : null}</div></article> : null}
            </div>
          </div>
        ) : null}

        {selection.reviewMode === 'assets' ? (
          <div className="experience-review-panel experience-review-assets" data-testid="experience-review-assets">
            <div className="experience-asset-grid">{projection.sceneAssetRequirements.map((asset) => <article key={asset.sceneAssetRequirementId} className={`asset-${asset.availability}`}><span>{asset.availability === 'available-candidate-reference' ? <CheckCircle2 /> : asset.availability === 'restricted' ? <ShieldAlert /> : <CircleOff />}</span><div><small>{classificationLabelAr[asset.truthClassification]}</small><strong>{asset.labelAr}</strong><p>{asset.blocksAr}</p></div></article>)}</div>
            <aside className="experience-content-register" data-testid="experience-review-content-candidates"><header><Film /><div><span>مرشحو المحتوى</span><strong>لا يوجد خيار معتمد أو نسخة تشغيل</strong></div></header><section><div><b>العرض الرئيسي</b>{projection.contentCandidates.filter((item) => item.contentType === 'main-show').map((item) => <i key={item.contentCandidateId}>{item.labelAr}</i>)}</div><div><b>الأفلام التعريفية</b>{projection.contentCandidates.filter((item) => item.contentType === 'intro-film').map((item) => <i key={item.contentCandidateId}>{item.labelAr} · قرابة 3 دقائق</i>)}</div><div><b>محطات التجربة</b><i>{stationCandidates.length} محطات · {stationDurationMinutes} دقيقة سردية مرشحة</i><i>{technologyCandidates.length} تقنيات إبداعية مقترحة</i></div></section></aside>
          </div>
        ) : null}

        {selection.reviewMode === 'delivery' ? (
          <div className="experience-delivery-dashboard-shell" data-testid="experience-delivery-dashboard"><Suspense fallback={<div className="experience-review-loading">جارٍ تحميل مركز استلام وربط الأصول…</div>}><ExperienceDeliveryControlCenter projection={deliveryControl} readiness={deliveryReadiness} /></Suspense></div>
        ) : null}
      </section>

      {selection.reviewMode === 'presentation' && presentationStep ? (
        <section ref={presentationRef} tabIndex={-1} role="dialog" aria-modal="true" className="experience-client-presentation" data-testid="experience-client-presentation" aria-label="عرض العميل الإرشادي" aria-describedby="experience-client-presentation-summary" onKeyDown={(event) => {
          if (event.key === 'Escape') onReviewModeChange('overview');
          if (event.key === 'ArrowLeft') setPresentationStep(presentationIndex + 1);
          if (event.key === 'ArrowRight') setPresentationStep(presentationIndex - 1);
          if (event.key === 'Tab') {
            const focusable = [...(presentationRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])') ?? [])];
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
          }
        }}>
          <header><div><span>MAYADEEN · EXPERIENCE TWIN</span><strong>{projectLabelAr}</strong></div><div className="experience-presentation-truth"><i />حزمة تجربة مرشحة · الجاهزية لا يمكن تحديدها</div><button type="button" aria-label="إغلاق عرض العميل" onClick={() => onReviewModeChange('overview')}><X /></button></header>
          <div className="experience-presentation-body">
            <aside><span>عرض إرشادي</span><strong>{String(presentationStep.order).padStart(2, '0')}</strong><small>من {projection.clientPresentationSteps.length}</small><div className="experience-presentation-progress"><i style={{ width: `${(presentationStep.order / projection.clientPresentationSteps.length) * 100}%` }} /></div><p>لا تظهر المعرّفات أو البصمات أو التفاصيل المقيدة في هذا العرض.</p></aside>
            <div className={`experience-presentation-visual is-${presentationVisualKind}`} data-testid="experience-presentation-visual" data-visual-kind={presentationVisualKind}>
              {heroPreviewAvailable && heroPreviewUri ? <img src={heroPreviewUri} alt="مرجع مكاني مسطح مرشح داخل العرض التنفيذي" /> : <div className="experience-presentation-visual-missing"><Camera /><span>المرجع البصري المحلي غير متاح</span></div>}
              <div className="experience-presentation-visual-shade" />
              <span className="experience-presentation-visual-truth">مرجع 2D محسن · ليس 3D أو 360°</span>
              {presentationVisualKind === 'days' ? <div className="experience-presentation-day-composition">{projection.days.map((day) => <i key={day.dayId} className={activeDay?.dayId === day.dayId ? 'is-active' : ''}><b>{day.order}</b><span>{day.labelAr.split('·').at(-1)?.trim()}</span></i>)}</div> : null}
              {presentationVisualKind === 'journey' && activeDay?.visitorJourneyStatus !== 'not-applicable' ? <div className="experience-presentation-journey-composition"><span>الوصول</span><i /><span>{activeContext.destinationLabelAr}</span><i className="is-current" /><span>اللحظة الرئيسية</span><i className="is-soft" /><span>المغادرة</span></div> : null}
              {presentationVisualKind === 'journey' && activeDay?.visitorJourneyStatus === 'not-applicable' ? <div className="experience-presentation-separated-contexts" data-testid="client-day2-no-shared-route"><article><b>قصر العوجا</b><span>سياق مراسم مصدرّي</span></article><strong>سياقان منفصلان · لا رحلة زائر</strong><article><b>حدائق الملك عبدالله</b><span>سياق تفعيل ومحتوى مصدرّي</span></article></div> : null}
              {presentationVisualKind === 'scenes' ? <div className="experience-presentation-scene-composition"><article><Camera /><b>مرجع مسطح</b><span>متاح للمراجعة</span></article><article><CircleOff /><b>360°</b><span>غير متوفر</span></article><article><Boxes /><b>Web3D</b><span>{designSceneAvailable ? 'مشتق تصميمي متحقق' : 'قيد التسليم'}</span></article></div> : null}
              {presentationVisualKind === 'command' ? <div className="experience-presentation-command-composition"><strong>التجربة</strong><i /><span>العمليات</span><i /><span>الدليل</span><i /><span>القرار</span><b>الجاهزية لا يمكن تحديدها</b></div> : null}
              {presentationVisualKind === 'roadmap' ? <div className="experience-presentation-roadmap"><article><b>A</b><span>تجربة الإنتاج المرئية</span></article><article><b>B</b><span>ربط التشغيل بعد التحقق</span></article><article><b>C</b><span>ربط 360 و3D بعد التسليم</span></article></div> : null}
              {presentationVisualKind === 'spatial' ? <div className="experience-presentation-spatial-title"><span>31 أكتوبر – 3 نوفمبر 2026</span><strong>أربعة أيام · عالم فعالية واحد</strong><small>{activeContext.personaLabelAr} · {activeContext.destinationLabelAr}</small></div> : null}
            </div>
            <main>
              <div className="experience-presentation-kicker">{activeDay?.labelAr ?? 'رؤية الأيام الأربعة'}</div>
              <h1>{presentationStep.titleAr}</h1>
              <p id="experience-client-presentation-summary">{presentationStep.summaryAr}</p>
              <div className="experience-presentation-facts">
                <article><span>حقيقة المصدر</span><strong>مصادر عمل مرشحة · بصمات متحققة</strong></article>
                <article><span>الهندسة والمسارات</span><strong>غير متحققة وغير معتمدة</strong></article>
                <article><span>الجاهزية التشغيلية</span><strong>لا يمكن تحديدها</strong></article>
              </div>
            </main>
          </div>
          <footer>
            <div className="experience-presentation-steps" aria-label="خطوات العرض">{projection.clientPresentationSteps.map((step, index) => <button key={step.presentationStepId} type="button" aria-current={index === presentationIndex ? 'step' : undefined} aria-label={`الخطوة ${index + 1}: ${step.titleAr}`} onClick={() => setPresentationStep(index)}>{index + 1}</button>)}</div>
            <div className="experience-presentation-controls"><button type="button" onClick={() => setPresentationStep(presentationIndex - 1)} disabled={presentationIndex === 0}><ChevronRight />السابق</button><button type="button" className="is-play" onClick={() => onPresentationPauseChange(!selection.presentationPaused)}>{selection.presentationPaused ? <Play /> : <Pause />}{selection.presentationPaused ? 'تشغيل الإرشاد' : 'إيقاف مؤقت'}</button><button type="button" onClick={() => setPresentationStep(presentationIndex + 1)} disabled={presentationIndex === projection.clientPresentationSteps.length - 1}>التالي<ChevronLeft /></button></div>
          </footer>
        </section>
      ) : null}
    </>
  );
}
