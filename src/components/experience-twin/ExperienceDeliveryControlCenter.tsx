import {
  AlertTriangle,
  ArchiveRestore,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  CircleOff,
  Database,
  FileDiff,
  FileLock2,
  FolderClock,
  GitCompareArrows,
  Image,
  Layers3,
  MapPinned,
  PackageCheck,
  RefreshCcw,
  Route,
  ShieldCheck,
  TestTube2,
  UserRound
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  fictionalCurrentOperationalFacts,
  fictionalDeliveryScope,
  fictionalIncomingOperationalFacts
} from '../../data/experienceDeliveryAcceleratorFixtures';
import { ExperienceDeliveryCandidateLedger, reconcileOperationalDelivery } from '../../services/experienceDeliveryAccelerator';
import type {
  DeliveryCandidateRevision,
  DeliveryDryRunScenario,
  ExperienceDeliveryControlCenterProjection,
  ExperienceDeliveryReadinessProjection
} from '../../types/experienceDelivery';
import type { OperationalJourneyCandidatePlan } from '../../types/operationalJourneyCandidate';

type DeliveryControlView = 'overview' | 'routes' | 'operational' | 'studio' | 'mapping' | 'variants' | 'revisions' | 'deployment';

const views: ReadonlyArray<{ id: DeliveryControlView; labelAr: string; icon: typeof Database }> = [
  { id: 'overview', labelAr: 'نظرة الاستلام', icon: PackageCheck },
  { id: 'routes', labelAr: 'رحلات V.11', icon: Route },
  { id: 'operational', labelAr: 'المصالحة التشغيلية', icon: FileDiff },
  { id: 'studio', labelAr: 'فحص 3D و360', icon: Boxes },
  { id: 'mapping', labelAr: 'مصفوفة الربط', icon: Layers3 },
  { id: 'variants', labelAr: 'متغيرات الأيام', icon: Image },
  { id: 'revisions', labelAr: 'المراجعات والرجوع', icon: ArchiveRestore },
  { id: 'deployment', labelAr: 'جاهزية النشر', icon: ShieldCheck }
];

const clientReviewProfile = import.meta.env.VITE_EX1F_CLIENT_REVIEW === 'true';
const clientReviewViews = views.filter(({ id }) => !['routes', 'operational', 'studio', 'revisions'].includes(id));
const noDryRunScenarios: readonly DeliveryDryRunScenario[] = [];
const noJourneyCandidates: readonly OperationalJourneyCandidatePlan[] = [];

const statusLabelAr: Record<string, string> = {
  missing: 'لم تُستلم',
  discovered: 'مكتشفة',
  'inventory-created': 'تم الجرد',
  invalid: 'غير صالحة',
  incomplete: 'ناقصة',
  quarantined: 'محجورة',
  duplicate: 'مطابقة مكررة',
  conflict: 'متعارضة',
  'structurally-valid': 'صالحة بنيويًا',
  'awaiting-authority': 'بانتظار السلطة',
  'awaiting-founder-review': 'بانتظار مراجعة المؤسس',
  'accepted-as-candidate': 'مقبولة كمرشح',
  'optimization-required': 'تحتاج تحسينًا',
  'ready-for-binding': 'جاهزة للربط المرشح',
  bound: 'مرتبطة كمرشح',
  rejected: 'مرفوضة',
  'rolled-back': 'تم الرجوع'
};

const actionLabelAr: Record<string, string> = {
  'add-candidate-fact': 'إضافة حقيقة مرشحة',
  'preserve-current-fact': 'حفظ الحقيقة الحالية',
  'create-conflict': 'إنشاء تعارض',
  'mark-superseded-candidate': 'إنشاء مرشح لاحق',
  'request-authority-review': 'طلب مراجعة السلطة',
  'reject-source-fact': 'رفض حقيقة المصدر',
  'require-more-evidence': 'طلب دليل إضافي'
};

const journeyDayOptions = [
  { dayId: 'DAY-KAP-2026-10-31', labelAr: '31 أكتوبر' },
  { dayId: 'DAY-KAP-2026-11-01', labelAr: '1 نوفمبر' },
  { dayId: 'DAY-KAP-2026-11-02', labelAr: '2 نوفمبر' },
  { dayId: 'DAY-KAP-2026-11-03', labelAr: '3 نوفمبر' }
] as const;

const movementLabelAr: Record<string, string> = {
  car: 'سيارة',
  walking: 'مشياً',
  'golf-cart': 'عربات جولف',
  unknown: 'غير مثبتة'
};

function reportedDurationLabel(seconds: number): string {
  return seconds < 60 ? `${seconds.toLocaleString('ar-SA')} ث` : `${(seconds / 60).toLocaleString('ar-SA')} د`;
}

const destinationLabelAr: Record<string, string> = {
  'ENTITY-KAP-OP-001': 'البوابات',
  'ENTITY-KAP-OP-002': 'الاستقبال',
  'ENTITY-KAP-OP-004': 'المجسم',
  'ENTITY-KAP-OP-005': 'النصب التذكاري',
  'ENTITY-KAP-OP-006': 'ممر العصور',
  'ENTITY-KAP-OP-007': 'العشاء',
  'ENTITY-KAP-OP-008': 'الجلسات والضيافة',
  'ENTITY-KAP-OP-009': 'المؤتمر الصحفي والصورة',
  'ENTITY-KAP-OP-010': 'كبار الشخصيات',
  'ENTITY-KAP-OP-011': 'ركن الذكريات'
};

