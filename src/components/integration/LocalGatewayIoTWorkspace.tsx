import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Database,
  Gauge,
  MapPinned,
  Radio,
  RefreshCw,
  ShieldCheck,
  WifiOff
} from 'lucide-react';
import { LocalGatewayIoTDataSource } from '../../services/iotDataSource';
import { stage3f2PilotTemplate, stage3f2PilotStatusText, validateStage3F2SourceManifest } from '../../services/stage3f2SourcePilot';
import type { GatewayConnectionState, GatewayHealth, GatewaySseEvent } from '../../services/iotGatewayClient';
import { useEventStore } from '../../store/useEventStore';
import { projectScopedStreams } from '../../services/projectScopedStreams';
import type { IoTDeviceRegistryRecord, IoTObservation } from '../../types/iot';
import { Panel } from '../shared/Panel';
import { LoadingState } from '../shared/StateBlocks';

type GatewayWorkspaceState =
  | 'connecting'
  | 'ready'
  | 'degraded'
  | 'disconnected'
  | 'authentication-rejected'
  | 'restart-recovered'
  | 'quarantine'
  | 'sse-reconnecting'
  | 'unavailable';

const numberFormatter = new Intl.NumberFormat('ar-SA');

function statePresentation(state: GatewayWorkspaceState): { label: string; className: string } {
  switch (state) {
    case 'connecting': return { label: 'جارٍ الاتصال بالبوابة المحلية', className: 'status-warning' };
    case 'ready': return { label: 'جاهزة', className: 'status-normal' };
    case 'degraded': return { label: 'متراجعة', className: 'status-warning' };
    case 'disconnected': return { label: 'منقطعة', className: 'status-critical' };
    case 'authentication-rejected': return { label: 'تم رفض توثيق مصدر', className: 'status-critical' };
    case 'restart-recovered': return { label: 'استُعيدت البيانات بعد إعادة التشغيل', className: 'status-information' };
    case 'quarantine': return { label: 'توجد قراءة محجورة للمراجعة', className: 'status-warning' };
    case 'sse-reconnecting': return { label: 'تجري إعادة اتصال SSE', className: 'status-information' };
    case 'unavailable': return { label: 'البوابة غير متاحة', className: 'status-critical' };
  }
}

function sseConnectionPresentation(state: GatewayConnectionState): { label: string; className: string } {
  switch (state) {
    case 'connecting': return { label: 'SSE: جارٍ الاتصال', className: 'status-warning' };
    case 'ready': return { label: 'SSE: متصل', className: 'status-normal' };
    case 'reconnecting': return { label: 'SSE: إعادة اتصال', className: 'status-information' };
    case 'disconnected': return { label: 'SSE: منقطع', className: 'status-critical' };
  }
}

function valueLabel(observation: IoTObservation): string {
  if (typeof observation.value === 'boolean') return observation.value ? 'نعم' : 'لا';
  if (typeof observation.value === 'number') return `${numberFormatter.format(observation.value)}${observation.unit ? ` ${observation.unit}` : ''}`;
  return observation.value;
}

