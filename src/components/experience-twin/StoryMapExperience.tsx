import {
  Armchair,
  Box,
  Camera,
  ChevronDown,
  CircleHelp,
  Coffee,
  Crown,
  Flame,
  Focus,
  Footprints,
  Gift,
  Handshake,
  Landmark,
  Layers3,
  MapPin,
  Maximize2,
  Mic2,
  Minus,
  Navigation,
  Pause,
  Play,
  Plus,
  Presentation,
  Redo2,
  RotateCcw,
  Route,
  Save,
  ShieldAlert,
  Sparkles,
  Trees,
  Truck,
  Undo2,
  Utensils,
  X,
  type LucideIcon
} from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';
import {
  applyStoryMapAuthoringChange,
  clampStoryMapViewport,
  createInitialStoryMapRevision,
  createStoryMapAuthoringDraft,
  focusStoryMapLandmark,
  projectStoryMap,
  redoStoryMapAuthoring,
  saveStoryMapCandidateRevision,
  undoStoryMapAuthoring
} from '../../services/storyMap';
import type { DigitalRehearsalAction } from '../../services/digitalRehearsal';
import type { ExperiencePack, ExperienceSelectionContext, ExperienceViewMode } from '../../types/experienceTwin';
import type { StoryMapDefinition, StoryMapLandmark, StoryMapPoint, StoryMapViewport } from '../../types/storyMap';
import './storyMap.css';

const iconComponents: Record<string, LucideIcon> = {
  arrival: MapPin,
  reception: Handshake,
  vip: Crown,
  model: Box,
  corridor: Footprints,
  memorial: Landmark,
  garden: Trees,
  rest: Coffee,
  memory: Armchair,
  media: Camera,
  press: Mic2,
  dinner: Utensils,
  gift: Gift,
  show: Sparkles,
  drone: Navigation,
  fireworks: Flame,
  exhibition: Truck,
  conference: Presentation
};

const areaToneClass: Record<string, string> = {
  arrival: 'is-arrival',
  hospitality: 'is-hospitality',
  activation: 'is-activation',
  garden: 'is-garden',
  rest: 'is-rest',
  dinner: 'is-dinner',
  show: 'is-show'
};

interface StoryMapExperienceProps {
  definition: StoryMapDefinition;
  pack: ExperiencePack;
  selection: ExperienceSelectionContext;
  onSelectionChange: (selection: ExperienceSelectionContext, historyMode?: 'push' | 'replace') => void;
  onSelectStep: (journeyStepId: string, landmarkId?: string | null) => void;
  onRehearsal: (action: DigitalRehearsalAction) => void;
  onDirtyChange: (dirty: boolean) => void;
  onOpenTruth: () => void;
  onOpenDesignScene?: () => void;
  designSceneAvailable?: boolean;
}

interface DragState {
  landmarkId: string;
  pointerId: number;
  preview: StoryMapPoint;
}

function pathBetween(from: StoryMapPoint, to: StoryMapPoint): string {
  const startX = from.x * 1000;
  const startY = from.y * 620;
  const endX = to.x * 1000;
  const endY = to.y * 620;
  const bend = Math.min(70, Math.max(18, Math.abs(endX - startX) * 0.18));
  return `M ${startX} ${startY} C ${startX + bend} ${startY - 22}, ${endX - bend} ${endY + 22}, ${endX} ${endY}`;
}

function positionStyle(point: StoryMapPoint): CSSProperties {
  return { insetInlineStart: `${point.x * 100}%`, top: `${point.y * 100}%` };
}

function worldStyle(viewport: StoryMapViewport): CSSProperties {
  return {
    '--story-zoom': viewport.zoom,
    '--story-pan-x': `${viewport.panX * 100}%`,
    '--story-pan-y': `${viewport.panY * 100}%`
  } as CSSProperties;
}

function safeTitle(layerLabel: string, future: boolean): string {
  return future ? `${layerLabel}؛ مدخل مستقبلي غير متاح` : `إظهار أو إخفاء طبقة ${layerLabel}`;
}

