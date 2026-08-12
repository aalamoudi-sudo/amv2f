import { describe, expect, it } from 'vitest';
import { kapDesignExperienceConfiguration } from '../data/kapDesignExperience';
import { kapExperienceSceneRegistry } from '../data/experienceSceneRegistries';
import { kapStoryMapDefinition } from '../data/storyMapDefinitions';
import { kapV11OperationalJourneyPackage } from '../data/kapV11OperationalJourneys';
import { kapExperienceTwinPack } from '../data/experienceTwinPacks';
import { createExperienceSelection, writeExperienceSelectionToUrl } from './experienceSelection';
import { deriveRouteDesignConvergence, normalizeOperationalJourneySelection } from './experienceRouteDesignConvergence';

const baseUrl = 'http://local.test/?project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001&workspace=experience-twin';

function selection(extra: string) {
  return createExperienceSelection(
    kapExperienceTwinPack,
    new URL(`${baseUrl}${extra}`),
    kapStoryMapDefinition,
    kapExperienceSceneRegistry,
    kapDesignExperienceConfiguration,
    kapV11OperationalJourneyPackage
  );
}

describe('Stage EX.1F Wave BC route and design convergence', () => {
  it('preserves the six V.11 candidates, V.02 lineage and candidate authority', () => {
    expect(kapV11OperationalJourneyPackage.journeys).toHaveLength(6);
    expect(kapV11OperationalJourneyPackage.packageStatus).toBe('received-validated-working-candidate');
    expect(kapV11OperationalJourneyPackage.routeApproval).toBe('not-established');
    expect(kapV11OperationalJourneyPackage.canonicalSpatialRouteCount).toBe(0);
    expect(kapV11OperationalJourneyPackage.sourceRelationship).toMatchObject({
      relationship: 'proposed-supersession',
      status: 'pending-founder-review'
    });
    expect(kapV11OperationalJourneyPackage.sourceRelationship.previousSourceId).not.toBe(kapV11OperationalJourneyPackage.sourceId);
  });

  it('keeps all five 450m / 30-second entry segments as cars included in the total', () => {
    const segments = kapV11OperationalJourneyPackage.journeys.flatMap((journey) => journey.travelLegs)
      .filter((leg) => leg.distanceMeters === 450 && leg.reportedDurationSeconds === 30);
    expect(segments).toHaveLength(5);
    expect(segments.every((leg) => leg.movementMode === 'car' && leg.durationIncludedInJourneyTotal)).toBe(true);
    expect(kapV11OperationalJourneyPackage.journeys.every((journey) => journey.durationAccountingMode === 'inclusive')).toBe(true);
  });

  it('opens Web3D only for the explicit proposed medium relationship at entity 006', () => {
    const route = 'JOURNEY-KAP-20261031-WORKERS-V11';
    const waypoint = `${route}-WP-E`;
    const selected = selection(`&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&routeJourney=${route}&routeWaypoint=${waypoint}`);
    const projection = deriveRouteDesignConvergence(selected, kapV11OperationalJourneyPackage, kapDesignExperienceConfiguration);
    expect(projection.status).toBe('candidate-journey-selected');
    expect(projection.waypoint?.destinationIds).toContain('ENTITY-KAP-OP-006');
    expect(projection.designRelation).toMatchObject({ status: 'proposed', confidence: 'medium', createsSpatialRoute: false, createsApprovedGeometry: false });
    expect(projection.mayOpenDesignScene).toBe(true);
    expect(projection.routeGeometry).toBeNull();
    expect(projection.createsSpatialRoute).toBe(false);
  });

  it('does not invent a design relationship for an unrelated waypoint', () => {
    const route = 'JOURNEY-KAP-20261031-WORKERS-V11';
    const selected = selection(`&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&routeJourney=${route}&routeWaypoint=${route}-WP-A`);
    const projection = deriveRouteDesignConvergence(selected, kapV11OperationalJourneyPackage, kapDesignExperienceConfiguration);
    expect(projection.designRelation).toBeNull();
    expect(projection.designScene).toBeNull();
    expect(projection.mayOpenDesignScene).toBe(false);
    expect(projection.routeGeometry).toBeNull();
  });

  it('keeps 1 November visible but route-not-applicable while design remains independently available', () => {
    const selected = selection('&day=DAY-KAP-2026-11-01&persona=PERSONA-KAP-ROYAL-VIP');
    const projection = deriveRouteDesignConvergence(selected, kapV11OperationalJourneyPackage, kapDesignExperienceConfiguration);
    expect(kapExperienceTwinPack.eventDays.some((day) => day.eventDayId === 'DAY-KAP-2026-11-01')).toBe(true);
    expect(projection).toMatchObject({ status: 'journey-not-applicable', journey: null, waypoint: null, routeGeometry: null, createsSpatialRoute: false });
    expect(selected.operationalJourneyCandidateId).toBeNull();
    expect(selected.operationalJourneyWaypointId).toBeNull();
    expect(kapDesignExperienceConfiguration.scenes[0]?.eventDayIds).toContain('DAY-KAP-2026-11-01');
  });

  it('blocks foreign day and persona route combinations without demo fallback', () => {
    const foreign = selection('&day=DAY-KAP-2026-11-03&persona=PERSONA-KAP-MEDIA-CONTENT&routeJourney=JOURNEY-KAP-20261031-WORKERS-V11&routeWaypoint=JOURNEY-KAP-20261031-WORKERS-V11-WP-E');
    expect(foreign.operationalJourneyCandidateId).toBeNull();
    expect(foreign.operationalJourneyWaypointId).toBeNull();
    expect(deriveRouteDesignConvergence(foreign, kapV11OperationalJourneyPackage, kapDesignExperienceConfiguration).status).toBe('candidate-not-selected');
  });

  it('round-trips the exact candidate journey and waypoint in the deep link', () => {
    const route = 'JOURNEY-KAP-20261103-MEDIA-V11';
    const waypoint = `${route}-WP-E`;
    const selected = selection(`&day=DAY-KAP-2026-11-03&persona=PERSONA-KAP-MEDIA-CONTENT&routeJourney=${route}&routeWaypoint=${waypoint}&designPresentation=client`);
    const url = writeExperienceSelectionToUrl(new URL(baseUrl), selected);
    const restored = createExperienceSelection(kapExperienceTwinPack, url, kapStoryMapDefinition, kapExperienceSceneRegistry, kapDesignExperienceConfiguration, kapV11OperationalJourneyPackage);
    expect(restored).toMatchObject({ operationalJourneyCandidateId: route, operationalJourneyWaypointId: waypoint, designPresentationMode: true });
  });

  it('normalization and client state never mutate route, readiness or baseline truth', () => {
    const before = JSON.stringify(kapV11OperationalJourneyPackage);
    const selected = selection('&day=DAY-KAP-2026-11-02&persona=PERSONA-KAP-REGIONAL-LEADERSHIP');
    const normalized = normalizeOperationalJourneySelection({ ...selected, designPresentationMode: true }, kapV11OperationalJourneyPackage);
    deriveRouteDesignConvergence(normalized, kapV11OperationalJourneyPackage, kapDesignExperienceConfiguration);
    expect(JSON.stringify(kapV11OperationalJourneyPackage)).toBe(before);
    expect(kapV11OperationalJourneyPackage.rehearsalComparison).toMatchObject({ frozenPlanMutationAllowed: false, readinessMutationAllowed: false, decisionApprovalAllowed: false });
    expect(kapDesignExperienceConfiguration.scenes[0]).toMatchObject({ engineeringStatus: 'unregistered', operationalStatus: 'cannot-determine', routeStatus: 'none' });
  });
});
