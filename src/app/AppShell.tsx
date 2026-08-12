import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CalendarDays, ChevronDown, Map, PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import { RouteToggles } from '../components/control-panel/RouteToggles';
import { SelectedEntityPanel } from '../components/control-panel/SelectedEntityPanel';
import { StatusLegend } from '../components/control-panel/StatusLegend';
import { TopCommandBar } from '../components/control-panel/TopCommandBar';
import { ViewModeControls } from '../components/control-panel/ViewModeControls';
import { ZoneList } from '../components/control-panel/ZoneList';
import { ExecutiveOverview } from '../components/command-experience/ExecutiveOverview';
import { OperatorDecisionFlow } from '../components/command-experience/OperatorDecisionFlow';
import { SpatialWorkspace } from '../components/command-experience/SpatialWorkspace';
import { DecisionCenter } from '../components/decisions/DecisionCenter';
import { OperationalSnapshot } from '../components/executive-dashboard/OperationalSnapshot';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { Panel } from '../components/shared/Panel';
import { ErrorState, LoadingState } from '../components/shared/StateBlocks';
import { ScenarioControls } from '../components/scenario-player/ScenarioControls';
import { OperationalValidationWorkspace } from '../components/validation/OperationalValidationWorkspace';
import { experienceIntelligenceCatalog } from '../data/experienceIntelligencePacks';
import { kapProjectId, localDemoProjectId, projectRegistry } from '../data/projectRegistry';
import { ProjectPortfolioWorkspace } from '../components/projects/ProjectPortfolioWorkspace';
import { ProjectContextSwitcher } from '../components/projects/ProjectContextSwitcher';
import { readProjectPreferences, recordOpenedProject, type ProjectPortfolioPreferences } from '../services/projectPreferences';
import { resolveProjectShellRoute, projectRouteUrl, type ProjectRouteUrlOptions, type ProjectShellRoute } from '../services/projectRouting';
import { resolveProjectConfiguration } from '../services/projectRuntimeResolver';
import { projectScopedStreams } from '../services/projectScopedStreams';
import { switchProjectContext, type ProjectSwitchStep } from '../services/projectContextSwitch';
import { isOperationalPackEnabled, selectRuntimeRoutes, useEventStore, type EventStoreState } from '../store/useEventStore';
import { EventSceneViewport } from '../three/scene/EventSceneViewport';
import { ProjectionToolbar } from '../three/projection/ProjectionToolbar';
import { isTechnicalWorkspace, type CommandWorkspace, type PresentationPreset } from '../ux/commandExperience';
import type { ResolvedProjectConfiguration } from '../types/projectWorkspace';
import { ActiveProjectProvider } from './ActiveProjectProvider';

const OperationalCaptureLab = lazy(() =>
  import('../components/integration/OperationalCaptureLab').then((module) => ({
    default: module.OperationalCaptureLab
  }))
);

const IoTIntegrationWorkspace = lazy(() =>
  import('../components/integration/IoTIntegrationWorkspace').then((module) => ({
    default: module.IoTIntegrationWorkspace
  }))
);

const EventConfigurationWorkspace = lazy(() =>
  import('../components/configuration/EventConfigurationWorkspace').then((module) => ({
    default: module.EventConfigurationWorkspace
  }))
);

const PilotAuthoringWorkspace = lazy(() =>
  import('../components/pilot-authoring/PilotAuthoringWorkspace').then((module) => ({
    default: module.PilotAuthoringWorkspace
  }))
);

const ExperienceEntryPanel = lazy(() =>
  import('../components/experience/ExperienceEntryPanel').then((module) => ({
    default: module.ExperienceEntryPanel
  }))
);

const ExperienceIntelligenceWorkspace = lazy(() =>
  import('../components/experience/ExperienceIntelligenceWorkspace').then((module) => ({
    default: module.ExperienceIntelligenceWorkspace
  }))
);

const CommandVisualSystemWorkspace = lazy(() =>
  import('../components/design-system/CommandVisualSystemWorkspace').then((module) => ({
    default: module.CommandVisualSystemWorkspace
  }))
);

const VisualDirectionReviewWorkspace = lazy(() =>
  import('../components/visual-direction/VisualDirectionReviewWorkspace').then((module) => ({
    default: module.VisualDirectionReviewWorkspace
  }))
);

const KapProjectWorkspace = lazy(() =>
  import('../components/projects/KapProjectWorkspace').then((module) => ({
    default: module.KapProjectWorkspace
  }))
);

const KapSpatialAuthoringWorkspace = lazy(() =>
  import('../components/spatial-authoring/KapSpatialAuthoringWorkspace').then((module) => ({
    default: module.KapSpatialAuthoringWorkspace
  }))
);

const SpatialCommandWorkspaceEntry = lazy(() =>
  import('../components/spatial-command/SpatialCommandWorkspaceEntry').then((module) => ({
    default: module.SpatialCommandWorkspaceEntry
  }))
);

const ReadinessCommandWorkspaceEntry = lazy(() =>
  import('../components/readiness-intelligence/ReadinessCommandWorkspaceEntry').then((module) => ({
    default: module.ReadinessCommandWorkspaceEntry
  }))
);

const OperationalReadinessPackWorkspaceEntry = lazy(() =>
  import('../components/readiness-pack/OperationalReadinessPackWorkspaceEntry').then((module) => ({
    default: module.OperationalReadinessPackWorkspaceEntry
  }))
);

const ExperienceTwinWorkspaceEntry = lazy(() =>
  import('../components/experience-twin/ExperienceTwinWorkspaceEntry').then((module) => ({
    default: module.ExperienceTwinWorkspaceEntry
  }))
);

const ExperienceRehearsalWorkspaceEntry = lazy(() =>
  import('../components/experience-rehearsal/ExperienceRehearsalWorkspaceEntry').then((module) => ({
    default: module.ExperienceRehearsalWorkspaceEntry
  }))
);

export type AppWorkspace = CommandWorkspace;

type ShellContext = 'launcher' | 'experience-candidate' | 'operational';
type AuthoringMode = 'kap-candidate' | 'fictional-technical';

const operationalWorkspaces = new Set<AppWorkspace>([
  'executive',
  'command',
  'spatial',
  'spatial-command',
  'spatial-authoring',
  'readiness',
  'readiness-pack',
  'decisions',
  'validation',
  'integration',
  'iot'
]);
const spatialCommandModes = new Set(['experience', 'executive', 'journey']);
const spatialCommandViewModes = new Set(['top', 'presentation']);
const spatialCommandEditingModes = new Set(['candidate-anchors']);
function shellContextFor(workspace: AppWorkspace, hasActiveRuntime = false, authoringMode: AuthoringMode = 'kap-candidate', hasProject = false): ShellContext {
  if ((workspace === 'experience' || workspace === 'experience-twin' || workspace === 'experience-rehearsal') && hasProject) return 'experience-candidate';
  if (workspace === 'authoring' && authoringMode === 'kap-candidate' && hasProject) return 'experience-candidate';
  if (hasProject || operationalWorkspaces.has(workspace) || (hasActiveRuntime && (workspace === 'configuration' || (workspace === 'authoring' && authoringMode === 'fictional-technical')))) return 'operational';
  return 'launcher';
}