function requestedView(availableViews: typeof views): DeliveryControlView {
  const value = new URL(window.location.href).searchParams.get('deliveryView');
  return availableViews.some((candidate) => candidate.id === value) ? value as DeliveryControlView : 'overview';
}

function requestedScenario(scenarios: readonly DeliveryDryRunScenario[]): string | null {
  const value = new URL(window.location.href).searchParams.get('deliveryScenario');
  return scenarios.some((candidate) => candidate.scenarioId === value) ? value : null;
}

function requestedJourney(journeys: readonly OperationalJourneyCandidatePlan[]): string | null {
  const value = new URL(window.location.href).searchParams.get('deliveryJourney');
  return journeys.some((candidate) => candidate.journeyId === value) ? value : journeys[0]?.journeyId ?? null;
}

function requestedJourneyDay(journeys: readonly OperationalJourneyCandidatePlan[]): string {
  const value = new URL(window.location.href).searchParams.get('deliveryJourneyDay');
  const allowed = new Set([...journeys.map((journey) => journey.dayId), 'DAY-KAP-2026-11-01']);
  return value && allowed.has(value) ? value : journeys[0]?.dayId ?? 'DAY-KAP-2026-10-31';
}

function writeDeliveryQuery(view: DeliveryControlView, scenarioId: string | null, journeyId: string | null, journeyDayId: string, historyMode: 'push' | 'replace' = 'push'): void {
  const url = new URL(window.location.href);
  url.searchParams.set('deliveryView', view);
  if (scenarioId) url.searchParams.set('deliveryScenario', scenarioId);
  else url.searchParams.delete('deliveryScenario');
  if (view === 'routes' && journeyId) url.searchParams.set('deliveryJourney', journeyId);
  else url.searchParams.delete('deliveryJourney');
  if (view === 'routes') url.searchParams.set('deliveryJourneyDay', journeyDayId);
  else url.searchParams.delete('deliveryJourneyDay');
  window.history[historyMode === 'push' ? 'pushState' : 'replaceState']({}, '', url);
}

interface ExperienceDeliveryControlCenterProps {
  projection: Readonly<ExperienceDeliveryControlCenterProjection>;
  readiness: ExperienceDeliveryReadinessProjection;
}

