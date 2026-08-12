import {
  AlertTriangle,
  BadgeCheck,
  ClipboardList,
  GitBranch,
  List,
  Map,
  Plus,
  Route,
  ShieldAlert,
  Target,
  UserRound,
  Box
} from 'lucide-react';
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { decisionTypeValues, type DecisionConfidence, type DecisionLifecycleStatus, type DecisionOutcomeStatus, type DecisionRecord, type DecisionType } from '../../types/decision';
import type { EvidenceReference, SpatialEntityId } from '../../types/spatial';
import { getDecisionContractCompleteness, isDecisionOverdue } from '../../services/decisionValidation';
import { calculateDecisionTrust } from '../../services/decisionTrust';
import { getDecisionImpactLinks } from '../../services/decisionImpactGraph';
import { calculateDecisionPriority, prioritizeDecisions } from '../../services/decisionPriority';
import { useEventStore, type CreateDecisionInput, type DecisionUpdate } from '../../store/useEventStore';
import { ErrorState, EmptyState } from '../shared/StateBlocks';
import { Panel } from '../shared/Panel';
import { EventSceneViewport } from '../../three/scene/EventSceneViewport';
import { DecisionRelationship2D } from './DecisionRelationship2D';
import { decisionRelationLabelsAr } from '../../services/decisionRelationshipMigration';
import { fallbackRuntimeIdentity } from '../../data/fallbackRuntime';

type DecisionView = 'list' | 'relationship' | 'scene';

const typeLabels: Record<DecisionType, string> = {
  readiness: 'جاهزية',
  safety: 'سلامة',
  quality: 'جودة',
  logistics: 'لوجستيات',
  'visitor-experience': 'تجربة الزائر',
  security: 'أمن',
  technical: 'تقنية',
  supplier: 'مورد',
  schedule: 'جدولة',
  'resource-allocation': 'تخصيص موارد'
};

const statusLabels: Record<DecisionLifecycleStatus, string> = {
  draft: 'مسودة',
  review: 'مراجعة',
  approved: 'معتمد',
  assigned: 'مسند',
  'in-progress': 'قيد التنفيذ',
  completed: 'مكتمل',
  verified: 'تم التحقق',
  closed: 'مغلق'
};

const confidenceLabels: Record<DecisionConfidence, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية' };
const outcomeLabels: Record<DecisionOutcomeStatus, string> = { 'not-started': 'لم يبدأ', pending: 'قيد القياس', positive: 'إيجابي', mixed: 'مختلط', negative: 'سلبي', 'not-measured': 'غير مقاس' };
const approvalLabels: Record<DecisionRecord['approvalStatus'], string> = { draft: 'مسودة', 'under-review': 'قيد المراجعة', approved: 'معتمدة', rejected: 'مرفوضة' };

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : 'غير صالح';
}

