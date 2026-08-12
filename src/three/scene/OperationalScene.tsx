import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { SpatialEntityId, SpatialEntityRecord } from '../../types/spatial';
import type { RouteDefinition, RouteVisibility } from '../../types/routes';
import type { ProjectionSettings, ViewMode } from '../../types/projection';
import { getSelectableSceneEntities } from '../../utils/entities';
import { GroundPlane } from './GroundPlane';
import { SpatialEntityMesh } from '../zones/SpatialEntityMesh';
import { RouteLayer } from '../routes/RouteLayer';
import { CameraRig } from './CameraRig';
import type { SpatialBounds } from '../../services/spatialBounds';

interface OperationalSceneProps {
  entities: SpatialEntityRecord;
  selectedEntityId: SpatialEntityId | null;
  highlightedEntityIds: SpatialEntityId[];
  routeVisibility: RouteVisibility;
  routeDefinitions: RouteDefinition[];
  viewMode: ViewMode;
  isProjectionMode: boolean;
  projectionSettings: ProjectionSettings;
  cameraResetNonce: number;
  labelsVisible: boolean;
  routesVisible: boolean;
  statusColorsVisible: boolean;
  spatialBounds: SpatialBounds;
  onSelectEntity: (entityId: SpatialEntityId | null) => void;
  onSceneReady: () => void;
  onCameraTransitionStart: () => void;
  onCameraTransitionComplete: () => void;
}

export function OperationalScene({
  entities,
  selectedEntityId,
  highlightedEntityIds,
  routeVisibility,
  routeDefinitions,
  viewMode,
  isProjectionMode,
  projectionSettings,
  cameraResetNonce,
  labelsVisible,
  routesVisible,
  statusColorsVisible,
  spatialBounds,
  onSelectEntity,
  onSceneReady,
  onCameraTransitionStart,
  onCameraTransitionComplete
}: OperationalSceneProps) {
  const selectedEntity = selectedEntityId ? entities[selectedEntityId] : undefined;
  const sceneEntities = getSelectableSceneEntities(entities);
  const spatialSpan = Math.max(spatialBounds.width, spatialBounds.depth);

  return (
    <>
      <color attach="background" args={['#07110f']} />
      <fog attach="fog" args={['#07110f', Math.max(36, spatialSpan * 1.1), Math.max(82, spatialSpan * 3.2)]} />
      <ambientLight intensity={0.62} />
      <hemisphereLight color="#c7fff0" groundColor="#0b1512" intensity={0.72} />
      <directionalLight position={[spatialBounds.centerX + spatialSpan * 0.45, Math.max(24, spatialSpan * 0.6), spatialBounds.centerZ + spatialSpan * 0.35]} intensity={1.65} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[spatialBounds.centerX - spatialSpan * 0.35, Math.max(8, spatialSpan * 0.2), spatialBounds.centerZ + spatialSpan * 0.35]} intensity={0.9} color="#47d6b5" />
      <GroundPlane bounds={spatialBounds} />
      <group onClick={() => onSelectEntity(null)}>
        {sceneEntities.map((entity) => (
          <SpatialEntityMesh
            key={entity.id}
            entity={entity}
            selected={selectedEntityId === entity.id}
            highlighted={highlightedEntityIds.includes(entity.id)}
            labelsVisible={labelsVisible}
            statusColorsVisible={statusColorsVisible}
            onSelect={(selected) => onSelectEntity(selected.id)}
          />
        ))}
      </group>
      <RouteLayer
        routes={routeDefinitions}
        routeVisibility={routeVisibility}
        selectedEntityId={selectedEntityId}
        highlightedEntityIds={highlightedEntityIds}
        projectionRoutesVisible={routesVisible}
        onSelectRoute={onSelectEntity}
      />
      <CameraRig
        selectedEntity={selectedEntity}
        viewMode={viewMode}
        isProjectionMode={isProjectionMode}
        projectionSettings={projectionSettings}
        spatialBounds={spatialBounds}
        resetNonce={cameraResetNonce}
        onTransitionStart={onCameraTransitionStart}
        onTransitionComplete={onCameraTransitionComplete}
      />
      <SceneReadinessSignal onReady={onSceneReady} />
    </>
  );
}

function SceneReadinessSignal({ onReady }: { onReady: () => void }) {
  const { camera, gl } = useThree();
  const frameCount = useRef(0);
  const signalled = useRef(false);

  useFrame(() => {
    if (signalled.current) {
      return;
    }

    const cameraIsValid = [camera.position.x, camera.position.y, camera.position.z, camera.near, camera.far].every(Number.isFinite);
    if (cameraIsValid && gl.domElement.width > 0 && gl.domElement.height > 0 && frameCount.current++ >= 3) {
      signalled.current = true;
      onReady();
    }
  });

  return null;
}
