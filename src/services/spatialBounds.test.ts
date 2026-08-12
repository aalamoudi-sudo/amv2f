import { describe, expect, it } from 'vitest';
import { deriveSpatialBounds, projectSpatialPoint } from './spatialBounds';
import type { SpatialEntityRecord } from '../types/spatial';
import type { RouteDefinition } from '../types/routes';
import { getDefaultCameraTarget } from '../three/cameras/cameraPresets';
import { defaultProjectionSettings } from '../data/projectionPresets';

describe('data-driven spatial fit', () => {
  it('fits offset entities and routes with safe padding and finite plan coordinates', () => {
    const entities = {
      'SITE-TEST-001': {
        id: 'SITE-TEST-001', nameAr: 'موقع اختبار', nameEn: 'Test site', type: 'site', parentId: null,
        position: [240, 0, -180], rotation: [0, 0, 0], scale: [100, 0.2, 60], status: 'preparing', readiness: 60,
        riskLevel: 'medium', capacity: 100, responsibleParty: 'فريق محلي', description: 'اختبار', metadata: {}
      },
      'ZONE-TEST-001': {
        id: 'ZONE-TEST-001', nameAr: 'منطقة اختبار', nameEn: 'Test zone', type: 'zone', parentId: 'SITE-TEST-001',
        position: [270, 0.3, -165], rotation: [0, 0, 0], scale: [10, 0.6, 8], status: 'ready', readiness: 90,
        riskLevel: 'low', capacity: 50, responsibleParty: 'فريق محلي', description: 'اختبار', metadata: {}
      }
    } as SpatialEntityRecord;
    const routes = [{
      id: 'ROUTE-TEST-001', entityId: 'ROUTE-TEST-001', nameAr: 'مسار', nameEn: 'Route', type: 'visitor', descriptionAr: 'مسار',
      points: [[185, 0.3, -210], [290, 0.3, -150]], color: '#fff', secondaryColor: '#ccc', width: 0.2,
      defaultVisible: true, relatedEntityIds: ['ZONE-TEST-001'], geometrySource: 'test', authority: 'none', approvalStatus: 'draft',
      approvedBy: null, approvedAt: null, version: '1.0.0'
    }] as RouteDefinition[];
    const bounds = deriveSpatialBounds(entities, routes);
    expect(bounds.minX).toBeLessThan(185);
    expect(bounds.maxX).toBeGreaterThan(290);
    expect(bounds.centerX).toBeGreaterThan(200);
    const point = projectSpatialPoint(bounds, 270, -165);
    expect(point.x).toBeGreaterThan(0);
    expect(point.x).toBeLessThan(100);
    expect(point.y).toBeGreaterThan(0);
    expect(point.y).toBeLessThan(100);
    const topCamera = getDefaultCameraTarget('top', defaultProjectionSettings, bounds);
    expect(topCamera.target[0]).toBeCloseTo(bounds.centerX);
    expect(topCamera.target[2]).toBeCloseTo(bounds.centerZ);
    expect(topCamera.position.every(Number.isFinite)).toBe(true);
    const visibleVerticalSpan = topCamera.position[1] * Math.tan((42 / 2) * Math.PI / 180) * 2;
    expect(visibleVerticalSpan).toBeGreaterThan(Math.max(bounds.width, bounds.depth));
  });

  it('handles degenerate and empty coordinates without producing NaN', () => {
    const bounds = deriveSpatialBounds({}, []);
    expect([bounds.width, bounds.depth, bounds.centerX, bounds.centerZ].every(Number.isFinite)).toBe(true);
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.depth).toBeGreaterThan(0);
  });
});
