import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Boxes,
  Cable,
  CheckCircle2,
  CircleDot,
  Database,
  Fingerprint,
  GitMerge,
  HardDriveDownload,
  Map,
  MonitorDot,
  Network,
  Play,
  RotateCcw,
  Route,
  ScanLine,
  ShieldAlert,
  Waypoints
} from 'lucide-react';
import { Panel } from '../shared/Panel';
import { EmptyState, ErrorState, LoadingState } from '../shared/StateBlocks';
import {
  createAlternateIntegrationLabConfiguration,
  defaultIntegrationLabConfiguration
} from '../../data/integrationLabConfigurations';
import {
  IntegrationLabEngine,
  type IntegrationLabAction,
  type IntegrationLabSnapshot
} from '../../services/integrationLabEngine';
import type {
  AdapterManifest,
  AssertionState,
  ProjectedEntityState,
  SpatialVisualState
} from '../../types/integration';
import type { OperationalStateContext } from '../../types/spatial';
import { isOperationalPackEnabled, useEventStore } from '../../store/useEventStore';
import { createRuntimeIntegrationLabConfiguration } from '../../services/runtimeIntegrationLabConfiguration';

const numberFormatter = new Intl.NumberFormat('ar-SA');
const dateFormatter = new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const adapterTypeLabels: Record<AdapterManifest['adapterType'], string> = {
  system: 'نظام أعمال',
  sensor: 'جهاز استشعار محاكى',
  'reality-capture': 'التقاط الواقع',
  'human-action': 'فعل بشري محكوم',
  workflow: 'سير عمل',
  'asset-management': 'إدارة أصول',
  'spatial-2d': 'مخرج مكاني ثنائي',
  'spatial-3d': 'مخرج مكاني ثلاثي',
  geospatial: 'مخرج جغرافي',
  reporting: 'تقارير',
  'physical-output': 'مخرج مادي'
};

const assertionLabels: Record<AssertionState, string> = {
  reported: 'مُبلّغ',
  corroborated: 'مؤيّد',
  verified: 'متحقق',
  approved: 'معتمد',
  rejected: 'مرفوض',
  superseded: 'مستبدل'
};

const eventTypeLabels: Record<string, string> = {
  'observation.reported': 'ملاحظة مبلّغة',
  'work.started': 'بدء العمل',
  'work.completed': 'اكتمال العمل',
  'inspection.performed': 'تنفيذ فحص',
  'measurement.recorded': 'تسجيل قياس',
  'evidence.attached': 'إرفاق دليل',
  'exception.raised': 'رفع استثناء',
  'approval.granted': 'منح اعتماد',
  'approval.rejected': 'رفض اعتماد',
  'verification.completed': 'اكتمال التحقق',
  'verification.failed': 'فشل التحقق',
  'state.correction': 'تصحيح حالة',
  'event.error-declared': 'إعلان خطأ في حدث',
  'system.synchronized': 'مزامنة نظام',
  'sensor.observed': 'ملاحظة جهاز محاكى',
  'reality-capture.processed': 'معالجة التقاط الواقع'
};

const dispositionLabels: Record<string, string> = {
  'not-started': 'لم يبدأ',
  'in-progress': 'قيد التنفيذ',
  'completed-unverified': 'مكتمل دون تحقق',
  verified: 'تم التحقق',
  approved: 'معتمد',
  blocked: 'متعطل',
  'threshold-observed': 'رُصد تجاوز حد',
  'inspection-required': 'يتطلب فحصاً',
  'inspection-submitted': 'رُفع الفحص',
  'measurement-reported': 'رُفع القياس',
  'original-event-invalidated': 'أُعلن خطأ في الحدث الأصلي'
};

const evidenceTypeLabels: Record<string, string> = {
  image: 'صورة',
  video: 'فيديو',
  document: 'مستند',
  measurement: 'قياس',
  'sensor-observation': 'ملاحظة جهاز',
  'inspection-result': 'نتيجة فحص',
  signature: 'توقيع',
  'external-record': 'سجل خارجي',
  'spatial-viewpoint': 'منظور مكاني'
};

const contextLabels: Record<OperationalStateContext, string> = {
  'temporary-demo': 'محاكاة مؤقتة',
  baseline: 'أساسي',
  scenario: 'سيناريو'
};

const provenanceRelationLabels: Record<string, string> = {
  wasGeneratedBy: 'الحدث ناتج عن نشاط الموائم',
  used: 'نشاط الموائم استخدم سجل المصدر',
  wasAssociatedWith: 'نشاط الموائم مرتبط بجهة المصدر',
  wasDerivedFrom: 'مشتق من سجل سابق',
  hadPrimarySource: 'الحدث مرتبط بسجل المصدر الأساسي',
  wasRevisionOf: 'مراجعة لسجل سابق',
  hadRole: 'الدور التشغيلي معلن'
};

const visualColor: Record<ProjectedEntityState['colorToken'], string> = {
  neutral: '#64748b',
  reported: '#72a8ff',
  verified: '#47d6b5',
  approved: '#9be7c4',
  blocked: '#ef6f6c'
};

interface SimulationControl {
  action: IntegrationLabAction;
  label: string;
  group: 'capture' | 'integrity' | 'trust';
  testId: string;
}

