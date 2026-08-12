import { describe, expect, it } from 'vitest';
import {
  experienceIntelligencePacks,
  demoExperienceIntelligencePack,
  kapExperienceIntelligencePack,
  unrelatedConferenceExperiencePack
} from '../data/experienceIntelligencePacks';
import type { ExperienceIntelligencePack } from '../types/experienceIntelligence';
import {
  createExperienceSession,
  getOrderedJourneyStops,
  getExperiencePresentationState,
  getProvisionalPlanDisplayState,
  parseExperienceDeepLink,
  reduceExperienceSession,
  replaceExperienceGeometry,
  resolveExperiencePack,
  validateExperienceIntelligencePack
} from './experienceIntelligence';

function clonePack(pack = kapExperienceIntelligencePack): ExperienceIntelligencePack {
  return structuredClone(pack);
}

function issueCodes(pack: ExperienceIntelligencePack) {
  return validateExperienceIntelligencePack(pack).issues.map((current) => current.code);
}

describe('Stage 3E.3 Experience Intelligence contract', () => {
  it('accepts the source-backed KAP candidate pack', () => {
    const result = validateExperienceIntelligencePack(kapExperienceIntelligencePack);
    expect(result.valid, result.issues.map((entry) => entry.messageAr).join('\n')).toBe(true);
    expect(result.pack?.stateContext).toBe('temporary-demo');
  });

  it('rejects malformed input without throwing', () => {
    expect(() => validateExperienceIntelligencePack({ experiencePoints: null })).not.toThrow();
    expect(validateExperienceIntelligencePack({ experiencePoints: null }).valid).toBe(false);
  });

  it('rejects invalid package role and launcher selection metadata', () => {
    expect(validateExperienceIntelligencePack({ ...clonePack(), packageRole: 'invalid' }).issues.map((entry) => entry.code)).toContain('experience-package-role-invalid');
    expect(validateExperienceIntelligencePack({ ...clonePack(), selectableFromLauncher: 'yes' }).issues.map((entry) => entry.code)).toContain('experience-launcher-selection-invalid');
  });

  it('keeps stable experience point and entity IDs unique', () => {
    const pack = clonePack();
    pack.experiencePoints[1]!.experiencePointId = pack.experiencePoints[0]!.experiencePointId;
    expect(issueCodes(pack)).toContain('experience-point-duplicate');
    pack.experiencePoints[1]!.experiencePointId = 'EXP-KAP-AGES-RESTORED';
    pack.experiencePoints[1]!.relatedEntityId = pack.experiencePoints[0]!.relatedEntityId;
    expect(issueCodes(pack)).toContain('experience-entity-duplicate');
  });

  it('preserves the five-stop candidate journey order', () => {
    expect(getOrderedJourneyStops(kapExperienceIntelligencePack).map((stop) => stop.experiencePointId)).toEqual([
      'EXP-KAP-ARRIVAL-001',
      'EXP-KAP-AGES-001',
      'EXP-KAP-SHOW-001',
      'EXP-KAP-PHOTO-001',
      'EXP-KAP-DINNER-001'
    ]);
  });

  it('rejects an unknown journey stop', () => {
    const pack = clonePack();
    pack.visitorJourneys[0]!.orderedStopIds[2] = 'STOP-UNKNOWN';
    expect(issueCodes(pack)).toContain('journey-order-invalid');
  });

  it('keeps missing geometry explicit and does not fabricate routes', () => {
    expect(kapExperienceIntelligencePack.experiencePoints.every((point) => point.geometryMappingStatus === 'pending')).toBe(true);
    expect(kapExperienceIntelligencePack.visitorJourneys[0]).toMatchObject({ routeId: null, routeAuthorityStatus: 'unapproved', geometryStatus: 'pending' });
  });

  it('rejects route identity while journey geometry is pending', () => {
    const pack = clonePack();
    pack.visitorJourneys[0]!.routeId = 'ROUTE-KAP-INVENTED';
    expect(issueCodes(pack)).toEqual(expect.arrayContaining(['journey-route-fabricated', 'journey-route-unapproved']));
  });

  it('keeps missing content visible rather than inventing narrative copy', () => {
    const arrival = kapExperienceIntelligencePack.experiencePoints[0]!;
    const beat = kapExperienceIntelligencePack.storyBeats[0]!;
    expect(arrival.contentStatus).toBe('missing');
    expect(beat.descriptionAr).toBeNull();
    expect(beat.operationalMessage).toBeNull();
  });

  it('requires an Arabic disclosure for an assumed date', () => {
    const pack = clonePack();
    pack.dateAssumptionMessageAr = null;
    expect(issueCodes(pack)).toContain('experience-date-assumption-missing');
  });

  it('rejects an unknown point source reference', () => {
    const pack = clonePack();
    pack.experiencePoints[0]!.sourceRefs = ['SOURCE-NOT-REGISTERED'];
    expect(issueCodes(pack)).toContain('experience-point-source-unknown');
  });

  it('rejects an unknown content source reference', () => {
    const pack = clonePack();
    pack.contentReferences[0]!.sourceId = 'SOURCE-NOT-REGISTERED';
    expect(issueCodes(pack)).toContain('experience-content-source-unknown');
  });

  it('blocks baseline classification for the candidate pack', () => {
    const pack = clonePack();
    pack.stateContext = 'baseline';
    expect(issueCodes(pack)).toContain('experience-context-unsafe');
  });

  it('switches modes without mutating the pack', () => {
    const original = clonePack();
    const state = reduceExperienceSession(createExperienceSession(original), { type: 'set-mode', mode: 'executive-command' }, original);
    expect(state.mode).toBe('executive-command');
    expect(original).toEqual(kapExperienceIntelligencePack);
  });

  it('synchronizes point selection with the journey stop', () => {
    const state = reduceExperienceSession(createExperienceSession(kapExperienceIntelligencePack), { type: 'select-point', experiencePointId: 'EXP-KAP-SHOW-001' }, kapExperienceIntelligencePack);
    expect(state.selectedExperiencePointId).toBe('EXP-KAP-SHOW-001');
    expect(state.currentStopIndex).toBe(2);
  });

  it('keeps event resolution isolated', () => {
    expect(resolveExperiencePack('EVENT-KAP-OPENING-2026', experienceIntelligencePacks)?.venueId).toBe('VENUE-KAP-001');
    expect(resolveExperiencePack('EVENT-DEMO-EXPERIENCE-001', experienceIntelligencePacks)?.eventNameAr).toBe('حزمة عرض تجريبية عامة');
    expect(resolveExperiencePack('EVENT-CONFERENCE-TEST-001', experienceIntelligencePacks)?.experiencePoints).toHaveLength(3);
    expect(resolveExperiencePack('EVENT-UNKNOWN', experienceIntelligencePacks)).toBeNull();
  });

  it('parses the direct KAP review link', () => {
    const result = parseExperienceDeepLink('?workspace=experience&event=EVENT-KAP-OPENING-2026', experienceIntelligencePacks);
    expect(result).toMatchObject({ requested: true, errorAr: null });
    expect(result.pack?.packId).toBe(kapExperienceIntelligencePack.packId);
  });

  it('fails an invalid direct link safely', () => {
    const result = parseExperienceDeepLink('?workspace=experience&event=EVENT-NOT-FOUND', experienceIntelligencePacks);
    expect(result.requested).toBe(true);
    expect(result.pack).toBeNull();
    expect(result.errorAr).toContain('غير معروف');
  });

  it('reports a missing local plan without changing the source contract', () => {
    const missing = getProvisionalPlanDisplayState(kapExperienceIntelligencePack, true);
    expect(missing).toEqual({ available: false, uri: 'kap/provisional-site-plan.png', statusAr: 'مخطط مبدئي — غير معتمد' });
    expect(kapExperienceIntelligencePack.provisionalPlan?.geometryAuthority).toBe('none');
  });

  it('labels demo and reference packages without a plan from their metadata', () => {
    expect(getProvisionalPlanDisplayState(demoExperienceIntelligencePack, true)).toEqual({ available: false, uri: null, statusAr: 'بيانات تجريبية صريحة' });
    expect(getProvisionalPlanDisplayState(unrelatedConferenceExperiencePack, true)).toEqual({ available: false, uri: null, statusAr: 'حزمة مرجعية — لا يوجد مخطط مرتبط' });
    expect(getExperiencePresentationState(demoExperienceIntelligencePack).packageLabelAr).toBe('حزمة تجريبية صريحة');
    expect(getExperiencePresentationState(unrelatedConferenceExperiencePack).packageLabelAr).toBe('حزمة مرجعية');
  });

  it('supports story play, pause, resume and reset deterministically', () => {
    let state = createExperienceSession(kapExperienceIntelligencePack);
    state = reduceExperienceSession(state, { type: 'play' }, kapExperienceIntelligencePack);
    expect(state.playbackStatus).toBe('playing');
    state = reduceExperienceSession(state, { type: 'pause' }, kapExperienceIntelligencePack);
    expect(state.playbackStatus).toBe('paused');
    state = reduceExperienceSession(state, { type: 'resume' }, kapExperienceIntelligencePack);
    state = reduceExperienceSession(state, { type: 'next' }, kapExperienceIntelligencePack);
    expect(state.currentStopIndex).toBe(1);
    state = reduceExperienceSession(state, { type: 'reset' }, kapExperienceIntelligencePack);
    expect(state).toEqual({ ...createExperienceSession(kapExperienceIntelligencePack), mode: 'experience-map' });

    const storyState = reduceExperienceSession({ ...state, mode: 'visitor-story', currentStopIndex: 2 }, { type: 'reset' }, kapExperienceIntelligencePack);
    expect(storyState.mode).toBe('visitor-story');
    expect(storyState.currentStopIndex).toBe(0);
  });

  it('opens and closes candidate projection preview without changing mode', () => {
    const initial = createExperienceSession(kapExperienceIntelligencePack);
    const opened = reduceExperienceSession(initial, { type: 'open-projection' }, kapExperienceIntelligencePack);
    const closed = reduceExperienceSession(opened, { type: 'close-projection' }, kapExperienceIntelligencePack);
    expect(opened.projectionPreviewOpen).toBe(true);
    expect(closed).toEqual(initial);
  });

  it('preserves experience IDs when approved geometry mappings arrive', () => {
    const mapped = replaceExperienceGeometry(kapExperienceIntelligencePack, { 'ZONE-AGES-TUNNEL-001': 'mapped-approved' });
    expect(mapped.experiencePoints.map((point) => point.experiencePointId)).toEqual(kapExperienceIntelligencePack.experiencePoints.map((point) => point.experiencePointId));
    expect(mapped.experiencePoints[1]?.geometryMappingStatus).toBe('mapped-approved');
    expect(mapped.journeyStops[1]?.geometryMappingStatus).toBe('mapped-approved');
  });

  it('renders an unrelated event contract without KAP identifiers or core changes', () => {
    const result = validateExperienceIntelligencePack(unrelatedConferenceExperiencePack);
    expect(result.valid, result.issues.map((entry) => entry.messageAr).join('\n')).toBe(true);
    expect(unrelatedConferenceExperiencePack.eventType).toBe('conference');
    expect(unrelatedConferenceExperiencePack.experiencePoints).toHaveLength(3);
    expect(JSON.stringify(unrelatedConferenceExperiencePack)).not.toContain('EVENT-KAP-OPENING-2026');
  });

  it('renders the explicit demo package without inheriting KAP identity', () => {
    const result = validateExperienceIntelligencePack(demoExperienceIntelligencePack);
    expect(result.valid, result.issues.map((entry) => entry.messageAr).join('\n')).toBe(true);
    expect(demoExperienceIntelligencePack.eventId).toBe('EVENT-DEMO-EXPERIENCE-001');
    expect(JSON.stringify(demoExperienceIntelligencePack)).not.toContain('EVENT-KAP-OPENING-2026');
    expect(demoExperienceIntelligencePack.governanceSnapshot.missingInputsAr[0]).toContain('بيانات تشغيلية حية');
  });

  it('contains no readiness, crowd, capacity or emotion values', () => {
    const serialized = JSON.stringify(kapExperienceIntelligencePack);
    expect(serialized).not.toMatch(/readiness|crowd|capacity|emotion/i);
  });
});
