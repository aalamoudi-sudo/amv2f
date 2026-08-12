import { Canvas } from '@react-three/fiber';
import { useCallback, useMemo, useState } from 'react';
import { Color } from 'three';
import { LoadingState } from '../../components/shared/StateBlocks';
import { selectRuntimeRoutes, useEventStore } from '../../store/useEventStore';
import { OperationalScene } from './OperationalScene';
import type { SpatialEntityId, SpatialEntityRecord } from '../../types/spatial';
import type { RouteDefinition, RouteVisibility } from '../../types/routes';
import { deriveSpatialBounds } from '../../services/spatialBounds';

interface EventSceneViewportProps {
  className?: string;
  highlightedEntityIds?: SpatialEntityId[];
  entitiesOverride?: SpatialEntityRecord;
  routeDefinitionsOverride?: RouteDefinition[];
  routeVisibilityOverride?: RouteVisibility;
  selectedEntityIdOverride?: SpatialEntityId | null;
  onSelectEntityOverride?: (entityId: SpatialEntityId | null) => void;
}

export function EventSceneViewport({
  className = '',
  highlightedEntityIds: highlightedEntityIdsOverride,
  entitiesOverride,
  routeDefinitionsOverride,
  routeVisibilityOverride,
  selectedEntityIdOverride,
  onSelectEntityOverride
}: EventSceneViewportProps) {
  const storeEntities = useEventStore((state) => state.entities);
  const storeSelectedEntityId = useEventStore((state) => state.selectedEntityId);
  const highlightedEntityIds = useEventStore((state) => state.scenarioRuntime.highlightedEntityIds);
  const storeRouteVisibility = useEventStore((state) => state.routeVisibility);
  const storeRouteDefinitions = useEventStore(selectRuntimeRoutes);
  const viewMode = useEventStore((state) => state.viewMode);
  const isProjectionMode = useEventStore((state) => state.isProjectionMode);
  const projectionSettings = useEventStore((state) => state.projectionSettings);
  const cameraResetNonce = useEventStore((state) => state.cameraResetNonce);
  const storeSelectEntity = useEventStore((state) => state.selectEntity);
  const [sceneReady, setSceneReady] = useState(false);
  const [cameraSettled, setCameraSettled] = useState(true);

  const handleSceneReady = useCallback(() => setSceneReady(true), []);
  const handleCameraTransitionStart = useCallback(() => setCameraSettled(false), []);
  const handleCameraTransitionComplete = useCallback(() => setCameraSettled(true), []);

  const labelsVisible = isProjectionMode ? projectionSettings.labelsVisible : true;
  const routesVisible = isProjectionMode ? projectionSettings.routesVisible : true;
  const statusColorsVisible = isProjectionMode ? projectionSettings.statusColorsVisible : true;
  const preserveDrawingBuffer =
    typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  const sceneHighlightedEntityIds = highlightedEntityIdsOverride ?? highlightedEntityIds;
  const entities = entitiesOverride ?? storeEntities;
  const selectedEntityId = selectedEntityIdOverride === undefined ? storeSelectedEntityId : selectedEntityIdOverride;
  const routeDefinitions = routeDefinitionsOverride ?? storeRouteDefinitions;
  const routeVisibility = routeVisibilityOverride ?? storeRouteVisibility;
  const selectEntity = onSelectEntityOverride ?? storeSelectEntity;
  const spatialBounds = useMemo(
    () => deriveSpatialBounds(entities, routeDefinitions),
    [entities, routeDefinitions]
  );

  return (
    <div
      data-testid="scene-viewport"
      data-scene-ready={sceneReady ? 'true' : 'false'}
      data-camera-settled={cameraSettled ? 'true' : 'false'}
      data-camera-valid={sceneReady ? 'true' : 'false'}
      data-selected-entity={selectedEntityId ?? ''}
      data-spatial-center={`${spatialBounds.centerX},${spatialBounds.centerZ}`}
      data-spatial-size={`${spatialBounds.width},${spatialBounds.depth}`}
      className={`relative min-h-[420px] overflow-hidden bg-command-bg ${className}`}
    >
      <Canvas
        shadows
        camera={{ position: [23, 20, 23], fov: 42, near: 0.1, far: 240 }}
        dpr={[1, 1.5]}
        // Local review readback needs a stable framebuffer; deployed builds keep the faster default.
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor('#07110f', 1);
          scene.background = new Color('#07110f');
        }}
      >
        <OperationalScene
          entities={entities}
          selectedEntityId={selectedEntityId}
          highlightedEntityIds={sceneHighlightedEntityIds}
          routeVisibility={routeVisibility}
          routeDefinitions={routeDefinitions}
          viewMode={viewMode}
          isProjectionMode={isProjectionMode}
          projectionSettings={projectionSettings}
          cameraResetNonce={cameraResetNonce}
          labelsVisible={labelsVisible}
          routesVisible={routesVisible}
          statusColorsVisible={statusColorsVisible}
          spatialBounds={spatialBounds}
          onSelectEntity={selectEntity}
          onSceneReady={handleSceneReady}
          onCameraTransitionStart={handleCameraTransitionStart}
          onCameraTransitionComplete={handleCameraTransitionComplete}
        />
      </Canvas>
      {!sceneReady ? <div className="pointer-events-none absolute inset-0"><LoadingState title="جاري تجهيز المشهد" message="يتم بناء الموقع التشغيلي المؤقت." /></div> : null}
      {!isProjectionMode ? (
        <>
          <div className="pointer-events-none absolute bottom-4 right-4 rounded border border-command-line bg-command-panel/90 px-3 py-2 text-xs text-command-muted">
            المشهد قابل للتحديد والتحريك · البيانات محلية
          </div>
          <div data-testid="scene-spatial-extent" className="pointer-events-none absolute bottom-4 left-4 rounded border border-command-line bg-command-panel/90 px-3 py-2 text-xs text-command-muted">
            نطاق مكاني محلي: <span className="ltr inline-block">{spatialBounds.width.toFixed(1)} × {spatialBounds.depth.toFixed(1)} m</span>
          </div>
        </>
      ) : null}
    </div>
  );
}
