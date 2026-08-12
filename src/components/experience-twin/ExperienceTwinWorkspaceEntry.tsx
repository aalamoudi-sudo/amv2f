import { findExperienceTwinConfiguration } from '../../data/experienceTwinConfigurations';
import { ExperienceTwinWorkspace } from './ExperienceTwinWorkspace';

export function ExperienceTwinWorkspaceEntry({
  projectId,
  eventId,
  venueId,
  packId,
  onDirtyChange,
  onOpenRehearsal,
  onExit
}: {
  projectId: string;
  eventId: string;
  venueId: string;
  packId: string | null | undefined;
  onDirtyChange: (dirty: boolean) => void;
  onOpenRehearsal?: () => void;
  onExit?: () => void;
}) {
  const configuration = findExperienceTwinConfiguration(projectId, eventId, venueId);
  if (!configuration || configuration.pack.packId !== packId) {
    return (
      <section data-testid="experience-twin-missing" className="experience-twin-missing" lang="ar" dir="rtl">
        <p>EXPERIENCE TWIN</p>
        <h1>لا توجد حزمة تجربة لهذا السياق</h1>
        <span>لم تُستخدم أي حزمة بديلة. تحقق من المشروع والفعالية والموقع ومعرّف الحزمة.</span>
      </section>
    );
  }
  return <ExperienceTwinWorkspace key={`${projectId}:${eventId}:${venueId}:${packId}`} configuration={configuration} onDirtyChange={onDirtyChange} onOpenRehearsal={onOpenRehearsal} onExit={onExit} />;
}