const simulationControls: SimulationControl[] = [
  { action: 'accepted-action', label: 'تنفيذ محكوم ناجح', group: 'capture', testId: 'simulate-accepted-action' },
  { action: 'valid', label: 'سجل نظام صالح', group: 'capture', testId: 'simulate-valid' },
  { action: 'invalid', label: 'سجل غير صالح', group: 'integrity', testId: 'simulate-invalid' },
  { action: 'duplicate', label: 'إعادة سجل مكرر', group: 'integrity', testId: 'simulate-duplicate' },
  { action: 'unauthorized-action', label: 'فعل غير مصرح', group: 'integrity', testId: 'simulate-unauthorized' },
  { action: 'missing-evidence-action', label: 'فعل بلا دليل', group: 'integrity', testId: 'simulate-missing-evidence' },
  { action: 'rejected-evidence-action', label: 'دليل مرفوض', group: 'integrity', testId: 'simulate-rejected-evidence' },
  { action: 'unrelated-evidence-action', label: 'دليل لعنصر آخر', group: 'integrity', testId: 'simulate-unrelated-evidence' },
  { action: 'dangling-provenance-action', label: 'مصدر غير محلول', group: 'integrity', testId: 'simulate-dangling-provenance' },
  { action: 'negative-offline-action', label: 'تسلسل سالب', group: 'integrity', testId: 'simulate-negative-offline' },
  { action: 'factory-failure-action', label: 'فشل إنشاء ثم إعادة', group: 'integrity', testId: 'simulate-factory-failure' },
  { action: 'idempotent-action-retry', label: 'إعادة آمنة للفعل', group: 'integrity', testId: 'simulate-action-retry' },
  { action: 'idempotency-key-conflict', label: 'تعارض مفتاح التكرار', group: 'integrity', testId: 'simulate-key-conflict' },
  { action: 'composite-provenance-action', label: 'مصدر مركّب مرفوض', group: 'integrity', testId: 'simulate-composite-provenance' },
  { action: 'missing-agent-association-action', label: 'ارتباط جهة مفقود', group: 'integrity', testId: 'simulate-missing-agent-association' },
  { action: 'event-payload-mismatch-action', label: 'بصمة حدث غير مطابقة', group: 'integrity', testId: 'simulate-event-payload-mismatch' },
  { action: 'recreated-gateway-retry', label: 'إعادة عبر بوابة جديدة', group: 'integrity', testId: 'simulate-recreated-gateway-retry' },
  { action: 'recreated-gateway-conflict', label: 'تعارض عبر بوابة جديدة', group: 'integrity', testId: 'simulate-recreated-gateway-conflict' },
  { action: 'cross-context-correction', label: 'تصحيح عابر للسياق', group: 'integrity', testId: 'simulate-cross-context-correction' },
  { action: 'altered-output-check', label: 'اختبار مخرج متغير', group: 'integrity', testId: 'simulate-altered-output' },
  { action: 'offline', label: 'إدخال دون اتصال', group: 'capture', testId: 'simulate-offline' },
  { action: 'replay-offline', label: 'إعادة قائمة الانتظار', group: 'capture', testId: 'replay-offline' },
  { action: 'conflict', label: 'تعارض متأخر', group: 'integrity', testId: 'simulate-conflict' },
  { action: 'reported', label: 'ملاحظة مُبلّغة', group: 'trust', testId: 'simulate-reported' },
  { action: 'corroborated', label: 'ملاحظة مؤيّدة', group: 'trust', testId: 'simulate-corroborated' },
  { action: 'verified', label: 'حدث متحقق', group: 'trust', testId: 'simulate-verified' },
  { action: 'approved', label: 'حدث معتمد', group: 'trust', testId: 'simulate-approved' },
  { action: 'correction', label: 'تصحيح محفوظ', group: 'integrity', testId: 'simulate-correction' },
  { action: 'error-declaration', label: 'إعلان خطأ', group: 'integrity', testId: 'simulate-error-declaration' },
  { action: 'scenario', label: 'حدث سيناريو معزول', group: 'trust', testId: 'simulate-scenario' },
  { action: 'source-clock-drift', label: 'انحراف ساعة المصدر', group: 'integrity', testId: 'simulate-clock-drift' }
];

