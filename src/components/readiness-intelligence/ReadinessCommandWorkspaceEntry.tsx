import { lazy, Suspense } from 'react';
import { findReadinessOperationalPack } from '../../data/readinessPacks';
import { LoadingState } from '../shared/StateBlocks';
import { ReadinessCommandWorkspace } from './ReadinessCommandWorkspace';

const LegacyReadinessWorkspace = lazy(() =>
  import('../readiness/ReadinessWorkspace').then((module) => ({
    default: module.ReadinessWorkspace
  }))
);

export function ReadinessCommandWorkspaceEntry({
  packId,
  projectId,
  eventId,
  venueId,
  projectNameAr,
  eventNameAr,
  spatialConfigurationId,
  onOpenOperationalPack
}: {
  packId: string | null | undefined;
  projectId: string;
  eventId: string;
  venueId: string;
  projectNameAr: string;
  eventNameAr: string;
  spatialConfigurationId: string | null;
  onOpenOperationalPack?: () => void;
}) {
  const pack = findReadinessOperationalPack(packId, { projectId, eventId, venueId });
  if (pack) {
    return (
      <ReadinessCommandWorkspace
        key={`${pack.packId}:${pack.revision}`}
        pack={pack}
        projectNameAr={projectNameAr}
        eventNameAr={eventNameAr}
        spatialConfigurationId={spatialConfigurationId}
        onOpenOperationalPack={onOpenOperationalPack}
      />
    );
  }

  return (
    <section data-testid="legacy-readiness-compatibility" className="flex min-h-0 flex-1 flex-col" lang="ar" dir="rtl">
      <header className="border-b border-command-amber/40 bg-command-amber/10 px-4 py-2 text-xs text-command-text">
        <strong>توافق تقني مؤقت · legacy-temporary-demo</strong>
        <span className="mr-2 text-command-muted">النسب اليدوية أدناه لا تُنتج جاهزية متحققة أو معتمدة.</span>
      </header>
      <Suspense fallback={<LoadingState title="جاري تحميل محول الجاهزية القديم" message="تُحمّل بيانات العرض المؤقتة بمعزل عن KAP." />}>
        <LegacyReadinessWorkspace />
      </Suspense>
    </section>
  );
}
