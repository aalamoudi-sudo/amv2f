import {
  AlertTriangle,
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileImage,
  Images,
  Layers3,
  LockKeyhole,
  MapPinned,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sparkles
} from 'lucide-react';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  cancelCandidateAnchorEditing,
  commitCandidateAnchorPreview,
  createCandidateAnchorDraft,
  createCandidateAnchorEditingSession,
  freezeCandidateAnchorRevision,
  previewCandidateAnchor,
  redoCandidateAnchorEdit,
  restoreFrozenCandidateAnchor,
  undoCandidateAnchorEdit,
  type CandidateAnchorRevisionRepository,
  type CandidateAnchorRevisionScope
} from '../../services/candidateAnchorAuthoring';
import {
  buildSpatialSearchIndex,
  clampSpatialOpacity,
  resolveVisibleSpatialDisplayLayers,
  resolveSpatialMapAdapter,
  sanitizeSpatialViewState,
  searchSpatialIndex,
  type SpatialViewRepository
} from '../../services/spatialMap';
import {
  resolveSpatialCommandRouteState,
  switchSpatialSourceLayer,
  transitionSpatialJourneyState
} from '../../services/spatialCommand';
import type {
  SpatialFilterId,
  SpatialSavedView,
  SpatialSearchResult,
  SpatialViewState
} from '../../types/spatialMap';
import type {
  SpatialCommandEditingMode,
  SpatialCommandExperienceConfiguration,
  SpatialCommandMode,
  SpatialCommandSourceLayer,
  SpatialCommandViewMode,
  SpatialLayerSelectionState,
  SpatialStoryPresentationPhase,
  SpatialTechnicalRoute
} from '../../types/spatialCommand';
import type {
  CandidateAnchorEditingSession,
  CandidateAnchorRevision
} from '../../types/spatialTruth';
import { ExecutiveCommandMode } from './ExecutiveCommandMode';
import { ExperienceMapMode } from './ExperienceMapMode';
import {
  SpatialCommandCanvas,
  type SpatialCommandCanvasHandle
} from './SpatialCommandCanvas';
import { SpatialCommandHeader } from './SpatialCommandHeader';
import { SpatialLayerControls } from './SpatialLayerControls';
import { SpatialMapToolbar } from './SpatialMapToolbar';
import { SpatialSearchResultInspector } from './SpatialSearchResultInspector';
import { SourceTruthDrawer } from './SourceTruthDrawer';
import { VisitorJourneyController } from './VisitorJourneyController';
import { VisitorJourneyMode } from './VisitorJourneyMode';
import './spatialCommand.css';

const CandidateAnchorAuthoringPanel = lazy(async () => {
  const module = await import('./CandidateAnchorAuthoringPanel');
  return { default: module.CandidateAnchorAuthoringPanel };
});

interface SpatialCommandWorkspaceProps {
  configuration: SpatialCommandExperienceConfiguration;
  revisionRepository: CandidateAnchorRevisionRepository;
  viewRepository: SpatialViewRepository;
  onOpenTechnicalRoute: (route: SpatialTechnicalRoute) => void;
  onOpenDesignScene: (sceneAssetId: string) => void;
}

interface RouteStateInput {
  mode: SpatialCommandMode;
  sourceLayerId: string;
  candidateEntityId: string | null;
  journeyStepId: string;
  viewMode: SpatialCommandViewMode;
  editingMode: SpatialCommandEditingMode;
  focusMode: boolean;
}

