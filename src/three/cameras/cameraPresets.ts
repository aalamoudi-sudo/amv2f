import { getProjectionPreset } from '../../data/projectionPresets';
import type { ProjectionSettings, ViewMode } from '../../types/projection';
import type { SpatialEntity } from '../../types/spatial';
import type { SpatialBounds } from '../../services/spatialBounds';

export interface CameraTarget {
  position: [number, number, number];
  target: [number, number, number];
}

const DEFAULT_OPERATOR_TARGET: CameraTarget = {
  position: [23, 20, 23],
  target: [0, 0, 0]
};

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeTuple(tuple: [number, number, number], fallback: [number, number, number]): [number, number, number] {
  return [finite(tuple[0], fallback[0]), finite(tuple[1], fallback[1]), finite(tuple[2], fallback[2])];
}

export function normalizeCameraTarget(cameraTarget: CameraTarget): CameraTarget {
  const position = normalizeTuple(cameraTarget.position, DEFAULT_OPERATOR_TARGET.position);
  const target = normalizeTuple(cameraTarget.target, DEFAULT_OPERATOR_TARGET.target);

  position[1] = Math.min(500, Math.max(4, position[1]));

  const distanceSquared = (position[0] - target[0]) ** 2 + (position[1] - target[1]) ** 2 + (position[2] - target[2]) ** 2;
  if (!Number.isFinite(distanceSquared) || distanceSquared < 36) {
    return { ...DEFAULT_OPERATOR_TARGET };
  }

  return { position, target };
}

export function getDefaultCameraTarget(
  viewMode: ViewMode,
  projectionSettings: ProjectionSettings,
  bounds?: SpatialBounds
): CameraTarget {
  const centerX = bounds?.centerX ?? 0;
  const centerZ = bounds?.centerZ ?? 0;
  const span = Math.max(bounds?.width ?? 42, bounds?.depth ?? 28);
  if (viewMode === 'top') {
    return normalizeCameraTarget({
      position: [centerX, Math.max(24, span * 1.5), centerZ + 0.1],
      target: [centerX, 0, centerZ]
    });
  }

  if (viewMode === 'projection') {
    const preset = getProjectionPreset(projectionSettings.presetId);
    const scale = Math.max(1, span / 42);
    return normalizeCameraTarget({
      position: [
        centerX + (preset.cameraPosition[0] - preset.target[0]) * scale,
        preset.cameraPosition[1] * scale,
        centerZ + (preset.cameraPosition[2] - preset.target[2]) * scale
      ],
      target: [centerX, preset.target[1], centerZ]
    });
  }

  const operatorDistance = Math.max(20, span * 0.78);
  return normalizeCameraTarget({
    position: [centerX + operatorDistance, Math.max(16, span * 0.58), centerZ + operatorDistance],
    target: [centerX, 0, centerZ]
  });
}

export function getEntityCameraTarget(
  entity: SpatialEntity | undefined,
  viewMode: ViewMode,
  projectionSettings: ProjectionSettings,
  bounds?: SpatialBounds
): CameraTarget {
  if (!entity || viewMode === 'projection') {
    return getDefaultCameraTarget(viewMode, projectionSettings, bounds);
  }

  const [x, y, z] = normalizeTuple(entity.position, [0, 0, 0]);

  if (viewMode === 'top') {
    return getDefaultCameraTarget(viewMode, projectionSettings, bounds);
  }

  // Keep the site boundary in frame while shifting the operator's attention toward the selection.
  const centerX = bounds?.centerX ?? 0;
  const centerZ = bounds?.centerZ ?? 0;
  const focusX = centerX + (x - centerX) * 0.5;
  const focusZ = centerZ + (z - centerZ) * 0.5;
  const span = Math.max(bounds?.width ?? 42, bounds?.depth ?? 28);
  const distance = Math.max(20, span * 0.7);
  return normalizeCameraTarget({
    position: [focusX + distance, Math.max(16, span * 0.52), focusZ + distance],
    target: [focusX, finite(y, 0) + 0.5, focusZ]
  });
}
