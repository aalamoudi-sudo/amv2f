import { describe, expect, it } from 'vitest';
import { findDigitalRehearsalPlan } from '../data/digitalRehearsalPlans';
import { declutterExperienceMarkers, findExperienceTwinConfiguration } from '../data/experienceTwinConfigurations';
import { createExperienceSelection } from './experienceSelection';
import { deriveRouteDesignConvergence } from './experienceRouteDesignConvergence';
import { projectExperienceTruth } from './experienceProjection';
import { resolveMissionContext } from './missionContext';
import { deriveMissionGraphProjection, deriveMissionTruthContext, resolveMissionMomentId } from './missionGraphProjection';

const configuration = findExperienceTwinConfiguration('PROJECT-KAP-OPENING-2026', 'EVENT-KAP-OPENING-2026', 'VENUE-KAP-001')!;
const missionUrl = 'http://local.test/?workspace=experience-twin&project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001&mission=canvas&missionView=world&missionLens=experience&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&step=STEP-KAP-PREOPEN-AGES&routeJourney=JOURNEY-KAP-20261031-WORKERS-V11&routeWaypoint=JOURNEY-KAP-20261031-WORKERS-V11-WP-E&entity=ENTITY-KAP-OP-006&zone=ZONE-AGES-TUNNEL-001';

function project(url = missionUrl) {
  const location = new URL(url);
  const selection = createExperienceSelection(configuration.pack, location, configuration.storyMapDefinition, configuration.sceneRegistry, configuration.designExperience, configuration.operationalJourneyPackage);
  const routeProjection = deriveRouteDesignConvergence(selection, configuration.operationalJourneyPackage, configuration.designExperience);
  const rehearsalPlan = findDigitalRehearsalPlan(selection.projectId, selection.eventId);
  const truthContext = deriveMissionTruthContext(configuration.pack, selection, routeProjection, configuration.sourceStatusAr);
  const currentProjection = projectExperienceTruth(configuration.pack, {
    readinessDisposition: configuration.readinessDisposition,
    readinessExplanationAr: configuration.readinessExplanationAr,
    knownDecisionIds: [],
    knownEvidenceIds: [],
    sourceStatusAr: configuration.sourceStatusAr
  }).find((candidate) => candidate.journeyStepId === selection.journeyStepId) ?? null;
  const context = resolveMissionContext({
    pack: configuration.pack,
    selection,
    location,
    momentId: resolveMissionMomentId(rehearsalPlan, selection),
    sceneId: routeProjection.designScene?.sceneId ?? null,
    decisionId: currentProjection?.relatedDecisionIds[0] ?? null,
    truthContext
  }).context!;
  return deriveMissionGraphProjection({
    context,
    pack: configuration.pack,
    selection,
    projectLabelAr: configuration.projectLabelAr,
    eventLabelAr: configuration.eventWindowAr,
    readinessDisposition: configuration.readinessDisposition,
    readinessExplanationAr: configuration.readinessExplanationAr,
    sourceStatusAr: configuration.sourceStatusAr,
    markers: declutterExperienceMarkers(configuration.mapMarkers),
    routeProjection,
    operationalProjection: currentProjection,
    designExperience: configuration.designExperience,
    rehearsalPlan
  });
}

describe('MissionGraphProjection', () => {
  it('composes route, design, operations, decision and rehearsal around one entity without promotion', () => {
    const before = JSON.stringify({ pack: configuration.pack, routes: configuration.operationalJourneyPackage, design: configuration.designExperience });
    const projection = project();

    expect(projection.context).toMatchObject({ entityId: 'ENTITY-KAP-OP-006', zoneId: 'ZONE-AGES-TUNNEL-001', routeId: null });
    expect(projection.momentLabelAr).toBe('ممر العصور');
    expect(projection.journeySteps.find((step) => step.active)).toMatchObject({ stepId: 'JOURNEY-KAP-20261031-WORKERS-V11-WP-E', classification: 'reported' });
    expect(projection.spatial).toMatchObject({ web3dAvailable: true, registrationAvailable: false });
    expect(projection.spatial.relationshipAr).toContain('proposed / medium');
    expect(projection.operations).toMatchObject({ readinessDisposition: 'cannot-determine', liveSourceConnected: false, liveSourceMessageAr: 'لا يوجد مصدر حي متصل' });
    expect(projection.decision).toMatchObject({ legalRecordAvailable: false, approvalMutationAllowed: false });
    expect(projection.future).toMatchObject({ rehearsalAvailable: true, simulationConnected: false, simulationMessageAr: 'محرك المحاكاة غير متصل' });
    expect(projection.mutationBoundary).toEqual({ baselineMutationAllowed: false, readinessMutationAllowed: false, evidenceVerificationAllowed: false, decisionApprovalAllowed: false, routeApprovalAllowed: false, hardwareControlAllowed: false });
    expect(JSON.stringify({ pack: configuration.pack, routes: configuration.operationalJourneyPackage, design: configuration.designExperience })).toBe(before);
  });

  it('uses the same immutable projection version for screen and physical preview', () => {
    const projection = project();
    expect(projection.tangible.projectionVersion).toBe(projection.context.projectionVersion);
    expect(projection.tangible).toMatchObject({
      physicalStandardId: 'MEIOS-PDT-STD-001',
      physicalStandardVersion: '1.0.0',
      adapterStatus: 'preview-only',
      calibrationStatus: 'not-calibrated',
      hardwareConnected: false,
      hardwareControlAllowed: false,
      conformityClaimed: false
    });
  });

  it('keeps live and future engines honestly disconnected', () => {
    const live = project(`${missionUrl}&missionMode=live&missionLens=operations`);
    const future = project(`${missionUrl}&missionMode=rehearse&missionLens=future`);
    expect(live.operations.liveSourceMessageAr).toBe('لا يوجد مصدر حي متصل');
    expect(future.future.simulationMessageAr).toBe('محرك المحاكاة غير متصل');
    expect(future.future.resultAr).toContain('لا توجد نتيجة محاكاة');
  });

  it('keeps 1 November visible and route-not-applicable without a fallback line', () => {
    const location = new URL('http://local.test/?workspace=experience-twin&project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001&mission=canvas&missionView=world&day=DAY-KAP-2026-11-01&persona=PERSONA-KAP-ROYAL-VIP&journey=JOURNEY-KAP-ROYAL-2026&step=STEP-KAP-ROYAL-MAIN-SHOW');
    const selection = createExperienceSelection(configuration.pack, location, configuration.storyMapDefinition, configuration.sceneRegistry, configuration.designExperience, configuration.operationalJourneyPackage);
    const routeProjection = deriveRouteDesignConvergence(selection, configuration.operationalJourneyPackage, configuration.designExperience);
    expect(configuration.pack.eventDays.find((day) => day.eventDayId === selection.eventDayId)).toMatchObject({ operationalJourneyStatus: 'not-applicable', spatialRouteRequired: false, sharedVisitorTransitionRequired: false });
    expect(routeProjection).toMatchObject({ status: 'journey-not-applicable', journey: null, routeGeometry: null, createsSpatialRoute: false });
  });
});
