import type { ProjectRegistry } from './projectRegistry';
import type { CommandWorkspace } from '../ux/commandExperience';
import type {
  SpatialCommandEditingMode,
  SpatialCommandMode,
  SpatialCommandViewMode
} from '../types/spatialCommand';
import type { ExperienceMapMode, ExperienceReviewMode, ExperienceViewMode, OperationalLensId } from '../types/experienceTwin';
import type { DesignSceneLens, DesignSceneQualityProfile } from '../types/designExperience';
import type { RehearsalLens, RehearsalView } from '../types/digitalRehearsal';

export interface ProjectShellRoute {
  workspace: CommandWorkspace;
  projectId: string | null;
  eventId: string | null;
  venueId: string | null;
  errorCode: 'invalid-workspace' | 'missing-project' | 'invalid-project' | 'invalid-event' | 'invalid-venue' | 'archived-project' | 'invalid-review-link' | null;
  errorAr: string | null;
  globalAuthoring: boolean;
}

const workspaceValues = new Set<CommandWorkspace>([
  'portfolio', 'launcher', 'executive', 'command', 'spatial', 'spatial-command', 'spatial-authoring', 'readiness', 'readiness-pack', 'decisions', 'validation',
  'integration', 'iot', 'configuration', 'authoring', 'visual-system', 'visual-direction', 'experience', 'experience-twin', 'experience-rehearsal'
]);

export function resolveProjectShellRoute(location: URL, registry: ProjectRegistry): ProjectShellRoute {
  const requestedWorkspace = location.searchParams.get('workspace');
  const workspace = requestedWorkspace === 'launcher' || !requestedWorkspace ? 'portfolio' : requestedWorkspace;
  if (!workspaceValues.has(workspace as CommandWorkspace)) return { workspace: 'portfolio', projectId: null, eventId: null, venueId: null, errorCode: 'invalid-workspace', errorAr: 'مساحة العمل المطلوبة غير معروفة. عُدت إلى محفظة المشاريع دون اختيار بديل.', globalAuthoring: false };
  if (workspace === 'portfolio') return { workspace: 'portfolio', projectId: null, eventId: null, venueId: null, errorCode: null, errorAr: null, globalAuthoring: false };
  if (workspace === 'visual-direction') {
    return location.searchParams.get('concept') === 'hybrid-light'
      ? { workspace: 'visual-direction', projectId: null, eventId: null, venueId: null, errorCode: null, errorAr: null, globalAuthoring: false }
      : { workspace: 'portfolio', projectId: null, eventId: null, venueId: null, errorCode: 'invalid-review-link', errorAr: 'رابط مراجعة الاتجاه البصري يحتاج مفهوم hybrid-light الصريح.', globalAuthoring: false };
  }
  if (workspace === 'authoring' && location.searchParams.get('intent') === 'new-project') {
    return { workspace: 'authoring', projectId: null, eventId: null, venueId: null, errorCode: null, errorAr: null, globalAuthoring: true };
  }

  const explicitProjectId = location.searchParams.get('project');
  const explicitEventId = location.searchParams.get('event');
  const inferredProject = !explicitProjectId && explicitEventId ? registry.findProjectByEventId(explicitEventId) : null;
  const projectId = explicitProjectId ?? inferredProject?.projectId ?? null;
  if (!projectId) return { workspace: 'portfolio', projectId: null, eventId: null, venueId: null, errorCode: 'missing-project', errorAr: 'يتطلب رابط مساحة العمل مشروعًا صريحًا. لم يُفتح أي مشروع تجريبي تلقائيًا.', globalAuthoring: false };
  const project = registry.findById(projectId);
  if (!project) return { workspace: 'portfolio', projectId: null, eventId: null, venueId: null, errorCode: 'invalid-project', errorAr: `معرّف المشروع غير معروف: ${projectId}. عُدت إلى المحفظة دون fallback.`, globalAuthoring: false };
  if (project.projectStatus === 'archived') return { workspace: 'portfolio', projectId: null, eventId: null, venueId: null, errorCode: 'archived-project', errorAr: `المشروع ${project.nameAr} مؤرشف ولا يمكن تفعيله.`, globalAuthoring: false };
  const event = registry.resolveEvent(projectId, explicitEventId);
  if (!event) return { workspace: 'portfolio', projectId: null, eventId: null, venueId: null, errorCode: 'invalid-event', errorAr: 'الفعالية المطلوبة لا تنتمي إلى المشروع المحدد. لم تُستخدم فعالية بديلة.', globalAuthoring: false };
  const explicitVenueId = location.searchParams.get('venue');
  const venueId = explicitVenueId ?? event.venueIds[0] ?? null;
  const venue = venueId ? registry.getVenues(projectId).find((candidate) => candidate.venueId === venueId) : null;
  if (!venue || !event.venueIds.includes(venue.venueId)) {
    return { workspace: 'portfolio', projectId: null, eventId: null, venueId: null, errorCode: 'invalid-venue', errorAr: 'الموقع المطلوب لا ينتمي إلى المشروع والفعالية المحددين. لم يُستخدم موقع بديل.', globalAuthoring: false };
  }
  return { workspace: workspace as CommandWorkspace, projectId, eventId: event.eventId, venueId: venue.venueId, errorCode: null, errorAr: null, globalAuthoring: false };
}

