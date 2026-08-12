import {
  AlertTriangle,
  Check,
  FileClock,
  GitCompareArrows,
  LockKeyhole,
  Redo2,
  RotateCcw,
  Save,
  Undo2,
  X
} from 'lucide-react';
import { useState } from 'react';
import type { SpatialCommandMode } from '../../types/spatialCommand';
import type {
  CandidateAnchorEditingSession,
  CandidateAnchorRevision
} from '../../types/spatialTruth';

export function CandidateAnchorAuthoringPanel({
  session,
  selectedEntityId,
  selectedEntityLabelAr,
  draft,
  busy,
  messageAr,
  onModeChange,
  onReasonChange,
  onUndo,
  onRedo,
  onRestoreSelected,
  onSaveDraft,
  onFreeze,
  onCancel
}: {
  session: CandidateAnchorEditingSession;
  selectedEntityId: string | null;
  selectedEntityLabelAr: string | null;
  draft: CandidateAnchorRevision | null;
  busy: boolean;
  messageAr: string | null;
  onModeChange: (mode: SpatialCommandMode) => void;
  onReasonChange: (reason: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onRestoreSelected: () => void;
  onSaveDraft: () => void;
  onFreeze: (confirmed: boolean) => void;
  onCancel: () => void;
}) {
  const [freezeConfirmed, setFreezeConfirmed] = useState(false);
  const frozen = selectedEntityId
    ? session.frozenAnchors.find((anchor) => anchor.candidateEntityId === selectedEntityId)
    : null;
  const working = selectedEntityId
    ? session.workingAnchors.find((anchor) => anchor.candidateEntityId === selectedEntityId)
    : null;
  const changed = Boolean(
    frozen
      && working
      && (frozen.x !== working.x || frozen.y !== working.y)
  );

  return (
    <section
      data-testid="candidate-anchor-authoring"
      className="sc-mode-panel sc-anchor-authoring"
      aria-label="تحرير المراسي المرشحة"
    >
      <header>
        <span><FileClock aria-hidden="true" /></span>
        <div>
          <small>وضع تأليف منفصل</small>
          <h2>تحرير المراسي المرشحة</h2>
          <p>تُحفظ التعديلات كمراجعة مرشحة جديدة ولا تغيّر الحقيقة المجمدة أو الجاهزية.</p>
        </div>
        <button type="button" title="إغلاق وضع التحرير" aria-label="إغلاق وضع التحرير" onClick={onCancel}>
          <X aria-hidden="true" />
        </button>
      </header>

      <div data-testid="candidate-edit-warning" className="sc-anchor-warning" role="status">
        <AlertTriangle aria-hidden="true" />
        <div>
          <strong>تحرير بصري مرشح — ليس إحداثيات مساحية</strong>
          <small>اسحب مرساة موجودة فقط. لا يمكن إنشاء موضع للمسرح غير المحسوم.</small>
        </div>
      </div>

      <div className="sc-anchor-revision-strip">
        <span><small>المراجعة المجمدة</small><strong>R{session.frozenRevision}</strong></span>
        <span><small>المراجعة التالية</small><strong>R{session.frozenRevision + 1}</strong></span>
        <span className={session.dirty ? 'is-dirty' : undefined}>
          <small>الحالة</small><strong>{session.dirty ? 'تغيير غير مجمد' : 'مطابق للمجمد'}</strong>
        </span>
      </div>

      <div className="sc-authoring-mode-preview" aria-label="معاينة التغيير في الأوضاع الثلاثة">
        <small>عاين التغيير في:</small>
        <div>
          <button type="button" onClick={() => onModeChange('experience')}>خريطة التجربة</button>
          <button type="button" onClick={() => onModeChange('executive')}>خريطة القيادة</button>
          <button type="button" onClick={() => onModeChange('journey')}>قصة الرحلة</button>
        </div>
      </div>

      {working && frozen ? (
        <section data-testid="candidate-anchor-comparison" className={`sc-anchor-comparison ${changed ? 'is-changed' : ''}`}>
          <header>
            <GitCompareArrows aria-hidden="true" />
            <div>
              <small>{working.candidateEntityId}</small>
              <strong>{selectedEntityLabelAr}</strong>
            </div>
          </header>
          <div>
            <span>
              <small>قبل</small>
              <bdi dir="ltr">x {frozen.x.toFixed(4)} · y {frozen.y.toFixed(4)}</bdi>
            </span>
            <span>
              <small>بعد</small>
              <bdi dir="ltr">x {working.x.toFixed(4)} · y {working.y.toFixed(4)}</bdi>
            </span>
          </div>
          <button type="button" disabled={!changed} onClick={onRestoreSelected}>
            <RotateCcw aria-hidden="true" />استعادة الموضع المجمد
          </button>
        </section>
      ) : (
        <div className="sc-anchor-empty">
          <LockKeyhole aria-hidden="true" />
          <strong>اختر مرساة موجودة من الخريطة</strong>
          <p>السجلات غير المحسومة، ومنها `ZONE-SHOW-001`، لا تحصل على موضع من هذا المحرر.</p>
        </div>
      )}

      <div className="sc-anchor-history" aria-label="سجل التراجع والإعادة">
        <button data-testid="candidate-anchor-undo" type="button" disabled={!session.undoStack.length || busy} onClick={onUndo}>
          <Undo2 aria-hidden="true" />تراجع
        </button>
        <button data-testid="candidate-anchor-redo" type="button" disabled={!session.redoStack.length || busy} onClick={onRedo}>
          <Redo2 aria-hidden="true" />إعادة
        </button>
      </div>

      <label className="sc-anchor-reason">
        <span>سبب التغيير الإلزامي</span>
        <textarea
          data-testid="candidate-anchor-change-reason"
          rows={3}
          value={session.changeReason}
          placeholder="اشرح لماذا تغيّر الموضع البصري المرشح…"
          onChange={(event) => onReasonChange(event.target.value)}
        />
      </label>

      <button
        data-testid="candidate-anchor-save-draft"
        type="button"
        className="sc-authoring-primary"
        disabled={busy || !session.dirty || !session.changeReason.trim()}
        onClick={onSaveDraft}
      >
        <Save aria-hidden="true" />
        حفظ كمراجعة مسودة R{session.frozenRevision + 1}
      </button>

      {draft ? (
        <div data-testid="candidate-anchor-draft-ready" className="sc-anchor-freeze">
          <div>
            <Check aria-hidden="true" />
            <span><strong>المسودة جاهزة للمراجعة</strong><small>{draft.contentHash.slice(0, 12)}…</small></span>
          </div>
          <label>
            <input
              data-testid="candidate-anchor-freeze-confirmation"
              type="checkbox"
              checked={freezeConfirmed}
              onChange={(event) => setFreezeConfirmed(event.target.checked)}
            />
            <span>أؤكد تجميد مراجعة مرشحة جديدة فقط، وليست هندسة معتمدة.</span>
          </label>
          <button
            data-testid="candidate-anchor-freeze"
            type="button"
            disabled={busy || !freezeConfirmed}
            onClick={() => onFreeze(freezeConfirmed)}
          >
            <LockKeyhole aria-hidden="true" />تجميد المراجعة المرشحة
          </button>
        </div>
      ) : null}

      {messageAr ? <p data-testid="candidate-anchor-authoring-message" className="sc-anchor-message" role="status">{messageAr}</p> : null}
    </section>
  );
}
