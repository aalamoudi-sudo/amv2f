import { AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, MapPinned, ShieldAlert, WifiOff } from 'lucide-react';
import { useMemo } from 'react';
import { prioritizeDecisions } from '../../services/decisionPriority';
import { prioritizeReadinessRecords } from '../../services/readinessPriority';
import { useEventStore } from '../../store/useEventStore';
import { EmptyState } from '../shared/StateBlocks';
import { truthLabelForStateContext } from '../../ux/truthVocabulary';
import { TruthContextBadge } from './TruthContextBadge';

interface ExecutiveOverviewProps {
  onOpenCommand: () => void;
  onOpenDecisions: () => void;
  onOpenSpatial: () => void;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'غير محدد';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'غير محدد';
  return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function ExecutiveOverview({ onOpenCommand, onOpenDecisions, onOpenSpatial }: ExecutiveOverviewProps) {
  const activeRuntime = useEventStore((state) => state.activeRuntime);
  const stateContext = useEventStore((state) => state.stateContext);
  const decisions = useEventStore((state) => state.decisions);
  const readiness = useEventStore((state) => state.zoneReadiness);
  const entities = useEventStore((state) => state.entities);
  const selectEntity = useEventStore((state) => state.selectEntity);
  const selectDecision = useEventStore((state) => state.selectDecision);

  const now = useMemo(() => new Date(), []);
  const prioritizedDecisions = useMemo(() => prioritizeDecisions(decisions, now), [decisions, now]);
  const prioritizedReadiness = useMemo(() => prioritizeReadinessRecords(readiness, now), [now, readiness]);

  if (!activeRuntime) {
    return (
      <div data-testid="executive-overview" className="min-h-0 flex-1 overflow-y-auto p-4 command-scrollbar">
        <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center">
          <EmptyState
            title="لا توجد حقيقة تشغيلية مفعّلة"
            message="لم تُفعّل حزمة تشغيلية صريحة؛ لذلك لا تعرض القيادة التنفيذية مؤشرات أو قرارات كواقع قائم. يمكن فتح بيئة العرض المؤقتة بوضوح من مساحة العمليات."
            action={<button data-testid="executive-open-operations" type="button" onClick={onOpenCommand} className="command-button command-button-primary">فتح مساحة العمليات المؤقتة</button>}
          />
        </div>
      </div>
    );
  }

  const actionItems = [
    ...prioritizedDecisions.slice(0, 3).map(({ record, priority }) => ({
      key: record.decisionId,
      title: record.title,
      detail: priority.operationalExplanationAr,
      owner: record.decisionOwner,
      dueAt: record.dueAt,
      source: record.source,
      stateContext: record.stateContext,
      onSelect: () => { selectDecision(record.decisionId); onOpenDecisions(); }
    })),
    ...prioritizedReadiness.slice(0, 3).map(({ record, priority }) => ({
      key: record.zoneId,
      title: entities[record.zoneId]?.nameAr ?? record.zoneId,
      detail: priority.explanationAr,
      owner: record.responsibleParty,
      dueAt: record.dueAt,
      source: record.source,
      stateContext: record.stateContext,
      onSelect: () => { selectEntity(record.zoneId); onOpenSpatial(); }
    }))
  ].slice(0, 5);
  const approvals = prioritizedDecisions.filter(({ record }) => record.approvalStatus !== 'approved').slice(0, 3);
  const blockers = prioritizedReadiness.flatMap(({ record }) => record.blockers.filter((blocker) => blocker.status === 'open').map((blocker) => ({ blocker, record }))).slice(0, 4);
  const lastUpdate = [...decisions.map((item) => item.createdAt), ...readiness.map((item) => item.updatedAt)].sort().at(-1) ?? null;

  return (
    <div data-testid="executive-overview" className="min-h-0 flex-1 overflow-y-auto command-scrollbar">
      <div className="mx-auto w-full max-w-[1920px] space-y-4 p-4">
        <header className="command-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <TruthContextBadge label={truthLabelForStateContext(stateContext.stateLayer === 'scenario' ? 'scenario' : stateContext.dataSource === 'temporary-demo' ? 'temporary-demo' : 'baseline')} />
                <span className="rounded border border-command-line px-2 py-1 text-xs text-command-muted">عرض تنفيذي · لا يمنح صلاحيات إنتاجية</span>
              </div>
              <p className="command-eyebrow mt-3">ماذا يحتاج انتباهي الآن؟</p>
              <h2 className="mt-1 text-2xl font-semibold text-command-text">{activeRuntime.identity.eventNameAr}</h2>
              <p className="mt-1 text-sm leading-7 text-command-muted"><bdi className="ltr">{activeRuntime.identity.venueId}</bdi> · <bdi className="ltr">{activeRuntime.identity.eventInstanceId}</bdi></p>
            </div>
            <div className="rounded border border-command-line bg-command-bg/60 p-3 text-xs leading-6 text-command-muted">
              <p>آخر تحديث مصنف</p>
              <p className="ltr mt-1 text-left text-command-text">{lastUpdate ?? 'غير محدد'}</p>
              <p className="mt-1">المصدر: بيانات محلية منظمة وليست تغذية تشغيلية حية.</p>
            </div>
          </div>
        </header>

        <section data-testid="critical-action-center" className="command-action-center">
          <div className="flex items-center justify-between gap-3">
            <div><p className="command-eyebrow">مركز الإجراء الحرج</p><h3 className="mt-1 text-lg font-semibold text-command-text">القرار أو التدخل التالي</h3></div>
            <AlertTriangle className="h-5 w-5 text-command-amber" aria-hidden="true" />
          </div>
          {actionItems.length ? <div className="mt-4 grid gap-3 xl:grid-cols-2">{actionItems.map((item) => (
            <button key={item.key} data-testid={'executive-action-' + item.key} type="button" onClick={item.onSelect} className="command-action-card text-right">
              <div className="flex items-start justify-between gap-3"><span className="text-sm font-semibold text-command-text">{item.title}</span><TruthContextBadge label={truthLabelForStateContext(item.stateContext)} /></div>
              <p className="mt-2 text-xs leading-6 text-command-muted">{item.detail}</p>
              <p className="mt-3 text-xs text-command-muted">المالك: {item.owner} · الموعد: {formatDate(item.dueAt)}</p>
              <p className="mt-1 text-[11px] text-command-muted">المصدر: {item.source}</p>
            </button>
          ))}</div> : <EmptyState title="لا توجد إجراءات منظمة" message="لا توجد سجلات قرار أو جاهزية منظمة ضمن الحزمة الحالية." />}</section>

        <div className="grid gap-4 2xl:grid-cols-[1.1fr_1fr_0.9fr]">
          <section className="command-card p-4">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-command-accent" aria-hidden="true" /><h3 className="font-semibold text-command-text">قرارات تحتاج اعتماداً</h3></div>
            <div className="mt-3 space-y-2">{approvals.length ? approvals.map(({ record }) => <button key={record.decisionId} data-testid={'executive-approval-' + record.decisionId} type="button" onClick={() => { selectDecision(record.decisionId); onOpenDecisions(); }} className="w-full rounded border border-command-line p-3 text-right hover:border-command-accent"><p className="text-sm font-semibold text-command-text">{record.title}</p><p className="mt-1 text-xs text-command-muted"><bdi className="ltr">{record.decisionId}</bdi> · {record.approvalStatus}</p></button>) : <p className="text-sm leading-6 text-command-muted">لا يوجد اعتماد معلّق في السجلات الحالية.</p>}</div>
          </section>
          <section className="command-card p-4">
            <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-command-amber" aria-hidden="true" /><h3 className="font-semibold text-command-text">عوائق تشغيلية</h3></div>
            <div className="mt-3 space-y-2">{blockers.length ? blockers.map(({ blocker, record }) => <button key={blocker.id} data-testid={'executive-blocker-' + blocker.id} type="button" onClick={() => { selectEntity(record.zoneId); onOpenSpatial(); }} className="w-full rounded border border-command-line p-3 text-right hover:border-command-accent"><p className="text-sm font-semibold text-command-text">{blocker.titleAr}</p><p className="mt-1 text-xs text-command-muted">المالك: {blocker.owner} · الموعد: {formatDate(blocker.dueAt)}</p></button>) : <p className="text-sm leading-6 text-command-muted">لا توجد عوائق مفتوحة منظمة في السجلات الحالية.</p>}</div>
          </section>
          <section className="command-card p-4">
            <div className="flex items-center gap-2"><WifiOff className="h-4 w-4 text-command-amber" aria-hidden="true" /><h3 className="font-semibold text-command-text">المصدر والثقة</h3></div>
            <div className="mt-3 space-y-3 text-xs leading-6 text-command-muted"><p><span className="font-semibold text-command-text">التصنيف:</span> {stateContext.dataSource === 'temporary-demo' ? 'بيانات تجريبية مؤقتة' : 'حالة أساسية محلية'}</p><p><span className="font-semibold text-command-text">التغذية:</span> لا توجد بيانات تشغيلية حية أو جهاز خارجي متصل.</p><p><span className="font-semibold text-command-text">المفقود:</span> لا يثبت هذا العرض اعتماداً أو تحققاً ميدانياً.</p><button type="button" onClick={onOpenSpatial} className="command-button w-full text-xs">فتح الأثر المكاني <MapPinned className="mr-1 h-3.5 w-3.5" aria-hidden="true" /></button></div>
          </section>
        </div>

        <footer className="command-card flex flex-wrap items-center gap-3 px-4 py-3 text-xs text-command-muted">
          <CalendarClock className="h-4 w-4 text-command-accent" aria-hidden="true" />
          المقاييس هنا مشتقة من سجلات الحزمة الحالية فقط؛ لا توجد مؤشرات تنفيذية مفبركة.
          <button type="button" onClick={onOpenCommand} className="mr-auto inline-flex items-center gap-1 font-semibold text-command-accent">الانتقال إلى العمليات <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /></button>
        </footer>
      </div>
    </div>
  );
}
