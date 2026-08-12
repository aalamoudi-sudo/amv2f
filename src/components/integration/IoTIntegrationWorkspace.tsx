import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Cpu,
  Database,
  Gauge,
  Link2,
  MapPinned,
  Play,
  Radio,
  RotateCcw,
  ShieldCheck,
  WifiOff
} from 'lucide-react';
import { createIoTLabConfiguration } from '../../data/iotFixtures';
import { LocalSimulatorIoTDataSource } from '../../services/iotDataSource';
import { stage3f2PilotStatusText } from '../../services/stage3f2SourcePilot';
import { localGatewayUrlFromSearch } from '../../services/iotGatewayClient';
import { useEventStore } from '../../store/useEventStore';
import type { IoTDeviceRegistryRecord } from '../../types/iot';
import type { IoTIngestionOutcome, IoTLabAction, IoTLabSnapshot } from '../../types/iotLab';
import { Panel } from '../shared/Panel';
import { ErrorState, LoadingState } from '../shared/StateBlocks';
import { LocalGatewayIoTWorkspace } from './LocalGatewayIoTWorkspace';

const numberFormatter = new Intl.NumberFormat('ar-SA');

const outcomeLabels: Record<IoTIngestionOutcome, string> = {
  'accepted-reported': 'مقبول كمُبلّغ',
  rejected: 'مرفوض',
  'duplicate-ignored': 'تكرار محجوب',
  'conflict-requires-review': 'تعارض يحتاج مراجعة',
  'stale-quarantined': 'قراءة قديمة محجورة',
  'offline-queued': 'في قائمة دون اتصال',
  'offline-replayed': 'أعيد تشغيلها مرة واحدة',
  'device-timeout': 'انتهاء مهلة محاكاة'
};

const outcomeStyles: Record<IoTIngestionOutcome, string> = {
  'accepted-reported': 'border-command-truth-reported/50 bg-command-truth-reported/10 text-command-truth-reported',
  rejected: 'border-command-severity-critical/50 bg-command-severity-critical/10 text-command-severity-critical',
  'duplicate-ignored': 'border-command-truth-unknown/50 bg-command-truth-unknown/10 text-command-truth-unknown',
  'conflict-requires-review': 'border-command-amber/60 bg-command-amber/10 text-command-amber',
  'stale-quarantined': 'border-command-severity-blocked/50 bg-command-severity-blocked/10 text-command-severity-blocked',
  'offline-queued': 'border-command-truth-candidate/50 bg-command-truth-candidate/10 text-command-truth-candidate',
  'offline-replayed': 'border-command-severity-information/50 bg-command-severity-information/10 text-command-severity-information',
  'device-timeout': 'border-command-red/50 bg-command-red/10 text-command-red'
};

interface IoTControl {
  action: IoTLabAction;
  label: string;
  testId: string;
  group: 'valid' | 'integrity' | 'resilience';
}

const controls: IoTControl[] = [
  { action: 'fresh', label: 'قراءة صالحة', testId: 'simulate-iot-fresh', group: 'valid' },
  { action: 'threshold', label: 'تجاوز حد مبلّغ', testId: 'simulate-iot-threshold', group: 'valid' },
  { action: 'unknown-device', label: 'جهاز مجهول', testId: 'simulate-iot-unknown-device', group: 'integrity' },
  { action: 'disabled-device', label: 'جهاز معطّل', testId: 'simulate-iot-disabled-device', group: 'integrity' },
  { action: 'invalid-unit', label: 'وحدة غير مطابقة', testId: 'simulate-iot-invalid-unit', group: 'integrity' },
  { action: 'invalid-value', label: 'قيمة غير صالحة', testId: 'simulate-iot-invalid-value', group: 'integrity' },
  { action: 'cross-event', label: 'سياق فعالية مختلف', testId: 'simulate-iot-cross-event', group: 'integrity' },
  { action: 'duplicate', label: 'إعادة مطابقة', testId: 'simulate-iot-duplicate', group: 'resilience' },
  { action: 'key-conflict', label: 'تعارض مفتاح', testId: 'simulate-iot-key-conflict', group: 'resilience' },
  { action: 'stale', label: 'قراءة قديمة', testId: 'simulate-iot-stale', group: 'resilience' },
  { action: 'offline', label: 'حفظ دون اتصال', testId: 'simulate-iot-offline', group: 'resilience' },
  { action: 'replay-offline', label: 'إعادة قائمة دون اتصال', testId: 'replay-iot-offline', group: 'resilience' },
  { action: 'timeout', label: 'انتهاء مهلة جهاز', testId: 'simulate-iot-timeout', group: 'resilience' }
];

