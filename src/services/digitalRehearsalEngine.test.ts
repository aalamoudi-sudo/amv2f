import { beforeEach, describe, expect, it } from 'vitest';
import {
  conferenceDigitalRehearsalPlan,
  conferenceDigitalRehearsalValidationContext,
  kapDigitalRehearsalCandidatePlan,
  kapDigitalRehearsalCorrectionLedger,
  kapDigitalRehearsalPlan,
  kapDigitalRehearsalValidationContext
} from '../data/digitalRehearsalPlans';
import { DigitalRehearsalEngine, verifyRehearsalNonMutation, verifyRunContentHash } from './digitalRehearsalEngine';
import { projectToAllRehearsalOutputs } from './digitalRehearsalProjection';
import { BrowserDigitalRehearsalRepository } from './digitalRehearsalRepository';
import { validateDigitalRehearsalSchema } from './digitalRehearsalSchema';
import {
  materializeDigitalRehearsalPlan,
  materializeDigitalRehearsalRun,
  validateDigitalRehearsalPlan,
  validateDigitalRehearsalRun
} from './digitalRehearsalValidation';
import type {
  DigitalRehearsalPlan,
  DigitalRehearsalRun,
  RehearsalCommand,
  RehearsalDecisionDraftLink,
  RehearsalIssue,
  RehearsalObservation
} from '../types/digitalRehearsal';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const engine = new DigitalRehearsalEngine(kapDigitalRehearsalValidationContext);
let commandIndex = 0;

function nextTime(): string {
  commandIndex += 1;
  return `2026-08-01T02:${String(commandIndex).padStart(2, '0')}:00.000Z`;
}

function createRun(dayIndex = 0, personaIndex = 0, runId = `REHEARSAL-RUN-TEST-${dayIndex}-${personaIndex}`): DigitalRehearsalRun {
  const day = kapDigitalRehearsalPlan.eventDays[dayIndex]!;
  return engine.createRun(kapDigitalRehearsalPlan, {
    runId,
    eventDayId: day.eventDayId,
    personaVariantId: day.personaVariantIds[personaIndex]!,
    rehearsalLens: 'visitor',
    rehearsalScenarioId: kapDigitalRehearsalPlan.scenarioId,
    timeMode: 'manual-step',
    commandId: `${runId}-CREATE`,
    actorSessionRef: 'LOCAL-TEST-SESSION',
    createdAt: '2026-08-01T02:00:00.000Z'
  });
}

function makeCommand(run: DigitalRehearsalRun, type: RehearsalCommand['type'], payload: Record<string, unknown> = {}, commandId?: string): RehearsalCommand {
  return { commandId: commandId ?? `${run.runId}-C${commandIndex + 1}`, runId: run.runId, type, payload, issuedAt: nextTime(), timeTrust: 'local-device-time-untrusted', actorSessionRef: 'LOCAL-TEST-SESSION' };
}

function apply(run: DigitalRehearsalRun, type: RehearsalCommand['type'], payload: Record<string, unknown> = {}): DigitalRehearsalRun {
  const result = engine.applyCommand(kapDigitalRehearsalPlan, run, makeCommand(run, type, payload));
  expect(result.issues).toEqual([]);
  expect(result.accepted).toBe(true);
  return result.run;
}

function completeRun(source: DigitalRehearsalRun): DigitalRehearsalRun {
  let run = apply(source, 'start');
  const count = kapDigitalRehearsalPlan.eventDays.find((day) => day.eventDayId === run.eventDayId)!.momentIds.length;
  for (let index = 0; index < count; index += 1) run = apply(run, 'advance');
  return apply(run, 'complete-run');
}

