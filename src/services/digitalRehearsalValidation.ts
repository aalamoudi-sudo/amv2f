import { isSha256, sha256PayloadSync } from './integrationHash';
import { validateDigitalRehearsalSchema } from './digitalRehearsalSchema';
import type {
  DailyLearningRecord,
  DigitalRehearsalPlan,
  DigitalRehearsalRun,
  RehearsalRunRevision,
  RehearsalTransition,
  RehearsalValidationIssue,
  RehearsalValidationResult
} from '../types/digitalRehearsal';

const ZERO_HASH = '0'.repeat(64);

export interface DigitalRehearsalValidationContext {
  projectId: string;
  eventId: string;
  venueId: string;
  experiencePackId: string;
  experiencePackHash: string;
  knownScenarioIds: ReadonlySet<string>;
  knownPersonaIds: ReadonlySet<string>;
  knownJourneyIds: ReadonlySet<string>;
  knownSiteCandidateIds: ReadonlySet<string>;
  knownSourceTraceIds: ReadonlySet<string>;
  knownSourceTraceBindings: ReadonlyMap<string, { sourceId: string; sourceHash: string; sourcePage: number }>;
  knownJourneyStepIds: ReadonlySet<string>;
  knownTouchpointIds: ReadonlySet<string>;
  knownSceneAssetIds: ReadonlySet<string>;
  knownZoneIds: ReadonlySet<string>;
  knownEntityIds: ReadonlySet<string>;
  knownRequirementIds: ReadonlySet<string>;
  knownDecisionIds: ReadonlySet<string>;
  knownEvidenceIds: ReadonlySet<string>;
  forbiddenActualExecution?: boolean;
}

function issue(code: string, path: string, messageAr: string, severity: RehearsalValidationIssue['severity'] = 'blocking'): RehearsalValidationIssue {
  return { code, path, messageAr, severity };
}

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicate = new Set<string>();
  values.forEach((value) => seen.has(value) ? duplicate.add(value) : seen.add(value));
  return [...duplicate].sort();
}

function safeText(value: string): boolean {
  return !/<\s*script|javascript:|data:text\/html|onerror\s*=|onload\s*=/i.test(value);
}

