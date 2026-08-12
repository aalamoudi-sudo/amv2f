import { useEffect, useMemo, useReducer } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CirclePause,
  CirclePlay,
  FileWarning,
  Maximize2,
  RotateCcw,
  Square,
  X
} from 'lucide-react';
import { experienceIntelligenceCatalog } from '../../data/experienceIntelligencePacks';
import {
  createExperienceSession,
  getExperiencePresentationState,
  getProvisionalPlanDisplayState,
  getOrderedJourneyStops,
  reduceExperienceSession,
  resolveExperiencePack,
  validateExperienceIntelligencePack
} from '../../services/experienceIntelligence';
import { resolveLocalExperienceAsset } from '../../services/localExperienceAssets';
import type {
  ExperienceContentStatus,
  ExperienceGeometryStatus,
  ExperienceIntelligencePack,
  ExperienceMode,
  ExperiencePoint,
  ExperienceSessionAction,
  ExperienceSourceStatus
} from '../../types/experienceIntelligence';
import { EmptyState, ErrorState } from '../shared/StateBlocks';

interface ExperienceIntelligenceWorkspaceProps {
  eventId: string | null;
  onOpenAuthoring: () => void;
}

const modeOptions: Array<{ mode: ExperienceMode; label: string }> = [
  { mode: 'experience-map', label: 'خريطة التجربة' },
  { mode: 'executive-command', label: 'خريطة القيادة التنفيذية' },
  { mode: 'visitor-story', label: 'قصة رحلة الزائر' }
];

const sourceLabels: Record<ExperienceSourceStatus, string> = {
  approved: 'معتمد',
  candidate: 'مرشح',
  provisional: 'مبدئي',
  missing: 'مفقود',
  unlinked: 'غير مربوط',
  unapproved: 'غير معتمد',
  quarantined: 'محجور',
  unknown: 'غير معروف'
};

const geometryLabels: Record<ExperienceGeometryStatus, string> = {
  'mapped-approved': 'مربوط ومعتمد',
  'mapped-provisional': 'ربط مبدئي',
  pending: 'غير مربوط',
  missing: 'مفقود'
};

const contentLabels: Record<ExperienceContentStatus, string> = {
  available: 'متاح',
  partial: 'متاح جزئيًا',
  missing: 'مفقود',
  unknown: 'غير معروف'
};

const experienceStatusLabels: Record<ExperiencePoint['experienceStatus'], string> = {
  'confirmed-logical': 'منطقي مؤكد',
  candidate: 'مرشح',
  blocked: 'محجوب',
  unknown: 'غير معروف'
};

export function ExperienceIntelligenceWorkspace({ eventId, onOpenAuthoring }: ExperienceIntelligenceWorkspaceProps) {
  const pack = resolveExperiencePack(eventId, experienceIntelligenceCatalog.map((entry) => entry.pack));

  if (!pack) {
    return (
      <div data-testid="experience-workspace-invalid" className="flex min-h-0 flex-1 items-center justify-center p-6">
        <ErrorState title="تعذر فتح خريطة التجربة" message="معرف الفعالية غير معروف، أو لم تُحدد حزمة تجربة صريحة." />
      </div>
    );
  }

  return <ExperienceWorkspaceContent key={pack.packId} pack={pack} onOpenAuthoring={onOpenAuthoring} />;
}

