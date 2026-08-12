import {
  Check,
  GitCompareArrows,
  History,
  RotateCcw,
  Save,
  ShieldAlert,
  Undo2
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  activateReadinessPackRevision,
  canonicalReadinessOperationalPackContent,
  createReadinessAuthoringState,
  freezeReadinessOperationalPack,
  getActiveReadinessPack,
  previewReadinessPackRevision,
  resetReadinessAuthoringState,
  rollbackReadinessPackRevision
} from '../../services/readinessPackAuthoring';
import { validateReadinessOperationalPack } from '../../services/readinessDerivationV2';
import type {
  ReadinessAuthoringState,
  ReadinessOperationalPack
} from '../../types/readinessIntelligence';

type DraftChangeKind = 'owner' | 'evidence-policy' | 'gate-rule';
type AssessmentPreview = 'unknown' | 'evidence-submitted' | 'verified';

const changeLabels: Record<DraftChangeKind, string> = {
  owner: 'ملكية المتطلب',
  'evidence-policy': 'سياسة الدليل',
  'gate-rule': 'قاعدة البوابة'
};

const assessmentLabels: Record<AssessmentPreview, string> = {
  unknown: 'غير مُقيّم',
  'evidence-submitted': 'دليل مرفق، غير متحقق',
  verified: 'متحقق، غير معتمد'
};

function buildDraftPack(
  active: ReadinessOperationalPack,
  changeKind: DraftChangeKind
): ReadinessOperationalPack {
  const next = structuredClone(active);
  next.revision = active.revision + 1;
  next.effectiveAt = '2026-07-29T12:00:00+03:00';
  if (changeKind === 'owner') {
    const requirement = next.requirements[0];
    if (!requirement) throw new Error('READINESS_AUTHORING_REQUIREMENT_MISSING');
    requirement.ownerRoleId = requirement.ownerRoleId === 'ROLE-KAP-PMO'
      ? 'ROLE-KAP-MAYADEEN-PROJECT-MANAGER'
      : 'ROLE-KAP-PMO';
  } else if (changeKind === 'evidence-policy') {
    const requirement = next.requirements[0];
    if (!requirement) throw new Error('READINESS_AUTHORING_REQUIREMENT_MISSING');
    requirement.evidencePolicyId = requirement.evidencePolicyId
      ? null
      : 'EVIDENCE-POLICY-LOCAL-DRAFT-ONLY';
  } else {
    const gate = next.gates[0];
    if (!gate) throw new Error('READINESS_AUTHORING_GATE_MISSING');
    gate.reasonsAr = gate.reasonsAr.includes('معاينة قاعدة محلية غير مفعلة.')
      ? gate.reasonsAr.filter((reason) => reason !== 'معاينة قاعدة محلية غير مفعلة.')
      : [...gate.reasonsAr, 'معاينة قاعدة محلية غير مفعلة.'];
  }
  return freezeReadinessOperationalPack(canonicalReadinessOperationalPackContent(next));
}

function statusAr(state: ReadinessAuthoringState): string {
  const active = state.revisions.find((revision) => revision.revisionId === state.activeRevisionId);
  return active
    ? `الإصدار المحلي النشط ${active.revision}`
    : 'لا يوجد إصدار محلي نشط';
}

