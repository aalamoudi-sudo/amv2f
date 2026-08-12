import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Code2,
  Database,
  Download,
  Eye,
  FileCheck2,
  Focus,
  GitCompareArrows,
  ImageOff,
  Layers3,
  LayoutDashboard,
  Map as MapIcon,
  Menu,
  MonitorPlay,
  PackageCheck,
  Pause,
  Play,
  Presentation,
  Radar,
  RotateCcw,
  Route,
  Save,
  ShieldCheck,
  Sparkles,
  SquareDashedMousePointer,
  UserRound,
  X
} from 'lucide-react';
import { lazy, Suspense, useEffect, useEffectEvent, useRef, useState, type CSSProperties } from 'react';
import { declutterExperienceMarkers, type ExperienceTwinConfiguration } from '../../data/experienceTwinConfigurations';
import { createExperiencePackCandidateRevision, exportSanitizedExperiencePack, previewExperiencePackDifference, resetExperiencePackCandidate } from '../../services/experiencePackAuthoring';
import { projectExperienceTruth } from '../../services/experienceProjection';
import { reduceDigitalRehearsal } from '../../services/digitalRehearsal';
import { createExperienceSceneGateway, selectSceneAssetForMode } from '../../services/experienceSceneGateway';
import { deriveRouteDesignConvergence, normalizeOperationalJourneySelection } from '../../services/experienceRouteDesignConvergence';
import { createExperienceSelection, writeExperienceSelectionToUrl } from '../../services/experienceSelection';
import { defaultVisibleStoryMapLayerIds, focusStoryMapLandmark, projectStoryMap, resolveStoryMapRoute, resolveStoryMapStop, stepStoryMapStop } from '../../services/storyMap';
import { materializeExperiencePack, validateExperiencePack, type ExperiencePackValidationOptions } from '../../services/experienceTwinValidation';
import type { DigitalRehearsalAction } from '../../services/digitalRehearsal';
import type { ExperienceMapMode, ExperiencePack, ExperienceReviewMode, ExperienceSelectionContext, ExperienceViewMode, OperationalLensId } from '../../types/experienceTwin';
import type { ExperienceSceneAsset, SceneViewerProjection } from '../../types/experienceScene';
import { createSceneValidationContext } from '../../data/experienceSceneRegistries';
import { findFourDayExperienceTruthProjection } from '../../data/experienceReviewProjections';
import { findDigitalRehearsalPlan } from '../../data/digitalRehearsalPlans';
import { deriveMissionGraphProjection, deriveMissionTruthContext, resolveMissionMomentId } from '../../services/missionGraphProjection';
import {
  resolveCanonicalMissionSelection,
  resolveMissionCanvasRouteState,
  resolveMissionContext,
  writeMissionContextToUrl,
  type MissionSelectionTransition
} from '../../services/missionContext';
import type { MissionCanvasRouteState, MissionContext } from '../../types/missionControl';
import { LoadingState } from '../shared/StateBlocks';
import { ExperienceRouteDesignContext } from './ExperienceRouteDesignContext';
import { GoldenJourneyExperience } from './GoldenJourneyExperience';
import './experienceTwin.css';

const StoryMapExperience = lazy(() => import('./StoryMapExperience'));
const ExperienceSceneViewer = lazy(() => import('./ExperienceSceneViewer'));
const ExperienceIntegratedReviewEntry = lazy(() => import('./ExperienceIntegratedReviewEntry').then((module) => ({ default: module.ExperienceIntegratedReviewEntry })));
const MissionCanvas = lazy(() => import('../mission-control/MissionCanvas'));

const truthLabelAr: Record<string, string> = {
  'illustrative-only': 'توضيحي فقط',
  'source-backed-candidate': 'مرشح مسند إلى المصدر',
  'design-candidate': 'تصميم مرشح',
  'design-approved': 'تصميم معتمد',
  'field-reported': 'مبلّغ ميدانيًا',
  'field-verified': 'متحقق ميدانيًا',
  'actual-verified': 'متحقق فعليًا',
  'live-reported': 'مبلّغ حيًا',
  'live-verified': 'متحقق حيًا'
};

const mapModeLabels: Record<ExperienceMapMode, string> = {
  story: 'سردي',
  operational: 'تشغيلي',
  illustrated: 'توضيحي',
  web3d: 'Web3D',
  panorama: '360'
};

const experienceReviewModes: Array<{ id: ExperienceReviewMode; labelAr: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', labelAr: 'نظرة التجربة', icon: LayoutDashboard },
  { id: 'days', labelAr: 'الأيام الأربعة', icon: CalendarDays },
  { id: 'journey', labelAr: 'رحلة الزائر', icon: Route },
  { id: 'story', labelAr: 'خريطة القصة', icon: MapIcon },
  { id: 'scenes', labelAr: 'المشاهد', icon: Camera },
  { id: 'command', labelAr: 'القيادة', icon: Radar },
  { id: 'sources', labelAr: 'الحقيقة والمصادر', icon: Database },
  { id: 'delivery', labelAr: 'مركز استلام وربط الأصول · ما تم / ما التالي', icon: PackageCheck },
  { id: 'presentation', labelAr: 'عرض العميل', icon: Presentation }
];

function sceneTruthLabel(asset: ExperiencePack['sceneAssets'][number] | null): string {
  if (!asset) return 'المصدر غير متوفر';
  if (asset.sourceAuthority === 'founder-provided-candidate-program-and-design-reference' && asset.truthClass === 'design-candidate') return 'تصميم مرشح من مصدر مقدم من المؤسس';
  if (asset.medium === 'missing-source') return 'المصدر غير متوفر';
  return truthLabelAr[asset.truthClass] ?? 'المصدر غير متوفر';
}

function safeParsePack(value: string): ExperiencePack | null {
  try {
    return JSON.parse(value) as ExperiencePack;
  } catch {
    return null;
  }
}

function saveText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function strictSceneMode(asset: ExperienceSceneAsset | null): SceneViewerProjection['mode'] {
  if (!asset || asset.availabilityStatus === 'missing') return 'source-missing';
  if (asset.mediaKind === 'gltf-scene') return 'model-3d';
  if (['equirectangular-panorama', 'cubemap-panorama', 'actual-360-capture'].includes(asset.mediaKind)) return 'panorama-360';
  return 'design-preview';
}

function sceneFieldsForStep(
  step: ExperiencePack['journeySteps'][number] | null | undefined,
  assets: readonly ExperienceSceneAsset[]
) {
  const asset = step?.sceneAssetIds
    .map((assetId) => assets.find((candidate) => candidate.assetId === assetId) ?? null)
    .find((candidate) => candidate?.mediaKind === 'flat-render' && candidate.availabilityStatus !== 'missing')
    ?? step?.sceneAssetIds.map((assetId) => assets.find((candidate) => candidate.assetId === assetId) ?? null).find(Boolean)
    ?? null;
  return {
    selectedTouchpointId: step?.touchpointId ?? null,
    selectedSceneAssetId: asset?.assetId ?? null,
    selectedSceneHotspotId: null,
    sceneViewerMode: strictSceneMode(asset),
    sceneComparisonPairId: null
  };
}

function createResolvedExperienceSelection(
  configuration: ExperienceTwinConfiguration,
  pack: ExperiencePack,
  location: URL
): ExperienceSelectionContext {
  const selection = createExperienceSelection(
    pack,
    location,
    configuration.storyMapDefinition,
    configuration.sceneRegistry,
    configuration.designExperience,
    configuration.operationalJourneyPackage
  );
  const routeState = resolveMissionCanvasRouteState(location);
  if (!routeState.enabled && !selection.goldenJourneyScreen) return selection;
  return resolveCanonicalMissionSelection({
    pack,
    storyMap: configuration.storyMapDefinition,
    designExperience: configuration.designExperience,
    operationalJourneys: configuration.operationalJourneyPackage,
    selection,
    routeState,
    transition: { type: 'RESTORE_FROM_URL' }
  }).selection;
}