function GatewaySpatialPreview({ device, mode }: { device: IoTDeviceRegistryRecord; mode: '2d' | '3d' }) {
  const entityId = device.spatialBinding.entityId;
  if (mode === '2d') {
    return (
      <div data-testid="gateway-spatial-2d" className="command-spatial-2d-stage relative h-56 overflow-hidden rounded border border-command-line">
        <div className="absolute inset-4 grid grid-cols-3 gap-2 opacity-70">
          {Array.from({ length: 9 }, (_, index) => <div key={index} className="rounded border border-command-line bg-command-panelStrong/70" />)}
        </div>
        <div className="command-spatial-2d-glow absolute inset-0" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <span className="mx-auto block h-5 w-5 rounded-full border-4 border-command-accent/30 bg-command-accent" />
          <span className="command-spatial-id ltr mt-3 block rounded border border-command-accent/50 px-2 py-1 text-[10px] text-command-accent">{entityId}</span>
        </div>
      </div>
    );
  }
  return (
    <div data-testid="gateway-spatial-3d" className="command-spatial-3d-stage relative h-56 overflow-hidden rounded border border-command-line [perspective:700px]">
      <div className="command-spatial-floor absolute left-1/2 top-1/2 h-32 w-52 -translate-x-1/2 -translate-y-1/2 border border-command-accent/50 bg-command-accent/5 [transform:translate(-50%,-50%)_rotateX(58deg)_rotateZ(-18deg)]">
        <div className="absolute inset-3 border border-command-line" />
        <div className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-command-accent/30 bg-command-accent" />
      </div>
      <div className="command-spatial-id absolute bottom-3 left-3 right-3 flex items-center justify-between rounded border border-command-line px-3 py-2 text-[10px]">
        <span className="text-command-muted">ربط منطقي محلي — لا هندسة معتمدة</span>
        <span className="ltr text-command-accent">{entityId}</span>
      </div>
    </div>
  );
}