function validIso(value: string): boolean {
  return value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function validTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('ar-SA', { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

function minutes(value: string): number {
  const [hour = 0, minute = 0] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function canonicalPlan(plan: DigitalRehearsalPlan): DigitalRehearsalPlan {
  return { ...structuredClone(plan), planHash: ZERO_HASH };
}

export function digitalRehearsalPlanHash(plan: DigitalRehearsalPlan): string {
  return sha256PayloadSync(canonicalPlan(plan));
}

export function materializeDigitalRehearsalPlan(plan: DigitalRehearsalPlan): DigitalRehearsalPlan {
  const candidate = structuredClone(plan);
  candidate.planHash = digitalRehearsalPlanHash(candidate);
  return candidate;
}

function canonicalRun(run: DigitalRehearsalRun): DigitalRehearsalRun {
  return { ...structuredClone(run), contentHash: ZERO_HASH };
}

export function digitalRehearsalRunHash(run: DigitalRehearsalRun): string {
  return sha256PayloadSync(canonicalRun(run));
}

export function materializeDigitalRehearsalRun(run: DigitalRehearsalRun): DigitalRehearsalRun {
  const candidate = structuredClone(run);
  candidate.contentHash = digitalRehearsalRunHash(candidate);
  return candidate;
}

export function rehearsalTransitionHash(transition: RehearsalTransition): string {
  return sha256PayloadSync({ ...structuredClone(transition), transitionHash: ZERO_HASH });
}

export function rehearsalRevisionHash(revision: RehearsalRunRevision): string {
  return sha256PayloadSync({ ...structuredClone(revision), revisionHash: ZERO_HASH });
}

function detectCueCycle(plan: DigitalRehearsalPlan): string[] {
  const graph = new Map<string, string[]>();
  plan.cues.forEach((cue) => graph.set(cue.cueId, cue.dependencies.map((entry) => entry.dependsOnCueId)));
  const active = new Set<string>();
  const complete = new Set<string>();
  const cycle = new Set<string>();
  const visit = (id: string) => {
    if (complete.has(id)) return;
    if (active.has(id)) {
      cycle.add(id);
      return;
    }
    active.add(id);
    (graph.get(id) ?? []).forEach((dependency) => visit(dependency));
    active.delete(id);
    complete.add(id);
  };
  graph.forEach((_, id) => visit(id));
  return [...cycle].sort();
}

function ensureKnownReferences(values: readonly string[], known: ReadonlySet<string>, path: string, labelAr: string): RehearsalValidationIssue[] {
  return values.filter((value) => !known.has(value)).map((value) => issue(
    'rehearsal-reference-unknown',
    path,
    `${labelAr} غير معروف داخل سياق المشروع النشط: ${value}.`
  ));
}

export function validateDigitalRehearsalPlan(
  plan: DigitalRehearsalPlan,
  context: DigitalRehearsalValidationContext
): RehearsalValidationResult<DigitalRehearsalPlan> {
  const schema = validateDigitalRehearsalSchema('digital-rehearsal-plan', plan);
  const issues = [...schema.issues];
  if (plan.projectId !== context.projectId) issues.push(issue('rehearsal-cross-project-plan', '/projectId', 'حُجبت الخطة لأنها تخص مشروعًا آخر.'));
  if (plan.eventId !== context.eventId) issues.push(issue('rehearsal-cross-event-plan', '/eventId', 'حُجبت الخطة لأنها تخص فعالية أخرى.'));
  if (plan.venueId !== context.venueId) issues.push(issue('rehearsal-cross-venue-plan', '/venueId', 'حُجبت الخطة لأنها تخص موقعًا آخر.'));
  if (plan.experiencePackId !== context.experiencePackId || plan.experiencePackHash !== context.experiencePackHash) {
    issues.push(issue('rehearsal-experience-pack-mismatch', '/experiencePackId', 'الخطة لا تطابق مراجعة حزمة التجربة النشطة.'));
  }
  if (!context.knownScenarioIds.has(plan.scenarioId)) issues.push(issue('rehearsal-scenario-unknown', '/scenarioId', 'سيناريو البروفة غير معروف داخل حزمة التجربة النشطة.'));
  if (plan.planHash !== digitalRehearsalPlanHash(plan)) issues.push(issue('rehearsal-plan-hash-mismatch', '/planHash', 'بصمة خطة البروفة لا تطابق محتواها.'));
  if (plan.state === 'frozen-for-rehearsal' && (!plan.previousPlanHash || plan.revision < 2)) {
    issues.push(issue('rehearsal-frozen-plan-lineage-invalid', '/state', 'الخطة المجمدة للبروفة تحتاج مراجعة سابقة مرشحة وبصمة أصل صحيحة.'));
  }
  if (plan.candidateOnly !== true || plan.baselineMutationAllowed || plan.readinessMutationAllowed || plan.evidenceVerificationAllowed || plan.decisionApprovalAllowed || plan.liveExecutionAllowed) {
    issues.push(issue('rehearsal-truth-mutation-attempt', '/', 'حُجبت الخطة لأنها تحاول تجاوز حدود البروفة المرشحة أو تغيير الحقيقة التشغيلية.'));
  }
  const dayIds = new Set(plan.eventDays.map((day) => day.eventDayId));
  const momentIds = new Set(plan.moments.map((moment) => moment.momentId));
  const cueIds = new Set(plan.cues.map((cue) => cue.cueId));
  const personaVariantIds = new Set(plan.personaVariants.map((variant) => variant.personaVariantId));
  const personaIds = new Set(plan.personaVariants.map((variant) => variant.personaId));
  const executionStepIds = new Set(plan.executionSteps.map((step) => step.executionStepId));
  const identifiersByKind: Array<[string, string[]]> = [
    ['event-day', plan.eventDays.map((item) => item.eventDayId)],
    ['moment', plan.moments.map((item) => item.momentId)],
    ['cue', plan.cues.map((item) => item.cueId)],
    ['persona', plan.personaVariants.map((item) => item.personaVariantId)],
    ['execution-step', plan.executionSteps.map((item) => item.executionStepId)],
    ['contingency', plan.contingencies.map((item) => item.contingencyId)]
  ];
  identifiersByKind.forEach(([kind, values]) => {
    duplicates(values).forEach((value) => issues.push(issue('rehearsal-duplicate-id', `/${kind}`, `المعرّف مكرر داخل الخطة: ${value}.`)));
  });
  plan.sourceReferences.forEach((source, index) => {
    if (!isSha256(source.sourceHash)) issues.push(issue('rehearsal-source-hash-invalid', `/sourceReferences/${index}/sourceHash`, 'بصمة مصدر البروفة غير صالحة.'));
    issues.push(...ensureKnownReferences(source.sourceTraceIds, context.knownSourceTraceIds, `/sourceReferences/${index}/sourceTraceIds`, 'تتبع المصدر'));
    source.sourceTraceIds.forEach((traceId) => {
      const binding = context.knownSourceTraceBindings.get(traceId);
      if (binding && (binding.sourceId !== source.sourceId || binding.sourceHash !== source.sourceHash || !source.sourcePages.includes(binding.sourcePage))) {
        issues.push(issue('rehearsal-source-binding-mismatch', `/sourceReferences/${index}`, 'مرجع المصدر لا يطابق هوية وبصمة وصفحة تتبع المصدر المحكوم.'));
      }
    });
  });
  plan.eventDays.forEach((day, index) => {
    const schemaResult = validateDigitalRehearsalSchema('event-day-plan', day);
    issues.push(...schemaResult.issues.map((entry) => ({ ...entry, path: `/eventDays/${index}${entry.path === '/' ? '' : entry.path}` })));
    day.momentIds.filter((id) => !momentIds.has(id)).forEach((id) => issues.push(issue('rehearsal-day-moment-unknown', `/eventDays/${index}/momentIds`, `اليوم يشير إلى لحظة غير معروفة: ${id}.`)));
    day.personaVariantIds.filter((id) => !personaVariantIds.has(id)).forEach((id) => issues.push(issue('rehearsal-day-persona-unknown', `/eventDays/${index}/personaVariantIds`, `اليوم يشير إلى منظور شخصية غير معروف: ${id}.`)));
    if (!context.knownPersonaIds.has(day.primaryPersonaId)) issues.push(issue('rehearsal-day-primary-persona-unknown', `/eventDays/${index}/primaryPersonaId`, 'الشخصية الأساسية لليوم غير معروفة داخل حزمة التجربة.'));
    issues.push(...ensureKnownReferences(day.siteCandidateIds, context.knownSiteCandidateIds, `/eventDays/${index}/siteCandidateIds`, 'الموقع المرشح'));
    issues.push(...ensureKnownReferences(day.sourceTraceIds, context.knownSourceTraceIds, `/eventDays/${index}/sourceTraceIds`, 'تتبع مصدر اليوم'));
    if (day.attendance.qualifier === 'unknown' && day.attendance.value !== null) issues.push(issue('rehearsal-unknown-attendance-has-value', `/eventDays/${index}/attendance`, 'الحضور غير المعروف يجب أن يبقى بلا قيمة رقمية.'));
    if (day.operationalJourneyStatus === 'not-applicable' && (day.visitorJourneyStatus !== 'not-applicable' || day.spatialRouteRequired || day.sharedVisitorTransitionRequired)) issues.push(issue('rehearsal-day-route-not-applicable-invalid', `/eventDays/${index}`, 'اليوم غير التشغيلي لا يجوز أن يحمل رحلة زائر أو مسارًا أو انتقالًا مشتركًا.'));
    if (day.operationalJourneyStatus === 'not-applicable') {
      const dayMoments = plan.moments.filter((moment) => moment.eventDayId === day.eventDayId);
      if (dayMoments.some((moment) => moment.spatialStatus === 'multi-site-transition')) issues.push(issue('rehearsal-non-applicable-transition-invented', `/eventDays/${index}/momentIds`, 'لا يجوز لبروفة يوم غير تشغيلي إنشاء لحظة انتقال بين المواقع.'));
      if (plan.cues.some((cue) => dayMoments.some((moment) => moment.momentId === cue.momentId) && cue.cueType === 'transportation')) issues.push(issue('rehearsal-non-applicable-transport-cue', `/eventDays/${index}/momentIds`, 'لا يجوز لبروفة يوم غير تشغيلي إنشاء إشارة نقل.'));
      if (plan.contingencies.some((contingency) => contingency.category === 'transport-delay' && contingency.affectedMomentIds.some((momentId) => day.momentIds.includes(momentId)))) issues.push(issue('rehearsal-non-applicable-transport-contingency', `/eventDays/${index}/momentIds`, 'لا يجوز ربط يوم غير تشغيلي بافتراض تأخر نقل.'));
      if (plan.checkpoints.some((checkpoint) => day.momentIds.includes(checkpoint.momentId))) issues.push(issue('rehearsal-non-applicable-operational-checkpoint', `/eventDays/${index}/momentIds`, 'اليوم غير التشغيلي لا يجوز أن ينشئ نقاط تحقق تشغيلية أو يؤثر في الجاهزية.'));
      if (plan.contingencies.some((contingency) => contingency.affectedMomentIds.some((momentId) => day.momentIds.includes(momentId)))) issues.push(issue('rehearsal-non-applicable-operational-contingency', `/eventDays/${index}/momentIds`, 'اليوم غير التشغيلي لا يجوز أن يرث افتراضات طوارئ تشغيلية من الأيام الأخرى.'));
      const templateVariants = plan.personaVariants.filter((variant) => variant.eventDayId === day.eventDayId && variant.truthStatus === 'template-proposed');
      if (templateVariants.some((variant) => plan.executionSteps.some((step) => step.personaVariantId === variant.personaVariantId && step.allowed))) issues.push(issue('rehearsal-non-applicable-template-activated', `/eventDays/${index}/personaVariantIds`, 'مناظير التشغيل القالبية في اليوم غير التشغيلي يجب أن تبقى غير مفعلة حتى ورود مصدر مستقل.'));
    }
    if (day.timeWindow) {
      if (!validTimeZone(day.timeWindow.timeZone)) issues.push(issue('rehearsal-time-zone-invalid', `/eventDays/${index}/timeWindow/timeZone`, 'المنطقة الزمنية في نافذة اليوم غير صالحة.'));
      if (minutes(day.timeWindow.end) <= minutes(day.timeWindow.start)) issues.push(issue('rehearsal-day-time-order-invalid', `/eventDays/${index}/timeWindow`, 'نهاية نافذة اليوم يجب أن تكون بعد بدايتها.'));
    }
  });
  plan.moments.forEach((moment, index) => {
    if (!dayIds.has(moment.eventDayId)) issues.push(issue('rehearsal-moment-day-unknown', `/moments/${index}/eventDayId`, 'اللحظة تشير إلى يوم غير معروف.'));
    const owningDay = plan.eventDays.find((day) => day.eventDayId === moment.eventDayId);
    if (!owningDay?.momentIds.includes(moment.momentId)) issues.push(issue('rehearsal-moment-day-membership-invalid', `/moments/${index}/eventDayId`, 'اللحظة لا تنتمي إلى تسلسل يومها المعلن.'));
    if (owningDay && owningDay.momentIds.indexOf(moment.momentId) + 1 !== moment.order) issues.push(issue('rehearsal-moment-order-invalid', `/moments/${index}/order`, 'ترتيب اللحظة لا يطابق ترتيبها داخل اليوم.'));
    if (moment.siteCandidateId && !context.knownSiteCandidateIds.has(moment.siteCandidateId)) issues.push(issue('rehearsal-moment-site-unknown', `/moments/${index}/siteCandidateId`, 'موقع اللحظة غير معروف داخل حزمة التجربة.'));
    if (moment.journeyStepId && !context.knownJourneyStepIds.has(moment.journeyStepId)) issues.push(issue('rehearsal-journey-step-unknown', `/moments/${index}/journeyStepId`, 'اللحظة تشير إلى خطوة رحلة غير معروفة.'));
    if (moment.touchpointId && !context.knownTouchpointIds.has(moment.touchpointId)) issues.push(issue('rehearsal-touchpoint-unknown', `/moments/${index}/touchpointId`, 'اللحظة تشير إلى نقطة تجربة غير معروفة.'));
    issues.push(...ensureKnownReferences(moment.sceneAssetIds, context.knownSceneAssetIds, `/moments/${index}/sceneAssetIds`, 'أصل المشهد'));
    issues.push(...ensureKnownReferences(moment.relatedZoneIds, context.knownZoneIds, `/moments/${index}/relatedZoneIds`, 'المنطقة المكانية'));
    issues.push(...ensureKnownReferences(moment.relatedEntityIds, context.knownEntityIds, `/moments/${index}/relatedEntityIds`, 'العنصر المكاني'));
    issues.push(...ensureKnownReferences(moment.relatedRequirementIds, context.knownRequirementIds, `/moments/${index}/relatedRequirementIds`, 'متطلب الجاهزية'));
    issues.push(...ensureKnownReferences(moment.relatedDecisionIds, context.knownDecisionIds, `/moments/${index}/relatedDecisionIds`, 'القرار'));
    issues.push(...ensureKnownReferences(moment.relatedEvidenceIds, context.knownEvidenceIds, `/moments/${index}/relatedEvidenceIds`, 'الدليل'));
    issues.push(...ensureKnownReferences(moment.sourceTraceIds, context.knownSourceTraceIds, `/moments/${index}/sourceTraceIds`, 'تتبع مصدر اللحظة'));
    moment.cueIds.filter((id) => !cueIds.has(id)).forEach((id) => issues.push(issue('rehearsal-moment-cue-unknown', `/moments/${index}/cueIds`, `اللحظة تشير إلى إشارة غير معروفة: ${id}.`)));
    if (moment.plannedTime && moment.plannedTimeClassification !== 'source-reported-window') issues.push(issue('rehearsal-precise-time-untraceable', `/moments/${index}/plannedTime`, 'لا يجوز إظهار وقت دقيق للحظة دون تصنيف مصدر صريح.'));
    if (moment.spatialStatus === 'unresolved-no-anchor' && moment.relatedEntityIds.length > 0) issues.push(issue('rehearsal-unresolved-anchor-invented', `/moments/${index}/relatedEntityIds`, 'اللحظة غير المحسومة مكانيًا لا يجوز أن تكتسب مرساة بديلة.'));
    if (![moment.labelAr, moment.labelEn, ...moment.missingInformationAr].every(safeText)) issues.push(issue('rehearsal-unsafe-content', `/moments/${index}`, 'نص اللحظة يحتوي محتوى غير آمن وتم حجبه.'));
  });
  plan.cues.forEach((cue, index) => {
    if (!momentIds.has(cue.momentId)) issues.push(issue('rehearsal-cue-moment-unknown', `/cues/${index}/momentId`, 'الإشارة تشير إلى لحظة غير معروفة.'));
    cue.dependencies.forEach((dependency, dependencyIndex) => {
      if (dependency.cueId !== cue.cueId || !cueIds.has(dependency.dependsOnCueId) || dependency.dependsOnCueId === cue.cueId) {
        issues.push(issue('rehearsal-cue-dependency-invalid', `/cues/${index}/dependencies/${dependencyIndex}`, 'اعتماد الإشارة مستحيل أو غير معروف.'));
      }
    });
    issues.push(...ensureKnownReferences(cue.sourceTraceIds, context.knownSourceTraceIds, `/cues/${index}/sourceTraceIds`, 'تتبع مصدر الإشارة'));
    issues.push(...ensureKnownReferences(cue.readinessRequirementIds, context.knownRequirementIds, `/cues/${index}/readinessRequirementIds`, 'متطلب الجاهزية'));
    issues.push(...ensureKnownReferences(cue.decisionIds, context.knownDecisionIds, `/cues/${index}/decisionIds`, 'القرار'));
    issues.push(...ensureKnownReferences(cue.evidenceRequirementIds, context.knownEvidenceIds, `/cues/${index}/evidenceRequirementIds`, 'متطلب الدليل'));
    if (![cue.labelAr, cue.labelEn, ...cue.notesAr].every(safeText)) issues.push(issue('rehearsal-unsafe-cue-content', `/cues/${index}`, 'نص الإشارة يحتوي محتوى غير آمن وتم حجبه.'));
  });
  detectCueCycle(plan).forEach((id) => issues.push(issue('rehearsal-cue-dependency-cycle', '/cues', `توجد حلقة اعتماد بين إشارات البرنامج عند ${id}.`)));
  plan.personaVariants.forEach((variant, index) => {
    if (!dayIds.has(variant.eventDayId)) issues.push(issue('rehearsal-persona-day-unknown', `/personaVariants/${index}/eventDayId`, 'منظور الشخصية يشير إلى يوم غير معروف.'));
    if (!context.knownPersonaIds.has(variant.personaId) && variant.truthStatus !== 'template-proposed') issues.push(issue('rehearsal-persona-identity-unknown', `/personaVariants/${index}/personaId`, 'هوية منظور الشخصية غير معروفة ولم تُصنّف كقالب مقترح.'));
    if (!context.knownJourneyIds.has(variant.baseJourneyId)) issues.push(issue('rehearsal-persona-journey-unknown', `/personaVariants/${index}/baseJourneyId`, 'رحلة منظور الشخصية غير معروفة داخل حزمة التجربة.'));
    variant.executionStepIds.filter((id) => !executionStepIds.has(id)).forEach((id) => issues.push(issue('rehearsal-persona-step-unknown', `/personaVariants/${index}/executionStepIds`, `منظور الشخصية يشير إلى خطوة تنفيذ غير معروفة: ${id}.`)));
    issues.push(...ensureKnownReferences(variant.sourceTraceIds, context.knownSourceTraceIds, `/personaVariants/${index}/sourceTraceIds`, 'تتبع مصدر الشخصية'));
  });
  plan.executionSteps.forEach((step, index) => {
    if (!personaVariantIds.has(step.personaVariantId) || !momentIds.has(step.momentId)) issues.push(issue('rehearsal-execution-step-reference-invalid', `/executionSteps/${index}`, 'خطوة منظور الشخصية لا تطابق شخصية ولحظة معروفتين.'));
    const variant = plan.personaVariants.find((candidate) => candidate.personaVariantId === step.personaVariantId);
    const moment = plan.moments.find((candidate) => candidate.momentId === step.momentId);
    if (variant && moment && variant.eventDayId !== moment.eventDayId) issues.push(issue('rehearsal-execution-step-cross-day', `/executionSteps/${index}`, 'خطوة منظور الشخصية تربط شخصية بلحظة من يوم آخر.'));
    if (step.journeyStepId && !context.knownJourneyStepIds.has(step.journeyStepId)) issues.push(issue('rehearsal-execution-journey-step-unknown', `/executionSteps/${index}/journeyStepId`, 'خطوة الرحلة في منظور التنفيذ غير معروفة.'));
  });
  plan.checkpoints.forEach((checkpoint, index) => {
    if (!momentIds.has(checkpoint.momentId)) issues.push(issue('rehearsal-checkpoint-moment-unknown', `/checkpoints/${index}/momentId`, 'نقطة التحقق تشير إلى لحظة غير معروفة.'));
  });
  plan.contingencies.forEach((contingency, index) => {
    contingency.affectedMomentIds.filter((id) => !momentIds.has(id)).forEach((id) => issues.push(issue('rehearsal-contingency-moment-unknown', `/contingencies/${index}/affectedMomentIds`, `الاحتمال يشير إلى لحظة غير معروفة: ${id}.`)));
    if (contingency.truthStatus !== 'hypothetical-rehearsal-only') issues.push(issue('rehearsal-contingency-truth-invalid', `/contingencies/${index}/truthStatus`, 'الاحتمال يجب أن يبقى سيناريو افتراضيًا للاختبار فقط.'));
    issues.push(...ensureKnownReferences(contingency.affectedPersonaIds, personaIds, `/contingencies/${index}/affectedPersonaIds`, 'الشخصية المتأثرة'));
    issues.push(...ensureKnownReferences(contingency.affectedSiteIds, context.knownSiteCandidateIds, `/contingencies/${index}/affectedSiteIds`, 'الموقع المتأثر'));
    if (!contingency.sourceTraceIds.every((id) => context.knownSourceTraceIds.has(id))) issues.push(issue('rehearsal-contingency-untraceable', `/contingencies/${index}/sourceTraceIds`, 'الاحتمال لا يملك أساسًا مصدرًا أو تصنيفًا مرشحًا صالحًا.'));
  });
  const valid = !issues.some((entry) => entry.severity === 'blocking');
  return { valid, value: valid ? structuredClone(plan) : null, issues };
}

function validateTransitionChain(run: DigitalRehearsalRun, orderedMomentIds: readonly string[]): RehearsalValidationIssue[] {
  const issues: RehearsalValidationIssue[] = [];
  let previousHash: string | null = null;
  let previousState: DigitalRehearsalRun['state'] = 'ready';
  let previousMomentId: string | null = orderedMomentIds[0] ?? null;
  let previousRecordedAt = run.createdAt;
  const commandIds = new Set<string>();
  run.transitions.forEach((transition, index) => {
    if (transition.previousTransitionHash !== previousHash || transition.transitionHash !== rehearsalTransitionHash(transition)) {
      issues.push(issue('rehearsal-transition-history-corrupt', `/transitions/${index}`, 'سلسلة أحداث البروفة معدلة أو غير مكتملة.'));
    }
    if (transition.runId !== run.runId || transition.previousRunState !== previousState || transition.previousMomentId !== previousMomentId) {
      issues.push(issue('rehearsal-transition-state-chain-invalid', `/transitions/${index}`, 'تسلسل حالة ولحظة البروفة لا يطابق الحدث السابق.'));
    }
    if (!validIso(transition.recordedAt) || transition.timeTrust !== 'local-device-time-untrusted' || Date.parse(transition.recordedAt) < Date.parse(previousRecordedAt)) {
      issues.push(issue('rehearsal-transition-time-invalid', `/transitions/${index}/recordedAt`, 'ترتيب وقت أحداث البروفة غير صالح أو غير مصنف كوقت جهاز محلي غير موثوق.'));
    }
    if (transition.nextMomentId && !orderedMomentIds.includes(transition.nextMomentId)) issues.push(issue('rehearsal-transition-moment-foreign', `/transitions/${index}/nextMomentId`, 'حدث البروفة يشير إلى لحظة خارج يوم التشغيل.'));
    if (['completed', 'aborted'].includes(previousState)) issues.push(issue('rehearsal-transition-after-terminal', `/transitions/${index}`, 'لا يجوز إضافة حدث بعد اكتمال البروفة أو إلغائها.'));
    if (commandIds.has(transition.commandId)) issues.push(issue('rehearsal-command-history-duplicate', `/transitions/${index}/commandId`, 'معرّف أمر مكرر داخل سجل البروفة.'));
    commandIds.add(transition.commandId);
    previousHash = transition.transitionHash;
    previousState = transition.nextRunState;
    previousMomentId = transition.nextMomentId;
    previousRecordedAt = transition.recordedAt;
  });
  if (run.transitions.length && (run.state !== previousState || run.currentMomentId !== previousMomentId)) issues.push(issue('rehearsal-run-state-projection-mismatch', '/', 'الحالة الحالية لا تطابق آخر حدث في سجل البروفة.'));
  if (!run.transitions.length && (run.state !== 'ready' || run.currentMomentId !== (orderedMomentIds[0] ?? null))) issues.push(issue('rehearsal-run-state-without-transition', '/', 'حالة التشغيل تغيرت دون حدث بروفة قانوني.'));
  let previousRevisionHash: string | null = null;
  run.revisions.forEach((revision, index) => {
    if (revision.revision !== index + 1 || revision.previousRevisionHash !== previousRevisionHash || revision.revisionHash !== rehearsalRevisionHash(revision)) {
      issues.push(issue('rehearsal-revision-history-corrupt', `/revisions/${index}`, 'سلسلة مراجعات البروفة معدلة أو غير مرتبة.'));
    }
    const transition = index === 0 ? null : run.transitions[index - 1];
    if (revision.runId !== run.runId || index === 0 && revision.createdAt !== run.createdAt || transition && (revision.commandId !== transition.commandId || revision.createdAt !== transition.recordedAt || revision.timeTrust !== transition.timeTrust)) {
      issues.push(issue('rehearsal-revision-command-mismatch', `/revisions/${index}`, 'مراجعة البروفة لا تطابق أمرها أو وقتها في سجل الأحداث.'));
    }
    previousRevisionHash = revision.revisionHash;
  });
  if (run.revisions.length !== run.transitions.length + 1) issues.push(issue('rehearsal-revision-count-invalid', '/revisions', 'كل حدث بروفة يحتاج مراجعة واحدة بعد مراجعة الإنشاء.'));
  return issues;
}

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function validateDigitalRehearsalRun(
  run: DigitalRehearsalRun,
  plan: DigitalRehearsalPlan
): RehearsalValidationResult<DigitalRehearsalRun> {
  const schema = validateDigitalRehearsalSchema('digital-rehearsal-run', run);
  const issues = [...schema.issues];
  if (run.planId !== plan.planId || run.planHash !== plan.planHash) issues.push(issue('rehearsal-run-plan-mismatch', '/planId', 'التشغيل لا يطابق خطة البروفة المجمدة.'));
  if (run.projectId !== plan.projectId || run.eventId !== plan.eventId || run.venueId !== plan.venueId) issues.push(issue('rehearsal-run-scope-mismatch', '/', 'التشغيل خارج نطاق المشروع أو الفعالية أو الموقع.'));
  const day = plan.eventDays.find((item) => item.eventDayId === run.eventDayId);
  if (!day) issues.push(issue('rehearsal-run-day-unknown', '/eventDayId', 'يوم التشغيل غير معروف داخل الخطة.'));
  const persona = plan.personaVariants.find((item) => item.personaVariantId === run.personaVariantId && item.eventDayId === run.eventDayId);
  if (!persona) issues.push(issue('rehearsal-run-persona-unknown', '/personaVariantId', 'منظور الشخصية غير معروف لهذا اليوم، ولم يُستخدم بديل تلقائي.'));
  const dayMomentIds = new Set(day?.momentIds ?? []);
  const knownEntityIds = new Set(plan.moments.flatMap((moment) => [...moment.relatedEntityIds, ...moment.relatedZoneIds]));
  const knownJourneyStepIds = new Set(plan.moments.flatMap((moment) => moment.journeyStepId ? [moment.journeyStepId] : []));
  const knownSourceTraceIds = new Set(plan.sourceReferences.flatMap((source) => source.sourceTraceIds));
  if (run.currentMomentId && !dayMomentIds.has(run.currentMomentId)) issues.push(issue('rehearsal-run-moment-cross-event', '/currentMomentId', 'اللحظة الحالية لا تنتمي إلى يوم التشغيل.'));
  if (Object.keys(run.momentStates).some((id) => !dayMomentIds.has(id)) || day && day.momentIds.some((id) => !(id in run.momentStates))) issues.push(issue('rehearsal-run-moment-state-mismatch', '/momentStates', 'حالات اللحظات لا تطابق تسلسل اليوم.'));
  if (run.actualExecution || run.baselineMutationAllowed || run.readinessMutationAllowed || run.evidenceVerificationAllowed || run.decisionApprovalAllowed) issues.push(issue('rehearsal-run-truth-mutation-attempt', '/', 'التشغيل يحاول الظهور كتنفيذ فعلي أو تغيير حقيقة محكومة.'));
  if (run.clock.actualTime !== null || run.clock.actualTimeStatus !== 'unavailable' || run.clock.deviceClockAuthority !== 'none') issues.push(issue('rehearsal-device-clock-authority-invalid', '/clock', 'ساعة الجهاز لا يجوز أن تظهر كوقت فعلي أو مرجع زمني معتمد.'));
  if (run.startedAt && !validIso(run.startedAt)) issues.push(issue('rehearsal-run-start-time-invalid', '/startedAt', 'وقت بدء البروفة غير صالح.'));
  if (run.endedAt && !validIso(run.endedAt)) issues.push(issue('rehearsal-run-end-time-invalid', '/endedAt', 'وقت نهاية البروفة غير صالح.'));
  if (run.endedAt && !run.startedAt) issues.push(issue('rehearsal-completion-before-start', '/endedAt', 'لا يجوز إنهاء البروفة قبل بدءها.'));
  if (run.startedAt && run.endedAt && Date.parse(run.endedAt) < Date.parse(run.startedAt)) issues.push(issue('rehearsal-run-time-order-invalid', '/endedAt', 'وقت نهاية البروفة يسبق وقت البدء.'));
  const startTransition = run.transitions.find((transition) => transition.commandType === 'start');
  if (run.startedAt !== (startTransition?.recordedAt ?? null)) issues.push(issue('rehearsal-run-start-transition-mismatch', '/startedAt', 'وقت بدء البروفة لا يطابق حدث البدء القانوني.'));
  if ((run.state === 'completed' || run.state === 'aborted') && !run.outcome) issues.push(issue('rehearsal-terminal-outcome-missing', '/outcome', 'التشغيل المنتهي يحتاج مراجعة بعد الإجراء.'));
  if (run.state !== 'completed' && run.state !== 'aborted' && run.outcome) issues.push(issue('rehearsal-premature-outcome', '/outcome', 'لا يجوز إنشاء نتيجة نهائية قبل اكتمال البروفة أو إلغائها.'));
  if (run.state === 'completed' || run.state === 'aborted') {
    const last = run.transitions.at(-1);
    const expectedCommand = run.state === 'completed' ? 'complete-run' : 'abort-run';
    if (!last || last.commandType !== expectedCommand || run.endedAt !== last.recordedAt) issues.push(issue('rehearsal-terminal-transition-invalid', '/transitions', 'الحالة النهائية لا تطابق آخر أمر ووقت في سجل البروفة.'));
  }
  if (run.state === 'completed' && [...dayMomentIds].some((momentId) => !['completed', 'skipped'].includes(run.momentStates[momentId] ?? 'pending'))) {
    issues.push(issue('rehearsal-forged-completion', '/momentStates', 'لا يجوز إعلان اكتمال البروفة مع لحظات لم تكتمل أو تُتجاوز بسبب.'));
  }
  duplicates(run.observations.map((observation) => observation.observationId)).forEach((id) => issues.push(issue('rehearsal-observation-history-duplicate', '/observations', `معرّف ملاحظة مكرر: ${id}.`)));
  run.observations.forEach((observation, index) => {
    if (observation.runId !== run.runId || !dayMomentIds.has(observation.momentId) || !validIso(observation.recordedAt) || observation.timeTrust !== 'local-device-time-untrusted' || observation.truthStatus !== 'rehearsal-observation-only') {
      issues.push(issue('rehearsal-observation-history-invalid', `/observations/${index}`, 'سجل الملاحظة لا يطابق تشغيل البروفة أو يومها أو تصنيف وقتها وحقيقتها.'));
    }
    if (observation.journeyStepId && !knownJourneyStepIds.has(observation.journeyStepId)) issues.push(issue('rehearsal-observation-journey-foreign', `/observations/${index}/journeyStepId`, 'الملاحظة تشير إلى خطوة رحلة خارج الخطة.'));
    issues.push(...ensureKnownReferences(observation.relatedEntityIds, knownEntityIds, `/observations/${index}/relatedEntityIds`, 'عنصر الملاحظة'));
    if (observation.supersedesObservationId && !run.observations.slice(0, index).some((candidate) => candidate.observationId === observation.supersedesObservationId)) issues.push(issue('rehearsal-observation-supersession-invalid', `/observations/${index}/supersedesObservationId`, 'تصحيح الملاحظة لا يشير إلى سجل سابق موجود.'));
  });
  duplicates(run.issues.map((item) => item.issueId)).forEach((id) => issues.push(issue('rehearsal-issue-history-duplicate', '/issues', `معرّف مسألة مكرر: ${id}.`)));
  run.issues.forEach((item, index) => {
    if (item.runId !== run.runId || !dayMomentIds.has(item.momentId) || !validIso(item.recordedAt) || item.timeTrust !== 'local-device-time-untrusted' || item.truthStatus !== 'rehearsal-observation-only') issues.push(issue('rehearsal-issue-history-invalid', `/issues/${index}`, 'سجل المسألة لا يطابق تشغيل البروفة أو يومها أو تصنيف وقتها وحقيقتها.'));
    if (item.journeyStepId && !knownJourneyStepIds.has(item.journeyStepId)) issues.push(issue('rehearsal-issue-journey-foreign', `/issues/${index}/journeyStepId`, 'المسألة تشير إلى خطوة رحلة خارج الخطة.'));
    issues.push(...ensureKnownReferences(item.relatedEntityIds, knownEntityIds, `/issues/${index}/relatedEntityIds`, 'عنصر المسألة'));
    if (item.supersedesIssueId && !run.issues.slice(0, index).some((candidate) => candidate.issueId === item.supersedesIssueId)) issues.push(issue('rehearsal-issue-supersession-invalid', `/issues/${index}/supersedesIssueId`, 'تصحيح المسألة لا يشير إلى سجل سابق موجود.'));
  });
  run.decisionDraftLinks.forEach((link, index) => {
    if (link.decisionStatus !== 'draft' || link.approvalStatus !== 'draft' || link.classification !== 'rehearsal-only') issues.push(issue('rehearsal-decision-auto-approved', `/decisionDraftLinks/${index}`, 'رابط القرار الناتج من البروفة يجب أن يبقى مسودة بلا اعتماد.'));
    if (link.runId !== run.runId || link.eventDayId !== run.eventDayId || !dayMomentIds.has(link.momentId) || persona && link.personaId !== persona.personaId) issues.push(issue('rehearsal-decision-link-scope-invalid', `/decisionDraftLinks/${index}`, 'رابط مسودة القرار لا يطابق التشغيل واليوم والشخصية.'));
    if (link.journeyStepId && !knownJourneyStepIds.has(link.journeyStepId)) issues.push(issue('rehearsal-decision-link-journey-foreign', `/decisionDraftLinks/${index}/journeyStepId`, 'رابط القرار يشير إلى خطوة رحلة خارج الخطة.'));
    issues.push(...ensureKnownReferences(link.relatedSpatialObjectIds, knownEntityIds, `/decisionDraftLinks/${index}/relatedSpatialObjectIds`, 'عنصر القرار'));
    issues.push(...ensureKnownReferences(link.sourceTraceIds, knownSourceTraceIds, `/decisionDraftLinks/${index}/sourceTraceIds`, 'تتبع مصدر القرار'));
  });
  duplicates(run.branchHistory.map((branch) => branch.branchId)).forEach((id) => issues.push(issue('rehearsal-branch-history-duplicate', '/branchHistory', `معرّف فرع مكرر: ${id}.`)));
  run.branchHistory.forEach((branch, index) => {
    const contingency = plan.contingencies.find((candidate) => candidate.contingencyId === branch.contingencyId);
    if (!contingency || !arraysEqual(branch.affectedMomentIds, contingency.affectedMomentIds) || branch.candidateAlternativeAr !== contingency.candidateAlternativeAr || branch.returnConditionAr !== contingency.returnToPrimaryConditionAr) issues.push(issue('rehearsal-branch-history-invalid', `/branchHistory/${index}`, 'سجل الفرع لا يطابق الاحتمال المرشح المحكوم.'));
    if (!branch.activatedAtCommandId || branch.returnedAtCommandId && branch.returnedAtCommandId === branch.activatedAtCommandId) issues.push(issue('rehearsal-branch-command-invalid', `/branchHistory/${index}`, 'أوامر فتح وإغلاق فرع البروفة غير صالحة.'));
  });
  const activeBranches = run.branchHistory.filter((branch) => !branch.returnedAtCommandId);
  if (activeBranches.length > 1 || (run.activeBranchId ?? null) !== (activeBranches[0]?.branchId ?? null)) issues.push(issue('rehearsal-active-branch-mismatch', '/activeBranchId', 'الفرع النشط لا يطابق سجل الاحتمالات append-only.'));
  if (run.outcome && day) {
    const dayMoments = day.momentIds.map((momentId) => plan.moments.find((moment) => moment.momentId === momentId)!);
    const expectedRehearsed = dayMoments.filter((moment) => ['completed', 'skipped', 'blocked'].includes(run.momentStates[moment.momentId] ?? '')).length;
    const expectedSkipped = dayMoments.filter((moment) => run.momentStates[moment.momentId] === 'skipped').length;
    const expectedBlocked = dayMoments.filter((moment) => run.momentStates[moment.momentId] === 'blocked').length;
    const expectedContingencies = [...new Set(run.branchHistory.map((branch) => branch.contingencyId))];
    if (run.outcome.runId !== run.runId || run.outcome.state !== run.state || run.outcome.plannedMomentCount !== dayMoments.length || run.outcome.rehearsedMomentCount !== expectedRehearsed || run.outcome.skippedMomentCount !== expectedSkipped || run.outcome.blockedMomentCount !== expectedBlocked || run.outcome.uncertainTimingCount !== dayMoments.filter((moment) => moment.plannedTimeClassification !== 'source-reported-window').length || !arraysEqual(run.outcome.issueIds, run.issues.map((item) => item.issueId)) || !arraysEqual(run.outcome.decisionDraftLinkIds, run.decisionDraftLinks.map((link) => link.linkId)) || !arraysEqual(run.outcome.contingencyIds, expectedContingencies)) {
      issues.push(issue('rehearsal-outcome-projection-invalid', '/outcome', 'مراجعة ما بعد البروفة لا تطابق سجل التشغيل ومحتواه.'));
    }
  }
  issues.push(...validateTransitionChain(run, day?.momentIds ?? []));
  if (run.contentHash !== digitalRehearsalRunHash(run)) issues.push(issue('rehearsal-run-hash-mismatch', '/contentHash', 'بصمة تشغيل البروفة لا تطابق محتواه.'));
  const valid = !issues.some((entry) => entry.severity === 'blocking');
  return { valid, value: valid ? structuredClone(run) : null, issues };
}

export function dailyLearningHash(record: DailyLearningRecord): string {
  return sha256PayloadSync({ ...structuredClone(record), contentHash: ZERO_HASH });
}

export function materializeDailyLearningRecord(record: DailyLearningRecord): DailyLearningRecord {
  const candidate = structuredClone(record);
  candidate.contentHash = dailyLearningHash(candidate);
  return candidate;
}

export function validateDailyLearningRecord(
  record: DailyLearningRecord,
  run: DigitalRehearsalRun
): RehearsalValidationResult<DailyLearningRecord> {
  const schema = validateDigitalRehearsalSchema('daily-learning-record', record);
  const issues = [...schema.issues];
  if (record.sourceRunId !== run.runId || record.eventDayId !== run.eventDayId || record.projectId !== run.projectId || record.eventId !== run.eventId || record.venueId !== run.venueId) {
    issues.push(issue('rehearsal-learning-source-run-mismatch', '/sourceRunId', 'سجل التعلم لا يرتبط بتشغيل بروفة معروف في السياق نفسه.'));
  }
  if (!['completed', 'aborted'].includes(run.state)) issues.push(issue('rehearsal-learning-before-review', '/sourceRunId', 'لا ينشأ التعلم اليومي قبل مراجعة تشغيل مكتمل أو ملغى.'));
  if (record.nextDayMutationAllowed || record.baselineMutationAllowed) issues.push(issue('rehearsal-learning-mutation-attempt', '/', 'التعلم المقترح لا يجوز أن يغيّر اليوم التالي أو الخط الأساسي تلقائيًا.'));
  if (record.contentHash !== dailyLearningHash(record)) issues.push(issue('rehearsal-learning-hash-mismatch', '/contentHash', 'بصمة سجل التعلم لا تطابق محتواه.'));
  const valid = !issues.some((entry) => entry.severity === 'blocking');
  return { valid, value: valid ? structuredClone(record) : null, issues };
}

export function deepFreezeRehearsalValue<T>(value: T, seen = new WeakSet<object>()): Readonly<T> {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  Reflect.ownKeys(value).forEach((key) => deepFreezeRehearsalValue(Reflect.get(value, key), seen));
  return Object.freeze(value);
}
