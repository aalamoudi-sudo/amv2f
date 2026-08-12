import { AlertOctagon, CheckCircle2, ChevronLeft, FileSearch, ShieldAlert, UserRoundCheck } from 'lucide-react';
import type { SpatialCommandExperienceConfiguration, SpatialExecutiveBlocker } from '../../types/spatialCommand';

export function ExecutiveCommandMode({
  configuration,
  selectedBlockerId,
  onSelectBlocker
}: {
  configuration: SpatialCommandExperienceConfiguration;
  selectedBlockerId: string;
  onSelectBlocker: (blockerId: string) => void;
}) {
  const selected = configuration.executiveBlockers.find((blocker) => blocker.blockerId === selectedBlockerId)
    ?? configuration.executiveBlockers[0]!;
  return (
    <section data-testid="executive-command-context" className="sc-mode-panel sc-executive-panel">
      <header>
        <span><ShieldAlert aria-hidden="true" /></span>
        <div>
          <small>حالة حزمة المشروع المرشحة</small>
          <h2>عوائق التفعيل وقرارات المؤسس المجمدة</h2>
          <p>ليست مؤشرات حية ولا تعني جاهزية تشغيلية.</p>
        </div>
      </header>
      <ExecutiveBlockerList blockers={configuration.executiveBlockers} selectedBlockerId={selected.blockerId} onSelect={onSelectBlocker} />
      <article data-testid="executive-blocker-detail" className="sc-blocker-detail">
        <div className="sc-blocker-title">
          <AlertOctagon aria-hidden="true" />
          <div><small>القرار النشط</small><h3>{selected.labelAr}</h3></div>
          <span data-testid="executive-decision-state">
            {selected.decisionState === 'founder-frozen'
              ? 'قرار مؤسس مجمّد'
              : selected.decisionAuthority === 'founder'
                ? 'قرار مؤسس مطلوب'
                : 'سلطة مستقلة'}
          </span>
        </div>
        <dl>
          <div><dt>لماذا يهم؟</dt><dd>{selected.whyItMattersAr}</dd></div>
          <div><dt><CheckCircle2 aria-hidden="true" />ما القرار المطلوب؟</dt><dd>{selected.requiredDecisionAr}</dd></div>
          <div><dt><UserRoundCheck aria-hidden="true" />من يقرر؟</dt><dd>{selected.decisionAuthorityAr}</dd></div>
          <div><dt><FileSearch aria-hidden="true" />الدليل المقبول التالي</dt><dd>{selected.nextAcceptedEvidenceAr}</dd></div>
        </dl>
      </article>
    </section>
  );
}

function ExecutiveBlockerList({
  blockers,
  selectedBlockerId,
  onSelect
}: {
  blockers: SpatialExecutiveBlocker[];
  selectedBlockerId: string;
  onSelect: (blockerId: string) => void;
}) {
  return (
    <div className="sc-blocker-list" aria-label="قائمة عوائق القرار">
      {blockers.map((blocker, index) => (
        <button
          key={blocker.blockerId}
          data-testid={`executive-blocker-${index + 1}`}
          type="button"
          className={selectedBlockerId === blocker.blockerId ? 'is-active' : undefined}
          aria-pressed={selectedBlockerId === blocker.blockerId}
          onClick={() => onSelect(blocker.blockerId)}
        >
          <span>{index + 1}</span>
          <strong>{blocker.labelAr}</strong>
          <small>{blocker.decisionState === 'founder-frozen'
            ? 'حُسم دلاليًا ولم يُعتمد هندسيًا'
            : blocker.decisionAuthority === 'founder'
              ? 'يمكن لأحمد حسمه'
              : 'يتطلب جهة مستقلة'}</small>
          <ChevronLeft aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
