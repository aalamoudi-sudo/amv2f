import {
  Camera,
  Check,
  CircleDashed,
  FileImage,
  Fingerprint,
  Images,
  Layers3,
  LockKeyhole,
  Map as MapIcon,
  MapPinned,
  ShieldCheck,
  Video
} from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent
} from 'react';
import type { CandidateSpatialEntity } from '../../types/sourceIntake';
import type {
  SpatialMapAdapter,
  SpatialMapTransform
} from '../../types/spatialMap';
import type {
  NarrativeJourneyStep,
  SpatialCommandExperienceConfiguration,
  SpatialCommandMode,
  SpatialCommandSourceLayer,
  SpatialCommandViewMode,
  SpatialExecutiveBlocker
} from '../../types/spatialCommand';
import type { CandidateVisualAnchor } from '../../types/spatialTruth';
import { deriveAdaptiveMarkerLayout } from '../../services/spatialMap';
import { OptionalLocalSourceImage } from '../shared/OptionalLocalSourceImage';
import { SpatialEntityMarker } from './SpatialEntityMarker';

export interface SpatialCommandCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  fit: () => void;
  fitSelected: () => void;
  getTransform: () => SpatialMapTransform;
  restoreTransform: (transform: SpatialMapTransform) => void;
}

interface SpatialCommandCanvasProps {
  mapAdapter: SpatialMapAdapter;
  configuration: SpatialCommandExperienceConfiguration;
  activeLayer: SpatialCommandSourceLayer;
  mode: SpatialCommandMode;
  selectedEntityId: string | null;
  activeJourneyStep: NarrativeJourneyStep;
  activeBlocker: SpatialExecutiveBlocker;
  viewMode: SpatialCommandViewMode;
  presentationCue: string | null;
  visibleDisplayLayerIds: Set<string>;
  displayLayerOpacity: Record<string, number>;
  filteredEntityIds: Set<string> | null;
  anchorOverrides: CandidateVisualAnchor[];
  editingCandidateAnchors: boolean;
  onSelectEntity: (candidateEntityId: string) => void;
  onAnchorDragStart: (candidateEntityId: string) => void;
  onAnchorDragPreview: (candidateEntityId: string, position: { x: number; y: number }) => void;
  onAnchorDragCommit: (candidateEntityId: string, position: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onOpenVisitorMapSpecification: () => void;
}

export const SpatialCommandCanvas = forwardRef<SpatialCommandCanvasHandle, SpatialCommandCanvasProps>(
  function SpatialCommandCanvas({
    mapAdapter,
    configuration,
    activeLayer,
    mode,
    selectedEntityId,
    activeJourneyStep,
    activeBlocker,
    viewMode,
    presentationCue,
    visibleDisplayLayerIds,
    displayLayerOpacity,
    filteredEntityIds,
    anchorOverrides,
    editingCandidateAnchors,
    onSelectEntity,
    onAnchorDragStart,
    onAnchorDragPreview,
    onAnchorDragCommit,
    onZoomChange,
    onOpenVisitorMapSpecification
  }, ref) {
    const [transform, setTransform] = useState<SpatialMapTransform>({
      zoom: configuration.visualConfiguration.initialZoom,
      x: 0,
      y: 0
    });
    const [stageWidth, setStageWidth] = useState<number | null>(null);
    const [dragOrigin, setDragOrigin] = useState<{ pointerId: number; x: number; y: number; startX: number; startY: number } | null>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const markerRefs = useRef(new Map<string, HTMLButtonElement>());
    const activePointers = useRef(new Map<number, { x: number; y: number }>());
    const pinchOrigin = useRef<{ distance: number; zoom: number } | null>(null);
    const minimumZoom = configuration.visualConfiguration.minimumZoom;
    const maximumZoom = configuration.visualConfiguration.maximumZoom;

    const clampTransform = useCallback((next: SpatialMapTransform) => {
      const viewport = viewportRef.current;
      return mapAdapter.clampTransform(next, {
        minimumZoom,
        maximumZoom,
        viewportWidth: viewport?.clientWidth ?? 1920,
        viewportHeight: viewport?.clientHeight ?? 1080
      });
    }, [mapAdapter, maximumZoom, minimumZoom]);
    const setZoom = useCallback((nextZoom: number) => {
      const zoom = Math.min(maximumZoom, Math.max(minimumZoom, nextZoom));
      setTransform((current) => clampTransform({ ...current, zoom }));
      onZoomChange(zoom);
    }, [clampTransform, maximumZoom, minimumZoom, onZoomChange]);
    const reset = useCallback(() => {
      const zoom = configuration.visualConfiguration.initialZoom;
      setTransform({ zoom, x: 0, y: 0 });
      onZoomChange(zoom);
    }, [configuration.visualConfiguration.initialZoom, onZoomChange]);
    const fit = useCallback(() => {
      setTransform({ zoom: 1, x: 0, y: 0 });
      onZoomChange(1);
    }, [onZoomChange]);

    const renderedEntities = useMemo(() => {
      const overrides = new Map(anchorOverrides.map((anchor) => [anchor.candidateEntityId, anchor]));
      return configuration.candidateEntities.map((entity) => {
        if (!entity.normalizedAnchor) return entity;
        const override = overrides.get(entity.candidateId);
        const projected = mapAdapter.projectAnchor({
          x: override?.x ?? entity.normalizedAnchor.x,
          y: override?.y ?? entity.normalizedAnchor.y
        });
        return {
          ...entity,
          normalizedAnchor: {
            ...entity.normalizedAnchor,
            x: projected.leftPercent / 100,
            y: projected.topPercent / 100
          }
        };
      });
    }, [anchorOverrides, configuration.candidateEntities, mapAdapter]);

    const focusEntity = useCallback((candidateEntityId: string) => {
      const entity = renderedEntities.find((entry) => entry.candidateId === candidateEntityId);
      const stage = stageRef.current;
      const viewport = viewportRef.current;
      if (!entity?.normalizedAnchor || !stage || !viewport) return;
      const stageRect = stage.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();
      const targetX = (0.5 - entity.normalizedAnchor.x) * stageRect.width * 0.72;
      const targetY = (0.5 - entity.normalizedAnchor.y) * stageRect.height * 0.72;
      const boundedX = Math.max(-viewportRect.width * 0.35, Math.min(viewportRect.width * 0.35, targetX));
      const boundedY = Math.max(-viewportRect.height * 0.3, Math.min(viewportRect.height * 0.3, targetY));
      const zoom = Math.max(transform.zoom, 1.22);
      setTransform({ zoom, x: boundedX, y: boundedY });
      onZoomChange(zoom);
    }, [onZoomChange, renderedEntities, transform.zoom]);
    const fitSelected = useCallback(() => {
      if (selectedEntityId) focusEntity(selectedEntityId);
      else fit();
    }, [fit, focusEntity, selectedEntityId]);
    useImperativeHandle(ref, () => ({
      zoomIn: () => setZoom(transform.zoom + 0.2),
      zoomOut: () => setZoom(transform.zoom - 0.2),
      reset,
      fit,
      fitSelected,
      getTransform: () => ({ ...transform }),
      restoreTransform: (nextTransform) => {
        const next = clampTransform(nextTransform);
        setTransform(next);
        onZoomChange(next.zoom);
      }
    }), [clampTransform, fit, fitSelected, onZoomChange, reset, setZoom, transform]);
    const focusEntityInEffect = useEffectEvent(focusEntity);
    const fitInEffect = useEffectEvent(fit);
    const resetInEffect = useEffectEvent(reset);

    useEffect(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const fitStageToViewport = () => {
        const width = Math.min(
          1320,
          viewport.clientWidth * .94,
          viewport.clientHeight * .94 * configuration.visualConfiguration.mapAspectRatio
        );
        setStageWidth(Math.max(240, width));
      };
      fitStageToViewport();
      const observer = new ResizeObserver(fitStageToViewport);
      observer.observe(viewport);
      return () => observer.disconnect();
    }, [configuration.visualConfiguration.mapAspectRatio]);

    useEffect(() => {
      if (activeLayer.truthStatus !== 'candidate' || editingCandidateAnchors) return;
      if (!selectedEntityId) return;
      const frame = window.requestAnimationFrame(() => focusEntityInEffect(selectedEntityId));
      return () => window.cancelAnimationFrame(frame);
    }, [activeLayer.truthStatus, editingCandidateAnchors, selectedEntityId]);

    useEffect(() => {
      if (mode !== 'journey' || activeLayer.truthStatus !== 'candidate') return;
      const firstKnownEntityId = activeJourneyStep.candidateEntityIds[0];
      const frame = window.requestAnimationFrame(() => {
        if (firstKnownEntityId) focusEntityInEffect(firstKnownEntityId);
        else fitInEffect();
      });
      return () => window.cancelAnimationFrame(frame);
    }, [activeJourneyStep.candidateEntityIds, activeJourneyStep.stepId, activeLayer.truthStatus, mode]);

    useEffect(() => {
      const frame = window.requestAnimationFrame(() => resetInEffect());
      return () => window.cancelAnimationFrame(frame);
    }, [activeLayer.sourceLayerId, viewMode]);

    const entityGroupIndex = useMemo(() => {
      const result = new Map<string, number>();
      configuration.entityRelationships.forEach((relationship) => {
        if (!relationship.experienceObjectId) return;
        const groupIndex = configuration.experienceObjects.findIndex((object) => object.experienceObjectId === relationship.experienceObjectId);
        relationship.candidateEntityIds.forEach((candidateId) => result.set(candidateId, groupIndex));
      });
      return result;
    }, [configuration.entityRelationships, configuration.experienceObjects]);

    const emphasizedEntityIds = useMemo(() => {
      if (mode === 'journey') return new Set(activeJourneyStep.candidateEntityIds);
      if (mode === 'executive') return new Set(activeBlocker.affectedCandidateEntityIds);
      return new Set<string>();
    }, [activeBlocker.affectedCandidateEntityIds, activeJourneyStep.candidateEntityIds, mode]);

    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
      if ((event.target as HTMLElement).closest('button, a')) return;
      activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      event.currentTarget.setPointerCapture(event.pointerId);
      if (activePointers.current.size === 2) {
        const [first, second] = [...activePointers.current.values()];
        pinchOrigin.current = {
          distance: Math.hypot(second!.x - first!.x, second!.y - first!.y),
          zoom: transform.zoom
        };
        setDragOrigin(null);
        return;
      }
      setDragOrigin({
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        startX: transform.x,
        startY: transform.y
      });
    };
    const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activePointers.current.has(event.pointerId)) {
        activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }
      if (activePointers.current.size === 2 && pinchOrigin.current) {
        const [first, second] = [...activePointers.current.values()];
        const distance = Math.hypot(second!.x - first!.x, second!.y - first!.y);
        if (pinchOrigin.current.distance > 0) {
          setZoom(pinchOrigin.current.zoom * (distance / pinchOrigin.current.distance));
        }
        return;
      }
      if (!dragOrigin || dragOrigin.pointerId !== event.pointerId) return;
      setTransform((current) => clampTransform({
        ...current,
        x: dragOrigin.startX + event.clientX - dragOrigin.x,
        y: dragOrigin.startY + event.clientY - dragOrigin.y
      }));
    };
    const stopDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
      activePointers.current.delete(event.pointerId);
      if (activePointers.current.size < 2) pinchOrigin.current = null;
      if (dragOrigin?.pointerId === event.pointerId) setDragOrigin(null);
    };
    const onWheel = (event: WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      setZoom(transform.zoom + (event.deltaY < 0 ? 0.12 : -0.12));
    };
    const navigateMarker = (
      entity: CandidateSpatialEntity,
      direction: 1 | -1 | 'first' | 'last',
      interactiveEntityIds: readonly string[]
    ) => {
      const interactiveEntities = interactiveEntityIds
        .map((candidateId) => renderedEntities.find((entry) => entry.candidateId === candidateId))
        .filter((entry): entry is CandidateSpatialEntity => Boolean(entry));
      const index = interactiveEntities.findIndex((entry) => entry.candidateId === entity.candidateId);
      if (index < 0 || interactiveEntities.length === 0) return;
      const nextIndex = direction === 'first'
        ? 0
        : direction === 'last'
          ? interactiveEntities.length - 1
          : (index + direction + interactiveEntities.length) % interactiveEntities.length;
      const nextEntity = interactiveEntities[nextIndex];
      if (!nextEntity) return;
      onSelectEntity(nextEntity.candidateId);
      window.requestAnimationFrame(() => markerRefs.current.get(nextEntity.candidateId)?.focus());
    };
    const onCanvasKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
      if (event.defaultPrevented || event.target !== event.currentTarget) return;
      const step = event.shiftKey ? 64 : 28;
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      setTransform((current) => clampTransform({
        ...current,
        x: current.x + (event.key === 'ArrowLeft' ? step : event.key === 'ArrowRight' ? -step : 0),
        y: current.y + (event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0)
      }));
    };

    const pointerPositionOnSource = (event: ReactPointerEvent<HTMLButtonElement>) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect?.width || !rect.height) return null;
      return {
        x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
      };
    };

    const stageStyle = {
      '--canvas-zoom': transform.zoom,
      '--canvas-pan-x': `${transform.x}px`,
      '--canvas-pan-y': `${transform.y}px`,
      '--map-aspect-ratio': configuration.visualConfiguration.mapAspectRatio,
      '--map-stage-width': stageWidth ? `${stageWidth}px` : undefined
    } as CSSProperties;

    return (
      <section
        ref={viewportRef}
        data-testid="spatial-command-canvas"
        data-source-truth={activeLayer.truthStatus}
        data-view-mode={viewMode}
        className={`sc-canvas is-${activeLayer.truthStatus} is-mode-${mode} ${dragOrigin ? 'is-dragging' : ''}`}
        aria-label={`المشهد المكاني: ${activeLayer.labelAr}`}
        aria-description="استخدم أسهم لوحة المفاتيح لتحريك الخريطة، وأزرار الأدوات للتكبير والملاءمة."
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onWheel={onWheel}
        onKeyDown={onCanvasKeyDown}
      >
        <CanvasSourceLabel configuration={configuration} activeLayer={activeLayer} />
        {viewMode === 'presentation' ? (
          <p data-testid="presentation-view-disclosure" className="sc-presentation-disclosure">منظور عرض بصري غير هندسي</p>
        ) : null}
        {mode === 'executive'
          && activeLayer.truthStatus === 'candidate'
          && configuration.displayLayers.some((layer) => layer.type === 'executive-blockers' && visibleDisplayLayerIds.has(layer.layerId))
          ? <ExecutiveSummary configuration={configuration} />
          : null}
        <div
          ref={stageRef}
          className={`sc-map-stage ${viewMode === 'presentation' ? 'is-presentation' : ''}`}
          style={stageStyle}
        >
          {activeLayer.truthStatus === 'candidate' ? (
            <CandidateMap
              key={`${configuration.configurationId}:${activeLayer.sourceLayerId}`}
              configuration={configuration}
              activeLayer={activeLayer}
              mode={mode}
              selectedEntityId={selectedEntityId}
              activeJourneyStep={activeJourneyStep}
              activeBlocker={activeBlocker}
              renderedEntities={renderedEntities}
              emphasizedEntityIds={emphasizedEntityIds}
              entityGroupIndex={entityGroupIndex}
              markerRefs={markerRefs}
              zoom={transform.zoom}
              layoutViewport={{
                width: stageWidth ?? 1000,
                height: (stageWidth ?? 1000) / configuration.visualConfiguration.mapAspectRatio
              }}
              visibleDisplayLayerIds={visibleDisplayLayerIds}
              displayLayerOpacity={displayLayerOpacity}
              filteredEntityIds={filteredEntityIds}
              editingCandidateAnchors={editingCandidateAnchors}
              onSelectEntity={onSelectEntity}
              onNavigateMarker={navigateMarker}
              onAnchorDragStart={onAnchorDragStart}
              onAnchorDragPreview={(candidateEntityId, event) => {
                const position = pointerPositionOnSource(event);
                if (position) onAnchorDragPreview(candidateEntityId, position);
              }}
              onAnchorDragCommit={(candidateEntityId, event) => {
                const position = pointerPositionOnSource(event);
                if (position) onAnchorDragCommit(candidateEntityId, position);
              }}
            />
          ) : activeLayer.truthStatus === 'working' ? (
            <WorkingCadLayer configuration={configuration} activeLayer={activeLayer} />
          ) : activeLayer.truthStatus === 'conceptual' ? (
            <ConceptLayer activeLayer={activeLayer} />
          ) : activeLayer.truthStatus === 'evidence' ? (
            <EvidenceLayer configuration={configuration} activeLayer={activeLayer} />
          ) : (
            <MissingVisitorMapLayer
              activeLayer={activeLayer}
              specificationAvailable={Boolean(configuration.visualConfiguration.visitorMapInputSpecUri)}
              onOpenSpecification={onOpenVisitorMapSpecification}
            />
          )}
        </div>
        {presentationCue ? <div data-testid="storytelling-presentation-cue" className="sc-presentation-cue"><span>{presentationCue}</span></div> : null}
        {activeLayer.truthStatus === 'candidate' ? (
          <>
            <MapLegend mode={mode} />
            <p className="sc-candidate-truth-line">مخطط تشغيلي مرشح وغير معاير · لا يمثل هندسة أو مسارات معتمدة</p>
          </>
        ) : null}
      </section>
    );
  }
);