export function AppShell() {
  const initialRoute = useMemo(() => resolveProjectShellRoute(new URL(window.location.href), projectRegistry), []);
  const initialActivationStartedRef = useRef(false);
  const [route, setRoute] = useState<ProjectShellRoute>(initialRoute);
  const [booting, setBooting] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [switchStep, setSwitchStep] = useState<ProjectSwitchStep>('validate-project');
  const [activeConfiguration, setActiveConfiguration] = useState<ResolvedProjectConfiguration | null>(null);
  const [preferences, setPreferences] = useState<ProjectPortfolioPreferences>(() => readProjectPreferences(window.localStorage, projectRegistry));
  const [unsavedLocalWork, setUnsavedLocalWork] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<{ projectId: string; eventId: string | null; workspace: AppWorkspace; routeOptions: ProjectRouteUrlOptions } | 'portfolio' | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [dashboardCollapsed, setDashboardCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [routesExpanded, setRoutesExpanded] = useState(true);
  const [statusLegendExpanded, setStatusLegendExpanded] = useState(false);
  const [authoringLoaded, setAuthoringLoaded] = useState(initialRoute.workspace === 'authoring');
  const [experienceLoaded, setExperienceLoaded] = useState(initialRoute.workspace === 'experience');
  const [authoringMode, setAuthoringMode] = useState<AuthoringMode>(initialRoute.globalAuthoring ? 'fictional-technical' : 'kap-candidate');
  const [presentationPreset, setPresentationPreset] = useState<PresentationPreset>(
    initialRoute.workspace === 'executive' ? 'executive' : isTechnicalWorkspace(initialRoute.workspace) ? 'technical' : 'operator'
  );
  const [navigationError, setNavigationError] = useState<string | null>(initialRoute.errorAr);
  const entities = useEventStore((state) => state.entities);
  const routeVisibility = useEventStore((state) => state.routeVisibility);
  const routes = useEventStore(selectRuntimeRoutes);
  const isProjectionMode = useEventStore((state) => state.isProjectionMode);
  const projectionCleanMode = useEventStore((state) => state.projectionCleanMode);
  const exitProjectionMode = useEventStore((state) => state.exitProjectionMode);
  const errorMessage = useEventStore((state) => state.errorMessage);
  const clearError = useEventStore((state) => state.clearError);
  const resetDemoData = useEventStore((state) => state.resetDemoData);
  const activeRuntimeScopeKey = useEventStore((state) => state.activeRuntime?.scopeKey ?? null);
  const activeRuntimeName = useEventStore((state) => state.activeRuntime?.identity.eventNameAr ?? null);
  const hasActiveRuntime = useEventStore((state) => state.activeRuntime !== null);
  const readinessEnabled = useEventStore((state) => isOperationalPackEnabled(state, 'zone-readiness'));
  const decisionsEnabled = useEventStore((state) => isOperationalPackEnabled(state, 'decision-engine'));
  const integrationEnabled = useEventStore((state) => isOperationalPackEnabled(state, 'operational-capture'));
  const entityCount = useMemo(() => Object.keys(entities).length, [entities]);
  const defaultDemoExperience = experienceIntelligenceCatalog.find((entry) => entry.launchRole === 'default-demo')?.pack ?? null;
  const referenceExperience = experienceIntelligenceCatalog.find((entry) => entry.launchRole === 'reference')?.pack ?? null;
  const selectedExperience = route.eventId ? experienceIntelligenceCatalog.find((entry) => entry.pack.eventId === route.eventId)?.pack ?? null : null;
  const activeWorkspace = route.workspace;
  const readinessAvailable = readinessEnabled || Boolean(activeConfiguration?.event.readinessPackId);
  const gridColumnsClass = dashboardCollapsed
    ? inspectorCollapsed
      ? 'xl:grid-cols-[56px_minmax(560px,1fr)_56px] 2xl:grid-cols-[64px_minmax(0,1fr)_64px]'
      : 'xl:grid-cols-[56px_minmax(560px,1fr)_minmax(300px,320px)] 2xl:grid-cols-[64px_minmax(0,1fr)_360px]'
    : inspectorCollapsed
      ? 'xl:grid-cols-[minmax(280px,300px)_minmax(560px,1fr)_56px] 2xl:grid-cols-[320px_minmax(0,1fr)_64px]'
      : 'xl:grid-cols-[minmax(280px,300px)_minmax(560px,1fr)_minmax(300px,320px)] 2xl:grid-cols-[320px_minmax(0,1fr)_360px]';

  const activateProject = useCallback(async (
    projectId: string,
    eventId: string | null,
    workspace: AppWorkspace,
    replace = false,
    force = false,
    routeOptions: ProjectRouteUrlOptions = {}
  ) => {
    let localDemoSnapshot: EventStoreState | null = null;
    setSwitching(true);
    const result = await switchProjectContext({ projectId, eventId, force }, {
      validate: (candidateProjectId, candidateEventId) => {
        const project = projectRegistry.findById(candidateProjectId);
        return Boolean(project && project.projectStatus !== 'archived' && projectRegistry.resolveEvent(candidateProjectId, candidateEventId));
      },
      hasUnsavedWork: () => unsavedLocalWork,
      stopStreams: () => projectScopedStreams.stopAll(),
      clearProjectScope: () => {
        const current = useEventStore.getState();
        if (projectId === localDemoProjectId && current.activeProjectId === null && current.entities['ZONE-001']) localDemoSnapshot = current;
        current.clearProjectScopedState(projectId, eventId);
      },
      resolveConfiguration: async (candidateProjectId, candidateEventId) => {
        const [configuration] = await Promise.all([
          resolveProjectConfiguration(projectRegistry, candidateProjectId, candidateEventId),
          new Promise<void>((resolve) => window.setTimeout(resolve, 180))
        ]);
        return configuration;
      },
      activateRuntime: (configuration) => {
        if (configuration.runtimeMode === 'local-demo') {
          useEventStore.getState().activateLocalDemoProjectScope(configuration.project.projectId, configuration.event.eventId, localDemoSnapshot);
          return;
        }
        if (!configuration.runtime) return;
        const activated = useEventStore.getState().activateTemporaryEventRuntime(
          configuration.runtime,
          'تفعيل Runtime تجريبي داخل سياق مشروع محدد.',
          { projectId: configuration.project.projectId, eventId: configuration.event.eventId }
        );
        if (!activated) throw new Error('runtime-activation-rejected');
      },
      activateTheme: () => undefined,
      updateUrl: (configuration) => {
        const currentUrl = new URL(window.location.href);
        const preserveExperienceState = (workspace === 'experience-twin' || workspace === 'experience-rehearsal')
          && currentUrl.searchParams.get('project') === configuration.project.projectId
          && currentUrl.searchParams.get('event') === configuration.event.eventId;
        const nestedExperienceState = preserveExperienceState
          ? (workspace === 'experience-rehearsal'
            ? ['rehearsalDay', 'rehearsalPersona', 'rehearsalRun', 'rehearsalMoment', 'rehearsalLens', 'rehearsalView', 'rehearsalSite', 'rehearsalScenario']
            : [
                'scenario', 'day', 'persona', 'journey', 'step', 'routeJourney', 'routeWaypoint', 'waypoint', 'entity', 'zone', 'area', 'touchpoint',
                'scene', 'hotspot', 'sceneView', 'sceneTruthLens', 'sceneCompare', 'landmark', 'lens', 'mapMode',
                'designLens', 'designViewpoint', 'designQuality', 'designTour', 'designPresentation', 'designTruth',
                'viewMode', 'experienceMode', 'presentationStep', 'presentationState', 'walk', 'mapZoom',
                'mapPanX', 'mapPanY', 'mapLayers', 'mapOpacity', 'compare', 'compareDay', 'comparePersona', 'compareLens',
                'mission', 'missionMode', 'missionLens', 'missionView', 'missionPresentation', 'missionTruth', 'view', 'surface'
              ])
            .map((key) => [key, currentUrl.searchParams.get(key)] as const)
          : [];
        const spatialWorkspace = workspace === 'spatial-authoring' || workspace === 'spatial-command';
        const activeSourceLayerId = spatialWorkspace
          ? routeOptions.sourceLayerId ?? currentUrl.searchParams.get('sourceLayer')
          : null;
        const requestedSpatialMode = routeOptions.spatialMode ?? currentUrl.searchParams.get('mode');
        const activeSpatialMode = workspace === 'spatial-command'
          ? requestedSpatialMode && spatialCommandModes.has(requestedSpatialMode) ? requestedSpatialMode as ProjectRouteUrlOptions['spatialMode'] : 'experience'
          : null;
        const activeCandidateEntityId = spatialWorkspace && activeSpatialMode !== 'executive'
          ? routeOptions.candidateEntityId ?? currentUrl.searchParams.get('candidateEntity')
          : null;
        const requestedVenueId = routeOptions.venueId;
        const activeVenueId = requestedVenueId && configuration.venues.some((candidate) => candidate.venueId === requestedVenueId)
          ? requestedVenueId
          : configuration.venues[0]?.venueId ?? null;
        const activeJourneyStepId = activeSpatialMode === 'journey'
          ? routeOptions.journeyStepId ?? currentUrl.searchParams.get('journeyStep')
          : null;
        const requestedViewMode = routeOptions.viewMode ?? currentUrl.searchParams.get('viewMode');
        const activeViewMode = workspace === 'spatial-command' && requestedViewMode && spatialCommandViewModes.has(requestedViewMode)
          ? requestedViewMode as ProjectRouteUrlOptions['viewMode']
          : null;
        const requestedEditingMode = routeOptions.editingMode ?? currentUrl.searchParams.get('edit');
        const activeEditingMode = workspace === 'spatial-command'
          && requestedEditingMode
          && spatialCommandEditingModes.has(requestedEditingMode)
          ? requestedEditingMode as ProjectRouteUrlOptions['editingMode']
          : null;
        const activeFocusMode = workspace === 'spatial-command'
          && (routeOptions.focusMode ?? currentUrl.searchParams.get('focus') === 'map');
        const activeSavedViewId = workspace === 'spatial-command'
          ? routeOptions.savedViewId ?? currentUrl.searchParams.get('savedView')
          : null;
        const nextUrl = projectRouteUrl(currentUrl, {
          workspace,
          projectId: configuration.project.projectId,
          eventId: configuration.event.eventId
        }, {
          venueId: activeVenueId,
          sourceLayerId: activeSourceLayerId,
          candidateEntityId: activeCandidateEntityId,
          spatialMode: activeSpatialMode,
          journeyStepId: activeJourneyStepId,
          viewMode: activeViewMode,
          editingMode: activeEditingMode,
          focusMode: activeFocusMode,
          savedViewId: activeSavedViewId
        });
        if (workspace === 'experience-twin' || workspace === 'experience-rehearsal') {
          nestedExperienceState.forEach(([key, value]) => {
            if (value && !nextUrl.searchParams.has(key)) nextUrl.searchParams.set(key, value);
          });
        }
        if (replace) window.history.replaceState({}, '', nextUrl);
        else window.history.pushState({}, '', nextUrl);
        if (workspace === 'spatial-command') window.dispatchEvent(new Event('mayadeen:route-written'));
      },
      commit: (configuration) => {
        setActiveConfiguration(configuration);
        setRoute(resolveProjectShellRoute(new URL(window.location.href), projectRegistry));
        setNavigationError(null);
        setPreferences(recordOpenedProject(window.localStorage, projectRegistry, configuration.project.projectId));
        setUnsavedLocalWork(false);
      },
      onStep: setSwitchStep
    });
    setSwitching(false);
    if (result.status === 'requires-confirmation') setPendingSwitch({ projectId, eventId, workspace, routeOptions });
    if (result.status === 'rejected') {
      setActiveConfiguration(null);
      setNavigationError(result.reasonAr);
    }
  }, [unsavedLocalWork]);

  const openPortfolio = useCallback(async (replace = false, force = false) => {
    if (unsavedLocalWork && !force) {
      setPendingSwitch('portfolio');
      return;
    }
    setSwitching(true);
    setSwitchStep('stop-project-streams');
    await projectScopedStreams.stopAll();
    setSwitchStep('clear-project-scope');
    useEventStore.getState().clearProjectScopedState(null, null);
    setActiveConfiguration(null);
    setUnsavedLocalWork(false);
    const nextUrl = projectRouteUrl(new URL(window.location.href), { workspace: 'portfolio', projectId: null, eventId: null });
    if (replace) window.history.replaceState({}, '', nextUrl);
    else window.history.pushState({}, '', nextUrl);
    setRoute(resolveProjectShellRoute(nextUrl, projectRegistry));
    setSwitching(false);
  }, [unsavedLocalWork]);

  const navigate = (workspace: AppWorkspace, eventId: string | null = null, replace = false, routeOptions: ProjectRouteUrlOptions = {}) => {
    if (workspace === 'portfolio' || workspace === 'launcher') {
      void openPortfolio(replace);
      return;
    }
    if (!activeConfiguration) {
      setNavigationError('اختر مشروعًا من المحفظة قبل فتح مساحة العمل.');
      void openPortfolio(replace, true);
      return;
    }
    const resolvedEvent = projectRegistry.resolveEvent(activeConfiguration.project.projectId, eventId ?? activeConfiguration.event.eventId);
    if (!resolvedEvent) {
      setNavigationError('الفعالية المطلوبة لا تنتمي إلى المشروع النشط.');
      return;
    }
    const nextUrl = projectRouteUrl(new URL(window.location.href), { workspace, projectId: activeConfiguration.project.projectId, eventId: resolvedEvent.eventId }, {
      ...routeOptions,
      venueId: routeOptions.venueId ?? route.venueId ?? activeConfiguration.venues[0]?.venueId ?? null
    });
    if (replace) window.history.replaceState({}, '', nextUrl);
    else window.history.pushState({}, '', nextUrl);
    const nextRoute = resolveProjectShellRoute(nextUrl, projectRegistry);
    setRoute(nextRoute);
    setNavigationError(nextRoute.errorAr);
    if (nextRoute.workspace === 'executive') setPresentationPreset('executive');
    else if (isTechnicalWorkspace(nextRoute.workspace)) setPresentationPreset('technical');
    else if (nextRoute.workspace !== 'portfolio' && nextRoute.workspace !== 'launcher' && nextRoute.workspace !== 'experience' && nextRoute.workspace !== 'experience-twin' && nextRoute.workspace !== 'experience-rehearsal') setPresentationPreset('operator');
    if (nextRoute.workspace === 'authoring') setAuthoringLoaded(true);
    if (nextRoute.workspace === 'experience') setExperienceLoaded(true);
    if (shellContextFor(nextRoute.workspace, hasActiveRuntime, authoringMode, true) !== 'operational') exitProjectionMode();
  };

  const openExperience = (eventId: string) => navigate('experience', eventId);

  const openKapCandidateAuthoring = () => {
    setAuthoringMode('kap-candidate');
    navigate('authoring');
  };

  const startNewProjectAuthoring = () => {
    setAuthoringMode('fictional-technical');
    setAuthoringLoaded(true);
    useEventStore.getState().clearProjectScopedState(null, null);
    setActiveConfiguration(null);
    const nextUrl = projectRouteUrl(new URL(window.location.href), { workspace: 'authoring', projectId: null, eventId: null }, { intent: 'new-project' });
    window.history.pushState({}, '', nextUrl);
    setRoute(resolveProjectShellRoute(nextUrl, projectRegistry));
  };

  const applyPresentationPreset = (preset: PresentationPreset) => {
    setPresentationPreset(preset);
    if (preset === 'executive' && activeWorkspace !== 'executive') {
      navigate('executive');
      return;
    }
    if (preset === 'operator' && (activeWorkspace === 'portfolio' || activeWorkspace === 'launcher' || activeWorkspace === 'executive' || activeWorkspace === 'configuration' || activeWorkspace === 'authoring' || activeWorkspace === 'integration' || activeWorkspace === 'iot')) {
      navigate('command');
    }
  };

  const navigateFromSearch = (workspace: AppWorkspace, experienceEventId?: string) => {
    if (workspace === 'experience') {
      if (experienceEventId) openExperience(experienceEventId);
      else setNavigationError('لا يمكن فتح التجربة دون حزمة صريحة.');
      return;
    }
    navigate(workspace);
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setBooting(false), 250);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (initialActivationStartedRef.current) return;
    initialActivationStartedRef.current = true;
    const initialProjectId = initialRoute.projectId;
    if (initialProjectId) {
      queueMicrotask(() => {
        void activateProject(initialProjectId, initialRoute.eventId, initialRoute.workspace, true, true, {
          venueId: initialRoute.venueId
        });
      });
      return;
    }
    useEventStore.getState().clearProjectScopedState(null, null);
    if (initialRoute.errorAr) {
      const portfolioUrl = projectRouteUrl(new URL(window.location.href), { workspace: 'portfolio', projectId: null, eventId: null });
      window.history.replaceState({}, '', portfolioUrl);
    }
  }, [activateProject, initialRoute.errorAr, initialRoute.eventId, initialRoute.projectId, initialRoute.venueId, initialRoute.workspace]);

  useEffect(() => {
    const syncFromLocation = () => {
      const nextRoute = resolveProjectShellRoute(new URL(window.location.href), projectRegistry);
      if (nextRoute.errorAr) {
        const portfolioUrl = projectRouteUrl(new URL(window.location.href), { workspace: 'portfolio', projectId: null, eventId: null });
        window.history.replaceState({}, '', portfolioUrl);
        setRoute({ workspace: 'portfolio', projectId: null, eventId: null, venueId: null, errorCode: null, errorAr: null, globalAuthoring: false });
        setNavigationError(nextRoute.errorAr);
        void openPortfolio(true, true);
      } else {
        setRoute(nextRoute);
        setNavigationError(null);
        if (nextRoute.projectId && (nextRoute.projectId !== activeConfiguration?.project.projectId
          || nextRoute.eventId !== activeConfiguration.event.eventId
          || nextRoute.venueId !== route.venueId)) {
          void activateProject(nextRoute.projectId, nextRoute.eventId, nextRoute.workspace, true, false, {
            venueId: nextRoute.venueId
          });
        }
        if (!nextRoute.projectId && !nextRoute.globalAuthoring && nextRoute.workspace === 'portfolio') void openPortfolio(true);
        if (nextRoute.workspace === 'executive') setPresentationPreset('executive');
        else if (isTechnicalWorkspace(nextRoute.workspace)) setPresentationPreset('technical');
        else if (nextRoute.workspace !== 'portfolio' && nextRoute.workspace !== 'launcher' && nextRoute.workspace !== 'experience' && nextRoute.workspace !== 'experience-twin' && nextRoute.workspace !== 'experience-rehearsal') setPresentationPreset('operator');
      }
      if (nextRoute.workspace === 'authoring') setAuthoringLoaded(true);
      if (nextRoute.workspace === 'experience') setExperienceLoaded(true);
      if (shellContextFor(nextRoute.workspace, hasActiveRuntime, authoringMode, Boolean(nextRoute.projectId)) !== 'operational') exitProjectionMode();
      // Nested workspaces own query-level view state that is intentionally
      // outside the project-shell route contract.
      window.dispatchEvent(new Event('mayadeen:location-synced'));
    };
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, [activateProject, activeConfiguration, authoringMode, exitProjectionMode, hasActiveRuntime, openPortfolio, route.venueId]);

  const workspaceUnavailable = (activeWorkspace === 'readiness' && !readinessAvailable)
    || ((activeWorkspace === 'decisions' || activeWorkspace === 'validation') && !decisionsEnabled)
    || ((activeWorkspace === 'integration' || activeWorkspace === 'iot') && !integrationEnabled);
  const displayedWorkspace: AppWorkspace = activeWorkspace;
  const displayedShellContext: ShellContext = activeConfiguration?.project.sourceClassification === 'candidate-real' && !activeConfiguration.runtime
    ? 'experience-candidate'
    : shellContextFor(displayedWorkspace, hasActiveRuntime, authoringMode, Boolean(activeConfiguration));
  const projectSwitcher = (
    <ProjectContextSwitcher
      activeProject={activeConfiguration?.project ?? null}
      activeEvent={activeConfiguration?.event ?? null}
      registry={projectRegistry}
      preferences={preferences}
      onSelectProject={(projectId) => void activateProject(projectId, null, 'executive')}
      onSelectEvent={(eventId) => activeConfiguration ? void activateProject(activeConfiguration.project.projectId, eventId, displayedWorkspace) : undefined}
      onOpenPortfolio={() => void openPortfolio()}
    />
  );

  if (booting) {
    return (
      <main className="project-shell flex min-h-screen items-center justify-center bg-command-bg p-6" lang="ar" dir="rtl">
        <LoadingState title="جاري تشغيل منصة مَيادين" message="يتم تحميل سجل المشاريع والسياق المطلوب." />
      </main>
    );
  }

  if (switching) {
    const stepIndex = Math.max(0, ['stop-project-streams', 'clear-project-scope', 'resolve-project-configuration', 'activate-event-runtime', 'activate-event-theme'].indexOf(switchStep));
    return <ActiveProjectProvider value={{ configuration: null, switching: true }}><main data-testid="project-switch-loading" data-switch-step={switchStep} className="project-switch-loading" lang="ar" dir="rtl"><section className="project-switch-loading-card"><div className="project-switch-loading-mark" aria-hidden="true" /><p className="portfolio-kicker">Atomic Project Switch</p><h2>جاري تبديل سياق المشروع</h2><p>أوقفنا تدفقات المشروع السابق ومسحنا الاختيارات المحلية قبل تفعيل الحزمة والثيم التاليين.</p><ol aria-label="تقدم تبديل المشروع">{Array.from({ length: 5 }, (_, index) => <li key={index} className={index <= stepIndex ? 'is-active' : undefined} />)}</ol></section></main></ActiveProjectProvider>;
  }

  if (displayedWorkspace === 'portfolio') {
    return <ActiveProjectProvider value={{ configuration: null, switching: false }}><div className="project-shell"><ProjectPortfolioWorkspace registry={projectRegistry} preferences={preferences} messageAr={navigationError} contextSwitcher={projectSwitcher} onOpenProject={(projectId, workspace = 'executive', options = {}) => void activateProject(projectId, null, workspace, false, false, options)} onStartAuthoring={startNewProjectAuthoring} /></div></ActiveProjectProvider>;
  }

  if (displayedShellContext === 'operational' && isProjectionMode) {
    return (
      <main
        className="project-shell relative h-screen overflow-hidden bg-command-bg"
        lang="ar"
        dir="rtl"
        data-testid="projection-mode"
        data-projection-clean={projectionCleanMode}
      >
        <EventSceneViewport className="h-screen w-screen" />
        {projectionCleanMode ? null : <ProjectionToolbar />}
      </main>
    );
  }

  if (displayedWorkspace === 'visual-direction') {
    return (
      <Suspense
        fallback={(
          <main className="flex min-h-screen items-center justify-center bg-[#fcf8ef] p-6 text-[#243029]" lang="ar" dir="rtl">
            <LoadingState title="جاري تحميل نموذج الاتجاه البصري" message="يتم تحميل بيئة مراجعة Hybrid Light Command عند الطلب." />
          </main>
        )}
      >
        <VisualDirectionReviewWorkspace />
      </Suspense>
    );
  }

  return (
    <ActiveProjectProvider value={{ configuration: activeConfiguration, switching: false }}>
    <main className="project-shell h-screen overflow-y-auto bg-command-bg text-command-text xl:overflow-hidden" lang="ar" dir="rtl" data-project-id={activeConfiguration?.project.projectId ?? 'none'} data-event-id={activeConfiguration?.event.eventId ?? 'none'} data-theme-id={activeConfiguration?.theme.themeId ?? 'none'}>
      <a className="command-skip-link" href="#workspace-content">تخطي إلى محتوى مساحة العمل</a>
      <div className="flex h-screen min-h-0 flex-col">
        {displayedWorkspace === 'experience-twin' ? null : <TopCommandBar
          activeWorkspace={displayedWorkspace}
          shellContext={displayedShellContext}
          experiencePackageRole={activeConfiguration?.project.sourceClassification === 'candidate-real'
            ? 'experience'
            : displayedWorkspace === 'experience'
              ? selectedExperience?.packageRole
              : displayedWorkspace === 'authoring' && authoringMode === 'kap-candidate'
                ? 'experience'
                : undefined}
          dashboardCollapsed={dashboardCollapsed}
          inspectorCollapsed={inspectorCollapsed}
          presentationPreset={presentationPreset}
          projectSwitcher={projectSwitcher}
          hasProjectContext={Boolean(activeConfiguration)}
          readinessAvailable={readinessAvailable}
          onPresentationPresetChange={applyPresentationPreset}
          onOpenLauncher={() => navigate('portfolio')}
          onOpenExecutive={() => navigate('executive')}
          onOpenCommand={() => navigate('command')}
          onOpenSpatial={() => navigate('spatial')}
          onOpenReadiness={() => navigate('readiness')}
          onOpenDecisions={() => navigate('decisions')}
          onOpenValidation={() => navigate('validation')}
          onOpenIntegration={() => navigate('integration')}
          onOpenIoT={() => navigate('iot')}
          onOpenConfiguration={() => navigate('configuration')}
          onOpenAuthoring={() => navigate('authoring')}
          onOpenVisualSystem={() => navigate('visual-system')}
          onOpenExperience={() => activeConfiguration?.event.experiencePackId
            ? openExperience(activeConfiguration.event.eventId)
            : activeConfiguration?.event.spatialCommandPackId
              ? navigate('spatial-command', activeConfiguration.event.eventId, false, { spatialMode: 'experience' })
              : setNavigationError('لا توجد حزمة تجربة مرتبطة بهذه الفعالية.')}
          onSearchNavigate={navigateFromSearch}
          onToggleDashboard={() => setDashboardCollapsed((value) => !value)}
          onToggleInspector={() => setInspectorCollapsed((value) => !value)}
        />}

        <div id="workspace-content" tabIndex={-1} className="flex min-h-0 flex-1 flex-col">
        {displayedShellContext === 'operational' && errorMessage ? (
          <div className="border-b border-command-severity-critical/40 bg-command-severity-critical/10 px-4 py-3">
            <ErrorState
              title="تنبيه تشغيلي"
              message={errorMessage}
              action={
                <button type="button" onClick={clearError} className="command-button border-command-severity-critical/60 bg-command-severity-critical/10 text-xs text-command-text">
                  إغلاق التنبيه
                </button>
              }
            />
          </div>
        ) : null}

        {navigationError ? (
          <div className="border-b border-command-amber/40 bg-command-amber/10 px-4 py-3">
            <ErrorState
              title="تعذر فتح رابط المراجعة"
              message={navigationError}
              action={<button type="button" onClick={() => setNavigationError(null)} className="command-button text-xs">إغلاق التنبيه</button>}
            />
          </div>
        ) : null}

        {displayedWorkspace === 'experience-rehearsal' && activeConfiguration ? (
          <Suspense fallback={<div data-testid="experience-rehearsal-loading" className="flex min-h-0 flex-1 items-center justify-center bg-[#f4efe4] p-6 text-[#173e33]"><LoadingState title="جاري تحميل قيادة البروفة الرقمية" message="يتم تحميل المحرك والحزمة المرشحة محليًا دون تفعيل حقيقة تشغيلية." /></div>}>
            <ExperienceRehearsalWorkspaceEntry
              projectId={activeConfiguration.project.projectId}
              eventId={activeConfiguration.event.eventId}
              venueId={route.venueId ?? activeConfiguration.venues[0]?.venueId ?? ''}
              packId={activeConfiguration.event.experienceTwinPackId}
              onDirtyChange={setUnsavedLocalWork}
              onNavigate={(workspace) => navigate(workspace)}
            />
          </Suspense>
        ) : displayedWorkspace === 'experience-twin' && activeConfiguration ? (
          <Suspense fallback={<div data-testid="experience-twin-loading" className="flex min-h-0 flex-1 items-center justify-center bg-[#f4efe4] p-6 text-[#173e33]"><LoadingState title="جاري تحميل توأم تجربة الفعالية" message="يتم تحميل حزمة التجربة المرشحة ومراجعها المحلية عند الطلب فقط." /></div>}>
            <ExperienceTwinWorkspaceEntry
              projectId={activeConfiguration.project.projectId}
              eventId={activeConfiguration.event.eventId}
              venueId={route.venueId ?? activeConfiguration.venues[0]?.venueId ?? ''}
              packId={activeConfiguration.event.experienceTwinPackId}
              onDirtyChange={setUnsavedLocalWork}
              onOpenRehearsal={activeConfiguration.project.projectId === kapProjectId ? () => navigate('experience-rehearsal') : undefined}
              onExit={() => navigate('portfolio')}
            />
          </Suspense>
        ) : displayedWorkspace === 'spatial-command' && activeConfiguration ? (
          <Suspense fallback={<div data-testid="spatial-command-workspace-loading" className="flex min-h-0 flex-1 items-center justify-center p-6"><LoadingState title="جاري تحميل تجربة القيادة المكانية" message="يتم تحميل حزمة المشروع المكانية عند الطلب دون تفعيل بيانات تشغيلية أو مصدر بديل." /></div>}>
            <SpatialCommandWorkspaceEntry
              configurationId={activeConfiguration.event.spatialCommandPackId ?? undefined}
              projectId={activeConfiguration.project.projectId}
              eventId={activeConfiguration.event.eventId}
              venueId={route.venueId ?? activeConfiguration.venues[0]?.venueId ?? ''}
              onOpenTechnicalRoute={(technicalRoute) => navigate(technicalRoute.workspace, null, false, { sourceLayerId: technicalRoute.sourceLayerId })}
              onOpenDesignScene={(sceneAssetId) => navigate('experience-twin', null, false, { experienceSceneId: sceneAssetId, experienceReviewMode: 'scenes', experienceMapMode: 'web3d', experienceViewMode: 'scene-focus', designSceneLens: 'truth', designSceneQualityProfile: 'balanced' })}
            />
          </Suspense>
        ) : displayedWorkspace === 'spatial-authoring' ? activeConfiguration?.project.projectId === kapProjectId ? (
          <Suspense fallback={<div data-testid="spatial-authoring-workspace-loading" className="flex min-h-0 flex-1 items-center justify-center p-6"><LoadingState title="جاري تحميل مواءمة المخطط" message="يتم تحميل بيانات المصدر الخفيفة فقط؛ ملف DWG لا يُحلل في المتصفح." /></div>}>
            <KapSpatialAuthoringWorkspace projectId={activeConfiguration.project.projectId} eventId={activeConfiguration.event.eventId} venueId={route.venueId ?? activeConfiguration.venues[0]?.venueId ?? ''} onNavigate={(workspace) => navigate(workspace)} />
          </Suspense>
        ) : (
          <div data-testid="cad-project-isolation-error" className="flex min-h-0 flex-1 items-center justify-center p-6"><ErrorState title="مواءمة KAP محجوبة" message="مصدر CAD مقيد بمشروع KAP ولا يمكن عرضه أو ربطه في المشروع النشط." action={<button type="button" onClick={() => navigate('spatial')} className="command-button command-button-primary">العودة إلى مكان المشروع</button>} /></div>
        ) : displayedWorkspace === 'experience' && activeConfiguration?.project.projectId === kapProjectId ? (
          <Suspense fallback={<div className="flex min-h-0 flex-1 items-center justify-center p-6"><LoadingState title="جاري تحميل تجربة KAP" message="يتم تفعيل ثيم المشروع المرشح داخل سياقه فقط." /></div>}><KapProjectWorkspace workspace="experience" onNavigate={(workspace) => navigate(workspace)} /></Suspense>
        ) : experienceLoaded && selectedExperience ? (
          <div className={displayedWorkspace === 'experience' ? 'flex min-h-0 flex-1' : 'hidden'}>
            <Suspense fallback={<div data-testid="experience-workspace-loading" className="flex min-h-0 flex-1 items-center justify-center p-6"><LoadingState title="جاري تحميل خريطة التجربة" message="يتم تحميل حزمة التجربة المرشحة عند الطلب." /></div>}>
              <ExperienceIntelligenceWorkspace eventId={route.eventId} onOpenAuthoring={openKapCandidateAuthoring} />
            </Suspense>
          </div>
        ) : displayedWorkspace === 'experience' ? (
          <div data-testid="project-experience-empty" className="flex min-h-0 flex-1 items-center justify-center p-6"><ErrorState title="لا توجد حزمة تجربة لهذا المشروع" message="لم تُربط حزمة Experience Intelligence بهذه الفعالية، ولم تُستخدم حزمة KAP أو أي مرجع بديل." action={<button type="button" onClick={() => navigate('executive')} className="command-button command-button-primary">العودة إلى القيادة</button>} /></div>
        ) : null}

        {authoringLoaded ? (
          <div className={displayedWorkspace === 'authoring' ? 'flex min-h-0 flex-1' : 'hidden'}>
            <Suspense fallback={<div data-testid="pilot-authoring-workspace-loading" className="flex min-h-0 flex-1 items-center justify-center p-6"><LoadingState title="جاري تحميل مختبر التأليف" message="يتم تحميل عقود وقوالب Stage 3E.2 عند الطلب." /></div>}>
              <PilotAuthoringWorkspace mode={authoringMode} onModeChange={setAuthoringMode} onDirtyChange={setUnsavedLocalWork} />
            </Suspense>
          </div>
        ) : null}

        {displayedWorkspace === 'experience' || displayedWorkspace === 'experience-twin' || displayedWorkspace === 'experience-rehearsal' || displayedWorkspace === 'authoring' || displayedWorkspace === 'spatial-authoring' || displayedWorkspace === 'spatial-command' ? null : workspaceUnavailable ? (
          <div data-testid="workspace-unavailable" className="flex min-h-0 flex-1 items-center justify-center p-6">
            <ErrorState
              title="القدرة غير مفعّلة"
              message="هذه القدرة غير مفعّلة في الحزمة التشغيلية الحالية، ولم تُستبدل بمساحة أخرى أو ببيانات تجريبية صامتة."
              action={<button type="button" onClick={() => navigate('command', null, true)} className="command-button command-button-primary">العودة إلى مركز القيادة</button>}
            />
          </div>
        ) : displayedWorkspace === 'launcher' ? (
          <NeutralLauncher
            defaultDemoExperience={defaultDemoExperience}
            referenceExperience={referenceExperience}
            onOpenExperience={openExperience}
            onOpenAuthoring={openKapCandidateAuthoring}
            onOpenCommand={() => navigate('command')}
            activeRuntimeName={activeRuntimeName}
          />
        ) : displayedWorkspace === 'executive' && activeConfiguration?.project.projectId === kapProjectId ? (
          <Suspense fallback={<div className="flex min-h-0 flex-1 items-center justify-center p-6"><LoadingState title="جاري تحميل قيادة KAP" message="يتم تحميل العرض التنفيذي المرشح دون بيانات تشغيلية بديلة." /></div>}><KapProjectWorkspace workspace="executive" onNavigate={(workspace) => navigate(workspace)} /></Suspense>
        ) : displayedWorkspace === 'executive' ? (
          <ExecutiveOverview
            onOpenCommand={() => navigate('command')}
            onOpenDecisions={() => navigate('decisions')}
            onOpenSpatial={() => navigate('spatial')}
          />
        ) : displayedWorkspace === 'spatial' && activeConfiguration?.project.projectId === kapProjectId ? (
          <Suspense fallback={<div className="flex min-h-0 flex-1 items-center justify-center p-6"><LoadingState title="جاري تحميل مساحة KAP المكانية" message="لا تُستخدم هندسة تجريبية أثناء التحميل." /></div>}><KapProjectWorkspace workspace="spatial" onNavigate={(workspace) => navigate(workspace)} /></Suspense>
        ) : displayedWorkspace === 'spatial' ? (
          <SpatialWorkspace onOpenDecision={() => navigate('decisions')} />
        ) : displayedWorkspace === 'readiness' ? (
          <Suspense fallback={<div data-testid="readiness-command-loading" className="flex min-h-0 flex-1 items-center justify-center p-6"><LoadingState title="جاري تحميل قيادة الجاهزية" message="يتم تحميل حزمة المشروع والاشتقاق الحتمي عند الطلب." /></div>}>
            <ReadinessCommandWorkspaceEntry
              packId={activeConfiguration?.event.readinessPackId}
              projectId={activeConfiguration?.project.projectId ?? ''}
              eventId={activeConfiguration?.event.eventId ?? ''}
              venueId={route.venueId ?? activeConfiguration?.venues[0]?.venueId ?? ''}
              projectNameAr={activeConfiguration?.project.nameAr ?? 'مشروع غير محدد'}
              eventNameAr={activeConfiguration?.event.nameAr ?? 'فعالية غير محددة'}
              spatialConfigurationId={activeConfiguration?.event.spatialCommandPackId ?? null}
              onOpenOperationalPack={() => navigate('readiness-pack')}
            />
          </Suspense>
        ) : displayedWorkspace === 'readiness-pack' ? (
          <Suspense fallback={<div data-testid="readiness-pack-loading" className="flex min-h-0 flex-1 items-center justify-center p-6"><LoadingState title="جاري تحميل حزمة الجاهزية التشغيلية" message="يتم تحميل بيانات الحزمة المرشحة ومراجعها المصغّرة فقط." /></div>}>
            <OperationalReadinessPackWorkspaceEntry
              projectId={activeConfiguration?.project.projectId ?? ''}
              eventId={activeConfiguration?.event.eventId ?? ''}
              venueId={route.venueId ?? activeConfiguration?.venues[0]?.venueId ?? ''}
              projectNameAr={activeConfiguration?.project.nameAr ?? 'مشروع غير محدد'}
              eventNameAr={activeConfiguration?.event.nameAr ?? 'فعالية غير محددة'}
              spatialConfigurationId={activeConfiguration?.event.spatialCommandPackId ?? null}
              onOpenReadinessCommand={() => navigate('readiness')}
            />
          </Suspense>
        ) : displayedWorkspace === 'decisions' ? (
          <DecisionCenter />
        ) : displayedWorkspace === 'validation' ? (
          <OperationalValidationWorkspace key={activeRuntimeScopeKey ?? 'fallback-demo'} />
        ) : displayedWorkspace === 'integration' ? (
          <Suspense fallback={<div data-testid="integration-workspace-loading" className="flex min-h-0 flex-1 items-center justify-center p-6"><LoadingState title="جاري تحميل مختبر التكامل" message="يتم تحميل أدوات المحاكاة المحلية عند الطلب." /></div>}>
            <OperationalCaptureLab />
          </Suspense>
        ) : displayedWorkspace === 'iot' ? (
          <Suspense fallback={<div data-testid="iot-workspace-loading" className="flex min-h-0 flex-1 items-center justify-center p-6"><LoadingState title="جاري تحميل مختبر إنترنت الأشياء" message="يتم تحميل سجل الأجهزة ومحاكاة القياسات المحلية عند الطلب." /></div>}>
            <IoTIntegrationWorkspace />
          </Suspense>
        ) : displayedWorkspace === 'configuration' ? (
          <Suspense fallback={<div data-testid="configuration-workspace-loading" className="flex min-h-0 flex-1 items-center justify-center p-6"><LoadingState title="جاري تحميل تهيئة الفعاليات" message="يتم تحميل عقود الحزم المرجعية عند الطلب." /></div>}>
            <EventConfigurationWorkspace />
          </Suspense>
        ) : displayedWorkspace === 'visual-system' ? (
          <Suspense fallback={<div data-testid="command-visual-system-loading" className="flex min-h-0 flex-1 items-center justify-center p-6"><LoadingState title="جاري تحميل مرجع النظام المرئي" message="يتم تحميل tokens وحالات المكونات عند الطلب." /></div>}>
            <CommandVisualSystemWorkspace />
          </Suspense>
        ) : (
          <div data-testid="operational-command-center" className="flex min-h-0 flex-1 flex-col">
            <div className={`grid flex-1 grid-cols-1 gap-4 p-4 xl:min-h-0 ${gridColumnsClass} xl:overflow-hidden`}>
              {dashboardCollapsed ? (
                <CollapsedPanelRail label="لوحة التشغيل" onClick={() => setDashboardCollapsed(false)} icon={<PanelRightOpen className="h-5 w-5" aria-hidden="true" />} />
              ) : (
                <aside aria-label="لوحة التشغيل" className="space-y-3 xl:min-h-0 xl:overflow-y-auto xl:pl-1 command-scrollbar">
                  <Panel title="لوحة التشغيل" eyebrow="بيانات عرض مؤقتة">
                    <OperationalSnapshot entities={entities} routeVisibility={routeVisibility} routes={routes} />
                  </Panel>
                  <Panel title="أنماط العرض" eyebrow="الكاميرات">
                    <ViewModeControls />
                  </Panel>
                  <Panel title="العناصر التشغيلية" eyebrow={`${new Intl.NumberFormat('ar-SA').format(entityCount)} عنصر`}>
                    <ZoneList />
                  </Panel>
                </aside>
              )}

              <section aria-label="المشهد التشغيلي" className="relative min-h-[560px] min-w-0 overflow-hidden border border-command-line bg-command-panel xl:min-h-0">
                <EventSceneViewport className="h-[62vh] xl:h-full" />
              </section>

              {inspectorCollapsed ? (
                <CollapsedPanelRail label="لوحة التفاصيل" onClick={() => setInspectorCollapsed(false)} icon={<PanelLeftOpen className="h-5 w-5" aria-hidden="true" />} />
              ) : (
                <aside aria-label="لوحة التفاصيل" className="space-y-3 xl:min-h-0 xl:overflow-y-auto xl:pr-1 command-scrollbar">
                  <div className="2xl:sticky 2xl:top-0 2xl:z-10 2xl:bg-command-bg 2xl:pb-3">
                    <Panel title="السيناريوهات" eyebrow="محرك خطوات">
                      <ScenarioControls />
                    </Panel>
                  </div>
                  <Panel title="من الحالة إلى الإجراء" eyebrow="تدفق قرار موحد">
                    <OperatorDecisionFlow onOpenDecision={() => navigate('decisions')} />
                  </Panel>
                  <Panel title="تفاصيل العنصر المحدد" eyebrow="تزامن فوري">
                    <SelectedEntityPanel />
                  </Panel>
                  <CollapsiblePanel title="المسارات" eyebrow="حركة تشغيلية" expanded={routesExpanded} onToggle={() => setRoutesExpanded((value) => !value)}>
                    <RouteToggles />
                  </CollapsiblePanel>
                  <CollapsiblePanel
                    title="مفتاح الحالات"
                    eyebrow="ألوان قابلة للعكس"
                    expanded={statusLegendExpanded}
                    onToggle={() => setStatusLegendExpanded((value) => !value)}
                    action={<button data-testid="reset-demo-open" type="button" onClick={() => setResetDialogOpen(true)} className="command-button min-h-8 px-2.5 py-1.5 text-xs">إعادة بيانات العرض</button>}
                  >
                    <StatusLegend />
                  </CollapsiblePanel>
                </aside>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      <ConfirmDialog
        open={resetDialogOpen}
        title="تأكيد إعادة بيانات العرض"
        message="سيتم استبدال التعديلات المحلية بحالة العرض التجريبي الأصلية. لا يوجد خادم خارجي في هذه المرحلة."
        confirmLabel="إعادة البيانات"
        cancelLabel="إلغاء"
        onCancel={() => setResetDialogOpen(false)}
        onConfirm={() => {
          resetDemoData();
          setResetDialogOpen(false);
        }}
      />
      <ConfirmDialog
        open={pendingSwitch !== null}
        title="يوجد عمل محلي غير محفوظ"
        message="سيؤدي تبديل المشروع إلى إغلاق مسودة التأليف المحلية الحالية. يمكنك الإلغاء والعودة إليها، أو المتابعة ومسحها من سياق الواجهة."
        confirmLabel="متابعة التبديل"
        cancelLabel="إلغاء"
        onCancel={() => setPendingSwitch(null)}
        onConfirm={() => {
          const pending = pendingSwitch;
          setPendingSwitch(null);
          if (pending === 'portfolio') void openPortfolio(false, true);
          else if (pending) void activateProject(pending.projectId, pending.eventId, pending.workspace, false, true, pending.routeOptions);
        }}
      />
    </main>
    </ActiveProjectProvider>
  );
}

function NeutralLauncher({
  defaultDemoExperience,
  referenceExperience,
  onOpenExperience,
  onOpenAuthoring,
  onOpenCommand,
  activeRuntimeName
}: {
  defaultDemoExperience: (typeof experienceIntelligenceCatalog)[number]['pack'] | null;
  referenceExperience: (typeof experienceIntelligenceCatalog)[number]['pack'] | null;
  onOpenExperience: (eventId: string) => void;
  onOpenAuthoring: () => void;
  onOpenCommand: () => void;
  activeRuntimeName: string | null;
}) {
  return (
    <div data-testid="neutral-launcher" className="grid flex-1 gap-6 overflow-y-auto p-4 md:p-6 xl:min-h-0 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)] command-scrollbar">
      <div className="space-y-6">
        <Suspense fallback={<div className="command-skeleton h-28" aria-label="جاري تحميل مدخل خريطة التجربة" />}>
          <ExperienceEntryPanel onOpenExperience={onOpenExperience} onOpenAuthoring={onOpenAuthoring} />
        </Suspense>
        <OperationalLauncherCard onOpen={onOpenCommand} activeRuntimeName={activeRuntimeName} />
        {defaultDemoExperience ? <LauncherPackageCard pack={defaultDemoExperience} label="حزمة تجربة تجريبية عامة" onOpen={() => onOpenExperience(defaultDemoExperience.eventId)} /> : null}
        {referenceExperience ? <LauncherPackageCard pack={referenceExperience} label="حزمة مرجعية" onOpen={() => onOpenExperience(referenceExperience.eventId)} /> : null}
      </div>
      <aside className="space-y-3 xl:min-h-0 xl:overflow-y-auto command-scrollbar">
        <NeutralLauncherState activeRuntimeName={activeRuntimeName} />
        <div className="command-card p-5 text-sm leading-7 text-command-muted">
          <p className="font-semibold text-command-text">مفاتيح الإطلاق</p>
          <ul className="mt-2 space-y-1">
            <li>حزمة تجربة مرشحة</li>
            <li>بيئة تشغيل تجريبية عامة</li>
            <li>حزمة مرجعية</li>
            <li>لا توجد بيانات تشغيلية حية</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function OperationalLauncherCard({ onOpen, activeRuntimeName }: { onOpen: () => void; activeRuntimeName: string | null }) {
  return (
    <section className="command-action-center">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="rounded-sm border border-command-accent/50 bg-command-accent/10 px-2 py-1 text-command-accent">بيئة تشغيل تجريبية عامة</span>
        <span className="rounded-sm border border-command-line bg-command-panelStrong px-2 py-1 text-command-muted">اختيار صريح</span>
      </div>
      <h2 className="mt-3 text-lg font-bold text-command-text">مركز القيادة التشغيلي</h2>
      <p className="mt-2 text-sm leading-6 text-command-muted">{activeRuntimeName ? `سيفتح آخر Runtime مؤقت مفعّل: ${activeRuntimeName}. لا يُعامل كحزمة KAP أو كخط أساس.` : 'مشهد ومؤشرات وسيناريوهات محلية تجريبية مستقلة تمامًا عن حزمة KAP المرشحة.'}</p>
      <button data-testid="launcher-command-open" type="button" onClick={onOpen} className="command-button command-button-primary mt-4">فتح مركز القيادة التشغيلي</button>
    </section>
  );
}

function LauncherPackageCard({
  pack,
  label,
  onOpen
}: {
  pack: (typeof experienceIntelligenceCatalog)[number]['pack'];
  label: string;
  onOpen: () => void;
}) {
  return (
    <section className="command-surface p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="rounded-sm border border-command-accent/50 bg-command-accent/10 px-2 py-1 text-command-accent">{label}</span>
        <span className="rounded-sm border border-command-line bg-command-panelStrong px-2 py-1 text-command-muted">{pack.packageRole === 'demo' ? 'بيانات تجريبية صريحة' : pack.packageRole === 'reference' ? 'حزمة مرجعية' : 'حزمة تجربة مرشحة'}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
        <div>
          <p className="text-xs text-command-muted">مدخل مستقل بدون أي بيانات تشغيلية موروثة</p>
          <h2 className="mt-1 text-lg font-bold text-command-text">{pack.eventNameAr}</h2>
        </div>
        <span className="inline-flex items-center gap-2 text-sm text-command-muted"><CalendarDays className="h-4 w-4 text-command-accent" aria-hidden="true" /><bdi dir="ltr" className="font-semibold text-command-text">{pack.eventDate}</bdi></span>
        <span className="inline-flex items-center gap-2 text-sm text-command-muted"><Map className="h-4 w-4 text-command-amber" aria-hidden="true" />{pack.packageRole === 'demo' ? 'حزمة تجربة تجريبية عامة' : 'حزمة مرجعية مستقلة'}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-command-muted">
        {pack.experiencePoints.map((point) => <span key={point.experiencePointId}>{point.nameAr}</span>)}
      </div>
      <button data-testid={`launcher-experience-${pack.eventId}`} type="button" onClick={onOpen} className="command-button command-button-primary mt-4"><span className="flex items-center gap-2"><Map className="h-4 w-4" aria-hidden="true" />فتح الحزمة</span></button>
    </section>
  );
}

function NeutralLauncherState({ activeRuntimeName }: { activeRuntimeName: string | null }) {
  return (
    <section className="command-surface p-5">
      <p className="text-xs font-semibold text-command-accent">حالة الإطلاق</p>
      <h2 className="mt-2 text-lg font-bold text-command-text">واجهة اختيار الحزمة</h2>
      <div className="mt-3 space-y-2 text-sm leading-7 text-command-muted">
        <p>{activeRuntimeName ? `توجد بيئة تشغيل مؤقتة محفوظة في الذاكرة: ${activeRuntimeName}` : 'لا توجد بيئة تشغيل مؤقتة محفوظة'}</p>
        <p>لا توجد بيانات تشغيلية حية</p>
        <p>لا تفعيل لخط الأساس</p>
        <p>المؤشرات التشغيلية لا تظهر إلا بعد اختيار بيئة تشغيل صريحة</p>
      </div>
    </section>
  );
}

interface CollapsiblePanelProps {
  title: string;
  eyebrow: string;
  expanded: boolean;
  onToggle: () => void;
  action?: ReactNode;
  children: ReactNode;
}

function CollapsiblePanel({ title, eyebrow, expanded, onToggle, action, children }: CollapsiblePanelProps) {
  return (
    <section className="command-panel">
      <div className="flex items-center justify-between gap-3 border-b border-command-line px-3.5 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-command-muted">{eyebrow}</p>
          <h2 className="mt-1 text-base font-bold text-command-text">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <button type="button" className="command-icon-button" onClick={onToggle} aria-expanded={expanded} aria-label={`${expanded ? 'طي' : 'فتح'} ${title}`} title={`${expanded ? 'طي' : 'فتح'} ${title}`}>
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>
      {expanded ? <div className="p-3.5">{children}</div> : null}
    </section>
  );
}

function CollapsedPanelRail({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <aside aria-label={label} className="hidden min-h-0 items-start justify-center border border-command-line bg-command-panel/80 p-2 xl:flex">
      <button type="button" onClick={onClick} className="command-icon-button" aria-label={`فتح ${label}`} title={`فتح ${label}`}>
        {icon}
      </button>
    </aside>
  );
}
