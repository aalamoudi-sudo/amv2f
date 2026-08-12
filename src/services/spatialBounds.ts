import type { RouteDefinition } from '../types/routes';
import type { SpatialEntityRecord } from '../types/spatial';

export interface SpatialBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  width: number;
  depth: number;
  centerX: number;
  centerZ: number;
  padding: number;
}

const FALLBACK_BOUNDS = { minX: -21, maxX: 21, minZ: -14, maxZ: 14 } as const;

function finite(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

export function deriveSpatialBounds(
  entities: SpatialEntityRecord,
  routes: RouteDefinition[],
  safePaddingRatio = 0.08
): SpatialBounds {
  const xValues: number[] = [];
  const zValues: number[] = [];
  Object.values(entities).forEach((entity) => {
    const x = finite(entity.position[0]);
    const z = finite(entity.position[2]);
    const width = finite(entity.scale[0]);
    const depth = finite(entity.scale[2]);
    if (x === null || z === null) return;
    const halfWidth = Math.max(0, Math.abs(width ?? 0) / 2);
    const halfDepth = Math.max(0, Math.abs(depth ?? 0) / 2);
    xValues.push(x - halfWidth, x + halfWidth);
    zValues.push(z - halfDepth, z + halfDepth);
  });
  routes.forEach((route) => route.points.forEach(([x, , z]) => {
    if (Number.isFinite(x)) xValues.push(x);
    if (Number.isFinite(z)) zValues.push(z);
  }));

  let minX = xValues.length ? Math.min(...xValues) : FALLBACK_BOUNDS.minX;
  let maxX = xValues.length ? Math.max(...xValues) : FALLBACK_BOUNDS.maxX;
  let minZ = zValues.length ? Math.min(...zValues) : FALLBACK_BOUNDS.minZ;
  let maxZ = zValues.length ? Math.max(...zValues) : FALLBACK_BOUNDS.maxZ;
  if (maxX - minX < 2) {
    const center = (minX + maxX) / 2;
    minX = center - 5;
    maxX = center + 5;
  }
  if (maxZ - minZ < 2) {
    const center = (minZ + maxZ) / 2;
    minZ = center - 5;
    maxZ = center + 5;
  }
  const rawWidth = maxX - minX;
  const rawDepth = maxZ - minZ;
  const padding = Math.max(2, Math.max(rawWidth, rawDepth) * Math.max(0, safePaddingRatio));
  minX -= padding;
  maxX += padding;
  minZ -= padding;
  maxZ += padding;
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    width: maxX - minX,
    depth: maxZ - minZ,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    padding
  };
}

export function projectSpatialPoint(
  bounds: SpatialBounds,
  x: number,
  z: number
): { x: number; y: number } {
  return {
    x: ((x - bounds.minX) / bounds.width) * 100,
    y: ((bounds.maxZ - z) / bounds.depth) * 100
  };
}
