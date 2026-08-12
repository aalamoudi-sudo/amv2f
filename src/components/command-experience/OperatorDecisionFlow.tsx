import { ArrowLeft, CalendarClock, ClipboardList, FileWarning, MapPinned, ShieldCheck, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { calculateDecisionPriority } from '../../services/decisionPriority';
import { calculateReadinessPriority } from '../../services/readinessPriority';
import { selectRuntimeRoutes, useEventStore } from '../../store/useEventStore';
import { truthLabelForStateContext } from '../../ux/truthVocabulary';
import { TruthContextBadge } from './TruthContextBadge';

function formatDate(value: string | null | undefined): string {
  if (!value) return 'غير محدد';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'غير محدد';
  return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function confidenceLabel(value: 'low' | 'medium' | 'high' | undefined): string {
  if (value === 'high') return 'مرتفعة';
  if (value === 'medium') return 'متوسطة';
  return 'منخفضة أو غير محددة';
}

export function OperatorDecisionFlow({
  entityId,
  onOpenDecision
}: {
  entityId?: string | null;
  onOpenDecision?: () => void;
}) {
  const selectedEntityId = useEventStore((state) => state.selectedEntityId);
  const entities = useEventStore((state) => state.entities);
  const decisions = useEventStore((state) => state.decisions);
  const readiness = useEventStore((state) => state.zoneReadiness);
  const routes = useEventStore(selectRuntimeRoutes);
  const activeRuntime = useEventStore((state) => state.activeRuntime);
  const selectDecision = useEventStore((state) => state.selectDecision);
  const targetEntityId = entityId ?? selectedEntityId;
  const [showProvenance, setShowProvenance] = useState(false);

  const context = useMemo(() => {
    const entity = targetEntityId ? entities[targetEntityId as keyof typeof entities] : undefined;
    const readinessRecord = targetEntityId
      ? readiness.find((record) => record.zoneId === targetEntityId)
      : undefined;
    const decision = targetEntityId
      ? decisions.find((record) => record.relationships.some((relation) => relation.entityId === targetEntityId))
      : undefined;
    const route = readinessRecord?.relatedRouteIds[0]
      ? routes.find((candidate) => candidate.id === readinessRecord.relatedRouteIds[0])
      : undefined;
    return { entity, readinessRecord, decision, route };
  }, [decisions, entities, readiness, routes, targetEntityId]);

  if (!targetEntityId || !context.entity) {
    return (
      <div data-testid="operator-decision-flow" className="rounded border border-dashed border-command-line p-4 text-sm leading-7 text-command-muted">
        اختر عنصراً من القائمة أو 2D أو 3D لعرض مسار الحالة إلى الإجراء.
      </div>
    );
  }

  const { entity, readinessRecord, decision, route } = context;
  const stateContext = decision?.stateContext ?? readinessRecord?.stateContext;
  const readinessPriority = readinessRecord ? calculateReadinessPriority(readinessRecord) : null;
  const decisionPriority = decision ? calculateDecisionPriority(decision) : null;
  const severity = decisionPriority?.operationalPriorityLabelAr ?? readinessPriority?.labelAr ?? 'غير معروف';
  const source = decision?.source ?? readinessRecord?.source ?? 'لا يوجد مصدر منظم';
  const updatedAt = decision?.createdAt ?? readinessRecord?.updatedAt ?? null;
  const owner = decision?.decisionOwner ?? readinessRecord?.owner ?? entity.responsibleParty;
  const responsibleParty = decision?.responsibleParty ?? readinessRecord?.responsibleParty ?? entity.responsibleParty;
  const approvalAuthority = decision?.approvingAuthority ?? readinessRecord?.approvedBy ?? 'غير مسند';
  const action = decision?.actionRequired ?? readinessRecord?.requiredAction ?? 'لا يوجد إجراء منظم';
  const dueAt = decision?.dueAt ?? readinessRecord?.dueAt ?? null;
  const impact = decision?.expectedImpact.summaryAr ?? readinessRecord?.operationalImpact.summaryAr ?? 'لا يوجد أثر منظم.';
  const evidence = decision?.evidence ?? readinessRecord?.evidence ?? [];

  return (
    <section data-testid="operator-decision-flow" className="space-y-4" aria-live="polite">
      <header className="border-s-2 border-command-accent ps-3">
        <div className="flex flex-wrap items-center gap-2">
          {stateContext ? <TruthContextBadge label={truthLabelForStateContext(stateContext)} /> : <TruthContextBadge label="unknown" />}
          <span className="rounded border border-command-line px-2 py-1 text-xs text-command-text">الأولوية: {severity}</span>
        </div>
        <h2 className="mt-2 text-lg font-semibold text-command-text">{decision?.title ?? entity.nameAr}</h2>
        <p className="mt-1 text-sm leading-6 text-command-muted">{decision?.problemStatement ?? entity.description}</p>
      </header>

      <ol className="space-y-1">
        <FlowStep icon={FileWarning} title="الحالة أو الملاحظة">
          <p>{decision?.description ?? (readinessRecord ? 'سجل جاهزية يحتاج مراجعة في السياق الحالي.' : 'لا توجد ملاحظة منظمة مرتبطة بهذا العنصر.')}</p>
        </FlowStep>
        <FlowStep icon={MapPinned} title="المكان">
          <p>{entity.nameAr} · <bdi className="ltr">{entity.id}</bdi>{route ? ' · المسار: ' + route.nameAr : ''}</p>
        </FlowStep>
        <FlowStep icon={ClipboardList} title="لماذا يهم">
          <p>{impact}</p>
        </FlowStep>
        <FlowStep icon={ShieldCheck} title="الدليل والثقة">
          <p>الثقة: {confidenceLabel(decision?.confidence ?? readinessRecord?.confidence)} · الدليل: {evidence.length ? evidence.some((item) => item.status !== 'verified') ? 'غير مكتمل أو بانتظار التحقق' : 'موثق في السجل المحلي' : 'مفقود'}</p>
          <button data-testid="operator-flow-provenance-toggle" type="button" onClick={() => setShowProvenance((value) => !value)} className="mt-2 text-xs font-semibold text-command-accent underline underline-offset-4">
            {showProvenance ? 'إخفاء المصدر التقني' : 'عرض المصدر والتوقيت'}
          </button>
          {showProvenance ? <div data-testid="operator-flow-provenance" className="mt-2 rounded border border-command-line bg-command-bg/60 p-3 text-xs leading-6 text-command-muted"><p>المصدر: {source}</p><p>آخر توقيت مصنف: <bdi className="ltr">{updatedAt ?? 'غير محدد'}</bdi></p><p>الحالة: {stateContext ? truthLabelForStateContext(stateContext) === 'temporary-demo' ? 'بيانات تجريبية مؤقتة' : truthLabelForStateContext(stateContext) === 'scenario' ? 'سيناريو' : 'حالة أساسية' : 'غير معروف'}</p></div> : null}
        </FlowStep>
        <FlowStep icon={UserRound} title="المالك والجهة المسؤولة">
          <p>المالك: {owner} · التنفيذ: {responsibleParty} · الاعتماد: {approvalAuthority}</p>
        </FlowStep>
        <FlowStep icon={CalendarClock} title="الإجراء والموعد والنتيجة">
          <p>الإجراء: {action}</p>
          <p className="mt-1">الموعد: {formatDate(dueAt)} · دورة الحياة: {decision?.status ?? readinessRecord?.approvalStatus ?? 'غير محددة'}</p>
        </FlowStep>
      </ol>

      <div className="flex flex-wrap gap-2 border-t border-command-line pt-3">
        {decision ? <button data-testid="operator-flow-open-decision" type="button" onClick={() => { selectDecision(decision.decisionId); onOpenDecision?.(); }} className="command-button text-xs">فتح القرار المنظم <ArrowLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" /></button> : null}
        <span className="text-xs leading-10 text-command-muted">حدث: {activeRuntime?.identity.eventNameAr ?? 'لا توجد حزمة تشغيلية مفعلة'}</span>
      </div>
    </section>
  );
}

function FlowStep({
  icon: Icon,
  title,
  children
}: {
  icon: typeof FileWarning;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="command-flow-step">
      <div className="flex items-center gap-2 text-sm font-semibold text-command-text"><Icon className="h-4 w-4 text-command-accent" aria-hidden="true" />{title}</div>
      <div className="mt-1 text-xs leading-6 text-command-muted">{children}</div>
    </li>
  );
}