describe('Stage EX.1D digital rehearsal plan', () => {
  beforeEach(() => { commandIndex = 0; });

  it('validates the frozen KAP plan and its immutable lineage', () => {
    const validation = validateDigitalRehearsalPlan(kapDigitalRehearsalPlan, kapDigitalRehearsalValidationContext);
    expect(validation.valid).toBe(true);
    expect(kapDigitalRehearsalPlan.state).toBe('frozen-for-rehearsal');
    expect(kapDigitalRehearsalPlan.previousPlanHash).toBe(kapDigitalRehearsalCandidatePlan.planHash);
    expect(kapDigitalRehearsalCandidatePlan.previousPlanHash).toBe(kapDigitalRehearsalCorrectionLedger.previousFrozenPlanHash);
    expect(kapDigitalRehearsalCorrectionLedger).toMatchObject({
      previousFrozenRevision: 2,
      correctedCandidateRevision: 3,
      correctedFrozenRevision: 4,
      readinessMutationAllowed: false,
      operationalApprovalCreated: false
    });
    expect(Object.isFrozen(kapDigitalRehearsalPlan.moments[0])).toBe(true);
  });

  it('preserves four days and source-safe attendance semantics', () => {
    expect(kapDigitalRehearsalPlan.eventDays).toHaveLength(4);
    expect(kapDigitalRehearsalPlan.eventDays.map((day) => day.momentIds.length)).toEqual([9, 11, 11, 14]);
    expect(kapDigitalRehearsalPlan.moments).toHaveLength(45);
    expect(kapDigitalRehearsalPlan.eventDays.map((day) => day.attendance.qualifier)).toEqual(['more-than', 'unknown', 'approximately', 'approximately']);
    expect(kapDigitalRehearsalPlan.eventDays[1]!.attendance.value).toBeNull();
    expect(kapDigitalRehearsalPlan.eventDays.map((day) => kapDigitalRehearsalPlan.moments.find((moment) => moment.momentId === day.momentIds.at(-1))?.labelAr)).toEqual([
      'المغادرة',
      'إغلاق تسلسل المحتوى',
      'المغادرة',
      'المغادرة'
    ]);
  });

  it('keeps 1 November as a ceremonial sequence with no operational route or readiness effect', () => {
    const day = kapDigitalRehearsalPlan.eventDays.find((candidate) => candidate.eventDayId === 'DAY-KAP-2026-11-01')!;
    const dayMoments = kapDigitalRehearsalPlan.moments.filter((moment) => moment.eventDayId === day.eventDayId);
    expect(day).toMatchObject({ operationalJourneyStatus: 'not-applicable', visitorJourneyStatus: 'not-applicable', spatialRouteRequired: false, sharedVisitorTransitionRequired: false });
    expect(dayMoments.some((moment) => moment.spatialStatus === 'multi-site-transition')).toBe(false);
    expect(kapDigitalRehearsalPlan.cues.filter((cue) => day.momentIds.includes(cue.momentId)).some((cue) => cue.cueType === 'transportation')).toBe(false);
    expect(kapDigitalRehearsalPlan.checkpoints.some((checkpoint) => day.momentIds.includes(checkpoint.momentId))).toBe(false);
    expect(kapDigitalRehearsalPlan.contingencies.some((contingency) => contingency.affectedMomentIds.some((momentId) => day.momentIds.includes(momentId)))).toBe(false);
    expect(dayMoments.find((moment) => moment.momentId.includes('NO-OPERATIONS-CORRECTION'))).toMatchObject({ siteCandidateId: null, plannedTime: null, spatialStatus: 'semantic-only' });
    expect(kapDigitalRehearsalPlan.readinessMutationAllowed).toBe(false);
    expect(kapDigitalRehearsalCorrectionLedger.truthCorrectionHash).toHaveLength(64);
    expect(kapDigitalRehearsalCorrectionLedger.authorityReferenceId).toBe('FOUNDER-DIRECTIVE-KAP-20261101-NO-OPERATIONS');
  });

  it('rejects a template-only operational perspective on 1 November without an independent source', () => {
    const day = kapDigitalRehearsalPlan.eventDays.find((candidate) => candidate.eventDayId === 'DAY-KAP-2026-11-01')!;
    const blockedPersona = day.personaVariantIds.find((personaVariantId) => {
      const steps = kapDigitalRehearsalPlan.executionSteps.filter((step) => step.personaVariantId === personaVariantId);
      return steps.length > 0 && steps.every((step) => !step.allowed);
    })!;
    expect(() => engine.createRun(kapDigitalRehearsalPlan, {
      runId: 'REHEARSAL-RUN-DAY2-BLOCKED-TEMPLATE',
      eventDayId: day.eventDayId,
      personaVariantId: blockedPersona,
      rehearsalLens: 'operations',
      rehearsalScenarioId: kapDigitalRehearsalPlan.scenarioId,
      timeMode: 'manual-step',
      commandId: 'CREATE-DAY2-BLOCKED-TEMPLATE',
      actorSessionRef: 'LOCAL-TEST-SESSION',
      createdAt: '2026-08-02T01:00:00.000Z'
    })).toThrow('مصدر مستقل');
  });

  it('keeps day two visible as independent ceremony contexts without a route or travel duration', () => {
    const day = kapDigitalRehearsalPlan.eventDays.find((item) => item.eventDayId === 'DAY-KAP-2026-11-01')!;
    const moments = day.momentIds.map((id) => kapDigitalRehearsalPlan.moments.find((moment) => moment.momentId === id)!);
    const gardensContext = moments.find((moment) => moment.siteCandidateId === 'SITE-CANDIDATE-KAP-GARDENS' && moment.journeyStepId !== null)!;
    expect(day).toBeDefined();
    expect(gardensContext.siteCandidateId).toBe('SITE-CANDIDATE-KAP-GARDENS');
    expect(gardensContext.spatialStatus).toBe('semantic-only');
    expect(gardensContext.plannedTime).toBeNull();
    expect(moments.some((moment) => moment.spatialStatus === 'multi-site-transition')).toBe(false);
    expect(kapDigitalRehearsalPlan.cues.some((cue) => cue.cueType === 'transportation' && cue.momentId === gardensContext.momentId)).toBe(false);
    expect(kapDigitalRehearsalPlan.cues.find((cue) => cue.momentId === gardensContext.momentId)?.dependencies).toEqual([]);
    expect(JSON.stringify(moments)).not.toContain('زمن الانتقال');
  });

  it('offers eleven persona perspectives per day without declaring staff assignments', () => {
    kapDigitalRehearsalPlan.eventDays.forEach((day) => expect(day.personaVariantIds).toHaveLength(11));
    expect(kapDigitalRehearsalPlan.personaVariants.filter((item) => item.truthStatus === 'template-proposed').length).toBeGreaterThan(0);
    expect(kapDigitalRehearsalPlan.executionSteps).toHaveLength(495);
  });

  it('keeps all contingencies hypothetical and blocks automatic authority claims', () => {
    expect(kapDigitalRehearsalPlan.contingencies).toHaveLength(13);
    expect(kapDigitalRehearsalPlan.contingencies.every((item) => item.truthStatus === 'hypothetical-rehearsal-only')).toBe(true);
    expect(kapDigitalRehearsalPlan.contingencies.every((item) => item.requiredDecisionAuthorityAr.includes('غير معيّنة'))).toBe(true);
  });

  it('validates all seven Draft 2020-12 schema surfaces', () => {
    const run = createRun();
    const projection = engine.exportRehearsalProjection({
      plan: kapDigitalRehearsalPlan,
      run,
      eventDayId: run.eventDayId,
      personaVariantId: run.personaVariantId,
      momentId: run.currentMomentId!,
      truth: { readinessDisposition: 'cannot-determine', readinessExplanationAr: 'غير مقيم.', knownDecisionIds: [], knownEvidenceIds: [], sceneAvailabilityByAssetId: {}, outputTimestamp: run.createdAt, outputTimestampClassification: run.timeTrust }
    });
    const output = { ...projection, physicalStandardId: 'MEIOS-PDT-STD-001', physicalStandardVersion: '1.0.0', calibrationStatus: 'not-calibrated', hardwareControlAllowed: false, procurementAuthorized: false };
    const contingency = kapDigitalRehearsalPlan.contingencies[0]!;
    const branch = { branchId: 'BRANCH-1', contingencyId: contingency.contingencyId, labelAr: contingency.labelAr, affectedMomentIds: contingency.affectedMomentIds, candidateAlternativeAr: contingency.candidateAlternativeAr, returnConditionAr: contingency.returnToPrimaryConditionAr, activatedAtCommandId: null, returnedAtCommandId: null };
    const checks = [
      validateDigitalRehearsalSchema('digital-rehearsal-plan', kapDigitalRehearsalPlan),
      validateDigitalRehearsalSchema('digital-rehearsal-run', run),
      validateDigitalRehearsalSchema('event-day-plan', kapDigitalRehearsalPlan.eventDays[0]),
      validateDigitalRehearsalSchema('program-moment-cue', { moment: kapDigitalRehearsalPlan.moments[0], cues: [kapDigitalRehearsalPlan.cues[0]] }),
      validateDigitalRehearsalSchema('contingency-branch', { contingency, branch }),
      validateDigitalRehearsalSchema('daily-learning-record', { schemaVersion: '1.0.0', learningRecordId: 'L', projectId: run.projectId, eventId: run.eventId, venueId: run.venueId, sourceRunId: run.runId, eventDayId: run.eventDayId, state: 'observed', issueIds: [], observationIds: [], learningItemsAr: [], sourceLimitationsAr: [], createdAt: run.createdAt, timeTrust: run.timeTrust, revision: 1, previousRecordHash: null, contentHash: '0'.repeat(64), nextDayMutationAllowed: false, baselineMutationAllowed: false }),
      validateDigitalRehearsalSchema('rehearsal-projection-export', output)
    ];
    expect(checks.every((check) => check.valid)).toBe(true);
  });

  it('never throws when schema input is malformed', () => {
    expect(() => validateDigitalRehearsalSchema('digital-rehearsal-plan', null)).not.toThrow();
    expect(validateDigitalRehearsalSchema('digital-rehearsal-plan', null).valid).toBe(false);
  });

  it('rejects cross-project plans after rehashing', () => {
    const altered = structuredClone(kapDigitalRehearsalPlan);
    altered.projectId = 'PROJECT-FOREIGN-001';
    const materialized = materializeDigitalRehearsalPlan(altered);
    expect(validateDigitalRehearsalPlan(materialized, kapDigitalRehearsalValidationContext).issues.map((item) => item.code)).toContain('rehearsal-cross-project-plan');
  });

  it('rejects cross-event plans after rehashing', () => {
    const altered = structuredClone(kapDigitalRehearsalPlan);
    altered.eventId = 'EVENT-FOREIGN-001';
    const materialized = materializeDigitalRehearsalPlan(altered);
    expect(validateDigitalRehearsalPlan(materialized, kapDigitalRehearsalValidationContext).issues.map((item) => item.code)).toContain('rehearsal-cross-event-plan');
  });

  it('rejects source rebinding and unknown evidence or scene references after rehashing', () => {
    const altered = structuredClone(kapDigitalRehearsalPlan);
    altered.sourceReferences[0]!.sourceId = 'SOURCE-FORGED-001';
    altered.moments[0]!.relatedEvidenceIds = ['EVIDENCE-FAKE-VERIFIED'];
    altered.moments[0]!.sceneAssetIds = ['SCENE-EXTERNAL-MALICIOUS'];
    const codes = validateDigitalRehearsalPlan(materializeDigitalRehearsalPlan(altered), kapDigitalRehearsalValidationContext).issues.map((item) => item.code);
    expect(codes).toContain('rehearsal-source-binding-mismatch');
    expect(codes).toContain('rehearsal-reference-unknown');
  });

  it('rejects unknown references after rehashing', () => {
    const altered = structuredClone(kapDigitalRehearsalPlan);
    altered.moments[0]!.relatedEntityIds.push('ENTITY-FOREIGN-001');
    const materialized = materializeDigitalRehearsalPlan(altered);
    expect(validateDigitalRehearsalPlan(materialized, kapDigitalRehearsalValidationContext).issues.map((item) => item.code)).toContain('rehearsal-reference-unknown');
  });

  it('rejects a fabricated anchor for the unresolved show object', () => {
    const altered = structuredClone(kapDigitalRehearsalPlan);
    const unresolved = altered.moments.find((moment) => moment.spatialStatus === 'unresolved-no-anchor')!;
    unresolved.relatedEntityIds = ['ENTITY-KAP-OP-004'];
    const materialized = materializeDigitalRehearsalPlan(altered);
    expect(validateDigitalRehearsalPlan(materialized, kapDigitalRehearsalValidationContext).issues.map((item) => item.code)).toContain('rehearsal-unresolved-anchor-invented');
  });

  it('rejects cyclic cue dependencies', () => {
    const altered = structuredClone(kapDigitalRehearsalPlan);
    altered.cues[0]!.dependencies = [{ dependencyId: 'CYCLE-A', cueId: altered.cues[0]!.cueId, dependsOnCueId: altered.cues[1]!.cueId, dependencyType: 'finish-to-start', timingOffsetMinutes: null, status: 'candidate' }];
    altered.cues[1]!.dependencies = [{ dependencyId: 'CYCLE-B', cueId: altered.cues[1]!.cueId, dependsOnCueId: altered.cues[0]!.cueId, dependencyType: 'finish-to-start', timingOffsetMinutes: null, status: 'candidate' }];
    const materialized = materializeDigitalRehearsalPlan(altered);
    expect(validateDigitalRehearsalPlan(materialized, kapDigitalRehearsalValidationContext).issues.map((item) => item.code)).toContain('rehearsal-cue-dependency-cycle');
  });

  it('rejects unsafe authored content', () => {
    const altered = structuredClone(kapDigitalRehearsalPlan);
    altered.moments[0]!.labelAr = '<script>alert(1)</script>';
    const materialized = materializeDigitalRehearsalPlan(altered);
    expect(validateDigitalRehearsalPlan(materialized, kapDigitalRehearsalValidationContext).issues.map((item) => item.code)).toContain('rehearsal-unsafe-content');
  });

  it('rejects truth mutation flags despite a fresh content hash', () => {
    const altered = structuredClone(kapDigitalRehearsalPlan) as unknown as Record<string, unknown>;
    altered.readinessMutationAllowed = true;
    const materialized = materializeDigitalRehearsalPlan(altered as unknown as DigitalRehearsalPlan);
    expect(validateDigitalRehearsalPlan(materialized, kapDigitalRehearsalValidationContext).issues.map((item) => item.code)).toContain('rehearsal-truth-mutation-attempt');
  });

  it('renders a non-KAP fixture through the same engine', () => {
    const generic = new DigitalRehearsalEngine(conferenceDigitalRehearsalValidationContext);
    expect(generic.validatePlan(conferenceDigitalRehearsalPlan).valid).toBe(true);
    expect(JSON.stringify(conferenceDigitalRehearsalPlan)).not.toContain('KAP');
    expect(generic.createRun(conferenceDigitalRehearsalPlan, { runId: 'REHEARSAL-RUN-CONFERENCE-001', eventDayId: conferenceDigitalRehearsalPlan.eventDays[0]!.eventDayId, personaVariantId: conferenceDigitalRehearsalPlan.eventDays[0]!.personaVariantIds[0]!, rehearsalLens: 'visitor', rehearsalScenarioId: conferenceDigitalRehearsalPlan.scenarioId, timeMode: 'manual-step', commandId: 'CREATE-CONFERENCE', actorSessionRef: 'LOCAL-FICTIONAL', createdAt: '2026-08-01T03:00:00.000Z' }).projectId).toContain('CONFERENCE');
  });
});