export function SpatialCommandWorkspace({
  configuration,
  revisionRepository,
  viewRepository,
  onOpenTechnicalRoute,
  onOpenDesignScene
}: SpatialCommandWorkspaceProps) {
  const storyPresentationPhases = configuration.presentation.phases;
  const initialRouteState = useMemo(
    () => resolveSpatialCommandRouteState(new URL(window.location.href), configuration),
    [configuration]
  );
  const candidateLayer = configuration.sourceLayers.find((layer) => layer.truthStatus === 'candidate')!;
  const candidateSource = configuration.sourceTruth.sources.find((source) => source.sourceAssetId === candidateLayer.sourceAssetId);
  const candidateSourceHash = candidateLayer.previewSha256
    ?? candidateSource?.observedSha256
    ?? candidateSource?.expectedSha256
    ?? '';
  const candidateRevisionScope = useMemo<CandidateAnchorRevisionScope>(() => ({
    projectId: configuration.projectId,
    eventId: configuration.eventId,
    venueId: configuration.venueId,
    baseTruthPackId: configuration.spatialTruthPack.packId,
    sourceLayerId: candidateLayer.sourceLayerId,
    sourceHash: candidateSourceHash,
    candidateEntityIds: configuration.candidateEntities.map((entity) => entity.candidateId)
  }), [
    candidateLayer.sourceLayerId,
    candidateSourceHash,
    configuration.candidateEntities,
    configuration.eventId,
    configuration.projectId,
    configuration.spatialTruthPack.packId,
    configuration.venueId
  ]);
  const mapAdapter = useMemo(
    () => resolveSpatialMapAdapter(configuration.visualConfiguration.mapAdapterId),
    [configuration.visualConfiguration.mapAdapterId]
  );
  if (!mapAdapter) throw new Error(`spatial-map-adapter-unavailable:${configuration.visualConfiguration.mapAdapterId}`);

  const [mode, setMode] = useState<SpatialCommandMode>(initialRouteState.mode);
  const [viewMode, setViewMode] = useState<SpatialCommandViewMode>(initialRouteState.viewMode);
  const [layerSelection, setLayerSelection] = useState<SpatialLayerSelectionState>({
    activeSourceLayerId: initialRouteState.sourceLayerId,
    visibleCandidateEntityId: initialRouteState.candidateEntityId,
    suspendedCandidateEntityId: initialRouteState.candidateEntityId
  });
  const [journeyStepId, setJourneyStepId] = useState(initialRouteState.journeyStepId);
  const [journeyPlaying, setJourneyPlaying] = useState(false);
  const [manualJourneyEntityId, setManualJourneyEntityId] = useState<string | null>(null);
  const [selectedBlockerId, setSelectedBlockerId] = useState(configuration.executiveBlockers[0]?.blockerId ?? '');
  const [zoom, setZoom] = useState(configuration.visualConfiguration.initialZoom);
  const [truthDrawerOpen, setTruthDrawerOpen] = useState(false);
  const [truthDrawerTrigger, setTruthDrawerTrigger] = useState<HTMLElement | null>(null);
  const [presentationActive, setPresentationActive] = useState(false);
  const [presentationPlaying, setPresentationPlaying] = useState(false);
  const [presentationPhaseIndex, setPresentationPhaseIndex] = useState(0);
  const [routeCorrectionCodes, setRouteCorrectionCodes] = useState(initialRouteState.correctionCodes);
  const [sourcePanelCollapsed, setSourcePanelCollapsed] = useState(true);
  const [contextPanelCollapsed, setContextPanelCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(initialRouteState.focusMode);
  const [fullscreen, setFullscreen] = useState(false);
  const [visibleDisplayLayerIds, setVisibleDisplayLayerIds] = useState(
    () => new Set(configuration.displayLayers.filter((layer) => layer.visibility).map((layer) => layer.layerId))
  );
  const [displayLayerOpacity, setDisplayLayerOpacity] = useState<Record<string, number>>(
    () => Object.fromEntries(configuration.displayLayers.map((layer) => [layer.layerId, layer.opacity]))
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SpatialFilterId[]>([]);
  const [selectedSearchResult, setSelectedSearchResult] = useState<SpatialSearchResult | null>(null);
  const [savedViews, setSavedViews] = useState<SpatialSavedView[]>([]);
  const [latestFrozenRevision, setLatestFrozenRevision] = useState<CandidateAnchorRevision | null>(null);
  const [editingSession, setEditingSession] = useState<CandidateAnchorEditingSession | null>(() => (
    initialRouteState.editingMode === 'candidate-anchors' && candidateSourceHash
      ? createCandidateAnchorEditingSession({
          projectId: configuration.projectId,
          eventId: configuration.eventId,
          venueId: configuration.venueId,
          truthPack: configuration.spatialTruthPack,
          sourceLayerId: candidateLayer.sourceLayerId,
          sourceHash: candidateSourceHash,
          entities: configuration.candidateEntities
        })
      : null
  ));
  const [candidateDraft, setCandidateDraft] = useState<CandidateAnchorRevision | null>(null);
  const [authoringBusy, setAuthoringBusy] = useState(false);
  const [authoringMessage, setAuthoringMessage] = useState<string | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<SpatialCommandCanvasHandle>(null);
  const anchorDragOriginRef = useRef<CandidateAnchorEditingSession | null>(null);
  const fullscreenActiveRef = useRef(false);
  const fullscreenExitedAtRef = useRef(0);

  const activeLayer = configuration.sourceLayers.find((layer) => layer.sourceLayerId === layerSelection.activeSourceLayerId)
    ?? configuration.sourceLayers.find((layer) => layer.defaultVisible)
    ?? configuration.sourceLayers[0]!;
  const activeJourneyStep = configuration.narrativeJourney.steps.find((step) => step.stepId === journeyStepId)
    ?? configuration.narrativeJourney.steps[0]!;
  const activeBlocker = configuration.executiveBlockers.find((blocker) => blocker.blockerId === selectedBlockerId)
    ?? configuration.executiveBlockers[0]!;
  const presentationPhase = storyPresentationPhases[presentationPhaseIndex] ?? storyPresentationPhases[0]!;
  const selectedEntity = configuration.candidateEntities.find((entity) => entity.candidateId === layerSelection.visibleCandidateEntityId) ?? null;
  const searchIndex = useMemo(
    () => buildSpatialSearchIndex(configuration, configuration.spatialTruthPack),
    [configuration]
  );
  const searchResults = useMemo(
    () => searchSpatialIndex(searchIndex, searchQuery, filters),
    [filters, searchIndex, searchQuery]
  );
  const filteredEntityIds = useMemo(() => {
    if (!filters.length) return null;
    return new Set(
      searchSpatialIndex(searchIndex, '', filters)
        .flatMap((result) => result.candidateEntityId ? [result.candidateEntityId] : [])
    );
  }, [filters, searchIndex]);
  const compatibleVisibleLayerIds = useMemo(
    () => resolveVisibleSpatialDisplayLayers(configuration.displayLayers, mode, [...visibleDisplayLayerIds]),
    [configuration.displayLayers, mode, visibleDisplayLayerIds]
  );
  useEffect(() => {
    let active = true;
    void viewRepository.list(configuration.projectId).then((views) => {
      if (active) setSavedViews(views);
    });
    return () => {
      active = false;
    };
  }, [configuration.projectId, viewRepository]);

  useEffect(() => {
    let active = true;
    void revisionRepository.list(candidateRevisionScope).then((revisions) => {
      if (!active) return;
      const frozen = revisions.find((revision) => revision.status === 'frozen-candidate') ?? null;
      setLatestFrozenRevision(frozen);
      if (resolveSpatialCommandRouteState(new URL(window.location.href), configuration).editingMode !== 'candidate-anchors') {
        return;
      }
      setEditingSession(createCandidateAnchorEditingSession({
        projectId: configuration.projectId,
        eventId: configuration.eventId,
        venueId: configuration.venueId,
        truthPack: configuration.spatialTruthPack,
        sourceLayerId: candidateLayer.sourceLayerId,
        sourceHash: candidateSourceHash,
        entities: configuration.candidateEntities,
        frozenRevision: frozen
      }));
    });
    return () => {
      active = false;
    };
  }, [
    candidateLayer.sourceLayerId,
    candidateRevisionScope,
    candidateSourceHash,
    configuration,
    revisionRepository
  ]);

  const writeRouteState = useCallback((state: RouteStateInput, replace = false) => {
    const url = new URL(window.location.href);
    url.searchParams.set('workspace', 'spatial-command');
    url.searchParams.set('mode', state.mode);
    url.searchParams.set('sourceLayer', state.sourceLayerId);
    if (state.mode === 'journey') url.searchParams.set('journeyStep', state.journeyStepId);
    else url.searchParams.delete('journeyStep');
    url.searchParams.set('viewMode', state.viewMode);
    if (state.candidateEntityId) url.searchParams.set('candidateEntity', state.candidateEntityId);
    else url.searchParams.delete('candidateEntity');
    if (state.editingMode === 'candidate-anchors') url.searchParams.set('edit', 'candidate-anchors');
    else url.searchParams.delete('edit');
    if (state.focusMode) url.searchParams.set('focus', 'map');
    else url.searchParams.delete('focus');
    if (replace) window.history.replaceState({}, '', url);
    else window.history.pushState({}, '', url);
  }, []);

  const currentRouteState = useCallback((overrides?: Partial<RouteStateInput>): RouteStateInput => ({
    mode,
    sourceLayerId: layerSelection.activeSourceLayerId,
    candidateEntityId: activeLayer.truthStatus === 'candidate' ? layerSelection.visibleCandidateEntityId : null,
    journeyStepId,
    viewMode,
    editingMode: editingSession ? 'candidate-anchors' : 'none',
    focusMode,
    ...overrides
  }), [
    activeLayer.truthStatus,
    editingSession,
    focusMode,
    journeyStepId,
    layerSelection.activeSourceLayerId,
    layerSelection.visibleCandidateEntityId,
    mode,
    viewMode
  ]);

  const confirmDiscardCandidateChanges = useCallback(() => (
    !editingSession?.dirty
    || window.confirm('لديك تغييرات بصرية مرشحة غير محفوظة. هل تريد إلغاءها والخروج؟')
  ), [editingSession?.dirty]);

  const exitEditing = useCallback((replace = true) => {
    setEditingSession(null);
    setCandidateDraft(null);
    setAuthoringMessage(null);
    anchorDragOriginRef.current = null;
    writeRouteState(currentRouteState({ editingMode: 'none' }), replace);
  }, [currentRouteState, writeRouteState]);

  const requestExitEditing = useCallback((replace = true) => {
    if (!confirmDiscardCandidateChanges()) return false;
    exitEditing(replace);
    return true;
  }, [confirmDiscardCandidateChanges, exitEditing]);

  const applyMode = useCallback((nextMode: SpatialCommandMode, replace = false) => {
    const nextVisibleCandidateEntityId = nextMode === 'experience' && activeLayer.truthStatus === 'candidate'
      ? layerSelection.visibleCandidateEntityId ?? layerSelection.suspendedCandidateEntityId
      : null;
    setMode(nextMode);
    setManualJourneyEntityId(null);
    setJourneyPlaying(false);
    setPresentationActive(false);
    setPresentationPlaying(false);
    setSelectedSearchResult(null);
    setLayerSelection((current) => ({ ...current, visibleCandidateEntityId: nextVisibleCandidateEntityId }));
    writeRouteState(currentRouteState({
      mode: nextMode,
      candidateEntityId: nextVisibleCandidateEntityId
    }), replace);
  }, [
    activeLayer.truthStatus,
    currentRouteState,
    layerSelection.suspendedCandidateEntityId,
    layerSelection.visibleCandidateEntityId,
    writeRouteState
  ]);

  const applyViewMode = (nextViewMode: SpatialCommandViewMode) => {
    setViewMode(nextViewMode);
    writeRouteState(currentRouteState({ viewMode: nextViewMode }));
  };

  const applySourceLayer = (sourceLayerId: string) => {
    const switchedSelection = switchSpatialSourceLayer(layerSelection, sourceLayerId, configuration);
    const nextLayer = configuration.sourceLayers.find((layer) => layer.sourceLayerId === sourceLayerId);
    if (nextLayer?.truthStatus !== 'candidate' && editingSession?.dirty && !confirmDiscardCandidateChanges()) {
      return;
    }
    const nextSelection = {
      ...switchedSelection,
      visibleCandidateEntityId: nextLayer?.truthStatus === 'candidate'
        ? switchedSelection.visibleCandidateEntityId
        : null
    };
    setLayerSelection(nextSelection);
    setJourneyPlaying(false);
    setPresentationPlaying(false);
    setManualJourneyEntityId(null);
    setSelectedSearchResult(null);
    if (nextLayer?.truthStatus !== 'candidate') {
      setEditingSession(null);
      setCandidateDraft(null);
      setAuthoringMessage(null);
    }
    writeRouteState(currentRouteState({
      sourceLayerId: nextSelection.activeSourceLayerId,
      candidateEntityId: nextSelection.visibleCandidateEntityId,
      editingMode: nextLayer?.truthStatus === 'candidate' && editingSession ? 'candidate-anchors' : 'none'
    }));
  };

  const selectEntity = (candidateEntityId: string) => {
    if (activeLayer.truthStatus !== 'candidate') return;
    setSelectedSearchResult(null);
    setLayerSelection((current) => ({
      ...current,
      visibleCandidateEntityId: candidateEntityId,
      suspendedCandidateEntityId: candidateEntityId
    }));
    if (mode === 'journey') {
      setJourneyPlaying(false);
      setManualJourneyEntityId(candidateEntityId);
    }
    if (presentationActive) setPresentationPlaying(false);
    writeRouteState(currentRouteState({ candidateEntityId }));
  };

  const clearSelection = useCallback((replace = false) => {
    setSelectedSearchResult(null);
    setLayerSelection((current) => ({ ...current, visibleCandidateEntityId: null }));
    setManualJourneyEntityId(null);
    writeRouteState(currentRouteState({ candidateEntityId: null }), replace);
  }, [currentRouteState, writeRouteState]);

  const selectJourneyStep = useCallback((stepId: string, replace = false) => {
    if (!configuration.narrativeJourney.steps.some((step) => step.stepId === stepId)) return;
    setJourneyStepId(stepId);
    setManualJourneyEntityId(null);
    setSelectedSearchResult(null);
    setLayerSelection((current) => ({ ...current, visibleCandidateEntityId: null }));
    writeRouteState(currentRouteState({ mode: 'journey', journeyStepId: stepId, candidateEntityId: null }), replace);
  }, [configuration.narrativeJourney.steps, currentRouteState, writeRouteState]);

  const moveJourney = useCallback((direction: 1 | -1, replace = false, continuePlaying = false) => {
    const nextState = transitionSpatialJourneyState({
      stepId: journeyStepId,
      playing: journeyPlaying,
      manuallySelectedEntityId: manualJourneyEntityId
    }, { type: continuePlaying ? 'advance' : direction === 1 ? 'next' : 'previous' }, configuration.narrativeJourney.steps.map((step) => step.stepId));
    setJourneyPlaying(nextState.playing);
    setManualJourneyEntityId(nextState.manuallySelectedEntityId);
    if (nextState.stepId !== journeyStepId) selectJourneyStep(nextState.stepId, replace);
  }, [configuration.narrativeJourney.steps, journeyPlaying, journeyStepId, manualJourneyEntityId, selectJourneyStep]);

  const applyPresentationPhase = useCallback((phaseIndex: number) => {
    const phase = storyPresentationPhases[phaseIndex];
    if (!phase) return;
    setPresentationPhaseIndex(phaseIndex);
    setMode(phase.mode);
    setManualJourneyEntityId(null);
    setJourneyPlaying(false);
    if (phase.journeyStepId) setJourneyStepId(phase.journeyStepId);
    setLayerSelection((current) => ({
      ...current,
      activeSourceLayerId: candidateLayer.sourceLayerId,
      visibleCandidateEntityId: null
    }));
    const nextViewMode = phase.viewMode ?? configuration.visualConfiguration.defaultViewMode;
    setViewMode(nextViewMode);
    writeRouteState(currentRouteState({
      mode: phase.mode,
      sourceLayerId: candidateLayer.sourceLayerId,
      candidateEntityId: null,
      journeyStepId: phase.journeyStepId ?? journeyStepId,
      viewMode: nextViewMode
    }), true);
  }, [
    candidateLayer.sourceLayerId,
    configuration.visualConfiguration.defaultViewMode,
    currentRouteState,
    journeyStepId,
    storyPresentationPhases,
    writeRouteState
  ]);

  useEffect(() => {
    if (!journeyPlaying || presentationActive || mode !== 'journey') return;
    const timeout = window.setTimeout(() => {
      const index = configuration.narrativeJourney.steps.findIndex((step) => step.stepId === journeyStepId);
      if (index >= configuration.narrativeJourney.steps.length - 1) {
        setJourneyPlaying(false);
        return;
      }
      moveJourney(1, true, true);
    }, configuration.narrativeJourney.playbackStepDurationMs);
    return () => window.clearTimeout(timeout);
  }, [
    configuration.narrativeJourney.playbackStepDurationMs,
    configuration.narrativeJourney.steps,
    journeyPlaying,
    journeyStepId,
    mode,
    moveJourney,
    presentationActive
  ]);

  useEffect(() => {
    if (!presentationActive || !presentationPlaying) return;
    const timeout = window.setTimeout(() => {
      if (presentationPhaseIndex >= storyPresentationPhases.length - 1) {
        setPresentationPlaying(false);
        return;
      }
      applyPresentationPhase(presentationPhaseIndex + 1);
    }, configuration.presentation.phaseDurationMs);
    return () => window.clearTimeout(timeout);
  }, [
    applyPresentationPhase,
    configuration.presentation.phaseDurationMs,
    presentationActive,
    presentationPhaseIndex,
    presentationPlaying,
    storyPresentationPhases.length
  ]);

  useEffect(() => {
    const syncFromUrl = () => {
      const url = new URL(window.location.href);
      if (url.searchParams.get('project') !== configuration.projectId
        || url.searchParams.get('event') !== configuration.eventId
        || url.searchParams.get('venue') !== configuration.venueId
        || url.searchParams.get('workspace') !== 'spatial-command') return;
      const state = resolveSpatialCommandRouteState(url, configuration);
      if (editingSession?.dirty
        && state.editingMode !== 'candidate-anchors'
        && !confirmDiscardCandidateChanges()) {
        writeRouteState(currentRouteState({ editingMode: 'candidate-anchors' }), true);
        return;
      }
      setRouteCorrectionCodes(state.correctionCodes);
      setMode(state.mode);
      setViewMode(state.viewMode);
      setJourneyStepId(state.journeyStepId);
      setFocusMode(state.focusMode);
      setJourneyPlaying(false);
      setPresentationActive(false);
      setPresentationPlaying(false);
      setManualJourneyEntityId(null);
      setLayerSelection((current) => ({
        activeSourceLayerId: state.sourceLayerId,
        visibleCandidateEntityId: state.candidateEntityId,
        suspendedCandidateEntityId: state.candidateEntityId ?? current.suspendedCandidateEntityId
      }));
      if (state.editingMode === 'candidate-anchors' && candidateSourceHash) {
        setEditingSession(createCandidateAnchorEditingSession({
          projectId: configuration.projectId,
          eventId: configuration.eventId,
          venueId: configuration.venueId,
          truthPack: configuration.spatialTruthPack,
          sourceLayerId: candidateLayer.sourceLayerId,
          sourceHash: candidateSourceHash,
          entities: configuration.candidateEntities,
          frozenRevision: latestFrozenRevision
        }));
      } else {
        setEditingSession(null);
      }
      if (state.correctionCodes.length > 0) writeRouteState({
        ...state,
        editingMode: state.editingMode,
        focusMode: state.focusMode
      }, true);
    };
    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener('mayadeen:route-written', syncFromUrl);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('mayadeen:route-written', syncFromUrl);
    };
  }, [
    candidateLayer.sourceLayerId,
    candidateSourceHash,
    confirmDiscardCandidateChanges,
    configuration,
    currentRouteState,
    editingSession?.dirty,
    latestFrozenRevision,
    writeRouteState
  ]);

  useEffect(() => {
    if (initialRouteState.correctionCodes.length > 0) {
      writeRouteState({
        ...initialRouteState,
        editingMode: initialRouteState.editingMode,
        focusMode: initialRouteState.focusMode
      }, true);
    }
  }, [initialRouteState, writeRouteState]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const active = document.fullscreenElement === workspaceRef.current;
      if (fullscreenActiveRef.current && !active) fullscreenExitedAtRef.current = performance.now();
      fullscreenActiveRef.current = active;
      setFullscreen(active);
    };
    const pauseWhenHidden = () => {
      if (document.visibilityState !== 'hidden') return;
      setJourneyPlaying(false);
      setPresentationPlaying(false);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', pauseWhenHidden);
    };
  }, []);

  useEffect(() => {
    if (!editingSession?.dirty) return;
    const preventUnintendedUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', preventUnintendedUnload);
    return () => window.removeEventListener('beforeunload', preventUnintendedUnload);
  }, [editingSession?.dirty]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'Escape') {
        if (!fullscreenActiveRef.current && performance.now() - fullscreenExitedAtRef.current < 250) {
          return;
        }
        if (fullscreen) {
          event.preventDefault();
          void document.exitFullscreen();
          return;
        }
        if (truthDrawerOpen) return;
        if (editingSession) {
          event.preventDefault();
          requestExitEditing();
          return;
        }
        if (searchOpen || filterOpen) {
          setSearchOpen(false);
          setFilterOpen(false);
          return;
        }
        clearSelection(true);
        return;
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        canvasRef.current?.zoomIn();
      } else if (event.key === '-') {
        event.preventDefault();
        canvasRef.current?.zoomOut();
      } else if (event.key === '0') {
        event.preventDefault();
        canvasRef.current?.reset();
      } else if (event.key.toLocaleLowerCase() === 'f') {
        event.preventDefault();
        canvasRef.current?.fitSelected();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [
    clearSelection,
    editingSession,
    filterOpen,
    fullscreen,
    requestExitEditing,
    searchOpen,
    truthDrawerOpen
  ]);

  const toggleFocusMode = () => {
    const next = !focusMode;
    setFocusMode(next);
    writeRouteState(currentRouteState({ focusMode: next }));
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement === workspaceRef.current) {
      await document.exitFullscreen();
      return;
    }
    setFocusMode(true);
    writeRouteState(currentRouteState({ focusMode: true }), true);
    await workspaceRef.current?.requestFullscreen();
  };

  const toggleEditing = () => {
    if (editingSession) {
      requestExitEditing();
      return;
    }
    if (!candidateSourceHash) {
      setAuthoringMessage('تعذّر فتح التحرير لأن بصمة المصدر المرشح غير متاحة.');
      return;
    }
    const session = createCandidateAnchorEditingSession({
      projectId: configuration.projectId,
      eventId: configuration.eventId,
      venueId: configuration.venueId,
      truthPack: configuration.spatialTruthPack,
      sourceLayerId: candidateLayer.sourceLayerId,
      sourceHash: candidateSourceHash,
      entities: configuration.candidateEntities,
      frozenRevision: latestFrozenRevision
    });
    setEditingSession(session);
    setCandidateDraft(null);
    setAuthoringMessage(null);
    setViewMode('top');
    setFocusMode(false);
    setContextPanelCollapsed(false);
    setLayerSelection((current) => ({
      ...current,
      activeSourceLayerId: candidateLayer.sourceLayerId
    }));
    writeRouteState(currentRouteState({
      sourceLayerId: candidateLayer.sourceLayerId,
      viewMode: 'top',
      editingMode: 'candidate-anchors',
      focusMode: false
    }));
  };

  const selectSearchResult = (result: SpatialSearchResult) => {
    setSearchOpen(false);
    setSelectedSearchResult(result);
    setMode(result.mode);
    setLayerSelection((current) => ({
      ...current,
      activeSourceLayerId: result.sourceLayerId,
      visibleCandidateEntityId: result.candidateEntityId,
      suspendedCandidateEntityId: result.candidateEntityId ?? current.suspendedCandidateEntityId
    }));
    if (result.blockerId) setSelectedBlockerId(result.blockerId);
    if (result.blockerId || result.candidateEntityId) setSelectedSearchResult(null);
    writeRouteState(currentRouteState({
      mode: result.mode,
      sourceLayerId: result.sourceLayerId,
      candidateEntityId: result.candidateEntityId
    }));
    if (result.candidateEntityId) {
      window.requestAnimationFrame(() => canvasRef.current?.fitSelected());
    }
  };

  const buildCurrentViewState = (): SpatialViewState => {
    const transform = canvasRef.current?.getTransform() ?? {
      zoom: configuration.visualConfiguration.initialZoom,
      x: 0,
      y: 0
    };
    return {
      projectId: configuration.projectId,
      eventId: configuration.eventId,
      venueId: configuration.venueId,
      mode,
      sourceLayerId: activeLayer.sourceLayerId,
      selectedEntityId: layerSelection.visibleCandidateEntityId,
      zoom: transform.zoom,
      pan: { x: transform.x, y: transform.y },
      viewMode,
      visibleLayers: [...visibleDisplayLayerIds],
      opacity: displayLayerOpacity,
      collapsedPanels: {
        sourceLayers: sourcePanelCollapsed,
        context: contextPanelCollapsed
      },
      savedViewId: `${configuration.projectId}:operator-default`,
      focusMode,
      filters
    };
  };

  const saveCurrentView = async () => {
    const state = buildCurrentViewState();
    const view: SpatialSavedView = {
      savedViewId: state.savedViewId!,
      labelAr: 'عرض المشغّل المحفوظ',
      savedAt: new Date().toISOString(),
      state
    };
    await viewRepository.save(view);
    setSavedViews(await viewRepository.list(configuration.projectId));
    setAuthoringMessage('حُفظ العرض لهذا المشروع فقط.');
  };

  const restoreSavedView = async () => {
    const saved = (await viewRepository.list(configuration.projectId))[0];
    if (!saved) return;
    const state = sanitizeSpatialViewState(saved.state, configuration, configuration);
    if (!state) return;
    setMode(state.mode);
    setViewMode(state.viewMode);
    setLayerSelection((current) => ({
      activeSourceLayerId: state.sourceLayerId,
      visibleCandidateEntityId: state.selectedEntityId,
      suspendedCandidateEntityId: state.selectedEntityId ?? current.suspendedCandidateEntityId
    }));
    setVisibleDisplayLayerIds(new Set(state.visibleLayers));
    setDisplayLayerOpacity(state.opacity);
    setSourcePanelCollapsed(state.collapsedPanels.sourceLayers);
    setContextPanelCollapsed(state.collapsedPanels.context);
    setFocusMode(state.focusMode);
    setFilters(state.filters);
    window.requestAnimationFrame(() => canvasRef.current?.restoreTransform({
      zoom: state.zoom,
      x: state.pan.x,
      y: state.pan.y
    }));
    writeRouteState(currentRouteState({
      mode: state.mode,
      sourceLayerId: state.sourceLayerId,
      candidateEntityId: state.selectedEntityId,
      viewMode: state.viewMode,
      focusMode: state.focusMode
    }));
  };

  const resetViewPreferences = async () => {
    await viewRepository.clear(configuration.projectId);
    setSavedViews([]);
    setVisibleDisplayLayerIds(new Set(configuration.displayLayers.filter((layer) => layer.visibility).map((layer) => layer.layerId)));
    setDisplayLayerOpacity(Object.fromEntries(configuration.displayLayers.map((layer) => [layer.layerId, layer.opacity])));
    setSourcePanelCollapsed(true);
    setContextPanelCollapsed(false);
    setFocusMode(false);
    setFilters([]);
    setSearchQuery('');
    canvasRef.current?.reset();
    writeRouteState(currentRouteState({
      focusMode: false,
      viewMode: configuration.visualConfiguration.defaultViewMode
    }), true);
  };

  const saveCandidateDraft = async () => {
    if (!editingSession) return;
    setAuthoringBusy(true);
    setAuthoringMessage(null);
    try {
      const draft = await createCandidateAnchorDraft(editingSession, {
        expectedProjectId: configuration.projectId,
        expectedSourceHash: candidateSourceHash,
        actor: 'browser-local-review-operator',
        createdAt: new Date().toISOString(),
        previousAnchorRevisionId: latestFrozenRevision?.anchorRevisionId ?? null
      });
      await revisionRepository.save(draft);
      setCandidateDraft(draft);
      setAuthoringMessage('حُفظت مسودة مراجعة مرشحة؛ لم تُجمّد ولم تصبح هندسة معتمدة.');
    } catch {
      setAuthoringMessage('تعذّر حفظ المسودة. تحقق من سبب التغيير وبصمة المصدر ونطاق المشروع.');
    } finally {
      setAuthoringBusy(false);
    }
  };

  const freezeCandidateDraft = async (confirmed: boolean) => {
    if (!candidateDraft || !editingSession) return;
    setAuthoringBusy(true);
    setAuthoringMessage(null);
    try {
      const frozen = await freezeCandidateAnchorRevision(candidateDraft, confirmed);
      await revisionRepository.save(frozen);
      await revisionRepository.clearDrafts(candidateRevisionScope);
      setLatestFrozenRevision(frozen);
      setCandidateDraft(null);
      setEditingSession(createCandidateAnchorEditingSession({
        projectId: configuration.projectId,
        eventId: configuration.eventId,
        venueId: configuration.venueId,
        truthPack: configuration.spatialTruthPack,
        sourceLayerId: candidateLayer.sourceLayerId,
        sourceHash: candidateSourceHash,
        entities: configuration.candidateEntities,
        frozenRevision: frozen
      }));
      setAuthoringMessage(`جُمّدت المراجعة المرشحة R${frozen.revision}. لم تتغير سلطة الهندسة أو التشغيل.`);
    } catch {
      setAuthoringMessage('لم تُجمّد المراجعة؛ يلزم تأكيد صريح ومسودة صالحة.');
    } finally {
      setAuthoringBusy(false);
    }
  };

  const contextContent = activeLayer.truthStatus !== 'candidate' ? (
    <SourceLayerContext
      activeLayer={activeLayer}
      onOpenTruth={() => {
        setJourneyPlaying(false);
        setPresentationPlaying(false);
        setTruthDrawerTrigger(null);
        setTruthDrawerOpen(true);
      }}
    />
  ) : editingSession ? (
    <Suspense fallback={<div className="sc-authoring-loading">تحميل أدوات التأليف المرشح…</div>}>
      <CandidateAnchorAuthoringPanel
        key={candidateDraft?.anchorRevisionId ?? 'candidate-anchor-no-draft'}
        session={editingSession}
        selectedEntityId={selectedEntity?.candidateId ?? null}
        selectedEntityLabelAr={selectedEntity?.labelAr ?? null}
        draft={candidateDraft}
        busy={authoringBusy}
        messageAr={authoringMessage}
        onModeChange={applyMode}
        onReasonChange={(changeReason) => {
          setCandidateDraft(null);
          setEditingSession((current) => current ? { ...current, changeReason } : current);
        }}
        onUndo={() => {
          setCandidateDraft(null);
          setEditingSession((current) => current ? undoCandidateAnchorEdit(current) : current);
        }}
        onRedo={() => {
          setCandidateDraft(null);
          setEditingSession((current) => current ? redoCandidateAnchorEdit(current) : current);
        }}
        onRestoreSelected={() => {
          if (!selectedEntity) return;
          setCandidateDraft(null);
          setEditingSession((current) => current
            ? restoreFrozenCandidateAnchor(current, selectedEntity.candidateId)
            : current);
        }}
        onSaveDraft={() => void saveCandidateDraft()}
        onFreeze={(confirmed) => void freezeCandidateDraft(confirmed)}
        onCancel={() => {
          if (!confirmDiscardCandidateChanges()) return;
          setEditingSession((current) => current ? cancelCandidateAnchorEditing(current) : current);
          exitEditing();
        }}
      />
    </Suspense>
  ) : selectedSearchResult ? (
    <SpatialSearchResultInspector result={selectedSearchResult} />
  ) : mode === 'experience' ? (
    <ExperienceMapMode
      configuration={configuration}
      selectedEntityId={layerSelection.visibleCandidateEntityId}
      onSelectEntity={selectEntity}
      onSelectUnresolvedExperience={(experienceObjectId) => {
        const result = searchIndex.find((entry) => (
          entry.type === 'experience-object' && entry.targetId === experienceObjectId
        ));
        if (result) setSelectedSearchResult(result);
      }}
    />
  ) : mode === 'executive' ? (
    <ExecutiveCommandMode
      configuration={configuration}
      selectedBlockerId={selectedBlockerId}
      onSelectBlocker={(blockerId) => {
        setSelectedBlockerId(blockerId);
        setJourneyPlaying(false);
        setPresentationPlaying(false);
        setManualJourneyEntityId(null);
        setSelectedSearchResult(null);
        setLayerSelection((current) => ({ ...current, visibleCandidateEntityId: null }));
        writeRouteState(currentRouteState({ candidateEntityId: null }), true);
      }}
    />
  ) : (
    <VisitorJourneyMode
      configuration={configuration}
      activeStepId={journeyStepId}
      manuallySelectedEntityId={manualJourneyEntityId}
      presentationDurationAr={configuration.presentation.durationLabelAr}
      onStartPresentation={() => {
        setPresentationActive(true);
        setPresentationPlaying(true);
        applyPresentationPhase(0);
      }}
    />
  );

  return (
    <div
      ref={workspaceRef}
      data-testid="spatial-command-workspace"
      data-spatial-mode={mode}
      data-source-layer={activeLayer.truthStatus}
      data-truth-pack={configuration.spatialTruthPack.packId}
      data-editing-mode={editingSession ? 'candidate-anchors' : 'none'}
      className={`sc-workspace ${focusMode ? 'is-focus-mode' : ''} ${fullscreen ? 'is-fullscreen' : ''}`}
      lang="ar"
      dir="rtl"
    >
      <SpatialCommandHeader
        title={configuration.experienceTitle}
        projectLabelAr={configuration.visualConfiguration.projectLabelAr}
        venueLabelAr={configuration.visualConfiguration.venueLabelAr}
        riskCount={configuration.sourceTruth.risks.filter((risk) => risk.status === 'open').length}
        mode={mode}
        truthRevision={configuration.spatialTruthPack.revision}
        truthHash={configuration.spatialTruthPack.contentHash}
        candidateAnchorRevision={latestFrozenRevision?.revision ?? 1}
        onModeChange={applyMode}
        onOpenTruth={(trigger) => {
          setJourneyPlaying(false);
          setPresentationPlaying(false);
          setTruthDrawerTrigger(trigger);
          setTruthDrawerOpen(true);
        }}
      />
      {routeCorrectionCodes.length > 0 ? (
        <div data-testid="spatial-route-correction" className="sc-route-correction" role="status">
          <AlertTriangle aria-hidden="true" />
          صُحّح رابط غير صالح إلى سياق مكاني آمن دون تحميل مشروع أو مصدر بديل.
        </div>
      ) : null}
      <div
        className="sc-command-grid"
        data-source-collapsed={sourcePanelCollapsed}
        data-context-collapsed={contextPanelCollapsed}
      >
        <SpatialLayerControls
          layers={configuration.sourceLayers}
          displayLayers={configuration.displayLayers}
          mode={mode}
          activeLayerId={activeLayer.sourceLayerId}
          visibleDisplayLayerIds={compatibleVisibleLayerIds}
          displayLayerOpacity={displayLayerOpacity}
          collapsed={sourcePanelCollapsed}
          viewMode={viewMode}
          zoom={zoom}
          selectedEntityId={layerSelection.visibleCandidateEntityId}
          onToggleCollapsed={() => setSourcePanelCollapsed((current) => !current)}
          onLayerChange={applySourceLayer}
          onDisplayLayerToggle={(layerId) => {
            setVisibleDisplayLayerIds((current) => {
              const next = new Set(current);
              if (next.has(layerId)) next.delete(layerId);
              else next.add(layerId);
              return next;
            });
          }}
          onDisplayLayerOpacityChange={(layerId, opacity) => {
            setDisplayLayerOpacity((current) => ({ ...current, [layerId]: clampSpatialOpacity(opacity) }));
          }}
          onViewModeChange={applyViewMode}
          onZoomIn={() => canvasRef.current?.zoomIn()}
          onZoomOut={() => canvasRef.current?.zoomOut()}
          onReset={() => canvasRef.current?.reset()}
          onFit={() => canvasRef.current?.fit()}
          onFitSelected={() => canvasRef.current?.fitSelected()}
        />
        <div className="sc-canvas-shell">
          <SpatialMapToolbar
            query={searchQuery}
            searchOpen={searchOpen}
            filterOpen={filterOpen}
            filters={filters}
            results={searchResults}
            focusMode={focusMode}
            fullscreen={fullscreen}
            editing={Boolean(editingSession)}
            hasSelection={Boolean(layerSelection.visibleCandidateEntityId || selectedSearchResult)}
            hasSavedView={savedViews.length > 0}
            onQueryChange={setSearchQuery}
            onToggleSearch={() => {
              setSearchOpen((current) => !current);
              setFilterOpen(false);
            }}
            onToggleFilters={() => {
              setFilterOpen((current) => !current);
              setSearchOpen(false);
            }}
            onToggleFilter={(filter) => setFilters((current) => current.includes(filter)
              ? current.filter((candidate) => candidate !== filter)
              : [...current, filter])}
            onSelectResult={selectSearchResult}
            onClearSelection={() => clearSelection()}
            onToggleFocus={toggleFocusMode}
            onToggleFullscreen={() => void toggleFullscreen()}
            onToggleEditing={toggleEditing}
            onSaveView={() => void saveCurrentView()}
            onRestoreView={() => void restoreSavedView()}
            onResetViewPreferences={() => void resetViewPreferences()}
          />
          <SpatialCommandCanvas
            ref={canvasRef}
            mapAdapter={mapAdapter}
            configuration={configuration}
            activeLayer={activeLayer}
            mode={mode}
            selectedEntityId={layerSelection.visibleCandidateEntityId}
            activeJourneyStep={activeJourneyStep}
            activeBlocker={activeBlocker}
            viewMode={viewMode}
            presentationCue={presentationActive ? presentationPhase.labelAr : null}
            visibleDisplayLayerIds={compatibleVisibleLayerIds}
            displayLayerOpacity={displayLayerOpacity}
            filteredEntityIds={filteredEntityIds}
            anchorOverrides={editingSession?.workingAnchors ?? latestFrozenRevision?.anchors ?? []}
            editingCandidateAnchors={Boolean(editingSession)}
            onSelectEntity={selectEntity}
            onAnchorDragStart={() => {
              anchorDragOriginRef.current = editingSession;
              setCandidateDraft(null);
              setAuthoringMessage(null);
            }}
            onAnchorDragPreview={(candidateEntityId, position) => {
              setEditingSession((current) => current
                ? previewCandidateAnchor(current, candidateEntityId, position)
                : current);
            }}
            onAnchorDragCommit={(candidateEntityId, position) => {
              setEditingSession((current) => {
                if (!current) return current;
                const finalPreview = previewCandidateAnchor(current, candidateEntityId, position);
                const origin = anchorDragOriginRef.current ?? current;
                anchorDragOriginRef.current = null;
                return commitCandidateAnchorPreview(origin, finalPreview);
              });
            }}
            onZoomChange={setZoom}
            onOpenVisitorMapSpecification={() => {
              if (configuration.visualConfiguration.visitorMapInputSpecUri) {
                window.open(configuration.visualConfiguration.visitorMapInputSpecUri, '_blank', 'noopener,noreferrer');
              }
            }}
          />
          {editingSession ? (
            <div data-testid="candidate-edit-persistent-warning" className="sc-candidate-edit-persistent-warning" role="status">
              <AlertTriangle aria-hidden="true" />
              <strong>تحرير بصري مرشح — ليس إحداثيات مساحية</strong>
              <span>R{editingSession.frozenRevision + 1} · لا يغيّر الهندسة أو التشغيل</span>
            </div>
          ) : null}
        </div>
        <aside className={`sc-context-panel ${contextPanelCollapsed ? 'is-collapsed' : ''}`} aria-label="سياق المشهد النشط">
          <button
            data-testid="collapse-context-panel"
            type="button"
            className="sc-context-collapse"
            title={contextPanelCollapsed ? 'توسيع لوحة السياق' : 'طي لوحة السياق'}
            aria-label={contextPanelCollapsed ? 'توسيع لوحة السياق' : 'طي لوحة السياق'}
            onClick={() => setContextPanelCollapsed((current) => !current)}
          >
            {contextPanelCollapsed ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
            <span>{contextPanelCollapsed ? 'توسيع' : 'طي'}</span>
          </button>
          {!contextPanelCollapsed ? contextContent : null}
        </aside>
      </div>
      {activeLayer.truthStatus === 'candidate' && mode === 'journey' && !presentationActive ? (
        <VisitorJourneyController
          steps={configuration.narrativeJourney.steps}
          activeStepId={journeyStepId}
          playing={journeyPlaying}
          onPlay={() => {
            const nextState = transitionSpatialJourneyState({
              stepId: journeyStepId,
              playing: journeyPlaying,
              manuallySelectedEntityId: manualJourneyEntityId
            }, { type: 'play' }, configuration.narrativeJourney.steps.map((step) => step.stepId));
            setManualJourneyEntityId(nextState.manuallySelectedEntityId);
            setJourneyPlaying(nextState.playing);
          }}
          onPause={() => setJourneyPlaying(false)}
          onPrevious={() => {
            setJourneyPlaying(false);
            moveJourney(-1);
          }}
          onNext={() => {
            setJourneyPlaying(false);
            moveJourney(1);
          }}
          onReset={() => {
            setJourneyPlaying(false);
            selectJourneyStep(configuration.narrativeJourney.steps[0]!.stepId);
          }}
          onSelectStep={(stepId) => {
            setJourneyPlaying(false);
            selectJourneyStep(stepId);
          }}
          onFullView={() => void toggleFullscreen()}
        />
      ) : presentationActive ? (
        <PresentationController
          phaseIndex={presentationPhaseIndex}
          phase={presentationPhase}
          phases={storyPresentationPhases}
          playing={presentationPlaying}
          onPlay={() => setPresentationPlaying(true)}
          onPause={() => setPresentationPlaying(false)}
          onPrevious={() => applyPresentationPhase(Math.max(0, presentationPhaseIndex - 1))}
          onNext={() => applyPresentationPhase(Math.min(storyPresentationPhases.length - 1, presentationPhaseIndex + 1))}
          onStop={() => {
            setPresentationActive(false);
            setPresentationPlaying(false);
            applyMode('journey', true);
          }}
        />
      ) : activeLayer.truthStatus !== 'candidate' ? (
        <SourceStatusFooter activeLayer={activeLayer} />
      ) : (
        <SpatialStatusFooter configuration={configuration} mode={mode} onSelectEntity={selectEntity} />
      )}
      <SourceTruthDrawer
        open={truthDrawerOpen}
        configuration={configuration}
        returnFocusElement={truthDrawerTrigger}
        onClose={() => setTruthDrawerOpen(false)}
        onOpenTechnicalRoute={(route) => {
          setTruthDrawerOpen(false);
          onOpenTechnicalRoute(route);
        }}
        onOpenDesignScene={(sceneAssetId) => {
          setTruthDrawerOpen(false);
          onOpenDesignScene(sceneAssetId);
        }}
      />
    </div>
  );
}

