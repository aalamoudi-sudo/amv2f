import { describe, expect, it } from 'vitest';
import {
  kapDigitalRehearsalCorrectionLedger,
  kapDigitalRehearsalPlan
} from '../data/digitalRehearsalPlans';
import { kapFourDayExperienceTruthProjection } from '../data/experienceReviewProjections';
import { kapNovember1FounderTruthCorrection } from '../data/kapNovember1FounderTruthCorrection';
import { kapV11OperationalJourneyPackage } from '../data/kapV11OperationalJourneys';
import { kapStoryMapDefinition } from '../data/storyMapDefinitions';
import { validateExperienceTruthCorrection } from './experienceTruthCorrection';

const DAY_ID = 'DAY-KAP-2026-11-01';

describe('1 November 2026 founder truth correction', () => {
  it('keeps the event day visible with the exact not-applicable journey contract', () => {
    expect(kapFourDayExperienceTruthProjection.days).toHaveLength(4);
    expect(kapFourDayExperienceTruthProjection.days.find((day) => day.dayId === DAY_ID)).toMatchObject({
      operationalJourneyStatus: 'not-applicable',
      visitorJourneyStatus: 'not-applicable',
      spatialRouteRequired: false,
      sharedVisitorTransitionRequired: false,
      contextRelationship: 'separate-ceremony-activation-contexts-no-shared-transition'
    });
  });

  it('does not classify the day as a missing V.11 route or operational gap', () => {
    expect(kapV11OperationalJourneyPackage.journeys.some((journey) => journey.dayId === DAY_ID)).toBe(false);
    expect(kapV11OperationalJourneyPackage.conflicts.some((conflict) => conflict.conflictId === 'MISSING-ROUTE-PLAN-20261101')).toBe(false);
    expect(kapV11OperationalJourneyPackage.gaps.some((gap) => gap.gapId === 'GAP-KAP-V11-JOURNEY-20261101')).toBe(false);
    expect(kapV11OperationalJourneyPackage.applicableRouteDayIds).toEqual([
      'DAY-KAP-2026-10-31',
      'DAY-KAP-2026-11-02',
      'DAY-KAP-2026-11-03'
    ]);
  });

  it('draws no cross-site route, transition, distance, or travel duration', () => {
    const routes = kapStoryMapDefinition.personaRoutes.filter((route) => route.eventDayId === DAY_ID);
    expect(routes).toHaveLength(2);
    expect(routes.every((route) => route.segments.length === 0 && route.transitionIds.length === 0 && route.spatialRouteId === null)).toBe(true);
    expect(kapStoryMapDefinition.transitions).toEqual([]);
    expect(JSON.stringify(routes)).not.toMatch(/travelTime|distance/);
  });

  it('keeps the absence of a route outside readiness and operational rehearsal gates', () => {
    const day = kapDigitalRehearsalPlan.eventDays.find((candidate) => candidate.eventDayId === DAY_ID)!;
    expect(kapFourDayExperienceTruthProjection.operationalReadiness).toBe('cannot-determine');
    expect(kapDigitalRehearsalPlan.readinessMutationAllowed).toBe(false);
    expect(kapDigitalRehearsalPlan.checkpoints.some((checkpoint) => day.momentIds.includes(checkpoint.momentId))).toBe(false);
    expect(kapDigitalRehearsalPlan.contingencies.some((contingency) => contingency.affectedMomentIds.some((momentId) => day.momentIds.includes(momentId)))).toBe(false);
  });

  it('preserves the corrective revision and prior interpretation lineage', () => {
    expect(validateExperienceTruthCorrection(kapNovember1FounderTruthCorrection)).toEqual([]);
    expect(Object.isFrozen(kapNovember1FounderTruthCorrection)).toBe(true);
    expect(kapNovember1FounderTruthCorrection).toMatchObject({
      correctionId: 'TRUTH-CORRECTION-KAP-20261101-R1',
      authorityReferenceId: 'FOUNDER-DIRECTIVE-KAP-20261101-NO-OPERATIONS',
      previousProjectionId: 'EXPERIENCE-TRUTH-KAP-FOUR-DAY-R2',
      previousContentHash: '1cc36cab8a641cdad213178a3f7352df2112e54e415ab38ef625f93ea715febf'
    });
    expect(kapDigitalRehearsalCorrectionLedger).toMatchObject({
      previousFrozenRevision: 2,
      correctedCandidateRevision: 3,
      correctedFrozenRevision: 4,
      readinessMutationAllowed: false,
      operationalApprovalCreated: false
    });
  });
});