export function OperationalCaptureLab() {
  const activeRuntime = useEventStore((state) => state.activeRuntime);
  const projectionOutputEnabled = useEventStore((state) => isOperationalPackEnabled(state, 'projection-preview'));
  const [configurationMode, setConfigurationMode] = useState<'default' | 'alternate'>('default');
  const [engine, setEngine] = useState<IntegrationLabEngine | null>(null);
  const [snapshot, setSnapshot] = useState<IntegrationLabSnapshot | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<IntegrationLabAction | null>(null);
  const [selectedAdapterId, setSelectedAdapterId] = useState('');
  const runtimeConfigurationResult = useMemo(
    () => {
      if (!activeRuntime) return { configuration: null, errorMessage: null };
      try {
        return { configuration: createRuntimeIntegrationLabConfiguration(activeRuntime), errorMessage: null };
      } catch {
        return {
          configuration: null,
          errorMessage: 'تعذر بناء تهيئة مختبر التكامل من الحزمة النشطة بأمان؛ لم تتغير الحالة الأساسية.'
        };
      }
    },
    [activeRuntime]
  );
  const runtimeConfiguration = runtimeConfigurationResult.configuration;
  const runtimeConfigurationError = runtimeConfigurationResult.errorMessage;
  const runtimeCaptureUnavailable = Boolean(activeRuntime && !runtimeConfiguration);

  useEffect(() => {
    if (runtimeCaptureUnavailable) return undefined;
    let active = true;
    const configuration = runtimeConfiguration ?? (configurationMode === 'default'
      ? defaultIntegrationLabConfiguration
      : createAlternateIntegrationLabConfiguration());
    void IntegrationLabEngine.create(configuration)
      .then((createdEngine) => {
        if (!active) return;
        const createdSnapshot = createdEngine.snapshot();
        setEngine(createdEngine);
        setSnapshot(createdSnapshot);
        setSelectedAdapterId(createdSnapshot.adapters[0]?.adapterId ?? '');
      })
      .catch(() => {
        if (!active) return;
        setInitializationError('تعذر تهيئة مختبر النزاهة المحلي بأمان؛ لم تتغير الحالة الأساسية.');
      });
    return () => { active = false; };
  }, [configurationMode, runtimeCaptureUnavailable, runtimeConfiguration]);

  if (runtimeConfigurationError) {
    return <div data-testid="integration-workspace-error" className="flex min-h-0 flex-1 items-center justify-center p-6" lang="ar" dir="rtl"><ErrorState title="تعذر تهيئة المختبر" message={runtimeConfigurationError} /></div>;
  }

  if (runtimeCaptureUnavailable) {
    return (
      <div data-testid="integration-capability-unavailable" className="flex min-h-0 flex-1 items-center justify-center p-6" lang="ar" dir="rtl">
        <EmptyState title="مختبر التكامل غير مفعّل" message="حزمة الالتقاط التشغيلي غير مفعلة في تهيئة الفعالية الحالية، لذلك لا يمكن تنفيذ إجراءات المختبر." />
      </div>
    );
  }

  if (initializationError) {
    return <div data-testid="integration-workspace-error" className="flex min-h-0 flex-1 items-center justify-center p-6" lang="ar" dir="rtl"><ErrorState title="تعذر تهيئة المختبر" message={initializationError} /></div>;
  }
  if (!engine || !snapshot) {
    return <div data-testid="integration-workspace-loading" className="flex min-h-0 flex-1 items-center justify-center p-6" lang="ar" dir="rtl"><LoadingState title="جاري تهيئة مختبر النزاهة" message="يتم حساب بصمات الإسقاط وفحص الموائمات محلياً." /></div>;
  }

  const selectedAdapter = snapshot.adapters.find((adapter) => adapter.adapterId === selectedAdapterId) ?? snapshot.adapters[0];
  const selectedEvent = snapshot.events.find((event) => event.eventId === snapshot.selectedEventId) ?? snapshot.events.at(-1);
  const selectedEvidence = selectedEvent
    ? snapshot.evidenceRegistry.filter((evidence) => selectedEvent.evidenceRefs.includes(evidence.evidenceId))
    : [];
  const latestActionResult = snapshot.actionResults.at(-1);
  const requiredProvenanceRelations = ['used', 'wasGeneratedBy', 'wasAssociatedWith', 'hadPrimarySource'];
  const provenanceHasBlockingIssue = latestActionResult?.issues.some(
    (currentIssue) => currentIssue.blocking && currentIssue.code.startsWith('provenance-')
  ) ?? false;
  const provenanceConnected = snapshot.provenance.nodes.length === 4
    && requiredProvenanceRelations.every((relationType) => snapshot.provenance.relations.some(
      (relation) => relation.relationType === relationType
    ))
    && !provenanceHasBlockingIssue;

  const runAction = async (action: IntegrationLabAction) => {
    setRunningAction(action);
    try {
      setSnapshot(await engine.run(action));
    } finally {
      setRunningAction(null);
    }
  };

  const reset = async () => {
    setRunningAction('valid');
    try {
      setSnapshot(await engine.reset());
    } finally {
      setRunningAction(null);
    }
  };

  const setContext = async (context: OperationalStateContext) => {
    setSnapshot(await engine.setProjectionContext(context));
  };

  const groups = {
    capture: simulationControls.filter((control) => control.group === 'capture'),
    integrity: simulationControls.filter((control) => control.group === 'integrity'),
    trust: simulationControls.filter((control) => control.group === 'trust')
  };

  return (
    <div
      data-testid="integration-workspace"
      data-event-id={activeRuntime?.identity.eventInstanceId ?? defaultIntegrationLabConfiguration.eventId}
      data-venue-id={activeRuntime?.identity.venueId ?? defaultIntegrationLabConfiguration.venueId}
      data-package-id={activeRuntime?.identity.packageId ?? 'fallback-stage-3d-reference'}
      className="min-h-0 flex-1 overflow-y-auto command-scrollbar"
      lang="ar"
      dir="rtl"
    >
      <div className="mx-auto w-full max-w-[2560px] space-y-4 p-4">
        <header className="sticky top-0 z-30 border border-command-line bg-command-panel/95 p-4 shadow-command backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Waypoints className="h-5 w-5 text-command-accent" aria-hidden="true" />
                <h2 className="text-xl font-semibold text-command-text">مختبر تدفق الحقيقة التشغيلية</h2>
                <span data-testid="integration-demo-label" className="rounded border border-command-amber/70 bg-command-amber/10 px-2 py-1 text-xs font-semibold text-command-amber">بيانات محاكاة محلية — ليست تغذية تشغيلية حية</span>
              </div>
              <p className="mt-2 max-w-5xl text-sm leading-7 text-command-muted">مساحة تحقق معماري محلية تفصل سجل المصدر عن الحدث المقبول والحالة المتحققة والمخرج المشتق. لا تكتب إلى الجاهزية أو القرارات الأساسية.</p>
              <p data-testid="integration-configuration-id" className="ltr mt-1 text-left text-[10px] text-command-muted">{snapshot.configurationId}</p>
              {activeRuntime ? (
                <p data-testid="integration-active-context" className="mt-2 text-xs text-command-accent">
                  سياق الحزمة النشطة: {activeRuntime.identity.eventNameAr} · <span className="ltr inline-block">{activeRuntime.identity.eventInstanceId}</span> · <span className="ltr inline-block">{activeRuntime.identity.venueId}</span>
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-command-muted">
                سياق الإسقاط
                <select data-testid="integration-context-select" value={snapshot.projectionContext} onChange={(event) => void setContext(event.target.value as OperationalStateContext)} className="command-select min-w-40">
                  <option value="temporary-demo">محاكاة مؤقتة</option>
                  <option value="baseline">أساسي معزول</option>
                  <option value="scenario">سيناريو معزول</option>
                </select>
              </label>
              {activeRuntime ? (
                <span data-testid="integration-runtime-source" className="rounded border border-command-accent/50 bg-command-accent/10 px-3 py-2 text-xs text-command-accent">التهيئة من حزمة الفعالية النشطة</span>
              ) : (
                <select data-testid="integration-configuration-select" value={configurationMode} onChange={(event) => { setInitializationError(null); setEngine(null); setSnapshot(null); setConfigurationMode(event.target.value as 'default' | 'alternate'); }} className="command-select min-w-44" aria-label="تهيئة المختبر">
                  <option value="default">تهيئة المختبر الأساسية</option>
                  <option value="alternate">تهيئة تحقق بديلة</option>
                </select>
              )}
              <button data-testid="integration-reset" type="button" onClick={() => void reset()} className="command-button"><RotateCcw className="h-4 w-4" aria-hidden="true" />إعادة المختبر</button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
            <MetricChip label="سجلات المصدر" value={snapshot.metrics.totalSourceRecords} icon={<Database />} />
            <MetricChip label="أحداث مقبولة" value={snapshot.metrics.acceptedOperationalEvents} icon={<BadgeCheck />} />
            <MetricChip label="مرفوضة" value={snapshot.metrics.rejectedRecords} icon={<ShieldAlert />} tone="red" />
            <MetricChip label="تكرارات محجوبة" value={snapshot.metrics.duplicatesBlocked} icon={<Fingerprint />} tone="amber" />
            <MetricChip label="تعارضات" value={snapshot.metrics.conflictsDetected} icon={<GitMerge />} tone="amber" />
            <MetricChip label="تزامن المخرجات" value={snapshot.metrics.projectionSynchronizationStatus === 'synchronized' ? 'متزامنة' : 'غير متزامنة'} icon={<Network />} tone={snapshot.metrics.projectionSynchronizationStatus === 'synchronized' ? 'accent' : 'red'} />
          </div>
        </header>

        <div className="grid gap-4 2xl:grid-cols-[minmax(330px,0.82fr)_minmax(520px,1.28fr)_minmax(420px,1fr)]">
          <div className="space-y-4">
            <Panel title="سجل الموائمات" eyebrow="واجهات محايدة المورد" className="h-fit">
              <div data-testid="integration-adapter-registry" className="space-y-2">
                {snapshot.adapters.map((adapter) => (
                  <button key={adapter.adapterId} data-testid={`adapter-${adapter.adapterId}`} type="button" onClick={() => setSelectedAdapterId(adapter.adapterId)} className={`flex w-full items-center justify-between gap-3 rounded border px-3 py-2 text-right text-xs transition ${selectedAdapter?.adapterId === adapter.adapterId ? 'border-command-accent bg-command-accent/10' : 'border-command-line bg-command-panelStrong hover:border-command-accent'}`}>
                    <span className="min-w-0"><span className="block font-semibold text-command-text">{adapterTypeLabels[adapter.adapterType]}</span><span className="ltr mt-1 block truncate text-left text-command-muted">{adapter.adapterId}</span></span>
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${adapter.healthStatus === 'healthy' ? 'bg-command-accent' : adapter.healthStatus === 'degraded' ? 'bg-command-amber' : 'bg-command-red'}`} aria-label={adapter.healthStatus === 'healthy' ? 'سليم' : adapter.healthStatus === 'degraded' ? 'متراجع' : 'غير متصل'} />
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="القدرات والصحة" eyebrow="اكتشاف وتهيئة" className="h-fit">
              {selectedAdapter ? <div data-testid="adapter-capability-view" className="space-y-3">
                <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-command-text">{adapterTypeLabels[selectedAdapter.adapterType]}</p><p className="ltr mt-1 text-left text-xs text-command-muted">v{selectedAdapter.version}</p></div><StatusPill label="سليم محلياً" tone="accent" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <Capability label="نمط اتصال في العقد" active={selectedAdapter.onlineSupport} />
                  <Capability label="دون اتصال" active={selectedAdapter.offlineSupport} />
                  <Capability label="دفعات" active={selectedAdapter.batchSupport} />
                  <Capability label="تدفق" active={selectedAdapter.streamingSupport} />
                  <Capability label="أدلة" active={selectedAdapter.evidenceSupport} />
                  <Capability label="مكاني" active={selectedAdapter.spatialSupport} />
                </div>
                <p className="rounded border border-command-line bg-command-panelStrong p-2 text-xs leading-6 text-command-muted">تعريف مرجعي محلي؛ لا حزمة مورّد ولا اتصال خارجي.</p>
              </div> : null}
            </Panel>

            <Panel title="محاكيات المصدر" eyebrow="حالات حتمية قابلة للتكرار">
              <div data-testid="integration-source-controls" className="space-y-4">
                <ControlGroup title="التقاط وتسوية" controls={groups.capture} runningAction={runningAction} onRun={runAction} />
                <ControlGroup title="نزاهة ورفض" controls={groups.integrity} runningAction={runningAction} onRun={runAction} />
                <ControlGroup title="حالة الادعاء" controls={groups.trust} runningAction={runningAction} onRun={runAction} />
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="تيار أغلفة الالتقاط" eyebrow="المصدر لا يساوي الحقيقة">
              <StreamTable testId="capture-envelope-stream" empty="شغّل محاكياً لإنتاج غلاف مصدر." headers={['الغلاف', 'المصدر', 'السياق', 'الاستلام']} rows={snapshot.envelopes.slice().reverse().map((envelope) => [
                <LtrValue key="id" value={envelope.envelopeId} />,
                <LtrValue key="source" value={envelope.sourceRecordId} />,
                contextLabels[envelope.stateContext],
                formatTime(envelope.receivedAt)
              ])} />
            </Panel>

            <Panel title="سجل الأحداث التشغيلي" eyebrow="سجل محلي غير قابل للتعديل">
              <div data-testid="operational-event-stream">
                {snapshot.events.length ? <div className="space-y-2">{snapshot.events.slice().reverse().map((event) => (
                  <button key={event.eventId} data-testid={`event-${event.eventId}`} type="button" onClick={() => setSnapshot(engine.selectEvent(event.eventId))} className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 rounded border p-3 text-right ${selectedEvent?.eventId === event.eventId ? 'border-command-accent bg-command-accent/10' : 'border-command-line bg-command-panelStrong'}`}>
                    <span className="min-w-0"><span className="block text-sm font-semibold text-command-text">{eventTypeLabel(event.eventType)}</span><span className="ltr mt-1 block truncate text-left text-xs text-command-muted">{event.eventType} · {event.eventId} · {event.subjects.entityId}</span></span>
                    <span className="space-y-1 text-left"><StatusPill label={assertionLabels[event.trust.assertionState]} tone={event.trust.assertionState === 'approved' || event.trust.assertionState === 'verified' ? 'accent' : 'blue'} /><span className="block text-[10px] text-command-muted">r{numberFormatter.format(event.revision)}</span></span>
                  </button>
                ))}</div> : <EmptyState title="السجل فارغ" message="الأحداث لا تضاف إلا بعد نجاح التطبيع والتحقق." />}
              </div>
            </Panel>

            <Panel title="تفاصيل الحدث المحدد" eyebrow="ماذا، متى، أين، لماذا، وكيف">
              {selectedEvent ? <div data-testid="selected-event-details" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <Detail label="معرّف الحدث" value={selectedEvent.eventId} ltr />
                <Detail label="نوع الحدث" value={eventTypeLabel(selectedEvent.eventType)} />
                <Detail label="العنصر" value={selectedEvent.subjects.entityId} ltr />
                <Detail label="وقت المصدر" value={formatTime(selectedEvent.time.eventTime)} />
                <Detail label="وقت السجل" value={formatTime(selectedEvent.time.recordTime)} />
                <Detail label="السياق" value={contextLabels[selectedEvent.stateContext]} />
                <Detail label="الحالة السابقة" value={selectedEvent.operationalContext.priorDisposition ? dispositionLabel(selectedEvent.operationalContext.priorDisposition) : 'غير متاحة'} />
                <Detail label="الحالة المقترحة" value={dispositionLabel(selectedEvent.operationalContext.proposedDisposition)} />
                <Detail label="طريقة الالتقاط" value={selectedEvent.source.captureMethod} ltr />
              </div> : <EmptyState title="لا يوجد حدث محدد" message="اختر حدثاً من السجل بعد تشغيل محاكٍ صالح." />}
            </Panel>

            <Panel title="الدليل والمصدر" eyebrow="لا تُخلط provenance بالثقة">
              <div data-testid="evidence-provenance" className="grid gap-3 xl:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-command-text">مراجع الدليل</p>
                  {selectedEvidence.length ? selectedEvidence.map((evidence) => <div key={evidence.evidenceId} className="rounded border border-command-line bg-command-panelStrong p-3 text-xs"><div className="flex items-center justify-between gap-2"><span className="font-semibold text-command-text">{evidenceTypeLabels[evidence.evidenceType]}</span><StatusPill label={evidence.verificationStatus === 'verified' ? 'تم التحقق' : 'قيد المراجعة'} tone={evidence.verificationStatus === 'verified' ? 'accent' : 'amber'} /></div><p className="ltr mt-2 break-all text-left text-command-muted">{evidence.evidenceId}</p><p className="mt-2 text-command-muted">مرجع محلي آمن؛ لا محتوى ثنائي مزيف.</p></div>) : <p className="rounded border border-dashed border-command-line p-3 text-xs text-command-muted">لا يوجد دليل مرتبط بهذا الحدث.</p>}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-command-text">سلسلة التوليد</p>
                  {snapshot.provenance.nodes.length
                    ? snapshot.provenance.nodes.map((node, index) => <div key={node.provenanceId} className="flex items-center gap-2 text-xs text-command-muted"><span className="flex h-6 w-6 items-center justify-center rounded border border-command-line bg-command-panelStrong text-command-accent">{index + 1}</span><span>{node.label}</span></div>)
                    : <p className="rounded border border-dashed border-command-line p-3 text-xs text-command-muted">لا توجد سلسلة توليد مرتبطة بحدث مقبول.</p>}
                  {snapshot.provenance.nodes.length ? <div data-testid="connected-provenance-graph" data-connected={provenanceConnected ? 'true' : 'false'} className={`mt-3 rounded border p-3 ${provenanceConnected ? 'border-command-accent/50 bg-command-accent/10' : 'border-command-amber/50 bg-command-amber/10'}`}>
                    <div className="flex items-center justify-between gap-2 text-xs"><span className="font-semibold text-command-text">ترابط رسم المصدر</span><StatusPill label={provenanceConnected ? 'اجتاز فحص الترابط' : 'غير مكتمل أو مرفوض'} tone={provenanceConnected ? 'accent' : 'amber'} /></div>
                    <div className="mt-2 space-y-1 text-[11px] leading-5 text-command-muted">
                      {snapshot.provenance.relations.map((relation) => <p key={relation.relationId}>• {provenanceRelationLabels[relation.relationType]}</p>)}
                    </div>
                  </div> : null}
                  <p data-testid="untrusted-identity-time-note" className="mt-2 rounded border border-command-amber/40 bg-command-amber/10 p-2 text-xs leading-6 text-command-muted">هوية المنفذ الإنتاجية ومرجعية وقت الجهاز غير موثقتين في هذا المختبر المحلي، وتبقيان غير معروفتين صراحة.</p>
                </div>
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="مسار الثقة" eyebrow="قواعد صريحة وليست ذكاءً اصطناعياً">
              <div data-testid="trust-state-pipeline" className="grid grid-cols-3 gap-2">
                {(['reported', 'corroborated', 'verified', 'approved', 'rejected', 'superseded'] as AssertionState[]).map((state) => {
                  const count = snapshot.events.filter((event) => event.trust.assertionState === state).length;
                  return <div key={state} className={`rounded border p-2 text-center ${count ? 'border-command-accent/70 bg-command-accent/10' : 'border-command-line bg-command-panelStrong'}`}><p className="text-xs text-command-muted">{assertionLabels[state]}</p><p className="ltr mt-1 text-xl font-semibold text-command-text">{count}</p></div>;
                })}
              </div>
              <p className="mt-3 text-xs leading-6 text-command-muted">المُبلّغ والمؤيّد يبقيان في السجل ولا يغيران الإسقاط المتحقق. المنفذ والمتحقق والمعتمد أدوار منفصلة عند اشتراط الاستقلال.</p>
            </Panel>

            <Panel title="نتائج التحقق" eyebrow="قبول تشغيلي لا استجابة تقنية">
              <div data-testid="integration-validation-results" className="space-y-2">
                {snapshot.validationRecords.length ? snapshot.validationRecords.slice(0, 7).map((record, index) => <div key={`${record.recordId}-${index}`} data-outcome={record.outcome} data-issue-code={record.issues[0]?.code} className={`rounded border p-3 text-xs ${record.outcome === 'rejected' ? 'border-red-300/40 bg-red-950/20 text-red-100' : record.outcome === 'conflict' || record.outcome === 'warning' ? 'border-command-amber/50 bg-command-amber/10 text-command-text' : 'border-command-line bg-command-panelStrong text-command-muted'}`}><div className="flex items-center justify-between gap-2"><span className="ltr text-left font-semibold">{record.recordId}</span><StatusPill label={validationOutcomeLabel(record.outcome)} tone={record.outcome === 'rejected' ? 'red' : record.outcome === 'conflict' || record.outcome === 'warning' ? 'amber' : 'accent'} /></div><p className="mt-2 leading-6">{record.messageAr}</p></div>) : <EmptyState title="لا نتائج بعد" message="كل تشغيل يُنتج نتيجة قبول أو رفض أو مراجعة واضحة." />}
              </div>
            </Panel>

            <Panel title="قائمة العمل دون اتصال" eyebrow="لا استبدال أعمى بآخر تحديث">
              <div data-testid="offline-queue" className="space-y-2">
                {snapshot.offlineQueue.length ? snapshot.offlineQueue.map((entry) => <div key={entry.queueId} className="rounded border border-command-line bg-command-panelStrong p-3 text-xs"><div className="flex items-center justify-between gap-2"><LtrValue value={entry.envelope.sourceRecordId} /><StatusPill label={entry.status === 'queued' ? 'بانتظار إعادة التشغيل' : entry.status === 'conflict' ? 'تعارض' : 'أعيد مرة واحدة'} tone={entry.status === 'conflict' ? 'red' : entry.status === 'queued' ? 'amber' : 'accent'} /></div><p className="mt-2 text-command-muted">تسلسل الجهاز: <span className="ltr inline-block">{entry.envelope.offlineSequence ?? '—'}</span></p></div>) : <EmptyState title="القائمة فارغة" message="السجلات غير المتصلة تحفظ وقت الجهاز ووقت المنصة وتسلسلها." />}
              </div>
            </Panel>

            <Panel title="مراجعة التعارض" eyebrow="يحفظ الادعاءان">
              <div data-testid="conflict-review-queue">
                {snapshot.conflicts.length ? snapshot.conflicts.map((conflict) => <div key={conflict.conflictId} className="rounded border border-command-red/60 bg-red-950/20 p-3 text-xs text-red-50"><div className="flex items-center gap-2 font-semibold"><GitMerge className="h-4 w-4" aria-hidden="true" /><LtrValue value={conflict.entityId} /></div><p className="mt-2 leading-6 text-red-100/90">{conflict.reasonAr}</p><div className="mt-2 flex justify-between gap-2 text-[10px] text-red-100/70"><span>{dispositionLabel(conflict.existingDisposition)}</span><span>≠</span><span>{dispositionLabel(conflict.proposedDisposition)}</span></div></div>) : <EmptyState title="لا تعارضات" message="التعارض غير المحسوم لا يغير الحالة المشتقة." />}
              </div>
            </Panel>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="مسار الفعل المحكوم" eyebrow="معاملة محلية ذرية">
            <div data-testid="governed-action-execution" className="space-y-3">
              {latestActionResult ? <>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-command-line bg-command-panelStrong p-3">
                  <div><p className="text-sm font-semibold text-command-text">{latestActionResult.outcome === 'accepted' ? 'تنفيذ محاكي محلي — ليس إجراءً تشغيليًا فعليًا' : latestActionResult.issues[0]?.messageAr ?? 'نتيجة فعل محكوم'}</p><p className="ltr mt-1 text-left text-[10px] text-command-muted">{latestActionResult.submissionId}</p></div>
                  <StatusPill label={latestActionResult.outcome === 'accepted' ? 'اكتمل محلياً' : latestActionResult.outcome === 'duplicate-ignored' ? 'إعادة آمنة' : latestActionResult.outcome === 'conflict-detected' ? 'تعارض' : 'مرفوض'} tone={latestActionResult.outcome === 'accepted' || latestActionResult.outcome === 'duplicate-ignored' ? 'accent' : latestActionResult.outcome === 'conflict-detected' ? 'amber' : 'red'} />
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{latestActionResult.executionSteps.map((executionStep) => <div key={executionStep.stepId} data-step-status={executionStep.status} className={`rounded border p-2 text-xs ${executionStep.status === 'passed' ? 'border-command-accent/40 bg-command-accent/10' : executionStep.status === 'failed' ? 'border-command-red/50 bg-red-950/20' : 'border-command-line bg-command-panelStrong'}`}><p className="font-semibold text-command-text">{executionStepLabel(executionStep.stepId)}</p><p className="mt-1 leading-5 text-command-muted">{executionStep.messageAr}</p></div>)}</div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <Detail label="الأدلة المستخدمة" value={latestActionResult.evidenceUsed.join('، ') || 'لا يوجد'} ltr />
                  <Detail label="المصدر المستخدم" value={latestActionResult.provenanceUsed.join('، ') || 'غير محلول'} ltr />
                  <Detail label="حالة الادعاء" value={latestActionResult.operationalEvent ? assertionLabels[latestActionResult.operationalEvent.trust.assertionState] : 'لم ينشأ حدث'} />
                  <Detail label="نتيجة الإسقاط" value={latestActionResult.appliedToProjection ? 'مدرج في نسب الإسقاط؛ يخضع لقاعدة الثقة' : 'لم يدخل نسب الإسقاط'} />
                  <Detail label="هوية الإسقاط" value={snapshot.outputs.projection.projectionVersion} ltr />
                  <Detail label="إصدار المخرج" value={snapshot.outputs.spatial2d.outputProfileVersion} ltr />
                </div>
              </> : <EmptyState title="لم يُنفذ فعل محكوم" message="شغّل مسار النجاح أو إحدى حالات الرفض لرؤية ترتيب المعاملة." />}
            </div>
          </Panel>

          <Panel title="مصفوفة مطابقة الموائمات" eyebrow="عشرة مسارات مستقلة">
            <div data-testid="adapter-conformance-matrix" className="space-y-3">
              <div className="grid grid-cols-2 gap-2"><MetricBox label="ناجحة" value={snapshot.adapterConformance.filter((report) => report.passed).length} suffix="موائم" /><MetricBox label="متعثرة" value={snapshot.adapterConformance.filter((report) => !report.passed).length} suffix="موائم" /></div>
              <div className="grid gap-2 sm:grid-cols-2">{snapshot.adapterConformance.map((report) => <div key={report.adapterId} data-testid={`conformance-${report.adapterId}`} className="flex items-center justify-between gap-2 rounded border border-command-line bg-command-panelStrong p-2 text-xs"><span className="ltr min-w-0 truncate text-left text-command-muted">{report.adapterId}</span><StatusPill label={report.passed ? 'اجتاز' : 'فشل'} tone={report.passed ? 'accent' : 'red'} /></div>)}</div>
            </div>
          </Panel>
        </div>

        <Panel title="تنفيذ JSON Schema واتساق العقود" eyebrow="Ajv 8 · Draft 2020-12">
          <div data-testid="schema-validation-result" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricBox label="المخططات" value={snapshot.schemaValidation.schemasValidated} suffix="مخطط" />
            <MetricBox label="Meta-schema" value={snapshot.schemaValidation.metaSchemasValid} suffix="صالح" />
            <MetricBox label="عينات صالحة" value={snapshot.schemaValidation.validFixturesPassed} suffix="اجتازت" />
            <MetricBox label="عينات مرفوضة" value={snapshot.schemaValidation.invalidFixturesRejected} suffix="رُفضت" />
            <MetricBox label="اختلافات العقد" value={snapshot.schemaValidation.driftIssues.length} suffix="اختلاف" />
          </div>
        </Panel>

        <Panel title="الإسقاط القانوني للحالة" eyebrow="إعادة بناء حتمية من سجل فارغ">
          <div data-testid="canonical-state-projection" data-projection-version={snapshot.outputs.projection.projectionVersion} className="grid gap-4 xl:grid-cols-[minmax(260px,0.6fr)_minmax(0,1.4fr)]">
            <div className="space-y-3 rounded border border-command-line bg-command-panelStrong p-4">
              <div><p className="text-xs text-command-muted">إصدار الإسقاط</p><p data-testid="canonical-projection-version" className="ltr mt-1 break-all text-left text-sm font-semibold text-command-accent">{snapshot.outputs.projection.projectionVersion}</p></div>
              <Detail label="بصمة محتوى الإسقاط" value={snapshot.outputs.projection.projectionContentHash} ltr />
              <Detail label="إصدار تهيئة الإسقاط" value={snapshot.outputs.projection.projectionConfigurationVersion} ltr />
              <Detail label="إصدار الربط المكاني" value={snapshot.outputs.projection.spatialMappingVersion} ltr />
              <Detail label="السياق" value={contextLabels[snapshot.outputs.projection.stateContext]} />
              <Detail label="آخر مراجعة حدث" value={numberFormatter.format(snapshot.outputs.projection.lastEventRevision)} />
              <Detail label="الأحداث المساهمة" value={numberFormatter.format(snapshot.outputs.projection.sourceEventIds.length)} />
              <p className="text-xs leading-6 text-command-muted">{snapshot.outputs.projection.explanationAr.join(' ')}</p>
            </div>
            {snapshot.outputs.projection.entityStates.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{snapshot.outputs.projection.entityStates.map((state) => <ProjectedState key={state.entityId} state={state} />)}</div> : <EmptyState title="لا توجد حالة متحققة" message="الأحداث المقبولة من نوع مُبلّغ أو مؤيّد لا تغيّر الإسقاط حتى تكتمل قاعدة التحقق." />}
          </div>
        </Panel>

        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
          <OutputPreviewPanel title="مخرج ثنائي الأبعاد" eyebrow="مخطط مكاني" testId="spatial-output-2d" icon={<Map />} projectionVersion={snapshot.outputs.spatial2d.projectionVersion} commandId={snapshot.outputs.spatial2d.commandId} commandContentHash={snapshot.outputs.spatial2d.commandContentHash}>
            <Plan2D states={snapshot.outputs.spatial2d.visualStates} />
          </OutputPreviewPanel>
          <OutputPreviewPanel title="مخرج ثلاثي الأبعاد" eyebrow="فهم العلاقة المكانية" testId="spatial-output-3d" icon={<Boxes />} projectionVersion={snapshot.outputs.spatial3d.projectionVersion} commandId={snapshot.outputs.spatial3d.commandId} commandContentHash={snapshot.outputs.spatial3d.commandContentHash}>
            <Plan3D states={snapshot.outputs.spatial3d.visualStates} />
          </OutputPreviewPanel>
          <OutputPreviewPanel title="معاينة جغرافية" eyebrow="لا خرائط حية ولا تكامل خارجي" testId="geospatial-output-preview" icon={<ScanLine />} projectionVersion={snapshot.outputs.geospatial.projectionVersion} commandId={snapshot.outputs.geospatial.commandId} commandContentHash={snapshot.outputs.geospatial.commandContentHash}>
            <GeospatialPreview states={snapshot.outputs.geospatial.visualStates} />
          </OutputPreviewPanel>
          {projectionOutputEnabled ? (
            <OutputPreviewPanel title="معاينة مخرج مادي" eyebrow="لا أجهزة ولا معايرة" testId="physical-output-preview" icon={<MonitorDot />} projectionVersion={snapshot.outputs.physical.projectionVersion} commandId={snapshot.outputs.physical.commandId} commandContentHash={snapshot.outputs.physical.commandContentHash}>
              <PhysicalPreview states={snapshot.outputs.physical.entityVisualStates} />
            </OutputPreviewPanel>
          ) : (
            <section data-testid="physical-output-unavailable" className="flex min-h-72 items-center justify-center border border-command-line bg-command-panel p-4">
              <EmptyState title="معاينة المخرج غير مفعلة" message="حزمة معاينة الإسقاط والمخرج المادي غير مفعلة في تهيئة الفعالية الحالية." />
            </section>
          )}
        </div>

        <Panel title="مؤشرات المختبر" eyebrow="كل القيم محاكاة محلية">
          <div data-testid="integration-demo-metrics" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
            <MetricBox label="مصدر كامل" value={snapshot.metrics.eventsWithCompleteProvenance} suffix="حدث" />
            <MetricBox label="دليل صالح" value={snapshot.metrics.eventsWithValidEvidence} suffix="حدث" />
            <MetricBox label="سجلات أُعيدت" value={snapshot.metrics.offlineRecordsReplayed} suffix="سجل" />
            <MetricBox label="زمن إلى التحقق" value={snapshot.metrics.averageSimulatedTimeToVerifiedSeconds} suffix="ثانية" />
            <MetricBox label="التقاط آلي" value={snapshot.metrics.automaticCapturePercentage} suffix="%" />
            <MetricBox label="تفاعل بشري" value={snapshot.metrics.humanInteractionPercentage} suffix="%" />
            <MetricBox label="ادعاءات معتمدة" value={snapshot.metrics.approvedAssertions} suffix="ادعاء" />
          </div>
        </Panel>

        <footer className="flex flex-wrap items-center justify-between gap-3 border border-command-line bg-command-panel p-3 text-xs text-command-muted">
          <span className="flex items-center gap-2"><HardDriveDownload className="h-4 w-4 text-command-accent" aria-hidden="true" />سجل محلي لأغراض التحقق المعماري، وليس سجل تدقيق إنتاجيًا.</span>
          <span className="flex items-center gap-2"><Cable className="h-4 w-4 text-command-amber" aria-hidden="true" />لا خادم خلفي، لا تغذية حية، لا أجهزة، لا ذكاء اصطناعي.</span>
        </footer>
      </div>
    </div>
  );
}