function SourceStatusFooter({ activeLayer }: { activeLayer: SpatialCommandSourceLayer }) {
  return (
    <footer data-testid="spatial-source-status-footer" className="sc-status-footer">
      <div>
        <Layers3 aria-hidden="true" />
        <strong>{activeLayer.operatorContext.canvasTitleAr}</strong>
        <small>{activeLayer.labelAr}</small>
        <span>سياق مصدر مستقل · لا يعرض تفاصيل وجهات طبقة أخرى</span>
      </div>
      <span><LockKeyhole aria-hidden="true" />السلطة والتفاصيل التقنية متاحة عند الطلب</span>
    </footer>
  );
}

function SourceLayerContext({
  activeLayer,
  onOpenTruth
}: {
  activeLayer: SpatialCommandSourceLayer;
  onOpenTruth: () => void;
}) {
  const context = activeLayer.operatorContext;
  const icon = activeLayer.truthStatus === 'working'
    ? <Layers3 aria-hidden="true" />
    : activeLayer.truthStatus === 'conceptual'
      ? <FileImage aria-hidden="true" />
      : activeLayer.truthStatus === 'evidence'
        ? <Camera aria-hidden="true" />
        : <Images aria-hidden="true" />;
  const testId = activeLayer.truthStatus === 'working'
    ? 'working-cad-context'
    : activeLayer.truthStatus === 'conceptual'
      ? 'concept-source-context'
      : activeLayer.truthStatus === 'evidence'
        ? 'evidence-source-context'
        : 'visitor-map-source-context';
  return (
    <section data-testid={testId} className={`sc-mode-panel sc-source-context ${activeLayer.truthStatus === 'missing' ? 'is-missing' : ''}`}>
      <header><span>{icon}</span><div><small>{context.eyebrowAr}</small><h2>{context.titleAr}</h2><p>{context.summaryAr}</p></div></header>
      <dl>
        {context.facts.map((fact) => <div key={fact.labelAr}><dt>{fact.labelAr}</dt><dd>{fact.valueAr}</dd></div>)}
      </dl>
      {activeLayer.truthStatus === 'working' ? (
        <button type="button" onClick={onOpenTruth}><LockKeyhole aria-hidden="true" />تفاصيل المصدر والاعتماد</button>
      ) : null}
    </section>
  );
}