function ExperienceWorkspaceContent({ pack, onOpenAuthoring }: { pack: ExperienceIntelligencePack; onOpenAuthoring: () => void }) {
  const validation = useMemo(() => validateExperienceIntelligencePack(pack), [pack]);
  const presentation = useMemo(() => getExperiencePresentationState(pack), [pack]);
  const storageKey = `mayadeen-experience-mode:${pack.eventId}`;
  const initialMode = useMemo<ExperienceMode>(() => {
    try {
      const stored = window.sessionStorage.getItem(storageKey);
      return stored === 'executive-command' || stored === 'visitor-story' ? stored : 'experience-map';
    } catch {
      return 'experience-map';
    }
  }, [storageKey]);
  const [session, dispatchBase] = useReducer(
    (state: ReturnType<typeof createExperienceSession>, action: ExperienceSessionAction) => reduceExperienceSession(state, action, pack),
    pack,
    (currentPack) => createExperienceSession(currentPack, initialMode)
  );
  const stops = useMemo(() => getOrderedJourneyStops(pack), [pack]);
  const currentStop = stops[session.currentStopIndex] ?? stops[0];
  const selectedPoint = pack.experiencePoints.find((point) => point.experiencePointId === session.selectedExperiencePointId) ?? pack.experiencePoints[0];
  const selectedBeat = currentStop ? pack.storyBeats.find((beat) => beat.storyBeatId === currentStop.storyBeatId) : null;

  const dispatch = (action: ExperienceSessionAction) => dispatchBase(action);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(storageKey, session.mode);
    } catch {
      // Safe fallback: keep rendering the selected pack even when storage is blocked.
    }
  }, [session.mode, storageKey]);

  useEffect(() => {
    if (session.playbackStatus !== 'playing') return;
    const timer = window.setTimeout(() => dispatch({ type: 'next' }), 2400);
    return () => window.clearTimeout(timer);
  }, [session.currentStopIndex, session.playbackStatus]);

  useEffect(() => {
    if (!session.projectionPreviewOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatch({ type: 'close-projection' });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [session.projectionPreviewOpen]);

  if (!validation.valid || !selectedPoint || !currentStop) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <ErrorState title="حزمة التجربة غير صالحة" message={validation.issues[0]?.messageAr ?? 'لا يمكن عرض الحزمة الحالية.'} />
      </div>
    );
  }

  return (
    <section data-testid="experience-workspace" data-event-id={pack.eventId} data-mode={session.mode} className="flex min-h-0 flex-1 flex-col overflow-hidden bg-command-bg">
      <header className="shrink-0 border-b border-command-line bg-command-panel px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <StatusBadge label={presentation.packageLabelAr} tone="accent" />
              <StatusBadge label={presentation.dataLabelAr} tone="blue" />
              <StatusBadge label="لا تفعيل لخط الأساس" tone="amber" />
            </div>
            <h2 data-testid="experience-event-name" className="mt-2 text-2xl font-bold text-command-text">{pack.eventNameAr}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-command-muted">
              <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-command-accent" aria-hidden="true" /><bdi dir="ltr" data-testid="experience-event-date" className="font-semibold text-command-text">{pack.eventDate}</bdi></span>
              <span>الحالة: <strong className="text-command-amber">{presentation.authoringStatusAr}</strong></span>
              <bdi dir="ltr" className="font-mono text-xs">{pack.eventId}</bdi>
              <bdi dir="ltr" className="font-mono text-xs">{pack.venueId}</bdi>
            </div>
            {pack.dateAssumption && pack.dateAssumptionMessageAr ? <p data-testid="date-assumption-badge" className="mt-2 inline-flex rounded-sm border border-command-amber/40 bg-command-amber/10 px-2 py-1 text-xs text-command-amber">{pack.dateAssumptionMessageAr}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <button data-testid="experience-review-package" type="button" onClick={onOpenAuthoring} className="command-button"><FileWarning className="ml-2 h-4 w-4" aria-hidden="true" />مراجعة الحزمة</button>
          <button data-testid="experience-projection-open" type="button" onClick={() => dispatch({ type: 'open-projection' })} className="command-button"><Maximize2 className="ml-2 h-4 w-4" aria-hidden="true" />معاينة قصة العرض</button>
        </div>
      </div>
        <nav aria-label="أوضاع تجربة الفعالية" className="mt-3 flex flex-wrap gap-1 border-t border-command-line pt-3">
          {modeOptions.map((option) => (
            <button
              key={option.mode}
              data-testid={`experience-mode-${option.mode}`}
              type="button"
              onClick={() => dispatch({ type: 'set-mode', mode: option.mode })}
              className={`command-button min-w-44 ${session.mode === option.mode ? 'command-button-primary' : ''}`}
              aria-pressed={session.mode === option.mode}
            >
              {option.label}
            </button>
          ))}
        </nav>
      </header>

      {session.mode === 'experience-map' ? (
        <ExperienceMapMode pack={pack} selectedPoint={selectedPoint} onSelect={(experiencePointId) => dispatch({ type: 'select-point', experiencePointId })} />
      ) : session.mode === 'executive-command' ? (
        <ExecutiveCommandMode pack={pack} selectedPoint={selectedPoint} onSelect={(experiencePointId) => dispatch({ type: 'select-point', experiencePointId })} />
      ) : (
        <VisitorStoryMode
          pack={pack}
          selectedPoint={selectedPoint}
          currentStopIndex={session.currentStopIndex}
          playbackStatus={session.playbackStatus}
          selectedBeat={selectedBeat ?? null}
          dispatch={dispatch}
        />
      )}

      {session.projectionPreviewOpen ? (
        <ProjectionStoryPreview pack={pack} currentStopIndex={session.currentStopIndex} selectedPoint={selectedPoint} onClose={() => dispatch({ type: 'close-projection' })} />
      ) : null}
    </section>
  );
}

