import { describe, expect, it } from 'vitest';
import { kapCandidateSpatialIntake } from '../data/kapCandidateSpatialIntake';
import { kapDigitalRehearsalCandidatePlan } from '../data/digitalRehearsalPlans';
import { kapFourDayExperienceTruthProjection } from '../data/experienceReviewProjections';
import { kapNovember1FounderTruthCorrection } from '../data/kapNovember1FounderTruthCorrection';
import type { FourDayExperienceTruthProjection } from '../types/experienceSourceReconciliation';
import {
  calculateFourDayExperienceTruthHash,
  clientSafeExperienceProjection,
  materializeFourDayExperienceTruthProjection,
  validateFourDayExperienceTruthProjection
} from './experienceSourceReconciliation';

function clone(): FourDayExperienceTruthProjection {
  return structuredClone(kapFourDayExperienceTruthProjection);
}

describe('EX.1F source reconciliation and four-day truth projection', () => {
  it('preserves the three founder-supplied snapshots and adds V.11 as a separate operations candidate', () => {
    const founderSources = kapFourDayExperienceTruthProjection.sourceManifests.filter(
      (source) => source.sourceClassification === 'founder-supplied-working-candidate'
    );
    expect(founderSources).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceId: 'SOURCE-KAP-PRESENTATION-V16-20260712', expectedByteSize: 35_931_866, expectedSha256: '9663f853eda07ac131a0390968b0ff5e3cf4e0d6e72137050b15a18daac8099d', pageCount: 66 }),
      expect.objectContaining({ sourceId: 'SOURCE-KAP-ENTRY-PROPOSALS-V02', expectedByteSize: 8_308_681, expectedSha256: 'fb0e49911732175d208758755d1fba43549ea84f5ddd16dcf6b0a863dd8092fc', pageCount: 10 }),
      expect.objectContaining({ sourceId: 'SOURCE-KAP-LAUNCH-GENERAL-BOOK', expectedByteSize: 95_497_715, expectedSha256: 'b1d0247dc1551b91f086b2bb556b166bd319a1a01f62cc04a520fc4b2b9b02a4', pageCount: 246 })
    ]));
    expect(founderSources).toHaveLength(3);
    expect(kapFourDayExperienceTruthProjection.sourceManifests).toHaveLength(4);
    expect(kapFourDayExperienceTruthProjection.sourceManifests).toContainEqual(expect.objectContaining({
      sourceId: 'SOURCE-LOCAL-a5befcff7e2bb8b4',
      sourceClassification: 'source-backed-candidate',
      expectedByteSize: 3_201_469,
      expectedSha256: 'a5befcff7e2bb8b44c09123fe7fb730eec79bd57bd37398fa9a09753e55b5377',
      pageCount: 7,
      operationalUsability: 'candidate-context-only'
    }));
    expect(kapFourDayExperienceTruthProjection.sourceManifests.every((source) => source.retentionStatus === 'raw-source-outside-git')).toBe(true);
  });

  it('materializes a deterministic deeply immutable projection', () => {
    const first = materializeFourDayExperienceTruthProjection(clone());
    const second = materializeFourDayExperienceTruthProjection(clone());
    expect(first.contentHash).toBe(second.contentHash);
    expect(first.contentHash).toBe(calculateFourDayExperienceTruthHash(first));
    expect(validateFourDayExperienceTruthProjection(first)).toEqual({ valid: true, issues: [] });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.days)).toBe(true);
    expect(Object.isFrozen(first.sourceFacts[0]?.trace)).toBe(true);
  });

  it('preserves all rehearsal and destination identities without deriving readiness', () => {
    expect(kapFourDayExperienceTruthProjection.preservedCounts).toEqual({
      programMoments: kapDigitalRehearsalCandidatePlan.moments.length,
      personaVariants: kapDigitalRehearsalCandidatePlan.personaVariants.length,
      executionSteps: kapDigitalRehearsalCandidatePlan.executionSteps.length,
      candidateDestinations: kapCandidateSpatialIntake.candidateEntities.length
    });
    expect(kapFourDayExperienceTruthProjection.preservedCounts).toEqual({ programMoments: 45, personaVariants: 44, executionSteps: 495, candidateDestinations: 11 });
    expect(kapFourDayExperienceTruthProjection.operationalReadiness).toBe('cannot-determine');
    expect(JSON.stringify(kapFourDayExperienceTruthProjection)).not.toMatch(/readinessPercent|operationally-ready|verified-ready/);
  });

  it('keeps the four day definitions honest and route proposals unselected', () => {
    expect(kapFourDayExperienceTruthProjection.days.map((day) => [day.date, day.attendance.value, day.attendance.qualifier])).toEqual([
      ['2026-10-31', 350, 'more-than'],
      ['2026-11-01', null, 'unknown'],
      ['2026-11-02', 100, 'approximately'],
      ['2026-11-03', 200, 'approximately']
    ]);
    expect(kapFourDayExperienceTruthProjection.days[1]).toMatchObject({
      transitionStatus: 'not-applicable',
      routeSelectionStatus: 'not-applicable',
      operationalJourneyStatus: 'not-applicable',
      visitorJourneyStatus: 'not-applicable',
      spatialRouteRequired: false,
      sharedVisitorTransitionRequired: false,
      contextRelationship: 'separate-ceremony-activation-contexts-no-shared-transition',
      truthClassification: 'source-backed-candidate'
    });
    expect(kapFourDayExperienceTruthProjection.routePlans).toHaveLength(3);
    expect(kapFourDayExperienceTruthProjection.routePlans.every((route) => !route.selected && !route.approved && !route.geometryIngested)).toBe(true);
    expect(kapFourDayExperienceTruthProjection.days[1]!.conflictIds).not.toContain('CONFLICT-KAP-DAY2-TRANSITION');
  });

  it('preserves the founder corrections as an immutable lineage without erasing R2 or R3', () => {
    expect(kapFourDayExperienceTruthProjection).toMatchObject({
      projectionId: 'EXPERIENCE-TRUTH-KAP-FOUR-DAY-R4',
      revision: 4,
      supersedesProjectionId: 'EXPERIENCE-TRUTH-KAP-FOUR-DAY-R3',
      previousContentHash: 'bf72dbd16aee51e827633ba631db81f4c796b833022ff1d8f8dbe2b8e0577c08'
    });
    expect(kapFourDayExperienceTruthProjection.revisionLineage.map((item) => item.projectionId)).toEqual([
      'EXPERIENCE-TRUTH-KAP-FOUR-DAY-R2',
      'EXPERIENCE-TRUTH-KAP-FOUR-DAY-R3'
    ]);
    expect(kapFourDayExperienceTruthProjection.correctionRevisions).toContainEqual(expect.objectContaining({
      correctionId: 'TRUTH-CORRECTION-KAP-20261101-R1',
      authorityReferenceId: 'FOUNDER-DIRECTIVE-KAP-20261101-NO-OPERATIONS',
      affectedDayId: 'DAY-KAP-2026-11-01',
      previousProjectionId: 'EXPERIENCE-TRUTH-KAP-FOUR-DAY-R2',
      operationalJourneyStatus: 'not-applicable',
      visitorJourneyStatus: 'not-applicable',
      spatialRouteRequired: false,
      sharedVisitorTransitionRequired: false
    }));
  });

  it('preserves the operational name, creative candidate and unresolved show boundary', () => {
    const ages = kapFourDayExperienceTruthProjection.destinations.find((item) => item.entityId === 'ENTITY-KAP-OP-006');
    expect(ages).toMatchObject({ labelAr: 'ممر العصور', creativeLabelAr: 'أرشيف الأرض', spatialStatus: 'conflicted', engineeringStatus: 'unverified', operationalStatus: 'unavailable' });
    expect(kapFourDayExperienceTruthProjection.destinations).toHaveLength(11);
    expect(kapFourDayExperienceTruthProjection.destinations.some((item) => item.entityId === 'ZONE-SHOW-001')).toBe(false);
    expect(kapFourDayExperienceTruthProjection.unresolvedSpatialObjectIds).toEqual(['ZONE-SHOW-001']);
    expect(kapFourDayExperienceTruthProjection.sourceConflicts.some((item) => item.conflictId === 'CONFLICT-KAP-AGES-TERMINOLOGY')).toBe(true);
  });

  it('keeps the complete conflict register visible without restricted HSE details', () => {
    const expected = [
      'CONFLICT-KAP-ATTENDANCE-TOTAL', 'CONFLICT-KAP-DAY2-ATTENDANCE', 'CONFLICT-KAP-DAY3-ROUTES',
      'CONFLICT-KAP-OVERVIEW-TIMES', 'CONFLICT-KAP-DAY1-TIME', 'CONFLICT-KAP-DAY4-ROLE',
      'CONFLICT-KAP-MEMORIAL-DESCRIPTION', 'CONFLICT-KAP-FIREWORKS-DURATION', 'CONFLICT-KAP-ROUTE-HEADINGS',
      'CONFLICT-KAP-ROUTE-AUTHORITY-LANGUAGE', 'CONFLICT-KAP-FLAT-NOT-360', 'CONFLICT-KAP-AGES-TERMINOLOGY',
      'CONFLICT-KAP-FIREWORKS-RESTRICTED'
    ];
    expect(kapFourDayExperienceTruthProjection.sourceConflicts.map((item) => item.conflictId)).toEqual(expected);
    expect(kapFourDayExperienceTruthProjection.sourceConflicts.some((item) => item.conflictId === 'CONFLICT-KAP-DAY2-TRANSITION')).toBe(false);
    expect(kapNovember1FounderTruthCorrection.supersededConflictIds).toContain('CONFLICT-KAP-DAY2-TRANSITION');
    const restricted = kapFourDayExperienceTruthProjection.sourceFacts.find((item) => item.factId === 'FACT-KAP-FIREWORKS-RESTRICTED');
    expect(restricted).toMatchObject({ classification: 'restricted', resolutionStatus: 'restricted-pending-authority', trace: { clientVisibility: 'hidden', operationalUsability: 'blocked' } });
    expect(kapFourDayExperienceTruthProjection.sourceFacts.find((item) => item.factId === 'FACT-KAP-V11-MEDIA-TOTAL')).toMatchObject({ value: 255, resolutionStatus: 'superseded', conflictIds: [] });
    expect(kapFourDayExperienceTruthProjection.days.find((item) => item.dayId === 'DAY-KAP-2026-11-03')?.conflictIds).not.toContain('CONFLICT-KAP-V11-MEDIA-TIME');
    expect(JSON.stringify(kapFourDayExperienceTruthProjection)).not.toMatch(/24\.7\d|46\.7\d|150\s*m|150\s*متر/i);
  });

  it('registers candidate content and missing studio assets without promotion', () => {
    expect(kapFourDayExperienceTruthProjection.contentCandidates.filter((item) => item.contentType === 'main-show').map((item) => item.labelAr)).toEqual(['الرياض من الفتح حتى الحدائق', 'دقات الأرض', 'تقدير ملك لملك', 'سيرة الأرض', 'سفينة البقاء']);
    expect(kapFourDayExperienceTruthProjection.contentCandidates.filter((item) => item.contentType === 'intro-film')).toHaveLength(3);
    expect(kapFourDayExperienceTruthProjection.contentCandidates.filter((item) => item.contentType === 'ages-station').map((item) => item.durationMinutes)).toEqual([3, 2, 2, 2, 2, 2, 2]);
    expect(kapFourDayExperienceTruthProjection.contentCandidates.every((item) => item.approvalStatus === 'not-approved')).toBe(true);
    expect(kapFourDayExperienceTruthProjection.sceneAssetRequirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ medium: '360-panorama', availability: 'missing' }),
      expect.objectContaining({ medium: 'production-glb', availability: 'missing' }),
      expect.objectContaining({ medium: 'flat-render-reference', availability: 'available-candidate-reference' })
    ]));
  });

  it('rejects source, route and readiness tampering even after re-hashing', () => {
    const sourceTamper = clone();
    sourceTamper.sourceFacts[0]!.trace.sourceHash = 'f'.repeat(64);
    expect(validateFourDayExperienceTruthProjection(materializeFourDayExperienceTruthProjection(sourceTamper)).valid).toBe(false);

    const routeTamper = clone();
    (routeTamper.routePlans[0] as unknown as { selected: boolean }).selected = true;
    expect(validateFourDayExperienceTruthProjection(materializeFourDayExperienceTruthProjection(routeTamper)).issues.map((item) => item.code)).toContain('experience-route-candidate-promoted');

    const readinessTamper = clone();
    (readinessTamper as unknown as { operationalReadiness: string }).operationalReadiness = 'verified-ready';
    expect(validateFourDayExperienceTruthProjection(materializeFourDayExperienceTruthProjection(readinessTamper)).issues.map((item) => item.code)).toContain('experience-readiness-illegal');

    const personaTamper = clone();
    personaTamper.personas[0]!.dayIds = ['DAY-FOREIGN'];
    expect(validateFourDayExperienceTruthProjection(materializeFourDayExperienceTruthProjection(personaTamper)).issues.map((item) => item.code)).toContain('experience-persona-day-incompatible');

    const dayRouteTamper = clone();
    dayRouteTamper.days[1]!.spatialRouteRequired = true;
    expect(validateFourDayExperienceTruthProjection(materializeFourDayExperienceTruthProjection(dayRouteTamper)).issues.map((item) => item.code)).toContain('experience-day-journey-not-applicable-invalid');

    const lineageTamper = clone();
    lineageTamper.revisionLineage.pop();
    expect(validateFourDayExperienceTruthProjection(materializeFourDayExperienceTruthProjection(lineageTamper)).issues.map((item) => item.code)).toContain('experience-projection-lineage-head-mismatch');
  });

  it('creates a client-safe projection without hashes, hidden facts or technical identifiers', () => {
    const safe = clientSafeExperienceProjection(kapFourDayExperienceTruthProjection);
    expect(safe.sourceFacts.some((fact) => fact.trace.clientVisibility === 'hidden')).toBe(false);
    expect(safe.sourceManifests.every((source) => source.expectedSha256 === null && source.observedSha256 === null)).toBe(true);
    expect(JSON.stringify(safe)).not.toContain('FACT-KAP-FIREWORKS-RESTRICTED');
    expect(safe.clientPresentationSteps).toHaveLength(14);
  });

  it('validates a non-KAP fictional projection through the same generic service', () => {
    const serialized = JSON.stringify(clone())
      .replaceAll('KAP', 'GENERIC-FICTIONAL')
      .replaceAll('حدائق الملك عبدالله', 'فعالية خيالية')
      .replaceAll('قصر العوجا', 'موقع خيالي');
    const fixture = JSON.parse(serialized) as FourDayExperienceTruthProjection;
    fixture.correctionRevisions = [];
    fixture.state = 'fictional-reference';
    fixture.operationalReadiness = 'not-applicable';
    fixture.contentHash = ZERO_HASH;
    const materialized = materializeFourDayExperienceTruthProjection(fixture);
    expect(validateFourDayExperienceTruthProjection(materialized).valid).toBe(true);
    expect(JSON.stringify(materialized)).not.toMatch(/PROJECT-KAP|ENTITY-KAP|Ahmed|محمد/);
  });
});

const ZERO_HASH = '0'.repeat(64);
