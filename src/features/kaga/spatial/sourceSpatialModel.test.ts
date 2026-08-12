import { describe, expect, it } from 'vitest';
import { journeys } from '../data/journeys';
import {
  isWithinSourceSpatialBounds,
  legacyPointToSourceSpatial,
  registeredEventRoutes,
  sourceSpatialModel,
} from './sourceSpatialModel';

describe('KAGA V2 source spatial contract', () => {
  it('registers all six source-backed event route families without changing their semantics', () => {
    expect(registeredEventRoutes).toHaveLength(6);
    expect(registeredEventRoutes.map((route) => route.journeyId)).toEqual(journeys.map((journey) => journey.id));
    expect(registeredEventRoutes.every((route) => route.sourcePages.length > 0)).toBe(true);
    expect(registeredEventRoutes.every((route) => route.sourceConfidence === 'approximate')).toBe(true);
  });

  it('keeps every migrated primary stop inside the canonical Rhino-derived map bounds', () => {
    for (const journey of journeys) {
      for (const stop of journey.stops) {
        const migrated = legacyPointToSourceSpatial(stop.point);
        expect(isWithinSourceSpatialBounds(migrated), `${journey.id}:${stop.id}`).toBe(true);
      }
    }
  });

  it('publishes one canonical coordinate system for every V2 spatial asset', () => {
    expect(sourceSpatialModel.coordinateSpace).toBe('KAGA-SOURCE-2D-V1');
    expect(sourceSpatialModel.units).toBe('Rhino model metres');
    expect(sourceSpatialModel.viewBoxString).toBe('0 0 1703.16 1371.235');
    expect(sourceSpatialModel.assets.masterplanSvg).toMatch(/masterplan\.svg$/);
    expect(sourceSpatialModel.assets.gardenFootprintsSvg).toMatch(/garden-footprints\.svg$/);
  });

  it('does not promote candidate garden shapes or parking noise to resolved features', () => {
    expect(sourceSpatialModel.featureCounts.gardenFootprintCandidates).toBe(28);
    expect(sourceSpatialModel.featureCounts.parkingFootprints).toBe(0);
    expect(sourceSpatialModel.status).toBe('gate-1-provisional');
    expect(sourceSpatialModel.crs).toBeNull();
  });
});