export default function ExperienceDeliveryControlCenter({ projection, readiness }: ExperienceDeliveryControlCenterProps) {
  const availableViews = clientReviewProfile ? clientReviewViews : views;
  const dryRunScenarios = clientReviewProfile ? noDryRunScenarios : projection.fictionalDryRuns;
  const operationalPackage = projection.operationalJourneyPackage;
  const journeyCandidates = operationalPackage?.journeys ?? noJourneyCandidates;
  const [activeView, setActiveView] = useState<DeliveryControlView>(() => requestedView(availableViews));
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(() => requestedScenario(dryRunScenarios));
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(() => {
    const dayId = requestedJourneyDay(journeyCandidates);
    const journeyId = requestedJourney(journeyCandidates);
    return journeyCandidates.find((journey) => journey.journeyId === journeyId && journey.dayId === dayId)?.journeyId
      ?? journeyCandidates.find((journey) => journey.dayId === dayId)?.journeyId
      ?? null;
  });
  const [activeJourneyDayId, setActiveJourneyDayId] = useState(() => requestedJourneyDay(journeyCandidates));
  const [ledgerMessageAr, setLedgerMessageAr] = useState('لم تُنفذ أي مراجعة خيالية في هذه الجلسة.');
  const [ledgerHistory, setLedgerHistory] = useState<readonly Readonly<DeliveryCandidateRevision<DeliveryDryRunScenario>>[]>([]);
  const [ledger] = useState(() => clientReviewProfile ? null : new ExperienceDeliveryCandidateLedger<DeliveryDryRunScenario>(
    `${fictionalDeliveryScope.projectId}:${fictionalDeliveryScope.eventId}`,
    new Set([fictionalDeliveryScope.destinationId])
  ));

  const reconciliation = clientReviewProfile ? null : reconcileOperationalDelivery({
    sourceFingerprint: 'a'.repeat(64),
    currentProjectionHash: projection.contentHash,
    currentFacts: fictionalCurrentOperationalFacts,
    incomingFacts: fictionalIncomingOperationalFacts
  });
  const activeScenario = dryRunScenarios.find((scenario) => scenario.scenarioId === activeScenarioId) ?? null;
  const activeJourney = journeyCandidates.find((journey) => journey.journeyId === activeJourneyId) ?? null;
  const activeDayJourneys = journeyCandidates.filter((journey) => journey.dayId === activeJourneyDayId);
  const activeJourneyConflicts = operationalPackage?.conflicts.filter((conflict) => conflict.journeyIds.includes(activeJourney?.journeyId ?? '')) ?? [];
  const activeJourneyResolvedConflicts = operationalPackage?.resolvedConflicts.filter((conflict) => conflict.journeyIds.includes(activeJourney?.journeyId ?? '')) ?? [];
  const activeJourneyDayScope = operationalPackage?.dayScopes.find((day) => day.dayId === activeJourneyDayId) ?? null;
  const availableScenarios = dryRunScenarios.filter((scenario) => activeView === 'operational'
    ? scenario.channelId === 'operational'
    : activeView === 'studio' ? scenario.channelId === 'studio-3d' : true);

  useEffect(() => {
    const onPopState = () => {
      setActiveView(requestedView(availableViews));
      setActiveScenarioId(requestedScenario(dryRunScenarios));
      const dayId = requestedJourneyDay(journeyCandidates);
      const journeyId = requestedJourney(journeyCandidates);
      setActiveJourneyId(journeyCandidates.find((journey) => journey.journeyId === journeyId && journey.dayId === dayId)?.journeyId
        ?? journeyCandidates.find((journey) => journey.dayId === dayId)?.journeyId
        ?? null);
      setActiveJourneyDayId(dayId);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [availableViews, dryRunScenarios, journeyCandidates]);

  const selectView = (view: DeliveryControlView) => {
    setActiveView(view);
    const compatibleScenario = dryRunScenarios.find((scenario) => view === 'operational'
      ? scenario.channelId === 'operational'
      : view === 'studio' ? scenario.channelId === 'studio-3d' : scenario.scenarioId === activeScenarioId) ?? null;
    const scenarioId = view === 'operational' || view === 'studio' ? compatibleScenario?.scenarioId ?? null : activeScenarioId;
    setActiveScenarioId(scenarioId);
    writeDeliveryQuery(view, scenarioId, activeJourneyId, activeJourneyDayId);
  };

  const selectScenario = (scenarioId: string) => {
    const scenario = dryRunScenarios.find((candidate) => candidate.scenarioId === scenarioId);
    if (!scenario) return;
    const view: DeliveryControlView = scenario.channelId === 'operational' ? 'operational' : 'studio';
    setActiveView(view);
    setActiveScenarioId(scenarioId);
    writeDeliveryQuery(view, scenarioId, activeJourneyId, activeJourneyDayId);
  };

  const selectJourney = (journeyId: string) => {
    const nextJourney = journeyCandidates.find((candidate) => candidate.journeyId === journeyId);
    if (!nextJourney) return;
    setActiveJourneyId(nextJourney.journeyId);
    setActiveJourneyDayId(nextJourney.dayId);
    setActiveView('routes');
    writeDeliveryQuery('routes', null, nextJourney.journeyId, nextJourney.dayId);
  };

  const selectJourneyDay = (dayId: string) => {
    const nextJourney = journeyCandidates.find((candidate) => candidate.dayId === dayId) ?? null;
    setActiveJourneyDayId(dayId);
    setActiveJourneyId(nextJourney?.journeyId ?? null);
    setActiveView('routes');
    writeDeliveryQuery('routes', null, nextJourney?.journeyId ?? null, dayId);
  };

  const refreshLedger = (messageAr: string) => {
    if (!ledger) return;
    setLedgerHistory([...ledger.history()]);
    setLedgerMessageAr(messageAr);
  };

  const acceptFictionalCandidate = () => {
    if (!ledger || !activeScenario || activeScenario.blocking) return;
    const result = ledger.acceptCandidate({
      sourcePackageHash: projection.contentHash,
      timestamp: new Date().toISOString(),
      actorClassification: 'fictional-test-actor',
      reason: 'إثبات مسار القبول الخيالي المعزول عن KAP.',
      affectedObjectIds: [fictionalDeliveryScope.destinationId],
      diffSummary: [`قبول ${activeScenario.labelAr} كمرشح خيالي محلي.`],
      value: activeScenario
    });
    refreshLedger(result.messageAr);
  };

  const bindFictionalCandidate = () => {
    const current = ledger?.current() ?? null;
    if (!ledger || !activeScenario || !current || activeScenario.blocking) return;
    const result = ledger.bindCandidate({
      sourcePackageHash: projection.contentHash,
      timestamp: new Date().toISOString(),
      actorClassification: 'fictional-test-actor',
      reason: 'إثبات الربط الذري داخل النطاق الخيالي فقط.',
      affectedObjectIds: [fictionalDeliveryScope.destinationId],
      diffSummary: ['ربط خيالي ذري دون لمس إسقاط KAP.'],
      value: activeScenario,
      expectedHeadHash: current.contentHash,
      validate: () => ({ valid: true, failedObjectIds: [] })
    });
    refreshLedger(result.messageAr);
  };

  const rollbackFictionalCandidate = () => {
    const current = ledger?.current() ?? null;
    const first = ledger?.history()[0];
    if (!ledger || !current || !first || current.revisionId === first.revisionId) return;
    const result = ledger.rollback({
      targetRevisionId: first.revisionId,
      expectedHeadHash: current.contentHash,
      timestamp: new Date().toISOString(),
      actorClassification: 'fictional-test-actor',
      reason: 'إثبات الرجوع الإلحاقي دون حذف تاريخ المراجعات.'
    });
    refreshLedger(result.messageAr);
  };

  return (
    <div className="experience-delivery-control" data-testid="experience-delivery-control-center" data-client-review-profile={clientReviewProfile} data-real-operational-received={projection.realPackageCounts.operationalReceived} data-real-studio-received={projection.realPackageCounts.studioReceived}>
      <header className="experience-delivery-control-header">
        <div><span>EX.1F · CONTROLLED INTAKE</span><h2>مركز استلام وربط الأصول</h2><p>قناتان محليتان محكومتان، ولا ملف يغيّر توأم التجربة قبل المعاينة والقبول المرشح والربط الذري.</p></div>
        <div className="experience-delivery-truth"><FileLock2 /><span><b>الحقيقة الحالية</b>{projection.realPackageCounts.operationalReceived} حزمة تشغيل مستلمة · 0 مسارات معتمدة · الجاهزية التشغيلية لا يمكن تحديدها</span></div>
      </header>

      <nav className="experience-delivery-control-nav" aria-label="مساحات مركز استلام الأصول">
        {availableViews.map(({ id, labelAr, icon: Icon }) => <button key={id} type="button" data-testid={`delivery-view-${id}`} aria-pressed={activeView === id} onClick={() => selectView(id)}><Icon />{labelAr}</button>)}
      </nav>

      <main className="experience-delivery-control-body">
        {activeView === 'overview' ? <section className="delivery-overview" data-testid="delivery-overview">
          <div className="delivery-zero-strip">
            <article><span>حزم تشغيل مستلمة</span><strong>{projection.realPackageCounts.operationalReceived}</strong><small>حقيقية</small></article>
            <article><span>بصمة متحققة</span><strong>{projection.realPackageCounts.operationalFingerprintVerified}</strong><small>SHA-256</small></article>
            <article><span>مقبولة من المؤسس</span><strong>{projection.realPackageCounts.operationalFounderApproved}</strong><small>مراجعة معلقة</small></article>
            <article><span>SpatialRoute معتمد</span><strong>{projection.realPackageCounts.canonicalSpatialRoutesCreated}</strong><small>لم يُنشأ</small></article>
          </div>
          <div className="delivery-channel-grid">
            {projection.channels.map((channel) => <article key={channel.channelId} data-testid={`experience-delivery-lane-${channel.channelId}`} data-channel-testid={`delivery-channel-${channel.channelId}`}>
              <header>{channel.channelId === 'operational' ? <Database /> : <Boxes />}<div><span>{statusLabelAr[channel.currentStatus]}</span><strong>{channel.labelAr}</strong></div><em>{channel.receivedPackages} مستلم</em></header>
              <p>{channel.waitingMessageAr}</p><small className="delivery-wave-status">{readiness.lanes.find((lane) => lane.laneId === channel.channelId)?.statusMessageAr}</small>
              <dl><div><dt>المقبول</dt><dd>{channel.acceptedPackages}</dd></div><div><dt>المحجور</dt><dd>{channel.quarantinedFiles}</dd></div><div><dt>التعارضات</dt><dd>{channel.unresolvedConflicts}</dd></div><div><dt>جاهزية الربط</dt><dd>{channel.readyForBinding ? 'جاهز' : 'محجوبة'}</dd></div></dl>
              <footer><FolderClock /><span>{channel.requiredNextActionAr}</span></footer>
            </article>)}
          </div>
          <div className="delivery-legal-flow" aria-label="المسار القانوني الوحيد للاستلام"><span>مصدر محلي خاص</span><ChevronLeft /><span>جرد وبصمة</span><ChevronLeft /><span>تحقق ومعاينة</span><ChevronLeft /><span>مراجعة أحمد</span><ChevronLeft /><span>مرشح</span><ChevronLeft /><span>ربط ذري</span></div>
          <details className="delivery-built-next"><summary>ما تم بناؤه · ما التالي</summary><div><section><b>ما تم بناؤه</b>{readiness.builtCapabilitiesAr.map((item) => <span key={item}>{item}</span>)}</section><section><b>ما التالي</b>{readiness.nextInputsAr.map((item) => <span key={item}>{item}</span>)}</section></div><footer>معاينة → تحقق → قبول مرشح → الربط لم يبدأ</footer></details>
          <aside><ShieldCheck /><span><b>نطاق قبول المؤسس</b>يسمح بالربط المرشح للمراجعة فقط. لا ينشئ اعتماد عميل أو هندسة أو HSE أو افتتاح.</span></aside>
        </section> : null}

        {activeView === 'routes' && operationalPackage ? <section className="delivery-route-review" data-testid="delivery-route-review" data-package-status={operationalPackage.packageStatus}>
          <header className="delivery-route-review-header">
            <div><span>WAVE B · مصدر تشغيلي حقيقي</span><h3>مراجعة رحلات V.11 المرشحة</h3><p>ست رحلات مستلمة ومتحققة البصمة. التسلسلات والتوقيتات مرشحة؛ لا مسار هندسي أو اعتماد تشغيلي أو تعديل للبروفة.</p></div>
            <div className="delivery-route-source-status" data-testid="v11-source-status"><CheckCircle2 /><span><b>بصمة المصدر متطابقة</b><bdi dir="ltr">{operationalPackage.sourceHash.slice(0, 16)}…</bdi><small>{operationalPackage.sourcePageCount} صفحات · {statusLabelAr[operationalPackage.intakeState]}</small></span></div>
          </header>

          <div className="delivery-route-day-rail" aria-label="أيام الرحلات التشغيلية المرشحة">
            {journeyDayOptions.map((day) => {
              const count = journeyCandidates.filter((journey) => journey.dayId === day.dayId).length;
              const scope = operationalPackage.dayScopes.find((candidate) => candidate.dayId === day.dayId);
              return <button key={day.dayId} type="button" data-testid={`v11-day-${day.dayId}`} aria-pressed={activeJourneyDayId === day.dayId} onClick={() => selectJourneyDay(day.dayId)}><span>{day.labelAr}</span><small>{scope?.operationalJourneyStatus === 'not-applicable' ? 'غير منطبق · لا رحلة تشغيلية' : `${count} رحلة مرشحة`}</small></button>;
            })}
          </div>

          {activeDayJourneys.length ? <div className="delivery-route-persona-rail" aria-label="شخصيات الرحلات المرشحة">
            <UserRound />
            {activeDayJourneys.map((journey) => <button key={journey.journeyId} type="button" data-testid={`v11-journey-${journey.journeyId}`} aria-pressed={activeJourney?.journeyId === journey.journeyId} onClick={() => selectJourney(journey.journeyId)}><strong>{journey.personaLabelsAr.join(' · ')}</strong><small>صفحة {journey.sourcePage} · {journey.reportedWindow.start}–{journey.reportedWindow.end}</small></button>)}
          </div> : null}

          {!activeJourney && activeJourneyDayScope?.operationalJourneyStatus === 'not-applicable' ? <article className="delivery-route-day-scope is-not-applicable" data-testid="v11-route-not-applicable-20261101"><CheckCircle2 /><div><span>تصحيح مؤسس متتبع</span><h3>لا تنطبق رحلة تشغيلية في 1 نوفمبر</h3><p>يبقى اليوم ضمن الأيام الأربعة، ويمكن عرض المحتوى الاحتفالي المصدرّي في قصر العوجا والحدائق كسياقين منفصلين.</p><strong>لا مسار زائر · لا خط بين الموقعين · لا مدة سفر · لا بوابة استقبال مخترعة</strong><small>{activeJourneyDayScope.correctionRevisionId}</small></div></article> : null}

          {activeJourney ? <>
            <div className="delivery-route-summary" data-testid="v11-active-journey" data-journey-id={activeJourney.journeyId} data-duration-accounting={activeJourney.durationAccountingMode}>
              <article><span>الإجمالي المرشح الحاكم</span><strong>{activeJourney.durationReconciliation.reportedTotalMinutes}</strong><small>دقيقة · يشمل الرحلة كاملة</small></article>
              <article className={activeJourney.durationReconciliation.blockingConflict ? 'is-conflict' : ''}><span>نافذة الوقت</span><strong>{activeJourney.durationReconciliation.windowDurationMinutes}</strong><small>{activeJourney.reportedWindow.start}–{activeJourney.reportedWindow.end}</small></article>
              <article><span>محطات داخل الإجمالي</span><strong>{activeJourney.durationReconciliation.dwellDurationMinutes}</strong><small>دقيقة وصفية · لا تُضاف</small></article>
              <article><span>حركة داخل الإجمالي</span><strong>{activeJourney.durationReconciliation.travelDurationMinutes}</strong><small>دقيقة وصفية · لا تُضاف</small></article>
              <article className={activeJourney.durationReconciliation.blockingConflict ? 'is-warning' : ''}><span>نمط المحاسبة</span><strong className="is-text">شامل</strong><small>{activeJourney.durationReconciliation.blockingConflict ? 'تعارض نافذة نشط' : 'متسق بتوضيح المؤسس'}</small></article>
            </div>

            <div className="delivery-route-workspace">
              <section className="delivery-route-sequence" aria-label="تسلسل نقاط الرحلة المرشحة">
                <header><div><span>تسلسل مصدر · ليس مسارًا ميدانيًا معتمدًا</span><h3>{activeJourney.labelAr}</h3></div><em>صفحة {activeJourney.sourcePage}</em></header>
                <div className="delivery-route-waypoints">
                  {activeJourney.waypoints.map((waypoint) => {
                    const mappedLabels = [
                      ...waypoint.destinationIds.map((id) => destinationLabelAr[id] ?? id),
                      ...waypoint.touchpointIds.map((id) => operationalPackage.candidateTouchpoints.find((candidate) => candidate.touchpointId === id)?.labelAr ?? id)
                    ];
                    return <article key={waypoint.waypointId} data-testid={`v11-waypoint-${waypoint.sourceLetter}`}>
                      <i>{waypoint.sourceLetter}</i>
                      <div><strong>{waypoint.sourceLabelAr}</strong><span>{mappedLabels.length ? mappedLabels.join(' · ') : waypoint.semanticKind === 'service-action' ? 'إجراء خدمة · بلا مرساة تلقائية' : 'لحظة برنامج · الربط المكاني يحتاج مراجعة'}</span><small>هوية الرحلة محفوظة · صفحة {waypoint.sourcePage}</small></div>
                      <em>{waypoint.dwellMinutes === null ? 'مدة غير مذكورة' : `${waypoint.dwellMinutes} د`}</em>
                    </article>;
                  })}
                </div>
              </section>

              <aside className="delivery-route-inspector" data-testid="v11-route-inspector">
                <section><span>الحركة المبلّغة · ضمن الإجمالي</span>{activeJourney.travelLegs.map((leg) => <article key={leg.travelLegId}><MapPinned /><div><strong>{leg.distanceMeters.toLocaleString('ar-SA')} م</strong><small>{reportedDurationLabel(leg.reportedDurationSeconds)} · {movementLabelAr[leg.movementMode]}</small></div>{leg.movementModeStatus === 'not-explicitly-established' ? <em>الوسيلة غير مثبتة</em> : <em>داخلة في مدة الرحلة</em>}</article>)}</section>
                <section className="delivery-duration-accounting" data-testid="v11-duration-accounting"><span>قاعدة المدة</span><strong>إجمالي شامل · لا جمع مزدوج</strong><p>التوقف والحركة مكوّنان داخل الغلاف المبلّغ، ولا يُفترض تسلسلهما الكامل.</p>{activeJourney.originalSourceReportedTotalMinutes !== activeJourney.reportedTotalMinutes || activeJourneyResolvedConflicts.length ? <details data-testid="v11-duration-history"><summary>التشخيص السابق محفوظ</summary><p>{activeJourney.originalSourceReportedTotalMinutes !== activeJourney.reportedTotalMinutes ? `القراءة السابقة ${activeJourney.originalSourceReportedTotalMinutes} دقيقة؛ الإسقاط الحالي ${activeJourney.reportedTotalMinutes} دقيقة.` : 'فروق جمع المكوّنات السابقة مغلقة وفق المحاسبة الشاملة.'}</p>{activeJourneyResolvedConflicts.map((conflict) => <small key={conflict.conflictId}>{conflict.titleAr} · {conflict.resolutionAr}</small>)}</details> : null}</section>
                <section className="delivery-route-truth"><span>الحقيقة المكانية</span><strong>رسم توضيحي غير مسجل</strong><p>لا CRS · لا EPSG · لا نقاط ضبط · لا مرجع CAD معتمد · لا توقيع سلطة مسار</p></section>
                {activeJourneyConflicts.length ? <section className="delivery-route-conflicts"><span>التعارضات النشطة</span>{activeJourneyConflicts.map((conflict) => <article key={conflict.conflictId} className={conflict.severity === 'blocking' ? 'is-blocking' : ''}><AlertTriangle /><div><strong>{conflict.titleAr}</strong><small>{conflict.detailAr}</small></div></article>)}</section> : <section className="delivery-route-clear"><CheckCircle2 /><span>لا تعارض زمني حاجب في هذه الرحلة؛ الاعتماد المكاني والتشغيلي ما زال مفقودًا.</span></section>}
              </aside>
            </div>
          </> : null}

          <section className="delivery-route-comparison" data-testid="v11-rehearsal-comparison">
            <article><span>الحالي المجمد</span><strong>خطة البروفة R{operationalPackage.rehearsalComparison.frozenPlanRevision}</strong><p>مراجعة تصحيحية جديدة؛ بصمة R2 السابقة محفوظة في سجل التصحيح.</p><em>V.11 لا يكتب فوق أي مراجعة</em></article>
            <article><span>الوارد من المصدر</span><strong>V.11 · ست رحلات</strong><p>توقيتات ومسافات وتوقفات مرشحة؛ المدة محسوبة بنمط شامل متتبع.</p><em>مستلم ومتحقق البصمة</em></article>
            <article><span>المراجعة المقترحة</span><strong>معاينة فقط</strong><p>لا تنشأ مراجعة بروفة لاحقة قبل قرار أحمد وحسم سلطة المسار.</p><em>لا قبول ولا ربط</em></article>
          </section>

          <div className="delivery-route-source-compare" data-testid="v02-v11-coexistence"><GitCompareArrows /><div><span>V.02 مقابل V.11</span><strong>استبدال مقترح لا تلقائي</strong><p>يبقى V.02 دليلًا تاريخيًا مرشحًا، لكن أي مقترح سابق ليوم 1 نوفمبر لا يغير الإسقاط القانوني الحالي: الرحلة التشغيلية غير منطبقة. يغطي V.11 الأيام المنطبقة 31 أكتوبر و2 و3 نوفمبر.</p></div><em>قرار الاستبدال ما زال مطلوبًا</em></div>

          <details className="delivery-route-gaps"><summary>الفجوات التشغيلية المطلوبة · {operationalPackage.gaps.length}</summary><div>{operationalPackage.gaps.map((gap) => <span key={gap.gapId} className={gap.blocking ? 'is-blocking' : ''}>{gap.labelAr}<small>{gap.requiredAuthorityAr}</small></span>)}</div><footer>{operationalPackage.resolvedGaps.length} فجوات مدة مغلقة بتوضيح مؤسس متتبع؛ لا يغيّر ذلك اعتماد المسار.</footer></details>
        </section> : null}

        {activeView === 'operational' ? <section className="delivery-lab" data-testid="delivery-operational-preview">
          <header><div><span>مختبر جاف معزول</span><h3>معاينة المصالحة التشغيلية</h3><p>البيانات التالية خيالية بالكامل ولا تظهر في KAP أو تعدّل إسقاطه.</p></div><TestTube2 /></header>
          <div className="delivery-scenario-rail" aria-label="حالات الاختبار التشغيلي">{availableScenarios.map((scenario) => <button key={scenario.scenarioId} type="button" data-testid={`delivery-scenario-${scenario.scenarioId}`} aria-pressed={activeScenario?.scenarioId === scenario.scenarioId} onClick={() => selectScenario(scenario.scenarioId)}>{scenario.labelAr}<small>{statusLabelAr[scenario.status]}</small></button>)}</div>
          {activeScenario ? <div className={`delivery-scenario-summary ${activeScenario.blocking ? 'is-blocking' : 'is-clear'}`} data-testid="delivery-scenario-summary"><span>{activeScenario.blocking ? <AlertTriangle /> : <CheckCircle2 />}</span><div><b>{activeScenario.labelAr}</b><p>{activeScenario.summaryAr}</p><small>{activeScenario.safeDetailAr}</small></div><em>{activeScenario.issueCount} ملاحظات حجب</em></div> : null}
          <div className="delivery-reconciliation-table" role="table" aria-label="مقارنة الحقيقة الحالية والمصدر الوارد والإجراء المرشح">
            <div role="row" className="is-head"><span role="columnheader">مرجع المصدر</span><span role="columnheader">الحقيقة الحالية</span><span role="columnheader">الحقيقة الواردة</span><span role="columnheader">الإجراء المرشح</span><span role="columnheader">السلطة المطلوبة</span></div>
            {reconciliation?.items.map((item) => <div role="row" key={item.reconciliationItemId}><span role="cell"><bdi dir="ltr">{item.sourceLocator.reference}</bdi></span><span role="cell">{String(item.currentValue)}</span><span role="cell">{String(item.incomingValue)}</span><span role="cell"><b>{activeScenario?.scenarioId === 'operational-conflict' ? 'إنشاء تعارض' : actionLabelAr[item.recommendedAction]}</b></span><span role="cell">{item.authorityRequiredAr}</span></div>)}
          </div>
          <div className="delivery-fictional-actions"><button type="button" data-testid="delivery-accept-fictional" disabled={!activeScenario || activeScenario.blocking} onClick={acceptFictionalCandidate}><PackageCheck />قبول خيالي كمرشح</button><span>لا يرفع عدادات KAP ولا يغيّر الجاهزية.</span></div>
        </section> : null}

        {activeView === 'studio' ? <section className="delivery-lab" data-testid="delivery-studio-preview">
          <header><div><span>مختبر جاف معزول</span><h3>فاحص أصول الاستوديو</h3><p>التعرّف على الامتداد لا يعني القدرة على فتح الأصل أو تحويله.</p></div><TestTube2 /></header>
          <div className="delivery-scenario-rail" aria-label="حالات اختبار الاستوديو">{availableScenarios.map((scenario) => <button key={scenario.scenarioId} type="button" data-testid={`delivery-scenario-${scenario.scenarioId}`} aria-pressed={activeScenario?.scenarioId === scenario.scenarioId} onClick={() => selectScenario(scenario.scenarioId)}>{scenario.labelAr}<small>{statusLabelAr[scenario.status]}</small></button>)}</div>
          {activeScenario ? <div className="delivery-studio-result" data-testid="delivery-studio-result" data-scenario={activeScenario.scenarioId}>
            <div className={`delivery-studio-orbit ${activeScenario.blocking ? 'is-blocking' : ''}`}>{activeScenario.scenarioId.includes('panorama') ? <Image /> : <Boxes />}<i /></div>
            <div><span>{statusLabelAr[activeScenario.status]}</span><h3>{activeScenario.labelAr}</h3><p>{activeScenario.summaryAr}</p><small>{activeScenario.safeDetailAr}</small></div>
            <dl><div><dt>الدخول إلى Scene Gateway</dt><dd>{activeScenario.blocking ? 'محجوب' : 'معاينة مرشحة فقط'}</dd></div><div><dt>حقوق عرض العميل</dt><dd>{activeScenario.scenarioId === 'rights-blocked' ? 'مفقودة' : 'خيالية للاختبار'}</dd></div><div><dt>حالة GPS</dt><dd>{activeScenario.scenarioId === 'panorama-valid' ? 'منزوع' : 'لا يوجد ادعاء'}</dd></div><div><dt>الربط بـKAP</dt><dd>0</dd></div></dl>
          </div> : null}
          <div className="delivery-fictional-actions"><button type="button" data-testid="delivery-accept-fictional" disabled={!activeScenario || activeScenario.blocking} onClick={acceptFictionalCandidate}><PackageCheck />قبول خيالي كمرشح</button><span>الأصول الخيالية معزولة ولا تدخل مشاهد KAP.</span></div>
        </section> : null}

        {activeView === 'mapping' ? <section className="delivery-mapping" data-testid="delivery-destination-mapping">
          <header><div><span>16 هوية ثابتة</span><h3>مصفوفة الوجهات والمشاهد المستقبلية</h3></div><p>كل خانة مفقودة حتى يصل أصل صالح ويُقبل كمرشح. تجربة العرض تظل غير محسومة بلا مرساة بديلة.</p></header>
          <div className="delivery-mapping-grid">{projection.destinationMappings.map((mapping) => <article key={mapping.destinationId} data-testid={`delivery-mapping-${mapping.destinationId}`}><header><span>{mapping.spatialStatus === 'unresolved-no-anchor' ? <CircleOff /> : <Layers3 />}</span><div><strong>{mapping.labelAr}</strong><small><bdi dir="ltr">{mapping.destinationId}</bdi></small></div><em>{mapping.spatialStatus === 'unresolved-no-anchor' ? 'غير محسوم بلا مرساة' : mapping.spatialStatus === 'independent-landmark' ? 'معلم مستقل' : 'مرساة مرشحة'}</em></header><div>{mapping.slots.map((slot) => <i key={slot.slotId} title={slot.notesAr}>{slot.labelAr}<b>{slot.status === 'missing' ? 'مفقود' : slot.status}</b></i>)}</div></article>)}</div>
        </section> : null}

        {activeView === 'variants' ? <section className="delivery-variants" data-testid="delivery-day-variants">
          <header><div><span>قاعدة مشتركة · تفعيل صريح</span><h3>متغيرات الأصول للأيام الأربعة</h3></div><p>لا متغير نشط أو مربوط حاليًا. تُحفظ القاعدة المشتركة ويُقبل كل اختلاف بعد التحقق.</p></header>
          <div>{projection.dayVariants.map((variant, index) => <article key={variant.variantId}><i>{index + 1}</i><span><strong>{new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${variant.date}T12:00:00+03:00`))}</strong><small>المشهد الأساسي: غير مستلم</small></span><dl><div><dt>الأثاث</dt><dd>غير مربوط</dd></div><div><dt>الإضاءة</dt><dd>غير مربوط</dd></div><div><dt>الشاشات</dt><dd>غير مربوط</dd></div><div><dt>بداية الشخصية</dt><dd>غير مربوطة</dd></div></dl><em>بانتظار حزمة متحققة</em></article>)}</div>
        </section> : null}

        {activeView === 'revisions' ? <section className="delivery-revisions" data-testid="delivery-revision-ledger">
          <header><div><span>إثبات خيالي محلي</span><h3>مراجعات مرشحة إلحاقية وعودة آمنة</h3><p>لا توجد مراجعات KAP مقبولة. السجل أدناه يُنشأ في الذاكرة للحزمة الخيالية فقط.</p></div><GitCompareArrows /></header>
          <div className="delivery-revision-actions"><button type="button" data-testid="delivery-bind-fictional" disabled={!ledgerHistory.length || Boolean(activeScenario?.blocking)} onClick={bindFictionalCandidate}><RefreshCcw />ربط خيالي ذري</button><button type="button" data-testid="delivery-rollback-fictional" disabled={ledgerHistory.length < 2} onClick={rollbackFictionalCandidate}><ArchiveRestore />إنشاء مراجعة رجوع</button></div>
          <p className="delivery-ledger-message" role="status">{ledgerMessageAr}</p>
          <div className="delivery-revision-list">{ledgerHistory.length ? ledgerHistory.map((revision) => <article key={revision.revisionId}><i>R{revision.revision}</i><div><strong>{revision.status === 'accepted-as-candidate' ? 'مقبول كمرشح خيالي' : revision.status === 'bound' ? 'مرتبط خياليًا' : 'مراجعة رجوع'}</strong><span>{revision.acceptanceReason}</span><small><bdi dir="ltr">{revision.contentHash.slice(0, 16)}</bdi> · توقيت محلي غير موثوق</small></div></article>) : <div className="delivery-empty-ledger"><ArchiveRestore /><strong>لا مراجعات في جلسة الاختبار</strong><span>اختر حالة خيالية صالحة من المصالحة أو فاحص الاستوديو ثم اقبلها كمرشح.</span></div>}</div>
        </section> : null}

        {activeView === 'deployment' ? <section className="delivery-deployment" data-testid="delivery-deployment-readiness">
          <header><div><span>CLIENT REVIEW · LOCAL PACKAGE</span><h3>حزمة مراجعة عميل قابلة للبناء، لا نشر عام</h3><p>ملف Frontend ثابت مع هوية بناء وبصمات، دون مصادر خاصة أو أسرار أو ادعاء تشغيل حي.</p></div><ShieldCheck /></header>
          <div className="delivery-deployment-grid"><article><CheckCircle2 /><div><strong>SPA وروابط عميقة</strong><span>سياسة fallback موثقة</span></div></article><article><CheckCircle2 /><div><strong>إعداد بيئي بلا أسرار</strong><span>مثال إعداد فقط</span></div></article><article><CheckCircle2 /><div><strong>Manifest وبصمات</strong><span>كل ملف في build</span></div></article><article><CircleOff /><div><strong>النشر الخارجي</strong><span>غير مصرح في هذه الحزمة</span></div></article><article><CircleOff /><div><strong>بوابة IoT</strong><span>محلية / غير متصلة</span></div></article><article><AlertTriangle /><div><strong>الجاهزية التشغيلية</strong><span>لا يمكن تحديدها</span></div></article></div>
          <aside><FileLock2 /><span><b>تصنيف الحزمة</b>جاهزة تقنيًا لمراجعة العميل محليًا فقط. ليست LIVE_OPERATIONAL_PRODUCTION_READY.</span></aside>
        </section> : null}
      </main>

      <footer className="experience-delivery-control-footer"><span><b>حزم تشغيل مستلمة:</b> {projection.realPackageCounts.operationalReceived}</span><span><b>حزم مقبولة:</b> {projection.realPackageCounts.operationalAccepted}</span><span><b>مسارات معتمدة:</b> {projection.realPackageCounts.operationalRoutesApproved}</span><span><b>حالة الجاهزية:</b> لا يمكن تحديدها</span><small>{readiness.lanes.length} قنوات إعداد · Validator {projection.validatorVersion.replace('EXPERIENCE-DELIVERY-VALIDATOR-', '')}</small></footer>
    </div>
  );
}