function lifecycleLabel(device: IoTDeviceRegistryRecord): string {
  if (device.lifecycleStatus === 'retired') return 'معطّل محليًا';
  if (device.lifecycleStatus === 'simulated') return 'مسجل في المحاكي';
  return 'حالة غير إنتاجية';
}

function SummaryCard({ label, value, note, testId }: { label: string; value: string; note: string; testId: string }) {
  return (
    <div data-testid={testId} className="command-card p-3">
      <p className="text-xs text-command-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-command-text">{value}</p>
      <p className="mt-1 text-[11px] leading-5 text-command-muted">{note}</p>
    </div>
  );
}

function SpatialBindingPreview({ device, mode }: { device: IoTDeviceRegistryRecord; mode: '2d' | '3d' }) {
  const entity = device.spatialBinding.entityId;
  if (mode === '2d') {
    return (
      <div data-testid="iot-spatial-2d" className="command-spatial-2d-stage relative h-56 overflow-hidden rounded border border-command-line">
        <div className="absolute inset-4 grid grid-cols-3 gap-2 opacity-70">
          {Array.from({ length: 9 }, (_, index) => <div key={index} className="rounded border border-command-line bg-command-panelStrong/70" />)}
        </div>
        <div className="command-spatial-2d-glow absolute inset-0" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <span className="mx-auto block h-5 w-5 rounded-full border-4 border-command-accent/30 bg-command-accent" />
          <span className="command-spatial-id ltr mt-3 block rounded border border-command-accent/50 px-2 py-1 text-[10px] text-command-accent">{entity}</span>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="iot-spatial-3d" className="command-spatial-3d-stage relative h-56 overflow-hidden rounded border border-command-line [perspective:700px]">
      <div className="command-spatial-floor absolute left-1/2 top-1/2 h-32 w-52 -translate-x-1/2 -translate-y-1/2 border border-command-accent/50 bg-command-accent/5 [transform:translate(-50%,-50%)_rotateX(58deg)_rotateZ(-18deg)]">
        <div className="absolute inset-3 border border-command-line" />
        <div className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-command-accent/30 bg-command-accent" />
      </div>
      <div className="command-spatial-id absolute bottom-3 left-3 right-3 flex items-center justify-between rounded border border-command-line px-3 py-2 text-[10px]">
        <span className="text-command-muted">ربط منطقي تجريبي — لا هندسة معتمدة</span>
        <span className="ltr text-command-accent">{entity}</span>
      </div>
    </div>
  );
}

export function LocalSimulatorIoTWorkspace() {
  const activeRuntime = useEventStore((state) => state.activeRuntime);
  const entities = useEventStore((state) => state.entities);
  const selectedEntityId = useEventStore((state) => state.selectedEntityId);
  const selectEntity = useEventStore((state) => state.selectEntity);
  const [simulatorSource] = useState(() => new LocalSimulatorIoTDataSource());
  const [engine, setEngine] = useState<Awaited<ReturnType<LocalSimulatorIoTDataSource['createEngine']>> | null>(null);
  const [snapshot, setSnapshot] = useState<IoTLabSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<IoTLabAction | null>(null);
  const [spatialMode, setSpatialMode] = useState<'2d' | '3d'>('2d');

  const configuration = useMemo(() => {
    const runtimeEntities = Object.values(entities)
      .filter((entity) => entity.type === 'zone' || entity.type === 'asset' || entity.type === 'gate')
      .map((entity) => ({ entityId: entity.id, labelAr: entity.nameAr }));
    const fallbackEntities = Object.values(entities).map((entity) => ({ entityId: entity.id, labelAr: entity.nameAr }));
    return createIoTLabConfiguration({
      configurationId: `IOT-LAB-${activeRuntime?.scopeKey ?? 'LOCAL-DEMO'}-1.0.0`,
      eventRef: activeRuntime?.identity.eventInstanceId ?? 'EVENT-IOT-LOCAL-DEMO',
      venueId: activeRuntime?.identity.venueId ?? 'VENUE-IOT-LOCAL-DEMO',
      mappingVersion: activeRuntime?.spatialConfiguration.spatialMappingVersion ?? 'iot-local-logical-mapping-1.0.0',
      entities: runtimeEntities.length ? runtimeEntities : fallbackEntities
    });
  }, [activeRuntime, entities]);

  useEffect(() => {
    let active = true;
    void simulatorSource.createEngine(configuration)
      .then((created) => {
        if (!active) return;
        setEngine(created);
        setSnapshot(created.snapshot());
      })
      .catch(() => {
        if (active) setError('تعذر تشغيل مختبر IoT المحلي بأمان. لم يُقبل أي سجل أو اتصال.');
      });
    return () => { active = false; };
  }, [configuration, simulatorSource]);

  if (error) {
    return <div data-testid="iot-workspace" className="flex min-h-0 flex-1 items-center justify-center p-6" dir="rtl"><ErrorState title="تعذر تشغيل مختبر IoT" message={error} /></div>;
  }
  if (!engine || !snapshot) {
    return <div data-testid="iot-workspace-loading" className="flex min-h-0 flex-1 items-center justify-center p-6" dir="rtl"><LoadingState title="جاري تهيئة سجل الأجهزة" message="يتم التحقق من العقود المحلية من دون أي طلب شبكة خارجي." /></div>;
  }

  const selectedDeviceId = selectedEntityId
    ? snapshot.devices.find((device) => device.spatialBinding.entityId === selectedEntityId)?.deviceId ?? snapshot.selectedDeviceId
    : snapshot.selectedDeviceId;
  const selectedDevice = snapshot.devices.find((device) => device.deviceId === selectedDeviceId) ?? snapshot.devices[0]!;
  const selectedHealth = snapshot.health.find((health) => health.deviceId === selectedDevice.deviceId)!;
  const latestResult = snapshot.results.at(-1);
  const acceptedCount = snapshot.results.filter((result) => result.outcome === 'accepted-reported' || result.outcome === 'offline-replayed').length;

  const run = async (action: IoTLabAction) => {
    setRunningAction(action);
    try {
      setSnapshot(await engine.run(action));
    } finally {
      setRunningAction(null);
    }
  };

  const reset = async () => {
    setRunningAction('fresh');
    try {
      setSnapshot(await engine.reset());
    } finally {
      setRunningAction(null);
    }
  };

  const chooseDevice = (deviceId: string) => {
    const device = snapshot.devices.find((candidate) => candidate.deviceId === deviceId);
    if (device) selectEntity(device.spatialBinding.entityId);
    setSnapshot(engine.selectDevice(deviceId));
  };

  const openSpatialEntity = () => {
    selectEntity(selectedDevice.spatialBinding.entityId);
  };

  return (
    <div data-testid="iot-workspace" data-context="temporary-demo" data-network="none" className="min-h-0 flex-1 overflow-y-auto command-scrollbar" lang="ar" dir="rtl">
      <div className="mx-auto w-full max-w-[2560px] space-y-4 p-4">
        <header className="sticky top-0 z-30 border border-command-line bg-command-panel/95 p-4 shadow-command backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Cpu className="h-5 w-5 text-command-accent" aria-hidden="true" />
                <h2 className="text-xl font-semibold text-command-text">مختبر إنترنت الأشياء</h2>
                <span data-testid="iot-local-only-label" className="rounded border border-command-amber/70 bg-command-amber/10 px-2 py-1 text-xs font-semibold text-command-amber">بيانات أجهزة محاكاة محلية — لا أجهزة ولا تغذية تشغيلية حية</span>
              </div>
              <p className="mt-2 max-w-5xl text-sm leading-7 text-command-muted">سجل محايد للمورّد يربط الجهاز والـDatastream والعنصر المكاني، ثم يمرر القراءة المقبولة إلى مسار الحقيقة التشغيلية القائم كملاحظة مبلّغة غير متحققة.</p>
              <p className="ltr mt-1 text-left text-[10px] text-command-muted">{snapshot.configurationId}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded border px-2 py-1 text-xs ${snapshot.schemaStatus.valid ? 'border-command-accent/50 bg-command-accent/10 text-command-accent' : 'border-command-red/50 bg-command-red/10 text-command-red'}`}>
                Ajv 2020-12 · {snapshot.schemaStatus.schemas}/2 عقود
              </span>
              <button data-testid="iot-reset" type="button" onClick={() => void reset()} className="command-button"><RotateCcw className="ml-2 h-4 w-4" aria-hidden="true" />إعادة المختبر</button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <SummaryCard testId="iot-device-count" label="الأجهزة المحلية" value={numberFormatter.format(snapshot.devices.length)} note="هويات خيالية بلا Credentials" />
          <SummaryCard testId="iot-stream-count" label="قنوات القياس" value={numberFormatter.format(snapshot.devices.reduce((sum, device) => sum + device.streams.length, 0))} note="عقود قيمة ووحدة وحداثة" />
          <SummaryCard testId="iot-accepted-count" label="قراءات مقبولة" value={numberFormatter.format(acceptedCount)} note="مُبلّغة فقط وغير متحققة" />
          <SummaryCard testId="iot-quarantine-count" label="محجور للمراجعة" value={numberFormatter.format(snapshot.quarantinedObservations.length)} note="لا يغيّر أحدث قراءة أو الإسقاط" />
          <SummaryCard testId="iot-projection-count" label="تغيير الحالة المتحققة" value={numberFormatter.format(snapshot.projection.entityStates.length)} note="المتوقع صفر من Telemetry الخام" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[320px_minmax(560px,1fr)_390px]">
          <div className="space-y-4">
            <Panel title="سجل الأجهزة" eyebrow="Vendor-neutral registry">
              <div data-testid="iot-device-registry" className="space-y-2">
                {snapshot.devices.map((device) => {
                  const health = snapshot.health.find((candidate) => candidate.deviceId === device.deviceId)!;
                  return (
                    <button key={device.deviceId} data-testid={`iot-device-${device.deviceId}`} type="button" onClick={() => chooseDevice(device.deviceId)} className={`w-full rounded border p-3 text-right transition ${selectedDevice.deviceId === device.deviceId ? 'border-command-accent bg-command-accent/10' : 'border-command-line bg-command-panelStrong hover:border-command-accent'}`}>
                      <span className="flex items-start justify-between gap-3">
                        <span><span className="block text-sm font-semibold text-command-text">{device.nameAr}</span><span className="ltr mt-1 block text-left text-[10px] text-command-muted">{device.deviceId}</span></span>
                        <span className={`mt-1 h-2.5 w-2.5 rounded-full ${health.status === 'simulated-ready' ? 'bg-command-accent' : health.status === 'simulated-degraded' ? 'bg-command-amber' : 'bg-command-red'}`} />
                      </span>
                      <span className="mt-2 block text-xs text-command-muted">{lifecycleLabel(device)}</span>
                    </button>
                  );
                })}
              </div>
            </Panel>

            <Panel title="محاكيات القراءة" eyebrow="حالات حتمية">
              <div className="space-y-4">
                {(['valid', 'integrity', 'resilience'] as const).map((group) => (
                  <div key={group}>
                    <p className="mb-2 text-xs font-semibold text-command-muted">{group === 'valid' ? 'قبول مبلّغ' : group === 'integrity' ? 'نزاهة ورفض' : 'تكرار وانقطاع'}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {controls.filter((control) => control.group === group).map((control) => (
                        <button key={control.action} data-testid={control.testId} type="button" onClick={() => void run(control.action)} disabled={runningAction !== null} className="command-button min-h-9 px-2 py-1 text-xs">
                          <Play className="ml-1 h-3.5 w-3.5" aria-hidden="true" />{control.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="نتيجة الإدخال" eyebrow="Integrity gateway">
              <div data-testid="iot-ingestion-results" className="min-h-36">
                {latestResult ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`rounded border px-2 py-1 text-xs font-semibold ${outcomeStyles[latestResult.outcome]}`}>{outcomeLabels[latestResult.outcome]}</span>
                      <span className="ltr text-[10px] text-command-muted">{latestResult.observationId ?? latestResult.resultId}</span>
                    </div>
                    <p className="text-sm leading-7 text-command-text">{latestResult.messageAr}</p>
                    {latestResult.issues.length ? (
                      <ul className="space-y-1 rounded border border-command-red/30 bg-command-red/5 p-3 text-xs leading-6 text-command-muted">
                        {latestResult.issues.slice(0, 3).map((issue) => <li key={`${issue.code}-${issue.path}`}>• {issue.messageAr} <span className="ltr text-[10px]">({issue.path})</span></li>)}
                      </ul>
                    ) : null}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded border border-command-line bg-command-panelStrong p-2 text-xs"><span className="text-command-muted">حدث تشغيلي</span><span className="ltr mt-1 block text-left text-command-text">{latestResult.operationalEventId ?? 'لم يُنشأ'}</span></div>
                      <div className="rounded border border-command-line bg-command-panelStrong p-2 text-xs"><span className="text-command-muted">تطبيق على الحالة المتحققة</span><span className="mt-1 block font-semibold text-command-accent">لا — الحماية فعّالة</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-32 flex-col items-center justify-center text-center text-command-muted"><Radio className="mb-2 h-6 w-6" /><p className="text-sm">شغّل قراءة محاكاة لرؤية مسار القبول أو الرفض.</p></div>
                )}
              </div>
            </Panel>

            <Panel title="تدفق Telemetry" eyebrow={`${snapshot.observations.length} قراءة محفوظة`}>
              <div data-testid="iot-telemetry-stream" className="max-h-72 space-y-2 overflow-y-auto command-scrollbar">
                {snapshot.observations.length ? [...snapshot.observations].reverse().map((observation) => (
                  <div key={observation.observationId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded border border-command-line bg-command-panelStrong p-3 text-xs">
                    <div className="min-w-0"><p className="font-semibold text-command-text">{observation.streamId}</p><p className="ltr mt-1 truncate text-left text-[10px] text-command-muted">{observation.observationId}</p><p className="mt-1 text-command-muted">وقت الجهاز: <span className="ltr">{observation.sourceTimestamp}</span></p></div>
                    <div className="text-left"><p className="text-lg font-semibold text-command-accent">{String(observation.value)} {observation.unit ?? ''}</p><p className="mt-1 text-[10px] text-command-muted">seq {observation.sequence}</p></div>
                  </div>
                )) : <p className="rounded border border-dashed border-command-line p-5 text-center text-sm text-command-muted">لا توجد قراءات مقبولة بعد.</p>}
              </div>
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="قائمة دون اتصال" eyebrow="Store-and-forward محلي">
                <div data-testid="iot-offline-queue" className="space-y-2 text-xs">
                  {snapshot.offlineQueue.length ? snapshot.offlineQueue.map((entry) => <div key={entry.queueId} className="rounded border border-command-line bg-command-panelStrong p-3"><p className="font-semibold text-command-text">{entry.status === 'queued' ? 'بانتظار إعادة التشغيل' : 'أعيدت مرة واحدة'}</p><p className="ltr mt-1 text-left text-command-muted">{entry.observation.observationId}</p></div>) : <p className="text-command-muted">القائمة فارغة.</p>}
                </div>
              </Panel>
              <Panel title="السجل التشغيلي" eyebrow="Stage 3D append-only">
                <div data-testid="iot-operational-events" className="space-y-2 text-xs">
                  {snapshot.operationalEvents.length ? [...snapshot.operationalEvents].reverse().slice(0, 4).map((event) => <div key={event.eventId} className="rounded border border-command-line bg-command-panelStrong p-3"><div className="flex justify-between gap-2"><span className="text-sky-200">مُبلّغ — غير متحقق</span><span className="ltr text-command-muted">{event.eventType}</span></div><p className="ltr mt-1 truncate text-left text-[10px] text-command-muted">{event.eventId}</p></div>) : <p className="text-command-muted">لا أحداث مشتقة بعد.</p>}
                </div>
              </Panel>
            </div>
          </div>

          <div className="space-y-4">
            <Panel title="تفاصيل الجهاز" eyebrow="Device + Datastream">
              <div data-testid="iot-device-details" className="space-y-3 text-xs">
                <div className="flex items-start justify-between gap-3"><div><p className="text-base font-semibold text-command-text">{selectedDevice.nameAr}</p><p className="ltr mt-1 text-left text-command-muted">{selectedDevice.deviceId}</p></div><Cpu className="h-5 w-5 text-command-accent" /></div>
                <dl className="grid grid-cols-2 gap-2">
                  <div className="command-card p-2"><dt className="text-command-muted">الفئة</dt><dd className="ltr mt-1 text-left text-command-text">{selectedDevice.deviceClass}</dd></div>
                  <div className="command-card p-2"><dt className="text-command-muted">هوية الإنتاج</dt><dd className="mt-1 text-command-amber">غير متوفرة</dd></div>
                  <div className="command-card p-2"><dt className="text-command-muted">Stream</dt><dd className="ltr mt-1 truncate text-left text-command-text">{selectedDevice.streams[0]?.streamId}</dd></div>
                  <div className="command-card p-2"><dt className="text-command-muted">الوحدة</dt><dd className="ltr mt-1 text-left text-command-text">{selectedDevice.streams[0]?.unit ?? 'بدون وحدة'}</dd></div>
                </dl>
              </div>
            </Panel>

            <Panel title="صحة المحاكاة" eyebrow="ليست حالة جهاز حقيقية">
              <div data-testid="iot-device-health" className="space-y-3">
                <div className="flex items-center gap-2">
                  {selectedHealth.status === 'simulated-ready' ? <CheckCircle2 className="h-5 w-5 text-command-accent" /> : selectedHealth.status === 'simulated-offline' ? <WifiOff className="h-5 w-5 text-command-red" /> : <AlertTriangle className="h-5 w-5 text-command-amber" />}
                  <span className="text-sm font-semibold text-command-text">{selectedHealth.status === 'simulated-ready' ? 'جاهز في المحاكاة' : selectedHealth.status === 'simulated-offline' ? 'غير متصل في المحاكاة' : 'متراجع في المحاكاة'}</span>
                </div>
                <p className="text-xs leading-6 text-command-muted">{selectedHealth.messageAr}</p>
                {selectedHealth.lastValueLabel ? <p className="rounded border border-command-line bg-command-panelStrong p-2 text-xs"><span className="text-command-muted">آخر قراءة محاكاة: </span><strong className="text-command-text">{selectedHealth.lastValueLabel}</strong></p> : null}
              </div>
            </Panel>

            <Panel title="الربط المكاني" eyebrow="نفس Entity ID في 2D و3D">
              <div data-testid="iot-spatial-link" data-mapping-version={selectedDevice.mappingVersion} data-entity-id={selectedDevice.spatialBinding.entityId} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex rounded border border-command-line p-1">
                    <button data-testid="iot-spatial-2d-open" type="button" onClick={() => setSpatialMode('2d')} className={`command-preset-button ${spatialMode === '2d' ? 'command-preset-button-active' : ''}`}>2D</button>
                    <button data-testid="iot-spatial-3d-open" type="button" onClick={() => setSpatialMode('3d')} className={`command-preset-button ${spatialMode === '3d' ? 'command-preset-button-active' : ''}`}>3D</button>
                  </div>
                  <button data-testid="iot-select-spatial-entity" type="button" onClick={openSpatialEntity} className="command-button min-h-8 px-2 py-1 text-xs"><Link2 className="ml-1 h-3.5 w-3.5" />تحديد العنصر</button>
                </div>
                <SpatialBindingPreview device={selectedDevice} mode={spatialMode} />
                <div className="rounded border border-command-amber/40 bg-command-amber/5 p-3 text-xs leading-6 text-command-muted"><MapPinned className="ml-2 inline h-4 w-4 text-command-amber" />ربط منطقي تجريبي — لا إحداثيات أو هندسة معتمدة. <span className="ltr block text-left text-[10px]">{selectedDevice.mappingVersion}</span></div>
              </div>
            </Panel>
          </div>
        </section>

        <footer className="grid gap-3 border border-command-line bg-command-panel p-4 text-xs leading-6 text-command-muted md:grid-cols-4">
          <p><ShieldCheck className="ml-2 inline h-4 w-4 text-command-accent" /><strong className="text-command-text">الثقة:</strong> القراءة تبقى reported ولا تتحول إلى verified تلقائيًا.</p>
          <p><Database className="ml-2 inline h-4 w-4 text-command-accent" /><strong className="text-command-text">الحقيقة:</strong> Stage 3D append-only هو المسار القانوني.</p>
          <p><CloudOff className="ml-2 inline h-4 w-4 text-command-amber" /><strong className="text-command-text">الاتصال:</strong> لا Backend ولا MQTT/HTTP حي ولا Vendor SDK.</p>
          <p><Gauge className="ml-2 inline h-4 w-4 text-command-amber" /><strong className="text-command-text">الذكاء:</strong> لا AI ولا تنبؤ ولا تحكم بالأجهزة في هذه المرحلة.</p>
        </footer>
      </div>
    </div>
  );
}

export function IoTIntegrationWorkspace() {
  const [source, setSource] = useState<'local-simulator' | 'local-gateway'>('local-simulator');
  const [gatewayUrl] = useState(() => localGatewayUrlFromSearch(window.location.search));
  const stage3f2Status = stage3f2PilotStatusText();

  return (
    <div lang="ar" dir="rtl" className="flex min-h-0 flex-1 flex-col bg-command-bg">
      <section data-testid="iot-data-source-selector" dir="rtl" className="border-b border-command-line bg-command-panel px-4 py-3">
        <div className="mx-auto flex w-full max-w-[2560px] flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm font-semibold text-command-text">مصدر بيانات IoT</p><p className="mt-1 text-xs text-command-muted">اختيار المشغل صريح؛ لا تُدمج الحالات ولا يحدث fallback تلقائي.</p></div>
          <div className="flex rounded border border-command-line p-1">
            <button data-testid="iot-source-simulator" type="button" aria-pressed={source === 'local-simulator'} onClick={() => setSource('local-simulator')} className={`command-preset-button ${source === 'local-simulator' ? 'command-preset-button-active' : ''}`}>المحاكاة المحلية</button>
            <button data-testid="iot-source-gateway" type="button" aria-pressed={source === 'local-gateway'} onClick={() => setSource('local-gateway')} className={`command-preset-button ${source === 'local-gateway' ? 'command-preset-button-active' : ''}`}>البوابة المحلية الدائمة</button>
          </div>
        </div>
        <div className="mx-auto mt-3 w-full max-w-[2560px]">
          <p data-testid="stage-3f2-status-banner" className="rounded border border-command-amber/50 bg-command-amber/5 px-3 py-2 text-xs text-command-muted">STAGE_3F2_STATUS={stage3f2Status} · القالب الآمن فقط، لا مصدر حقيقي متصل بعد.</p>
        </div>
      </section>
      {source === 'local-simulator' ? <LocalSimulatorIoTWorkspace /> : <LocalGatewayIoTWorkspace baseUrl={gatewayUrl} />}
    </div>
  );
}