export interface ProjectRouteUrlOptions {
  intent?: 'new-project';
  concept?: 'hybrid-light';
  venueId?: string | null;
  sourceLayerId?: string | null;
  candidateEntityId?: string | null;
  spatialMode?: SpatialCommandMode | null;
  journeyStepId?: string | null;
  viewMode?: SpatialCommandViewMode | null;
  editingMode?: SpatialCommandEditingMode | null;
  focusMode?: boolean;
  savedViewId?: string | null;
  experienceScenarioId?: string | null;
  experienceDayId?: string | null;
  experiencePersonaId?: string | null;
  experienceJourneyId?: string | null;
  experienceStepId?: string | null;
  experienceEntityId?: string | null;
  experienceZoneId?: string | null;
  experienceAreaId?: string | null;
  experienceSceneId?: string | null;
  experienceReviewMode?: ExperienceReviewMode | null;
  experienceLens?: OperationalLensId | null;
  experienceMapMode?: ExperienceMapMode | null;
  experienceViewMode?: ExperienceViewMode | null;
  designSceneLens?: DesignSceneLens | null;
  designSceneViewpointId?: string | null;
  designSceneQualityProfile?: DesignSceneQualityProfile | null;
  designTruthDrawerOpen?: boolean;
  rehearsalDayId?: string | null;
  rehearsalPersonaId?: string | null;
  rehearsalRunId?: string | null;
  rehearsalMomentId?: string | null;
  rehearsalLens?: RehearsalLens | null;
  rehearsalView?: RehearsalView | null;
  rehearsalSiteId?: string | null;
  rehearsalScenarioId?: string | null;
}