function CanvasSourceLabel({
  configuration,
  activeLayer
}: {
  configuration: SpatialCommandExperienceConfiguration;
  activeLayer: SpatialCommandSourceLayer;
}) {
  const source = configuration.sourceTruth.sources.find((asset) => asset.sourceAssetId === activeLayer.sourceAssetId);
  const label = activeLayer.truthStatus === 'working'
    ? 'مصدر عمل'
    : activeLayer.truthStatus === 'candidate'
      ? 'مرشح'
      : activeLayer.truthStatus === 'conceptual'
        ? 'مرجع'
        : activeLayer.truthStatus === 'evidence'
          ? 'أدلة'
          : 'مفقود';
  return (
    <div data-testid="active-spatial-source" className="sc-source-label">
      <span className={`is-${activeLayer.truthStatus}`}>{label}</span>
      <div><strong>{activeLayer.labelAr}</strong><small>{source?.sourceName ?? 'لا يوجد ملف مصدر مستلم'}</small></div>
    </div>
  );
}

function CandidateMap({
  configuration,
  activeLayer,
  mode,
  selectedEntityId,
  activeJourneyStep,
  activeBlocker,
  renderedEntities,
  emphasizedEntityIds,
  entityGroupIndex,
  markerRefs,
  zoom,
  layoutViewport,
  visibleDisplayLayerIds,
  displayLayerOpacity,
  filteredEntityIds,
  editingCandidateAnchors,
  onSelectEntity,
  onNavigateMarker,
  onAnchorDragStart,
  onAnchorDragPreview,
  onAnchorDragCommit
}: {
  configuration: SpatialCommandExperienceConfiguration;
  activeLayer: SpatialCommandSourceLayer;
  mode: SpatialCommandMode;
  selectedEntityId: string | null;
  activeJourneyStep: NarrativeJourneyStep;
  activeBlocker: SpatialExecutiveBlocker;
  renderedEntities: CandidateSpatialEntity[];
  emphasizedEntityIds: Set<string>;
  entityGroupIndex: Map<string, number>;
  markerRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  zoom: number;
  layoutViewport: { width: number; height: number };
  visibleDisplayLayerIds: Set<string>;
  displayLayerOpacity: Record<string, number>;
  filteredEntityIds: Set<string> | null;
  editingCandidateAnchors: boolean;
  onSelectEntity: (candidateEntityId: string) => void;
  onNavigateMarker: (
    entity: CandidateSpatialEntity,
    direction: 1 | -1 | 'first' | 'last',
    interactiveEntityIds: readonly string[]
  ) => void;
  onAnchorDragStart: (candidateEntityId: string) => void;
  onAnchorDragPreview: (candidateEntityId: string, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onAnchorDragCommit: (candidateEntityId: string, event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  const layerFor = (type: string) => configuration.displayLayers.find((layer) => layer.type === type);
  const isVisible = (type: string) => {
    const layer = layerFor(type);
    return Boolean(layer && visibleDisplayLayerIds.has(layer.layerId));
  };
  const opacityFor = (type: string) => {
    const layer = layerFor(type);
    return layer ? displayLayerOpacity[layer.layerId] ?? layer.opacity : 1;
  };
  const showUnresolved = mode === 'journey'
    && activeJourneyStep.status === 'unresolved'
    && isVisible('unresolved-items');
  const executiveObjectOnly = mode === 'executive'
    && isVisible('executive-blockers')
    && activeBlocker.affectedCandidateEntityIds.length === 0
    && activeBlocker.affectedExperienceObjectIds.length > 0
    && isVisible('unresolved-items');
  const independentEntityIds = new Set(configuration.spatialTruthPack.independentLandmarks.map((entry) => entry.candidateEntityId));
  const eligibleEntities = renderedEntities.filter((entity) => (
    (!filteredEntityIds || filteredEntityIds.has(entity.candidateId))
    && (!independentEntityIds.has(entity.candidateId) || isVisible('independent-landmarks'))
  ));
  const markerLayout = deriveAdaptiveMarkerLayout(
    eligibleEntities,
    zoom,
    selectedEntityId,
    layoutViewport
  );
  const relatedToSelected = new Set(
    configuration.entityRelationships
      .find((relationship) => relationship.candidateEntityIds.includes(selectedEntityId ?? ''))
      ?.candidateEntityIds ?? []
  );
  const clusters = new Map<string, CandidateSpatialEntity[]>();
  eligibleEntities.forEach((entity) => {
    const layout = markerLayout.get(entity.candidateId);
    if (!layout?.clusterId || layout.clusterSize < 2) return;
    const entries = clusters.get(layout.clusterId) ?? [];
    entries.push(entity);
    clusters.set(layout.clusterId, entries);
  });
  const [expandedClusterMemberIds, setExpandedClusterMemberIds] = useState<readonly string[]>([]);
  const expandedClusterIdsFromMembers = expandedClusterMemberIds
    .map((candidateEntityId) => markerLayout.get(candidateEntityId)?.clusterId ?? null);
  const selectedClusterId = selectedEntityId
    ? markerLayout.get(selectedEntityId)?.clusterId ?? null
    : null;
  const expandedClusterIds = new Set(
    [...expandedClusterIdsFromMembers, selectedClusterId].filter((clusterId): clusterId is string => (
      Boolean(clusterId && clusters.has(clusterId))
    ))
  );
  const summarizeClusters = zoom < 1.18 && !editingCandidateAnchors;
  const individuallyDisplayedClusterIds = summarizeClusters
    ? expandedClusterIds
    : new Set(clusters.keys());
  const interactiveEntityIds = eligibleEntities
    .filter((entity) => {
      const layout = markerLayout.get(entity.candidateId);
      return !(
        summarizeClusters
        && layout?.clusterId
        && !expandedClusterIds.has(layout.clusterId)
      );
    })
    .map((entity) => entity.candidateId);
  const showMarkers = isVisible('candidate-entity-markers');
  const effectiveEmphasizedEntityIds = mode === 'executive' && !isVisible('executive-blockers')
    ? new Set<string>()
    : emphasizedEntityIds;
  if (!activeLayer.previewUrl) return <MissingLocalPreview />;
  return (
    <div
      data-testid="candidate-command-map"
      className={showUnresolved ? 'sc-candidate-map is-unresolved-step' : 'sc-candidate-map'}
      style={{
        '--candidate-base-opacity': isVisible('candidate-zoning') ? opacityFor('candidate-zoning') : 0,
        '--candidate-marker-opacity': opacityFor('candidate-entity-markers'),
        '--candidate-relationship-opacity': mode === 'journey'
          ? opacityFor('narrative-sequence')
          : opacityFor('experience-relationships')
      } as CSSProperties}
    >
      <OptionalLocalSourceImage
        src={activeLayer.previewUrl}
        alt="معاينة محلية محسنة لمخطط التقسيم التشغيلي المرشح"
        missingTitleAr="مشتق الخريطة المحلي غير متاح"
        missingMessageAr="تعمل المنصة بأمان دون الملف المحلي. أعد إنشاء مشتق المراجعة بعد التحقق من البصمة؛ لم يُستخدم مصدر بديل."
      >
        {(mode === 'experience' && isVisible('experience-relationships'))
          || (mode === 'journey' && isVisible('narrative-sequence')) ? (
            <ConnectionLayer
              configuration={configuration}
              entities={renderedEntities}
              mode={mode}
              activeJourneyStep={activeJourneyStep}
            />
          ) : null}
        {isVisible('evidence-availability-metadata') ? (
          <div className="sc-evidence-availability-overlay" role="note">
            <Camera aria-hidden="true" />
            <span><strong>توفر أدلة مرجعية</strong><small>{configuration.evidenceSummary.inventory.photographCount} صورة · {configuration.evidenceSummary.inventory.videoCount} فيديوهات · لا تغيّر الجاهزية</small></span>
          </div>
        ) : null}
        {showMarkers ? <div className="sc-marker-layer" aria-label={`${eligibleEntities.length} وجهة تشغيلية مرشحة`}>
          <svg
            className="sc-marker-declutter-links"
            viewBox={`0 0 ${layoutViewport.width} ${layoutViewport.height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {eligibleEntities.map((entity) => {
              const layout = markerLayout.get(entity.candidateId);
              if (
                !entity.normalizedAnchor
                || !layout?.clusterId
                || !individuallyDisplayedClusterIds.has(layout.clusterId)
                || (Math.abs(layout.offsetX) < 1 && Math.abs(layout.offsetY) < 1)
              ) return null;
              const anchorX = entity.normalizedAnchor.x * layoutViewport.width;
              const anchorY = entity.normalizedAnchor.y * layoutViewport.height;
              return (
                <g key={`declutter-link-${entity.candidateId}`}>
                  <line
                    x1={anchorX}
                    y1={anchorY}
                    x2={anchorX + layout.offsetX}
                    y2={anchorY + layout.offsetY}
                  />
                  <circle cx={anchorX} cy={anchorY} r="2.5" />
                </g>
              );
            })}
          </svg>
          {eligibleEntities.map((entity) => {
            const layout = markerLayout.get(entity.candidateId);
            if (!layout) return null;
            const clusterSummarized = Boolean(
              summarizeClusters
              && layout.clusterId
              && !expandedClusterIds.has(layout.clusterId)
            );
            const hasModeEmphasis = effectiveEmphasizedEntityIds.size > 0;
            const selectionDims = Boolean(selectedEntityId)
              && entity.candidateId !== selectedEntityId
              && !relatedToSelected.has(entity.candidateId);
            const dimmed = (mode !== 'experience' && hasModeEmphasis && !effectiveEmphasizedEntityIds.has(entity.candidateId))
              || selectionDims;
            return (
              <SpatialEntityMarker
                key={entity.candidateId}
                ref={(node) => {
                  if (node) markerRefs.current.set(entity.candidateId, node);
                  else markerRefs.current.delete(entity.candidateId);
                }}
                entity={entity}
                selected={selectedEntityId === entity.candidateId}
                emphasized={effectiveEmphasizedEntityIds.has(entity.candidateId)}
                dimmed={dimmed || showUnresolved}
                journeyActive={mode === 'journey' && activeJourneyStep.candidateEntityIds.includes(entity.candidateId)}
                groupIndex={entityGroupIndex.get(entity.candidateId) ?? 5}
                offsetX={layout.offsetX}
                offsetY={layout.offsetY}
                markerScale={layout.markerScale}
                labelVisible={layout.labelVisible}
                clusterId={layout.clusterId}
                clusterSummarized={clusterSummarized}
                independent={independentEntityIds.has(entity.candidateId)}
                editing={editingCandidateAnchors}
                onSelect={() => {
                  setExpandedClusterMemberIds(
                    layout.clusterId
                      ? (clusters.get(layout.clusterId) ?? [entity]).map((member) => member.candidateId)
                      : []
                  );
                  onSelectEntity(entity.candidateId);
                }}
                onNavigate={(direction) => onNavigateMarker(entity, direction, interactiveEntityIds)}
                onAnchorDragStart={() => onAnchorDragStart(entity.candidateId)}
                onAnchorDragPreview={(event) => onAnchorDragPreview(entity.candidateId, event)}
                onAnchorDragCommit={(event) => onAnchorDragCommit(entity.candidateId, event)}
              />
            );
          })}
          {[...clusters].map(([clusterId, entities]) => {
            if (!summarizeClusters || expandedClusterIds.has(clusterId)) return null;
            const sortedEntities = [...entities].sort((left, right) => left.sourceNumber - right.sourceNumber);
            const points = sortedEntities.flatMap((entity) => entity.normalizedAnchor ? [entity.normalizedAnchor] : []);
            if (!points.length) return null;
            const x = points.reduce((sum, point) => sum + point.x, 0) / points.length;
            const y = points.reduce((sum, point) => sum + point.y, 0) / points.length;
            return (
              <button
                key={clusterId}
                data-testid={clusterId}
                type="button"
                className="sc-marker-cluster"
                style={{ '--cluster-x': `${x * 100}%`, '--cluster-y': `${y * 100}%` } as CSSProperties}
                aria-label={`مجموعة تضم ${destinationCountAr(sortedEntities.length)}؛ اختر لكشف عناصرها`}
                data-contained-entity-ids={sortedEntities.map((entity) => entity.candidateId).join(' ')}
                onClick={() => {
                  const candidateEntityId = sortedEntities[0]!.candidateId;
                  setExpandedClusterMemberIds(sortedEntities.map((entity) => entity.candidateId));
                  window.requestAnimationFrame(() => markerRefs.current.get(candidateEntityId)?.focus());
                }}
              >
                <Layers3 aria-hidden="true" />
                <span>{sortedEntities.length}</span>
              </button>
            );
          })}
        </div> : null}
        {showUnresolved || executiveObjectOnly ? (
          <div data-testid="canvas-unresolved-show" className="sc-map-unresolved">
            <CircleDashed aria-hidden="true" />
            <strong>{showUnresolved ? `${activeJourneyStep.labelAr}: موقع غير محسوم` : 'القرار مرتبط بكائن تجربة بلا مرساة مكانية'}</strong>
            <span>لا توجد نقطة خفية أو بديلة على الخريطة.</span>
          </div>
        ) : null}
      </OptionalLocalSourceImage>
    </div>
  );
}

function ConnectionLayer({
  configuration,
  entities,
  mode,
  activeJourneyStep
}: {
  configuration: SpatialCommandExperienceConfiguration;
  entities: CandidateSpatialEntity[];
  mode: SpatialCommandMode;
  activeJourneyStep: NarrativeJourneyStep;
}) {
  const width = 1000;
  const height = 780;
  const anchor = (candidateId: string) => {
    const normalized = entities.find((entity) => entity.candidateId === candidateId)?.normalizedAnchor;
    return normalized ? { x: normalized.x * width, y: normalized.y * height } : null;
  };
  const experienceLines = configuration.entityRelationships
    .filter((relationship) => relationship.experienceObjectId && relationship.candidateEntityIds.length > 1)
    .map((relationship) => ({
      id: relationship.relationshipId,
      state: relationship.state,
      points: relationship.candidateEntityIds.map(anchor).filter((point): point is NonNullable<typeof point> => Boolean(point))
    }));
  const journeyStepById = new Map(configuration.narrativeJourney.steps.map((step) => [step.stepId, step]));
  const journeyLines = configuration.narrativeJourney.connections.map((connection) => {
    const from = journeyStepById.get(connection.fromStepId);
    const to = journeyStepById.get(connection.toStepId);
    const fromPoint = averagePoint((from?.candidateEntityIds ?? []).map(anchor).filter((point): point is NonNullable<typeof point> => Boolean(point)));
    const toPoint = averagePoint((to?.candidateEntityIds ?? []).map(anchor).filter((point): point is NonNullable<typeof point> => Boolean(point)));
    return { id: connection.narrativeConnectionId, fromPoint, toPoint };
  }).filter((line) => line.fromPoint && line.toPoint);
  return (
    <svg className={`sc-connection-layer is-${mode}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      {mode === 'experience' ? experienceLines.map((line, index) => (
        <polyline key={line.id} className={`is-${line.state}`} data-group-index={index} points={line.points.map((point) => `${point.x},${point.y}`).join(' ')} />
      )) : null}
      {mode === 'journey' ? journeyLines.map((line) => (
        <line
          key={line.id}
          className={activeJourneyStep.stepId === journeyStepById.get(configuration.narrativeJourney.connections.find((connection) => connection.narrativeConnectionId === line.id)?.toStepId ?? '')?.stepId ? 'is-active' : undefined}
          x1={line.fromPoint!.x}
          y1={line.fromPoint!.y}
          x2={line.toPoint!.x}
          y2={line.toPoint!.y}
        />
      )) : null}
    </svg>
  );
}

function averagePoint(points: Array<{ x: number; y: number }>): { x: number; y: number } | null {
  if (!points.length) return null;
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length
  };
}

function destinationCountAr(count: number): string {
  if (count === 1) return 'وجهة واحدة';
  if (count === 2) return 'وجهتين';
  if (count <= 10) return `${count} وجهات`;
  return `${count} وجهة`;
}

function ExecutiveSummary({ configuration }: { configuration: SpatialCommandExperienceConfiguration }) {
  const terminologyConflictCount = configuration.executiveBlockers.filter((blocker) => blocker.category === 'terminology').length;
  const unresolvedExperienceCount = configuration.entityRelationships.filter((relationship) => relationship.experienceObjectId && relationship.state === 'unresolved').length;
  const independentEntityCount = configuration.entityRelationships
    .filter((relationship) => relationship.experienceObjectId === null)
    .reduce((count, relationship) => count + relationship.candidateEntityIds.length, 0);
  const missingGeometryControlCount = [
    configuration.truthContext.scaleStatus,
    configuration.truthContext.crsStatus,
    configuration.truthContext.drawingApprovalStatus,
    configuration.truthContext.calibrationStatus
  ].filter((status) => ['unknown', 'missing', 'incomplete'].includes(status)).length;
  return (
    <div data-testid="executive-candidate-summary" className="sc-executive-summary" aria-label="ملخص حالة حزمة المشروع المرشحة">
      <span><strong>{configuration.candidateEntities.length}</strong>وجهة مرشحة</span>
      <span><strong>{configuration.experienceObjects.length}</strong>كائنات تجربة</span>
      <span><strong>{terminologyConflictCount}</strong>تعارض مصطلحي</span>
      <span><strong>{unresolvedExperienceCount}</strong>تجربة بلا موقع</span>
      <span><strong>{independentEntityCount}</strong>معالم مستقلة</span>
      <span><strong>{missingGeometryControlCount}</strong>ضوابط هندسية مفقودة</span>
      <span className="is-risk"><strong>{configuration.sourceTruth.riskIds.length}</strong>خطر نزاهة مصدر</span>
    </div>
  );
}

function WorkingCadLayer({
  configuration,
  activeLayer
}: {
  configuration: SpatialCommandExperienceConfiguration;
  activeLayer: SpatialCommandSourceLayer;
}) {
  const source = configuration.sourceTruth.sources.find((asset) => asset.sourceRole === 'working-cad');
  return (
    <div data-testid="working-cad-command-layer" className="sc-status-scene sc-cad-scene">
      <div className="sc-scene-orbit" aria-hidden="true"><i /><i /><i /></div>
      <span className="sc-status-scene-icon"><Layers3 aria-hidden="true" /></span>
      <small>مصدر CAD المعتمد</small>
      <h2>{activeLayer.operatorContext.canvasTitleAr}</h2>
      <p>{activeLayer.operatorContext.canvasSummaryAr}</p>
      <div className="sc-cad-flow">
        <span><Fingerprint aria-hidden="true" /><strong>بصمة متطابقة</strong><small>{source?.observedSha256?.slice(0, 12)}…</small></span>
        <i><Check aria-hidden="true" /></i>
        <span><ShieldCheck aria-hidden="true" /><strong>مصدر عمل</strong><small>ليس هندسة نهائية</small></span>
        <i className="is-pending">···</i>
        <span className="is-pending"><CircleDashed aria-hidden="true" /><strong>التحويل والمواءمة</strong><small>معلّقان</small></span>
      </div>
      <p className="sc-scene-caveat"><LockKeyhole aria-hidden="true" />لا يثبت إحداثيات مساحية أو خط أساس تشغيلي.</p>
    </div>
  );
}

function ConceptLayer({ activeLayer }: { activeLayer: SpatialCommandSourceLayer }) {
  if (!activeLayer.previewUrl) return <MissingLocalPreview />;
  return (
    <div data-testid="concept-command-layer" className="sc-concept-scene">
      <OptionalLocalSourceImage
        src={activeLayer.previewUrl}
        alt={`معاينة ${activeLayer.labelAr}`}
        missingTitleAr="معاينة المرجع المفاهيمي غير متاحة محليًا"
        missingMessageAr="لا تُحمّل المنصة العرض الأصلي، ولم تُستخدم صورة بديلة."
      />
      <div className="sc-concept-caption">
        <FileImage aria-hidden="true" />
        <div><small>{activeLayer.operatorContext.canvasTitleAr}</small><strong>{activeLayer.operatorContext.canvasSummaryAr}</strong></div>
      </div>
    </div>
  );
}

function EvidenceLayer({
  configuration,
  activeLayer
}: {
  configuration: SpatialCommandExperienceConfiguration;
  activeLayer: SpatialCommandSourceLayer;
}) {
  const inventory = configuration.evidenceSummary.inventory;
  return (
    <div data-testid="field-evidence-command-layer" className="sc-evidence-scene">
      <div className="sc-evidence-hero">
        <div><small>{activeLayer.operatorContext.eyebrowAr}</small><h2>{activeLayer.operatorContext.canvasTitleAr}</h2><p>{activeLayer.operatorContext.canvasSummaryAr}</p></div>
        <div className="sc-evidence-totals">
          <span><Camera aria-hidden="true" /><strong>{inventory.photographCount}</strong><small>صورة</small></span>
          <span><Video aria-hidden="true" /><strong>{inventory.videoCount}</strong><small>فيديوهات</small></span>
        </div>
      </div>
      <div className="sc-evidence-categories">
        {inventory.categories.map((category) => (
          <article key={category.categoryId}>
            {category.mediaType === 'image' ? <Camera aria-hidden="true" /> : <Video aria-hidden="true" />}
            <strong>{category.labelAr}</strong>
            <span>{category.reviewedCount}</span>
          </article>
        ))}
      </div>
      <div data-testid="field-evidence-privacy" className="sc-evidence-privacy">
        <LockKeyhole aria-hidden="true" />
        <div><strong>GPS تحت العزل</strong><p>يُسجّل وجود بيانات الموقع فقط؛ لا تُعرض إحداثيات دقيقة أو هوية أشخاص في المتصفح.</p></div>
        <span>لا يغيّر الجاهزية</span>
      </div>
    </div>
  );
}

function MissingVisitorMapLayer({
  activeLayer,
  specificationAvailable,
  onOpenSpecification
}: {
  activeLayer: SpatialCommandSourceLayer;
  specificationAvailable: boolean;
  onOpenSpecification: () => void;
}) {
  return (
    <div data-testid="missing-visitor-map-command-layer" className="sc-status-scene sc-missing-map-scene">
      <div className="sc-missing-map-art" aria-hidden="true">
        <MapIcon />
        <i /><i /><i />
      </div>
      <small>مدخل إنتاج مفقود</small>
      <h2>{activeLayer.operatorContext.canvasTitleAr}</h2>
      <p>{activeLayer.operatorContext.canvasSummaryAr}</p>
      <button type="button" disabled={!specificationAvailable} onClick={onOpenSpecification}><Images aria-hidden="true" />فتح مواصفة التسليم</button>
      <span>{activeLayer.operatorContext.facts.map((fact) => fact.valueAr).join(' · ')}</span>
    </div>
  );
}

function MissingLocalPreview() {
  return (
    <div data-testid="local-preview-missing" className="sc-status-scene sc-preview-missing">
      <MapPinned aria-hidden="true" />
      <h2>مشتق المراجعة المحلي غير متاح</h2>
      <p>تعمل الحزمة دون الأصل المحلي بأمان، ولم يُستخدم مشروع أو مصدر بديل.</p>
    </div>
  );
}

function MapLegend({ mode }: { mode: SpatialCommandMode }) {
  return (
    <div className="sc-map-legend" aria-label="مفتاح حالة الخريطة">
      {mode === 'journey' ? <span className="is-narrative"><i />تسلسل قصصي — ليس مسارًا ميدانيًا معتمدًا</span> : null}
      <span className="is-linked"><i />{mode === 'experience' ? 'علاقة تجربة مرشحة' : 'مرتبط مرشح'}</span>
      <span className="is-conflict"><i />متعارض</span>
      <span className="is-unresolved"><i />غير محسوم</span>
      <span className="is-independent"><i />معلم مستقل</span>
    </div>
  );
}