function ControlGroup({ title, controls, runningAction, onRun }: { title: string; controls: SimulationControl[]; runningAction: IntegrationLabAction | null; onRun: (action: IntegrationLabAction) => Promise<void> }) {
  return <div><p className="mb-2 text-xs font-semibold text-command-muted">{title}</p><div className="grid grid-cols-2 gap-2">{controls.map((control) => <button key={control.action} data-testid={control.testId} type="button" disabled={runningAction !== null} onClick={() => void onRun(control.action)} className={`command-button min-h-11 px-2 text-xs ${control.group === 'integrity' ? 'border-command-amber/60' : control.group === 'trust' ? 'border-command-blue/60' : ''}`}><Play className={`h-3.5 w-3.5 ${runningAction === control.action ? 'animate-pulse' : ''}`} aria-hidden="true" />{control.label}</button>)}</div></div>;
}

function MetricChip({ label, value, icon, tone = 'accent' }: { label: string; value: string | number; icon: React.ReactElement; tone?: 'accent' | 'amber' | 'red' }) {
  const toneClass = tone === 'red' ? 'text-command-red' : tone === 'amber' ? 'text-command-amber' : 'text-command-accent';
  return <div className="flex min-h-16 items-center gap-3 rounded border border-command-line bg-command-panelStrong px-3"><span className={toneClass}>{<span className="block [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}</span><span><span className="block text-[10px] text-command-muted">{label}</span><span className="ltr mt-1 block text-left text-lg font-semibold text-command-text">{typeof value === 'number' ? numberFormatter.format(value) : value}</span></span></div>;
}

function Capability({ label, active }: { label: string; active: boolean }) {
  return <div className="flex items-center justify-between rounded border border-command-line bg-command-panelStrong px-2 py-2 text-[11px]"><span className="text-command-muted">{label}</span>{active ? <CheckCircle2 className="h-3.5 w-3.5 text-command-accent" aria-label="مدعوم" /> : <CircleDot className="h-3.5 w-3.5 text-command-muted" aria-label="غير مدعوم" />}</div>;
}

function StatusPill({ label, tone }: { label: string; tone: 'accent' | 'amber' | 'red' | 'blue' }) {
  const style = tone === 'red' ? 'border-red-300/50 bg-red-950/30 text-red-100' : tone === 'amber' ? 'border-command-amber/50 bg-command-amber/10 text-command-amber' : tone === 'blue' ? 'border-command-blue/50 bg-command-blue/10 text-command-blue' : 'border-command-accent/50 bg-command-accent/10 text-command-accent';
  return <span className={`inline-flex min-h-6 items-center rounded border px-2 text-[10px] font-semibold ${style}`}>{label}</span>;
}

function LtrValue({ value }: { value: string }) {
  return <span className="ltr inline-block break-all text-left">{value}</span>;
}

function StreamTable({ testId, headers, rows, empty }: { testId: string; headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <div data-testid={testId}><EmptyState title="لا توجد سجلات" message={empty} /></div>;
  return <div data-testid={testId} className="overflow-x-auto"><table className="w-full min-w-[620px] border-collapse text-xs"><thead><tr className="text-command-muted">{headers.map((header) => <th key={header} className="border-b border-command-line px-2 py-2 text-right font-medium">{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-command-line/60 text-command-text">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-2 py-2.5">{cell}</td>)}</tr>)}</tbody></table></div>;
}

function Detail({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return <div className="min-w-0 rounded border border-command-line bg-command-panelStrong p-2"><p className="text-[10px] text-command-muted">{label}</p><p className={`${ltr ? 'ltr text-left' : ''} mt-1 break-words text-xs font-semibold text-command-text`}>{value}</p></div>;
}

function ProjectedState({ state }: { state: ProjectedEntityState }) {
  return <div data-testid={`projected-state-${state.entityId}`} className="rounded border border-command-line bg-command-panelStrong p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold text-command-text">{state.labelAr}</p><p className="ltr mt-1 text-left text-[10px] text-command-muted">{state.entityId}</p></div><span className="h-3 w-3 rounded-full" style={{ backgroundColor: visualColor[state.colorToken] }} /></div><p className="mt-3 text-xs font-semibold text-command-accent">{dispositionLabel(state.disposition)}</p><div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-command-muted"><span>{assertionLabels[state.assertionState]}</span><span>{numberFormatter.format(state.sourceEventIds.length)} أحداث</span></div>{state.readiness ? <div className="mt-3 border-t border-command-line pt-3"><div className="flex justify-between text-[10px] text-command-muted"><span>جاهزية مشتقة</span><span className="ltr">{state.readiness.readiness}%</span></div><div className="mt-1 flex justify-between text-[10px] text-command-muted"><span>جاهزية متحققة</span><span className="ltr">{state.readiness.verifiedReadiness}%</span></div></div> : null}</div>;
}

function OutputPreviewPanel({ title, eyebrow, testId, icon, projectionVersion, commandId, commandContentHash, children }: { title: string; eyebrow: string; testId: string; icon: React.ReactNode; projectionVersion: string; commandId: string; commandContentHash: string; children: React.ReactNode }) {
  return <section data-testid={testId} data-projection-version={projectionVersion} data-command-id={commandId} data-command-content-hash={commandContentHash} className="border border-command-line bg-command-panel"><div className="flex items-start justify-between gap-3 border-b border-command-line px-4 py-3"><div><p className="text-[11px] font-semibold text-command-accent">{eyebrow}</p><h3 className="mt-1 text-base font-semibold text-command-text">{title}</h3></div><span className="text-command-accent [&>svg]:h-5 [&>svg]:w-5">{icon}</span></div><div className="p-3.5"><div className="min-h-56">{children}</div><div className="mt-3 space-y-1 border-t border-command-line pt-2"><p className="ltr break-all text-left text-[9px] text-command-muted">{projectionVersion}</p><p className="ltr break-all text-left text-[9px] text-command-accent">{commandId}</p></div></div></section>;
}

function Plan2D({ states }: { states: SpatialVisualState[] }) {
  return <div className="relative h-56 overflow-hidden rounded border border-command-line bg-[#0a1512]" aria-label="معاينة ثنائية الأبعاد"><div className="absolute inset-4 grid grid-cols-3 grid-rows-2 gap-3">{states.length ? states.map((state, index) => <div key={state.entityId} className="flex items-center justify-center rounded border text-center text-xs font-semibold" style={{ borderColor: visualColor[state.colorToken], backgroundColor: `${visualColor[state.colorToken]}18`, gridColumn: (index % 3) + 1, gridRow: Math.floor(index / 3) + 1 }}><span>{state.label}<span className="ltr mt-1 block text-[9px] opacity-70">{state.entityId}</span></span></div>) : <div className="col-span-3 row-span-2 flex items-center justify-center text-xs text-command-muted">لا حالة متحققة للرسم</div>}</div><Route className="absolute bottom-3 left-3 h-5 w-5 text-command-blue" aria-hidden="true" /></div>;
}

function Plan3D({ states }: { states: SpatialVisualState[] }) {
  return <div className="relative flex h-56 items-center justify-center overflow-hidden rounded border border-command-line bg-[#08120f] [perspective:700px]" aria-label="معاينة ثلاثية الأبعاد"><div className="relative h-36 w-60 border border-command-line bg-[#10211c] shadow-[0_24px_45px_rgba(0,0,0,0.45)]" style={{ transform: 'rotateX(58deg) rotateZ(-28deg)', transformStyle: 'preserve-3d' }}>{states.length ? states.map((state, index) => <div key={state.entityId} className="absolute flex h-12 w-20 items-center justify-center border text-[9px] font-semibold text-command-text shadow-lg" style={{ borderColor: visualColor[state.colorToken], backgroundColor: `${visualColor[state.colorToken]}30`, right: `${18 + (index % 2) * 44}%`, top: `${15 + Math.floor(index / 2) * 36}%`, transform: 'translateZ(18px)', boxShadow: `0 10px 20px ${visualColor[state.colorToken]}25` }}>{state.label}</div>) : <div className="flex h-full items-center justify-center text-xs text-command-muted">لا حالة متحققة</div>}</div><span className="absolute bottom-3 right-3 text-[10px] text-command-muted">معاينة هندسية محلية</span></div>;
}

function GeospatialPreview({ states }: { states: SpatialVisualState[] }) {
  return <div className="relative h-56 overflow-hidden rounded border border-command-line bg-[#0a1512]" aria-label="معاينة جغرافية محلية"><div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(#29423b 1px, transparent 1px), linear-gradient(90deg, #29423b 1px, transparent 1px)', backgroundSize: '24px 24px' }} /><div className="absolute inset-x-5 top-1/2 border-t border-command-blue/60" /><div className="absolute inset-y-5 left-1/2 border-l border-command-blue/60" /><Map className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 text-command-accent" aria-hidden="true" />{states[0] ? <div className="absolute right-4 top-4 rounded border border-command-accent/50 bg-command-panel px-2 py-1 text-[10px] text-command-text">{states[0].label}</div> : null}<p className="absolute bottom-3 right-3 left-3 text-center text-[10px] leading-5 text-command-muted">نقطة أصل تجريبية فقط؛ التحويل إلى WGS84 يحتاج مصدر إحداثيات معتمد.</p></div>;
}

function PhysicalPreview({ states }: { states: Array<{ entityId: string; colorToken: ProjectedEntityState['colorToken']; intensity: number; label: string }> }) {
  return <div className="relative h-56 overflow-hidden rounded border border-command-line bg-[#050a09] p-5" aria-label="معاينة مخرج مادي"><div className="grid h-full grid-cols-3 grid-rows-2 gap-3 rounded border border-command-line bg-[#101a17] p-3 shadow-inner">{states.length ? states.map((state) => <div key={state.entityId} className="flex items-center justify-center border text-center text-[9px] font-semibold" style={{ borderColor: visualColor[state.colorToken], boxShadow: `inset 0 0 24px ${visualColor[state.colorToken]}35`, opacity: state.intensity }}><span>{state.label}<span className="ltr mt-1 block opacity-70">{state.entityId}</span></span></div>) : <div className="col-span-3 row-span-2 flex items-center justify-center text-xs text-command-muted">لا أمر مشهد مشتق</div>}</div><p className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-command-bg px-2 py-1 text-[9px] text-command-amber">معاينة فقط · لا أجهزة</p></div>;
}

function MetricBox({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return <div className="rounded border border-command-line bg-command-panelStrong p-3"><p className="text-[10px] text-command-muted">{label}</p><p className="ltr mt-2 text-left text-2xl font-semibold text-command-text">{numberFormatter.format(value)} <span className="text-[10px] font-normal text-command-muted">{suffix}</span></p></div>;
}

function formatTime(value: string): string {
  return Number.isFinite(Date.parse(value)) ? dateFormatter.format(new Date(value)) : 'وقت غير صالح';
}

function validationOutcomeLabel(outcome: string): string {
  const labels: Record<string, string> = { accepted: 'مقبول', rejected: 'مرفوض', duplicate: 'مكرر محجوب', queued: 'في القائمة', conflict: 'يحتاج مراجعة', warning: 'مقبول بتنبيه' };
  return labels[outcome] ?? outcome;
}

function dispositionLabel(value: string): string {
  return dispositionLabels[value] ?? value;
}

function eventTypeLabel(value: string): string {
  return eventTypeLabels[value] ?? 'حدث تشغيلي';
}

function executionStepLabel(stepId: string): string {
  const labels: Record<string, string> = {
    validation: 'التحقق من الفعل',
    'evidence-provenance': 'حل الدليل والمصدر',
    'event-construction': 'إنشاء الحدث',
    'event-validation': 'التحقق من عقد الحدث',
    'repository-append': 'الإلحاق بالسجل',
    'idempotency-commit': 'تثبيت منع التكرار'
  };
  return labels[stepId] ?? stepId;
}
