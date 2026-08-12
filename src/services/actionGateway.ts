import type {
  ActionDefinition,
  ActionExecutionResult,
  ActionSubmission,
  ActionValidationResult,
  EvidenceType,
  OperationalEvent,
  ValidationIssue
} from '../types/integration';
import type { SpatialEntityId } from '../types/spatial';
import type { EvidenceResolver } from './evidenceResolver';
import { isSha256, sha256Payload, stableSerialize } from './integrationHash';
import { validateOperationalEvent } from './integrationValidation';
import type { OperationalEventRepository } from './operationalEventRepository';
import type { ProvenanceResolver } from './provenanceResolver';
import { provenanceRequestForEvent } from './provenanceResolver';

export interface ActionGatewayOptions {
  definitions: ActionDefinition[];
  knownEntityIds: Iterable<SpatialEntityId>;
  evidenceResolver: EvidenceResolver;
  provenanceResolver: ProvenanceResolver;
  repository: OperationalEventRepository;
  eventFactory: (submission: ActionSubmission) => OperationalEvent;
}

type ExecutionStep = ActionExecutionResult['executionSteps'][number];

export function actionSubmissionPayloadHash(submission: ActionSubmission): Promise<string> {
  return sha256Payload({ ...submission, payloadHash: null });
}

function step(stepId: ExecutionStep['stepId'], status: ExecutionStep['status'], messageAr: string): ExecutionStep {
  return { stepId, status, messageAr };
}

function skippedSteps(after: ExecutionStep['stepId']): ExecutionStep[] {
  const ids: ExecutionStep['stepId'][] = ['validation', 'evidence-provenance', 'event-construction', 'event-validation', 'repository-append', 'idempotency-commit'];
  return ids.slice(ids.indexOf(after) + 1).map((stepId) => step(stepId, 'not-run', 'لم تُنفذ هذه الخطوة بعد فشل الخطوة السابقة.'));
}

function result(
  validation: ActionValidationResult,
  submission: ActionSubmission,
  overrides: Partial<ActionExecutionResult> = {}
): ActionExecutionResult {
  return {
    ...validation,
    submissionId: submission.submissionId,
    operationalEvent: null,
    appliedToProjection: false,
    evidenceUsed: [],
    provenanceUsed: [],
    repositoryStatus: 'not-attempted',
    executionSteps: [],
    ...overrides
  };
}

export class ActionGateway {
  private readonly definitions: Map<string, ActionDefinition>;
  private readonly knownEntityIds: Set<SpatialEntityId>;

  constructor(private readonly options: ActionGatewayOptions) {
    this.definitions = new Map(options.definitions.map((definition) => [`${definition.actionType}@${definition.version}`, definition]));
    this.knownEntityIds = new Set(options.knownEntityIds);
  }

