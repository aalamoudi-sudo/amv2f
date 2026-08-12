import {
  AlertTriangle,
  BadgeCheck,
  Box,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  List,
  Map,
  RefreshCw,
  Route,
  ShieldAlert,
  Target,
  UserRound
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { statusConfig } from '../../data/statuses';
import { getZoneDependencyImpacts, getZoneRouteImpacts } from '../../services/zoneReadinessImpact';
import { prioritizeReadinessRecords } from '../../services/readinessPriority';
import { getZoneReadinessMetrics } from '../../services/zoneReadinessMetrics';
import { getReadinessCompletenessPercentage, validateZoneReadinessDataset } from '../../services/zoneReadinessValidation';
import { selectRuntimeRoutes, useEventStore, type ZoneReadinessUpdate } from '../../store/useEventStore';
import type {
  ApprovalStatus,
  ReadinessConfidence,
  ZoneReadinessRecord,
  SpatialEntityRecord
} from '../../types/spatial';
import type { RouteDefinition } from '../../types/routes';
import { formatPercent } from '../../utils/format';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { EmptyState, ErrorState } from '../shared/StateBlocks';
import { Panel } from '../shared/Panel';
import { EventSceneViewport } from '../../three/scene/EventSceneViewport';
import { ReadinessPlan2D } from './ReadinessPlan2D';

type ReadinessView = 'list' | 'plan' | 'scene';

const approvalLabels: Record<ApprovalStatus, string> = {
  draft: 'مسودة',
  submitted: 'مرفوعة للمراجعة',
  'under-review': 'قيد المراجعة',
  approved: 'معتمدة',
  rejected: 'مرفوضة',
  expired: 'منتهية الصلاحية'
};

const contextLabels: Record<ZoneReadinessRecord['stateContext'], string> = {
  'temporary-demo': 'بيانات تجريبية مؤقتة',
  baseline: 'حالة أساسية محلية',
  scenario: 'حالة سيناريو'
};

const confidenceLabels: Record<ReadinessConfidence, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية'
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'غير صالح';
  return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatDateInput(value: string): string {
  return value.slice(0, 10);
}

function impactLabel(level: ZoneReadinessRecord['openingImpact']): string {
  return { none: 'لا يوجد', low: 'منخفض', medium: 'متوسط', high: 'مرتفع' }[level];
}

export function ReadinessWorkspace() {
  const entities = useEventStore((state) => state.entities);
  const routes = useEventStore(selectRuntimeRoutes);
  const records = useEventStore((state) => state.zoneReadiness);
  const selectedEntityId = useEventStore((state) => state.selectedEntityId);
  const errorMessage = useEventStore((state) => state.errorMessage);
  const selectEntity = useEventStore((state) => state.selectEntity);
  const resetDemoData = useEventStore((state) => state.resetDemoData);
  const [view, setView] = useState<ReadinessView>('list');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const now = useMemo(() => new Date(), []);
  const priorityRecords = useMemo(() => prioritizeReadinessRecords(records, now), [now, records]);
  const metrics = useMemo(() => getZoneReadinessMetrics(records, now), [now, records]);
  const knownZoneIds = useMemo(() => records.map((record) => record.zoneId), [records]);
  const validation = useMemo(
    () => validateZoneReadinessDataset(records, knownZoneIds, { targetStateContext: 'baseline', now }),
    [knownZoneIds, now, records]
  );
  const selectedRecord = records.find((record) => record.zoneId === selectedEntityId) ?? priorityRecords[0]?.record;

  return (
    <div data-testid="readiness-workspace" className="min-h-0 flex-1 overflow-y-auto command-scrollbar">
      <div className="mx-auto w-full max-w-[1920px] space-y-4 p-4">
        <header className="flex flex-wrap items-start justify-between gap-4 border border-command-line bg-command-panel p-4 shadow-command">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-command-accent" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-command-text">جاهزية المناطق</h2>
              <span className="rounded border border-command-amber/70 bg-command-amber/10 px-2 py-1 text-[11px] text-command-amber">
                بيانات تجريبية مؤقتة
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-command-muted">
              حزمة تحقق محلية للإجابة عن المناطق التي تحتاج تدخلاً أو تصعيداً الآن. ليست مصدراً موثوقاً للجاهزية ولا نظام اعتماد متعدد المستخدمين.
            </p>
          </div>
          <button
            data-testid="readiness-reset-demo-open"
            type="button"
            onClick={() => setResetDialogOpen(true)}
            className="command-button"
            title="إعادة بيانات الجاهزية التجريبية"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            إعادة بيانات العرض
          </button>
        </header>

        <Panel title="ملخص الجاهزية التنفيذي" eyebrow="استناداً إلى بيانات تجريبية مؤقتة">
          <ReadinessMetricGrid metrics={metrics} />
        </Panel>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.75fr)]">
          <Panel title="طابور التدخل" eyebrow="قواعد أولوية شفافة محلية">
            <ReadinessInterventionQueue
              priorityRecords={priorityRecords}
              selectedEntityId={selectedEntityId}
              onSelect={(zoneId) => selectEntity(zoneId)}
            />
          </Panel>
          <Panel title="الثقة واكتمال البيانات" eyebrow="لا تخفي النسبة جودة الدليل">
            <ReadinessTrustPanel records={records} validationIssues={validation.issues.length} />
          </Panel>
        </div>

        <Panel
          title="مساحة التشغيل"
          eyebrow="قائمة تشغيلية ومخطط ثنائي الأبعاد ومشهد ثلاثي الأبعاد"
          action={<ReadinessViewSwitcher view={view} onChange={setView} />}
        >
          {view === 'list' ? (
            <ReadinessZoneTable
              priorityRecords={priorityRecords}
              selectedEntityId={selectedEntityId}
              onSelect={(zoneId) => selectEntity(zoneId)}
            />
          ) : null}
          {view === 'plan' ? (
            <ReadinessPlan2D
              records={records}
              entities={entities}
              routes={routes}
              selectedEntityId={selectedEntityId}
              onSelectEntity={(zoneId) => selectEntity(zoneId)}
            />
          ) : null}
          {view === 'scene' ? (
            <div data-testid="readiness-3d-view" className="overflow-hidden border border-command-line bg-command-panelStrong">
              <EventSceneViewport className="h-[520px] xl:h-[620px]" />
            </div>
          ) : null}
        </Panel>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Panel title="تفاصيل المنطقة المحددة" eyebrow="عقد الجاهزية المحلي">
            <ReadinessDetails key={selectedRecord?.zoneId ?? 'none'} record={selectedRecord} records={records} routes={routes} />
          </Panel>
          <Panel title="قرار الجاهزية اليوم" eyebrow="قرار مشروط بسلامة البيانات">
            <ReadinessDecisionSummary priorityRecords={priorityRecords} entities={entities} />
          </Panel>
        </div>

        {errorMessage ? (
          <div data-testid="readiness-global-error">
            <ErrorState title="تعذر حفظ التعديل" message={errorMessage} />
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={resetDialogOpen}
        title="إعادة بيانات الجاهزية التجريبية"
        message="سيتم حذف التعديلات المحلية وإعادة سجلات المناطق الثماني إلى بيانات العرض التجريبية. لا يوجد سجل تدقيق خارجي في هذه المرحلة."
        confirmLabel="إعادة البيانات"
        cancelLabel="إلغاء"
        onCancel={() => setResetDialogOpen(false)}
        onConfirm={() => {
          resetDemoData();
          setResetDialogOpen(false);
        }}
      />
    </div>
  );
}

function ReadinessMetricGrid({ metrics }: { metrics: ReturnType<typeof getZoneReadinessMetrics> }) {
  const items = [
    ['إجمالي المناطق', metrics.totalZones, ClipboardCheck],
    ['جاهزة', metrics.readyZones, CheckCircle2],
    ['تحتاج تدخلاً', metrics.interventionZones, AlertTriangle],
    ['متأخرة', metrics.delayedZones, CalendarClock],
    ['معتمدة', metrics.approvedZones, BadgeCheck],
    ['تفتقد دليلاً', metrics.missingEvidenceZones, FileCheck2],
    ['ثقة منخفضة', metrics.lowConfidenceZones, ShieldAlert],
    ['تؤثر على الافتتاح', metrics.openingImpactZones, Target],
    ['تؤثر على مسار الزوار', metrics.visitorRouteImpactZones, Route],
    ['إجراءات متأخرة', metrics.overdueActions, CalendarClock],
    ['اكتمال البيانات', `${metrics.dataCompletenessPercentage}%`, FileCheck2],
    ['تغطية الاعتماد', `${metrics.approvalCoveragePercentage}%`, BadgeCheck]
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4 2xl:grid-cols-6" aria-label="مؤشرات جاهزية المناطق">
      {items.map(([label, value, Icon]) => (
        <div key={label} className="min-h-[78px] rounded border border-command-line bg-command-panelStrong p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] leading-5 text-command-muted">{label}</p>
            <Icon className="h-4 w-4 text-command-accent" aria-hidden="true" />
          </div>
          <p className="mt-1 text-2xl font-semibold text-command-text">{value}</p>
        </div>
      ))}
    </div>
  );
}

function ReadinessInterventionQueue({
  priorityRecords,
  selectedEntityId,
  onSelect
}: {
  priorityRecords: ReturnType<typeof prioritizeReadinessRecords>;
  selectedEntityId: string | null;
  onSelect: (zoneId: ZoneReadinessRecord['zoneId']) => void;
}) {
  return (
    <div data-testid="readiness-intervention-queue" className="space-y-2">
      {priorityRecords.slice(0, 5).map(({ record, priority }, index) => {
        const status = statusConfig[record.status];
        const selected = selectedEntityId === record.zoneId;
        return (
          <button
            key={record.zoneId}
            type="button"
            data-testid={`readiness-queue-item-${record.zoneId}`}
            onClick={() => onSelect(record.zoneId)}
            className={`w-full rounded border p-3 text-right transition ${selected ? 'border-command-accent bg-command-accent/10' : 'border-command-line bg-command-panelStrong hover:border-command-accent/70'}`}
            aria-pressed={selected}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-command-line text-sm font-semibold text-command-accent">{index + 1}</span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-command-text">{record.zoneId} · {status.labelAr}</p>
                  <p className="mt-1 text-xs text-command-muted">{priority.explanationAr}</p>
                </div>
              </div>
              <span className="ltr shrink-0 text-lg font-semibold text-command-amber">{priority.score}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ReadinessTrustPanel({ records, validationIssues }: { records: ZoneReadinessRecord[]; validationIssues: number }) {
  const checks = [
    ['مصدر صالح', records.filter((record) => record.source.trim()).length],
    ['مالك للحالة', records.filter((record) => record.owner.trim()).length],
    ['دليل منظم', records.filter((record) => record.evidence.length > 0).length],
    ['حالة اعتماد', records.filter((record) => record.approvalStatus === 'approved').length],
    ['تحديث زمني', records.filter((record) => Number.isFinite(Date.parse(record.updatedAt))).length],
    ['ثقة عالية', records.filter((record) => record.confidence === 'high').length],
    ['عقد غير مكتمل', records.filter((record) => getReadinessCompletenessPercentage(record) < 100).length]
  ];

  return (
    <div data-testid="readiness-trust-panel" className="space-y-2.5">
      {checks.map(([label, count]) => (
        <div key={label} className="flex items-center justify-between gap-3 border-b border-command-line/70 pb-2 text-sm">
          <span className="text-command-muted">{label}</span>
          <span className="ltr font-semibold text-command-text">{count} / {records.length}</span>
        </div>
      ))}
      <div className={`rounded border p-3 text-xs leading-6 ${validationIssues ? 'border-command-amber/70 bg-command-amber/10 text-command-amber' : 'border-command-accent/60 bg-command-accent/10 text-command-accent'}`}>
        {validationIssues ? `تم رصد ${validationIssues} ملاحظة تحقق؛ لا تعني نسبة الجاهزية وحدها أن السجل صالح للاعتماد.` : 'لا توجد ملاحظات تحقق في السجلات الحالية.'}
      </div>
    </div>
  );
}

function ReadinessViewSwitcher({ view, onChange }: { view: ReadinessView; onChange: (view: ReadinessView) => void }) {
  const items: Array<{ id: ReadinessView; label: string; icon: typeof List; testId: string }> = [
    { id: 'list', label: 'قائمة تشغيلية', icon: List, testId: 'readiness-view-list' },
    { id: 'plan', label: 'مخطط ثنائي الأبعاد', icon: Map, testId: 'readiness-view-plan' },
    { id: 'scene', label: 'مشهد ثلاثي الأبعاد', icon: Box, testId: 'readiness-view-3d' }
  ];
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="طرق عرض الجاهزية">
      {items.map(({ id, label, icon: Icon, testId }) => (
        <button
          key={id}
          type="button"
          data-testid={testId}
          onClick={() => onChange(id)}
          className={`command-button min-h-9 px-2.5 text-xs ${view === id ? 'command-button-primary' : ''}`}
          aria-pressed={view === id}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}

function ReadinessZoneTable({
  priorityRecords,
  selectedEntityId,
  onSelect
}: {
  priorityRecords: ReturnType<typeof prioritizeReadinessRecords>;
  selectedEntityId: string | null;
  onSelect: (zoneId: ZoneReadinessRecord['zoneId']) => void;
}) {
  if (priorityRecords.length === 0) {
    return <EmptyState title="لا توجد مناطق" message="لا توجد سجلات جاهزية تجريبية لعرضها." />;
  }

  return (
    <div data-testid="readiness-zone-table" className="overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse text-right text-sm">
        <thead>
          <tr className="border-b border-command-line text-xs text-command-muted">
            <th className="px-3 py-3 font-semibold">المنطقة</th>
            <th className="px-3 py-3 font-semibold">الجاهزية والثقة</th>
            <th className="px-3 py-3 font-semibold">الحالة</th>
            <th className="px-3 py-3 font-semibold">الاعتماد والدليل</th>
            <th className="px-3 py-3 font-semibold">الأثر</th>
            <th className="px-3 py-3 font-semibold">الأولوية</th>
          </tr>
        </thead>
        <tbody>
          {priorityRecords.map(({ record, priority }) => {
            const selected = selectedEntityId === record.zoneId;
            const status = statusConfig[record.status];
            return (
              <tr key={record.zoneId} className={`border-b border-command-line/70 ${selected ? 'bg-command-accent/10' : ''}`}>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    data-testid={`readiness-zone-row-${record.zoneId}`}
                    onClick={() => onSelect(record.zoneId)}
                    className="text-right hover:text-command-accent"
                    aria-pressed={selected}
                  >
                    <span className="block font-semibold text-command-text">{record.zoneId}</span>
                    <span className="mt-1 block text-xs text-command-muted">{contextLabels[record.stateContext]}</span>
                  </button>
                </td>
                <td className="px-3 py-3">
                  <div className="min-w-[150px]">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-command-muted">نسبة الجاهزية</span>
                      <span className="ltr font-semibold text-command-text">{formatPercent(record.readiness)}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30">
                      <div className="h-full rounded-full" style={{ width: `${record.readiness}%`, backgroundColor: status.hexColor }} />
                    </div>
                    <span className="mt-1 block text-xs text-command-muted">الثقة: {confidenceLabels[record.confidence]}</span>
                  </div>
                </td>
                <td className="px-3 py-3"><span className={`rounded border px-2 py-1 text-xs ${status.borderClass} ${status.surfaceClass} ${status.textClass}`}>{status.labelAr}</span></td>
                <td className="px-3 py-3">
                  <span className="block text-xs text-command-text">{approvalLabels[record.approvalStatus]}</span>
                  <span className="mt-1 block text-xs text-command-muted">{record.evidence.length ? `${record.evidence.length} دليل` : 'لا يوجد دليل'}</span>
                </td>
                <td className="px-3 py-3">
                  <span className="block text-xs text-command-text">الافتتاح: {impactLabel(record.openingImpact)}</span>
                  <span className="mt-1 block text-xs text-command-muted">الزوار: {impactLabel(record.operationalImpact.visitorRoutes)}</span>
                </td>
                <td className="px-3 py-3"><span className="ltr font-semibold text-command-amber">{priority.score}</span><span className="mt-1 block text-xs text-command-muted">{priority.labelAr}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface ReadinessDraft {
  readiness: number;
  confidence: ReadinessConfidence;
  responsibleParty: string;
  requiredAction: string;
  targetReadinessDate: string;
  approvalStatus: ApprovalStatus;
  evidenceTitle: string;
  blockerTitle: string;
  changeReason: string;
}

function createReadinessDraft(record: ZoneReadinessRecord | undefined): ReadinessDraft | null {
  if (!record) return null;

  return {
    readiness: record.readiness,
    confidence: record.confidence,
    responsibleParty: record.responsibleParty,
    requiredAction: record.requiredAction,
    targetReadinessDate: formatDateInput(record.targetReadinessDate),
    approvalStatus: record.approvalStatus,
    evidenceTitle: record.evidence[0]?.titleAr ?? '',
    blockerTitle: record.blockers[0]?.titleAr ?? '',
    changeReason: record.changeReason
  };
}

function ReadinessDetails({ record, records, routes }: { record: ZoneReadinessRecord | undefined; records: ZoneReadinessRecord[]; routes: RouteDefinition[] }) {
  const updateZoneReadiness = useEventStore((state) => state.updateZoneReadiness);
  const errorMessage = useEventStore((state) => state.errorMessage);
  const [draft, setDraft] = useState<ReadinessDraft | null>(() => createReadinessDraft(record));

  if (!record || !draft) {
    return <EmptyState title="لا توجد منطقة محددة" message="اختر منطقة من طابور التدخل أو الجدول أو المخطط." />;
  }

  const routeImpacts = getZoneRouteImpacts(record, routes);
  const dependencyImpacts = getZoneDependencyImpacts(record, records);
  const save = () => {
    const baseEvidence = record.evidence[0];
    const evidence = draft.evidenceTitle.trim()
      ? [
          {
            id: baseEvidence?.id ?? `EVIDENCE-${record.zoneId}`,
            type: baseEvidence?.type ?? 'field-note',
            titleAr: draft.evidenceTitle.trim(),
            source: baseEvidence?.source ?? 'المستخدم المحلي',
            capturedAt: baseEvidence?.capturedAt ?? new Date().toISOString(),
            status: baseEvidence?.status ?? 'pending'
          }
        ]
      : [];
    const baseBlocker = record.blockers[0];
    const blockers = draft.blockerTitle.trim()
      ? [
          {
            id: baseBlocker?.id ?? `BLOCKER-${record.zoneId}`,
            titleAr: draft.blockerTitle.trim(),
            owner: baseBlocker?.owner ?? draft.responsibleParty,
            severity: baseBlocker?.severity ?? record.riskLevel,
            status: baseBlocker?.status ?? 'open',
            dueAt: baseBlocker?.dueAt ?? record.dueAt
          }
        ]
      : [];
    const update: ZoneReadinessUpdate = {
      readiness: draft.readiness,
      confidence: draft.confidence,
      responsibleParty: draft.responsibleParty,
      requiredAction: draft.requiredAction,
      targetReadinessDate: draft.targetReadinessDate,
      approvalStatus: draft.approvalStatus,
      evidence,
      blockers,
      changeReason: draft.changeReason
    };
    updateZoneReadiness(record.zoneId, update);
  };

  return (
    <div data-testid="readiness-details" className="space-y-4" aria-live="polite">
      <div className="border-s-2 border-command-accent ps-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-command-muted"><span className="ltr inline-block">{record.zoneId}</span> · {contextLabels[record.stateContext]}</p>
            <h3 className="mt-1 text-xl font-semibold text-command-text">{record.zoneId}</h3>
          </div>
          <span className="rounded border border-command-amber/70 bg-command-amber/10 px-2 py-1 text-xs text-command-amber">بيانات تجريبية مؤقتة</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <DetailValue label="نسبة الجاهزية" value={formatPercent(record.readiness)} />
        <DetailValue label="درجة الثقة" value={confidenceLabels[record.confidence]} />
        <DetailValue label="المصدر" value={record.source} />
        <DetailValue label="وقت التحديث" value={formatDate(record.updatedAt)} />
        <DetailValue label="مالك الحالة" value={record.owner} />
        <DetailValue label="المسؤول عن التنفيذ" value={record.responsibleParty} />
        <DetailValue label="حالة الاعتماد" value={approvalLabels[record.approvalStatus]} />
        <DetailValue label="رقم المراجعة" value={String(record.revision)} ltr />
        <DetailValue label="موعد الإجراء" value={formatDate(record.dueAt)} />
        <DetailValue label="مستوى التصعيد" value={record.escalationLevel} />
        <DetailValue label="أثر الافتتاح" value={impactLabel(record.openingImpact)} />
        <DetailValue label="سبب آخر تغيير" value={record.changeReason} className="col-span-2" />
      </div>

      <div className="grid gap-2 text-sm xl:grid-cols-2">
        <DetailList title="الأدلة" items={record.evidence.map((evidence) => `${evidence.titleAr} · ${evidence.status === 'verified' ? 'موثق' : 'بانتظار التحقق'}`)} empty="لا يوجد دليل منظم." />
        <DetailList title="العوائق" items={record.blockers.map((blocker) => blocker.titleAr)} empty="لا يوجد عائق مفتوح." />
        <DetailList title="الاعتماديات" items={dependencyImpacts.map((impact) => `${impact.zoneId} · ${impact.impactAr}`)} empty="لا توجد اعتماديات." />
        <DetailList title="المسارات المتأثرة" items={routeImpacts.map((impact) => `${impact.route.nameAr} · ${impact.approved ? 'معتمد' : 'غير معتمد - بيانات تجريبية'}`)} empty="لا توجد مسارات مرتبطة." />
      </div>

      <div className="command-card p-3">
        <p className="text-xs font-semibold text-command-muted">الإجراء المطلوب</p>
        <p className="mt-1 text-sm leading-6 text-command-text">{record.requiredAction}</p>
        <p className="mt-3 text-xs leading-6 text-command-amber">أثر عدم التدخل: {record.operationalImpact.summaryAr}</p>
      </div>

      <form className="space-y-3 border-t border-command-line pt-4" onSubmit={(event) => { event.preventDefault(); save(); }}>
        <div className="flex items-center gap-2 text-sm font-semibold text-command-text"><UserRound className="h-4 w-4 text-command-accent" aria-hidden="true" />تحرير محلي للتحقق فقط</div>
        <p className="text-xs leading-6 text-command-muted">لا يوجد سجل تدقيق أو اعتماد متعدد المستخدمين. كل حفظ محلي يزيد رقم المراجعة.</p>
        <label className="block">
          <span className="mb-2 flex items-center justify-between text-xs font-semibold text-command-muted"><span>نسبة الجاهزية</span><output className="text-command-text">{formatPercent(draft.readiness)}</output></span>
          <input data-testid="readiness-pack-input" type="range" min={0} max={100} value={draft.readiness} onChange={(event) => setDraft({ ...draft, readiness: Number(event.target.value) })} className="h-5 w-full cursor-pointer accent-command-accent" />
        </label>
        <div className="grid gap-3 xl:grid-cols-2">
          <label className="block"><span className="mb-2 block text-xs font-semibold text-command-muted">درجة الثقة</span><select data-testid="readiness-confidence-select" value={draft.confidence} onChange={(event) => setDraft({ ...draft, confidence: event.target.value as ReadinessConfidence })} className="command-select">{Object.entries(confidenceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="block"><span className="mb-2 block text-xs font-semibold text-command-muted">حالة الاعتماد المحلية</span><select data-testid="readiness-approval-select" value={draft.approvalStatus} onChange={(event) => setDraft({ ...draft, approvalStatus: event.target.value as ApprovalStatus })} className="command-select">{Object.entries(approvalLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="block"><span className="mb-2 block text-xs font-semibold text-command-muted">المسؤول عن التنفيذ</span><input data-testid="readiness-responsible-input" value={draft.responsibleParty} onChange={(event) => setDraft({ ...draft, responsibleParty: event.target.value })} className="command-select" /></label>
          <label className="block"><span className="mb-2 block text-xs font-semibold text-command-muted">موعد الجاهزية المستهدف</span><input data-testid="readiness-target-date" type="date" value={draft.targetReadinessDate} onChange={(event) => setDraft({ ...draft, targetReadinessDate: event.target.value })} className="command-select ltr text-left" /></label>
        </div>
        <label className="block"><span className="mb-2 block text-xs font-semibold text-command-muted">الدليل المنظم</span><input data-testid="readiness-evidence-input" value={draft.evidenceTitle} onChange={(event) => setDraft({ ...draft, evidenceTitle: event.target.value })} placeholder="مثال: قائمة تحقق موقعة" className="command-select" /></label>
        <label className="block"><span className="mb-2 block text-xs font-semibold text-command-muted">العائق</span><input data-testid="readiness-blocker-input" value={draft.blockerTitle} onChange={(event) => setDraft({ ...draft, blockerTitle: event.target.value })} placeholder="لا يوجد عائق" className="command-select" /></label>
        <label className="block"><span className="mb-2 block text-xs font-semibold text-command-muted">الإجراء المطلوب</span><textarea data-testid="readiness-required-action" value={draft.requiredAction} onChange={(event) => setDraft({ ...draft, requiredAction: event.target.value })} className="command-select min-h-20 resize-y" /></label>
        <label className="block"><span className="mb-2 block text-xs font-semibold text-command-muted">سبب آخر تغيير</span><input data-testid="readiness-change-reason" value={draft.changeReason} onChange={(event) => setDraft({ ...draft, changeReason: event.target.value })} className="command-select" /></label>
        {errorMessage ? <div data-testid="readiness-validation-error"><ErrorState title="لم يتم حفظ التعديل" message={errorMessage} /></div> : null}
        <button data-testid="readiness-save" type="submit" className="command-button command-button-primary w-full"><RefreshCw className="h-4 w-4" aria-hidden="true" />حفظ التعديل المحلي</button>
      </form>
    </div>
  );
}

function DetailValue({ label, value, ltr = false, className = '' }: { label: string; value: string; ltr?: boolean; className?: string }) {
  return <div className={`rounded border border-command-line bg-command-panelStrong p-3 ${className}`}><p className="text-[11px] text-command-muted">{label}</p><p className={`mt-1 text-sm font-semibold text-command-text ${ltr ? 'ltr text-left' : ''}`}>{value}</p></div>;
}

function DetailList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <div className="rounded border border-command-line bg-command-panelStrong p-3"><p className="text-xs font-semibold text-command-muted">{title}</p>{items.length ? <ul className="mt-2 space-y-1 text-xs leading-6 text-command-text">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-2 text-xs text-command-muted">{empty}</p>}</div>;
}

function ReadinessDecisionSummary({ priorityRecords, entities }: { priorityRecords: ReturnType<typeof prioritizeReadinessRecords>; entities: SpatialEntityRecord }) {
  const top = priorityRecords[0];
  if (!top) return <EmptyState title="لا توجد توصية" message="لا توجد سجلات جاهزية كافية لإصدار ملخص." />;
  const { record, priority } = top;
  const completeEnough = Boolean(record.owner && record.source && record.evidence.length && record.approvalStatus === 'approved');
  const entityName = entities[record.zoneId]?.nameAr ?? record.zoneId;

  if (!completeEnough) {
    return <div data-testid="readiness-decision-summary" className="rounded border border-command-amber/70 bg-command-amber/10 p-4 text-sm leading-7 text-command-amber">لا يمكن إصدار توصية موثوقة قبل استكمال المصدر أو الدليل أو المالك.</div>;
  }

  return (
    <div data-testid="readiness-decision-summary" className="space-y-3">
      <div className="rounded border border-command-red/60 bg-command-red/10 p-4">
        <div className="flex items-start gap-3"><ShieldAlert className="mt-1 h-5 w-5 shrink-0 text-command-red" aria-hidden="true" /><div><p className="text-xs text-command-muted">أعلى أولوية تجريبية</p><h3 className="mt-1 text-lg font-semibold text-command-text">{entityName} · <span className="ltr inline-block">{record.zoneId}</span></h3><p className="mt-2 text-sm leading-7 text-command-text">{priority.explanationAr}</p></div></div>
      </div>
      <DecisionLine label="الإجراء المطلوب" value={record.requiredAction} />
      <DecisionLine label="مالك الحالة" value={record.owner} />
      <DecisionLine label="المسؤول عن التنفيذ" value={record.responsibleParty} />
      <DecisionLine label="موعد الإجراء" value={formatDate(record.dueAt)} />
      <DecisionLine label="فجوة الاعتماد" value={approvalLabels[record.approvalStatus]} />
      <DecisionLine label="أثر الافتتاح" value={impactLabel(record.openingImpact)} />
      <DecisionLine label="أثر المسار" value={impactLabel(record.operationalImpact.visitorRoutes)} />
      <div className="rounded border border-command-line bg-command-panelStrong p-3 text-xs leading-6 text-command-muted">التصعيد المقترح: <span className="font-semibold text-command-text">{record.escalationLevel}</span>. هذا ملخص قواعد محلية لبيانات تجريبية مؤقتة، وليس توصية آلية أو حقيقة تشغيلية.</div>
    </div>
  );
}

function DecisionLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 border-b border-command-line/70 pb-2 text-sm"><span className="text-command-muted">{label}</span><span className="max-w-[65%] text-left font-semibold text-command-text">{value}</span></div>;
}