function DecisionDetailsView({ record, entities, selectedEntityId, links, draft, setDraft, errorMessage, onSave, onApprove, onSelectEntity }: {
  record: DecisionRecord;
  entities: ReturnType<typeof useEventStore.getState>['entities'];
  selectedEntityId: string | null;
  links: ReturnType<typeof getDecisionImpactLinks>;
  draft: DecisionDraft;
  setDraft: Dispatch<SetStateAction<DecisionDraft | null>>;
  errorMessage: string | null;
  onSave: () => void;
  onApprove: () => void;
  onSelectEntity: (entityId: SpatialEntityId) => void;
}) {
  const updateDraft = (patch: Partial<DecisionDraft>) => setDraft({ ...draft, ...patch });
  return (
    <div data-testid="decision-details" className="space-y-4" aria-live="polite">
      <div data-testid="decision-state-summary" className="space-y-4">
        <div className="border-s-2 border-command-accent ps-3">
          <p className="text-xs text-command-muted"><span className="ltr inline-block">{record.decisionId}</span> · {record.stateContext === 'temporary-demo' ? 'بيانات تجريبية مؤقتة' : record.stateContext === 'scenario' ? 'حالة سيناريو' : 'حالة أساسية محلية'}</p>
          <h3 className="mt-1 text-xl font-semibold text-command-text">{record.title}</h3>
          <p className="mt-1 text-sm leading-6 text-command-muted">{record.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <DetailValue label="نوع القرار" value={typeLabels[record.decisionType]} />
          <DetailValue label="حالة دورة القرار" value={statusLabels[record.status]} />
          <DetailValue label="معرّف الفعالية" value={record.eventId} ltr testId="decision-event-id" />
          <DetailValue label="معرّف الموقع" value={record.venueId} ltr testId="decision-venue-id" />
          <DetailValue label="مالك القرار" value={record.decisionOwner} />
          <DetailValue label="المسؤول عن التنفيذ" value={record.responsibleParty} />
          <DetailValue label="جهة الاعتماد" value={record.approvingAuthority} />
          <DetailValue label="حالة الاعتماد" value={approvalLabels[record.approvalStatus]} />
          <DetailValue label="موعد الإجراء" value={formatDate(record.dueAt)} />
          <DetailValue label="رقم المراجعة" value={String(record.revision)} ltr />
          <DetailValue label="النتيجة" value={outcomeLabels[record.outcomeStatus]} />
          <DetailValue label="اكتمال العقد" value={`${getDecisionContractCompleteness(record)}%`} />
        </div>
      </div>
      <div className="grid gap-2 xl:grid-cols-2">
        <DetailList title="المشكلة" items={[record.problemStatement]} />
        <DetailList title="الإجراء المطلوب" items={[record.actionRequired]} />
        <DetailList title="الأدلة" items={record.evidence.map((item) => `${item.titleAr} · ${item.status === 'verified' ? 'موثق' : 'بانتظار التحقق'}`)} empty="لا يوجد دليل منظم." />
        <DetailList title="الخيارات" items={record.availableOptions.map((item) => `${item.titleAr}${record.selectedOption === item.optionId ? ' · محدد' : ''}`)} empty="لا توجد خيارات." />
        <DetailList title="الأثر المتوقع" items={[record.expectedImpact.summaryAr]} />
        <DetailList title="الأثر الفعلي" items={record.actualImpact ? [record.actualImpact.summaryAr] : ['لم يقس بعد.']} />
      </div>
      <div className="command-card p-3"><p className="text-xs font-semibold text-command-muted">العلاقات المكانية الصريحة</p><div className="mt-2 flex flex-wrap gap-2">{links.map((link) => <button key={link.relationId} data-testid={`decision-focus-entity-${link.entityId}`} data-relation-type={link.relationType} type="button" onClick={() => onSelectEntity(link.entityId)} className={`rounded border px-2 py-1 text-xs ${selectedEntityId === link.entityId ? 'border-command-accent bg-command-accent/15 text-command-accent' : 'border-command-line text-command-text'}`}><span className="font-semibold">{entities[link.entityId]?.nameAr ?? link.entityId}</span><span className="mx-1 text-command-muted">·</span>{decisionRelationLabelsAr[link.relationType]}</button>)}</div></div>
      <div className="command-card p-3"><p className="text-xs font-semibold text-command-muted">سجل القرار المحلي</p><ul data-testid="decision-history" className="mt-2 space-y-1 text-xs leading-6 text-command-muted">{record.changeHistory.map((item) => <li key={`${item.revision}-${item.changedAt}`}>مراجعة {item.revision} · {statusLabels[item.status]} · {item.changeReason}</li>)}</ul></div>
      <form className="space-y-3 border-t border-command-line pt-4" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
        <div className="flex items-center gap-2 text-sm font-semibold text-command-text"><UserRound className="h-4 w-4 text-command-accent" aria-hidden="true" />تحرير محلي للقرار</div>
        <p className="text-xs leading-6 text-command-muted">هذا نموذج تحقق محلي، وليس اعتماداً متعدد المستخدمين أو سجلاً تدقيقياً إنتاجياً.</p>
        <div className="grid gap-3 xl:grid-cols-2">
          <label className="block"><span className="mb-2 block text-xs text-command-muted">مالك القرار</span><input data-testid="decision-owner-input" value={draft.decisionOwner} onChange={(event) => updateDraft({ decisionOwner: event.target.value })} className="command-select" /></label>
          <label className="block"><span className="mb-2 block text-xs text-command-muted">المسؤول عن التنفيذ</span><input data-testid="decision-responsible-input" value={draft.responsibleParty} onChange={(event) => updateDraft({ responsibleParty: event.target.value })} className="command-select" /></label>
          <label className="block"><span className="mb-2 block text-xs text-command-muted">المصدر</span><input data-testid="decision-source-input" value={draft.source} onChange={(event) => updateDraft({ source: event.target.value })} className="command-select" /></label>
          <label className="block"><span className="mb-2 block text-xs text-command-muted">الثقة</span><select data-testid="decision-confidence-select" value={draft.confidence} onChange={(event) => updateDraft({ confidence: event.target.value as DecisionConfidence })} className="command-select"><option value="low">منخفضة</option><option value="medium">متوسطة</option><option value="high">عالية</option></select></label>
          <label className="block"><span className="mb-2 block text-xs text-command-muted">حالة دورة القرار</span><select data-testid="decision-status-select" value={draft.status} onChange={(event) => updateDraft({ status: event.target.value as DecisionLifecycleStatus })} className="command-select">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="block"><span className="mb-2 block text-xs text-command-muted">جهة الاعتماد</span><input data-testid="decision-authority-input" value={draft.approvingAuthority} onChange={(event) => updateDraft({ approvingAuthority: event.target.value })} className="command-select" /></label>
          <label className="block"><span className="mb-2 block text-xs text-command-muted">الخيار المحدد</span><select data-testid="decision-selected-option" value={draft.selectedOption} onChange={(event) => updateDraft({ selectedOption: event.target.value })} className="command-select"><option value="">لم يحدد</option>{record.availableOptions.map((option) => <option key={option.optionId} value={option.optionId}>{option.titleAr}</option>)}</select></label>
          <label className="block"><span className="mb-2 block text-xs text-command-muted">موعد التنفيذ بصيغة زمنية معيارية</span><input data-testid="decision-due-at" value={draft.dueAt} onChange={(event) => updateDraft({ dueAt: event.target.value })} className="command-select ltr text-left" /></label>
          <label className="block xl:col-span-2"><span className="mb-2 block text-xs text-command-muted">الدليل</span><input data-testid="decision-evidence-input" value={draft.evidenceTitle} onChange={(event) => updateDraft({ evidenceTitle: event.target.value })} className="command-select" placeholder="مثال: قائمة تحقق موقعة" /></label>
          <label className="block"><span className="mb-2 block text-xs text-command-muted">حالة الدليل المحلية</span><select data-testid="decision-evidence-status" value={draft.evidenceStatus} onChange={(event) => updateDraft({ evidenceStatus: event.target.value as EvidenceReference['status'] })} className="command-select"><option value="missing">مفقود</option><option value="pending">بانتظار التحقق</option><option value="verified">موثق محلياً</option></select></label>
          <label className="block xl:col-span-2"><span className="mb-2 block text-xs text-command-muted">الإجراء المطلوب</span><textarea data-testid="decision-action-input" value={draft.actionRequired} onChange={(event) => updateDraft({ actionRequired: event.target.value })} className="command-select min-h-20 resize-y" /></label>
          <label className="block"><span className="mb-2 block text-xs text-command-muted">مسند إلى</span><input data-testid="decision-assigned-input" value={draft.assignedTo} onChange={(event) => updateDraft({ assignedTo: event.target.value })} className="command-select" /></label>
          <label className="block"><span className="mb-2 block text-xs text-command-muted">سبب التغيير</span><input data-testid="decision-change-reason" value={draft.changeReason} onChange={(event) => updateDraft({ changeReason: event.target.value })} className="command-select" /></label>
          <label className="block"><span className="mb-2 block text-xs text-command-muted">حالة الأثر</span><select data-testid="decision-outcome-select" value={draft.outcomeStatus} onChange={(event) => updateDraft({ outcomeStatus: event.target.value as DecisionOutcomeStatus })} className="command-select">{Object.entries(outcomeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="block"><span className="mb-2 block text-xs text-command-muted">الأثر الفعلي</span><input data-testid="decision-actual-impact-input" value={draft.actualImpactSummary} onChange={(event) => updateDraft({ actualImpactSummary: event.target.value })} className="command-select" /></label>
          <label className="block"><span className="mb-2 block text-xs text-command-muted">مرجع دليل الإكمال</span><input data-testid="decision-completion-evidence" value={draft.completionEvidenceId} onChange={(event) => updateDraft({ completionEvidenceId: event.target.value })} className="command-select ltr text-left" /></label>
          <label className="block"><span className="mb-2 block text-xs text-command-muted">ملاحظة الإكمال</span><input data-testid="decision-completion-note" value={draft.completionNote} onChange={(event) => updateDraft({ completionNote: event.target.value })} className="command-select" /></label>
          <label className="block"><span className="mb-2 block text-xs text-command-muted">من تحقق من النتيجة</span><input data-testid="decision-verified-by" value={draft.verifiedBy} onChange={(event) => updateDraft({ verifiedBy: event.target.value })} className="command-select" /></label>
          <label className="block"><span className="mb-2 block text-xs text-command-muted">وقت التحقق</span><input data-testid="decision-verified-at" value={draft.verifiedAt} onChange={(event) => updateDraft({ verifiedAt: event.target.value })} className="command-select ltr text-left" /></label>
          <label className="block xl:col-span-2"><span className="mb-2 block text-xs text-command-muted">مرجع دليل التحقق</span><input data-testid="decision-verification-evidence" value={draft.verificationEvidenceId} onChange={(event) => updateDraft({ verificationEvidenceId: event.target.value })} className="command-select ltr text-left" /></label>
          <label className="block"><span className="mb-2 block text-xs text-command-muted">من أغلق القرار</span><input data-testid="decision-closed-by" value={draft.closedBy} onChange={(event) => updateDraft({ closedBy: event.target.value })} className="command-select" /></label>
          <label className="block"><span className="mb-2 block text-xs text-command-muted">وقت الإغلاق</span><input data-testid="decision-closed-at" value={draft.closedAt} onChange={(event) => updateDraft({ closedAt: event.target.value })} className="command-select ltr text-left" /></label>
          <label className="block xl:col-span-2"><span className="mb-2 block text-xs text-command-muted">سبب الإغلاق</span><input data-testid="decision-closure-reason" value={draft.closureReason} onChange={(event) => updateDraft({ closureReason: event.target.value })} className="command-select" /></label>
          <label className="block xl:col-span-2"><span className="mb-2 block text-xs text-command-muted">الدروس المستفادة أو تصريح بعدم وجود درس</span><input data-testid="decision-lessons-learned" value={draft.lessonsLearned} onChange={(event) => updateDraft({ lessonsLearned: event.target.value })} className="command-select" /></label>
        </div>
        {errorMessage ? <div data-testid="decision-validation-error"><ErrorState title="لم يتم حفظ القرار" message={errorMessage} /></div> : null}
        <div className="flex flex-wrap gap-2"><button data-testid="decision-save" type="submit" className="command-button command-button-primary"><ClipboardList className="h-4 w-4" aria-hidden="true" />حفظ التعديل المحلي</button><button data-testid="decision-approve" type="button" onClick={onApprove} className="command-button"><BadgeCheck className="h-4 w-4" aria-hidden="true" />اعتماد محلي</button></div>
      </form>
    </div>
  );
}

export function DecisionCenter() {
  const records = useEventStore((state) => state.decisions);
  const entities = useEventStore((state) => state.entities);
  const selectedDecisionId = useEventStore((state) => state.selectedDecisionId);
  const selectedEntityId = useEventStore((state) => state.selectedEntityId);
  const stateContext = useEventStore((state) => state.stateContext);
  const errorMessage = useEventStore((state) => state.errorMessage);
  const decisionRecovery = useEventStore((state) => state.decisionRecovery);
  const activeRuntime = useEventStore((state) => state.activeRuntime);
  const selectDecision = useEventStore((state) => state.selectDecision);
  const selectEntity = useEventStore((state) => state.selectEntity);
  const createDecisionDraft = useEventStore((state) => state.createDecisionDraft);
  const resetDemoData = useEventStore((state) => state.resetDemoData);
  const [view, setView] = useState<DecisionView>('list');
  const [createOpen, setCreateOpen] = useState(false);
  const now = useMemo(() => new Date(), []);
  const priorityRecords = useMemo(() => prioritizeDecisions(records, now), [now, records]);
  const selectedDecision = records.find((record) => record.decisionId === selectedDecisionId) ?? priorityRecords[0]?.record;
  const links = selectedDecision ? getDecisionImpactLinks(selectedDecision, entities) : [];
  const summary = useMemo(() => ({
    open: records.filter((record) => record.status !== 'closed').length,
    critical: records.filter((record) => record.urgency === 'critical' && record.status !== 'closed').length,
    awaitingApproval: records.filter((record) => record.approvalStatus !== 'approved').length,
    overdue: records.filter((record) => isDecisionOverdue(record, now)).length,
    incompleteTrust: records.filter((record) => calculateDecisionTrust(record).score < 75).length,
    outcomesPending: records.filter((record) => record.outcomeStatus === 'not-measured' || record.outcomeStatus === 'not-started').length
  }), [now, records]);

  return (
    <div
      data-testid="decision-center"
      data-event-id={activeRuntime?.identity.eventInstanceId ?? fallbackRuntimeIdentity.eventId}
      data-venue-id={activeRuntime?.identity.venueId ?? fallbackRuntimeIdentity.venueId}
      className="min-h-0 flex-1 overflow-y-auto command-scrollbar"
    >
      <div className="mx-auto w-full max-w-[1920px] space-y-4 p-4">
        <header className="flex flex-wrap items-start justify-between gap-4 border border-command-line bg-command-panel p-4 shadow-command">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <GitBranch className="h-5 w-5 text-command-accent" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-command-text">مركز القرارات</h2>
              <span className="rounded border border-command-amber/70 bg-command-amber/10 px-2 py-1 text-[11px] text-command-amber">بيانات تجريبية مؤقتة</span>
            </div>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-command-muted">تحويل الملاحظة التشغيلية إلى قرار منظم، مالك، اعتماد، إجراء، دليل، وقياس أثر. هذه حزمة تحقق محلية وليست نظام تشغيل حي أو سجل تدقيق إنتاجياً.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button data-testid="decision-create-open" type="button" onClick={() => setCreateOpen((value) => !value)} className="command-button command-button-primary"><Plus className="h-4 w-4" aria-hidden="true" />قرار تجريبي جديد</button>
            <button data-testid="decision-reset-demo" type="button" onClick={resetDemoData} className="command-button">إعادة بيانات القرارات</button>
          </div>
        </header>

        {decisionRecovery.rejectedRecords.length || decisionRecovery.migrationNotices.length ? <div data-testid="decision-recovery-notice" className="border border-command-amber/60 bg-command-amber/10 p-3 text-sm leading-7 text-command-text"><strong className="text-command-amber">مراجعة سلامة التخزين المحلي:</strong> استُبعد {decisionRecovery.rejectedRecords.length} سجل غير صالح، وتحتاج {decisionRecovery.migrationNotices.length} نتيجة هجرة إلى مراجعة. لم تدخل هذه السجلات إلى الحالة الأساسية أو حساب الأولوية.</div> : null}

        {createOpen ? <CreateDecisionForm onCancel={() => setCreateOpen(false)} onCreate={(input) => { createDecisionDraft(input); setCreateOpen(false); }} /> : null}

        <Panel title="ملخص القرارات التنفيذي" eyebrow={`الحالة: ${stateContext.stateLayer === 'scenario' ? 'سيناريو' : stateContext.dataSource === 'temporary-demo' ? 'بيانات تجريبية مؤقتة' : 'أساسية محلية'}`}>
          <DecisionSummary summary={summary} />
        </Panel>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <Panel title="طابور القرارات المفتوحة" eyebrow="الأولوية بقواعد شفافة">
            <DecisionQueue priorityRecords={priorityRecords} selectedDecisionId={selectedDecision?.decisionId ?? null} onSelect={selectDecision} />
          </Panel>
          <Panel title="لوحة الأولوية" eyebrow="الأثر التشغيلي منفصل عن جودة البيانات">
            <DecisionPriorityBoard priorityRecords={priorityRecords} onSelect={selectDecision} />
          </Panel>
        </div>

        <Panel title="مساحة القرار" eyebrow="قائمة وعلاقات ثنائية الأبعاد ومشهد ثلاثي الأبعاد" action={<DecisionViewSwitcher view={view} onChange={setView} />}>
          {view === 'list' ? <DecisionList records={priorityRecords} selectedDecisionId={selectedDecision?.decisionId ?? null} onSelect={selectDecision} /> : null}
          {view === 'relationship' && selectedDecision ? <DecisionRelationship2D decision={selectedDecision} links={links} entities={entities} onSelectEntity={(entityId) => { selectEntity(entityId); setView('scene'); }} /> : null}
          {view === 'scene' && selectedDecision ? <div data-testid="decision-3d-view" className="relative overflow-hidden border border-command-line bg-command-panelStrong"><EventSceneViewport className="h-[520px] xl:h-[620px]" highlightedEntityIds={links.map((link) => link.entityId)} /><div data-testid="decision-3d-relationships" className="absolute bottom-3 right-3 max-h-[42%] max-w-[520px] overflow-y-auto border border-command-accent/70 bg-command-bg/95 p-3 shadow-command"><p className="text-sm font-semibold text-command-text">العلاقات الظاهرة في المشهد</p><div className="mt-2 grid gap-2">{links.map((link) => <span key={link.relationId} data-relation-type={link.relationType} className="flex items-center justify-between gap-3 rounded border border-command-line bg-command-panelStrong px-3 py-2 text-xs text-command-text"><span>{entities[link.entityId]?.nameAr ?? 'عنصر مكاني'} · <strong className="text-command-accent">{decisionRelationLabelsAr[link.relationType]}</strong></span><span className="ltr shrink-0 text-command-amber">{link.entityId}</span></span>)}</div></div></div> : null}
          {view !== 'list' && !selectedDecision ? <EmptyState title="لا يوجد قرار محدد" message="اختر قراراً من الطابور أو القائمة أولاً." /> : null}
        </Panel>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          <Panel title="تفاصيل القرار" eyebrow="الملكية والاعتماد والتنفيذ والأثر">
            <DecisionDetails key={`${selectedDecision?.decisionId ?? 'none'}-${selectedDecision?.revision ?? 0}`} record={selectedDecision} entities={entities} selectedEntityId={selectedEntityId} onSelectEntity={(entityId) => { selectEntity(entityId); setView('scene'); }} />
            <DecisionLifecycleActions record={selectedDecision} />
          </Panel>
          <Panel title="الثقة والدليل" eyebrow="لا تخفي الأولوية عدم اليقين" className="2xl:sticky 2xl:top-4 2xl:self-start">
            <DecisionTrustPanel record={selectedDecision} />
            <DecisionPriorityPanel record={selectedDecision} now={now} />
          </Panel>
        </div>

        {errorMessage ? <div data-testid="decision-error"><ErrorState title="تعذر حفظ القرار" message={errorMessage} /></div> : null}
      </div>
    </div>
  );
}

function DecisionLifecycleActions({ record }: { record: DecisionRecord | undefined }) {
  const transitionDecision = useEventStore((state) => state.transitionDecision);
  const approveDecision = useEventStore((state) => state.approveDecision);
  if (!record || record.status === 'closed') return null;
  const action: { label: string; status?: DecisionLifecycleStatus; approve?: boolean } = record.status === 'draft'
    ? { label: 'نقل إلى المراجعة', status: 'review' }
    : record.status === 'review'
      ? { label: 'اعتماد محلي', approve: true }
      : record.status === 'approved'
        ? { label: 'إسناد القرار', status: 'assigned' }
        : record.status === 'assigned'
          ? { label: 'بدء التنفيذ', status: 'in-progress' }
          : record.status === 'in-progress'
            ? { label: 'تسجيل الاكتمال', status: 'completed' }
            : record.status === 'completed'
              ? { label: 'تحقق من الأثر محلياً', status: 'verified' }
              : { label: 'إغلاق القرار', status: 'closed' };
  const handleAction = () => {
    if (action.approve) {
      approveDecision(record.decisionId, 'اعتماد محلي للتحقق فقط.');
      return;
    }
    if (action.status) transitionDecision(record.decisionId, action.status);
  };
  return <div data-testid="decision-lifecycle-actions" className="mt-4 rounded border border-command-line bg-command-panelStrong p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-command-muted">الخطوة التالية في الدورة المحلية</p><p className="mt-1 text-sm font-semibold text-command-text">{action.label}</p></div><button data-testid="decision-next-lifecycle" type="button" onClick={handleAction} className="command-button command-button-primary">{action.label}</button></div><p className="mt-2 text-xs leading-6 text-command-muted">يجب حفظ متطلبات الخطوة أولاً. هذه أداة تحقق محلية؛ لا تنفذ سير عمل مستداماً ولا تمنح سلطة اعتماد رسمية.</p></div>;
}

function DecisionSummary({ summary }: { summary: { open: number; critical: number; awaitingApproval: number; overdue: number; incompleteTrust: number; outcomesPending: number } }) {
  const items = [
    ['قرارات مفتوحة', summary.open, ClipboardList],
    ['قرارات حرجة', summary.critical, ShieldAlert],
    ['تحتاج اعتماداً', summary.awaitingApproval, BadgeCheck],
    ['متأخرة', summary.overdue, AlertTriangle],
    ['ثقة غير مكتملة', summary.incompleteTrust, Target],
    ['أثر غير مقاس', summary.outcomesPending, Route]
  ] as const;
  return <div data-testid="decision-summary" className="grid grid-cols-2 gap-2.5 xl:grid-cols-3 2xl:grid-cols-6">{items.map(([label, value, Icon]) => <div key={label} className="min-h-[78px] rounded border border-command-line bg-command-panelStrong p-3"><div className="flex items-center justify-between gap-2"><p className="text-[11px] text-command-muted">{label}</p><Icon className="h-4 w-4 text-command-accent" aria-hidden="true" /></div><p className="mt-1 text-2xl font-semibold text-command-text">{value}</p></div>)}</div>;
}

function DecisionQueue({ priorityRecords, selectedDecisionId, onSelect }: { priorityRecords: ReturnType<typeof prioritizeDecisions>; selectedDecisionId: string | null; onSelect: (decisionId: DecisionRecord['decisionId']) => void }) {
  const open = priorityRecords.filter(({ record }) => record.status !== 'closed');
  return <div data-testid="decision-open-queue" className="space-y-2">{open.length ? open.slice(0, 5).map(({ record, priority }, index) => <button key={record.decisionId} data-testid={`decision-item-${record.decisionId}`} type="button" onClick={() => onSelect(record.decisionId)} aria-pressed={selectedDecisionId === record.decisionId} className={`w-full rounded border p-3 text-right transition ${selectedDecisionId === record.decisionId ? 'border-command-accent bg-command-accent/10' : 'border-command-line bg-command-panelStrong hover:border-command-accent/70'}`}><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-command-line text-sm text-command-accent">{index + 1}</span><div className="min-w-0"><p className="font-semibold text-command-text"><span className="ltr inline-block">{record.decisionId}</span> · {record.title}</p><p className="mt-1 text-xs leading-6 text-command-muted">{priority.operationalExplanationAr}</p><p className="mt-1 text-xs leading-6 text-command-amber">{priority.dataQualityExplanationAr}</p></div></div><span className="shrink-0 text-left"><strong className="ltr block text-lg text-command-amber">{priority.operationalPriorityScore}</strong><small className="block text-[10px] text-command-muted">تشغيلية من 100</small><span className="ltr mt-2 block text-xs text-command-accent">{priority.dataQualityAttentionScore}</span><small className="block text-[10px] text-command-muted">عناية البيانات</small></span></div></button>) : <EmptyState title="لا توجد قرارات مفتوحة" message="لا توجد قرارات تجريبية مفتوحة حالياً." />}</div>;
}

function DecisionPriorityBoard({ priorityRecords, onSelect }: { priorityRecords: ReturnType<typeof prioritizeDecisions>; onSelect: (decisionId: DecisionRecord['decisionId']) => void }) {
  return <div data-testid="decision-priority-board" className="grid grid-cols-2 gap-2">{(['عاجلة', 'مرتفعة', 'متوسطة', 'منخفضة'] as const).map((label) => { const items = priorityRecords.filter(({ priority }) => priority.operationalPriorityLabelAr === label); return <div key={label} className="min-h-[88px] rounded border border-command-line bg-command-panelStrong p-2"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-command-text">{label}</span><span className="ltr text-xs text-command-muted">{items.length}</span></div><div className="mt-2 space-y-1">{items.slice(0, 2).map(({ record }) => <button key={record.decisionId} type="button" onClick={() => onSelect(record.decisionId)} className="block w-full truncate text-right text-[11px] text-command-muted hover:text-command-accent">{record.title}</button>)}</div></div>; })}</div>;
}

function DecisionList({ records, selectedDecisionId, onSelect }: { records: ReturnType<typeof prioritizeDecisions>; selectedDecisionId: string | null; onSelect: (decisionId: DecisionRecord['decisionId']) => void }) {
  return <div data-testid="decision-list" className="overflow-x-auto"><table className="w-full min-w-[1040px] border-collapse text-right text-sm"><thead><tr className="border-b border-command-line text-xs text-command-muted"><th className="px-3 py-3">القرار</th><th className="px-3 py-3">النوع</th><th className="px-3 py-3">الحالة</th><th className="px-3 py-3">الملكية</th><th className="px-3 py-3">الثقة والدليل</th><th className="px-3 py-3">أولوية التشغيل</th><th className="px-3 py-3">عناية البيانات</th></tr></thead><tbody>{records.map(({ record, priority }) => <tr key={record.decisionId} className={`border-b border-command-line/70 ${selectedDecisionId === record.decisionId ? 'bg-command-accent/10' : ''}`}><td className="px-3 py-3"><button data-testid={`decision-row-${record.decisionId}`} type="button" onClick={() => onSelect(record.decisionId)} className="text-right"><span className="block font-semibold text-command-text">{record.title}</span><span className="ltr mt-1 block text-xs text-command-muted">{record.decisionId}</span></button></td><td className="px-3 py-3 text-xs text-command-muted">{typeLabels[record.decisionType]}</td><td className="px-3 py-3"><span className="rounded border border-command-line px-2 py-1 text-xs text-command-text">{statusLabels[record.status]}</span></td><td className="px-3 py-3 text-xs text-command-muted">{record.decisionOwner}</td><td className="px-3 py-3 text-xs text-command-muted">{confidenceLabels[record.confidence]} · {record.evidence.length ? `${record.evidence.length} دليل` : 'دون دليل'}</td><td className="px-3 py-3"><span className="ltr font-semibold text-command-amber">{priority.operationalPriorityScore}/100</span><span className="mt-1 block text-xs text-command-muted">{priority.operationalPriorityLabelAr}</span></td><td className="px-3 py-3"><span className="ltr font-semibold text-command-accent">{priority.dataQualityAttentionScore}/100</span><span className="mt-1 block text-xs text-command-muted">{priority.dataQualityAttentionLabelAr}</span></td></tr>)}</tbody></table></div>;
}

function DecisionViewSwitcher({ view, onChange }: { view: DecisionView; onChange: (view: DecisionView) => void }) {
  const items: Array<{ id: DecisionView; label: string; icon: typeof List; testId: string }> = [
    { id: 'list', label: 'قائمة', icon: List, testId: 'decision-view-list' },
    { id: 'relationship', label: 'علاقات ثنائية', icon: Map, testId: 'decision-view-2d' },
    { id: 'scene', label: 'مشهد ثلاثي', icon: Box, testId: 'decision-view-3d' }
  ];
  return <div className="flex flex-wrap gap-2" role="group" aria-label="طرق عرض القرار">{items.map(({ id, label, icon: Icon, testId }) => <button key={id} data-testid={testId} type="button" onClick={() => onChange(id)} aria-pressed={view === id} className={`command-button min-h-9 px-2.5 text-xs ${view === id ? 'command-button-primary' : ''}`}><Icon className="h-4 w-4" aria-hidden="true" />{label}</button>)}</div>;
}

function DecisionTrustPanel({ record }: { record: DecisionRecord | undefined }) {
  if (!record) return <EmptyState title="لا يوجد قرار" message="اختر قراراً لعرض مستوى الثقة والدليل." />;
  const trust = calculateDecisionTrust(record);
  return <div data-testid="decision-trust-panel" className="space-y-3"><div className="rounded border border-command-accent/60 bg-command-accent/10 p-4"><p className="text-xs text-command-muted">الثقة المركبة المحلية</p><p className="mt-1 text-3xl font-semibold text-command-text">{trust.score}%</p><p className="mt-1 text-sm font-semibold text-command-accent">{trust.labelAr}</p></div><TrustLine label="جودة المصدر" value={`${trust.sourceQuality}%`} /><TrustLine label="اكتمال الدليل" value={`${trust.evidenceCompleteness}%`} /><TrustLine label="اكتمال الاعتماد" value={`${trust.approvalCompleteness}%`} /><div className="rounded border border-command-line bg-command-panelStrong p-3 text-xs leading-6 text-command-muted">{trust.factorsAr.join(' · ')}</div></div>;
}

function DecisionPriorityPanel({ record, now }: { record: DecisionRecord | undefined; now: Date }) {
  if (!record) return null;
  const priority = calculateDecisionPriority(record, now);
  return <div data-testid="decision-priority-explanation" className="mt-4 space-y-3 border-t border-command-line pt-4"><div className="grid gap-3 xl:grid-cols-2"><div className="rounded border border-command-amber/60 bg-command-amber/10 p-4"><div className="flex items-end justify-between gap-3"><div><p className="text-xs text-command-muted">نقاط الأولوية من 100 · تشغيلية</p><p data-testid="decision-normalized-priority" className="ltr mt-1 text-3xl font-semibold text-command-text">{priority.operationalPriorityScore}/100</p></div><div className="text-left"><p className="text-sm font-semibold text-command-amber">{priority.operationalPriorityLabelAr}</p><p className="ltr mt-1 text-[10px] text-command-muted">{priority.modelVersion}</p></div></div><p className="mt-3 text-xs leading-6 text-command-text">{priority.operationalExplanationAr}</p></div><div className="rounded border border-command-accent/60 bg-command-accent/10 p-4"><div className="flex items-end justify-between gap-3"><div><p className="text-xs text-command-muted">نقاط عناية جودة البيانات من 100</p><p data-testid="decision-data-quality-attention" className="ltr mt-1 text-3xl font-semibold text-command-text">{priority.dataQualityAttentionScore}/100</p></div><p className="text-sm font-semibold text-command-accent">{priority.dataQualityAttentionLabelAr}</p></div><p className="mt-3 text-xs leading-6 text-command-text">{priority.dataQualityExplanationAr}</p></div></div><div className="grid gap-3 xl:grid-cols-2"><div><p className="mb-2 text-xs font-semibold text-command-muted">أقوى عوامل التشغيل</p><div data-testid="decision-priority-factors" className="grid grid-cols-2 gap-2">{priority.strongestOperationalFactors.map((factor) => <div key={factor.key} className="rounded border border-command-line bg-command-panelStrong p-2"><p className="text-[11px] text-command-muted">{factor.labelAr}</p><p className="ltr mt-1 font-semibold text-command-text">+{factor.points}</p></div>)}</div></div><div><p className="mb-2 text-xs font-semibold text-command-muted">أقوى فجوات جودة البيانات</p><div data-testid="decision-data-quality-factors" className="grid grid-cols-2 gap-2">{priority.strongestDataQualityFactors.map((factor) => <div key={factor.key} className="rounded border border-command-line bg-command-panelStrong p-2"><p className="text-[11px] text-command-muted">{factor.labelAr}</p><p className="ltr mt-1 font-semibold text-command-text">+{factor.points}</p></div>)}</div></div></div><div data-testid="decision-priority-data-caveat" className="rounded border border-command-accent/50 bg-command-accent/5 p-3 text-xs leading-6 text-command-text">جودة البيانات توجه أعمال الاستكمال فقط، ولا ترفع شدة الأثر التشغيلي.</div></div>;
}

function TrustLine({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between border-b border-command-line/70 pb-2 text-sm"><span className="text-command-muted">{label}</span><span className="ltr font-semibold text-command-text">{value}</span></div>; }

interface DecisionDraft {
  decisionOwner: string;
  responsibleParty: string;
  approvingAuthority: string;
  source: string;
  confidence: DecisionConfidence;
  status: DecisionLifecycleStatus;
  evidenceTitle: string;
  evidenceStatus: EvidenceReference['status'];
  actionRequired: string;
  assignedTo: string;
  dueAt: string;
  selectedOption: string;
  changeReason: string;
  outcomeStatus: DecisionOutcomeStatus;
  actualImpactSummary: string;
  completionEvidenceId: string;
  completionNote: string;
  verifiedBy: string;
  verifiedAt: string;
  verificationEvidenceId: string;
  closedBy: string;
  closedAt: string;
  closureReason: string;
  lessonsLearned: string;
}

function createDecisionDraft(record: DecisionRecord | undefined): DecisionDraft | null {
  if (!record) return null;
  return { decisionOwner: record.decisionOwner, responsibleParty: record.responsibleParty, approvingAuthority: record.approvingAuthority, source: record.source, confidence: record.confidence, status: record.status, evidenceTitle: record.evidence[0]?.titleAr ?? '', evidenceStatus: record.evidence[0]?.status ?? 'pending', actionRequired: record.actionRequired, assignedTo: record.assignedTo ?? '', dueAt: record.dueAt, selectedOption: record.selectedOption ?? '', changeReason: record.changeReason, outcomeStatus: record.outcomeStatus, actualImpactSummary: record.actualImpact?.summaryAr ?? '', completionEvidenceId: record.completionEvidenceIds[0] ?? '', completionNote: record.completionNote, verifiedBy: record.verifiedBy ?? '', verifiedAt: record.verifiedAt ?? '', verificationEvidenceId: record.verificationEvidenceIds[0] ?? '', closedBy: record.closedBy ?? '', closedAt: record.closedAt ?? '', closureReason: record.closureReason, lessonsLearned: record.lessonsLearned };
}

function DecisionDetails({ record, entities, selectedEntityId, onSelectEntity }: { record: DecisionRecord | undefined; entities: ReturnType<typeof useEventStore.getState>['entities']; selectedEntityId: string | null; onSelectEntity: (entityId: SpatialEntityId) => void }) {
  const updateDecision = useEventStore((state) => state.updateDecision);
  const approveDecision = useEventStore((state) => state.approveDecision);
  const errorMessage = useEventStore((state) => state.errorMessage);
  const [draft, setDraft] = useState<DecisionDraft | null>(() => createDecisionDraft(record));
  if (!record || !draft) return <EmptyState title="لا يوجد قرار محدد" message="اختر قراراً من الطابور أو القائمة." />;
  const links = getDecisionImpactLinks(record, entities);
  const save = () => {
    const baseEvidence = record.evidence[0];
    const evidence = draft.evidenceTitle.trim() ? [{ id: baseEvidence?.id ?? `DECISION-EVIDENCE-${record.decisionId}`, type: baseEvidence?.type ?? 'exercise', titleAr: draft.evidenceTitle.trim(), source: baseEvidence?.source ?? draft.source, capturedAt: baseEvidence?.capturedAt ?? new Date().toISOString(), status: draft.evidenceStatus }] : [];
    const update: DecisionUpdate = { decisionOwner: draft.decisionOwner, responsibleParty: draft.responsibleParty, approvingAuthority: draft.approvingAuthority, source: draft.source, confidence: draft.confidence, status: draft.status, evidence, selectedOption: draft.selectedOption || null, actionRequired: draft.actionRequired, assignedTo: draft.assignedTo || null, dueAt: draft.dueAt, outcomeStatus: draft.outcomeStatus, actualImpact: draft.actualImpactSummary.trim() ? { level: record.expectedImpact.level, summaryAr: draft.actualImpactSummary.trim(), dimensions: { ...record.expectedImpact.dimensions } } : null, completionEvidenceIds: draft.completionEvidenceId.trim() ? [draft.completionEvidenceId.trim()] : [], completionNote: draft.completionNote, verifiedBy: draft.verifiedBy || null, verifiedAt: draft.verifiedAt || null, verificationEvidenceIds: draft.verificationEvidenceId.trim() ? [draft.verificationEvidenceId.trim()] : [], closedBy: draft.closedBy || null, closedAt: draft.closedAt || null, closureReason: draft.closureReason, lessonsLearned: draft.lessonsLearned, changeReason: draft.changeReason };
    updateDecision(record.decisionId, update);
  };
  return <DecisionDetailsView record={record} entities={entities} selectedEntityId={selectedEntityId} links={links} draft={draft} setDraft={setDraft} errorMessage={errorMessage} onSave={save} onApprove={() => approveDecision(record.decisionId, 'اعتماد محلي للتحقق فقط.')} onSelectEntity={onSelectEntity} />;
}

function CreateDecisionForm({ onCancel, onCreate }: { onCancel: () => void; onCreate: (input: CreateDecisionInput) => void }) {
  const entities = useEventStore((state) => state.entities);
  const defaultEntityId = Object.values(entities).find((entity) => entity.type === 'zone')?.id
    ?? Object.values(entities).find((entity) => entity.type !== 'site')?.id
    ?? '';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [decisionType, setDecisionType] = useState<DecisionType>('readiness');
  const [decisionOwner, setDecisionOwner] = useState('');
  const [responsibleParty, setResponsibleParty] = useState('');
  const [relatedEntityId, setRelatedEntityId] = useState(defaultEntityId);
  return <section data-testid="decision-create-form" className="border border-command-accent/70 bg-command-panel p-4 shadow-command"><div className="flex items-center justify-between gap-3"><div><p className="text-xs text-command-accent">مسودة محلية</p><h2 className="mt-1 text-lg font-semibold text-command-text">إنشاء قرار تجريبي</h2></div><button type="button" onClick={onCancel} className="command-button">إلغاء</button></div><div className="mt-4 grid gap-3 xl:grid-cols-2"><label className="block xl:col-span-2"><span className="mb-2 block text-xs text-command-muted">عنوان القرار</span><input data-testid="decision-create-title" value={title} onChange={(event) => setTitle(event.target.value)} className="command-select" /></label><label className="block xl:col-span-2"><span className="mb-2 block text-xs text-command-muted">وصف المشكلة</span><textarea data-testid="decision-create-description" value={description} onChange={(event) => setDescription(event.target.value)} className="command-select min-h-20 resize-y" /></label><label className="block"><span className="mb-2 block text-xs text-command-muted">نوع القرار</span><select data-testid="decision-create-type" value={decisionType} onChange={(event) => setDecisionType(event.target.value as DecisionType)} className="command-select">{decisionTypeValues.map((value) => <option key={value} value={value}>{typeLabels[value]}</option>)}</select></label><label className="block"><span className="mb-2 block text-xs text-command-muted">هدف التنفيذ المكاني</span><input data-testid="decision-create-entity" value={relatedEntityId} onChange={(event) => setRelatedEntityId(event.target.value)} className="command-select ltr text-left" /></label><label className="block"><span className="mb-2 block text-xs text-command-muted">مالك القرار</span><input data-testid="decision-create-owner" value={decisionOwner} onChange={(event) => setDecisionOwner(event.target.value)} className="command-select" /></label><label className="block"><span className="mb-2 block text-xs text-command-muted">المسؤول عن التنفيذ</span><input data-testid="decision-create-responsible" value={responsibleParty} onChange={(event) => setResponsibleParty(event.target.value)} className="command-select" /></label></div><button data-testid="decision-create-submit" type="button" onClick={() => onCreate({ title, description, decisionType, decisionOwner, responsibleParty, relationships: [{ entityId: relatedEntityId as SpatialEntityId, relationType: 'execution-target', impactLevel: 'medium', descriptionAr: 'هدف التنفيذ المكاني لمسودة القرار المحلية.' }] })} className="command-button command-button-primary mt-4"><Plus className="h-4 w-4" aria-hidden="true" />إنشاء المسودة</button></section>;
}

function DetailValue({ label, value, ltr = false, testId }: { label: string; value: string; ltr?: boolean; testId?: string }) { return <div data-testid={testId} className="rounded border border-command-line bg-command-panelStrong p-3"><p className="text-[11px] text-command-muted">{label}</p><p className={`mt-1 text-sm font-semibold text-command-text ${ltr ? 'ltr text-left' : ''}`}>{value}</p></div>; }
function DetailList({ title, items, empty = 'لا توجد بيانات.' }: { title: string; items: string[]; empty?: string }) { return <div className="rounded border border-command-line bg-command-panelStrong p-3"><p className="text-xs font-semibold text-command-muted">{title}</p>{items.length ? <ul className="mt-2 space-y-1 text-xs leading-6 text-command-text">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-2 text-xs text-command-muted">{empty}</p>}</div>; }