  async validate(submission: ActionSubmission): Promise<ActionValidationResult> {
    const issues: ValidationIssue[] = [];
    const definition = this.definitions.get(`${submission.actionType}@${submission.actionVersion}`);
    if (!definition) issues.push({ code: 'unknown-action', path: '$.actionType', messageAr: 'الإجراء أو إصداره غير مسجل في بوابة الأفعال.', blocking: true });
    if (submission.actionType === 'set-readiness' || submission.actionType === 'edit-readiness-percentage') {
      issues.push({ code: 'direct-readiness-edit-forbidden', path: '$.actionType', messageAr: 'لا يجوز إدخال نسبة الجاهزية مباشرة؛ تُشتق من نتائج المتطلبات.', blocking: true });
    }
    if (!submission.actorId.trim()) issues.push({ code: 'missing-actor', path: '$.actorId', messageAr: 'هوية المنفذ مطلوبة.', blocking: true });
    if (!submission.actorRole.trim()) issues.push({ code: 'missing-role', path: '$.actorRole', messageAr: 'دور المنفذ مطلوب.', blocking: true });
    if (!this.knownEntityIds.has(submission.targetEntityId)) issues.push({ code: 'unknown-entity', path: '$.targetEntityId', messageAr: `العنصر ${submission.targetEntityId} غير معروف.`, blocking: true });
    if (submission.offlineSequence !== null && (!Number.isInteger(submission.offlineSequence) || submission.offlineSequence < 1)) {
      issues.push({ code: 'invalid-offline-sequence', path: '$.offlineSequence', messageAr: 'تسلسل العمل دون اتصال يجب أن يكون عدداً صحيحاً موجباً أو فارغاً.', blocking: true });
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(submission.idempotencyKey)) {
      issues.push({ code: 'invalid-idempotency-key', path: '$.idempotencyKey', messageAr: 'مفتاح منع التكرار غير صالح بنيوياً.', blocking: true });
    }
    if (!isSha256(submission.payloadHash)) issues.push({ code: 'invalid-action-payload-hash', path: '$.payloadHash', messageAr: 'بصمة حمولة الفعل يجب أن تكون SHA-256 صالحة.', blocking: true });
    if (isSha256(submission.payloadHash)) {
      const expectedPayloadHash = await actionSubmissionPayloadHash(submission);
      if (submission.payloadHash !== expectedPayloadHash) {
        issues.push({ code: 'action-payload-hash-mismatch', path: '$.payloadHash', messageAr: 'بصمة حمولة الفعل لا تطابق محتواه القانوني.', blocking: true });
      }
    }
    if (definition) {
      if (!definition.allowedRoles.includes(submission.actorRole)) issues.push({ code: 'unauthorized-role', path: '$.actorRole', messageAr: 'الدور الحالي لا يملك سلطة تنفيذ هذا الإجراء.', blocking: true });
      if (!definition.allowedCurrentDispositions.includes(submission.currentDisposition)) issues.push({ code: 'state-precondition-failed', path: '$.currentDisposition', messageAr: 'الحالة الحالية لا تحقق شرط الإجراء.', blocking: true });
      if (!definition.requiredStateContexts.includes(submission.stateContext)) issues.push({ code: 'context-not-allowed', path: '$.stateContext', messageAr: 'سياق الحالة غير مسموح لهذا الإجراء.', blocking: true });
      if (submission.instructionVersion !== definition.version) issues.push({ code: 'instruction-version-mismatch', path: '$.instructionVersion', messageAr: 'إصدار تعليمات العمل لا يطابق تعريف الإجراء.', blocking: true });
      if (definition.locationRequired && !submission.locationRef) issues.push({ code: 'missing-location', path: '$.locationRef', messageAr: 'مرجع الموقع مطلوب لهذا الإجراء.', blocking: true });
      for (const ruleId of definition.dependencyRuleIds) {
        if (submission.dependencyStates[ruleId] !== 'satisfied') issues.push({ code: 'dependency-not-satisfied', path: `$.dependencyStates.${ruleId}`, messageAr: 'يوجد اعتماد تشغيلي غير مكتمل.', blocking: true });
      }
      for (const requiredStep of definition.requiredSequence) {
        if (!submission.completedSequence.includes(requiredStep)) issues.push({ code: 'required-sequence-missing', path: '$.completedSequence', messageAr: 'تسلسل العمل الإلزامي غير مكتمل.', blocking: true });
      }
      if (definition.requiresApproval && !submission.approvalRef) issues.push({ code: 'missing-approval', path: '$.approvalRef', messageAr: 'مرجع الاعتماد مطلوب قبل الإجراء.', blocking: true });
      if (definition.requiresIndependentVerifier && (!submission.verifierId || submission.verifierId === submission.actorId)) {
        issues.push({ code: 'independent-verifier-required', path: '$.verifierId', messageAr: 'يلزم متحقق مستقل عن المنفذ.', blocking: true });
      }
      const evidence = this.options.evidenceResolver.resolve({
        evidenceRefs: submission.evidenceRefs,
        targetEntityId: submission.targetEntityId,
        stateContext: submission.stateContext,
        requiredTypes: definition.requiredEvidenceTypes,
        requireVerified: definition.requiredEvidenceVerificationStatus === 'verified',
        relatedActionId: submission.submissionId,
        instructionId: submission.instructionId,
        instructionVersion: submission.instructionVersion
      });
      issues.push(...evidence.issues);
    }
    const provenance = this.options.provenanceResolver.resolve({
      provenanceRefs: submission.provenanceRefs,
      eventId: submission.resultingEventId,
      stateContext: submission.stateContext,
      sourceRecordId: submission.sourceRecordId,
      sourceSystemId: submission.sourceSystemId,
      adapterId: submission.adapterId,
      adapterVersion: submission.adapterVersion
    });
    issues.push(...provenance.issues);
    return { valid: !issues.some((currentIssue) => currentIssue.blocking), outcome: issues.some((currentIssue) => currentIssue.blocking) ? 'rejected' : 'accepted', issues };
  }