export function LocalGatewayIoTWorkspace({ baseUrl }: { baseUrl: string }) {
  const [source] = useState(() => new LocalGatewayIoTDataSource(baseUrl));
  const [health, setHealth] = useState<GatewayHealth | null>(null);
  const [devices, setDevices] = useState<IoTDeviceRegistryRecord[]>([]);
  const [observations, setObservations] = useState<IoTObservation[]>([]);
  const [quarantine, setQuarantine] = useState<Awaited<ReturnType<typeof source.client.quarantine>>>([]);
  const [state, setState] = useState<GatewayWorkspaceState>('connecting');
  const [sseConnection, setSseConnection] = useState<GatewayConnectionState>('connecting');
  const [lastOutcome, setLastOutcome] = useState<GatewaySseEvent | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [spatialMode, setSpatialMode] = useState<'2d' | '3d'>('2d');
  const [refreshRequest, setRefreshRequest] = useState(0);
  const seenNotifications = useRef(new Set<string>());
  const selectEntity = useEventStore((store) => store.selectEntity);
  const selectedEntityId = useEventStore((store) => store.selectedEntityId);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [nextHealth, nextDevices, nextObservations, nextQuarantine] = await Promise.all([
          source.client.health(),
          source.client.devices(),
          source.client.observations(),
          source.client.quarantine()
        ]);
        if (!active) return;
        setHealth(nextHealth);
        setDevices(nextDevices);
        setObservations(nextObservations);
        setQuarantine(nextQuarantine);
        setSelectedDeviceId((current) => current ?? nextDevices[0]?.deviceId ?? null);
        if (!nextHealth.ready) setState('degraded');
        else if (nextHealth.restartRecovered) setState('restart-recovered');
        else if (nextQuarantine.length > 0) setState('quarantine');
        else setState('ready');
      } catch {
        if (!active) return;
        setHealth(null);
        setState('unavailable');
      }
    })();
    return () => { active = false; };
  }, [refreshRequest, source]);

  useEffect(() => {
    let active = true;
    const disconnect = source.client.events((message) => {
      if (!active || seenNotifications.current.has(message.notificationId)) return;
      seenNotifications.current.add(message.notificationId);
      setLastOutcome(message);
      if (message.outcome === 'rejected-authentication') setState('authentication-rejected');
      else if (message.outcome === 'conflict-quarantined' || message.outcome === 'stale-quarantined') {
        setState('quarantine');
        void source.client.quarantine().then(setQuarantine).catch(() => setState('unavailable'));
      } else if (message.outcome === 'accepted-reported') {
        void source.client.observations().then(setObservations).catch(() => setState('unavailable'));
      }
    }, (connectionState: GatewayConnectionState) => {
      if (!active) return;
      setSseConnection(connectionState);
      if (connectionState === 'reconnecting') {
        // Before the first healthy response, keep the explicit unavailable
        // boundary visible instead of implying that a known gateway is recovering.
        setState((current) => current === 'unavailable' ? current : 'sse-reconnecting');
      }
      if (connectionState === 'disconnected') setState('disconnected');
      if (connectionState === 'ready') setState((current) => current === 'unavailable' ? current : 'ready');
    });
    const unregisterProjectStream = projectScopedStreams.register(disconnect);
    return () => {
      active = false;
      unregisterProjectStream();
      disconnect();
    };
  }, [source]);

  const selectedDevice = (selectedEntityId
    ? devices.find((device) => device.spatialBinding.entityId === selectedEntityId)
    : undefined) ?? devices.find((device) => device.deviceId === selectedDeviceId) ?? devices[0] ?? null;
  const presentation = statePresentation(state);
  const ssePresentation = sseConnectionPresentation(sseConnection);
  const lastKnown = observations.at(-1) ?? null;
  const stage3f2Validation = validateStage3F2SourceManifest(stage3f2PilotTemplate);
  const stage3f2Status = stage3f2PilotStatusText();

  if (state === 'connecting' && !health && devices.length === 0) {
    return <div data-testid="iot-workspace-loading" className="flex min-h-0 flex-1 items-center justify-center p-6" dir="rtl"><LoadingState title="جارٍ الاتصال بالبوابة المحلية" message="لا يوجد تحويل إلى بيانات المحاكاة أثناء الانتظار." /></div>;
  }

  return (
    <div data-testid="iot-workspace" data-context="temporary-demo" data-network="http-sse" className="min-h-0 flex-1 overflow-y-auto command-scrollbar" lang="ar" dir="rtl">
      <div className="mx-auto w-full max-w-[2560px] space-y-4 p-4">
        <header className="sticky top-0 z-30 border border-command-line bg-command-panel/95 p-4 shadow-command backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Database className="h-5 w-5 text-command-accent" aria-hidden="true" />
                <h2 className="text-xl font-semibold text-command-text">بوابة إنترنت الأشياء المحلية</h2>
                <span data-testid="iot-gateway-status" className={`rounded border px-2 py-1 text-xs font-semibold ${presentation.className}`}>{presentation.label}</span>
                <span data-testid="iot-gateway-sse-connection" className={`rounded border px-2 py-1 text-xs font-semibold ${ssePresentation.className}`}>{ssePresentation.label}</span>
              </div>
              <p data-testid="iot-gateway-ready-label" className="mt-2 text-sm leading-7 text-command-muted">بوابة محلية دائمة — لا يوجد جهاز خارجي متصل</p>
              <p className="mt-1 text-xs leading-6 text-command-muted">مصدر HTTP/SSE محلي فقط؛ كل Telemetry مقبولة تبقى مُبلّغة وغير متحققة ولا تغير الجاهزية أو القرار أو الإسقاط المتحقق.</p>
            </div>
            <button data-testid="iot-gateway-refresh" type="button" onClick={() => { setState('connecting'); setRefreshRequest((current) => current + 1); }} className="command-button"><RefreshCw className="ml-2 h-4 w-4" aria-hidden="true" />تحديث الحالة</button>
          </div>
          {state === 'unavailable' ? <p data-testid="iot-gateway-unavailable" className="mt-3 rounded border border-command-red/50 bg-command-red/10 p-3 text-sm text-command-red">البوابة المحلية غير متاحة — لم يتم التحويل إلى بيانات المحاكاة</p> : null}
          {state === 'sse-reconnecting' ? <p data-testid="iot-gateway-sse-reconnecting" className="mt-3 rounded border border-command-severity-information/50 bg-command-severity-information/10 p-3 text-sm text-command-severity-information">تجري إعادة اتصال SSE؛ ستُعاد الرسائل بأمان مع إزالة التكرار في المتصفح.</p> : null}
          {state === 'authentication-rejected' ? <p data-testid="iot-gateway-auth-rejected" className="mt-3 rounded border border-command-red/50 bg-command-red/10 p-3 text-sm text-command-red">رُفض توثيق مصدر محلي؛ لم تُقبل أي قراءة أو حدث تشغيلي.</p> : null}
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Metric label="أجهزة السجل" value={numberFormatter.format(devices.length)} note="إصدارات دائمة محلية" />
          <Metric label="ملاحظات مُبلّغة" value={numberFormatter.format(observations.length)} note="غير متحققة" />
          <Metric label="محجور للمراجعة" value={numberFormatter.format(quarantine.length)} note="لا يغير آخر قراءة" />
          <Metric label="Outbox معلّق" value={numberFormatter.format(health?.transactionalOutbox.pending ?? 0)} note="تسليم at-least-once" />
          <Metric label="إسقاط متحقق" value="٠" note="محمي من Telemetry الخام" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[320px_minmax(560px,1fr)_390px]">
          <div className="space-y-4">
            <Panel title="سجل الأجهزة الدائم" eyebrow="Registry revisions">
              <div data-testid="iot-gateway-device-registry" className="space-y-2">
                {devices.length ? devices.map((device) => (
                  <button key={device.deviceId} data-testid={`iot-gateway-device-${device.deviceId}`} type="button" onClick={() => { selectEntity(device.spatialBinding.entityId); setSelectedDeviceId(device.deviceId); }} className={`w-full rounded border p-3 text-right transition ${selectedDevice?.deviceId === device.deviceId ? 'border-command-accent bg-command-accent/10' : 'border-command-line bg-command-panelStrong hover:border-command-accent'}`}>
                    <span className="block text-sm font-semibold text-command-text">{device.nameAr}</span>
                    <span className="ltr mt-1 block text-left text-[10px] text-command-muted">{device.deviceId}</span>
                  </button>
                )) : <p className="rounded border border-dashed border-command-line p-4 text-center text-sm text-command-muted">قاعدة البيانات الدائمة فارغة؛ لم تُقبل أي قراءة بعد.</p>}
              </div>
            </Panel>
            <Panel title="ضمان المصدر" eyebrow="Local-only boundary">
              <div className="space-y-3 text-xs leading-6 text-command-muted">
                <p><ShieldCheck className="ml-2 inline h-4 w-4 text-command-accent" />المتصفح لا يحمل سر المصدر ولا يتصل بقاعدة SQLite.</p>
                <p><WifiOff className="ml-2 inline h-4 w-4 text-command-amber" />لا يوجد جهاز خارجي أو Broker أو تغذية حية.</p>
                <p><Gauge className="ml-2 inline h-4 w-4 text-command-amber" />وقت البوابة local-untrusted وليس وقتًا سلطويًا.</p>
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="تقييم المصدر الخارجي" eyebrow="Stage 3F.2 readiness">
              <div data-testid="stage-3f2-external-source-pilot" className="space-y-3 text-xs leading-6 text-command-muted">
                <div data-testid="stage-3f2-manifest-state" className="rounded border border-command-line bg-command-panelStrong p-3">
                  <p className="text-sm font-semibold text-command-text">مصدر تجريبي خارجي</p>
                  <p className="mt-1">حالة manifest: <span className="text-command-amber">مفقود — لم يُدخل مصدر معتمد</span></p>
                  <p>اسم المصدر: <span className="text-command-text">غير محدد</span></p>
                  <p>نوع المصدر: <span className="text-command-text">غير محدد</span></p>
                  <p>المنطقة المرتبطة: <span className="text-command-text">غير محددة قبل manifest معتمد</span></p>
                  <p>ثقة ساعة المصدر: <span className="text-command-text">غير متحقق</span></p>
                  <p>آخر وقت رصد: <span className="text-command-text">غير متاح</span></p>
                  <p>آخر وقت استقبال: <span className="text-command-text">غير متاح</span></p>
                  <p>حداثة البيانات: <span className="text-command-text">غير قابلة للقياس قبل الاتصال الحقيقي</span></p>
                  <p>جودة البيانات: <span className="text-command-text">بيانات مُبلّغ عنها وغير متحققة</span></p>
                  <p>حالة الربط المكاني: <span className="text-command-text">لا ربط منطقي قبل manifest معتمد</span></p>
                  <p>حالة الاحتفاظ: <span className="text-command-text">غير محددة قبل manifest معتمد</span></p>
                </div>
                <div data-testid="stage-3f2-missing-requirements" className="rounded border border-command-amber/50 bg-command-amber/5 p-3">
                  <p className="font-semibold text-command-amber">STAGE_3F2_STATUS={stage3f2Status}</p>
                  <p className="mt-1 text-command-muted">البيانات الحقيقية غير متاحة بعد؛ القالب الآمن فقط يعرض متطلبات الربط.</p>
                  <ul className="mt-2 space-y-1 text-command-muted">
                    {stage3f2Validation.blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}
                  </ul>
                </div>
                <div data-testid="stage-3f2-privacy-boundary" className="rounded border border-command-line bg-command-panelStrong p-3">
                  <p className="font-semibold text-command-text">حدود الخصوصية</p>
                  <p>لا فيديو خام ولا معرفات شخصية أو بيومترية أو تتبع أجهزة فردية.</p>
                </div>
                <div data-testid="stage-3f2-gateway-relationship" className="rounded border border-command-line bg-command-panelStrong p-3">
                  <p className="font-semibold text-command-text">علاقة البوابة</p>
                  <p>عند اعتماد المصدر، تمر الملاحظات عبر البوابة المحلية الدائمة فقط؛ لا مسار إدخال ثانٍ ولا fallback إلى المحاكاة.</p>
                </div>
                <div data-testid="stage-3f2-truth-boundary" className="rounded border border-command-line bg-command-panelStrong p-3">
                  <p className="font-semibold text-command-text">حدود الحقيقة</p>
                  <p>أي Telemetry مستقبلية تبقى بيانات مُبلّغ عنها وغير متحققة، ولا تغيّر baseline أو الإسقاط المتحقق أو القرار المعتمد.</p>
                </div>
              </div>
            </Panel>
            <Panel title="تدفق Telemetry الدائم" eyebrow={`${observations.length} ملاحظة محفوظة`}>
              <div data-testid="iot-gateway-telemetry" className="max-h-96 space-y-2 overflow-y-auto command-scrollbar">
                {observations.length ? [...observations].reverse().map((observation) => (
                  <div key={observation.observationId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded border border-command-line bg-command-panelStrong p-3 text-xs">
                    <div className="min-w-0"><p className="font-semibold text-command-text">{observation.streamId}</p><p className="ltr mt-1 truncate text-left text-[10px] text-command-muted">{observation.observationId}</p><p className="mt-1 text-command-muted">وقت البوابة: <span className="ltr">{observation.platformReceivedAt}</span></p></div>
                    <div className="text-left"><p className="text-lg font-semibold text-command-accent">{valueLabel(observation)}</p><p className="mt-1 text-[10px] text-command-muted">reported · seq {observation.sequence}</p></div>
                  </div>
                )) : <p data-testid="iot-gateway-empty" className="rounded border border-dashed border-command-line p-6 text-center text-sm text-command-muted">قاعدة البيانات الدائمة فارغة؛ لا توجد قراءة مُبلّغة بعد.</p>}
              </div>
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="آخر قراءة محفوظة" eyebrow="Last-known data">
                <div data-testid="iot-gateway-last-known" className="text-xs leading-6 text-command-muted">
                  {lastKnown ? <><p className="font-semibold text-command-text">{valueLabel(lastKnown)}</p><p className="ltr mt-1 text-left">{lastKnown.observationId}</p><p className="mt-2">ليست حالة متحققة أو قرارًا أو أساسًا تشغيليًا.</p></> : <p>لا توجد بيانات محفوظة بعد.</p>}
                </div>
              </Panel>
              <Panel title="آخر نتيجة مصدر" eyebrow="Sanitized SSE">
                <div data-testid="iot-gateway-last-outcome" className="text-xs leading-6 text-command-muted">
                  {lastOutcome ? <><p className="font-semibold text-command-text">{lastOutcome.messageAr}</p><p className="ltr mt-1 text-left">{lastOutcome.outcome}</p></> : <p>بانتظار رسالة SSE محلية.</p>}
                </div>
              </Panel>
            </div>

            <Panel title="الحجر والمراجعة" eyebrow="Quarantine">
              <div data-testid="iot-gateway-quarantine" className="space-y-2">
                {quarantine.length ? quarantine.map((record) => <div key={record.quarantineId} className="rounded border border-command-amber/50 bg-command-amber/5 p-3 text-xs"><div className="flex justify-between gap-2"><span className="text-command-amber">{record.reason === 'stale-quarantined' ? 'قراءة قديمة محجورة' : 'تعارض محجور'}</span><span className="ltr text-command-muted">{record.observation.observationId}</span></div><p className="mt-2 text-command-muted">لا يوجد حدث تشغيلي مقبول لهذه القراءة.</p></div>) : <p className="text-sm text-command-muted">لا توجد سجلات محجورة.</p>}
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="تفاصيل الربط المكاني" eyebrow="Same entity in 2D + 3D">
              {selectedDevice ? <div data-testid="iot-gateway-spatial-link" data-entity-id={selectedDevice.spatialBinding.entityId} className="space-y-3">
                <div className="flex items-center justify-between gap-2"><span className="ltr text-xs text-command-muted">{selectedDevice.spatialBinding.entityId}</span><div className="flex rounded border border-command-line p-1"><button data-testid="iot-gateway-spatial-2d" type="button" onClick={() => setSpatialMode('2d')} className={`command-preset-button ${spatialMode === '2d' ? 'command-preset-button-active' : ''}`}>2D</button><button data-testid="iot-gateway-spatial-3d" type="button" onClick={() => setSpatialMode('3d')} className={`command-preset-button ${spatialMode === '3d' ? 'command-preset-button-active' : ''}`}>3D</button></div></div>
                <GatewaySpatialPreview device={selectedDevice} mode={spatialMode} />
                <button type="button" onClick={() => selectEntity(selectedDevice.spatialBinding.entityId)} className="command-button w-full"><MapPinned className="ml-2 h-4 w-4" />تحديد العنصر المنطقي</button>
              </div> : <p className="text-sm text-command-muted">لا يوجد جهاز لعرض الربط المكاني.</p>}
            </Panel>
            <Panel title="حدود الحقيقة" eyebrow="Stage 3D path">
              <div className="space-y-3 text-xs leading-6 text-command-muted"><p><Radio className="ml-2 inline h-4 w-4 text-command-accent" />القبول ينشئ ملاحظة `reported` وحدثًا append-only فقط.</p><p><AlertTriangle className="ml-2 inline h-4 w-4 text-command-amber" />التعارض والقدم يبقيان في الحجر ولا ينتجان حدثًا مقبولًا.</p><p><CloudOff className="ml-2 inline h-4 w-4 text-command-amber" />لا يوجد fallback صامت إلى المحاكاة عند انقطاع البوابة.</p></div>
            </Panel>
          </div>
        </section>

        <footer className="grid gap-3 border border-command-line bg-command-panel p-4 text-xs leading-6 text-command-muted md:grid-cols-3"><p><CheckCircle2 className="ml-2 inline h-4 w-4 text-command-accent" />السجل الدائم قابل للاستعادة بعد إعادة العملية.</p><p><Database className="ml-2 inline h-4 w-4 text-command-accent" />SQLite محلي قابل للاستبدال بمنفذ PostgreSQL لاحقًا.</p><p><ShieldCheck className="ml-2 inline h-4 w-4 text-command-accent" />لا يمثل هذا توثيق إنتاج أو اتصال جهاز حقيقي.</p></footer>
      </div>
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="command-card p-3"><p className="text-xs text-command-muted">{label}</p><p className="mt-1 text-2xl font-semibold text-command-text">{value}</p><p className="mt-1 text-[11px] leading-5 text-command-muted">{note}</p></div>;
}
