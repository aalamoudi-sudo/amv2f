import { AlertTriangle, MapPin, PauseCircle, Route, Sparkles } from 'lucide-react';
import type { SpatialCommandExperienceConfiguration } from '../../types/spatialCommand';
import { SpatialEntityInspector } from './SpatialEntityInspector';

export function VisitorJourneyMode({
  configuration,
  activeStepId,
  manuallySelectedEntityId,
  presentationDurationAr,
  onStartPresentation
}: {
  configuration: SpatialCommandExperienceConfiguration;
  activeStepId: string;
  manuallySelectedEntityId: string | null;
  presentationDurationAr: string;
  onStartPresentation: () => void;
}) {
  if (manuallySelectedEntityId) {
    return (
      <div className="sc-journey-manual-context">
        <p><PauseCircle aria-hidden="true" />توقفت القصة لأنك اخترت وجهة يدويًا.</p>
        <SpatialEntityInspector configuration={configuration} candidateEntityId={manuallySelectedEntityId} />
      </div>
    );
  }
  const step = configuration.narrativeJourney.steps.find((entry) => entry.stepId === activeStepId)
    ?? configuration.narrativeJourney.steps[0]!;
  const entities = step.candidateEntityIds
    .map((candidateId) => configuration.candidateEntities.find((entity) => entity.candidateId === candidateId))
    .filter((entity): entity is NonNullable<typeof entity> => Boolean(entity));
  return (
    <section data-testid="visitor-journey-context" className={`sc-mode-panel sc-journey-panel is-${step.status}`}>
      <header>
        <span>{step.sequence}</span>
        <div>
          <small>المشهد {step.sequence} من {configuration.narrativeJourney.steps.length}</small>
          <h2>{step.labelAr}</h2>
          <p>{step.descriptionAr}</p>
        </div>
      </header>
      {step.status === 'unresolved' ? (
        <div data-testid="journey-unresolved-step" className="sc-unresolved-step">
          <AlertTriangle aria-hidden="true" />
          <strong>{step.labelAr}: موقع غير محسوم</strong>
          <p>{step.operatorNoticeAr ?? 'لا توجد مرساة أو علاقة مكانية معتمدة لهذه الخطوة.'}</p>
        </div>
      ) : (
        <div className="sc-step-entities">
          <small>الوجهات المرشحة في هذا المشهد</small>
          {entities.map((entity) => (
            <article key={entity.candidateId}>
              <MapPin aria-hidden="true" />
              <span>{entity.sourceNumber}</span>
              <div><strong>{entity.labelAr}</strong><small>موضع بصري غير معاير</small></div>
            </article>
          ))}
        </div>
      )}
      {step.status === 'conflicted' ? (
        <p className="sc-step-conflict"><AlertTriangle aria-hidden="true" />{step.operatorNoticeAr ?? 'يبقى تعارض هذه الخطوة ظاهرًا حتى قرار السلطة المختصة.'}</p>
      ) : null}
      <div className="sc-narrative-disclosure">
        <Route aria-hidden="true" />
        <div><strong>تسلسل قصصي — ليس مسارًا ميدانيًا معتمدًا</strong><small>لا توجد هندسة طريق أو مسافة أو مدة انتقال معتمدة.</small></div>
      </div>
      <div className="sc-story-cue"><Sparkles aria-hidden="true" /><span>ينتقل التركيز البصري فقط بين المراسي المرشحة المعروفة.</span></div>
      <button data-testid="start-executive-storytelling" type="button" className="sc-start-presentation" onClick={onStartPresentation}>
        <Sparkles aria-hidden="true" />
        تشغيل عرض تنفيذي مدته {presentationDurationAr}
      </button>
    </section>
  );
}