export default function ReadinessLocalAuthoringPanel({
  pack
}: {
  pack: ReadinessOperationalPack;
}) {
  const initialState = useMemo(
    () => createReadinessAuthoringState(pack.projectId, pack),
    [pack]
  );
  const [state, setState] = useState<ReadinessAuthoringState>(() => structuredClone(initialState));
  const [changeKind, setChangeKind] = useState<DraftChangeKind>('owner');
  const [assessmentPreview, setAssessmentPreview] = useState<AssessmentPreview>('unknown');
  const [changeReason, setChangeReason] = useState('');
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [messageAr, setMessageAr] = useState('ابدأ بمعاينة فرق غير تشغيلي.');
  const activePack = getActiveReadinessPack(state) ?? pack;
  const selectedDraft = state.revisions.find((revision) => revision.revisionId === selectedDraftId) ?? null;
  const validation = validateReadinessOperationalPack(activePack);

  const preview = () => {
    try {
      const draftPack = buildDraftPack(activePack, changeKind);
      const result = previewReadinessPackRevision({
        state,
        nextPack: draftPack,
        changeReason,
        actorRef: 'ACTOR-LOCAL-READINESS-AUTHOR',
        createdAt: draftPack.effectiveAt
      });
      setState(result.state);
      setSelectedDraftId(result.revision.revisionId);
      setMessageAr(result.revision.status === 'draft'
        ? 'أُنشئت معاينة فرق؛ لم تُفعّل بعد.'
        : 'حُجرت المعاينة بسبب أخطاء التحقق.');
    } catch (error) {
      setMessageAr(error instanceof Error && error.message === 'READINESS_CHANGE_REASON_REQUIRED'
        ? 'سبب التغيير إلزامي قبل المعاينة.'
        : 'تعذر إنشاء المعاينة دون إصلاح صامت.');
    }
  };

  const activate = () => {
    if (!selectedDraft) return;
    try {
      setState((current) => activateReadinessPackRevision(current, selectedDraft.revisionId));
      setMessageAr('فُعّل الإصدار داخل جلسة التأليف المحلية فقط؛ لم يتغير baseline.');
      setSelectedDraftId(null);
    } catch {
      setMessageAr('حُجب التنشيط لحماية السياق أو baseline.');
    }
  };

  const rollback = () => {
    const prior = [...state.revisions]
      .reverse()
      .find((revision) => revision.status === 'rolled-back');
    if (!prior) {
      setMessageAr('لا يوجد إصدار سابق صالح للرجوع.');
      return;
    }
    setState((current) => rollbackReadinessPackRevision(current, prior.revisionId));
    setSelectedDraftId(null);
    setMessageAr('استُعيد الإصدار السابق حرفيًا ببصمته الأصلية.');
  };

  const reset = () => {
    setState(resetReadinessAuthoringState(initialState));
    setSelectedDraftId(null);
    setChangeReason('');
    setMessageAr('أُعيدت جلسة التأليف إلى الحزمة المجمدة.');
  };

  return (
    <div data-testid="readiness-local-authoring" className="ri-local-authoring">
      <div className="ri-local-authoring-warning">
        <ShieldAlert aria-hidden="true" />
        <div>
          <strong>تأليف محلي مضبوط</strong>
          <span>لا backend اعتماد · لا ترقية إلى baseline · لا إصلاح تلقائي</span>
        </div>
      </div>

      <div className="ri-authoring-grid">
        <label>
          <span>نوع التغيير</span>
          <select value={changeKind} onChange={(event) => setChangeKind(event.target.value as DraftChangeKind)}>
            {Object.entries(changeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>معاينة تقييم فقط</span>
          <select data-testid="readiness-assessment-preview" value={assessmentPreview} onChange={(event) => setAssessmentPreview(event.target.value as AssessmentPreview)}>
            {Object.entries(assessmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      <div className="ri-assessment-preview">
        <span>حالة افتراضية غير مفعلة</span>
        <strong>{assessmentLabels[assessmentPreview]}</strong>
        <small>{assessmentPreview === 'verified' ? 'التحقق لا يساوي اعتمادًا.' : 'المعاينة لا تغيّر لقطة KAP.'}</small>
      </div>

      <label className="ri-authoring-reason">
        <span>سبب التغيير الإلزامي</span>
        <textarea
          data-testid="readiness-authoring-reason"
          value={changeReason}
          onChange={(event) => setChangeReason(event.target.value)}
          placeholder="اكتب سببًا موجزًا وقابلًا للمراجعة"
        />
      </label>

      <div className="ri-authoring-actions">
        <button data-testid="readiness-authoring-preview" type="button" onClick={preview}><GitCompareArrows aria-hidden="true" />معاينة الفرق</button>
        <button data-testid="readiness-authoring-activate" type="button" disabled={selectedDraft?.status !== 'draft'} onClick={activate}><Save aria-hidden="true" />تنشيط محلي</button>
        <button type="button" onClick={rollback}><Undo2 aria-hidden="true" />رجوع</button>
        <button type="button" onClick={reset}><RotateCcw aria-hidden="true" />إعادة ضبط</button>
      </div>

      <div className="ri-authoring-status" role="status">
        <History aria-hidden="true" />
        <div><strong>{statusAr(state)}</strong><span>{messageAr}</span></div>
        <bdi dir="ltr">{activePack.contentHash.slice(0, 16)}…</bdi>
      </div>

      {selectedDraft ? (
        <div data-testid="readiness-authoring-diff" className="ri-authoring-diff">
          <header><strong>قبل / بعد</strong><span>{selectedDraft.diff.length} تغييرات</span></header>
          {selectedDraft.diff.slice(0, 5).map((entry) => (
            <article key={entry.path}>
              <code>{entry.path}</code>
              <span><del>{JSON.stringify(entry.before)}</del><ins>{JSON.stringify(entry.after)}</ins></span>
            </article>
          ))}
        </div>
      ) : null}

      <div className={validation.valid ? 'ri-validation-pass' : 'ri-validation-fail'}>
        <Check aria-hidden="true" />
        <strong>{validation.valid ? 'مراجع الحزمة متسقة' : 'الحزمة محجوبة'}</strong>
        <span>{validation.issues.length} ملاحظات · {state.revisions.length} إصدارات في الجلسة</span>
      </div>
    </div>
  );
}
