import { describe, expect, it } from 'vitest';
import sourceReconciliationV4Json from '../../pilot-input/manifests/kap-ex1f-source-reconciliation-v4.json';
import { kapDigitalRehearsalPlan } from '../data/digitalRehearsalPlans';
import { kapExperienceDeliveryControlCenterProjection } from '../data/experienceDeliveryAcceleratorFixtures';
import { kapExperienceTwinPack } from '../data/experienceTwinPacks';
import {
  kapV11CandidateTouchpoints,
  kapV11OperationalJourneyPackage,
  kapV11SourceExpectation
} from '../data/kapV11OperationalJourneys';
import { kapFourDayExperienceTruthProjection } from '../data/experienceReviewProjections';
import {
  deriveOperationalJourneyDuration,
  operationalJourneyPackageCreatesSpatialRoute,
  validateOperationalJourneyCandidatePackage
} from './operationalJourneyCandidate';
import { ExperienceDeliveryIntakeGateway } from './experienceDeliveryIntake';
import type { OperationalJourneyCandidatePackage } from '../types/operationalJourneyCandidate';

const expectedJourneyIds = [
  'JOURNEY-KAP-20261031-WORKERS-V11',
  'JOURNEY-KAP-20261031-MAYOR-V11',
  'JOURNEY-KAP-20261102-LEADERSHIP-V11',
  'JOURNEY-KAP-20261102-GUESTS-V11',
  'JOURNEY-KAP-20261103-HOST-MINISTER-V11',
  'JOURNEY-KAP-20261103-MEDIA-V11'
];

function journey(id: string) {
  const result = kapV11OperationalJourneyPackage.journeys.find((candidate) => candidate.journeyId === id);
  if (!result) throw new Error(`Missing journey fixture: ${id}`);
  return result;
}