export function ExperienceTwinWorkspace({ configuration, onDirtyChange, onOpenRehearsal, onExit }: { configuration: ExperienceTwinConfiguration; onDirtyChange: (dirty: boolean) => void; onOpenRehearsal?: () => void; onExit?: () => void }) {
  const [activePack, setActivePack] = useState<ExperiencePack>(() => structuredClone(configuration.pack));
  const [sceneValidationContext] = useState(() => createSceneValidationContext(configuration.pack, configuration.sceneRegistry));
  const [sceneGateway] = useState(() => createExperienceSceneGateway(configuration.sceneRegistry, sceneValidationContext));
  const [selection, setSelection] = useState<ExperienceSelectionContext>(() => createResolvedExperienceSelection(configuration, configuration.pack, new URL(window.location.href)));
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [commandRevealOpen, setCommandRevealOpen] = useState(() => new URL(window.location.href).searchParams.get('experienceMode') === 'command');
  const [commandRevealDepth, setCommandRevealDepth] = useState(1);
  const [technicalOpen, setTechnicalOpen] = useState(() => new URL(window.location.href).searchParams.get('drawer') === 'truth');
  const [authoringOpen, setAuthoringOpen] = useState(false);
  const [failedAssets, setFailedAssets] = useState<Set<string>>(() => new Set());
  const [assetAvailability, setAssetAvailability] = useState<Record<string, 'checking' | 'available' | 'missing'>>({});
  const requestedAssetIds = useRef(new Set<string>());
  const [draftJson, setDraftJson] = useState(() => JSON.stringify(configuration.pack, null, 2));
  const [changeReason, setChangeReason] = useState('');
  const [authoringMessage, setAuthoringMessage] = useState('لم تُنشأ مراجعة محلية.');
  const [diffCount, setDiffCount] = useState(0);
  const [routeContextExpanded, setRouteContextExpanded] = useState(() => new URL(window.location.href).searchParams.has('routeJourney'));
  const [missionRouteState, setMissionRouteState] = useState(() => resolveMissionCanvasRouteState(new URL(window.location.href)));
  const canonicalMissionSelection = resolveCanonicalMissionSelection({
    pack: activePack,
    storyMap: configuration.storyMapDefinition,
    designExperience: configuration.designExperience,
    operationalJourneys: configuration.operationalJourneyPackage,
    selection,
    routeState: missionRouteState,
    transition: { type: 'RESTORE_FROM_URL' }
  });

  const currentScenario = activePack.scenarios.find((item) => item.scenarioId === selection.scenarioId) ?? null;
  const currentDay = activePack.eventDays.find((item) => item.eventDayId === selection.eventDayId) ?? null;
  const currentJourney = activePack.journeys.find((item) => item.journeyId === selection.journeyId) ?? null;
  const currentStep = activePack.journeySteps.find((item) => item.journeyStepId === selection.journeyStepId) ?? null;
  const currentPersona = activePack.personas.find((item) => item.personaId === selection.personaId) ?? null;
  const routeDesignProjection = deriveRouteDesignConvergence(selection, configuration.operationalJourneyPackage, configuration.designExperience);
  const integratedProjection = findFourDayExperienceTruthProjection(activePack.projectId, activePack.eventId, activePack.venueId);
  const currentIntegratedDay = integratedProjection?.days.find((day) => day.dayId === currentDay?.eventDayId) ?? null;
  const currentSites = currentDay?.siteCandidateIds.map((id) => activePack.siteCandidates.find((site) => site.siteCandidateId === id)).filter((site): site is NonNullable<typeof site> => Boolean(site)) ?? [];
  const currentProjection = projectExperienceTruth(activePack, {
    readinessDisposition: configuration.readinessDisposition,
    readinessExplanationAr: configuration.readinessExplanationAr,
    knownDecisionIds: [],
    knownEvidenceIds: [],
    sourceStatusAr: configuration.sourceStatusAr
  }).find((projection) => projection.journeyStepId === currentStep?.journeyStepId) ?? null;
  const missionRehearsalPlan = findDigitalRehearsalPlan(activePack.projectId, activePack.eventId);
  const missionTruthContext = deriveMissionTruthContext(activePack, selection, routeDesignProjection, configuration.sourceStatusAr);
  const missionContextResolution = resolveMissionContext({
    pack: activePack,
    selection,
    location: new URL(window.location.href),
    momentId: resolveMissionMomentId(missionRehearsalPlan, selection),
    sceneId: routeDesignProjection.designScene?.sceneId ?? null,
    decisionId: currentProjection?.relatedDecisionIds[0] ?? null,
    truthContext: missionTruthContext,
    canonical: canonicalMissionSelection
  });
  const currentStoryProjection = projectStoryMap(configuration.storyMapDefinition, activePack, selection, selection.visibleStoryMapLayerIds, selection.storyMapComparison);
  const currentStoryLandmark = configuration.storyMapDefinition.landmarks.find((landmark) => landmark.landmarkId === selection.selectedLandmarkId)
    ?? currentStoryProjection?.currentLandmark
    ?? null;
  const scopedSceneAssets = activePack.sceneAssets.filter((asset) => asset.scenarioIds.includes(selection.scenarioId));
  const renderScene = selectSceneAssetForMode(scopedSceneAssets, 'illustrated', currentStep?.journeyStepId ?? null);
  const selectedSceneAsset = configuration.sceneRegistry.assets.find((asset) => asset.assetId === selection.selectedSceneAssetId) ?? null;
  const selectedDesignScene = configuration.designExperience?.scenes.find((scene) => scene.assetId === selectedSceneAsset?.assetId) ?? null;
  const mapScene = scopedSceneAssets.find((asset) => asset.medium === 'illustrated-map') ?? null;
  const mapAssetStatus = mapScene?.localPreviewUri ? assetAvailability[mapScene.assetId] ?? 'checking' : 'missing';
  const markers = declutterExperienceMarkers(configuration.mapMarkers);
  const selectedMarker = configuration.mapMarkers.find((marker) => marker.entityId === selection.selectedEntityId) ?? null;
  const daySteps = currentJourney?.journeyStepIds.map((id) => activePack.journeySteps.find((step) => step.journeyStepId === id)).filter((step): step is NonNullable<typeof step> => Boolean(step)) ?? [];
  const currentStepIndex = daySteps.findIndex((step) => step.journeyStepId === currentStep?.journeyStepId);
  const nextJourneyStep = currentStepIndex >= 0 ? daySteps[currentStepIndex + 1] ?? null : daySteps[0] ?? null;
  const selectedAreas = currentStep?.experienceAreaCandidateIds.map((id) => activePack.experienceAreas.find((area) => area.experienceAreaCandidateId === id)).filter((area): area is NonNullable<typeof area> => Boolean(area)) ?? [];
  const selectedTrace = currentStep?.sourceTraceIds.map((id) => activePack.sourceTraces.find((trace) => trace.traceId === id)).find(Boolean) ?? null;
  const activeContext = {
    eventWindowAr: configuration.eventWindowAr,
    dayCountLabelAr: configuration.dayCountLabelAr,
    dayLabelAr: currentDay?.labelAr ?? 'اليوم غير محدد',
    personaLabelAr: currentPersona?.labelAr ?? 'الشخصية غير محددة',
    momentLabelAr: currentStep?.labelAr ?? 'اللحظة غير محددة',
    destinationLabelAr: selectedMarker?.labelAr ?? currentStoryLandmark?.labelAr ?? (currentStep?.relatedEntityIds.length ? 'موضع دلالي غير محسوم' : 'الوجهة غير محددة'),
    truthStatusAr: truthLabelAr[currentStep?.truthClass ?? 'illustrative-only'] ?? 'حقيقة غير محددة',
    sceneStatusAr: selection.mapMode === 'panorama'
      ? 'مشهد 360° مفقود'
      : selection.mapMode === 'web3d'
        ? selectedDesignScene
          ? 'مشتق Web3D تشخيصي مرشح متاح'
          : 'نموذج 3D إنتاجي مفقود'
        : selectedSceneAsset?.mediaKind === 'flat-render'
          ? 'معاينة مرجعية مسطحة'
          : selectedSceneAsset
            ? sceneTruthLabel(renderScene)
            : 'المشهد غير متاح',
    readinessStatusAr: currentProjection?.readinessDisposition === 'cannot-determine' ? 'لا يمكن تحديدها' : 'غير منطبقة على المرجع'
  };
  const missionGraphProjection = missionContextResolution.context ? deriveMissionGraphProjection({
    context: missionContextResolution.context,
    pack: activePack,
    selection,
    projectLabelAr: configuration.projectLabelAr,
    eventLabelAr: configuration.eventWindowAr,
    readinessDisposition: configuration.readinessDisposition,
    readinessExplanationAr: configuration.readinessExplanationAr,
    sourceStatusAr: configuration.sourceStatusAr,
    markers,
    routeProjection: routeDesignProjection,
    operationalProjection: currentProjection,
    designExperience: configuration.designExperience,
    rehearsalPlan: missionRehearsalPlan
  }) : null;
  const validationOptions: ExperiencePackValidationOptions = {
    allowedZoneIds: [...new Set(configuration.pack.journeySteps.flatMap((step) => step.relatedZoneIds))],
    allowedEntityIds: [...new Set(configuration.pack.journeySteps.flatMap((step) => step.relatedEntityIds))],
    forbiddenAnchoredZoneIds: configuration.pack.journeySteps.filter((step) => step.spatialStatus === 'unresolved-no-anchor').flatMap((step) => step.relatedZoneIds)
  };

  const activeReviewMode = experienceReviewModes.find((mode) => mode.id === selection.reviewMode) ?? experienceReviewModes[0]!;
  const ActiveReviewModeIcon = activeReviewMode.icon;
  const commandRevealLayers = [
    { labelAr: 'ما يراه الزائر', valueAr: currentStep?.experienceIntent.whatGuestSees ?? 'غير محدد في المصدر', noteAr: currentStep?.experienceIntent.whatGuestHears ?? 'المحتوى السمعي غير محدد' },
    { labelAr: 'ما يجب أن تجهزه العمليات', valueAr: currentStep?.experienceIntent.contentCue ?? currentStep?.experienceIntent.servicePromise ?? 'متطلبات التجهيز غير مكتملة', noteAr: currentStep?.experienceIntent.accessibilityConsiderations ?? 'متطلبات الإتاحة غير محددة' },
    { labelAr: 'مالك الاعتماد', valueAr: currentStep?.experienceIntent.operationalOwner ?? 'المالك التشغيلي غير معروف', noteAr: currentStep?.experienceIntent.protocolConsiderations ?? 'سلطة التنفيذ لم تُثبت' },
    { labelAr: 'الدليل المفقود', valueAr: currentProjection?.evidenceStateAr ?? 'لا يوجد دليل قانوني مرتبط', noteAr: 'وجود مرجع بصري لا يثبت التنفيذ أو التحقق' },
    { labelAr: 'القرار المطلوب', valueAr: currentProjection?.decisionStateAr ?? 'لا يوجد قرار قانوني مرتبط', noteAr: currentStoryLandmark?.nextRequiredInputAr ?? 'يلزم مصدر أو سلطة صريحة قبل الحسم' },
    { labelAr: 'الأثر المتوقع', valueAr: currentStep?.outcomeIntentAr ?? currentStep?.experienceIntent.successSignal ?? 'الأثر التشغيلي غير قابل للقياس حاليًا', noteAr: 'أثر مقصود أو مرشح، وليس نتيجة تشغيلية مثبتة' }
  ];

  const resolveSelectionTransition = (
    next: ExperienceSelectionContext,
    routeState: MissionCanvasRouteState,
    transition: MissionSelectionTransition
  ) => resolveCanonicalMissionSelection({
    pack: activePack,
    storyMap: configuration.storyMapDefinition,
    designExperience: configuration.designExperience,
    operationalJourneys: configuration.operationalJourneyPackage,
    selection: next,
    routeState,
    transition
  });
  const commitSelection = (next: ExperienceSelectionContext, historyMode: 'push' | 'replace' = 'push') => {
    const normalized = missionRouteState.enabled || next.goldenJourneyScreen
      ? resolveSelectionTransition(next, missionRouteState, { type: 'RESTORE_FROM_URL' }).selection
      : normalizeOperationalJourneySelection(next, configuration.operationalJourneyPackage);
    setSelection(normalized);
    const nextUrl = writeExperienceSelectionToUrl(new URL(window.location.href), normalized);
    if (historyMode === 'push') window.history.pushState({}, '', nextUrl);
    else window.history.replaceState({}, '', nextUrl);
  };
  const commitCanonicalTransition = (
    transition: MissionSelectionTransition,
    routePatch: Partial<Pick<MissionContext, 'missionMode' | 'missionLens'>> & Partial<MissionCanvasRouteState> = {},
    historyMode: 'push' | 'replace' = 'push'
  ) => {
    const requestedRouteState: MissionCanvasRouteState = { ...missionRouteState, ...routePatch };
    const resolved = resolveSelectionTransition(selection, requestedRouteState, transition);
    let nextUrl = writeExperienceSelectionToUrl(new URL(window.location.href), resolved.selection);
    if (missionRouteState.enabled) {
      nextUrl = writeMissionContextToUrl(nextUrl, {
        ...routePatch,
        view: resolved.routeState.view,
        presentation: resolved.routeState.presentation,
        worldSurface: resolved.routeState.worldSurface,
        truthOpen: resolved.routeState.truthOpen
      });
    }
    setSelection(resolved.selection);
    setMissionRouteState(resolved.routeState);
    if (historyMode === 'push') window.history.pushState({}, '', nextUrl);
    else window.history.replaceState({}, '', nextUrl);
  };
  const commitMissionRoute = (
    patch: Partial<Pick<MissionContext, 'missionMode' | 'missionLens'>> & Partial<MissionCanvasRouteState>,
    historyMode: 'push' | 'replace' = 'push'
  ) => {
    const nextUrl = writeMissionContextToUrl(new URL(window.location.href), patch);
    if (historyMode === 'push') window.history.pushState({}, '', nextUrl);
    else window.history.replaceState({}, '', nextUrl);
    setMissionRouteState(resolveMissionCanvasRouteState(nextUrl));
  };
  const commitSelectionInEffect = useEffectEvent(commitSelection);

  useEffect(() => {
    const restore = () => {
      const location = new URL(window.location.href);
      setSelection(createResolvedExperienceSelection(configuration, activePack, location));
      setMissionRouteState(resolveMissionCanvasRouteState(location));
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [activePack, configuration]);

  useEffect(() => {
    if (!workspaceMenuOpen && !commandRevealOpen) return;
    const closeTransientLayers = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (workspaceMenuOpen) setWorkspaceMenuOpen(false);
      else if (commandRevealOpen) setCommandRevealOpen(false);
    };
    window.addEventListener('keydown', closeTransientLayers);
    return () => window.removeEventListener('keydown', closeTransientLayers);
  }, [commandRevealOpen, workspaceMenuOpen]);

  useEffect(() => {
    const current = new URL(window.location.href);
    const sanitized = writeExperienceSelectionToUrl(current, selection);
    if (sanitized.href !== current.href) window.history.replaceState({}, '', sanitized);
  }, [selection]);

  useEffect(() => {
    const requested = [mapScene, renderScene].filter((asset): asset is NonNullable<typeof asset> => Boolean(asset?.localPreviewUri));
    const pending = requested.filter((asset) => !requestedAssetIds.current.has(asset.assetId));
    if (!pending.length) return;
    const controller = new AbortController();
    pending.forEach((asset) => {
      requestedAssetIds.current.add(asset.assetId);
      void fetch(asset.localPreviewUri!, { method: 'HEAD', signal: controller.signal })
        .then((response) => setAssetAvailability((current) => ({ ...current, [asset.assetId]: response.ok ? 'available' : 'missing' })))
        .catch(() => {
          if (controller.signal.aborted) requestedAssetIds.current.delete(asset.assetId);
          else setAssetAvailability((current) => ({ ...current, [asset.assetId]: 'missing' }));
        });
    });
    return () => controller.abort();
  }, [mapScene, renderScene]);

  useEffect(() => {
    if (selection.rehearsalState.status !== 'playing') return;
    const timeout = window.setTimeout(() => {
      const storyRoute = selection.mapMode === 'story'
        ? resolveStoryMapRoute(configuration.storyMapDefinition, selection.eventDayId, selection.personaId, selection.journeyId)
        : null;
      const currentStoryStop = storyRoute
        ? resolveStoryMapStop(configuration.storyMapDefinition, storyRoute, selection.journeyStepId, selection.selectedLandmarkId)
        : null;
      const nextStoryStop = storyRoute
        ? stepStoryMapStop(configuration.storyMapDefinition, storyRoute, selection.journeyStepId, selection.selectedLandmarkId, 'next')
        : null;
      const movedToStoryStop = Boolean(nextStoryStop && currentStoryStop && nextStoryStop.stopId !== currentStoryStop.stopId);
      const nextState = storyRoute && nextStoryStop
        ? {
            ...selection.rehearsalState,
            currentJourneyStepId: nextStoryStop.journeyStepId,
            status: movedToStoryStop && nextStoryStop.stopId !== storyRoute.stopIds.at(-1) ? 'playing' as const : 'completed' as const
          }
        : reduceDigitalRehearsal(activePack, selection.rehearsalState, { type: 'next' });
      const nextStep = activePack.journeySteps.find((step) => step.journeyStepId === nextState.currentJourneyStepId);
      const nextLandmarkId = nextStoryStop?.landmarkId ?? null;
      const nextLandmark = configuration.storyMapDefinition.landmarks.find((landmark) => landmark.landmarkId === nextLandmarkId) ?? null;
      const nextViewport = selection.mapMode === 'story' && nextLandmark?.normalizedPosition
        ? focusStoryMapLandmark(configuration.storyMapDefinition, nextLandmark.landmarkId, selection.viewMode === 'presentation')
        : selection.storyMapViewport;
      commitSelectionInEffect({ ...selection, journeyStepId: nextState.currentJourneyStepId, selectedEntityId: nextStep?.relatedEntityIds[0] ?? null, selectedZoneId: nextStep?.relatedZoneIds[0] ?? null, selectedExperienceAreaId: nextStep?.experienceAreaCandidateIds[0] ?? null, ...sceneFieldsForStep(nextStep, configuration.sceneRegistry.assets), selectedLandmarkId: selection.mapMode === 'story' ? nextLandmark?.landmarkId ?? null : null, storyMapViewport: nextViewport, rehearsalState: nextState }, 'replace');
    }, 2200);
    return () => window.clearTimeout(timeout);
  }, [activePack, configuration.sceneRegistry.assets, configuration.storyMapDefinition, selection]);

  const runRehearsal = (action: DigitalRehearsalAction) => {
    const currentStoryRoute = selection.mapMode === 'story'
      ? resolveStoryMapRoute(configuration.storyMapDefinition, selection.eventDayId, selection.personaId, selection.journeyId)
      : null;
    if (currentStoryRoute && (action.type === 'next' || action.type === 'previous' || action.type === 'reset')) {
      const targetStop = stepStoryMapStop(
        configuration.storyMapDefinition,
        currentStoryRoute,
        selection.journeyStepId,
        selection.selectedLandmarkId,
        action.type === 'reset' ? 'first' : action.type
      );
      if (!targetStop) return;
      const nextState = {
        ...selection.rehearsalState,
        currentJourneyStepId: targetStop.journeyStepId,
        status: action.type === 'reset'
          ? 'idle' as const
          : action.type === 'next' && targetStop.stopId === currentStoryRoute.stopIds.at(-1)
            ? 'completed' as const
            : 'paused' as const
      };
      const step = activePack.journeySteps.find((item) => item.journeyStepId === targetStop.journeyStepId);
      const landmark = configuration.storyMapDefinition.landmarks.find((item) => item.landmarkId === targetStop.landmarkId) ?? null;
      const storyMapViewport = landmark?.normalizedPosition
        ? focusStoryMapLandmark(configuration.storyMapDefinition, landmark.landmarkId, selection.viewMode === 'presentation')
        : selection.storyMapViewport;
      commitSelection({ ...selection, journeyStepId: targetStop.journeyStepId, selectedEntityId: step?.relatedEntityIds[0] ?? null, selectedZoneId: step?.relatedZoneIds[0] ?? null, selectedExperienceAreaId: step?.experienceAreaCandidateIds[0] ?? null, ...sceneFieldsForStep(step, configuration.sceneRegistry.assets), selectedLandmarkId: targetStop.landmarkId, storyMapViewport, rehearsalState: nextState });
      return;
    }
    const nextState = reduceDigitalRehearsal(activePack, selection.rehearsalState, action);
    const step = activePack.journeySteps.find((item) => item.journeyStepId === nextState.currentJourneyStepId);
    const nextStoryRoute = selection.mapMode === 'story'
      ? resolveStoryMapRoute(configuration.storyMapDefinition, nextState.eventDayId, nextState.personaId, nextState.journeyId)
      : null;
    const nextStoryStop = nextStoryRoute
      ? action.type === 'select-journey'
        ? stepStoryMapStop(configuration.storyMapDefinition, nextStoryRoute, nextState.currentJourneyStepId, null, 'first')
        : resolveStoryMapStop(configuration.storyMapDefinition, nextStoryRoute, nextState.currentJourneyStepId, selection.selectedLandmarkId)
      : null;
    const nextLandmark = configuration.storyMapDefinition.landmarks.find((landmark) => landmark.landmarkId === nextStoryStop?.landmarkId) ?? null;
    const nextViewport = selection.mapMode === 'story' && nextLandmark?.normalizedPosition
      ? focusStoryMapLandmark(configuration.storyMapDefinition, nextLandmark.landmarkId, selection.viewMode === 'presentation')
      : selection.storyMapViewport;
    commitSelection({ ...selection, eventDayId: nextState.eventDayId, personaId: nextState.personaId, journeyId: nextState.journeyId, journeyStepId: nextState.currentJourneyStepId, selectedEntityId: step?.relatedEntityIds[0] ?? null, selectedZoneId: step?.relatedZoneIds[0] ?? null, selectedExperienceAreaId: step?.experienceAreaCandidateIds[0] ?? null, ...sceneFieldsForStep(step, configuration.sceneRegistry.assets), selectedLandmarkId: selection.mapMode === 'story' ? nextStoryStop?.landmarkId ?? null : null, storyMapViewport: nextViewport, rehearsalState: nextState });
  };

  const selectScenario = (scenarioId: string) => {
    const scenario = activePack.scenarios.find((item) => item.scenarioId === scenarioId);
    const day = activePack.eventDays.find((item) => item.scenarioId === scenarioId);
    const journey = day ? activePack.journeys.find((item) => item.eventDayId === day.eventDayId && item.personaId === day.primaryPersonaId) : null;
    const stepId = journey?.journeyStepIds[0] ?? null;
    const rehearsalState = { ...selection.rehearsalState, status: 'idle' as const, eventDayId: day?.eventDayId ?? null, personaId: day?.primaryPersonaId ?? null, journeyId: journey?.journeyId ?? null, currentJourneyStepId: stepId, sequenceRevision: selection.rehearsalState.sequenceRevision + 1 };
    const step = activePack.journeySteps.find((item) => item.journeyStepId === stepId) ?? null;
    commitSelection({ ...selection, scenarioId: scenario?.scenarioId ?? activePack.defaultSelection.scenarioId, eventDayId: day?.eventDayId ?? null, personaId: day?.primaryPersonaId ?? null, journeyId: journey?.journeyId ?? null, journeyStepId: stepId, selectedEntityId: null, selectedZoneId: null, selectedExperienceAreaId: null, ...sceneFieldsForStep(step, configuration.sceneRegistry.assets), selectedLandmarkId: null, rehearsalState });
  };

  const selectDay = (eventDayId: string) => {
    if (missionRouteState.enabled || selection.goldenJourneyScreen) {
      commitCanonicalTransition({ type: 'SELECT_DAY', dayId: eventDayId });
      return;
    }
    const day = activePack.eventDays.find((item) => item.eventDayId === eventDayId && item.scenarioId === selection.scenarioId);
    if (!day) return;
    const journey = activePack.journeys.find((item) => item.eventDayId === day.eventDayId && item.personaId === day.primaryPersonaId);
    if (!journey) return;
    runRehearsal({ type: 'select-journey', eventDayId: day.eventDayId, personaId: day.primaryPersonaId, journeyId: journey.journeyId });
  };

  const selectPersona = (personaId: string) => {
    if (missionRouteState.enabled || selection.goldenJourneyScreen) {
      commitCanonicalTransition({ type: 'SELECT_PERSONA', personaId });
      return;
    }
    const journey = activePack.journeys.find((item) => item.scenarioId === selection.scenarioId && item.personaId === personaId && item.eventDayId === selection.eventDayId);
    if (!journey) return;
    runRehearsal({ type: 'select-journey', eventDayId: journey.eventDayId, personaId, journeyId: journey.journeyId });
  };

  const selectStep = (journeyStepId: string, landmarkId: string | null = null) => {
    const step = activePack.journeySteps.find((item) => item.journeyStepId === journeyStepId);
    if (!step || !currentJourney?.journeyStepIds.includes(journeyStepId)) return;
    const nextState = reduceDigitalRehearsal(activePack, selection.rehearsalState, { type: 'select-step', journeyStepId });
    const storyMapViewport = selection.mapMode === 'story' && landmarkId
      ? focusStoryMapLandmark(configuration.storyMapDefinition, landmarkId)
      : selection.storyMapViewport;
    commitSelection({ ...selection, journeyStepId, selectedEntityId: step.relatedEntityIds[0] ?? null, selectedZoneId: step.relatedZoneIds[0] ?? null, selectedExperienceAreaId: step.experienceAreaCandidateIds[0] ?? null, ...sceneFieldsForStep(step, configuration.sceneRegistry.assets), selectedLandmarkId: landmarkId, storyMapViewport, rehearsalState: nextState });
  };

  const selectMarker = (entityId: string) => {
    setInspectorOpen(true);
    const matchingStep = daySteps.find((step) => step.relatedEntityIds.includes(entityId));
    if (matchingStep) {
      commitSelection({ ...selection, journeyStepId: matchingStep.journeyStepId, selectedEntityId: entityId, selectedZoneId: matchingStep.relatedZoneIds[0] ?? null, selectedExperienceAreaId: matchingStep.experienceAreaCandidateIds[0] ?? null, ...sceneFieldsForStep(matchingStep, configuration.sceneRegistry.assets), selectedLandmarkId: null, rehearsalState: reduceDigitalRehearsal(activePack, selection.rehearsalState, { type: 'select-step', journeyStepId: matchingStep.journeyStepId }) });
      return;
    }
    commitSelection({ ...selection, selectedEntityId: entityId, rehearsalState: { ...selection.rehearsalState, status: 'paused' } });
  };

  const setMapMode = (mapMode: ExperienceMapMode) => {
    if (mapMode === 'panorama' || mapMode === 'web3d') {
      const asset = sceneGateway.resolveScene({
        projectId: activePack.projectId,
        eventId: activePack.eventId,
        venueId: activePack.venueId,
        scenarioId: selection.scenarioId,
        eventDayId: selection.eventDayId,
        personaId: selection.personaId,
        journeyId: selection.journeyId,
        journeyStepId: selection.journeyStepId,
        touchpointId: selection.selectedTouchpointId,
        preferredMediaKinds: mapMode === 'panorama' ? ['actual-360-capture', 'equirectangular-panorama', 'cubemap-panorama'] : ['gltf-scene']
      });
      commitSelection({ ...selection, mapMode, viewMode: 'scene-focus', selectedLandmarkId: null, selectedSceneAssetId: asset?.assetId ?? null, selectedSceneHotspotId: null, sceneViewerMode: strictSceneMode(asset), sceneComparisonPairId: null });
      return;
    }
    commitSelection({ ...selection, mapMode, selectedLandmarkId: mapMode === 'story' ? selection.selectedLandmarkId : null });
  };
  const openDesignScene = () => {
    const designScene = configuration.designExperience?.scenes.find((scene) => scene.eventDayIds.includes(selection.eventDayId ?? ''))
      ?? configuration.designExperience?.scenes[0]
      ?? null;
    const asset = designScene ? configuration.sceneRegistry.assets.find((item) => item.assetId === designScene.assetId) ?? null : null;
    if (!designScene || !asset) return;
    const entityRelation = configuration.designExperience?.relations.find((relation) => relation.sceneId === designScene.sceneId && relation.targetType === 'candidate-entity') ?? null;
    const zoneRelation = configuration.designExperience?.relations.find((relation) => relation.sceneId === designScene.sceneId && relation.targetType === 'experience-object') ?? null;
    commitSelection({
      ...selection,
      reviewMode: 'scenes',
      mapMode: 'web3d',
      viewMode: 'scene-focus',
      selectedEntityId: entityRelation?.targetId ?? selection.selectedEntityId,
      selectedZoneId: zoneRelation?.targetId ?? selection.selectedZoneId,
      selectedSceneAssetId: asset.assetId,
      selectedSceneHotspotId: null,
      sceneViewerMode: 'model-3d',
      sceneComparisonPairId: null,
      designSceneLens: designScene.defaultLens,
      designSceneViewpointId: designScene.viewpointIds[0] ?? null,
      designSceneQualityProfile: designScene.defaultQualityProfile,
      designCameraTourPlaying: false,
      designPresentationMode: false
    });
  };
  const selectOperationalJourney = (journeyId: string) => {
    if (missionRouteState.enabled || selection.goldenJourneyScreen) {
      commitCanonicalTransition({ type: 'SELECT_ROUTE_JOURNEY', journeyId });
      return;
    }
    const journey = routeDesignProjection.availableJourneys.find((item) => item.journeyId === journeyId);
    if (!journey) return;
    const waypoint = journey.waypoints[0] ?? null;
    commitSelection({
      ...selection,
      operationalJourneyCandidateId: journey.journeyId,
      operationalJourneyWaypointId: waypoint?.waypointId ?? null,
      selectedEntityId: waypoint?.destinationIds[0] ?? null,
      selectedTouchpointId: waypoint?.touchpointIds[0] ?? null,
      selectedSceneAssetId: null,
      selectedSceneHotspotId: null,
      mapMode: 'story',
      viewMode: 'map-focus',
      designPresentationMode: false,
      designCameraTourPlaying: false
    });
  };
  const selectOperationalWaypoint = (waypointId: string) => {
    if (missionRouteState.enabled || selection.goldenJourneyScreen) {
      const waypointSurface =
        missionRouteState.worldSurface === 'truth-map' ? 'truth-map' : 'living-map';

      commitCanonicalTransition(
        { type: 'SELECT_ROUTE_WAYPOINT', waypointId },
        { worldSurface: waypointSurface, view: 'world' }
      );
      return;
    }
    const waypoint = routeDesignProjection.journey?.waypoints.find((item) => item.waypointId === waypointId);
    if (!waypoint) return;
    const selectedEntityId = waypoint.destinationIds[0] ?? null;
    const matchingStep = selectedEntityId
      ? daySteps.find((step) => step.relatedEntityIds.includes(selectedEntityId)) ?? null
      : null;
    const rehearsalState = matchingStep
      ? reduceDigitalRehearsal(activePack, selection.rehearsalState, { type: 'select-step', journeyStepId: matchingStep.journeyStepId })
      : { ...selection.rehearsalState, status: 'paused' as const, currentJourneyStepId: null };
    commitSelection({
      ...selection,
      operationalJourneyWaypointId: waypoint.waypointId,
      journeyStepId: matchingStep?.journeyStepId ?? null,
      selectedEntityId,
      selectedZoneId: matchingStep?.relatedZoneIds[0] ?? null,
      selectedExperienceAreaId: matchingStep?.experienceAreaCandidateIds[0] ?? null,
      ...sceneFieldsForStep(matchingStep, configuration.sceneRegistry.assets),
      selectedTouchpointId: waypoint.touchpointIds[0] ?? null,
      selectedSceneHotspotId: null,
      mapMode: 'story',
      viewMode: 'map-focus',
      designPresentationMode: false,
      designCameraTourPlaying: false,
      rehearsalState
    });
  };
  const openRouteDesignScene = () => {
    const designScene = routeDesignProjection.designScene;
    const relation = routeDesignProjection.designRelation;
    const waypoint = routeDesignProjection.waypoint;
    const asset = designScene ? configuration.sceneRegistry.assets.find((item) => item.assetId === designScene.assetId) ?? null : null;
    if (!designScene || !asset || !relation || !routeDesignProjection.mayOpenDesignScene) return;
    commitSelection({
      ...selection,
      reviewMode: 'scenes',
      mapMode: 'web3d',
      viewMode: 'scene-focus',
      selectedEntityId: waypoint?.destinationIds[0] ?? selection.selectedEntityId,
      selectedTouchpointId: waypoint?.touchpointIds[0] ?? selection.selectedTouchpointId,
      selectedSceneAssetId: asset.assetId,
      selectedSceneHotspotId: null,
      sceneViewerMode: 'model-3d',
      sceneComparisonPairId: null,
      designSceneLens: designScene.defaultLens,
      designSceneViewpointId: designScene.viewpointIds[0] ?? null,
      designSceneQualityProfile: designScene.defaultQualityProfile,
      designCameraTourPlaying: false,
      designPresentationMode: false
    });
  };
  const setGoldenJourneyScreen = (goldenJourneyScreen: NonNullable<ExperienceSelectionContext['goldenJourneyScreen']>) => {
    if (goldenJourneyScreen === 'entry') commitCanonicalTransition({ type: 'RESET_TO_ENTRY' });
    else if (goldenJourneyScreen === 'map') commitCanonicalTransition(selection.goldenJourneyScreen === 'scene' ? { type: 'SCENE_TO_MAP' } : { type: 'ENTRY_TO_MAP' });
    else commitCanonicalTransition({ type: 'MAP_TO_SCENE' });
  };
  const openGoldenRouteDesignScene = () => {
    if (!routeDesignProjection.mayOpenDesignScene) return;
    commitCanonicalTransition({ type: 'MAP_TO_SCENE' });
  };
  const openMissionDesignScene = () => {
    if (!routeDesignProjection.mayOpenDesignScene) return;
    commitCanonicalTransition(
      { type: 'MAP_TO_SCENE' },
      { missionLens: 'spatial', view: 'world', worldSurface: 'web3d', presentation: missionRouteState.presentation }
    );
  };
  const changeMissionContext = (patch: Partial<Pick<MissionContext, 'missionMode' | 'missionLens'>> & Partial<MissionCanvasRouteState>) => {
    if (missionRouteState.view === 'entry' && patch.view === 'world') {
      commitCanonicalTransition({ type: 'ENTRY_TO_MAP' }, patch);
      return;
    }
    commitMissionRoute(patch);
  };
  const returnMissionToWorldMap = () => {
    commitCanonicalTransition(
      { type: 'SCENE_TO_MAP' },
      { missionLens: 'experience', view: 'world', worldSurface: 'living-map', presentation: 'client' }
    );
  };
  const setViewMode = (viewMode: ExperienceViewMode) => commitSelection({ ...selection, viewMode });
  const setLens = (lens: OperationalLensId) => commitSelection({ ...selection, lens, visibleStoryMapLayerIds: defaultVisibleStoryMapLayerIds(configuration.storyMapDefinition.layers, lens) });
  const setReviewMode = (reviewMode: ExperienceReviewMode) => {
    setWorkspaceMenuOpen(false);
    setCommandRevealOpen(reviewMode === 'command');
    setCommandRevealDepth(1);
    if (reviewMode === 'journey' || reviewMode === 'story') {
      commitSelection({ ...selection, reviewMode, mapMode: 'story', viewMode: 'map-focus' });
      return;
    }
    if (reviewMode === 'scenes') {
      commitSelection({ ...selection, reviewMode, mapMode: 'illustrated', viewMode: 'scene-focus', sceneViewerMode: strictSceneMode(selectedSceneAsset) });
      return;
    }
    if (reviewMode === 'command') {
      commitSelection({ ...selection, reviewMode, mapMode: 'operational', viewMode: 'split', lens: 'readiness-and-decisions', visibleStoryMapLayerIds: defaultVisibleStoryMapLayerIds(configuration.storyMapDefinition.layers, 'readiness-and-decisions') });
      return;
    }
    if (reviewMode === 'sources') {
      commitSelection({ ...selection, reviewMode, viewMode: 'split', lens: 'source-truth', visibleStoryMapLayerIds: defaultVisibleStoryMapLayerIds(configuration.storyMapDefinition.layers, 'source-truth') });
      return;
    }
    commitSelection({ ...selection, reviewMode, viewMode: reviewMode === 'presentation' ? selection.viewMode : 'split' });
  };

  const applyPresentationStep = ({ presentationStep, dayId, entityId, mapMode }: { presentationStep: number; dayId: string | null; entityId: string | null; mapMode: ExperienceMapMode | null }) => {
    let next: ExperienceSelectionContext = { ...selection, reviewMode: 'presentation', presentationStep, presentationPaused: selection.reviewMode === 'presentation' ? selection.presentationPaused : true };
    const day = dayId ? activePack.eventDays.find((item) => item.eventDayId === dayId && item.scenarioId === selection.scenarioId) ?? null : currentDay;
    if (day && day.eventDayId !== selection.eventDayId) {
      const journey = activePack.journeys.find((item) => item.eventDayId === day.eventDayId && item.personaId === day.primaryPersonaId) ?? null;
      const step = journey ? activePack.journeySteps.find((item) => item.journeyStepId === journey.journeyStepIds[0]) ?? null : null;
      next = {
        ...next,
        eventDayId: day.eventDayId,
        personaId: journey?.personaId ?? null,
        journeyId: journey?.journeyId ?? null,
        journeyStepId: step?.journeyStepId ?? null,
        selectedEntityId: step?.relatedEntityIds[0] ?? null,
        selectedZoneId: step?.relatedZoneIds[0] ?? null,
        selectedExperienceAreaId: step?.experienceAreaCandidateIds[0] ?? null,
        ...sceneFieldsForStep(step, configuration.sceneRegistry.assets),
        selectedLandmarkId: null,
        rehearsalState: {
          ...selection.rehearsalState,
          status: 'paused',
          eventDayId: day.eventDayId,
          personaId: journey?.personaId ?? null,
          journeyId: journey?.journeyId ?? null,
          currentJourneyStepId: step?.journeyStepId ?? null,
          sequenceRevision: selection.rehearsalState.sequenceRevision + 1
        }
      };
    }
    if (entityId) {
      const journey = activePack.journeys.find((item) => item.journeyId === next.journeyId) ?? null;
      const matchingStep = journey?.journeyStepIds.map((id) => activePack.journeySteps.find((item) => item.journeyStepId === id)).find((step) => step?.relatedEntityIds.includes(entityId)) ?? null;
      next = matchingStep ? {
        ...next,
        journeyStepId: matchingStep.journeyStepId,
        selectedEntityId: entityId,
        selectedZoneId: matchingStep.relatedZoneIds[0] ?? null,
        selectedExperienceAreaId: matchingStep.experienceAreaCandidateIds[0] ?? null,
        ...sceneFieldsForStep(matchingStep, configuration.sceneRegistry.assets),
        rehearsalState: { ...next.rehearsalState, status: 'paused', currentJourneyStepId: matchingStep.journeyStepId }
      } : { ...next, selectedEntityId: entityId, rehearsalState: { ...next.rehearsalState, status: 'paused' } };
    }
    if (mapMode) next = { ...next, mapMode, selectedLandmarkId: mapMode === 'story' ? next.selectedLandmarkId : null };
    commitSelection(next, 'replace');
  };

  const startFromGate = () => {
    const day = currentDay ?? activePack.eventDays.find((item) => item.eventDayId === activePack.defaultSelection.eventDayId);
    const journey = currentJourney ?? activePack.journeys.find((item) => item.journeyId === activePack.defaultSelection.journeyId);
    if (!day || !journey) return;
    const state = reduceDigitalRehearsal(activePack, { ...selection.rehearsalState, status: 'idle', eventDayId: day.eventDayId, personaId: journey.personaId, journeyId: journey.journeyId, currentJourneyStepId: journey.journeyStepIds[0] ?? null }, { type: 'play' });
    const storyRoute = resolveStoryMapRoute(configuration.storyMapDefinition, day.eventDayId, journey.personaId, journey.journeyId);
    const firstStoryStop = storyRoute ? stepStoryMapStop(configuration.storyMapDefinition, storyRoute, state.currentJourneyStepId, null, 'first') : null;
    const first = activePack.journeySteps.find((step) => step.journeyStepId === (firstStoryStop?.journeyStepId ?? state.currentJourneyStepId));
    const firstLandmark = configuration.storyMapDefinition.landmarks.find((landmark) => landmark.landmarkId === firstStoryStop?.landmarkId) ?? null;
    const storyMapViewport = firstLandmark?.normalizedPosition
      ? focusStoryMapLandmark(configuration.storyMapDefinition, firstLandmark.landmarkId)
      : configuration.storyMapDefinition.defaultViewport;
    commitSelection({ ...selection, eventDayId: day.eventDayId, personaId: journey.personaId, journeyId: journey.journeyId, journeyStepId: firstStoryStop?.journeyStepId ?? state.currentJourneyStepId, selectedEntityId: first?.relatedEntityIds[0] ?? null, selectedZoneId: first?.relatedZoneIds[0] ?? null, selectedExperienceAreaId: first?.experienceAreaCandidateIds[0] ?? null, ...sceneFieldsForStep(first, configuration.sceneRegistry.assets), selectedLandmarkId: firstStoryStop?.landmarkId ?? null, mapMode: 'story', viewMode: 'map-focus', reviewMode: 'journey', storyMapViewport, rehearsalState: { ...state, currentJourneyStepId: firstStoryStop?.journeyStepId ?? state.currentJourneyStepId } });
  };

  const openPresentation = () => {
    const first = integratedProjection?.clientPresentationSteps[0];
    if (first) applyPresentationStep({ presentationStep: 1, dayId: first.dayId, entityId: first.entityId, mapMode: first.mapMode });
    else setReviewMode('presentation');
  };

  const validateDraft = () => {
    const parsed = safeParsePack(draftJson);
    if (!parsed) {
      setAuthoringMessage('JSON غير صالح. لم يُنشأ أي تغيير.');
      return;
    }
    const materialized = materializeExperiencePack(parsed);
    const result = validateExperiencePack(materialized, validationOptions);
    setAuthoringMessage(result.valid ? `التحقق ناجح · ${materialized.contentHash.slice(0, 12)}` : `التحقق محجوب · ${result.issues[0]?.messageAr ?? 'خطأ غير معروف'}`);
  };

  const previewDraft = () => {
    const parsed = safeParsePack(draftJson);
    if (!parsed) return setAuthoringMessage('JSON غير صالح.');
    const differences = previewExperiencePackDifference(activePack, parsed);
    setDiffCount(differences.length);
    setAuthoringMessage(`معاينة فقط · ${differences.length} تغييرًا · لم تتغير الحقيقة الأساسية.`);
  };

  const saveCandidateRevision = () => {
    const parsed = safeParsePack(draftJson);
    if (!parsed) return setAuthoringMessage('JSON غير صالح.');
    try {
      const revision = createExperiencePackCandidateRevision(activePack, parsed, changeReason, validationOptions);
      setActivePack(structuredClone(revision.pack));
      setDraftJson(JSON.stringify(revision.pack, null, 2));
      setChangeReason('');
      setDiffCount(revision.differences.length);
      setAuthoringMessage(`حُفظت مراجعة مرشحة محلية R${revision.revision} · لا تفعيل ولا اعتماد.`);
      onDirtyChange(true);
    } catch (error) {
      setAuthoringMessage(error instanceof Error ? error.message : 'تعذر إنشاء المراجعة المرشحة.');
    }
  };

  const resetDraft = () => {
    const reset = resetExperiencePackCandidate(configuration.pack);
    setActivePack(reset);
    setDraftJson(JSON.stringify(reset, null, 2));
    setDiffCount(0);
    setAuthoringMessage('أُعيدت النسخة المحلية إلى الحزمة المسجلة.');
    onDirtyChange(false);
  };

  if (missionRouteState.enabled) {
    if (!missionContextResolution.valid || !missionGraphProjection) {
      return <section data-testid="mission-context-error" className="flex min-h-0 flex-1 items-center justify-center bg-[#061d18] p-8 text-center text-[#f7f2e7]" lang="ar" dir="rtl"><div className="max-w-xl"><FileCheck2 className="mx-auto h-12 w-12 text-[#e9b85f]" /><h1 className="mt-4 text-2xl font-bold">تعذر فتح سياق المهمة</h1><p className="mt-2 text-sm text-white/60">{missionContextResolution.errorAr ?? 'السياق المطلوب غير صالح. لم يتم تحميل بديل تجريبي.'}</p>{onExit ? <button type="button" className="mt-5 rounded-lg bg-[#e9b85f] px-4 py-2 font-bold text-[#17382e]" onClick={onExit}>العودة إلى المشاريع</button> : null}</div></section>;
    }
    return (
      <Suspense fallback={<div className="flex min-h-0 flex-1 items-center justify-center bg-[#061d18] p-8 text-[#f7f2e7]"><LoadingState title="جاري تركيب العالم الحي" message="يتم تجميع الإسقاطات القانونية للعدسات الخمس دون نسخ الحقيقة." /></div>}>
        <MissionCanvas
          configuration={configuration}
          pack={activePack}
          selection={selection}
          projection={missionGraphProjection}
          routeProjection={routeDesignProjection}
          markers={markers}
          routeState={missionRouteState}
          errorAr={null}
          onSelectDay={selectDay}
          onSelectPersona={selectPersona}
          onSelectWaypoint={selectOperationalWaypoint}
          onOpenDesignScene={openMissionDesignScene}
          onReturnToWorldMap={returnMissionToWorldMap}
          onMissionChange={changeMissionContext}
          onExit={onExit}
          scene={(
            <Suspense fallback={<div className="experience-missing-medium" data-testid="mission-scene-loading"><CircleDot /><strong>جارٍ فتح مشتق Web3D المتحقق</strong><p>تُراجع البصمة قبل إظهار المشهد.</p></div>}>
              <ExperienceSceneViewer
                registry={configuration.sceneRegistry}
                gateway={sceneGateway}
                validationContext={sceneValidationContext}
                pack={activePack}
                storyMapDefinition={configuration.storyMapDefinition}
                selection={selection}
                projection={currentProjection}
                designExperience={configuration.designExperience}
                routeDesignProjection={routeDesignProjection}
                onRouteWaypointChange={selectOperationalWaypoint}
                onSelectionChange={commitSelection}
                onPrevious={() => runRehearsal({ type: 'previous' })}
                onNext={() => runRehearsal({ type: 'next' })}
                onReturnToMap={() => {
                  returnMissionToWorldMap();
                }}
                onOpenTruth={() => commitMissionRoute({ truthOpen: true })}
                onDirtyChange={onDirtyChange}
                clientPresentationVariant="golden"
              />
            </Suspense>
          )}
        />
      </Suspense>
    );
  }

  if (selection.goldenJourneyScreen && configuration.goldenJourney) {
    return (
      <GoldenJourneyExperience
        configuration={configuration}
        pack={activePack}
        selection={selection}
        routeProjection={routeDesignProjection}
        operationalProjection={currentProjection}
        markers={markers}
        onSelectDay={selectDay}
        onSelectPersona={selectPersona}
        onSelectWaypoint={selectOperationalWaypoint}
        onScreenChange={setGoldenJourneyScreen}
        onOpenDesignScene={openGoldenRouteDesignScene}
        onOpenTruth={() => {
          setTechnicalOpen(true);
          commitSelection({ ...selection, goldenJourneyScreen: null, reviewMode: 'sources', designPresentationMode: false, designCameraTourPlaying: false });
        }}
        onExit={onExit}
        scene={(
          <Suspense fallback={<div className="experience-missing-medium" data-testid="golden-scene-loading"><CircleDot /><strong>جارٍ فتح مشتق Web3D المتحقق</strong><p>تُراجع البصمة قبل إظهار المشهد.</p></div>}>
            <ExperienceSceneViewer
              registry={configuration.sceneRegistry}
              gateway={sceneGateway}
              validationContext={sceneValidationContext}
              pack={activePack}
              storyMapDefinition={configuration.storyMapDefinition}
              selection={selection}
              projection={currentProjection}
              designExperience={configuration.designExperience}
              routeDesignProjection={routeDesignProjection}
              onRouteWaypointChange={selectOperationalWaypoint}
              onSelectionChange={commitSelection}
              onPrevious={() => runRehearsal({ type: 'previous' })}
              onNext={() => runRehearsal({ type: 'next' })}
              onReturnToMap={() => commitSelection({ ...selection, goldenJourneyScreen: 'map', designPresentationMode: false, designCameraTourPlaying: false, mapMode: 'story', viewMode: 'map-focus', selectedSceneHotspotId: null })}
              onOpenTruth={() => setTechnicalOpen(true)}
              onDirtyChange={onDirtyChange}
              clientPresentationVariant="golden"
            />
          </Suspense>
        )}
      />
    );
  }

  return (
    <section data-testid="experience-twin-workspace" data-package-status={activePack.packageStatus} data-project-id={activePack.projectId} className={`experience-twin experience-view-${selection.viewMode} experience-map-${selection.mapMode} experience-review-mode-${selection.reviewMode} ${selection.designPresentationMode ? 'experience-design-client-mode' : ''}`} lang="ar" dir="rtl">
      <header className="experience-compact-bar" data-testid="experience-compact-bar">
        <div className="experience-compact-identity">
          <span className="experience-twin-mark"><Sparkles aria-hidden="true" /></span>
          <div><p>EXPERIENCE TWIN · أربعة أيام</p><h1>{configuration.projectLabelAr}</h1><small>{configuration.eventWindowAr}</small></div>
        </div>
        <div className="experience-compact-context">
          <label className="experience-compact-select"><CalendarDays aria-hidden="true" /><span>اليوم</span><select data-testid="experience-day-select" aria-label="اليوم المحدد" value={selection.eventDayId ?? ''} disabled={!currentScenario?.eventDayIds.length} onChange={(event) => selectDay(event.target.value)}><option value="">لم يُفصّل</option>{activePack.eventDays.filter((day) => day.scenarioId === selection.scenarioId).map((day) => <option key={day.eventDayId} value={day.eventDayId}>{day.labelAr}</option>)}</select></label>
          <label className="experience-compact-select"><UserRound aria-hidden="true" /><span>الشخصية</span><select data-testid="experience-persona-select" aria-label="الشخصية المحددة" value={selection.personaId ?? ''} disabled={!currentScenario?.eventDayIds.length} onChange={(event) => selectPersona(event.target.value)}>{activePack.personas.filter((persona) => currentDay?.personaIds.includes(persona.personaId)).map((persona) => <option key={persona.personaId} value={persona.personaId}>{persona.labelAr}</option>)}</select></label>
          <button className="experience-current-mode" data-testid="experience-space-menu-trigger" type="button" aria-expanded={workspaceMenuOpen} aria-controls="experience-space-drawer" onClick={() => setWorkspaceMenuOpen((open) => !open)}><ActiveReviewModeIcon aria-hidden="true" /><span><small>المساحة</small><strong>{activeReviewMode.labelAr}</strong></span><Menu aria-hidden="true" /></button>
        </div>
        <div className="experience-compact-actions">
          <button data-testid="experience-presentation-open" type="button" onClick={openPresentation} title="تشغيل العرض التنفيذي"><Presentation aria-hidden="true" /><span>عرض العميل</span></button>
          <button data-testid="experience-truth-open" type="button" onClick={() => setTechnicalOpen(true)} title="فتح الحقيقة والمصادر"><ShieldCheck aria-hidden="true" /><span>الحقيقة</span></button>
          {onExit ? <button data-testid="experience-exit" type="button" onClick={onExit} title="العودة إلى محفظة المشاريع"><ArrowLeft aria-hidden="true" /><span>خروج</span></button> : null}
        </div>
      </header>

      {workspaceMenuOpen ? <>
        <button className="experience-drawer-scrim experience-space-scrim" type="button" aria-label="إغلاق قائمة مساحات التجربة" onClick={() => setWorkspaceMenuOpen(false)} />
        <aside id="experience-space-drawer" className="experience-space-drawer" data-testid="experience-space-drawer" aria-label="مساحات وأدوات توأم التجربة">
          <header><div><p>EXPERIENCE CONTROL</p><h2>مساحات التجربة</h2></div><button type="button" aria-label="إغلاق القائمة" onClick={() => setWorkspaceMenuOpen(false)}><X /></button></header>
          <nav aria-label="مساحات توأم التجربة المتكاملة">
            {experienceReviewModes.map(({ id, labelAr, icon: Icon }) => <button key={id} type="button" data-testid={`experience-review-mode-${id}`} aria-pressed={selection.reviewMode === id} onClick={() => id === 'presentation' ? openPresentation() : setReviewMode(id)}><Icon aria-hidden="true" /><span>{labelAr}</span><ChevronLeft aria-hidden="true" /></button>)}
            {onOpenRehearsal ? <button type="button" data-testid="experience-review-open-rehearsal" onClick={onOpenRehearsal}><MonitorPlay aria-hidden="true" /><span>البروفة الرقمية</span><ChevronLeft aria-hidden="true" /></button> : null}
          </nav>
          <section><h3>السطح المكاني</h3><div className="experience-drawer-map-modes">{(['story', 'operational', 'illustrated', 'web3d', 'panorama'] as const).map((mode) => <button data-testid={`experience-map-mode-${mode}`} key={mode} type="button" aria-pressed={selection.mapMode === mode} onClick={() => { setMapMode(mode); setWorkspaceMenuOpen(false); }}>{mode === 'story' ? <Sparkles /> : mode === 'operational' ? <MapIcon /> : mode === 'illustrated' ? <Layers3 /> : mode === 'web3d' ? <SquareDashedMousePointer /> : <Eye />}{mapModeLabels[mode]}</button>)}</div></section>
          <section className="experience-drawer-controls"><h3>السياق المتقدم</h3><label><span>السيناريو</span><select data-testid="experience-scenario-select" value={selection.scenarioId} onChange={(event) => selectScenario(event.target.value)}>{activePack.scenarios.map((scenario) => <option key={scenario.scenarioId} value={scenario.scenarioId}>{scenario.labelAr} · {scenario.durationDays} أيام</option>)}</select></label><label><span>العدسة</span><select data-testid="experience-lens-select" value={selection.lens} onChange={(event) => setLens(event.target.value as OperationalLensId)}>{activePack.operationalLenses.map((lens) => <option key={lens.lensId} value={lens.lensId}>{lens.labelAr}</option>)}</select></label><div className="experience-scenario-fact"><b>السيناريو · {currentScenario?.sourceDeclaredAttendance.qualifier === 'unknown' ? 'الحضور غير محدد' : `${currentScenario?.sourceDeclaredAttendance.qualifier === 'more-than' ? 'أكثر من ' : ''}${currentScenario?.sourceDeclaredAttendance.value ?? ''}`}</b><span>معلن في المصدر · ليس سعة</span><small>{currentScenario?.intendedEffectAr}</small>{currentDay ? <em data-testid="experience-day-attendance">اليوم · {currentDay.sourceDeclaredAttendance.qualifier === 'unknown' ? 'الحضور غير محدد' : `${currentDay.sourceDeclaredAttendance.qualifier === 'more-than' ? 'أكثر من ' : ''}${currentDay.sourceDeclaredAttendance.value ?? ''}`}</em> : null}{currentSites.length ? <em data-testid="experience-site-context">{currentSites.map((site) => site.labelAr).join(' + ')} · {currentDay?.visitorJourneyStatus === 'not-applicable' || currentIntegratedDay?.routeSelectionStatus === 'not-applicable' ? 'سياقان احتفاليان منفصلان · لا رحلة أو انتقال مشترك' : currentSites.length > 1 ? 'تفسير ثنائي الموقع مرشح' : 'موقع مرشح'}</em> : null}</div></section>
          <section className="experience-source-ribbon" data-testid="experience-source-truth"><FileCheck2 aria-hidden="true" /><div><strong>{configuration.truthRibbonAr}</strong><span>{configuration.truthBoundaryAr}</span><small>SHA-256 <bdi dir="ltr">{activePack.sourceTraces[0]?.sourceHash.slice(0, 12) ?? 'fictional'}</bdi></small></div></section>
          <footer><button type="button" onClick={() => { setWorkspaceMenuOpen(false); setAuthoringOpen(true); }}><Code2 />التأليف المرشح</button><button type="button" onClick={() => { setWorkspaceMenuOpen(false); setViewMode(selection.viewMode === 'map-focus' ? 'split' : 'map-focus'); }}><Focus />{selection.viewMode === 'map-focus' ? 'إظهار المشهد' : 'تركيز الخريطة'}</button></footer>
        </aside>
      </> : null}

      <Suspense fallback={<div className="experience-review-loading">جارٍ تحميل سجل المراجعة المتكامل…</div>}>
        <ExperienceIntegratedReviewEntry
          projectLabelAr={configuration.projectLabelAr}
          activeContext={activeContext}
          selection={selection}
          onReviewModeChange={setReviewMode}
          onPresentationPauseChange={(presentationPaused) => commitSelection({ ...selection, presentationPaused }, 'replace')}
          onApplyPresentationStep={applyPresentationStep}
          onSelectDay={selectDay}
          onSelectEntity={selectMarker}
          onStartJourney={startFromGate}
          onOpenDesignScene={openDesignScene}
          designSceneAvailable={Boolean(configuration.designExperience?.scenes.length)}
          heroPreviewUri={mapScene?.localPreviewUri ?? null}
          heroPreviewAvailable={Boolean(mapScene?.localPreviewUri && mapAssetStatus === 'available' && !failedAssets.has(mapScene.assetId))}
        />
      </Suspense>

      <div className={`experience-twin-stage ${inspectorOpen ? '' : 'inspector-collapsed'}`}>
        {!selection.designPresentationMode ? <ExperienceRouteDesignContext projection={routeDesignProjection} expanded={routeContextExpanded} onExpandedChange={setRouteContextExpanded} onSelectJourney={selectOperationalJourney} onSelectWaypoint={selectOperationalWaypoint} onOpenDesignScene={openRouteDesignScene} /> : null}
        <div className="experience-stage-context" data-testid="experience-stage-context">
          <span>{activeContext.momentLabelAr}</span>
          <strong>{activeContext.destinationLabelAr}</strong>
          <small>{activeContext.sceneStatusAr}</small>
          <button type="button" disabled={!nextJourneyStep} onClick={() => nextJourneyStep && selectStep(nextJourneyStep.journeyStepId)}><i>التالي</i>{nextJourneyStep?.labelAr ?? 'الانتقال غير محسوم'}<ChevronLeft /></button>
        </div>
        <div className="experience-stage-actions">
          <button data-testid="experience-inspector-toggle" type="button" aria-pressed={inspectorOpen} onClick={() => setInspectorOpen((value) => !value)}><BookOpenCheck />{inspectorOpen ? 'إخفاء السياق' : 'سياق اللحظة'}</button>
          <button data-testid="experience-behind-the-experience" type="button" aria-pressed={commandRevealOpen} onClick={() => { setCommandRevealOpen((open) => !open); setCommandRevealDepth(1); }}><Radar />عرض ما وراء التجربة</button>
        </div>
        <article className="experience-map-panel" data-testid="experience-map-surface">
          <header><div><small>{selection.mapMode === 'story' ? 'خريطة تجربة الفعالية' : configuration.operationalMapLabelAr}</small><strong>{selection.mapMode === 'story' ? configuration.storyMapDefinition.labelAr : selection.mapMode === 'illustrated' ? 'خريطة التجربة التصميمية' : selection.mapMode === 'operational' ? 'خريطة العلاقات التشغيلية' : mapModeLabels[selection.mapMode]}</strong></div><span>{selection.mapMode === 'story' ? `Story Map ${configuration.storyMapDefinition.version}` : selection.mapMode === 'operational' ? `${markers.length} وجهة مرشحة` : 'مرجع بصري'}</span></header>
          {selection.mapMode === 'story' ? (
            <Suspense fallback={<div className="experience-missing-medium" data-testid="story-map-loading"><CircleDot /><strong>جارٍ تحميل الخريطة السردية</strong><p>تُحمّل طبقة SVG والرحلة المختارة عند الطلب فقط.</p></div>}>
              <StoryMapExperience definition={configuration.storyMapDefinition} pack={activePack} selection={selection} onSelectionChange={(next, historyMode) => { if (next.selectedLandmarkId !== selection.selectedLandmarkId) setInspectorOpen(true); commitSelection(next, historyMode); }} onSelectStep={(journeyStepId, landmarkId) => { if (landmarkId) setInspectorOpen(true); selectStep(journeyStepId, landmarkId); }} onRehearsal={runRehearsal} onDirtyChange={onDirtyChange} onOpenTruth={() => setTechnicalOpen(true)} onOpenDesignScene={openDesignScene} designSceneAvailable={Boolean(configuration.designExperience?.scenes.length)} />
            </Suspense>
          ) : selection.mapMode === 'operational' ? (
            <div className="experience-operational-map">
              <div className="experience-plan-grid" aria-hidden="true" />
              <div className="experience-map-watermark"><MapIcon /><strong>مرجع مكاني مرشح · Fit all</strong><span>{configuration.operationalMapSourceAr} · توسيع العرض لا يغيّر المراسي المخزنة</span></div>
              {markers.map((marker) => {
                const related = currentStep?.relatedEntityIds.includes(marker.entityId) ?? false;
                const selected = selection.selectedEntityId === marker.entityId;
                return <button key={marker.entityId} data-testid={`experience-marker-${marker.entityId}`} type="button" className={`experience-marker ${selected ? 'is-selected' : ''} ${related ? 'is-related' : ''} ${marker.conflicted ? 'is-conflicted' : ''} ${marker.independentLandmark ? 'is-landmark' : ''}`} style={{ insetInlineStart: `${marker.displayX * 100}%`, top: `${marker.displayY * 100}%` }} aria-pressed={selected} onClick={() => selectMarker(marker.entityId)} title={`${marker.sourceNumber}. ${marker.labelAr} · ${marker.geometryAr}`}><i>{marker.sourceNumber}</i><span>{marker.labelAr}</span>{marker.visuallyDecluttered ? <small>إزاحة عرض فقط</small> : null}</button>;
              })}
              {currentStep?.spatialStatus === 'unresolved-no-anchor' ? <div className="experience-unresolved-map-state" data-testid="experience-show-unresolved"><AlertTriangle /><strong>{currentStep.labelAr}</strong><span>غير محسوم مكانيًا · لا توجد مرساة أو نقطة بديلة</span></div> : null}
            </div>
          ) : selection.mapMode === 'illustrated' && mapScene?.localPreviewUri && mapAssetStatus === 'available' && !failedAssets.has(mapScene.assetId) ? (
            <div className="experience-illustrated-map"><img src={mapScene.localPreviewUri} alt="خريطة تجربة تصميمية مرشحة من الصفحة 52" onError={() => setFailedAssets((previous) => new Set(previous).add(mapScene.assetId))} /><span>معاينة تصميم من مصدر مرشح · لا توجد محاذاة مع المراسي التشغيلية</span><div className="experience-area-rail">{activePack.experienceAreas.map((area, index) => <button type="button" key={area.experienceAreaCandidateId} aria-pressed={selection.selectedExperienceAreaId === area.experienceAreaCandidateId} onClick={() => commitSelection({ ...selection, selectedExperienceAreaId: area.experienceAreaCandidateId })}><b>{index + 1}</b>{area.labelAr}</button>)}</div></div>
          ) : selection.mapMode === 'illustrated' && mapAssetStatus === 'checking' ? (
            <div className="experience-missing-medium" data-testid="experience-asset-loading"><CircleDot /><strong>جارٍ التحقق من المعاينة المحلية</strong><p>تُفحص الصفحة المطلوبة فقط، ولا تُحمّل أصول الأيام الأخرى مسبقًا.</p></div>
          ) : (
            <div className="experience-missing-medium" data-testid={`experience-${selection.mapMode}-missing`}><ImageOff /><strong>{selection.mapMode === 'panorama' ? 'مشاهد 360° قيد التسليم من استوديو التصميم' : selection.mapMode === 'web3d' ? 'المشهد ثلاثي الأبعاد قيد التسليم من استوديو التصميم' : 'المعاينة المحلية غير متاحة'}</strong><p>لا تستبدل المنصة المصدر المفقود بصورة ثابتة على أنها مشهد حقيقي. يمكن استكمال المراجعة الدلالية دون هذا الأصل.</p></div>
          )}
        </article>

        <article className="experience-scene-panel" data-testid="experience-scene-panel">
          <Suspense fallback={<div className="experience-missing-medium" data-testid="experience-scene-viewer-loading"><CircleDot /><strong>جارٍ تحميل طبقة المشهد</strong><p>لا تدخل أدوات 360 و3D في الحزمة الأولية.</p></div>}>
            <ExperienceSceneViewer
              registry={configuration.sceneRegistry}
              gateway={sceneGateway}
              validationContext={sceneValidationContext}
              pack={activePack}
              storyMapDefinition={configuration.storyMapDefinition}
              selection={selection}
              projection={currentProjection}
          designExperience={configuration.designExperience}
          routeDesignProjection={routeDesignProjection}
          onRouteWaypointChange={selectOperationalWaypoint}
          onSelectionChange={commitSelection}
              onPrevious={() => runRehearsal({ type: 'previous' })}
              onNext={() => runRehearsal({ type: 'next' })}
              onReturnToMap={() => commitSelection({ ...selection, mapMode: 'story', viewMode: 'map-focus', selectedSceneHotspotId: null })}
              onOpenTruth={() => setTechnicalOpen(true)}
              onDirtyChange={onDirtyChange}
            />
          </Suspense>
        </article>

        {inspectorOpen ? <aside className="experience-inspector" data-testid="experience-inspector">
          <header><div><small>سياق اللحظة</small><strong>{selection.mapMode === 'story' ? currentStoryLandmark?.labelAr ?? currentStoryProjection?.currentStop?.labelAr ?? currentStep?.labelAr ?? 'لا تحديد' : selectedMarker?.labelAr ?? currentStep?.labelAr ?? 'لا تحديد'}</strong></div><button type="button" aria-label="إغلاق السياق" onClick={() => setInspectorOpen(false)}><X /></button></header>
          {selection.mapMode === 'story' ? <>
            <section><span>{currentDay?.visitorJourneyStatus === 'not-applicable' ? 'سياق المحتوى الاحتفالي' : 'المعلم والموضع في الرحلة'}</span><strong>{currentStoryLandmark?.labelAr ?? currentStoryProjection?.currentStop?.labelAr ?? 'لحظة بلا معلم مكاني'}</strong><p>{currentStoryProjection?.currentStop ? `${currentStoryProjection.currentStop.order} من ${currentStoryProjection.route.stopIds.length} · ${currentPersona?.labelAr}` : 'غير مرتبط بخطوة مرئية'}{currentDay?.visitorJourneyStatus === 'not-applicable' ? ' · لا رحلة زائر أو انتقال مشترك' : ''}</p></section>
            <section><span>حقيقة المشهد</span><strong>{sceneTruthLabel(renderScene)}</strong><p>{configuration.storyMapDefinition.truthLabelAr}</p></section>
            <section><span>ما يراه ويسمعه الضيف</span><strong>{currentStep?.experienceIntent.whatGuestSees ?? 'غير محدد في المصدر'}</strong><p>{currentStep?.experienceIntent.whatGuestHears ?? 'المحتوى الصوتي غير محدد في المصدر'}</p></section>
            <section><span>ما يفعله الضيف والعاطفة المقصودة</span><strong>{currentStep?.experienceIntent.whatGuestDoes ?? currentStoryProjection?.currentStop?.narrativeCopyAr ?? 'غير محدد'}</strong><p>{currentStoryProjection?.currentStop?.intendedEmotionAr ?? currentStep?.experienceIntent.intendedEmotion ?? 'العاطفة المقصودة غير محددة'}</p></section>
            <section><span>المحتوى والوقت</span><strong>{currentStep?.experienceIntent.contentCue ?? 'لا توجد إشارة محتوى محددة'}</strong><p>{currentDay?.sourceTimeWindow ? `${currentDay.sourceTimeWindow.start}–${currentDay.sourceTimeWindow.end} · نافذة مصدرية` : 'نافذة الوقت غير معروفة'} · {currentStep?.experienceIntent.expectedDuration ?? 'المدة غير معروفة'}</p></section>
            <section><span>الجاهزية والقرار والدليل</span><strong>{currentProjection?.readinessDisposition === 'cannot-determine' ? 'الجاهزية لا يمكن تحديدها' : 'غير منطبقة على المرجع'}</strong><p>{currentProjection?.decisionStateAr} · {currentProjection?.evidenceStateAr}</p></section>
            <section><span>المالك والاحتكاك والبديل</span><strong>{currentStep?.experienceIntent.operationalOwner ?? 'المالك غير معروف'}</strong><p>{currentStep?.experienceIntent.frictionPoints.length ? currentStep.experienceIntent.frictionPoints.join('، ') : 'نقاط الاحتكاك غير مسجلة'} · {currentStep?.experienceIntent.fallbackExperience ?? 'التجربة البديلة مفقودة'}</p></section>
            <section><span>المدخل التالي</span><strong>{currentStoryLandmark?.nextRequiredInputAr ?? 'ربط مصدر صريح قبل منح هذه اللحظة موضعًا.'}</strong><p>العلاقات الحالية توضيحية مرشحة فقط.</p></section>
            <footer><span>المصدر والصفحة والهوية التقنية داخل درج الحقيقة فقط.</span><button type="button" onClick={() => setTechnicalOpen(true)}>حقيقة المصدر <ArrowLeft /></button></footer>
          </> : <>
            <section><span>حقيقة التجربة</span><strong>{truthLabelAr[currentStep?.truthClass ?? 'illustrative-only']}</strong><p>{currentProjection?.sourceStatusAr ?? 'لا يوجد مصدر مرتبط'}</p></section>
            <section><span>الجاهزية</span><strong>{currentProjection?.readinessDisposition === 'cannot-determine' ? 'لا يمكن تحديدها' : 'غير منطبقة على المرجع'}</strong><p>{currentProjection?.readinessExplanationAr}</p></section>
            <section><span>المكان</span><strong>{currentProjection?.spatialStatusAr}</strong><p>{selectedMarker ? `${selectedMarker.entityId} · ${selectedMarker.geometryAr}` : 'لا توجد مرساة محددة.'}</p></section>
            <section><span>المناطق الدلالية</span><strong>{selectedAreas.map((area) => area.labelAr).join('، ') || 'غير محددة'}</strong><p>علاقات دلالية مرشحة فقط، دون هندسة أو سعة.</p></section>
            <section><span>القرار والدليل</span><strong>{currentProjection?.decisionStateAr}</strong><p>{currentProjection?.evidenceStateAr}</p></section>
            <footer><bdi dir="ltr">{selectedTrace?.traceId ?? activePack.packId}</bdi><button type="button" onClick={() => setTechnicalOpen(true)}>التفاصيل التقنية <ArrowLeft /></button></footer>
          </>}
        </aside> : null}

        {commandRevealOpen ? <aside className="experience-command-reveal" data-testid="experience-command-reveal" aria-label="ما وراء لحظة التجربة">
          <header><div><small>EXPERIENCE → COMMAND</small><strong>ما وراء «{currentStep?.labelAr ?? 'اللحظة المحددة'}»</strong><span>الموضع واللحظة بقيا ثابتين أثناء كشف طبقات التشغيل.</span></div><button type="button" aria-label="إغلاق عرض ما وراء التجربة" onClick={() => setCommandRevealOpen(false)}><X /></button></header>
          <div className="experience-command-reveal-stack">{commandRevealLayers.slice(0, commandRevealDepth).map((layer, index) => <article key={layer.labelAr} style={{ '--reveal-order': index } as CSSProperties}><i>{index + 1}</i><div><span>{layer.labelAr}</span><strong>{layer.valueAr}</strong><small>{layer.noteAr}</small></div></article>)}{commandRevealLayers.slice(commandRevealDepth).map((layer, index) => <div className="experience-command-reveal-queued" key={layer.labelAr}><i>{commandRevealDepth + index + 1}</i><span>{layer.labelAr}</span><small>تُكشف بعد تثبيت الطبقة السابقة</small></div>)}</div>
          {selection.reviewMode === 'command' && integratedProjection ? <div className="experience-route-candidates" data-testid="experience-review-route-candidates">{integratedProjection.routePlans.map((route) => <i key={route.routePlanCandidateId}>{route.labelAr}<b>غير مختار</b></i>)}</div> : null}
          <footer><div><b>{commandRevealDepth}</b><span>من 6 طبقات مكشوفة</span></div>{commandRevealDepth < commandRevealLayers.length ? <button type="button" onClick={() => setCommandRevealDepth((depth) => Math.min(commandRevealLayers.length, depth + 1))}>اكشف الطبقة التالية<ChevronLeft /></button> : <button type="button" onClick={() => setCommandRevealDepth(1)}><RotateCcw />ابدأ الكشف من جديد</button>}</footer>
        </aside> : null}
      </div>

      <footer className="experience-rehearsal" data-testid="experience-rehearsal">
        <div className="experience-rehearsal-controls"><button type="button" aria-label="الخطوة السابقة" onClick={() => runRehearsal({ type: 'previous' })} disabled={!currentJourney}><ChevronRight /></button><button type="button" className="play" aria-label={selection.rehearsalState.status === 'playing' ? 'إيقاف البروفة مؤقتًا' : 'تشغيل البروفة'} onClick={() => runRehearsal({ type: selection.rehearsalState.status === 'playing' ? 'pause' : 'play' })} disabled={!currentJourney}>{selection.rehearsalState.status === 'playing' ? <Pause /> : <Play />}</button><button type="button" aria-label="الخطوة التالية" onClick={() => runRehearsal({ type: 'next' })} disabled={!currentJourney}><ChevronLeft /></button><button type="button" aria-label="إعادة البروفة" onClick={() => runRehearsal({ type: 'reset' })}><RotateCcw /></button></div>
        <div className="experience-rehearsal-sequence">{daySteps.length ? daySteps.map((step, index) => {
          const status = index < currentStepIndex ? 'is-completed' : index === currentStepIndex ? 'is-current' : 'is-upcoming';
          return <button data-testid={`experience-step-${step.journeyStepId}`} key={step.journeyStepId} type="button" className={status} aria-current={step.journeyStepId === selection.journeyStepId ? 'step' : undefined} aria-label={`${index + 1}. ${step.labelAr}`} title={step.labelAr} onClick={() => selectStep(step.journeyStepId)}><i>{index + 1}</i><span>{step.labelAr}</span></button>;
        }) : <div className="experience-no-sequence"><CircleDot />هذا السيناريو موصوف إجمالًا في المصدر ولم تُفصّل له أيام أو رحلة.</div>}</div>
        <div className="experience-rehearsal-truth" data-testid={currentDay?.visitorJourneyStatus === 'not-applicable' ? 'experience-day2-no-operational-journey' : undefined}><GitCompareArrows /><strong>{currentDay?.visitorJourneyStatus === 'not-applicable' ? 'تسلسل محتوى احتفالي · لا رحلة تشغيلية' : selection.rehearsalState.truthLabelAr}</strong><span>{currentDay ? `${currentDay.labelAr} · ${currentPersona?.labelAr}` : 'لا يوجد يوم مفصل'}</span></div>
      </footer>

      {technicalOpen ? <><button className="experience-drawer-scrim" type="button" aria-label="إغلاق درج الحقيقة" onClick={() => setTechnicalOpen(false)} /><aside className="experience-truth-drawer" data-testid="experience-truth-drawer"><header><div><p>TRUTH & PROVENANCE</p><h2>حقيقة حزمة التجربة</h2></div><button type="button" aria-label="إغلاق" onClick={() => setTechnicalOpen(false)}><X /></button></header><section className="experience-truth-state"><ShieldCheck /><div><strong>{activePack.packageStatus === 'candidate' ? 'حزمة مرشحة غير مفعلة' : 'مرجع خيالي للاختبار فقط'}</strong><span>frozen=false · activated=false · baseline=false</span></div></section><dl><div><dt>Pack ID</dt><dd><bdi dir="ltr">{activePack.packId}</bdi></dd></div><div><dt>Revision</dt><dd>R{activePack.revision} · {activePack.contentHash.slice(0, 16)}</dd></div><div><dt>المصدر</dt><dd><bdi dir="ltr">{activePack.sourceIds[0]}</bdi></dd></div><div><dt>بصمة المصدر</dt><dd><bdi dir="ltr">{activePack.sourceTraces[0]?.sourceHash}</bdi></dd></div><div><dt>طريقة الاستخراج</dt><dd>human-reviewed-source-extraction</dd></div></dl><h3>حدود الحقيقة</h3><ul>{activePack.limitationsAr.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul><h3>سجل الصفحات</h3><div className="experience-trace-list">{activePack.sourceTraces.map((trace) => <article key={trace.traceId}><b>ص {trace.sourcePage}</b><span>{trace.sanitizedMeaningAr}</span><small>{trace.interpretationStatus}</small></article>)}</div></aside></> : null}

      {authoringOpen ? <><button className="experience-drawer-scrim" type="button" aria-label="إغلاق التأليف" onClick={() => setAuthoringOpen(false)} /><aside className="experience-authoring-drawer" data-testid="experience-authoring-drawer"><header><div><p>CANDIDATE AUTHORING</p><h2>تأليف حزمة تجربة مرشحة</h2></div><button type="button" aria-label="إغلاق" onClick={() => setAuthoringOpen(false)}><X /></button></header><div className="experience-authoring-warning"><AlertTriangle />تأليف محلي مرشح فقط · لا تفعيل ولا اعتماد ولا تعديل للخط الأساسي</div><textarea dir="ltr" aria-label="JSON حزمة التجربة" value={draftJson} onChange={(event) => { setDraftJson(event.target.value); onDirtyChange(true); }} spellCheck={false} /><label><span>سبب التغيير الإلزامي</span><input value={changeReason} onChange={(event) => setChangeReason(event.target.value)} placeholder="صف التغيير المرشح" /></label><div className="experience-authoring-actions"><button type="button" onClick={validateDraft}><ShieldCheck />تحقق</button><button type="button" onClick={previewDraft}><GitCompareArrows />معاينة الفرق</button><button type="button" onClick={saveCandidateRevision}><Save />حفظ مراجعة مرشحة</button><button type="button" onClick={resetDraft}><RotateCcw />إعادة الضبط</button><button type="button" onClick={() => saveText(`${activePack.packId}-sanitized.json`, exportSanitizedExperiencePack(activePack))}><Download />تصدير منقح</button></div><output>{authoringMessage}{diffCount ? ` · ${diffCount} فرق` : ''}</output><p className="experience-no-activation">لا يوجد زر تفعيل في هذه الطبقة.</p></aside></> : null}
    </section>
  );
}