describe('Stage EX.1D deterministic run engine', () => {
  beforeEach(() => { commandIndex = 0; });

  it('creates an immutable ready run with no actual time authority', () => {
    const run = createRun();
    expect(run.state).toBe('ready');
    expect(run.clock.actualTime).toBeNull();
    expect(run.actualExecution).toBe(false);
    expect(Object.isFrozen(run.momentStates)).toBe(true);
    expect(verifyRunContentHash(run)).toBe(true);
  });

  it('supports start pause and resume with append-only transitions', () => {
    let run = createRun();
    run = apply(run, 'start');
    run = apply(run, 'pause');
    run = apply(run, 'resume');
    expect(run.state).toBe('running');
    expect(run.transitions.map((item) => item.commandType)).toEqual(['start', 'pause', 'resume']);
    expect(run.revisions).toHaveLength(4);
  });

  it('advances and returns while preserving day scope', () => {
    let run = apply(createRun(), 'start');
    const first = run.currentMomentId;
    run = apply(run, 'advance');
    expect(run.currentMomentId).not.toBe(first);
    run = apply(run, 'previous');
    expect(run.currentMomentId).toBe(first);
  });

  it('rejects selecting a moment from another day', () => {
    const run = createRun();
    const foreignMoment = kapDigitalRehearsalPlan.eventDays[1]!.momentIds[0]!;
    const result = engine.applyCommand(kapDigitalRehearsalPlan, run, makeCommand(run, 'select-moment', { momentId: foreignMoment }));
    expect(result.accepted).toBe(false);
    expect(result.issues[0]!.code).toBe('rehearsal-select-moment-invalid');
  });

  it('requires a reason for skip block unblock and abort', () => {
    const running = apply(createRun(), 'start');
    expect(engine.applyCommand(kapDigitalRehearsalPlan, running, makeCommand(running, 'skip-moment')).accepted).toBe(false);
    expect(engine.applyCommand(kapDigitalRehearsalPlan, running, makeCommand(running, 'block-moment')).accepted).toBe(false);
    expect(engine.applyCommand(kapDigitalRehearsalPlan, running, makeCommand(running, 'abort-run')).accepted).toBe(false);
  });

  it('blocks and unblocks a rehearsal moment without changing readiness', () => {
    let run = apply(createRun(), 'start');
    run = apply(run, 'block-moment', { reasonAr: 'اختبار حجب محلي.' });
    expect(run.state).toBe('blocked');
    run = apply(run, 'unblock-moment', { reasonAr: 'انتهى الاختبار الافتراضي.' });
    expect(run.state).toBe('paused');
    expect(run.readinessMutationAllowed).toBe(false);
  });

  it('records observations and issues as rehearsal-only history', () => {
    let run = apply(createRun(), 'start');
    const common = { runId: run.runId, momentId: run.currentMomentId!, actorSessionRef: 'LOCAL', recordedAt: nextTime(), timeTrust: 'local-device-time-untrusted' as const, descriptionAr: 'ملاحظة اختبار.', relatedEntityIds: [], journeyStepId: null, basisAr: 'اختبار', severity: 'low' as const, proposedNextActionAr: 'مراجعة', truthStatus: 'rehearsal-observation-only' as const };
    const observation: RehearsalObservation = { ...common, observationId: 'OBS-001', classification: 'observation', supersedesObservationId: null };
    run = apply(run, 'record-observation', { observation });
    const issue: RehearsalIssue = { ...common, issueId: 'ISSUE-001', category: 'missing-owner', issueStatus: 'open', supersedesIssueId: null, supersedesObservationId: null };
    run = apply(run, 'record-issue', { issue });
    expect(run.observations).toHaveLength(1);
    expect(run.issues).toHaveLength(1);
  });

  it('activates and returns from a hypothetical contingency', () => {
    let run = apply(createRun(), 'start');
    run = apply(run, 'activate-contingency', { contingencyId: kapDigitalRehearsalPlan.contingencies[0]!.contingencyId });
    expect(run.activeBranchId).toBeTruthy();
    run = apply(run, 'return-primary', { reasonAr: 'عودة مرشحة.' });
    expect(run.activeBranchId).toBeNull();
    expect(run.branchHistory[0]!.returnedAtCommandId).toBeTruthy();
  });

  it('rejects operational contingencies for 1 November without changing readiness', () => {
    const ready = createRun(1);
    const running = engine.applyCommand(kapDigitalRehearsalPlan, ready, makeCommand(ready, 'start')).run;
    const result = engine.applyCommand(kapDigitalRehearsalPlan, running, makeCommand(running, 'activate-contingency', { contingencyId: kapDigitalRehearsalPlan.contingencies[0]!.contingencyId }));
    expect(result.accepted).toBe(false);
    expect(result.issues[0]?.code).toBe('rehearsal-contingency-day-not-applicable');
    expect(result.run.readinessMutationAllowed).toBe(false);
    expect(result.run.branchHistory).toEqual([]);
  });

  it('links only draft decisions and never approves them', () => {
    let run = apply(createRun(), 'start');
    const persona = kapDigitalRehearsalPlan.personaVariants.find((candidate) => candidate.personaVariantId === run.personaVariantId)!;
    const link: RehearsalDecisionDraftLink = { linkId: 'LINK-001', decisionId: 'DECISION-REHEARSAL-001', runId: run.runId, eventDayId: run.eventDayId, momentId: run.currentMomentId!, personaId: persona.personaId, journeyStepId: null, relatedSpatialObjectIds: [], observationAr: 'مسألة مرشحة.', candidateImpactAr: 'غير مقيم.', sourceTraceIds: [], classification: 'rehearsal-only', decisionStatus: 'draft', approvalStatus: 'draft' };
    run = apply(run, 'link-decision-draft', { link });
    expect(run.decisionDraftLinks[0]!.approvalStatus).toBe('draft');
    const invalid = { ...link, linkId: 'LINK-002', decisionId: 'DECISION-REHEARSAL-002', approvalStatus: 'approved' };
    expect(engine.applyCommand(kapDigitalRehearsalPlan, run, makeCommand(run, 'link-decision-draft', { link: invalid })).accepted).toBe(false);
  });

  it('rejects an automatically approved decision even after the run is rehashed', () => {
    let run = apply(createRun(), 'start');
    const persona = kapDigitalRehearsalPlan.personaVariants.find((candidate) => candidate.personaVariantId === run.personaVariantId)!;
    run = apply(run, 'link-decision-draft', { link: { linkId: 'LINK-TAMPER', decisionId: 'DECISION-TAMPER', runId: run.runId, eventDayId: run.eventDayId, momentId: run.currentMomentId!, personaId: persona.personaId, journeyStepId: null, relatedSpatialObjectIds: [], observationAr: 'اختبار.', candidateImpactAr: 'غير مقيم.', sourceTraceIds: [], classification: 'rehearsal-only', decisionStatus: 'draft', approvalStatus: 'draft' } satisfies RehearsalDecisionDraftLink });
    const altered = structuredClone(run);
    (altered.decisionDraftLinks[0] as unknown as Record<string, unknown>).approvalStatus = 'approved';
    const codes = validateDigitalRehearsalRun(materializeDigitalRehearsalRun(altered), kapDigitalRehearsalPlan).issues.map((item) => item.code);
    expect(codes).toContain('rehearsal-decision-auto-approved');
  });

  it('is idempotent for an identical command and rejects command ID conflicts', () => {
    const source = createRun();
    const command = makeCommand(source, 'start', {}, 'COMMAND-IDEMPOTENT');
    const first = engine.applyCommand(kapDigitalRehearsalPlan, source, command);
    expect(first.accepted).toBe(true);
    const duplicate = engine.applyCommand(kapDigitalRehearsalPlan, first.run, command);
    expect(duplicate.idempotent).toBe(true);
    const conflict = engine.applyCommand(kapDigitalRehearsalPlan, first.run, { ...command, payload: { changed: true } });
    expect(conflict.accepted).toBe(false);
    expect(conflict.issues[0]!.code).toBe('rehearsal-command-conflict');
  });

  it('rejects commands after terminal completion', () => {
    const run = completeRun(createRun());
    expect(run.state).toBe('completed');
    expect(run.outcome?.plannedMomentCount).toBe(9);
    expect(engine.applyCommand(kapDigitalRehearsalPlan, run, makeCommand(run, 'previous')).accepted).toBe(false);
  });

  it('rejects a forged completed run even after a fresh content hash', () => {
    const completed = completeRun(createRun());
    const altered = structuredClone(completed);
    altered.transitions.pop();
    altered.revisions.pop();
    const codes = validateDigitalRehearsalRun(materializeDigitalRehearsalRun(altered), kapDigitalRehearsalPlan).issues.map((item) => item.code);
    expect(codes).toContain('rehearsal-terminal-transition-invalid');
    expect(codes).toContain('rehearsal-run-state-projection-mismatch');
  });

  it('rejects fake evidence verification and device-clock authority after rehashing', () => {
    const altered = structuredClone(createRun()) as unknown as Record<string, unknown>;
    altered.evidenceVerificationAllowed = true;
    (altered.clock as Record<string, unknown>).actualTime = '2026-08-01T02:00:00.000Z';
    (altered.clock as Record<string, unknown>).actualTimeStatus = 'available';
    (altered.clock as Record<string, unknown>).deviceClockAuthority = 'authoritative';
    const codes = validateDigitalRehearsalRun(materializeDigitalRehearsalRun(altered as unknown as DigitalRehearsalRun), kapDigitalRehearsalPlan).issues.map((item) => item.code);
    expect(codes).toContain('rehearsal-run-truth-mutation-attempt');
    expect(codes).toContain('rehearsal-device-clock-authority-invalid');
  });

  it('rejects a cross-day observation injected into a rehashed run', () => {
    const source = apply(createRun(), 'start');
    const altered = structuredClone(source);
    altered.observations.push({ observationId: 'OBS-FOREIGN', runId: source.runId, momentId: kapDigitalRehearsalPlan.eventDays[1]!.momentIds[0]!, actorSessionRef: 'LOCAL', recordedAt: nextTime(), timeTrust: 'local-device-time-untrusted', classification: 'observation', descriptionAr: 'حقن لحظة أجنبية.', relatedEntityIds: [], journeyStepId: null, basisAr: 'اختبار سلبي.', severity: 'low', proposedNextActionAr: 'حجب.', truthStatus: 'rehearsal-observation-only', supersedesObservationId: null });
    const codes = validateDigitalRehearsalRun(materializeDigitalRehearsalRun(altered), kapDigitalRehearsalPlan).issues.map((item) => item.code);
    expect(codes).toContain('rehearsal-observation-history-invalid');
  });

  it('rejects a command whose timestamp precedes the append-only head', () => {
    const running = apply(createRun(), 'start');
    const result = engine.applyCommand(kapDigitalRehearsalPlan, running, { commandId: 'COMMAND-PAST', runId: running.runId, type: 'pause', payload: {}, issuedAt: '2026-08-01T01:59:00.000Z', timeTrust: 'local-device-time-untrusted', actorSessionRef: 'LOCAL-TEST-SESSION' });
    expect(result.accepted).toBe(false);
    expect(result.issues[0]!.code).toBe('rehearsal-command-time-order-invalid');
  });

  it('creates daily learning and a non-mutating next-day proposal', () => {
    const run = completeRun(createRun());
    const learning = engine.deriveDailyLearning(run, nextTime());
    const proposal = engine.createNextDayImprovementProposal(kapDigitalRehearsalPlan, learning);
    expect(learning.baselineMutationAllowed).toBe(false);
    expect(proposal.nextDayMutationAllowed).toBe(false);
    expect(proposal.targetEventDayId).toBe(kapDigitalRehearsalPlan.eventDays[1]!.eventDayId);
  });

  it('compares completed runs without a readiness percentage', () => {
    const first = completeRun(createRun(0, 0, 'REHEARSAL-RUN-COMPARE-1'));
    commandIndex = 0;
    const second = completeRun(createRun(1, 0, 'REHEARSAL-RUN-COMPARE-2'));
    const comparison = engine.compareRuns([first, second]);
    expect(comparison.readinessPercentage).toBeNull();
    expect(comparison.dayIds).toHaveLength(2);
  });

  it('projects one version to all six preview-only adapters', () => {
    const run = createRun();
    const projection = engine.exportRehearsalProjection({ plan: kapDigitalRehearsalPlan, run, eventDayId: run.eventDayId, personaVariantId: run.personaVariantId, momentId: run.currentMomentId!, truth: { readinessDisposition: 'cannot-determine', readinessExplanationAr: 'غير مقيم.', knownDecisionIds: [], knownEvidenceIds: [], sceneAvailabilityByAssetId: {}, outputTimestamp: run.createdAt, outputTimestampClassification: run.timeTrust } });
    const outputs = projectToAllRehearsalOutputs(projection);
    expect(outputs).toHaveLength(6);
    expect(new Set(outputs.map((item) => item.projectionVersion))).toEqual(new Set([projection.projectionVersion]));
    expect(outputs.every((item) => !item.hardwareCommandIssued && !item.calibrationClaimed)).toBe(true);
  });

  it('detects tampered run hashes', () => {
    const altered = structuredClone(createRun()) as unknown as Record<string, unknown>;
    altered.actualExecution = true;
    expect(validateDigitalRehearsalRun(altered as unknown as DigitalRehearsalRun, kapDigitalRehearsalPlan).valid).toBe(false);
    expect(verifyRunContentHash(altered as unknown as DigitalRehearsalRun)).toBe(false);
  });

  it('deep-freezes nested run history and plan source bindings', () => {
    const run = apply(createRun(), 'start');
    expect(Object.isFrozen(run.revisions[0])).toBe(true);
    expect(Object.isFrozen(run.transitions)).toBe(true);
    expect(Object.isFrozen(kapDigitalRehearsalPlan.sourceReferences[0]!.sourceTraceIds)).toBe(true);
  });

  it('proves baseline readiness evidence and spatial hashes remain unchanged', () => {
    const truth = { baselineHash: 'a', readinessHash: 'b', evidenceHash: 'c', spatialTruthHash: 'd' };
    expect(verifyRehearsalNonMutation(truth, { ...truth })).toBe(true);
    expect(verifyRehearsalNonMutation(truth, { ...truth, readinessHash: 'changed' })).toBe(false);
  });
});