  async execute(submission: ActionSubmission): Promise<ActionExecutionResult> {
    const validation = await this.validate(submission);
    if (!validation.valid) {
      return result(validation, submission, {
        executionSteps: [step('validation', 'failed', validation.issues.find((currentIssue) => currentIssue.blocking)?.messageAr ?? 'فشل التحقق من الإجراء.'), ...skippedSteps('validation')]
      });
    }
    const trace: ExecutionStep[] = [
      step('validation', 'passed', 'اجتاز الإجراء قواعد السلطة والسياق والتسلسل.'),
      step('evidence-provenance', 'passed', 'حُلّت مراجع الأدلة والمصدر وربطت بالعنصر والسياق الصحيحين.')
    ];
    let operationalEvent: OperationalEvent;
    try {
      operationalEvent = this.options.eventFactory(submission);
      trace.push(step('event-construction', 'passed', 'بُني الحدث التشغيلي من الفعل المحكوم.'));
    } catch (error) {
      const eventIssue: ValidationIssue = { code: 'event-construction-failed', path: '$.eventFactory', messageAr: error instanceof Error ? `تعذر إنشاء الحدث: ${error.message}` : 'تعذر إنشاء الحدث بسبب خطأ غير معروف.', blocking: true };
      return result({ valid: false, outcome: 'rejected', issues: [eventIssue] }, submission, {
        executionSteps: [...trace, step('event-construction', 'failed', eventIssue.messageAr), ...skippedSteps('event-construction')]
      });
    }

    const eventIssues = validateOperationalEvent(operationalEvent, this.knownEntityIds);
    if (operationalEvent.eventId !== submission.resultingEventId) eventIssues.push({ code: 'action-event-id-mismatch', path: '$.eventId', messageAr: 'هوية الحدث الناتج لا تطابق الهوية المحجوزة للفعل.', blocking: true });
    if (operationalEvent.subjects.entityId !== submission.targetEntityId) eventIssues.push({ code: 'action-event-entity-mismatch', path: '$.subjects.entityId', messageAr: 'عنصر الحدث الناتج لا يطابق هدف الفعل.', blocking: true });
    if (operationalEvent.stateContext !== submission.stateContext) eventIssues.push({ code: 'action-event-context-mismatch', path: '$.stateContext', messageAr: 'سياق الحدث الناتج لا يطابق سياق الفعل.', blocking: true });
    if (!sameReferences(operationalEvent.evidenceRefs, submission.evidenceRefs)) eventIssues.push({ code: 'action-event-evidence-mismatch', path: '$.evidenceRefs', messageAr: 'مراجع أدلة الحدث الناتج لا تطابق الأدلة التي اجتازت الحل.', blocking: true });
    if (!sameReferences(operationalEvent.provenanceRefs, submission.provenanceRefs)) eventIssues.push({ code: 'action-event-provenance-mismatch', path: '$.provenanceRefs', messageAr: 'مراجع مصدر الحدث الناتج لا تطابق المصدر الذي اجتاز الحل.', blocking: true });
    if (operationalEvent.delivery.payloadHash !== submission.payloadHash) eventIssues.push({ code: 'action-event-payload-hash-mismatch', path: '$.delivery.payloadHash', messageAr: 'بصمة حمولة الحدث لا تطابق البصمة القانونية للفعل المقبول.', blocking: true });
    if (operationalEvent.delivery.idempotencyKey !== submission.idempotencyKey) eventIssues.push({ code: 'action-event-idempotency-key-mismatch', path: '$.delivery.idempotencyKey', messageAr: 'مفتاح منع تكرار الحدث لا يطابق مفتاح الفعل المقبول.', blocking: true });
    if (operationalEvent.delivery.offlineSequence !== submission.offlineSequence) eventIssues.push({ code: 'action-event-offline-sequence-mismatch', path: '$.delivery.offlineSequence', messageAr: 'تسلسل العمل دون اتصال في الحدث لا يطابق الفعل المقبول.', blocking: true });
    if (operationalEvent.source.sourceRecordId !== submission.sourceRecordId || operationalEvent.source.sourceSystemId !== submission.sourceSystemId) {
      eventIssues.push({ code: 'action-event-source-mismatch', path: '$.source', messageAr: 'هوية مصدر الحدث لا تطابق سجل المصدر ونظامه في الفعل المقبول.', blocking: true });
    }
    if (operationalEvent.source.adapterId !== submission.adapterId || operationalEvent.source.adapterVersion !== submission.adapterVersion) {
      eventIssues.push({ code: 'action-event-adapter-mismatch', path: '$.source', messageAr: 'هوية الموائم أو إصداره في الحدث لا تطابق الفعل المقبول.', blocking: true });
    }
    const definition = this.definitions.get(`${submission.actionType}@${submission.actionVersion}`);
    const eventEvidence = this.options.evidenceResolver.resolve({
      evidenceRefs: operationalEvent.evidenceRefs,
      targetEntityId: operationalEvent.subjects.entityId,
      stateContext: operationalEvent.stateContext,
      requiredTypes: definition?.requiredEvidenceTypes,
      requireVerified: definition?.requiredEvidenceVerificationStatus === 'verified',
      relatedActionId: submission.submissionId,
      instructionId: operationalEvent.operationalContext.instructionId,
      instructionVersion: operationalEvent.operationalContext.instructionVersion
    });
    const eventProvenance = this.options.provenanceResolver.resolve(provenanceRequestForEvent(operationalEvent));
    eventIssues.push(...eventEvidence.issues, ...eventProvenance.issues);
    if (eventIssues.some((currentIssue) => currentIssue.blocking)) {
      return result({ valid: false, outcome: 'rejected', issues: eventIssues }, submission, {
        operationalEvent,
        evidenceUsed: [...submission.evidenceRefs],
        provenanceUsed: [...submission.provenanceRefs],
        executionSteps: [...trace, step('event-validation', 'failed', eventIssues[0]?.messageAr ?? 'فشل عقد الحدث.'), ...skippedSteps('event-validation')]
      });
    }
    trace.push(step('event-validation', 'passed', 'اجتاز الحدث العقد القانوني واتساق الهدف والسياق.'));

    try {
      const appendResult = await this.options.repository.append(operationalEvent);
      if (appendResult.status === 'duplicate') {
        return result({ valid: true, outcome: 'duplicate-ignored', issues: [{ code: 'repository-duplicate', path: '$.idempotencyKey', messageAr: appendResult.messageAr, blocking: false }] }, submission, {
          operationalEvent,
          repositoryStatus: 'duplicate',
          evidenceUsed: [...submission.evidenceRefs],
          provenanceUsed: [...submission.provenanceRefs],
          executionSteps: [...trace, step('repository-append', 'passed', 'وجد السجل الحدث السابق ومنع التكرار.'), step('idempotency-commit', 'not-run', 'لم يحتج السجل إلى تثبيت مفتاح جديد.')]
        });
      }
      if (appendResult.status === 'conflict') {
        return result({ valid: false, outcome: 'conflict-detected', issues: [{ code: `repository-${appendResult.collisionType}-conflict`, path: '$.idempotencyKey', messageAr: appendResult.messageAr, blocking: true }] }, submission, {
          operationalEvent,
          repositoryStatus: 'conflict',
          evidenceUsed: [...submission.evidenceRefs],
          provenanceUsed: [...submission.provenanceRefs],
          executionSteps: [...trace, step('repository-append', 'failed', appendResult.messageAr), step('idempotency-commit', 'not-run', 'لم يُثبت أي مفتاح بعد اكتشاف التعارض.')]
        });
      }
      trace.push(step('repository-append', 'passed', 'أضيف الحدث إلى السجل المحلي غير القابل للتعديل.'));
    } catch (error) {
      const repositoryIssue: ValidationIssue = { code: 'repository-append-failed', path: '$.repository', messageAr: error instanceof Error ? `فشل إلحاق الحدث بالسجل: ${error.message}` : 'فشل إلحاق الحدث بالسجل.', blocking: true };
      return result({ valid: false, outcome: 'rejected', issues: [repositoryIssue] }, submission, {
        operationalEvent,
        evidenceUsed: [...submission.evidenceRefs],
        provenanceUsed: [...submission.provenanceRefs],
        repositoryStatus: 'failed',
        executionSteps: [...trace, step('repository-append', 'failed', repositoryIssue.messageAr), ...skippedSteps('repository-append')]
      });
    }

    trace.push(step('idempotency-commit', 'passed', 'ثُبتت بصمة منع التكرار داخل السجل بعد نجاح الإلحاق.'));
    return result({ ...validation, outcome: submission.actionType === 'report-exception' ? 'exception-created' : 'accepted' }, submission, {
      operationalEvent,
      evidenceUsed: [...submission.evidenceRefs],
      provenanceUsed: [...submission.provenanceRefs],
      repositoryStatus: 'appended',
      executionSteps: trace
    });
  }
}

