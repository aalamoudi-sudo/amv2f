import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { journeys } from '../data/journeys';
import { sourceSpatialModel } from './sourceSpatialModel';
import {
  crescentRegistration,
  executiveGardenRegistrations,
  gardenSpatialRegistrations,
} from './gardenRegistration';
import {
  pointAtRegisteredProgress,
  pointToRegisteredRouteDistance,
  registeredJourneyById,
  registeredJourneys,
  registeredOptionalBranches,
  routeRegistrationAudit,
} from './registeredJourneys';
import { useRegisteredSpatialStore } from './registeredSpatialStore';

const EXPECTED_RHINO_SHA256 = 'e754894193c1da6660218757a19adc2f5dfacde7b2f27aefd35597d860007a9e';

describe('KAGA-SPATIAL-REGISTERED-V1', () => {
  beforeEach(() => {
    useRegisteredSpatialStore.setState({ journeyId: 'workers', progress: 0, playing: false, selectedStopIndex: 0 });
  });

  it('continues from the verified frozen Gate 1 Rhino baseline', () => {
    expect(sourceSpatialModel.source.sha256).toBe(EXPECTED_RHINO_SHA256);
    const metadata = JSON.parse(fs.readFileSync(path.resolve('public/kaga/spatial-registered-v1/registered-spatial-metadata.json'), 'utf8'));
    expect(metadata.sourceBaseline).toBe('KAGA-SOURCE-2D-V1');
    expect(metadata.sourceRhinoSha256).toBe(EXPECTED_RHINO_SHA256);
    expect(metadata.rawGate1PackageMutated).toBe(false);
  });

  it('exposes only named high/exact gardens and keeps unresolved entities out of executive mode', () => {
    expect(executiveGardenRegistrations).toHaveLength(3);
    expect(executiveGardenRegistrations.every((item) => ['exact', 'high'].includes(item.confidence))).toBe(true);
    expect(executiveGardenRegistrations.every((item) => item.titleAr && item.footprintId)).toBe(true);
    expect(gardenSpatialRegistrations.some((item) => item.confidence === 'unresolved')).toBe(true);
  });

  it('has one unique GeoJSON footprint for each executive garden', () => {
    const collection = JSON.parse(
      fs.readFileSync(path.resolve('public/kaga/spatial-registered-v1/registered-gardens.geojson'), 'utf8'),
    ) as { features: Array<{ properties: { canonicalGardenId: string } }> };
    const ids = collection.features.map((feature) => feature.properties.canonicalGardenId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect(executiveGardenRegistrations.every((item) => ids.includes(item.canonicalGardenId))).toBe(true);
  });

  it('keeps Crescent explicitly unresolved instead of using the Gate 1 circular candidate', () => {
    expect(crescentRegistration.confidence).toBe('unresolved');
    expect(crescentRegistration.footprintId).toBeUndefined();
  });

  it('registers all six journey stop sets inside the canonical bounds', () => {
    expect(registeredJourneys.map((journey) => journey.journeyId)).toEqual([
      'workers', 'mayor', 'prince', 'guests', 'mayorMedia', 'media',
    ]);
    registeredJourneys.forEach((journey) => {
      expect(journey.stops.length).toBeGreaterThan(0);
      journey.stops.forEach((stop) => {
        expect(stop.mapPoint[0]).toBeGreaterThanOrEqual(0);
        expect(stop.mapPoint[0]).toBeLessThanOrEqual(sourceSpatialModel.viewBox.width);
        expect(stop.mapPoint[1]).toBeGreaterThanOrEqual(0);
        expect(stop.mapPoint[1]).toBeLessThanOrEqual(sourceSpatialModel.viewBox.height);
      });
    });
  });

  it('keeps pathProgress monotonic and every stop exactly on its registered geometry', () => {
    registeredJourneys.forEach((journey) => {
      journey.stops.forEach((stop, index) => {
        if (index > 0) expect(stop.pathProgress).toBeGreaterThan(journey.stops[index - 1]!.pathProgress);
        expect(pointToRegisteredRouteDistance(stop.mapPoint, journey)).toBeLessThan(0.001);
        const marker = pointAtRegisteredProgress(journey, stop.pathProgress);
        expect(Math.hypot(marker[0] - stop.mapPoint[0], marker[1] - stop.mapPoint[1])).toBeLessThan(0.001);
      });
    });
  });

  it('lands next and previous on the same stop anchors used by marker playback', () => {
    const store = useRegisteredSpatialStore.getState();
    store.nextStop();
    let state = useRegisteredSpatialStore.getState();
    const journey = registeredJourneyById[state.journeyId];
    expect(state.progress).toBe(journey.stops[1]!.pathProgress);
    expect(pointAtRegisteredProgress(journey, state.progress)[0]).toBeCloseTo(journey.stops[1]!.mapPoint[0], 3);
    state.previousStop();
    state = useRegisteredSpatialStore.getState();
    expect(state.progress).toBe(journey.stops[0]!.pathProgress);
  });

  it('lands next and previous on exact registered anchors for all six journeys', () => {
    registeredJourneys.forEach((journey) => {
      useRegisteredSpatialStore.getState().selectJourney(journey.journeyId);

      journey.stops.forEach((stop, index) => {
        useRegisteredSpatialStore.getState().selectStop(index);
        const state = useRegisteredSpatialStore.getState();
        expect(state.progress).toBe(stop.pathProgress);
        expect(state.selectedStopIndex).toBe(index);
        const marker = pointAtRegisteredProgress(journey, state.progress);
        expect(Math.hypot(marker[0] - stop.mapPoint[0], marker[1] - stop.mapPoint[1])).toBeLessThan(0.001);
      });

      useRegisteredSpatialStore.getState().selectStop(0);
      useRegisteredSpatialStore.getState().nextStop();
      expect(useRegisteredSpatialStore.getState().progress).toBe(journey.stops[1]!.pathProgress);
      useRegisteredSpatialStore.getState().previousStop();
      expect(useRegisteredSpatialStore.getState().progress).toBe(journey.stops[0]!.pathProgress);
    });
  });

  it('keeps optional branches separate and never invokes shortest-path substitution', () => {
    expect(registeredOptionalBranches.map((branch) => branch.journeyId).sort()).toEqual(['media', 'workers']);
    expect(registeredJourneys.flatMap((journey) => journey.segments).every((segment) => segment.kind !== 'optionalBranch')).toBe(true);
    expect(registeredJourneys.flatMap((journey) => journey.segments).every((segment) => !segment.registrationMethod.includes('automatic-shortest-path'))).toBe(true);
  });

  it('pathway-registers the workers journey end-to-end', () => {
    const workers = registeredJourneyById.workers;
    expect(workers.registrationStatus).toBe('pathway-registered');
    expect(workers.segments.every((segment) => segment.geometrySource === 'rhino-pathway')).toBe(true);
    expect(workers.segments.every((segment) => segment.confidence === 'high')).toBe(true);
  });

  it('preserves event semantics and stop order for every registered journey', () => {
    registeredJourneys.forEach((registeredJourney) => {
      const eventJourney = journeys.find((journey) => journey.id === registeredJourney.journeyId)!;
      expect(registeredJourney.stops.map((stop) => stop.stopId)).toEqual(eventJourney.stops.map((stop) => stop.id));
      expect(registeredJourney.stops.map((stop) => stop.eventLabel)).toEqual(eventJourney.stops.map((stop) => stop.title));
      expect(registeredJourney.stops.map((stop) => stop.durationMinutes)).toEqual(
        eventJourney.stops.map((stop) => stop.durationMinutes),
      );
      expect(registeredJourney.eventSourcePages).toEqual(eventJourney.source.pdfPages);
    });
  });

  it('records the Gate 4/5 refinement audit without unsupported pathway promotion', () => {
    expect(routeRegistrationAudit.map((item) => item.journeyId)).toEqual([
      'workers', 'prince', 'mayorMedia', 'guests', 'media', 'mayor',
    ]);
    expect(routeRegistrationAudit.every((item) => item.automaticShortestPathUsed === false)).toBe(true);

    const workersAudit = routeRegistrationAudit[0]!;
    expect(workersAudit.outcome).toBe('frozen-pathway-registered');
    expect(workersAudit.strongestDefensibleConfidence).toBe('high');

    routeRegistrationAudit.slice(1).forEach((audit) => {
      const journey = registeredJourneyById[audit.journeyId];
      expect(audit.outcome).toBe('preserved-event-authored');
      expect(audit.strongestDefensibleConfidence).toBe('approximate');
      expect(journey.registrationStatus).toBe('physically-anchored');
      expect(journey.segments.every((segment) => segment.geometrySource === 'event-authored')).toBe(true);
      expect(journey.segments.every((segment) => segment.confidence === 'approximate')).toBe(true);
    });
  });
});
