import { loadReferenceEventPackage } from '../data/referenceEventPackages';
import type { ResolvedProjectConfiguration } from '../types/projectWorkspace';
import { validateEventPackage } from './eventPackageValidation';
import { assertRuntimeProjectScope } from './projectIsolation';
import type { ProjectRegistry } from './projectRegistry';
import { localDemoRuntimePackId } from '../data/projectRegistry';

export async function resolveProjectConfiguration(
  registry: ProjectRegistry,
  projectId: string,
  eventId: string | null
): Promise<ResolvedProjectConfiguration> {
  const project = registry.findById(projectId);
  const event = registry.resolveEvent(projectId, eventId);
  const theme = registry.resolveTheme(projectId, eventId);
  if (!project || !event || !theme || project.projectStatus === 'archived') throw new Error('تعذر حل تهيئة المشروع المطلوبة.');

  let runtime: ResolvedProjectConfiguration['runtime'] = null;
  const runtimeMode: ResolvedProjectConfiguration['runtimeMode'] = event.runtimePackageId === localDemoRuntimePackId
    ? 'local-demo'
    : event.runtimePackageId
      ? 'event-package'
      : 'none';
  if (event.runtimePackageId && runtimeMode === 'event-package') {
    if (!registry.assertPackInProject(projectId, event.runtimePackageId)) throw new Error('حزمة Runtime خارج نطاق المشروع.');
    const eventPackage = await loadReferenceEventPackage(event.runtimePackageId);
    if (!eventPackage) throw new Error('حزمة Runtime غير متاحة.');
    const validation = await validateEventPackage(eventPackage);
    if (!validation.valid || !validation.runtime) throw new Error('حزمة Runtime لم تجتز التحقق.');
    assertRuntimeProjectScope(project, event, validation.runtime);
    runtime = validation.runtime;
  }

  const iotSourceIds = runtime?.integrationProfiles.flatMap((profile) => profile.sourceSystemIds) ?? [];
  return {
    project,
    event,
    venues: registry.getVenues(projectId),
    theme,
    runtime,
    runtimeMode,
    iotSourceIds
  };
}