function ExperienceMapMode({ pack, selectedPoint, onSelect }: { pack: ExperienceIntelligencePack; selectedPoint: ExperiencePoint; onSelect: (id: string) => void }) {
  const geometryMessage = selectedPoint.geometryMappingStatus === 'mapped-approved'
    ? 'الموقع مربوط بهندسة معتمدة ضمن هذه الحزمة.'
    : selectedPoint.geometryMappingStatus === 'mapped-provisional'
      ? 'الموقع مربوط مبدئيًا، ولا يُعامل كمرجع هندسي معتمد.'
      : 'الموقع غير مثبت على المخطط. يبقى المخطط سياقًا بصريًا فقط ولا توجد دبوس أو مضلع أو كاميرا مستنتجة.';
  return (
    <div data-testid="experience-map-mode" className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 command-scrollbar xl:grid-cols-[minmax(0,1fr)_360px] xl:overflow-hidden">
      <div className="flex min-h-[600px] min-w-0 flex-col gap-3 xl:min-h-0">
        <ProvisionalPlan pack={pack} />
        <JourneyRail pack={pack} selectedPointId={selectedPoint.experiencePointId} onSelect={onSelect} />
      </div>
      <aside className="min-h-0 overflow-y-auto border border-command-line bg-command-panel p-4 command-scrollbar">
        <p className="text-xs font-semibold text-command-accent">نقطة التجربة المحددة</p>
        <h3 className="mt-2 text-xl font-bold text-command-text">{selectedPoint.nameAr}</h3>
        <p dir="ltr" className="mt-1 text-left text-sm text-command-muted">{selectedPoint.nameEn}</p>
        <bdi dir="ltr" className="mt-3 block font-mono text-xs text-command-muted">{selectedPoint.relatedEntityId}</bdi>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <TrustCell label="المصدر" value={sourceLabels[selectedPoint.sourceStatus]} tone="candidate" />
          <TrustCell label="الهندسة" value={geometryLabels[selectedPoint.geometryMappingStatus]} tone="warning" />
          <TrustCell label="المحتوى" value={contentLabels[selectedPoint.contentStatus]} tone={selectedPoint.contentStatus === 'missing' ? 'danger' : 'candidate'} />
          <TrustCell label="الحالة" value={experienceStatusLabels[selectedPoint.experienceStatus]} tone={selectedPoint.experienceStatus === 'confirmed-logical' ? 'success' : selectedPoint.experienceStatus === 'blocked' ? 'danger' : 'candidate'} />
        </div>
        <div data-testid="experience-unmapped-message" className="mt-4 border-r-2 border-command-amber bg-command-amber/10 p-3 text-sm text-command-amber">
          {geometryMessage}
        </div>
        <div className="mt-4 border-t border-command-line pt-4">
          <p className="text-sm font-semibold text-command-text">حالة المصادر المرئية</p>
          <p className="mt-2 text-sm leading-6 text-command-muted">مصدر الاسم والكيان: {sourceLabels[selectedPoint.sourceStatus]}. حالة الهندسة: {geometryLabels[selectedPoint.geometryMappingStatus]}. حالة المصدر الثلاثي الأبعاد: {selectedPoint.contentReferenceIds.length > 0 ? 'مرشح ولم يُحوّل أو يُتحقق' : 'مفقود أو غير معروف'}.</p>
        </div>
      </aside>
    </div>
  );
}