describe('EX.1F Wave B Majed V.11 candidate journey intake', () => {
  it('pins the exact verified source identity and metadata', () => {
    expect(kapV11OperationalJourneyPackage).toMatchObject({
      sourceName: 'اقتراحات الدخول V.11.pdf',
      sourceHash: 'a5befcff7e2bb8b44c09123fe7fb730eec79bd57bd37398fa9a09753e55b5377',
      sourceByteSize: 3_201_469,
      sourcePageCount: 7,
      sourceAuthority: 'operational-team-supplied-working-candidate',
      fingerprintStatus: 'verified',
      packageStatus: 'received-validated-working-candidate',
      founderReview: 'pending',
      operationalApproval: 'not-established',
      routeApproval: 'not-established'
    });
    expect(kapV11OperationalJourneyPackage.sourceMetadata).toEqual({
      producer: 'macOS 15.6 Quartz PDFContext',
      createdAtReported: '2026-08-01T22:07:00+03:00',
      modifiedAtReported: '2026-08-01T22:07:00+03:00',
      pdfVersion: '1.4',
      encrypted: false,
      pageSizePoints: { width: 1_152, height: 648 }
    });
    expect(kapV11OperationalJourneyPackage.contentHash).toBe(sourceReconciliationV4Json.v11Source.packageContentHash);
  });

  it('creates duration-corrected source-reconciliation R4 without rewriting preserved R2 or R3', () => {
    expect(kapFourDayExperienceTruthProjection).toMatchObject({
      projectionId: 'EXPERIENCE-TRUTH-KAP-FOUR-DAY-R4',
      revision: 4,
      contentHash: sourceReconciliationV4Json.contentHash,
      operationalReadiness: 'cannot-determine'
    });
    expect(sourceReconciliationV4Json).toMatchObject({
      supersedesProjectionId: 'EXPERIENCE-TRUTH-KAP-FOUR-DAY-R3',
      previousContentHash: 'bf72dbd16aee51e827633ba631db81f4c796b833022ff1d8f8dbe2b8e0577c08',
      operationalJourneyCandidateCount: 6,
      canonicalSpatialRouteCount: 0
    });
    expect(sourceReconciliationV4Json.revisionLineage).toEqual(expect.arrayContaining([
      expect.objectContaining({ projectionId: 'EXPERIENCE-TRUTH-KAP-FOUR-DAY-R2' }),
      expect.objectContaining({ projectionId: 'EXPERIENCE-TRUTH-KAP-FOUR-DAY-R3' })
    ]));
  });

  it('passes the controlled manifest preview without accepting or binding it', () => {
    const gateway = new ExperienceDeliveryIntakeGateway({
      projectId: kapFourDayExperienceTruthProjection.projectId,
      eventId: kapFourDayExperienceTruthProjection.eventId,
      venueId: kapFourDayExperienceTruthProjection.venueId,
      knownDayIds: new Set(kapFourDayExperienceTruthProjection.days.map((day) => day.dayId)),
      knownPersonaIds: new Set(kapExperienceTwinPack.personas.map((persona) => persona.personaId)),
      knownDestinationIds: new Set(kapExperienceDeliveryControlCenterProjection.destinationMappings.map((destination) => destination.destinationId))
    });
    const preview = gateway.previewOperational(kapV11OperationalJourneyPackage.manifest);
    expect(preview).toMatchObject({ valid: true, canAcceptMetadata: true, canBindProjection: false, validation: { status: 'awaiting-founder-review', blocking: false } });
    expect(preview.validation.sourceFingerprint).toBe(kapV11OperationalJourneyPackage.sourceHash);
    expect(gateway.acceptedCounts()).toEqual({ operational: 0, studio3D: 0 });
  });

  it('creates exactly six stable journey identities on pages two through seven', () => {
    expect(kapV11OperationalJourneyPackage.journeys.map((candidate) => candidate.journeyId)).toEqual(expectedJourneyIds);
    expect(kapV11OperationalJourneyPackage.journeys.map((candidate) => candidate.sourcePage)).toEqual([2, 3, 4, 5, 6, 7]);
  });

  it('scopes every page letter to its journey and never uses a bare letter as identity', () => {
    for (const candidate of kapV11OperationalJourneyPackage.journeys) {
      for (const waypoint of candidate.waypoints) {
        expect(waypoint.waypointId).toBe(`${candidate.journeyId}-WP-${waypoint.sourceLetter}`);
        expect(waypoint.waypointId).not.toBe(waypoint.sourceLetter);
        expect(waypoint.sourcePage).toBe(candidate.sourcePage);
      }
    }
  });

  it('keeps day and persona projections isolated', () => {
    expect(kapV11OperationalJourneyPackage.journeys.filter((candidate) => candidate.dayId === 'DAY-KAP-2026-10-31')).toHaveLength(2);
    expect(kapV11OperationalJourneyPackage.journeys.filter((candidate) => candidate.dayId === 'DAY-KAP-2026-11-02')).toHaveLength(2);
    expect(kapV11OperationalJourneyPackage.journeys.filter((candidate) => candidate.dayId === 'DAY-KAP-2026-11-03')).toHaveLength(2);
    expect(new Set(journey(expectedJourneyIds[0]!).personaIds)).not.toEqual(new Set(journey(expectedJourneyIds[5]!).personaIds));
  });

  it('derives timing diagnostics without replacing reported values', () => {
    const results = kapV11OperationalJourneyPackage.journeys.map((candidate) => candidate.durationReconciliation);
    expect(results.map((result) => [result.reportedTotalMinutes, result.windowDurationMinutes, result.dwellDurationMinutes, result.travelDurationMinutes, result.historicalSequentialDiagnostic.combinedCalculatedMinutes])).toEqual([
      [180, 180, 154, 23.5, 177.5],
      [124, 124, 102, 22.5, 124.5],
      [90, 90, 66, 24, 90],
      [90, 90, 71, 16.5, 87.5],
      [215, 215, 193, 24.5, 217.5],
      [275, 275, 262, 21.5, 283.5]
    ]);
    expect(results.every((result) => result.durationAccountingMode === 'inclusive' && result.componentDurationsIncludedInJourneyTotal && !result.componentsStrictlySequential)).toBe(true);
    expect(results.every((result) => !result.blockingConflict && result.status === 'internally-consistent-by-founder-clarification')).toBe(true);
    expect(results.every((result, index) => result === kapV11OperationalJourneyPackage.journeys[index]?.durationReconciliation)).toBe(true);
  });

  it('closes the media duration diagnostics while preserving the prior 255 and 8.5 minute history', () => {
    const media = journey('JOURNEY-KAP-20261103-MEDIA-V11');
    expect(media).toMatchObject({ originalSourceReportedTotalMinutes: 255, reportedTotalMinutes: 275, durationAccountingMode: 'inclusive' });
    expect(media.durationReconciliation).toMatchObject({
      authoritativeCandidateTotalMinutes: 275,
      reportedTotalMinutes: 275,
      windowDurationMinutes: 275,
      status: 'internally-consistent-by-founder-clarification',
      blockingConflict: false,
      historicalSequentialDiagnostic: {
        combinedCalculatedMinutes: 283.5,
        differenceAgainstWindowMinutes: 8.5,
        status: 'resolved-by-inclusive-duration-accounting',
        activeBlocker: false
      }
    });
    expect(kapV11OperationalJourneyPackage.conflicts.some((conflict) => conflict.conflictId.includes('MEDIA-TOTAL-VS-WINDOW'))).toBe(false);
    expect(kapV11OperationalJourneyPackage.resolvedConflicts.find((conflict) => conflict.conflictId === 'CONFLICT-KAP-V11-MEDIA-TOTAL-VS-WINDOW')).toMatchObject({ severity: 'blocking', status: 'resolved-by-founder-clarification' });
    expect(kapV11OperationalJourneyPackage.resolvedGaps).toContainEqual(expect.objectContaining({ gapId: 'DURATION-ACCOUNTING-RULE-REQUIRED', status: 'resolved-by-founder-clarification' }));
    expect(kapV11OperationalJourneyPackage.gaps.some((gap) => gap.gapId.includes('MEDIA-DURATION'))).toBe(false);
  });

  it('keeps 1 November visible but outside the applicable operational-route scope', () => {
    expect(kapV11OperationalJourneyPackage.journeys.some((candidate) => candidate.dayId === 'DAY-KAP-2026-11-01')).toBe(false);
    expect(kapV11OperationalJourneyPackage.dayScopes).toContainEqual(expect.objectContaining({
      dayId: 'DAY-KAP-2026-11-01',
      operationalJourneyStatus: 'not-applicable',
      visitorJourneyStatus: 'not-applicable',
      spatialRouteRequired: false,
      sharedVisitorTransitionRequired: false
    }));
    expect(kapV11OperationalJourneyPackage.applicableRouteDayIds).toEqual([
      'DAY-KAP-2026-10-31',
      'DAY-KAP-2026-11-02',
      'DAY-KAP-2026-11-03'
    ]);
    expect(kapV11OperationalJourneyPackage.routeScopeCoverage).toBe('complete-for-current-applicable-days');
    expect(kapV11OperationalJourneyPackage.conflicts.some((conflict) => conflict.conflictId === 'MISSING-ROUTE-PLAN-20261101')).toBe(false);
    expect(kapV11OperationalJourneyPackage.gaps.some((gap) => gap.gapId === 'GAP-KAP-V11-JOURNEY-20261101')).toBe(false);
  });

  it('preserves unknown movement modes and route registration gaps', () => {
    const unknownLegs = kapV11OperationalJourneyPackage.journeys.flatMap((candidate) => candidate.travelLegs).filter((leg) => leg.movementModeStatus === 'not-explicitly-established');
    expect(unknownLegs.length).toBeGreaterThan(0);
    expect(unknownLegs.every((leg) => leg.movementMode === 'unknown' && leg.spatialRegistrationStatus === 'unregistered')).toBe(true);
    const carEntryLegs = kapV11OperationalJourneyPackage.journeys.flatMap((candidate) => candidate.travelLegs).filter((leg) => leg.distanceMeters === 450 && leg.reportedDurationSeconds === 30);
    expect(carEntryLegs).toHaveLength(5);
    expect(carEntryLegs.every((leg) => leg.movementMode === 'car' && leg.movementModeStatus === 'explicitly-reported' && leg.durationIncludedInJourneyTotal)).toBe(true);
    expect(kapV11OperationalJourneyPackage.journeys.flatMap((candidate) => candidate.travelLegs).every((leg) => leg.durationIncludedInJourneyTotal)).toBe(true);
  });

  it('fails closed if a movement leg is double-counted or a 450m/30s entry loses its car classification', () => {
    const doubleCount = structuredClone(kapV11OperationalJourneyPackage) as OperationalJourneyCandidatePackage;
    doubleCount.journeys[0]!.travelLegs[0]!.durationIncludedInJourneyTotal = false;
    expect(validateOperationalJourneyCandidatePackage(doubleCount, kapV11SourceExpectation).map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'operational-journey-travel-duration-double-count-risk',
      'operational-journey-duration-diagnostics-mismatch'
    ]));

    const wrongMode = structuredClone(kapV11OperationalJourneyPackage) as OperationalJourneyCandidatePackage;
    wrongMode.journeys[0]!.travelLegs[0]!.movementMode = 'unknown';
    expect(validateOperationalJourneyCandidatePackage(wrongMode, kapV11SourceExpectation).map((issue) => issue.code)).toContain('operational-journey-entry-car-mode-mismatch');
  });

  it('keeps only genuine active conflicts and gaps while preserving closed duration history', () => {
    expect(kapV11OperationalJourneyPackage.conflicts.map((conflict) => conflict.conflictId)).toEqual([
      'CONFLICT-KAP-V11-MOVEMENT-MODE-MISSING',
      'CONFLICT-KAP-V11-MODERN-GARDEN-TERMINOLOGY'
    ]);
    expect(kapV11OperationalJourneyPackage.resolvedConflicts).toHaveLength(6);
    expect(kapV11OperationalJourneyPackage.gaps).toHaveLength(24);
    expect(kapV11OperationalJourneyPackage.resolvedGaps).toHaveLength(2);
  });

  it('preserves garden terminology conflict and creates only candidate touchpoints', () => {
    expect(kapV11CandidateTouchpoints.map((candidate) => candidate.touchpointId)).toEqual([
      'TOUCHPOINT-KAP-FAMILY-GARDEN-CANDIDATE',
      'TOUCHPOINT-KAP-DEVONIAN-GARDEN-CANDIDATE',
      'TOUCHPOINT-KAP-MODERN-GARDEN-CANDIDATE',
      'TOUCHPOINT-KAP-POLYNESIAN-GARDEN-CANDIDATE',
      'TOUCHPOINT-KAP-OPTIONS-GARDEN-CANDIDATE',
      'TOUCHPOINT-KAP-EXTERNAL-NATURE-GARDEN-CANDIDATE'
    ]);
    expect(kapV11CandidateTouchpoints.find((candidate) => candidate.touchpointId.includes('MODERN'))).toMatchObject({ aliasesAr: ['حديقة الحياة الحديثة'], classification: 'candidate-touchpoint', spatialRegistrationStatus: 'unregistered' });
    expect(kapV11OperationalJourneyPackage.conflicts.some((conflict) => conflict.conflictId === 'CONFLICT-KAP-V11-MODERN-GARDEN-TERMINOLOGY')).toBe(true);
  });

  it('does not create an approved SpatialRoute or mutate readiness', () => {
    expect(operationalJourneyPackageCreatesSpatialRoute(kapV11OperationalJourneyPackage)).toBe(false);
    expect(kapV11OperationalJourneyPackage.canonicalSpatialRouteCount).toBe(0);
    expect(kapExperienceDeliveryControlCenterProjection).toMatchObject({ operationalReadiness: 'cannot-determine', realPackageCounts: { operationalRoutesApproved: 0, canonicalSpatialRoutesCreated: 0 } });
    expect(kapV11OperationalJourneyPackage.rehearsalComparison).toMatchObject({ readinessMutationAllowed: false, decisionApprovalAllowed: false });
  });

  it('does not overwrite the frozen rehearsal revision', () => {
    expect(kapV11OperationalJourneyPackage.rehearsalComparison).toMatchObject({
      frozenPlanId: kapDigitalRehearsalPlan.planId,
      frozenPlanHash: kapDigitalRehearsalPlan.planHash,
      frozenPlanRevision: kapDigitalRehearsalPlan.revision,
      proposedRevisionStatus: 'preview-only',
      frozenPlanMutationAllowed: false
    });
    expect(Object.isFrozen(kapDigitalRehearsalPlan)).toBe(true);
  });

  it('keeps V.02 and V.11 as coexisting evidence pending founder review', () => {
    expect(kapV11OperationalJourneyPackage.sourceRelationship).toEqual(expect.objectContaining({
      previousSourceId: 'SOURCE-KAP-ENTRY-PROPOSALS-V02',
      relationship: 'proposed-supersession',
      status: 'pending-founder-review',
      automaticSupersessionAllowed: false
    }));
  });

  it('fails closed on source fingerprint changes and diagnostics tampering', () => {
    const changedHash = structuredClone(kapV11OperationalJourneyPackage) as OperationalJourneyCandidatePackage;
    changedHash.sourceHash = 'f'.repeat(64);
    expect(validateOperationalJourneyCandidatePackage(changedHash, kapV11SourceExpectation).map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'operational-journey-source-hash-mismatch',
      'operational-journey-content-hash-mismatch'
    ]));

    const changedDuration = structuredClone(kapV11OperationalJourneyPackage) as OperationalJourneyCandidatePackage;
    changedDuration.journeys[0]!.durationReconciliation.reportedTotalMinutes = 999;
    expect(validateOperationalJourneyCandidatePackage(changedDuration, kapV11SourceExpectation).map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'operational-journey-content-hash-mismatch',
      'operational-journey-duration-diagnostics-mismatch'
    ]));
    expect(deriveOperationalJourneyDuration(changedDuration.journeys[0]!).reportedTotalMinutes).toBe(180);
  });

  it('keeps raw source paths outside browser data and route detail outside client presentation', () => {
    const serialized = JSON.stringify(kapV11OperationalJourneyPackage);
    expect(serialized).not.toContain('/Users/');
    expect(serialized).not.toContain('private-input/');
    expect(kapV11OperationalJourneyPackage.browserPathDisclosure).toBe('redacted');
    const clientRouteStep = kapFourDayExperienceTruthProjection.clientPresentationSteps.find((step) => step.presentationStepId === 'PRESENTATION-KAP-ROUTES');
    expect(clientRouteStep?.summaryAr).toContain('تفاصيلها التشغيلية محجوبة');
    expect(clientRouteStep?.summaryAr).not.toMatch(/450|1400|255|275|JOURNEY-KAP/u);
  });

  it('keeps the package deeply immutable and isolated from fictional reference data', () => {
    expect(Object.isFrozen(kapV11OperationalJourneyPackage)).toBe(true);
    expect(Object.isFrozen(kapV11OperationalJourneyPackage.journeys[0]?.waypoints)).toBe(true);
    expect(JSON.stringify(kapV11OperationalJourneyPackage)).not.toContain('PROJECT-FICTIONAL');
    expect(JSON.stringify(kapExperienceDeliveryControlCenterProjection.fictionalDryRuns)).not.toContain('JOURNEY-KAP-2026');
  });
});