function SpatialStatusFooter({
  configuration,
  mode,
  onSelectEntity
}: {
  configuration: SpatialCommandExperienceConfiguration;
  mode: SpatialCommandMode;
  onSelectEntity: (candidateEntityId: string) => void;
}) {
  const conflictCount = configuration.entityRelationships.filter((relationship) => relationship.state === 'conflicted').length;
  return (
    <footer data-testid="spatial-candidate-status-footer" className="sc-status-footer">
      <div>
        <MapPinned aria-hidden="true" />
        <strong>{mode === 'executive'
          ? `${configuration.executiveBlockers.length} عوائق قرار مرتبطة بالمشهد`
          : `${configuration.candidateEntities.length} وجهة مرشحة ضمن ${configuration.experienceObjects.length} كائنات تجربة`}</strong>
        {conflictCount > 0 ? <small>{conflictCount} تعارض ظاهر</small> : null}
        <span>لا خط أساس تشغيلي · لا بيانات حية · لا مسار معتمد</span>
      </div>
      <details className="sc-entity-index">
        <summary>قائمة الوجهات المتاحة للوحة المفاتيح</summary>
        <div>
          {configuration.candidateEntities.map((entity) => (
            <button key={entity.candidateId} type="button" onClick={() => onSelectEntity(entity.candidateId)}>
              <span>{entity.sourceNumber}</span>{entity.labelAr}
              {entity.mappingStatus === 'conflicted' ? <AlertTriangle aria-label="متعارض" /> : entity.mappingStatus === 'unresolved' ? <CircleHelp aria-label="غير محسوم" /> : null}
            </button>
          ))}
        </div>
      </details>
      <span><Camera aria-hidden="true" />{configuration.evidenceSummary.inventory.photographCount} صورة و{configuration.evidenceSummary.inventory.videoCount} فيديوهات في لقطة الجرد</span>
    </footer>
  );
}