function ExecutiveCommandMode({ pack, selectedPoint, onSelect }: { pack: ExperienceIntelligencePack; selectedPoint: ExperiencePoint; onSelect: (id: string) => void }) {
  const snapshot = pack.governanceSnapshot;
  const presentation = getExperiencePresentationState(pack);
  const evidenceValue = snapshot.quarantinedEvidenceCount === 0
    ? 'لا توجد سجلات أدلة محجورة في هذه الحزمة.'
    : `${new Intl.NumberFormat('ar-SA').format(snapshot.quarantinedEvidenceCount)} سجل أدلة محجور يحتاج معالجة.`;
  const authorityValue = snapshot.unresolvedAuthorityCount === 0
    ? 'لا توجد سلطات غير محسومة مسجلة في هذه الحزمة.'
    : `${new Intl.NumberFormat('ar-SA').format(snapshot.unresolvedAuthorityCount)} سلطات غير محسومة وفق بيانات الحزمة.`;
  const actorValue = snapshot.unresolvedProductionActorCount === 0
    ? 'لا توجد معرفات إنتاجية غير محسومة مسجلة.'
    : `${new Intl.NumberFormat('ar-SA').format(snapshot.unresolvedProductionActorCount)} معرفات إنتاجية غير محسومة.`;
  return (
    <div data-testid="executive-command-mode" className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 command-scrollbar xl:grid-cols-[minmax(0,1fr)_380px] xl:overflow-hidden">
      <div className="flex min-h-[620px] min-w-0 flex-col gap-3 xl:min-h-0">
        <div className="grid grid-cols-2 gap-2 2xl:grid-cols-5">
          <Metric label="كيانات منطقية مؤكدة" value={snapshot.confirmedLogicalEntityCount} tone="success" />
          <Metric label="كيانات غير مربوطة" value={snapshot.unmappedEntityCount} tone="warning" />
          <Metric label="بوابات تجميد متوقفة" value={snapshot.blockedFreezeGateCount} tone="danger" />
          <Metric label="دليل محجور" value={snapshot.quarantinedEvidenceCount} tone="danger" />
          <Metric label="سلطات غير محسومة" value={snapshot.unresolvedAuthorityCount} tone="warning" />
        </div>
        <div className="min-h-0 flex-1"><ProvisionalPlan pack={pack} compact /></div>
        <JourneyRail pack={pack} selectedPointId={selectedPoint.experiencePointId} onSelect={onSelect} compact />
      </div>
      <aside className="min-h-0 space-y-3 overflow-y-auto command-scrollbar">
        <section className="border border-command-line bg-command-panel p-4">
          <p className="text-xs font-semibold text-command-accent">ما يحتاج إجراءً قبل التجميد</p>
          <h3 className="mt-1 text-lg font-bold text-command-text">حواجز الحقيقة التشغيلية</h3>
          <div data-testid="freeze-blockers" className="mt-3 space-y-2">
            {snapshot.missingInputsAr.map((item) => <div key={item} className="flex items-start gap-2 border-r-2 border-command-red bg-command-red/10 p-2.5 text-sm text-command-text"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-command-red" aria-hidden="true" />{item}</div>)}
            {snapshot.missingInputsAr.length === 0 ? <p className="text-sm text-command-muted">لا توجد مدخلات مفقودة مسجلة في هذه الحزمة.</p> : null}
          </div>
        </section>
        <section data-testid="source-trust-overlay" className="border border-command-line bg-command-panel p-4">
          <p className="text-xs font-semibold text-command-blue">المصدر والثقة</p>
          <div className="mt-3 space-y-3 text-sm">
            <CommandRow label="المخطط" value={snapshot.cadStatusAr} status={presentation.planStatusAr} />
            <CommandRow label="الأدلة" value={evidenceValue} status={snapshot.quarantinedEvidenceCount > 0 ? 'محجور' : 'لا يوجد'} />
            <CommandRow label="السلطة" value={authorityValue} status={snapshot.unresolvedAuthorityCount > 0 ? 'غير محسوم' : 'لا يوجد'} />
            <CommandRow label="الممثلون" value={actorValue} status={snapshot.unresolvedProductionActorCount > 0 ? 'غير محسوم' : 'لا يوجد'} />
            <CommandRow label="المصادر الثلاثية" value={snapshot.candidate3dStatusAr} status={presentation.threeDimensionalStatusAr} />
          </div>
        </section>
        <section className="border border-command-line bg-command-panel p-4">
          <p className="text-sm font-semibold text-command-text">العنصر المحدد</p>
          <p className="mt-2 font-bold text-command-text">{selectedPoint.nameAr}</p>
          <bdi dir="ltr" className="mt-1 block font-mono text-xs text-command-muted">{selectedPoint.relatedEntityId}</bdi>
          <p className="mt-2 text-sm text-command-amber">لا توجد جاهزية أو كثافة أو مخاطرة رقمية معروضة لهذه الحزمة.</p>
        </section>
      </aside>
    </div>
  );
}

function VisitorStoryMode({ pack, selectedPoint, currentStopIndex, playbackStatus, selectedBeat, dispatch }: {
  pack: ExperienceIntelligencePack;
  selectedPoint: ExperiencePoint;
  currentStopIndex: number;
  playbackStatus: string;
  selectedBeat: ExperienceIntelligencePack['storyBeats'][number] | null;
  dispatch: (action: ExperienceSessionAction) => void;
}) {
  const stops = getOrderedJourneyStops(pack);
  const journey = pack.visitorJourneys[0];
  const currentStop = stops[currentStopIndex];
  const routeLabel = journey?.routeAuthorityStatus === 'approved' ? 'معتمد' : journey?.routeAuthorityStatus === 'unapproved' ? 'غير معتمد' : 'غير معروف';
  const journeyGeometryLabel = journey ? geometryLabels[journey.geometryStatus] : 'غير معروف';
  const durationLabel = currentStop?.duration === null || currentStop?.duration === undefined ? 'غير معروفة' : `${currentStop.duration} ثانية`;
  return (
    <div data-testid="visitor-story-mode" className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 command-scrollbar xl:grid-cols-[280px_minmax(0,1fr)_340px] xl:overflow-hidden">
      <aside className="min-h-0 overflow-y-auto border border-command-line bg-command-panel p-3 command-scrollbar">
        <p className="text-xs font-semibold text-command-accent">محطات الرحلة</p>
        <div className="mt-3 space-y-2">
          {stops.map((stop, index) => (
            <button key={stop.stopId} type="button" onClick={() => dispatch({ type: 'select-point', experiencePointId: stop.experiencePointId })} className={`w-full border p-3 text-right transition ${index === currentStopIndex ? 'border-command-accent bg-command-accent/10' : 'border-command-line bg-command-panelStrong hover:border-command-accent'}`}>
              <span className="text-xs text-command-muted">المحطة {index + 1}</span>
              <strong className="mt-1 block text-sm text-command-text">{stop.titleAr}</strong>
            </button>
          ))}
        </div>
      </aside>
      <section className="relative flex min-h-[520px] min-w-0 flex-col justify-between overflow-hidden border border-command-line bg-command-panelStrong p-6 xl:min-h-0">
        <div className="absolute inset-x-0 top-0 h-1 bg-command-line"><div className="h-full bg-command-accent transition-all" style={{ width: `${((currentStopIndex + 1) / stops.length) * 100}%` }} /></div>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusBadge label="قصة مرشحة" tone="accent" />
            <bdi dir="ltr" className="text-sm text-command-muted">{currentStopIndex + 1} / {stops.length}</bdi>
          </div>
          <p className="mt-12 text-sm font-semibold text-command-accent">المحطة الحالية</p>
          <h3 data-testid="story-current-stop" className="mt-3 text-4xl font-bold leading-tight text-command-text">{selectedPoint.nameAr}</h3>
          <p dir="ltr" className="mt-3 text-left text-lg text-command-muted">{selectedPoint.nameEn}</p>
          <bdi dir="ltr" className="mt-5 block font-mono text-sm text-command-muted">{selectedPoint.relatedEntityId}</bdi>
          <div className="mt-8 border-r-2 border-command-amber bg-command-amber/10 p-4">
            <p className="font-semibold text-command-amber">لا يوجد محتوى سردي معتمد لهذه المحطة</p>
            <p className="mt-1 text-sm leading-6 text-command-muted">يعرض النظام الاسم الموثق وحالة المصدر فقط، ولا ينشئ وصفًا أو رسالة تشغيلية من دون مصدر.</p>
          </div>
        </div>
        <StoryControls playbackStatus={playbackStatus} dispatch={dispatch} />
      </section>
      <aside className="min-h-0 overflow-y-auto border border-command-line bg-command-panel p-4 command-scrollbar">
        <p className="text-xs font-semibold text-command-blue">حالة القصة والرحلة</p>
        <h3 className="mt-2 text-lg font-bold text-command-text">رحلة مرشحة — {journeyGeometryLabel}</h3>
        <div className="mt-4 space-y-3">
          <TrustCell label="المصدر" value={sourceLabels[selectedBeat?.sourceStatus ?? 'unknown']} tone="candidate" />
          <TrustCell label="الهندسة" value={geometryLabels[selectedPoint.geometryMappingStatus]} tone="warning" />
          <TrustCell label="المحتوى السردي" value={selectedBeat?.descriptionAr ? 'متاح' : 'مفقود'} tone="danger" />
          <TrustCell label="المسار" value={routeLabel} tone={routeLabel === 'معتمد' ? 'success' : 'danger'} />
          <TrustCell label="المدة" value={durationLabel} tone="warning" />
        </div>
        <div className="mt-4 border-t border-command-line pt-4 text-sm leading-6 text-command-muted">
          الانتقال بين المحطات تنظيمي للعرض فقط. لا يُرسم خط جغرافي، ولا تتغير حالة baseline أو scenario.
        </div>
        <details data-testid="story-source-details" className="mt-4 border border-command-line bg-command-panelStrong p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-command-text">مراجع مصدر المحطة</summary>
          <div className="mt-3 space-y-2 text-command-muted">
            {selectedPoint.sourceRefs.map((sourceRef) => <bdi key={sourceRef} dir="ltr" className="block font-mono text-xs">{sourceRef}</bdi>)}
            <p>هذه المراجع تثبت اسم النقطة ونطاق المرشح فقط، ولا تثبت الموقع أو المسار أو المحتوى السردي.</p>
          </div>
        </details>
      </aside>
    </div>
  );
}

function ProvisionalPlan({ pack, compact = false }: { pack: ExperienceIntelligencePack; compact?: boolean }) {
  const plan = pack.provisionalPlan;
  const planAssetUrl = resolveLocalExperienceAsset(plan?.localUri ?? null);
  const displayState = getProvisionalPlanDisplayState(pack, !planAssetUrl);
  return (
    <figure data-testid="provisional-plan" className={`command-spatial-plan relative min-h-0 flex-1 overflow-hidden border border-command-line ${compact ? 'min-h-[360px]' : 'min-h-[420px]'}`}>
      {planAssetUrl ? (
        <img data-testid="provisional-plan-image" src={planAssetUrl} alt="معاينة محلية للمخطط المبدئي غير المعتمد" className="h-full w-full object-contain" />
      ) : (
        <div data-testid="provisional-plan-missing" className="flex h-full min-h-[360px] items-center justify-center p-8 text-center">
          <EmptyState title="المعاينة المحلية غير متاحة" message="يبقى المخطط المبدئي خارج المستودع. أضف الأصل المحلي المصرح به إلى المسار المحدد لعرضه، من دون تغيير بيانات الهندسة." />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 border-[10px] border-black/15" />
      <div data-testid="provisional-plan-watermark" className="absolute bottom-3 right-3 border border-command-amber/60 bg-command-canvas/90 px-3 py-2 text-sm font-bold text-command-amber shadow-command">{displayState.statusAr}</div>
      <div className="absolute left-3 top-3 max-w-[300px] border border-command-line bg-command-canvas/90 px-3 py-2 text-xs leading-5 text-command-muted">سياق بصري فقط. لا توجد نقاط أو مضلعات أو مسارات مستنتجة من الصورة.</div>
    </figure>
  );
}

function JourneyRail({ pack, selectedPointId, onSelect, compact = false }: { pack: ExperienceIntelligencePack; selectedPointId: string; onSelect: (id: string) => void; compact?: boolean }) {
  const journey = pack.visitorJourneys[0];
  const journeyTitle = journey?.geometryStatus === 'mapped-approved'
    ? 'رحلة مرشحة — الهندسة مربوطة ومعتمدة'
    : journey?.geometryStatus === 'mapped-provisional'
      ? 'رحلة مرشحة — ربط هندسي مبدئي'
      : 'رحلة مرشحة — المسار المكاني غير معتمد';
  return (
    <section data-testid="journey-rail" className="shrink-0 border border-command-line bg-command-panel p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="text-xs font-semibold text-command-accent">تسلسل تجربة الزائر</p><h3 className="mt-1 text-sm font-bold text-command-text">{journeyTitle}</h3></div>
        <span className="text-xs text-command-muted">تسلسل منطقي غير مكاني</span>
      </div>
      <div className={`mt-3 grid gap-2 ${compact ? 'grid-cols-5' : 'grid-cols-2 md:grid-cols-5'}`}>
        {[...pack.experiencePoints].sort((a, b) => a.sequence - b.sequence).map((point, index) => (
          <button key={point.experiencePointId} data-testid={`experience-point-${point.experiencePointId}`} type="button" onClick={() => onSelect(point.experiencePointId)} className={`min-w-0 border p-2 text-right transition ${selectedPointId === point.experiencePointId ? 'border-command-accent bg-command-accent/10' : 'border-command-line bg-command-panelStrong hover:border-command-accent'}`}>
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs font-bold text-command-accent">{index + 1}</span>
            <strong className="mt-2 block truncate text-xs text-command-text" title={point.nameAr}>{point.nameAr}</strong>
            <span className="mt-1 block text-[11px] text-command-amber">{geometryLabels[point.geometryMappingStatus]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function StoryControls({ playbackStatus, dispatch }: { playbackStatus: string; dispatch: (action: ExperienceSessionAction) => void }) {
  return (
    <div data-testid="story-controls" className="mt-6 flex flex-wrap items-center gap-2 border-t border-command-line pt-4">
      {playbackStatus === 'playing' ? (
        <button data-testid="story-pause" type="button" onClick={() => dispatch({ type: 'pause' })} className="command-button command-button-primary"><CirclePause className="ml-2 h-4 w-4" aria-hidden="true" />إيقاف مؤقت</button>
      ) : playbackStatus === 'paused' ? (
        <button data-testid="story-resume" type="button" onClick={() => dispatch({ type: 'resume' })} className="command-button command-button-primary"><CirclePlay className="ml-2 h-4 w-4" aria-hidden="true" />متابعة</button>
      ) : (
        <button data-testid="story-play" type="button" onClick={() => dispatch({ type: 'play' })} className="command-button command-button-primary"><CirclePlay className="ml-2 h-4 w-4" aria-hidden="true" />تشغيل</button>
      )}
      <button data-testid="story-previous" type="button" onClick={() => dispatch({ type: 'previous' })} className="command-icon-button" title="السابق" aria-label="السابق"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
      <button data-testid="story-next" type="button" onClick={() => dispatch({ type: 'next' })} className="command-icon-button" title="التالي" aria-label="التالي"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
      <button data-testid="story-reset" type="button" onClick={() => dispatch({ type: 'reset' })} className="command-button"><RotateCcw className="ml-2 h-4 w-4" aria-hidden="true" />إعادة</button>
      <button data-testid="story-stop" type="button" onClick={() => dispatch({ type: 'stop' })} className="command-button"><Square className="ml-2 h-4 w-4" aria-hidden="true" />إيقاف</button>
    </div>
  );
}

function ProjectionStoryPreview({ pack, currentStopIndex, selectedPoint, onClose }: { pack: ExperienceIntelligencePack; currentStopIndex: number; selectedPoint: ExperiencePoint; onClose: () => void }) {
  const planAssetUrl = resolveLocalExperienceAsset(pack.provisionalPlan?.localUri ?? null);
  const displayState = getProvisionalPlanDisplayState(pack, !planAssetUrl);
  const routeAuthorityStatus = pack.visitorJourneys[0]?.routeAuthorityStatus;
  const routeAuthorityLabel = routeAuthorityStatus === 'approved'
    ? 'المسار المكاني معتمد'
    : routeAuthorityStatus === 'unapproved'
      ? 'المسار المكاني غير معتمد'
      : 'سلطة المسار المكاني غير معروفة';
  return (
    <div data-testid="experience-projection-preview" className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-command-canvas text-command-text" dir="rtl">
      <button data-testid="experience-projection-close" type="button" onClick={onClose} className="absolute left-5 top-5 z-10 command-icon-button" title="إغلاق المعاينة" aria-label="إغلاق المعاينة"><X className="h-5 w-5" aria-hidden="true" /></button>
      {planAssetUrl ? <img src={planAssetUrl} alt="خلفية المخطط المبدئي" className="absolute inset-0 h-full w-full object-contain opacity-20" /> : (
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 to-transparent text-sm text-command-muted">
          <div className="absolute left-12 top-28 max-w-sm border border-command-line bg-command-canvas/85 p-4 text-right">
            <p className="font-semibold text-command-amber">المعاينة المحلية غير متاحة</p>
            <p className="mt-2 leading-6">يبقى المخطط المبدئي خارج المستودع المحلي. هذه حالة آمنة ولا تغيّر الهندسة أو الهوية.</p>
          </div>
        </div>
      )}
      <div className="relative flex flex-1 flex-col justify-between p-12 2xl:p-16">
        <div>
          <p className="text-lg font-semibold text-command-accent">{pack.eventNameAr}</p>
          <p className="mt-2 text-sm text-command-muted">معاينة قصة مرشحة وليست إسقاطًا نهائيًا أو مخرجًا معايرًا</p>
        </div>
        <div className="max-w-5xl">
          <p className="text-xl text-command-muted">المحطة {currentStopIndex + 1} من {pack.experiencePoints.length}</p>
          <h2 className="mt-4 text-6xl font-bold leading-tight 2xl:text-7xl">{selectedPoint.nameAr}</h2>
          <p dir="ltr" className="mt-5 text-left text-2xl text-command-muted">{selectedPoint.nameEn}</p>
          <p className="mt-8 border-r-2 border-command-amber pr-4 text-xl text-command-amber">الهندسة: {geometryLabels[selectedPoint.geometryMappingStatus]} • {routeAuthorityLabel}</p>
        </div>
        <div>
          <div className="h-2 w-full bg-command-line"><div className="h-full bg-command-accent" style={{ width: `${((currentStopIndex + 1) / pack.experiencePoints.length) * 100}%` }} /></div>
          <div className="mt-4 flex items-center justify-between gap-4 text-sm text-command-muted"><span>{displayState.statusAr}</span><span>المصدر: {sourceLabels[selectedPoint.sourceStatus]} • الهندسة: {geometryLabels[selectedPoint.geometryMappingStatus]} • المحتوى: {contentLabels[selectedPoint.contentStatus]}</span></div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: 'accent' | 'blue' | 'amber' }) {
  const classes = tone === 'accent' ? 'border-command-accent/50 bg-command-accent/10 text-command-accent' : tone === 'blue' ? 'border-command-blue/50 bg-command-blue/10 text-command-blue' : 'border-command-amber/50 bg-command-amber/10 text-command-amber';
  return <span className={`rounded-sm border px-2 py-1 ${classes}`}>{label}</span>;
}

function TrustCell({ label, value, tone }: { label: string; value: string; tone: 'success' | 'candidate' | 'warning' | 'danger' }) {
  const classes = tone === 'success' ? 'border-command-accent/40 text-command-accent' : tone === 'candidate' ? 'border-command-blue/40 text-command-blue' : tone === 'warning' ? 'border-command-amber/40 text-command-amber' : 'border-command-red/40 text-command-red';
  return <div className={`border bg-command-panelStrong p-3 ${classes}`}><span className="block text-[11px] text-command-muted">{label}</span><strong className="mt-1 block text-sm">{value}</strong></div>;
}

function Metric({ label, value, tone }: { label: string; value: number; tone: 'success' | 'warning' | 'danger' }) {
  const color = tone === 'success' ? 'text-command-accent' : tone === 'warning' ? 'text-command-amber' : 'text-command-red';
  return <div className="border border-command-line bg-command-panel p-3"><strong className={`text-2xl ${color}`}>{new Intl.NumberFormat('ar-SA').format(value)}</strong><span className="mt-1 block text-xs text-command-muted">{label}</span></div>;
}

function CommandRow({ label, value, status }: { label: string; value: string; status: string }) {
  return <div className="border-r-2 border-command-line pr-3"><div className="flex items-center justify-between gap-3"><strong className="text-command-text">{label}</strong><span className="text-xs text-command-amber">{status}</span></div><p className="mt-1 leading-6 text-command-muted">{value}</p></div>;
}
