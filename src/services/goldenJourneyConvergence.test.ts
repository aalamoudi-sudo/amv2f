import { describe, expect, it } from 'vitest';
import { findExperienceTwinConfiguration } from '../data/experienceTwinConfigurations';
import { deriveRouteDesignConvergence } from './experienceRouteDesignConvergence';
import { createExperienceSelection, writeExperienceSelectionToUrl } from './experienceSelection';

const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const baseUrl = `http://local.test/?workspace=experience-twin&project=${projectId}&event=${eventId}&venue=${venueId}`;
const configuration = findExperienceTwinConfiguration(projectId, eventId, venueId)!;

function selection(query: string) {
  return createExperienceSelection(
    configuration.pack,
    new URL(`${baseUrl}${query}`),
    configuration.storyMapDefinition,
    configuration.sceneRegistry,
    configuration.designExperience,
    configuration.operationalJourneyPackage
  );
}

describe('KAP Golden Journey convergence', () => {
  it('restores the exact Golden Journey context without creating another truth store', () => {
    const selected = selection('&golden=map&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&routeJourney=JOURNEY-KAP-20261031-WORKERS-V11&routeWaypoint=JOURNEY-KAP-20261031-WORKERS-V11-WP-E');
    const restoredUrl = writeExperienceSelectionToUrl(new URL(baseUrl), selected);
    const restored = createExperienceSelection(configuration.pack, restoredUrl, configuration.storyMapDefinition, configuration.sceneRegistry, configuration.designExperience, configuration.operationalJourneyPackage);

    expect(restored).toMatchObject({
      goldenJourneyScreen: 'map',
      eventDayId: 'DAY-KAP-2026-10-31',
      personaId: 'PERSONA-KAP-EMPLOYEE-FAMILY',
      journeyId: 'JOURNEY-KAP-PREOPEN-2026',
      operationalJourneyCandidateId: 'JOURNEY-KAP-20261031-WORKERS-V11',
      operationalJourneyWaypointId: 'JOURNEY-KAP-20261031-WORKERS-V11-WP-E'
    });
  });

  it('rejects a malformed Golden screen instead of falling back to a demo', () => {
    expect(selection('&golden=foreign-screen').goldenJourneyScreen).toBeNull();
  });

  it('opens Web3D only through the explicit proposed/medium Ages relation', () => {
    const selected = selection('&golden=map&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&routeJourney=JOURNEY-KAP-20261031-WORKERS-V11&routeWaypoint=JOURNEY-KAP-20261031-WORKERS-V11-WP-E');
    const projection = deriveRouteDesignConvergence(selected, configuration.operationalJourneyPackage, configuration.designExperience);

    expect(projection).toMatchObject({ mayOpenDesignScene: true, createsSpatialRoute: false, routeGeometry: null });
    expect(projection.designRelation).toMatchObject({ targetId: 'ENTITY-KAP-OP-006', status: 'proposed', confidence: 'medium', createsSpatialRoute: false });
  });

  it('keeps 1 November visible while route, duration, and fallback geometry remain not applicable', () => {
    const selected = selection('&golden=map&day=DAY-KAP-2026-11-01');
    const projection = deriveRouteDesignConvergence(selected, configuration.operationalJourneyPackage, configuration.designExperience);
    const day = configuration.pack.eventDays.find((candidate) => candidate.eventDayId === selected.eventDayId);

    expect(day).toMatchObject({ operationalJourneyStatus: 'not-applicable', visitorJourneyStatus: 'not-applicable', spatialRouteRequired: false, sharedVisitorTransitionRequired: false });
    expect(projection).toMatchObject({ status: 'journey-not-applicable', journey: null, routeGeometry: null, createsSpatialRoute: false });
  });

  it('does not mutate candidate routes, readiness, decisions, or the experience pack', () => {
    const before = JSON.stringify({ pack: configuration.pack, routes: configuration.operationalJourneyPackage });
    const selected = selection('&golden=scene&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&routeJourney=JOURNEY-KAP-20261031-WORKERS-V11&routeWaypoint=JOURNEY-KAP-20261031-WORKERS-V11-WP-E');
    deriveRouteDesignConvergence(selected, configuration.operationalJourneyPackage, configuration.designExperience);

    expect(configuration.readinessDisposition).toBe('cannot-determine');
    expect(configuration.operationalJourneyPackage?.canonicalSpatialRouteCount).toBe(0);
    expect(JSON.stringify({ pack: configuration.pack, routes: configuration.operationalJourneyPackage })).toBe(before);
  });
});
