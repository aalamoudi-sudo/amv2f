import { sha256PayloadSync } from './integrationHash';
import {
  createRehearsalProjection,
  type RehearsalProjectionTruthInput
} from './digitalRehearsalProjection';
import {
  deepFreezeRehearsalValue,
  digitalRehearsalRunHash,
  materializeDailyLearningRecord,
  materializeDigitalRehearsalPlan,
  materializeDigitalRehearsalRun,
  rehearsalRevisionHash,
  rehearsalTransitionHash,
  validateDailyLearningRecord,
  validateDigitalRehearsalPlan,
  validateDigitalRehearsalRun,
  type DigitalRehearsalValidationContext
} from './digitalRehearsalValidation';
import type {
  DailyLearningRecord,
  DigitalRehearsalPlan,
  DigitalRehearsalRun,
  NextDayImprovementProposal,
  RehearsalCommand,
  RehearsalCommandResult,
  RehearsalComparison,
  RehearsalDecisionDraftLink,
  RehearsalIssue,
  RehearsalObservation,
  RehearsalOutcome,
  RehearsalProjection,
  RehearsalRunRevision,
  RehearsalTimeMode,
  RehearsalTransition
} from '../types/digitalRehearsal';

interface CommandFactoryInput {
  commandId: string;
  runId: string;
  issuedAt: string;
  actorSessionRef: string;
  payload?: Record<string, unknown>;
}

interface CreateRunInput {
  runId: string;
  eventDayId: string;
  personaVariantId: string;
  rehearsalLens: DigitalRehearsalRun['rehearsalLens'];
  rehearsalScenarioId: string;
  timeMode: RehearsalTimeMode;
  commandId: string;
  actorSessionRef: string;
  createdAt: string;
}

interface FreezePlanInput {
  commandId: string;
  actorSessionRef: string;
  createdAt: string;
  reasonAr: string;
}

const ZERO_HASH = '0'.repeat(64);