export const referenceActionDefinitions: ActionDefinition[] = [
  {
    actionType: 'confirm-work-completion',
    version: '1.0.0',
    allowedRoles: ['field-operator', 'zone-supervisor'],
    allowedCurrentDispositions: ['in-progress'],
    requiredEvidenceTypes: ['inspection-result'],
    requiredEvidenceVerificationStatus: 'verified',
    requiredSequence: ['work.started'],
    requiredStateContexts: ['temporary-demo', 'baseline', 'scenario'],
    requiresApproval: false,
    requiresIndependentVerifier: false,
    locationRequired: true,
    dependencyRuleIds: ['DEPENDENCY-WORK-STARTED']
  },
  {
    actionType: 'verify-work',
    version: '1.0.0',
    allowedRoles: ['independent-verifier'],
    allowedCurrentDispositions: ['completed-unverified'],
    requiredEvidenceTypes: ['inspection-result'],
    requiredEvidenceVerificationStatus: 'verified',
    requiredSequence: ['work.completed'],
    requiredStateContexts: ['temporary-demo', 'baseline'],
    requiresApproval: false,
    requiresIndependentVerifier: true,
    locationRequired: true,
    dependencyRuleIds: ['DEPENDENCY-COMPLETION-RECORDED']
  },
  {
    actionType: 'report-exception',
    version: '1.0.0',
    allowedRoles: ['field-operator', 'zone-supervisor', 'hse-inspector'],
    allowedCurrentDispositions: ['not-started', 'in-progress', 'completed-unverified'],
    requiredEvidenceTypes: [],
    requiredEvidenceVerificationStatus: 'usable',
    requiredSequence: [],
    requiredStateContexts: ['temporary-demo', 'baseline', 'scenario'],
    requiresApproval: false,
    requiresIndependentVerifier: false,
    locationRequired: true,
    dependencyRuleIds: []
  }
];

export function deriveHumanActionSubmission(
  context: Omit<ActionSubmission, 'judgment'> | ActionSubmission,
  judgment: ActionSubmission['judgment']
): ActionSubmission {
  return { ...context, judgment };
}

function sameReferences(left: string[], right: string[]): boolean {
  return stableSerialize([...left].sort()) === stableSerialize([...right].sort());
}

export function evidenceTypeLabelAr(type: EvidenceType): string {
  const labels: Record<EvidenceType, string> = {
    image: 'صورة',
    video: 'فيديو',
    document: 'مستند',
    measurement: 'قياس',
    'sensor-observation': 'ملاحظة جهاز',
    'inspection-result': 'نتيجة فحص',
    signature: 'توقيع',
    'external-record': 'سجل خارجي',
    'spatial-viewpoint': 'منظور مكاني'
  };
  return labels[type];
}
