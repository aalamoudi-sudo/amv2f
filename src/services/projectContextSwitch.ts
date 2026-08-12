import type { ResolvedProjectConfiguration } from '../types/projectWorkspace';

export const projectSwitchStepValues = [
  'validate-project',
  'detect-unsaved-work',
  'stop-project-streams',
  'clear-project-scope',
  'resolve-project-configuration',
  'activate-event-runtime',
  'activate-event-theme',
  'update-url',
  'commit-project-context'
] as const;
export type ProjectSwitchStep = (typeof projectSwitchStepValues)[number];

export interface ProjectSwitchRequest {
  projectId: string;
  eventId: string | null;
  force: boolean;
}

export interface ProjectSwitchDependencies {
  validate: (projectId: string, eventId: string | null) => boolean;
  hasUnsavedWork: () => boolean;
  stopStreams: () => Promise<void>;
  clearProjectScope: () => void;
  resolveConfiguration: (projectId: string, eventId: string | null) => Promise<ResolvedProjectConfiguration>;
  activateRuntime: (configuration: ResolvedProjectConfiguration) => Promise<void> | void;
  activateTheme: (configuration: ResolvedProjectConfiguration) => void;
  updateUrl: (configuration: ResolvedProjectConfiguration) => void;
  commit: (configuration: ResolvedProjectConfiguration) => void;
  onStep?: (step: ProjectSwitchStep) => void;
}

export type ProjectSwitchResult =
  | { status: 'switched'; configuration: ResolvedProjectConfiguration }
  | { status: 'requires-confirmation' }
  | { status: 'rejected'; reasonAr: string };

export async function switchProjectContext(request: ProjectSwitchRequest, dependencies: ProjectSwitchDependencies): Promise<ProjectSwitchResult> {
  const step = (value: ProjectSwitchStep) => dependencies.onStep?.(value);
  step('validate-project');
  if (!dependencies.validate(request.projectId, request.eventId)) return { status: 'rejected', reasonAr: 'المشروع أو الفعالية غير صالحين؛ لم يتغير السياق الحالي.' };
  step('detect-unsaved-work');
  if (!request.force && dependencies.hasUnsavedWork()) return { status: 'requires-confirmation' };
  try {
    step('stop-project-streams');
    await dependencies.stopStreams();
    step('clear-project-scope');
    dependencies.clearProjectScope();
    step('resolve-project-configuration');
    const configuration = await dependencies.resolveConfiguration(request.projectId, request.eventId);
    step('activate-event-runtime');
    await dependencies.activateRuntime(configuration);
    step('activate-event-theme');
    dependencies.activateTheme(configuration);
    step('update-url');
    dependencies.updateUrl(configuration);
    step('commit-project-context');
    dependencies.commit(configuration);
    return { status: 'switched', configuration };
  } catch {
    dependencies.clearProjectScope();
    return { status: 'rejected', reasonAr: 'تعذر تفعيل المشروع بأمان. بقيت الواجهة في حالة محايدة بلا بيانات قديمة.' };
  }
}
