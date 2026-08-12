import { useMemo } from 'react';
import { findSpatialCommandExperience } from '../../data/spatialCommandExperiences';
import { createBrowserCandidateAnchorRevisionRepository } from '../../services/candidateAnchorAuthoring';
import { createBrowserSpatialViewRepository } from '../../services/spatialMap';
import type { SpatialTechnicalRoute } from '../../types/spatialCommand';
import { SpatialCommandWorkspace } from './SpatialCommandWorkspace';

export function SpatialCommandWorkspaceEntry({
  configurationId,
  projectId,
  eventId,
  venueId,
  onOpenTechnicalRoute,
  onOpenDesignScene
}: {
  configurationId: string | undefined;
  projectId: string;
  eventId: string;
  venueId: string;
  onOpenTechnicalRoute: (route: SpatialTechnicalRoute) => void;
  onOpenDesignScene: (sceneAssetId: string) => void;
}) {
  const revisionRepository = useMemo(
    () => createBrowserCandidateAnchorRevisionRepository(window.localStorage),
    []
  );
  const viewRepository = useMemo(
    () => createBrowserSpatialViewRepository(window.localStorage),
    []
  );
  const configuration = findSpatialCommandExperience(configurationId, { projectId, eventId, venueId });
  if (!configuration) {
    return (
      <section data-testid="spatial-command-configuration-missing" className="flex min-h-0 flex-1 items-center justify-center bg-command-bg p-6 text-center" lang="ar" dir="rtl">
        <div className="max-w-lg border border-command-line bg-command-panel p-8">
          <h1 className="text-xl font-bold">لا توجد تجربة قيادة مكانية لهذا السياق</h1>
          <p className="mt-3 text-sm leading-7 text-command-muted">لم تُستخدم تهيئة مشروع أو بيانات تجريبية بديلة. تحقق من ربط المشروع والفعالية والموقع.</p>
        </div>
      </section>
    );
  }
  return (
    <SpatialCommandWorkspace
      key={`${configuration.projectId}:${configuration.eventId}:${configuration.venueId}:${configuration.configurationId}`}
      configuration={configuration}
      revisionRepository={revisionRepository}
      viewRepository={viewRepository}
      onOpenTechnicalRoute={onOpenTechnicalRoute}
      onOpenDesignScene={onOpenDesignScene}
    />
  );
}