export default function StoryMapExperience({ definition, pack, selection, onSelectionChange, onSelectStep, onRehearsal, onDirtyChange, onOpenTruth, onOpenDesignScene, designSceneAvailable = false }: StoryMapExperienceProps) {
  const [sourceRevision] = useState(() => createInitialStoryMapRevision(definition));
  const [activeRevision, setActiveRevision] = useState(sourceRevision);
  const [authoringDraft, setAuthoringDraft] = useState(() => createStoryMapAuthoringDraft(sourceRevision));
  const [authoringOpen, setAuthoringOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [showAllRelationships, setShowAllRelationships] = useState(false);
  const [authoringMessage, setAuthoringMessage] = useState('لم يبدأ تحرير مرشح.');
  const [authoringStopId, setAuthoringStopId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const mapFrameRef = useRef<HTMLDivElement>(null);
  const pointerPositions = useRef(new Map<number, { x: number; y: number }>());
  const lastPinchDistance = useRef<number | null>(null);
  const panOrigin = useRef<{ x: number; y: number; viewport: StoryMapViewport } | null>(null);

  const activeDefinition = authoringOpen ? authoringDraft.workingDefinition : activeRevision.definition;
  const projection = projectStoryMap(activeDefinition, pack, selection, selection.visibleStoryMapLayerIds, selection.storyMapComparison);
  const routeLandmarkIds = new Set(projection?.relatedLandmarkIds ?? []);
  const selectedLandmark = activeDefinition.landmarks.find((landmark) => landmark.landmarkId === selection.selectedLandmarkId)
    ?? projection?.currentLandmark
    ?? null;
  const layerVisible = (layerId: string) => projection?.visibleLayers.some((layer) => layer.layerId === layerId) ?? false;
  const currentStopIndex = projection?.route.stopIds.findIndex((id) => id === projection.currentStop?.stopId) ?? -1;
  const activeTransition = projection?.route.transitionIds
    .map((transitionId) => activeDefinition.transitions.find((transition) => transition.transitionId === transitionId))
    .find((transition) => transition !== undefined) ?? null;
  const compareRoute = selection.storyMapComparison.mode === 'day'
    ? activeDefinition.personaRoutes.find((route) => route.eventDayId === selection.storyMapComparison.compareEventDayId)
    : selection.storyMapComparison.mode === 'persona'
      ? activeDefinition.personaRoutes.find((route) => route.eventDayId === selection.eventDayId && route.personaId === selection.storyMapComparison.comparePersonaId)
      : null;
  const authoringRoute = authoringDraft.workingDefinition.personaRoutes.find((route) => route.journeyId === selection.journeyId && route.eventDayId === selection.eventDayId && route.personaId === selection.personaId) ?? null;
  const authoringStops = authoringRoute?.stopIds
    .map((stopId) => authoringDraft.workingDefinition.journeyStops.find((stop) => stop.stopId === stopId))
    .filter((stop): stop is NonNullable<typeof stop> => Boolean(stop)) ?? [];
  const authoringSelectedStop = authoringStops.find((stop) => stop.stopId === authoringStopId) ?? null;

  useEffect(() => {
    const onFullscreen = () => setFullScreen(document.fullscreenElement === mapFrameRef.current);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => document.removeEventListener('fullscreenchange', onFullscreen);
  }, []);

  const setViewport = (viewport: StoryMapViewport, historyMode: 'push' | 'replace' = 'replace') => onSelectionChange({ ...selection, storyMapViewport: clampStoryMapViewport(viewport) }, historyMode);

  const zoomBy = (delta: number) => setViewport({ ...selection.storyMapViewport, zoom: selection.storyMapViewport.zoom + delta });
  const fitAll = () => setViewport(activeDefinition.defaultViewport, 'push');
  const fitSelected = () => setViewport(focusStoryMapLandmark(activeDefinition, selectedLandmark?.landmarkId ?? null), 'push');

  const setViewMode = (viewMode: ExperienceViewMode) => onSelectionChange({ ...selection, viewMode });

  const selectLandmark = (landmark: StoryMapLandmark) => {
    const stop = projection?.route.stopIds
      .map((id) => activeDefinition.journeyStops.find((item) => item.stopId === id))
      .find((item) => item?.landmarkId === landmark.landmarkId);
    if (stop) {
      onSelectStep(stop.journeyStepId, landmark.landmarkId);
      return;
    }
    onSelectionChange({
      ...selection,
      selectedLandmarkId: landmark.landmarkId,
      storyMapViewport: landmark.normalizedPosition ? focusStoryMapLandmark(activeDefinition, landmark.landmarkId) : selection.storyMapViewport,
      rehearsalState: { ...selection.rehearsalState, status: 'paused' }
    });
  };

  const toggleLayer = (layerId: string) => {
    const layer = activeDefinition.layers.find((item) => item.layerId === layerId);
    if (!layer || layer.futureOnly) return;
    const visible = selection.visibleStoryMapLayerIds.includes(layerId);
    const visibleStoryMapLayerIds = visible ? selection.visibleStoryMapLayerIds.filter((id) => id !== layerId) : [...selection.visibleStoryMapLayerIds, layerId];
    onSelectionChange({ ...selection, visibleStoryMapLayerIds });
  };

  const setLayerOpacity = (layerId: string, opacity: number) => onSelectionChange({
    ...selection,
    storyMapLayerOpacity: { ...selection.storyMapLayerOpacity, [layerId]: Math.max(0.1, Math.min(1, opacity)) }
  }, 'replace');

  const onMapKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomBy(0.2); }
    if (event.key === '-') { event.preventDefault(); zoomBy(-0.2); }
    if (event.key === '0') { event.preventDefault(); fitAll(); }
    if (event.key.toLowerCase() === 'f') {
      event.preventDefault();
      if (selectedLandmark) fitSelected();
      else fitAll();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if (authoringOpen) cancelAuthoring();
      else if (layersOpen) setLayersOpen(false);
      else if (comparisonOpen) setComparisonOpen(false);
      else onSelectionChange({ ...selection, selectedLandmarkId: null });
    }
    const amount = 0.035 / selection.storyMapViewport.zoom;
    if (event.key === 'ArrowRight') { event.preventDefault(); setViewport({ ...selection.storyMapViewport, panX: selection.storyMapViewport.panX - amount }); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); setViewport({ ...selection.storyMapViewport, panX: selection.storyMapViewport.panX + amount }); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setViewport({ ...selection.storyMapViewport, panY: selection.storyMapViewport.panY + amount }); }
    if (event.key === 'ArrowDown') { event.preventDefault(); setViewport({ ...selection.storyMapViewport, panY: selection.storyMapViewport.panY - amount }); }
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    zoomBy(event.deltaY > 0 ? -0.12 : 0.12);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, input, select, label')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerPositions.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointerPositions.current.size === 1) panOrigin.current = { x: event.clientX, y: event.clientY, viewport: selection.storyMapViewport };
    if (pointerPositions.current.size === 2) {
      const values = [...pointerPositions.current.values()];
      lastPinchDistance.current = Math.hypot(values[0]!.x - values[1]!.x, values[0]!.y - values[1]!.y);
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointerPositions.current.has(event.pointerId)) return;
    pointerPositions.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const rect = event.currentTarget.getBoundingClientRect();
    if (pointerPositions.current.size === 2) {
      const values = [...pointerPositions.current.values()];
      const distance = Math.hypot(values[0]!.x - values[1]!.x, values[0]!.y - values[1]!.y);
      if (lastPinchDistance.current) setViewport({ ...selection.storyMapViewport, zoom: selection.storyMapViewport.zoom * (distance / lastPinchDistance.current) });
      lastPinchDistance.current = distance;
      return;
    }
    if (!panOrigin.current) return;
    setViewport({
      ...panOrigin.current.viewport,
      panX: panOrigin.current.viewport.panX + (event.clientX - panOrigin.current.x) / Math.max(1, rect.width),
      panY: panOrigin.current.viewport.panY + (event.clientY - panOrigin.current.y) / Math.max(1, rect.height)
    });
  };

  const releasePointer = (pointerId: number) => {
    pointerPositions.current.delete(pointerId);
    if (!pointerPositions.current.size) panOrigin.current = null;
    if (pointerPositions.current.size < 2) lastPinchDistance.current = null;
  };

  const startLandmarkDrag = (event: PointerEvent<HTMLButtonElement>, landmark: StoryMapLandmark) => {
    if (!authoringOpen || !landmark.normalizedPosition) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({ landmarkId: landmark.landmarkId, pointerId: event.pointerId, preview: landmark.normalizedPosition });
    setAuthoringDraft((draft) => ({ ...draft, selectedLandmarkId: landmark.landmarkId }));
  };

  const moveLandmarkDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId || !mapFrameRef.current) return;
    const rect = mapFrameRef.current.getBoundingClientRect();
    const screenX = (event.clientX - rect.left) / Math.max(1, rect.width);
    const screenY = (event.clientY - rect.top) / Math.max(1, rect.height);
    setDragState({ ...dragState, preview: {
      x: Math.max(0.03, Math.min(0.97, (screenX - 0.5 - selection.storyMapViewport.panX) / selection.storyMapViewport.zoom + 0.5)),
      y: Math.max(0.05, Math.min(0.95, (screenY - 0.5 - selection.storyMapViewport.panY) / selection.storyMapViewport.zoom + 0.5))
    } });
  };

  const finishLandmarkDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    setAuthoringDraft((draft) => applyStoryMapAuthoringChange(draft, { type: 'move-landmark', landmarkId: dragState.landmarkId, point: dragState.preview }));
    setAuthoringMessage('تغيير بصري مرشح في المعاينة؛ لم يُحفظ بعد.');
    setDragState(null);
    onDirtyChange(true);
  };

  const openAuthoring = () => {
    setAuthoringDraft(createStoryMapAuthoringDraft(activeRevision));
    setAuthoringStopId(projection?.currentStop?.stopId ?? null);
    setDragState(null);
    setAuthoringOpen(true);
    setAuthoringMessage('وضع تحرير بصري مرشح؛ اسحب معلمًا موجودًا فقط.');
  };

  const cancelAuthoring = () => {
    setAuthoringDraft(createStoryMapAuthoringDraft(activeRevision));
    setDragState(null);
    setAuthoringStopId(null);
    setAuthoringOpen(false);
    setAuthoringMessage('أُلغي التعديل دون تغيير المراجعة المحفوظة.');
    onDirtyChange(activeRevision.revision > 1);
  };

  const saveRevision = () => {
    try {
      const revision = saveStoryMapCandidateRevision(authoringDraft, pack);
      setActiveRevision(revision);
      setAuthoringDraft(createStoryMapAuthoringDraft(revision));
      setAuthoringMessage(`حُفظت مراجعة مرشحة محلية R${revision.revision} · لا اعتماد هندسي.`);
      onDirtyChange(true);
    } catch (error) {
      setAuthoringMessage(error instanceof Error ? error.message : 'تعذر حفظ المراجعة المرشحة.');
    }
  };

  const restoreSourceRevision = () => {
    setActiveRevision(sourceRevision);
    setAuthoringDraft(createStoryMapAuthoringDraft(sourceRevision));
    setAuthoringMessage('أُعيدت خريطة المصدر المرشحة R1؛ لم يُعدّل المصدر أو الخط الأساسي.');
    onDirtyChange(false);
  };

  const nudgeLabel = (x: number, y: number) => {
    const landmark = authoringDraft.workingDefinition.landmarks.find((item) => item.landmarkId === authoringDraft.selectedLandmarkId);
    if (!landmark) return;
    setAuthoringDraft((draft) => applyStoryMapAuthoringChange(draft, { type: 'move-label', landmarkId: landmark.landmarkId, point: { x: landmark.label.offset.x + x, y: landmark.label.offset.y + y } }));
    onDirtyChange(true);
  };

  const changeStopLink = (type: 'link-step' | 'unlink-step') => {
    if (!authoringDraft.selectedLandmarkId || !authoringSelectedStop) return;
    setAuthoringDraft((draft) => applyStoryMapAuthoringChange(draft, {
      type,
      landmarkId: draft.selectedLandmarkId ?? undefined,
      journeyStepId: authoringSelectedStop.journeyStepId,
      stopId: authoringSelectedStop.stopId
    }));
    setAuthoringMessage(type === 'link-step' ? 'رُبطت محطة سردية بالمعلم في المعاينة المرشحة.' : 'فُك ربط المحطة في المعاينة المرشحة؛ لم تتغير خطوة المصدر.');
    onDirtyChange(true);
  };

  const moveAuthoringStop = (delta: -1 | 1) => {
    if (!authoringRoute || !authoringSelectedStop) return;
    const currentIndex = authoringRoute.stopIds.indexOf(authoringSelectedStop.stopId);
    const targetIndex = Math.max(0, Math.min(authoringRoute.stopIds.length - 1, currentIndex + delta));
    if (targetIndex === currentIndex) return;
    const orderedStopIds = [...authoringRoute.stopIds];
    const [moved] = orderedStopIds.splice(currentIndex, 1);
    if (!moved) return;
    orderedStopIds.splice(targetIndex, 0, moved);
    setAuthoringDraft((draft) => applyStoryMapAuthoringChange(draft, { type: 'reorder-route', routeId: authoringRoute.personaJourneyRouteId, orderedStopIds }));
    setAuthoringMessage('تغير ترتيب السرد في المعاينة فقط؛ لا يوجد مسار ميداني أو زمن وصول.');
    onDirtyChange(true);
  };

  const routeSegmentCount = projection?.route.segments.length ?? 0;
  const journeyNotApplicable = projection?.route.visitorJourneyStatus === 'not-applicable';
  const routePaths = projection?.route.segments.flatMap((segment, index) => {
    const from = activeDefinition.landmarks.find((item) => item.landmarkId === segment.fromLandmarkId)?.normalizedPosition;
    const to = activeDefinition.landmarks.find((item) => item.landmarkId === segment.toLandmarkId)?.normalizedPosition;
    if (!from || !to || segment.visualStyle !== 'solid') return [];
    const narrativeState = currentStopIndex >= routeSegmentCount
      ? 'completed'
      : index < currentStopIndex
        ? 'completed'
        : index === Math.max(0, currentStopIndex)
          ? 'current'
          : 'upcoming';
    return [{ id: segment.segmentId, d: pathBetween(from, to), narrativeState }];
  }) ?? [];

  const unresolvedRouteSegments = projection?.route.segments.filter((segment) => {
    const from = activeDefinition.landmarks.find((item) => item.landmarkId === segment.fromLandmarkId)?.normalizedPosition;
    const to = activeDefinition.landmarks.find((item) => item.landmarkId === segment.toLandmarkId)?.normalizedPosition;
    return segment.visualStyle !== 'solid' || !from || !to;
  }) ?? [];

  const comparePaths = compareRoute?.segments.flatMap((segment) => {
    const from = activeDefinition.landmarks.find((item) => item.landmarkId === segment.fromLandmarkId)?.normalizedPosition;
    const to = activeDefinition.landmarks.find((item) => item.landmarkId === segment.toLandmarkId)?.normalizedPosition;
    return from && to ? [{ id: segment.segmentId, d: pathBetween(from, to) }] : [];
  }) ?? [];

  const allRelationshipPaths = activeDefinition.personaRoutes
    .filter((route) => route.personaJourneyRouteId !== projection?.route.personaJourneyRouteId)
    .flatMap((route) => route.segments)
    .flatMap((segment) => {
      const from = activeDefinition.landmarks.find((item) => item.landmarkId === segment.fromLandmarkId)?.normalizedPosition;
      const to = activeDefinition.landmarks.find((item) => item.landmarkId === segment.toLandmarkId)?.normalizedPosition;
      return from && to && segment.visualStyle === 'solid' ? [{ id: segment.segmentId, d: pathBetween(from, to) }] : [];
    });

  return (
    <div className={`story-map-shell ${authoringOpen ? 'is-authoring' : ''} ${selection.viewMode === 'presentation' ? 'is-presentation' : ''}`} data-testid="story-map-shell" data-story-map-id={activeDefinition.storyMapId}>
      <div className="story-map-truth-band"><ShieldAlert aria-hidden="true" /><strong>{activeDefinition.truthLabelAr}</strong><span>R{activeRevision.revision} · {activeRevision.revision === 1 ? 'المراجعة المصدرية' : 'مراجعة محلية مرشحة'}</span></div>
      {selection.viewMode === 'presentation' ? <button data-testid="story-map-exit-presentation" className="story-map-exit-presentation" type="button" onClick={() => setViewMode('split')}><X />إنهاء العرض</button> : null}

      <div className="story-map-toolbar" aria-label="أدوات الخريطة السردية">
        <div className="story-map-toolbar-group">
          <button type="button" onClick={() => zoomBy(0.2)} title="تكبير الخريطة" aria-label="تكبير الخريطة"><Plus /></button>
          <button type="button" onClick={() => zoomBy(-0.2)} title="تصغير الخريطة" aria-label="تصغير الخريطة"><Minus /></button>
          <button type="button" onClick={fitAll} title="ملاءمة كل المعالم" aria-label="ملاءمة كل المعالم"><RotateCcw /></button>
          <button type="button" onClick={fitSelected} disabled={!selectedLandmark?.normalizedPosition} title="تركيز المعلم المحدد" aria-label="تركيز المعلم المحدد"><Focus /></button>
        </div>
        <div className="story-map-toolbar-group">
          <button data-testid="story-map-layers-toggle" type="button" aria-expanded={layersOpen} aria-pressed={layersOpen} onClick={() => setLayersOpen((open) => !open)} title="طبقات الخريطة"><Layers3 />الطبقات</button>
          <button data-testid="story-map-all-relationships" type="button" aria-pressed={showAllRelationships} onClick={() => setShowAllRelationships((shown) => !shown)} title="إظهار جميع العلاقات للتحليل فقط"><Route />{showAllRelationships ? 'إخفاء العلاقات' : 'كل العلاقات'}</button>
          <button data-testid="story-map-comparison-toggle" type="button" aria-expanded={comparisonOpen} aria-pressed={selection.storyMapComparison.mode !== 'none'} onClick={() => setComparisonOpen((open) => !open)} title="مقارنة التجارب"><ChevronDown />مقارنة</button>
          <button type="button" aria-pressed={selection.viewMode === 'map-focus'} onClick={() => setViewMode(selection.viewMode === 'map-focus' ? 'split' : 'map-focus')} title="تركيز كامل على الخريطة"><Maximize2 />ملء المساحة</button>
          <button data-testid="story-map-presentation" type="button" aria-pressed={selection.viewMode === 'presentation'} onClick={() => setViewMode(selection.viewMode === 'presentation' ? 'split' : 'presentation')} title="وضع عرض العميل"><Presentation />العرض</button>
          <button type="button" onClick={() => void mapFrameRef.current?.requestFullscreen()} title="ملء الشاشة" aria-label="ملء الشاشة"><Maximize2 /></button>
          {selection.viewMode !== 'presentation' ? <button data-testid="story-map-authoring-open" type="button" aria-pressed={authoringOpen} onClick={authoringOpen ? cancelAuthoring : openAuthoring} title="تحرير الخريطة المرشحة"><MapPin />تحرير مرشح</button> : null}
        </div>
      </div>

      {layersOpen ? <section className="story-map-popover story-map-layer-popover" data-testid="story-map-layer-panel" aria-label="طبقات الخريطة">
        <header><strong>طبقات الخريطة</strong><button type="button" aria-label="إغلاق الطبقات" onClick={() => setLayersOpen(false)}><X /></button></header>
        <div>{activeDefinition.layers.map((layer) => <label key={layer.layerId} className={layer.futureOnly ? 'is-disabled' : ''} title={safeTitle(layer.labelAr, layer.futureOnly)}><input type="checkbox" checked={layerVisible(layer.layerId)} disabled={layer.futureOnly || !layer.compatibleLenses.includes(selection.lens)} onChange={() => toggleLayer(layer.layerId)} /><span><b>{layer.labelAr}</b><small>{layer.legendAr}</small></span>{!layer.futureOnly && layerVisible(layer.layerId) ? <input aria-label={`شفافية ${layer.labelAr}`} type="range" min="0.1" max="1" step="0.1" value={selection.storyMapLayerOpacity[layer.layerId] ?? layer.defaultOpacity} onChange={(event) => setLayerOpacity(layer.layerId, Number(event.target.value))} /> : null}</label>)}</div>
      </section> : null}

      {comparisonOpen ? <section className="story-map-popover story-map-comparison-popover" data-testid="story-map-comparison-panel" aria-label="مقارنة الرحلات">
        <header><strong>مقارنة التجارب</strong><button type="button" aria-label="إغلاق المقارنة" onClick={() => setComparisonOpen(false)}><X /></button></header>
        <label><span>نوع المقارنة</span><select data-testid="story-map-compare-mode" value={selection.storyMapComparison.mode} onChange={(event) => {
          const mode = event.target.value as ExperienceSelectionContext['storyMapComparison']['mode'];
          const otherDay = pack.eventDays.find((day) => day.eventDayId !== selection.eventDayId)?.eventDayId ?? null;
          const otherPersona = activeDefinition.personaRoutes.find((route) => route.eventDayId === selection.eventDayId && route.personaId !== selection.personaId)?.personaId ?? null;
          onSelectionChange({ ...selection, storyMapComparison: { mode, compareEventDayId: mode === 'day' ? otherDay : null, comparePersonaId: mode === 'persona' ? otherPersona : null, compareLens: mode === 'lens' ? 'operations' : null } });
        }}><option value="none">بدون مقارنة</option><option value="day">يومان</option><option value="persona">شخصيتان في اليوم نفسه</option><option value="lens">التجربة والتشغيل</option><option value="source">مرجع المصدر والخريطة التوضيحية</option></select></label>
        {selection.storyMapComparison.mode === 'day' ? <label><span>اليوم المقارن</span><select value={selection.storyMapComparison.compareEventDayId ?? ''} onChange={(event) => onSelectionChange({ ...selection, storyMapComparison: { ...selection.storyMapComparison, compareEventDayId: event.target.value } })}>{pack.eventDays.filter((day) => day.eventDayId !== selection.eventDayId).map((day) => <option key={day.eventDayId} value={day.eventDayId}>{day.labelAr}</option>)}</select></label> : null}
        {selection.storyMapComparison.mode === 'persona' ? <label><span>الشخصية المقارنة</span><select value={selection.storyMapComparison.comparePersonaId ?? ''} onChange={(event) => onSelectionChange({ ...selection, storyMapComparison: { ...selection.storyMapComparison, comparePersonaId: event.target.value } })}>{activeDefinition.personaRoutes.filter((route) => route.eventDayId === selection.eventDayId && route.personaId !== selection.personaId).map((route) => <option key={route.personaJourneyRouteId} value={route.personaId}>{pack.personas.find((persona) => persona.personaId === route.personaId)?.labelAr}</option>)}</select></label> : null}
        {projection?.comparison ? <div className="story-map-comparison-summary"><strong>{projection.comparison.labelAr}</strong><span>{projection.comparison.sharedLandmarkIds.length} محطات مشتركة · {projection.comparison.primaryOnlyLandmarkIds.length + projection.comparison.comparisonOnlyLandmarkIds.length} مختلفة</span><small>{projection.comparison.changedSequence ? 'ترتيب مختلف' : 'الترتيب المشترك متسق'} · {projection.comparison.unknownRelationshipCount} علاقة غير معروفة · {projection.comparison.missingSceneCount} مشهد مفقود</small>{selection.storyMapComparison.mode === 'source' ? <small data-testid="story-map-source-comparison">مرجع المصدر مسجل كمرشح، ولا توجد محاذاة هندسية مثبتة مع الرسم التوضيحي.</small> : null}<em>الاختلاف البصري ليس تعارضًا تشغيليًا.</em></div> : null}
      </section> : null}

      <div
        ref={mapFrameRef}
        className={`story-map-frame ${fullScreen ? 'is-full-screen' : ''}`}
        data-testid="story-map-frame"
        role="application"
        aria-label="خريطة تجربة الفعالية السردية. استخدم الأسهم للتحريك وعلامتي الجمع والطرح للتكبير والتصغير."
        tabIndex={0}
        onKeyDown={onMapKeyDown}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => releasePointer(event.pointerId)}
        onPointerCancel={(event) => releasePointer(event.pointerId)}
      >
        <div className="story-map-world" style={worldStyle(selection.storyMapViewport)}>
          <svg className="story-map-illustration" viewBox="0 0 1000 620" aria-hidden="true" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`paper-${activeDefinition.storyMapId}`} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor={activeDefinition.theme.palette.paper} /><stop offset="1" stopColor="#ebe1cf" /></linearGradient>
              <pattern id={`stone-${activeDefinition.storyMapId}`} width="34" height="34" patternUnits="userSpaceOnUse"><path d="M0 17h34M17 0v34" stroke="#7f6d55" strokeOpacity=".07" /></pattern>
              <filter id={`shadow-${activeDefinition.storyMapId}`}><feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#173e33" floodOpacity=".16" /></filter>
            </defs>
            <rect width="1000" height="620" rx="28" fill={`url(#paper-${activeDefinition.storyMapId})`} />
            <rect width="1000" height="620" rx="28" fill={`url(#stone-${activeDefinition.storyMapId})`} />
            <path d="M-40 142C128 88 214 166 348 114S607 38 770 103s230 34 280-8v-140H-40z" fill={activeDefinition.theme.palette.canopy} opacity=".94" />
            <path d="M430 153c90-64 198-59 282-5 61 39 93 97 61 133-43 49-147 18-221 43-85 29-174 83-245 44-72-40-17-151 123-215z" fill={activeDefinition.theme.palette.water} opacity=".28" />
            <path d="M54 506c133-74 230-44 342-25 132 22 225-33 334-45 105-11 190 31 285 100v112H-18z" fill={activeDefinition.theme.palette.garden} opacity=".13" />
            {layerVisible('STORY-LAYER-AREAS') ? activeDefinition.areas.map((area) => <g key={area.storyAreaId} className={`story-map-area ${areaToneClass[area.tone] ?? ''}`} opacity={selection.storyMapLayerOpacity['STORY-LAYER-AREAS'] ?? 1}><ellipse cx={area.center.x * 1000} cy={area.center.y * 620} rx={area.radius.x * 1000} ry={area.radius.y * 620} /><text x={area.center.x * 1000} y={(area.center.y + area.radius.y * 0.72) * 620}>{area.labelAr}</text></g>) : null}
            {showAllRelationships ? allRelationshipPaths.map((path) => <path key={`all-${path.id}`} d={path.d} className="story-map-route is-analysis" opacity={selection.storyMapLayerOpacity['STORY-LAYER-OTHER-JOURNEYS'] ?? 0.18} />) : null}
            {layerVisible('STORY-LAYER-OTHER-JOURNEYS') && selection.storyMapComparison.mode !== 'none' ? comparePaths.map((path) => <path key={path.id} d={path.d} className="story-map-route is-comparison" opacity={selection.storyMapLayerOpacity['STORY-LAYER-OTHER-JOURNEYS'] ?? 0.3} />) : null}
            {layerVisible('STORY-LAYER-ACTIVE-JOURNEY') ? routePaths.map((path) => <path key={path.id} d={path.d} data-narrative-state={path.narrativeState} className={`story-map-route is-${path.narrativeState} ${path.narrativeState === 'current' && selection.rehearsalState.status === 'playing' ? 'is-playing' : ''}`} opacity={selection.storyMapLayerOpacity['STORY-LAYER-ACTIVE-JOURNEY'] ?? 1} />) : null}
          </svg>

          {layerVisible('STORY-LAYER-LANDMARKS') ? projection?.visibleLandmarks.map((landmark) => {
            const actualPosition = dragState?.landmarkId === landmark.landmarkId ? dragState.preview : landmark.normalizedPosition!;
            const Icon = iconComponents[activeDefinition.icons.find((item) => item.iconId === landmark.iconId)?.symbol ?? 'arrival'] ?? MapPin;
            const selected = selectedLandmark?.landmarkId === landmark.landmarkId;
            const related = routeLandmarkIds.has(landmark.landmarkId);
            return <button
              key={landmark.landmarkId}
              data-testid={`story-landmark-${landmark.landmarkId}`}
              type="button"
              className={`story-map-landmark is-${landmark.kind} emphasis-${landmark.emphasis} ${selected ? 'is-selected' : ''} ${related ? 'is-related' : 'is-dimmed'} ${authoringOpen ? 'is-editable' : ''}`}
              style={positionStyle(actualPosition)}
              aria-pressed={selected}
              aria-label={`${landmark.labelAr}؛ ${landmark.truthClass === 'fictional-test-reference' ? 'مرجع خيالي' : 'معلم توضيحي مرشح'}`}
              title={`${landmark.labelAr} · موضع توضيحي مرشح`}
              onClick={() => selectLandmark(landmark)}
              onPointerDown={(event) => startLandmarkDrag(event, landmark)}
              onPointerMove={moveLandmarkDrag}
              onPointerUp={finishLandmarkDrag}
            ><span><Icon aria-hidden="true" /></span><b style={{ translate: `${landmark.label.offset.x * 500}px ${landmark.label.offset.y * 320}px` }}>{landmark.labelAr}</b>{landmark.kind === 'independent-landmark' ? <small>معلم مستقل</small> : null}</button>;
          }) : null}

          {projection?.currentLandmark?.normalizedPosition && selection.rehearsalState.status !== 'idle' ? <div className={`story-map-visitor ${selection.rehearsalState.status === 'playing' ? 'is-moving' : ''}`} style={positionStyle(projection.currentLandmark.normalizedPosition)} data-testid="story-map-visitor"><span /><b>الضيف</b></div> : null}
        </div>

        <div className="story-map-compass" aria-hidden="true"><Navigation /><span>شمال مرجعي بصري</span></div>
        <div className="story-map-scale-truth">لا مقياس · لا مسافات · لا زمن وصول</div>
        {journeyNotApplicable ? <div className="story-map-journey-not-applicable" data-testid="story-map-journey-not-applicable-20261101"><CircleHelp /><div><strong>لا تنطبق رحلة تشغيلية في 1 نوفمبر</strong><span>قصر العوجا والحدائق سياقا مراسم منفصلان؛ لا خط انتقال ولا مدة سفر ولا افتراض جمهور مشترك.</span></div></div> : null}
        {unresolvedRouteSegments.length ? <div className="story-map-narrative-break" data-testid="story-map-narrative-break"><CircleHelp /><div><strong>فجوة سردية مقصودة</strong><span>{unresolvedRouteSegments.length} انتقال بلا موضع أو علاقة مكانية محسومة</span></div></div> : null}
        {activeTransition ? <div className="story-map-transition" data-testid="story-map-dual-site-transition"><Navigation /><div><strong>{activeTransition.labelAr}</strong><span>{activeTransition.truthLabelAr}</span></div></div> : null}
        <div className="story-map-live-announcement" aria-live="polite">{projection?.currentStop ? `الخطوة ${currentStopIndex + 1}: ${projection.currentStop.labelAr}` : 'لا توجد خطوة محددة'}</div>
      </div>

      <div className="story-map-walk-levels" aria-label="مستويات استعراض التجربة">
        <button data-testid="story-map-walk-start" type="button" className="is-available" aria-pressed={selection.rehearsalState.status === 'playing'} onClick={() => onRehearsal({ type: selection.rehearsalState.status === 'playing' ? 'pause' : 'play' })}>{selection.rehearsalState.status === 'playing' ? <Pause /> : <Play />}<span><b>{journeyNotApplicable ? 'تشغيل تسلسل المحتوى الاحتفالي' : 'المشي على الخريطة السردية'}</b><small>{journeyNotApplicable ? 'بلا رحلة زائر أو انتقال مكاني' : 'متاح الآن'}</small></span></button>
        <button type="button" disabled><Camera /><span><b>الانتقال بين نقاط 360</b><small>غير متاح حتى وصول بانوراما صالحة</small></span></button>
        <button data-testid="story-map-open-design-web3d" type="button" className={designSceneAvailable ? 'is-available' : undefined} disabled={!designSceneAvailable} onClick={onOpenDesignScene}><Box /><span><b>فحص التصميم Web3D</b><small>{designSceneAvailable ? 'مشتق تصميمي متحقق · ليس مسارًا أو هندسة معتمدة' : 'غير متاح حتى وصول GLB/GLTF صالح'}</small></span></button>
        <p>{journeyNotApplicable ? 'تسلسل محتوى احتفالي — لا يمثل رحلة زائر أو انتقالًا بين الموقعين' : activeDefinition.walkTruthLabelAr}</p>
      </div>

      {layerVisible('STORY-LAYER-UNRESOLVED') && projection?.unresolvedLandmarks.length ? <aside className="story-map-unresolved" data-testid="story-map-unresolved-list"><header><CircleHelp /><strong>معالم بلا موضع مرشح</strong></header>{projection.unresolvedLandmarks.map((landmark) => <button key={landmark.landmarkId} type="button" aria-pressed={selectedLandmark?.landmarkId === landmark.landmarkId} onClick={() => selectLandmark(landmark)}><span>{landmark.labelAr}</span><small>{landmark.nextRequiredInputAr}</small></button>)}</aside> : null}

      <details className="story-map-text-alternative"><summary>قائمة نصية بديلة للمعالم والخطوات</summary><ol>{projection?.route.stopIds.map((stopId) => activeDefinition.journeyStops.find((stop) => stop.stopId === stopId)).filter((stop): stop is NonNullable<typeof stop> => Boolean(stop)).map((stop) => <li key={stop.stopId}><button type="button" aria-current={stop.journeyStepId === selection.journeyStepId ? 'step' : undefined} onClick={() => onSelectStep(stop.journeyStepId, stop.landmarkId)}>{stop.order}. {stop.labelAr}{stop.landmarkId ? '' : ' · بلا موضع على الخريطة'}</button></li>)}</ol></details>

      {authoringOpen ? <aside className="story-map-authoring" data-testid="story-map-authoring-panel">
        <header><div><small>CANDIDATE MAP AUTHORING</small><h3>تحرير الخريطة المرشحة</h3></div><button type="button" aria-label="إغلاق التأليف" onClick={cancelAuthoring}><X /></button></header>
        <div className="story-map-authoring-warning"><ShieldAlert />تحرير بصري مرشح — ليس إحداثيات مساحية</div>
        <p>اسحب معلمًا ظاهرًا أو اضبط خصائصه. المعالم غير المحسومة لا يمكن منحها موضعًا من هذا المحرر.</p>
        <label><span>المعلم</span><select value={authoringDraft.selectedLandmarkId ?? ''} onChange={(event) => setAuthoringDraft((draft) => ({ ...draft, selectedLandmarkId: event.target.value || null }))}><option value="">اختر معلمًا</option>{authoringDraft.workingDefinition.landmarks.filter((item) => item.normalizedPosition).map((item) => <option key={item.landmarkId} value={item.landmarkId}>{item.labelAr}</option>)}</select></label>
        {authoringDraft.selectedLandmarkId ? <>
          <label><span>الأيقونة</span><select value={authoringDraft.workingDefinition.landmarks.find((item) => item.landmarkId === authoringDraft.selectedLandmarkId)?.iconId} onChange={(event) => { setAuthoringDraft((draft) => applyStoryMapAuthoringChange(draft, { type: 'change-icon', landmarkId: authoringDraft.selectedLandmarkId!, iconId: event.target.value })); onDirtyChange(true); }}>{authoringDraft.workingDefinition.icons.map((item) => <option key={item.iconId} value={item.iconId}>{item.labelAr}</option>)}</select></label>
          <label><span>التركيز البصري</span><select value={authoringDraft.workingDefinition.landmarks.find((item) => item.landmarkId === authoringDraft.selectedLandmarkId)?.emphasis} onChange={(event) => { setAuthoringDraft((draft) => applyStoryMapAuthoringChange(draft, { type: 'change-emphasis', landmarkId: authoringDraft.selectedLandmarkId!, emphasis: event.target.value as StoryMapLandmark['emphasis'] })); onDirtyChange(true); }}><option value="primary">رئيسي</option><option value="standard">عادي</option><option value="quiet">هادئ</option><option value="warning">تنبيه</option></select></label>
          <div className="story-map-nudge"><span>موضع التسمية</span><button type="button" onClick={() => nudgeLabel(0, -0.01)} aria-label="تحريك التسمية للأعلى">↑</button><button type="button" onClick={() => nudgeLabel(-0.01, 0)} aria-label="تحريك التسمية لليمين">→</button><button type="button" onClick={() => nudgeLabel(0.01, 0)} aria-label="تحريك التسمية لليسار">←</button><button type="button" onClick={() => nudgeLabel(0, 0.01)} aria-label="تحريك التسمية للأسفل">↓</button></div>
          <div className="story-map-before-after"><span>قبل</span><b>{sourceRevision.definition.landmarks.find((item) => item.landmarkId === authoringDraft.selectedLandmarkId)?.normalizedPosition ? JSON.stringify(sourceRevision.definition.landmarks.find((item) => item.landmarkId === authoringDraft.selectedLandmarkId)?.normalizedPosition) : 'بلا موضع'}</b><span>بعد</span><b>{JSON.stringify(authoringDraft.workingDefinition.landmarks.find((item) => item.landmarkId === authoringDraft.selectedLandmarkId)?.normalizedPosition)}</b></div>
        </> : null}
        {authoringRoute ? <fieldset className="story-map-route-authoring"><legend>ربط وترتيب الرحلة المرشحة</legend><label><span>المحطة السردية</span><select data-testid="story-map-authoring-stop" value={authoringStopId ?? ''} onChange={(event) => setAuthoringStopId(event.target.value || null)}><option value="">اختر محطة</option>{authoringStops.map((stop) => <option key={stop.stopId} value={stop.stopId}>{stop.order}. {stop.labelAr}</option>)}</select></label><div><button data-testid="story-map-link-stop" type="button" disabled={!authoringSelectedStop || !authoringDraft.selectedLandmarkId} onClick={() => changeStopLink('link-step')}>ربط بالمعلم</button><button data-testid="story-map-unlink-stop" type="button" disabled={!authoringSelectedStop || authoringSelectedStop.landmarkId !== authoringDraft.selectedLandmarkId} onClick={() => changeStopLink('unlink-step')}>فك الربط</button><button type="button" disabled={!authoringSelectedStop || authoringSelectedStop.order <= 1} onClick={() => moveAuthoringStop(-1)}>تقديم المحطة</button><button type="button" disabled={!authoringSelectedStop || authoringSelectedStop.order >= authoringStops.length} onClick={() => moveAuthoringStop(1)}>تأخير المحطة</button></div><small>كل تغيير هنا سردي مرشح فقط، ويُحفظ في مراجعة جديدة بعد إدخال السبب.</small></fieldset> : null}
        <label><span>سبب التغيير الإلزامي</span><input value={authoringDraft.authoringReason} onChange={(event) => setAuthoringDraft((draft) => ({ ...draft, authoringReason: event.target.value }))} placeholder="مثال: تحسين وضوح التجربة في العرض" /></label>
        <div className="story-map-authoring-actions"><button type="button" disabled={!authoringDraft.undoStack.length} onClick={() => setAuthoringDraft((draft) => undoStoryMapAuthoring(draft))}><Undo2 />تراجع</button><button type="button" disabled={!authoringDraft.redoStack.length} onClick={() => setAuthoringDraft((draft) => redoStoryMapAuthoring(draft))}><Redo2 />إعادة</button><button type="button" onClick={cancelAuthoring}><X />إلغاء</button><button data-testid="story-map-save-revision" type="button" onClick={saveRevision}><Save />حفظ مراجعة</button><button type="button" onClick={restoreSourceRevision}><RotateCcw />استعادة R1</button></div>
        <output>{authoringMessage}</output>
        <footer><span>local-candidate-author-untrusted</span><span>local-process-time-untrusted</span><button type="button" onClick={onOpenTruth}>افتح حقيقة المصدر</button></footer>
      </aside> : null}
    </div>
  );
}
