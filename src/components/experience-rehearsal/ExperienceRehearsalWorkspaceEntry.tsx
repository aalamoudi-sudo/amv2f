import { findDigitalRehearsalCandidatePlan, findDigitalRehearsalPlan, findDigitalRehearsalValidationContext } from '../../data/digitalRehearsalPlans';
import { findExperienceTwinConfiguration } from '../../data/experienceTwinConfigurations';
import type { CommandWorkspace } from '../../ux/commandExperience';
import { ExperienceRehearsalWorkspace } from './ExperienceRehearsalWorkspace';

export function ExperienceRehearsalWorkspaceEntry({
  projectId,
  eventId,
  venueId,
  packId,
  onDirtyChange,
  onNavigate
}: {
  projectId: string;
  eventId: string;
  venueId: string;
  packId: string | null | undefined;
  onDirtyChange: (dirty: boolean) => void;
  onNavigate: (workspace: CommandWorkspace) => void;
}) {
  const configuration = findExperienceTwinConfiguration(projectId, eventId, venueId);
  const plan = findDigitalRehearsalPlan(projectId, eventId);
  const candidatePlan = findDigitalRehearsalCandidatePlan(projectId, eventId);
  const validationContext = findDigitalRehearsalValidationContext(projectId, eventId);
  if (!configuration || !plan || !candidatePlan || !validationContext || configuration.pack.packId !== packId || plan.experiencePackId !== packId) {
    return (
      <section data-testid="experience-rehearsal-missing" className="experience-rehearsal-missing" lang="ar" dir="rtl">
        <p>DIGITAL REHEARSAL</p>
        <h1>لا توجد خطة بروفة موثقة لهذا السياق</h1>
        <span>لم تُستخدم خطة أو فعالية أو حزمة عرض بديلة. تحقق من المشروع والفعالية والموقع وحزمة التجربة.</span>
      </section>
    );
  }
  return (
    <ExperienceRehearsalWorkspace
      key={`${projectId}:${eventId}:${venueId}:${plan.planHash}`}
      configuration={configuration}
      candidatePlan={candidatePlan}
      plan={plan}
      validationContext={validationContext}
      onDirtyChange={onDirtyChange}
      onNavigate={onNavigate}
    />
  );
}