describe('Stage EX.1D local repository', () => {
  beforeEach(() => { commandIndex = 0; });

  it('persists and restores the exact active run after reload', () => {
    const storage = new MemoryStorage();
    const repository = new BrowserDigitalRehearsalRepository(kapDigitalRehearsalValidationContext, storage);
    expect(repository.savePlan(kapDigitalRehearsalCandidatePlan, null).accepted).toBe(true);
    expect(repository.savePlan(kapDigitalRehearsalPlan, kapDigitalRehearsalCandidatePlan.planHash).accepted).toBe(true);
    const run = createRun();
    expect(repository.saveRun(run, null).accepted).toBe(true);
    const restored = new BrowserDigitalRehearsalRepository(kapDigitalRehearsalValidationContext, storage);
    expect(restored.getActiveRun()?.contentHash).toBe(run.contentHash);
    expect(restored.getPlan(kapDigitalRehearsalPlan.planId)?.revision).toBe(4);
  });

  it('rejects stale writes instead of last-write-wins', () => {
    const repository = new BrowserDigitalRehearsalRepository(kapDigitalRehearsalValidationContext, new MemoryStorage());
    repository.savePlan(kapDigitalRehearsalCandidatePlan, null);
    repository.savePlan(kapDigitalRehearsalPlan, kapDigitalRehearsalCandidatePlan.planHash);
    const run = createRun();
    repository.saveRun(run, null);
    const next = apply(run, 'start');
    expect(repository.saveRun(next, '0'.repeat(64)).conflict).toBe(true);
    expect(repository.getRun(run.runId)?.contentHash).toBe(run.contentHash);
  });

  it('rejects removal of a previously accepted issue', () => {
    const repository = new BrowserDigitalRehearsalRepository(kapDigitalRehearsalValidationContext, new MemoryStorage());
    repository.savePlan(kapDigitalRehearsalCandidatePlan, null);
    repository.savePlan(kapDigitalRehearsalPlan, kapDigitalRehearsalCandidatePlan.planHash);
    let run = createRun();
    repository.saveRun(run, null);
    run = apply(run, 'start');
    repository.saveRun(run, repository.getRun(run.runId)!.contentHash);
    const issue: RehearsalIssue = { issueId: 'ISSUE-APPEND-ONLY', runId: run.runId, momentId: run.currentMomentId!, actorSessionRef: 'LOCAL', recordedAt: nextTime(), timeTrust: 'local-device-time-untrusted', category: 'missing-information', descriptionAr: 'سجل يجب ألا يُحذف.', relatedEntityIds: [], journeyStepId: null, basisAr: 'اختبار.', severity: 'low', proposedNextActionAr: 'مراجعة.', truthStatus: 'rehearsal-observation-only', issueStatus: 'open', supersedesIssueId: null, supersedesObservationId: null };
    const withIssue = apply(run, 'record-issue', { issue });
    expect(repository.saveRun(withIssue, run.contentHash).accepted).toBe(true);
    const removed = structuredClone(withIssue);
    removed.issues = [];
    const materialized = materializeDigitalRehearsalRun(removed);
    const result = repository.saveRun(materialized, withIssue.contentHash);
    expect(result.accepted).toBe(false);
    expect(result.conflict).toBe(true);
    expect(repository.getRun(run.runId)?.issues).toHaveLength(1);
  });

  it('previews malformed and cross-project imports without mutation', () => {
    const repository = new BrowserDigitalRehearsalRepository(kapDigitalRehearsalValidationContext, new MemoryStorage());
    expect(repository.previewImport('{').mutationApplied).toBe(false);
    expect(repository.previewImport('{').valid).toBe(false);
    expect(repository.previewImport(JSON.stringify(conferenceDigitalRehearsalPlan)).valid).toBe(false);
    expect(repository.listPlans()).toEqual([]);
  });

  it('isolates storage by project event and venue scope', () => {
    const storage = new MemoryStorage();
    const kap = new BrowserDigitalRehearsalRepository(kapDigitalRehearsalValidationContext, storage);
    const conference = new BrowserDigitalRehearsalRepository(conferenceDigitalRehearsalValidationContext, storage);
    kap.savePlan(kapDigitalRehearsalCandidatePlan, null);
    expect(kap.listPlans()).toHaveLength(1);
    expect(conference.listPlans()).toHaveLength(0);
  });
});