export function projectRouteUrl(current: URL, route: Pick<ProjectShellRoute, 'workspace' | 'projectId' | 'eventId'>, options?: ProjectRouteUrlOptions): URL {
  const url = new URL(current.href);
  const previousProjectId = url.searchParams.get('project');
  const previousVenueId = url.searchParams.get('venue');
  ['project', 'event', 'venue', 'workspace', 'intent', 'concept', 'screen', 'view', 'stage', 'sourceLayer', 'candidateEntity', 'mode', 'journeyStep', 'viewMode', 'edit', 'focus', 'savedView', 'scenario', 'day', 'persona', 'journey', 'step', 'entity', 'zone', 'area', 'touchpoint', 'scene', 'hotspot', 'sceneView', 'sceneTruthLens', 'sceneCompare', 'designLens', 'designViewpoint', 'designQuality', 'designTour', 'designPresentation', 'designTruth', 'landmark', 'lens', 'mapMode', 'experienceMode', 'presentationStep', 'presentationState', 'walk', 'mapZoom', 'mapPanX', 'mapPanY', 'mapLayers', 'mapOpacity', 'compare', 'compareDay', 'comparePersona', 'compareLens', 'rehearsalDay', 'rehearsalPersona', 'rehearsalRun', 'rehearsalMoment', 'rehearsalLens', 'rehearsalView', 'rehearsalSite', 'rehearsalScenario'].forEach((key) => url.searchParams.delete(key));
  url.searchParams.set('workspace', route.workspace);
  if (route.projectId) url.searchParams.set('project', route.projectId);
  if (route.eventId) url.searchParams.set('event', route.eventId);
  const venueId = options?.venueId ?? (route.projectId === previousProjectId ? previousVenueId : null);
  if (venueId) url.searchParams.set('venue', venueId);
  if (options?.intent) url.searchParams.set('intent', options.intent);
  if (options?.concept) url.searchParams.set('concept', options.concept);
  if (options?.sourceLayerId) url.searchParams.set('sourceLayer', options.sourceLayerId);
  if (options?.candidateEntityId) url.searchParams.set('candidateEntity', options.candidateEntityId);
  if (options?.spatialMode) url.searchParams.set('mode', options.spatialMode);
  if (options?.spatialMode === 'journey' && options.journeyStepId) url.searchParams.set('journeyStep', options.journeyStepId);
  if (options?.viewMode) url.searchParams.set('viewMode', options.viewMode);
  if (options?.editingMode && options.editingMode !== 'none') url.searchParams.set('edit', options.editingMode);
  if (options?.focusMode) url.searchParams.set('focus', 'map');
  if (options?.savedViewId) url.searchParams.set('savedView', options.savedViewId);
  if (options?.experienceScenarioId) url.searchParams.set('scenario', options.experienceScenarioId);
  if (options?.experienceDayId) url.searchParams.set('day', options.experienceDayId);
  if (options?.experiencePersonaId) url.searchParams.set('persona', options.experiencePersonaId);
  if (options?.experienceJourneyId) url.searchParams.set('journey', options.experienceJourneyId);
  if (options?.experienceStepId) url.searchParams.set('step', options.experienceStepId);
  if (options?.experienceEntityId) url.searchParams.set('entity', options.experienceEntityId);
  if (options?.experienceZoneId) url.searchParams.set('zone', options.experienceZoneId);
  if (options?.experienceAreaId) url.searchParams.set('area', options.experienceAreaId);
  if (options?.experienceSceneId) url.searchParams.set('scene', options.experienceSceneId);
  if (options?.experienceReviewMode) url.searchParams.set('experienceMode', options.experienceReviewMode);
  if (options?.experienceLens) url.searchParams.set('lens', options.experienceLens);
  if (options?.experienceMapMode) url.searchParams.set('mapMode', options.experienceMapMode);
  if (options?.experienceViewMode) url.searchParams.set('viewMode', options.experienceViewMode);
  if (options?.designSceneLens) url.searchParams.set('designLens', options.designSceneLens);
  if (options?.designSceneViewpointId) url.searchParams.set('designViewpoint', options.designSceneViewpointId);
  if (options?.designSceneQualityProfile) url.searchParams.set('designQuality', options.designSceneQualityProfile);
  if (options?.designTruthDrawerOpen) url.searchParams.set('designTruth', 'open');
  if (options?.rehearsalDayId) url.searchParams.set('rehearsalDay', options.rehearsalDayId);
  if (options?.rehearsalPersonaId) url.searchParams.set('rehearsalPersona', options.rehearsalPersonaId);
  if (options?.rehearsalRunId) url.searchParams.set('rehearsalRun', options.rehearsalRunId);
  if (options?.rehearsalMomentId) url.searchParams.set('rehearsalMoment', options.rehearsalMomentId);
  if (options?.rehearsalLens) url.searchParams.set('rehearsalLens', options.rehearsalLens);
  if (options?.rehearsalView) url.searchParams.set('rehearsalView', options.rehearsalView);
  if (options?.rehearsalSiteId) url.searchParams.set('rehearsalSite', options.rehearsalSiteId);
  if (options?.rehearsalScenarioId) url.searchParams.set('rehearsalScenario', options.rehearsalScenarioId);
  return url;
}