function PresentationController({
  phaseIndex,
  phase,
  phases,
  playing,
  onPlay,
  onPause,
  onPrevious,
  onNext,
  onStop
}: {
  phaseIndex: number;
  phase: SpatialStoryPresentationPhase;
  phases: SpatialStoryPresentationPhase[];
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onStop: () => void;
}) {
  return (
    <footer data-testid="executive-storytelling-controller" className="sc-presentation-controller">
      <div><Sparkles aria-hidden="true" /><span><small>العرض التنفيذي</small><strong>{phase.labelAr}</strong></span></div>
      <ol aria-label="تقدم العرض">{phases.map((entry, index) => <li key={entry.phaseId} className={index <= phaseIndex ? 'is-active' : undefined} />)}</ol>
      <div>
        {playing
          ? <button type="button" onClick={onPause}><Pause aria-hidden="true" />إيقاف مؤقت</button>
          : <button type="button" onClick={onPlay}><Play aria-hidden="true" />متابعة</button>}
        <button type="button" aria-label="المشهد السابق" onClick={onPrevious}><SkipForward aria-hidden="true" /></button>
        <button type="button" aria-label="المشهد التالي" onClick={onNext}><SkipBack aria-hidden="true" /></button>
        <button type="button" onClick={onStop}><RotateCcw aria-hidden="true" />إنهاء العرض</button>
      </div>
    </footer>
  );
}
