import { describe, expect, it } from 'vitest';
import { defaultProjectionSettings } from '../../data/projectionPresets';
import { demoSpatialEntities } from '../../data/entities';
import { getDefaultCameraTarget, getEntityCameraTarget, normalizeCameraTarget } from './cameraPresets';

function expectValidTarget(target: ReturnType<typeof getDefaultCameraTarget>) {
  expect([...target.position, ...target.target].every(Number.isFinite)).toBe(true);
  expect(target.position[1]).toBeGreaterThanOrEqual(4);
}

describe('camera presets', () => {
  it('normalizes invalid camera coordinates to a usable operator target', () => {
    const target = normalizeCameraTarget({
      position: [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
      target: [Number.NaN, Number.NaN, Number.NaN]
    });

    expectValidTarget(target);
    expect(target.position).toEqual([23, 20, 23]);
  });

  it('keeps every supported view mode finite and site-scale', () => {
    const selectedEntity = demoSpatialEntities.find((entity) => entity.id === 'ZONE-002');

    expectValidTarget(getDefaultCameraTarget('operator', defaultProjectionSettings));
    expectValidTarget(getDefaultCameraTarget('top', defaultProjectionSettings));
    expectValidTarget(getDefaultCameraTarget('projection', defaultProjectionSettings));
    expectValidTarget(getEntityCameraTarget(selectedEntity, 'operator', defaultProjectionSettings));
    expectValidTarget(getEntityCameraTarget(selectedEntity, 'top', defaultProjectionSettings));

    const focused = getEntityCameraTarget(selectedEntity, 'operator', defaultProjectionSettings);
    expect(focused.position[0]).toBeGreaterThan(20);
    expect(focused.position[2]).toBeGreaterThan(20);
  });

  it('keeps a profile-driven projection centered on offset runtime bounds', () => {
    const target = getDefaultCameraTarget('projection', defaultProjectionSettings, {
      minX: 180,
      maxX: 320,
      minZ: -225,
      maxZ: -135,
      centerX: 250,
      centerZ: -180,
      width: 140,
      depth: 90,
      padding: 8
    });

    expect(target.target).toEqual([250, 0, -180]);
    expect(target.position[0]).toBeGreaterThan(250);
    expect(target.position[2]).toBeGreaterThan(-180);
    expect(target.position[1]).toBeGreaterThan(22);
  });
});