function validIso(value: string): boolean {
  return value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function stringPayload(command: RehearsalCommand, key: string): string | null {
  const value = command.payload[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberPayload(command: RehearsalCommand, key: string): number | null {
  const value = command.payload[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function commandFingerprint(command: RehearsalCommand): string {
  return sha256PayloadSync(command);
}

function stateFingerprint(run: DigitalRehearsalRun): string {
  return sha256PayloadSync({ ...structuredClone(run), revisions: [], contentHash: ZERO_HASH });
}

function buildRevision(run: DigitalRehearsalRun, command: RehearsalCommand): RehearsalRunRevision {
  const revision: RehearsalRunRevision = {
    revisionId: `${run.runId}-R${run.revisions.length + 1}`,
    runId: run.runId,
    revision: run.revisions.length + 1,
    commandId: command.commandId,
    commandFingerprint: commandFingerprint(command),
    previousRevisionHash: run.revisions.at(-1)?.revisionHash ?? null,
    stateFingerprint: stateFingerprint(run),
    revisionHash: ZERO_HASH,
    createdAt: command.issuedAt,
    timeTrust: command.timeTrust
  };
  revision.revisionHash = rehearsalRevisionHash(revision);
  return revision;
}

function appendTransition(
  run: DigitalRehearsalRun,
  command: RehearsalCommand,
  previousRunState: DigitalRehearsalRun['state'],
  previousMomentId: string | null,
  reasonAr: string | null
): void {
  const transition: RehearsalTransition = {
    transitionId: `${run.runId}-TRANSITION-${String(run.transitions.length + 1).padStart(3, '0')}`,
    runId: run.runId,
    commandId: command.commandId,
    commandType: command.type,
    previousRunState,
    nextRunState: run.state,
    previousMomentId,
    nextMomentId: run.currentMomentId,
    recordedAt: command.issuedAt,
    timeTrust: command.timeTrust,
    reasonAr,
    previousTransitionHash: run.transitions.at(-1)?.transitionHash ?? null,
    transitionHash: ZERO_HASH
  };
  transition.transitionHash = rehearsalTransitionHash(transition);
  run.transitions.push(transition);
}

function immutableRun(run: DigitalRehearsalRun): DigitalRehearsalRun {
  return deepFreezeRehearsalValue(materializeDigitalRehearsalRun(run));
}

function momentsForRun(plan: DigitalRehearsalPlan, run: DigitalRehearsalRun) {
  const day = plan.eventDays.find((candidate) => candidate.eventDayId === run.eventDayId);
  return (day?.momentIds ?? []).map((momentId) => plan.moments.find((candidate) => candidate.momentId === momentId)).filter((moment): moment is NonNullable<typeof moment> => Boolean(moment));
}

function outcomeForRun(plan: DigitalRehearsalPlan, run: DigitalRehearsalRun, state: 'completed' | 'aborted'): RehearsalOutcome {
  const moments = momentsForRun(plan, run);
  const idsForState = (value: DigitalRehearsalRun['momentStates'][string]) => moments.filter((moment) => run.momentStates[moment.momentId] === value).map((moment) => moment.momentId);
  return {
    outcomeId: `${run.runId}-OUTCOME-R${run.revisions.length + 1}`,
    runId: run.runId,
    state,
    plannedMomentCount: moments.length,
    rehearsedMomentCount: moments.filter((moment) => ['completed', 'skipped', 'blocked'].includes(run.momentStates[moment.momentId] ?? '')).length,
    skippedMomentCount: idsForState('skipped').length,
    blockedMomentCount: idsForState('blocked').length,
    uncertainTimingCount: moments.filter((moment) => moment.plannedTimeClassification !== 'source-reported-window').length,
    issueIds: run.issues.map((item) => item.issueId),
    decisionDraftLinkIds: run.decisionDraftLinks.map((item) => item.linkId),
    contingencyIds: [...new Set(run.branchHistory.map((branch) => branch.contingencyId))],
    // Missing evidence has no legal identifier until the governed evidence path creates one.
    missingEvidenceIds: [],
    missingOwnerMomentIds: moments.filter((moment) => !moment.operationalOwnerRoleId).map((moment) => moment.momentId),
    missingSceneMomentIds: moments.filter((moment) => !moment.sceneAssetIds.length).map((moment) => moment.momentId),
    unresolvedBlockerIds: idsForState('blocked'),
    sourceLimitationsAr: [
      'البرنامج والتسلسل مرشحان للمراجعة وليسا تنفيذًا حيًا أو اعتمادًا تشغيليًا.',
      'الأوقات الدقيقة والملاك والأدلة والسلطات التشغيلية ما زالت غير مكتملة.',
      'نتيجة البروفة لا تغيّر الجاهزية أو الأدلة أو القرارات أو الخط الأساسي.'
    ]
  };
}

function reject(run: DigitalRehearsalRun, code: string, messageAr: string, path = '/command'): RehearsalCommandResult {
  return { accepted: false, idempotent: false, run, issues: [{ code, messageAr, path }] };
}

export class DigitalRehearsalEngine {
  constructor(private readonly validationContext: DigitalRehearsalValidationContext) {}

  createPlan(plan: DigitalRehearsalPlan): DigitalRehearsalPlan {
    const materialized = materializeDigitalRehearsalPlan(plan);
    const validation = validateDigitalRehearsalPlan(materialized, this.validationContext);
    if (!validation.valid) throw new Error(validation.issues[0]?.messageAr ?? 'تعذر إنشاء خطة البروفة.');
    return deepFreezeRehearsalValue(materialized);
  }

  validatePlan(plan: DigitalRehearsalPlan) {
    return validateDigitalRehearsalPlan(plan, this.validationContext);
  }

  freezeCandidatePlanForRehearsal(plan: DigitalRehearsalPlan, input: FreezePlanInput): DigitalRehearsalPlan {
    const current = validateDigitalRehearsalPlan(plan, this.validationContext);
    if (!current.valid || !['draft', 'candidate'].includes(plan.state)) throw new Error(current.issues[0]?.messageAr ?? 'الخطة ليست مرشحة صالحة للتجميد من أجل البروفة.');
    if (!input.reasonAr.trim() || !input.actorSessionRef.trim() || !input.commandId.trim() || !validIso(input.createdAt)) throw new Error('يتطلب تجميد البروفة سببًا وسياق جلسة ووقتًا محليًا صالحًا.');
    const next = structuredClone(plan);
    next.state = 'frozen-for-rehearsal';
    next.revision += 1;
    next.previousPlanHash = plan.planHash;
    next.createdAt = input.createdAt;
    next.timeTrust = 'local-device-time-untrusted';
    next.planHash = ZERO_HASH;
    const materialized = materializeDigitalRehearsalPlan(next);
    const validation = validateDigitalRehearsalPlan(materialized, this.validationContext);
    if (!validation.valid) throw new Error(validation.issues[0]?.messageAr ?? 'تعذر تجميد الخطة للبروفة.');
    return deepFreezeRehearsalValue(materialized);
  }

  createRun(plan: DigitalRehearsalPlan, input: CreateRunInput): DigitalRehearsalRun {
    const planValidation = validateDigitalRehearsalPlan(plan, this.validationContext);
    if (!planValidation.valid || plan.state !== 'frozen-for-rehearsal') throw new Error(planValidation.issues[0]?.messageAr ?? 'يجب استخدام خطة مجمدة للبروفة فقط.');
    const day = plan.eventDays.find((candidate) => candidate.eventDayId === input.eventDayId);
    if (!day) throw new Error('يوم البروفة غير معروف ولم يُستخدم اليوم الأول كبديل.');
    const persona = plan.personaVariants.find((candidate) => candidate.personaVariantId === input.personaVariantId && candidate.eventDayId === input.eventDayId);
    if (!persona) throw new Error('منظور الشخصية غير معروف لهذا اليوم ولم يُستخدم منظور بديل.');
    const personaSteps = plan.executionSteps.filter((step) => step.personaVariantId === persona.personaVariantId);
    if (personaSteps.length > 0 && personaSteps.every((step) => !step.allowed)) throw new Error('هذا المنظور قالب غير مفعل لهذا اليوم ولا ينشئ نشاطًا تشغيليًا دون مصدر مستقل معتمد.');
    if (!input.runId.trim() || !input.commandId.trim() || !input.actorSessionRef.trim() || !validIso(input.createdAt)) throw new Error('هوية التشغيل والأمر والجلسة والوقت المحلي مطلوبة.');
    const firstMoment = plan.moments.find((candidate) => candidate.momentId === day.momentIds[0]);
    if (!firstMoment) throw new Error('تسلسل اليوم لا يحتوي لحظة بداية صالحة.');
    const command: RehearsalCommand = {
      commandId: input.commandId,
      runId: input.runId,
      type: 'create-run',
      issuedAt: input.createdAt,
      timeTrust: 'local-device-time-untrusted',
      actorSessionRef: input.actorSessionRef,
      payload: { eventDayId: input.eventDayId, personaVariantId: input.personaVariantId, rehearsalScenarioId: input.rehearsalScenarioId }
    };
    const momentStates = Object.fromEntries(day.momentIds.map((momentId, index) => [momentId, index === 0 ? 'current' : 'pending'])) as DigitalRehearsalRun['momentStates'];
    const run: DigitalRehearsalRun = {
      schemaVersion: '1.0.0',
      runId: input.runId,
      planId: plan.planId,
      planHash: plan.planHash,
      projectId: plan.projectId,
      eventId: plan.eventId,
      venueId: plan.venueId,
      eventDayId: day.eventDayId,
      personaVariantId: persona.personaVariantId,
      rehearsalLens: input.rehearsalLens,
      rehearsalScenarioId: input.rehearsalScenarioId,
      state: 'ready',
      currentMomentId: firstMoment.momentId,
      selectedSiteId: firstMoment.siteCandidateId,
      activeBranchId: null,
      momentStates,
      clock: { mode: input.timeMode, plannedTime: firstMoment.plannedTime, rehearsalElapsedSeconds: 0, actualTime: null, actualTimeStatus: 'unavailable', deviceClockAuthority: 'none' },
      transitions: [],
      revisions: [],
      observations: [],
      issues: [],
      decisionDraftLinks: [],
      branchHistory: [],
      outcome: null,
      createdAt: input.createdAt,
      startedAt: null,
      endedAt: null,
      timeTrust: 'local-device-time-untrusted',
      contentHash: ZERO_HASH,
      classification: 'candidate-digital-rehearsal',
      actualExecution: false,
      baselineMutationAllowed: false,
      readinessMutationAllowed: false,
      evidenceVerificationAllowed: false,
      decisionApprovalAllowed: false
    };
    run.revisions.push(buildRevision(run, command));
    const materialized = immutableRun(run);
    const validation = validateDigitalRehearsalRun(materialized, plan);
    if (!validation.valid) throw new Error(validation.issues[0]?.messageAr ?? 'تعذر إنشاء تشغيل البروفة.');
    return materialized;
  }

  applyCommand(plan: DigitalRehearsalPlan, sourceRun: DigitalRehearsalRun, command: RehearsalCommand): RehearsalCommandResult {
    const sourceValidation = validateDigitalRehearsalRun(sourceRun, plan);
    if (!sourceValidation.valid) return reject(sourceRun, 'rehearsal-source-run-invalid', sourceValidation.issues[0]?.messageAr ?? 'سجل البروفة الحالي غير صالح.');
    if (command.runId !== sourceRun.runId) return reject(sourceRun, 'rehearsal-command-run-mismatch', 'الأمر لا يخص تشغيل البروفة الحالي.');
    if (!command.commandId.trim() || !command.actorSessionRef.trim() || !validIso(command.issuedAt) || command.timeTrust !== 'local-device-time-untrusted') {
      return reject(sourceRun, 'rehearsal-command-context-invalid', 'الأمر يحتاج هوية وسياق جلسة ووقت جهاز مصنفًا بوضوح كغير موثوق.');
    }
    const priorRevision = sourceRun.revisions.find((revision) => revision.commandId === command.commandId);
    if (priorRevision) {
      if (priorRevision.commandFingerprint === commandFingerprint(command)) return { accepted: true, idempotent: true, run: sourceRun, issues: [] };
      return reject(sourceRun, 'rehearsal-command-conflict', 'أُعيد استخدام معرّف الأمر بمحتوى مختلف؛ حُجب التعارض دون كتابة.');
    }
    const latestRecordedAt = sourceRun.transitions.at(-1)?.recordedAt ?? sourceRun.createdAt;
    if (Date.parse(command.issuedAt) < Date.parse(latestRecordedAt)) return reject(sourceRun, 'rehearsal-command-time-order-invalid', 'وقت أمر البروفة يسبق آخر حدث مسجل؛ حُجب الأمر دون إعادة ترتيب التاريخ.');
    if (sourceRun.state === 'aborted' || sourceRun.state === 'completed') return reject(sourceRun, 'rehearsal-command-after-terminal-state', 'لا يقبل التشغيل المكتمل أو الملغى أوامر جديدة. استخدم إعادة البروفة لإنشاء تشغيل مستقل.');
    const run = structuredClone(sourceRun);
    const previousRunState = run.state;
    const previousMomentId = run.currentMomentId;
    const moments = momentsForRun(plan, run);
    const currentIndex = moments.findIndex((moment) => moment.momentId === run.currentMomentId);
    let reasonAr: string | null = stringPayload(command, 'reasonAr');
    const setCurrentMoment = (momentId: string) => {
      const targetIndex = moments.findIndex((moment) => moment.momentId === momentId);
      if (targetIndex < 0) return false;
      if (run.currentMomentId && ['current', 'paused', 'delayed'].includes(run.momentStates[run.currentMomentId] ?? '')) run.momentStates[run.currentMomentId] = 'pending';
      run.currentMomentId = momentId;
      run.momentStates[momentId] = 'current';
      run.selectedSiteId = moments[targetIndex]!.siteCandidateId;
      run.clock.plannedTime = moments[targetIndex]!.plannedTime;
      return true;
    };

    switch (command.type) {
      case 'start':
        if (run.state !== 'ready') return reject(sourceRun, 'rehearsal-start-state-invalid', 'بدء البروفة متاح فقط من حالة الجاهزية للبدء.');
        run.state = 'running';
        run.startedAt = command.issuedAt;
        break;
      case 'pause':
        if (run.state !== 'running') return reject(sourceRun, 'rehearsal-pause-state-invalid', 'الإيقاف المؤقت متاح فقط أثناء جريان البروفة.');
        run.state = 'paused';
        if (run.currentMomentId) run.momentStates[run.currentMomentId] = 'paused';
        break;
      case 'resume':
        if (run.state !== 'paused') return reject(sourceRun, 'rehearsal-resume-state-invalid', 'الاستئناف متاح فقط لبروفة متوقفة مؤقتًا.');
        run.state = 'running';
        if (run.currentMomentId) run.momentStates[run.currentMomentId] = 'current';
        break;
      case 'advance': {
        if (!['running', 'paused'].includes(run.state) || currentIndex < 0) return reject(sourceRun, 'rehearsal-advance-state-invalid', 'لا يمكن التقدم قبل بدء البروفة أو من لحظة غير معروفة.');
        if (run.currentMomentId && run.momentStates[run.currentMomentId] === 'blocked') return reject(sourceRun, 'rehearsal-advance-blocked', 'اللحظة محجوبة داخل البروفة؛ عالج الحجب أو تجاوزها بسبب صريح.');
        if (run.currentMomentId && !['completed', 'skipped'].includes(run.momentStates[run.currentMomentId] ?? '')) run.momentStates[run.currentMomentId] = 'completed';
        const next = moments[currentIndex + 1];
        if (next) setCurrentMoment(next.momentId);
        break;
      }
      case 'previous': {
        if (!['running', 'paused', 'blocked'].includes(run.state) || currentIndex <= 0) return reject(sourceRun, 'rehearsal-previous-state-invalid', 'لا توجد لحظة سابقة صالحة للعودة إليها.');
        setCurrentMoment(moments[currentIndex - 1]!.momentId);
        if (run.state === 'blocked') run.state = 'paused';
        break;
      }
      case 'select-moment': {
        const momentId = stringPayload(command, 'momentId');
        if (!momentId || !setCurrentMoment(momentId)) return reject(sourceRun, 'rehearsal-select-moment-invalid', 'اللحظة المطلوبة لا تنتمي إلى يوم البروفة.');
        if (run.state === 'running') run.state = 'paused';
        break;
      }
      case 'complete-moment':
        if (!run.currentMomentId || !['running', 'paused'].includes(run.state)) return reject(sourceRun, 'rehearsal-complete-moment-invalid', 'لا توجد لحظة جارية يمكن إكمالها داخل البروفة.');
        run.momentStates[run.currentMomentId] = 'completed';
        break;
      case 'skip-moment':
        if (!run.currentMomentId || !reasonAr) return reject(sourceRun, 'rehearsal-skip-reason-required', 'تجاوز اللحظة يحتاج سببًا إلزاميًا.');
        run.momentStates[run.currentMomentId] = 'skipped';
        if (moments[currentIndex + 1]) setCurrentMoment(moments[currentIndex + 1]!.momentId);
        break;
      case 'block-moment':
        if (!run.currentMomentId || !reasonAr) return reject(sourceRun, 'rehearsal-block-reason-required', 'حجب اللحظة داخل البروفة يحتاج سببًا إلزاميًا.');
        run.momentStates[run.currentMomentId] = 'blocked';
        run.state = 'blocked';
        break;
      case 'unblock-moment':
        if (run.state !== 'blocked' || !run.currentMomentId || !reasonAr) return reject(sourceRun, 'rehearsal-unblock-invalid', 'رفع الحجب يحتاج لحظة محجوبة وسببًا صريحًا.');
        run.momentStates[run.currentMomentId] = 'current';
        run.state = 'paused';
        break;
      case 'record-observation': {
        const candidate = command.payload.observation as RehearsalObservation | undefined;
        if (!candidate || candidate.runId !== run.runId || candidate.momentId !== run.currentMomentId || !candidate.descriptionAr?.trim() || candidate.truthStatus !== 'rehearsal-observation-only') return reject(sourceRun, 'rehearsal-observation-invalid', 'الملاحظة تحتاج سياق التشغيل واللحظة والوصف وتصنيف البروفة فقط.');
        if (run.observations.some((item) => item.observationId === candidate.observationId)) return reject(sourceRun, 'rehearsal-observation-duplicate', 'معرّف الملاحظة مستخدم مسبقًا.');
        run.observations.push(structuredClone(candidate));
        break;
      }
      case 'record-issue': {
        const candidate = command.payload.issue as RehearsalIssue | undefined;
        if (!candidate || candidate.runId !== run.runId || candidate.momentId !== run.currentMomentId || !candidate.descriptionAr?.trim() || candidate.truthStatus !== 'rehearsal-observation-only') return reject(sourceRun, 'rehearsal-issue-invalid', 'المسألة تحتاج سياق التشغيل واللحظة والوصف وتصنيف البروفة فقط.');
        if (run.issues.some((item) => item.issueId === candidate.issueId)) return reject(sourceRun, 'rehearsal-issue-duplicate', 'معرّف المسألة مستخدم مسبقًا.');
        run.issues.push(structuredClone(candidate));
        break;
      }
      case 'activate-contingency': {
        const contingencyId = stringPayload(command, 'contingencyId');
        const contingency = plan.contingencies.find((candidate) => candidate.contingencyId === contingencyId);
        if (!contingency || run.activeBranchId) return reject(sourceRun, 'rehearsal-contingency-invalid', 'الاحتمال غير معروف أو يوجد احتمال نشط بالفعل.');
        if (!contingency.affectedMomentIds.some((momentId) => moments.some((moment) => moment.momentId === momentId))) return reject(sourceRun, 'rehearsal-contingency-day-not-applicable', 'لا ينطبق هذا السيناريو التشغيلي على اليوم المحدد؛ لم يُنشأ فرع بروفة.');
        const branchId = `${run.runId}-BRANCH-${contingency.contingencyId}-${run.branchHistory.length + 1}`;
        run.branchHistory.push({
          branchId,
          contingencyId: contingency.contingencyId,
          labelAr: contingency.labelAr,
          affectedMomentIds: [...contingency.affectedMomentIds],
          candidateAlternativeAr: contingency.candidateAlternativeAr,
          returnConditionAr: contingency.returnToPrimaryConditionAr,
          activatedAtCommandId: command.commandId,
          returnedAtCommandId: null
        });
        run.activeBranchId = branchId;
        reasonAr = 'تفعيل سيناريو افتراضي للاختبار فقط.';
        break;
      }
      case 'return-primary': {
        if (!run.activeBranchId) return reject(sourceRun, 'rehearsal-primary-branch-already-active', 'الخطة الأساسية نشطة بالفعل.');
        const branch = run.branchHistory.find((candidate) => candidate.branchId === run.activeBranchId);
        if (!branch) return reject(sourceRun, 'rehearsal-branch-history-missing', 'سجل الاحتمال النشط غير مكتمل.');
        branch.returnedAtCommandId = command.commandId;
        run.activeBranchId = null;
        reasonAr = reasonAr ?? 'العودة إلى الخطة الأساسية داخل البروفة.';
        break;
      }
      case 'link-decision-draft': {
        const link = command.payload.link as RehearsalDecisionDraftLink | undefined;
        if (!link || link.runId !== run.runId || link.eventDayId !== run.eventDayId || link.momentId !== run.currentMomentId || link.decisionStatus !== 'draft' || link.approvalStatus !== 'draft' || link.classification !== 'rehearsal-only') return reject(sourceRun, 'rehearsal-decision-link-invalid', 'لا يقبل سوى رابط قرار قانوني باقٍ في حالة المسودة ومصنف للبروفة فقط.');
        if (run.decisionDraftLinks.some((item) => item.linkId === link.linkId || item.decisionId === link.decisionId)) return reject(sourceRun, 'rehearsal-decision-link-duplicate', 'رابط القرار مستخدم مسبقًا.');
        run.decisionDraftLinks.push(structuredClone(link));
        run.issues = run.issues.map((item) => item.momentId === link.momentId && item.issueStatus === 'open' ? { ...item, issueStatus: 'decision-draft-created' } : item);
        break;
      }
      case 'complete-run': {
        if (!run.startedAt || run.state === 'blocked') return reject(sourceRun, 'rehearsal-complete-run-blocked', 'لا يمكن إنهاء البروفة قبل البدء أو مع لحظة محجوبة.');
        const unfinished = moments.filter((moment) => !['completed', 'skipped'].includes(run.momentStates[moment.momentId] ?? 'pending'));
        if (unfinished.length) return reject(sourceRun, 'rehearsal-run-has-unfinished-moments', `ما زالت ${unfinished.length} لحظة دون إكمال أو تجاوز بسبب.`);
        run.state = 'completed';
        run.endedAt = command.issuedAt;
        run.outcome = outcomeForRun(plan, run, 'completed');
        break;
      }
      case 'abort-run':
        if (!run.startedAt || !reasonAr) return reject(sourceRun, 'rehearsal-abort-reason-required', 'إلغاء البروفة يحتاج تشغيلًا بدأ وسببًا إلزاميًا.');
        run.state = 'aborted';
        run.endedAt = command.issuedAt;
        run.outcome = outcomeForRun(plan, run, 'aborted');
        break;
      case 'advance-clock': {
        const seconds = numberPayload(command, 'seconds');
        if (!seconds || seconds <= 0 || run.clock.mode === 'manual-step') return reject(sourceRun, 'rehearsal-clock-command-invalid', 'تقدم ساعة البروفة يحتاج مدة موجبة ووضعًا غير يدوي، ولا يغيّر الوقت الفعلي.');
        run.clock.rehearsalElapsedSeconds += Math.round(seconds);
        break;
      }
      case 'create-run':
        return reject(sourceRun, 'rehearsal-create-run-command-reused', 'إنشاء التشغيل يتم عبر مسار الإنشاء فقط.');
    }

    appendTransition(run, command, previousRunState, previousMomentId, reasonAr);
    run.revisions.push(buildRevision(run, command));
    const materialized = immutableRun(run);
    const validation = validateDigitalRehearsalRun(materialized, plan);
    if (!validation.valid) return reject(sourceRun, 'rehearsal-command-result-invalid', validation.issues[0]?.messageAr ?? 'نتيجة الأمر غير صالحة.');
    return { accepted: true, idempotent: false, run: materialized, issues: [] };
  }

  startRun(plan: DigitalRehearsalPlan, run: DigitalRehearsalRun, input: CommandFactoryInput) { return this.applyCommand(plan, run, this.command('start', input)); }
  pauseRun(plan: DigitalRehearsalPlan, run: DigitalRehearsalRun, input: CommandFactoryInput) { return this.applyCommand(plan, run, this.command('pause', input)); }
  resumeRun(plan: DigitalRehearsalPlan, run: DigitalRehearsalRun, input: CommandFactoryInput) { return this.applyCommand(plan, run, this.command('resume', input)); }
  advanceMoment(plan: DigitalRehearsalPlan, run: DigitalRehearsalRun, input: CommandFactoryInput) { return this.applyCommand(plan, run, this.command('advance', input)); }
  returnToPreviousMoment(plan: DigitalRehearsalPlan, run: DigitalRehearsalRun, input: CommandFactoryInput) { return this.applyCommand(plan, run, this.command('previous', input)); }
  selectMoment(plan: DigitalRehearsalPlan, run: DigitalRehearsalRun, input: CommandFactoryInput) { return this.applyCommand(plan, run, this.command('select-moment', input)); }
  completeMoment(plan: DigitalRehearsalPlan, run: DigitalRehearsalRun, input: CommandFactoryInput) { return this.applyCommand(plan, run, this.command('complete-moment', input)); }
  skipMomentWithReason(plan: DigitalRehearsalPlan, run: DigitalRehearsalRun, input: CommandFactoryInput) { return this.applyCommand(plan, run, this.command('skip-moment', input)); }
  blockMoment(plan: DigitalRehearsalPlan, run: DigitalRehearsalRun, input: CommandFactoryInput) { return this.applyCommand(plan, run, this.command('block-moment', input)); }
  unblockMoment(plan: DigitalRehearsalPlan, run: DigitalRehearsalRun, input: CommandFactoryInput) { return this.applyCommand(plan, run, this.command('unblock-moment', input)); }
  recordObservation(plan: DigitalRehearsalPlan, run: DigitalRehearsalRun, input: CommandFactoryInput) { return this.applyCommand(plan, run, this.command('record-observation', input)); }
  recordIssue(plan: DigitalRehearsalPlan, run: DigitalRehearsalRun, input: CommandFactoryInput) { return this.applyCommand(plan, run, this.command('record-issue', input)); }
  activateContingency(plan: DigitalRehearsalPlan, run: DigitalRehearsalRun, input: CommandFactoryInput) { return this.applyCommand(plan, run, this.command('activate-contingency', input)); }
  returnToPrimaryBranch(plan: DigitalRehearsalPlan, run: DigitalRehearsalRun, input: CommandFactoryInput) { return this.applyCommand(plan, run, this.command('return-primary', input)); }
  linkDecisionDraft(plan: DigitalRehearsalPlan, run: DigitalRehearsalRun, input: CommandFactoryInput) { return this.applyCommand(plan, run, this.command('link-decision-draft', input)); }
  completeRun(plan: DigitalRehearsalPlan, run: DigitalRehearsalRun, input: CommandFactoryInput) { return this.applyCommand(plan, run, this.command('complete-run', input)); }
  abortRun(plan: DigitalRehearsalPlan, run: DigitalRehearsalRun, input: CommandFactoryInput) { return this.applyCommand(plan, run, this.command('abort-run', input)); }

  replayRun(plan: DigitalRehearsalPlan, run: DigitalRehearsalRun, input: Omit<CreateRunInput, 'eventDayId' | 'personaVariantId' | 'rehearsalLens' | 'rehearsalScenarioId' | 'timeMode'>): DigitalRehearsalRun {
    if (!['completed', 'aborted'].includes(run.state)) throw new Error('إعادة البروفة متاحة فقط بعد اكتمال تشغيل أو إلغائه.');
    return this.createRun(plan, {
      ...input,
      eventDayId: run.eventDayId,
      personaVariantId: run.personaVariantId,
      rehearsalLens: run.rehearsalLens,
      rehearsalScenarioId: run.rehearsalScenarioId,
      timeMode: run.clock.mode
    });
  }

  compareRuns(runs: DigitalRehearsalRun[]): RehearsalComparison {
    const scopes = new Set(runs.map((run) => `${run.projectId}:${run.eventId}:${run.planId}`));
    if (runs.length < 2 || scopes.size !== 1) throw new Error('المقارنة تحتاج تشغيلين على الأقل من الخطة والمشروع نفسيهما.');
    return {
      comparisonId: `REHEARSAL-COMPARISON-${sha256PayloadSync(runs.map((run) => run.contentHash)).slice(0, 16)}`,
      runIds: runs.map((run) => run.runId),
      dayIds: [...new Set(runs.map((run) => run.eventDayId))],
      summaries: runs.map((run) => ({
        runId: run.runId,
        dayId: run.eventDayId,
        completedMoments: Object.values(run.momentStates).filter((state) => state === 'completed').length,
        skippedMoments: Object.values(run.momentStates).filter((state) => state === 'skipped').length,
        blockedMoments: Object.values(run.momentStates).filter((state) => state === 'blocked').length,
        issueCount: run.issues.length,
        contingencyCount: new Set(run.branchHistory.map((branch) => branch.contingencyId)).size
      })),
      readinessPercentage: null,
      truthLabelAr: 'مقارنة تشغيلات بروفة مرشحة؛ لا تنتج نسبة جاهزية أو قياس تنفيذ فعلي.'
    };
  }

  deriveDailyLearning(run: DigitalRehearsalRun, createdAt: string): DailyLearningRecord {
    if (!['completed', 'aborted'].includes(run.state) || !validIso(createdAt)) throw new Error('يتطلب التعلم اليومي تشغيلًا منتهيًا ووقتًا محليًا صالحًا.');
    const learning: DailyLearningRecord = {
      schemaVersion: '1.0.0',
      learningRecordId: `LEARNING-${run.runId}-R1`,
      projectId: run.projectId,
      eventId: run.eventId,
      venueId: run.venueId,
      sourceRunId: run.runId,
      eventDayId: run.eventDayId,
      state: 'observed',
      issueIds: run.issues.map((item) => item.issueId),
      observationIds: run.observations.map((item) => item.observationId),
      learningItemsAr: [
        ...run.issues.map((item) => `${item.descriptionAr} · الإجراء التالي: ${item.proposedNextActionAr}`),
        ...run.observations.map((item) => item.descriptionAr)
      ],
      sourceLimitationsAr: run.outcome?.sourceLimitationsAr ?? ['لم تُنشأ نتيجة نهائية قابلة للمراجعة.'],
      createdAt,
      timeTrust: 'local-device-time-untrusted',
      revision: 1,
      previousRecordHash: null,
      contentHash: ZERO_HASH,
      nextDayMutationAllowed: false,
      baselineMutationAllowed: false
    };
    const materialized = materializeDailyLearningRecord(learning);
    const validation = validateDailyLearningRecord(materialized, run);
    if (!validation.valid) throw new Error(validation.issues[0]?.messageAr ?? 'تعذر إنشاء سجل التعلم اليومي.');
    return deepFreezeRehearsalValue(materialized);
  }

  createNextDayImprovementProposal(plan: DigitalRehearsalPlan, learning: DailyLearningRecord): NextDayImprovementProposal {
    const dayIndex = plan.eventDays.findIndex((day) => day.eventDayId === learning.eventDayId);
    const nextDay = plan.eventDays[dayIndex + 1];
    if (!nextDay) throw new Error('لا يوجد يوم تالٍ داخل الخطة الحالية.');
    const base: Omit<NextDayImprovementProposal, 'contentHash'> = {
      proposalId: `PROPOSAL-${learning.learningRecordId}-${nextDay.eventDayId}`,
      sourceLearningRecordId: learning.learningRecordId,
      sourceRunId: learning.sourceRunId,
      sourceEventDayId: learning.eventDayId,
      targetEventDayId: nextDay.eventDayId,
      proposedChangesAr: learning.learningItemsAr.length ? [...learning.learningItemsAr] : ['لا توجد ملاحظات محددة؛ يلزم إدخال مراجعة صريحة قبل أي تغيير.'],
      relatedMomentIds: [],
      status: 'preview',
      reviewRequired: true,
      nextDayMutationAllowed: false,
      baselineMutationAllowed: false
    };
    return deepFreezeRehearsalValue({ ...base, contentHash: sha256PayloadSync(base) });
  }

  exportRehearsalProjection(input: {
    plan: DigitalRehearsalPlan;
    run: DigitalRehearsalRun | null;
    eventDayId: string;
    personaVariantId: string;
    momentId: string;
    truth: RehearsalProjectionTruthInput;
  }): RehearsalProjection {
    return createRehearsalProjection(input);
  }

  private command(type: RehearsalCommand['type'], input: CommandFactoryInput): RehearsalCommand {
    return {
      commandId: input.commandId,
      runId: input.runId,
      type,
      issuedAt: input.issuedAt,
      timeTrust: 'local-device-time-untrusted',
      actorSessionRef: input.actorSessionRef,
      payload: structuredClone(input.payload ?? {})
    };
  }
}

export function verifyRehearsalNonMutation(before: {
  baselineHash: string;
  readinessHash: string;
  evidenceHash: string;
  spatialTruthHash: string;
}, after: typeof before): boolean {
  return before.baselineHash === after.baselineHash
    && before.readinessHash === after.readinessHash
    && before.evidenceHash === after.evidenceHash
    && before.spatialTruthHash === after.spatialTruthHash;
}

export function verifyRunContentHash(run: DigitalRehearsalRun): boolean {
  return run.contentHash === digitalRehearsalRunHash(run);
}
