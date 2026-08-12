import type {
  AssertionState,
  OperationalEvent,
  ValidationIssue
} from '../types/integration';
import type { EvidenceResolutionResult, EvidenceResolver } from './evidenceResolver';
import type { ProvenanceResolver } from './provenanceResolver';
import { provenanceRequestForEvent } from './provenanceResolver';

const transitions: Record<AssertionState, AssertionState[]> = {
  reported: ['corroborated', 'verified', 'rejected', 'superseded'],
  corroborated: ['verified', 'rejected', 'superseded'],
  verified: ['approved', 'rejected', 'superseded'],
  approved: ['superseded'],
  rejected: ['superseded'],
  superseded: []
};

export interface TrustTransitionContext {
  event: OperationalEvent;
  targetState: AssertionState;
  supportingEvents: OperationalEvent[];
  evidenceResolution: EvidenceResolutionResult;
  verifierId: string | null;
  approverId: string | null;
  independenceRequired: boolean;
}

export interface TrustTransitionResult {
  allowed: boolean;
  targetState: AssertionState;
  issues: ValidationIssue[];
}

export interface OperationalEventTrustContext {
  evidenceResolver: EvidenceResolver;
  provenanceResolver: ProvenanceResolver;
}

export function evaluateTrustTransition(context: TrustTransitionContext): TrustTransitionResult {
  const current = context.event.trust.assertionState;
  const issues: ValidationIssue[] = [...context.evidenceResolution.issues];
  if (!transitions[current].includes(context.targetState)) {
    issues.push({ code: 'invalid-trust-transition', path: '$.targetState', messageAr: `لا يمكن نقل الادعاء من ${current} إلى ${context.targetState}.`, blocking: true });
  }
  if (context.targetState === 'corroborated') {
    const independentSource = context.supportingEvents.some((event) => event.source.sourceSystemId !== context.event.source.sourceSystemId);
    if (!independentSource) issues.push({ code: 'missing-independent-source', path: '$.supportingEvents', messageAr: 'التأييد يحتاج مصدراً مستقلاً يدعم الادعاء.', blocking: true });
  }
  if (context.targetState === 'verified') {
    const verifiedEvidence = context.evidenceResolution.evidence.some((item) => item.verificationStatus === 'verified');
    if (!verifiedEvidence) issues.push({ code: 'missing-verified-evidence', path: '$.evidence', messageAr: 'التحقق يحتاج دليلاً محلولاً بحالة تم التحقق.', blocking: true });
    if (!context.verifierId) issues.push({ code: 'missing-verifier', path: '$.verifierId', messageAr: 'هوية المتحقق مطلوبة.', blocking: true });
    if (context.independenceRequired && context.verifierId === context.event.source.actorId) {
      issues.push({ code: 'verifier-not-independent', path: '$.verifierId', messageAr: 'لا يجوز للمنفذ أن يكون المتحقق المستقل لنفس الإجراء.', blocking: true });
    }
  }
  if (context.targetState === 'approved') {
    if (current !== 'verified') issues.push({ code: 'approval-before-verification', path: '$.targetState', messageAr: 'لا يعتمد الادعاء قبل التحقق منه.', blocking: true });
    if (!context.approverId) issues.push({ code: 'missing-approver', path: '$.approverId', messageAr: 'هوية سلطة الاعتماد مطلوبة.', blocking: true });
    if (context.independenceRequired && [context.event.source.actorId, context.verifierId].includes(context.approverId)) {
      issues.push({ code: 'approver-not-independent', path: '$.approverId', messageAr: 'سلطة الاعتماد يجب أن تبقى مستقلة عن التنفيذ والتحقق عند اشتراط الفصل.', blocking: true });
    }
  }
  return { allowed: !issues.some((currentIssue) => currentIssue.blocking), targetState: context.targetState, issues };
}

export function isProjectionEligibleAssertion(state: AssertionState): boolean {
  return state === 'verified' || state === 'approved';
}

export function validateOperationalEventRelationships(event: OperationalEvent, history: OperationalEvent[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const correctionTarget = event.relationships.supersedesEventId;
  const errorTarget = event.relationships.errorDeclarationForEventId;
  const isCorrection = event.eventType === 'state.correction';
  const isErrorDeclaration = event.eventType === 'event.error-declared';
  if (isCorrection && (!correctionTarget || errorTarget)) {
    issues.push({ code: 'invalid-correction-relationship', path: '$.relationships', messageAr: 'حدث التصحيح يجب أن يحمل هدف تصحيح واحداً فقط.', blocking: true });
  }
  if (isErrorDeclaration && (!errorTarget || correctionTarget)) {
    issues.push({ code: 'invalid-error-relationship', path: '$.relationships', messageAr: 'إعلان الخطأ يجب أن يحمل هدف خطأ واحداً فقط.', blocking: true });
  }
  if (!isCorrection && !isErrorDeclaration && (correctionTarget || errorTarget)) {
    issues.push({ code: 'relationship-event-type-mismatch', path: '$.relationships', messageAr: 'نوع الحدث لا يسمح بعلاقة تصحيح أو إعلان خطأ.', blocking: true });
  }
  if ((isCorrection || isErrorDeclaration) && !event.relationships.relationshipReason?.trim()) {
    issues.push({ code: 'relationship-reason-missing', path: '$.relationships.relationshipReason', messageAr: 'سبب التصحيح أو إعلان الخطأ مطلوب.', blocking: true });
  }

  const targetId = correctionTarget ?? errorTarget;
  if (!targetId) return issues;
  if (targetId === event.eventId) {
    issues.push({ code: 'event-relationship-self-reference', path: '$.relationships', messageAr: 'لا يجوز للحدث أن يصحح أو يبطل نفسه.', blocking: true });
    return issues;
  }
  const target = history.find((candidate) => candidate.eventId === targetId);
  if (!target) {
    issues.push({ code: isCorrection ? 'correction-target-missing' : 'error-target-missing', path: '$.relationships', messageAr: 'الهدف يجب أن يكون حدثاً سابقاً موجوداً في السجل.', blocking: true });
    return issues;
  }
  if (target.stateContext !== event.stateContext) issues.push({ code: 'event-relationship-context-mismatch', path: '$.relationships', messageAr: 'لا يجوز أن تعبر علاقة التصحيح أو الخطأ بين سياقات الحالة.', blocking: true });
  if (target.subjects.entityId !== event.subjects.entityId) issues.push({ code: 'event-relationship-entity-mismatch', path: '$.relationships', messageAr: 'هدف التصحيح أو الخطأ يجب أن يخص العنصر نفسه.', blocking: true });
  if (target.revision >= event.revision || target.time.recordTime > event.time.recordTime) issues.push({ code: 'event-relationship-not-earlier', path: '$.relationships', messageAr: 'هدف التصحيح أو الخطأ يجب أن يسبق الحدث الجديد زمنياً ومراجعةً.', blocking: true });
  if (history.some((candidate) => candidate.eventId !== event.eventId
    && (candidate.relationships.supersedesEventId === targetId || candidate.relationships.errorDeclarationForEventId === targetId))) {
    issues.push({ code: 'event-target-already-invalidated', path: '$.relationships', messageAr: 'الحدث الهدف سبق تصحيحه أو إبطالُه بعلاقة غير متوافقة.', blocking: true });
  }

  const byId = new Map(history.map((candidate) => [candidate.eventId, candidate]));
  const visited = new Set<string>([event.eventId]);
  let cursor: string | null = targetId;
  while (cursor) {
    if (visited.has(cursor)) {
      issues.push({ code: 'event-relationship-cycle', path: '$.relationships', messageAr: 'علاقة التصحيح أو الخطأ تنشئ دورة غير صالحة.', blocking: true });
      break;
    }
    visited.add(cursor);
    const current = byId.get(cursor);
    cursor = current?.relationships.supersedesEventId ?? current?.relationships.errorDeclarationForEventId ?? null;
  }
  return issues;
}

export function validateOperationalEventTrust(
  event: OperationalEvent,
  history: OperationalEvent[],
  context: OperationalEventTrustContext
): ValidationIssue[] {
  const issues: ValidationIssue[] = [...validateOperationalEventRelationships(event, history)];
  const requiresTrustedEvidence = event.trust.assertionState === 'verified' || event.trust.assertionState === 'approved';
  const evidence = context.evidenceResolver.resolve({
    evidenceRefs: event.evidenceRefs,
    targetEntityId: event.subjects.entityId,
    stateContext: event.stateContext,
    requireVerified: requiresTrustedEvidence,
    relatedRequirementId: requiresTrustedEvidence ? event.subjects.requirementId : null,
    instructionId: event.operationalContext.instructionId,
    instructionVersion: event.operationalContext.instructionVersion
  });
  issues.push(...evidence.issues);
  const provenance = context.provenanceResolver.resolve(provenanceRequestForEvent(event));
  issues.push(...provenance.issues);

  const sameContextEntity = history.filter((candidate) =>
    candidate.stateContext === event.stateContext
    && candidate.subjects.entityId === event.subjects.entityId
  );
  if (event.trust.assertionState === 'corroborated') {
    const independentSupport = sameContextEntity.some((candidate) =>
      candidate.source.sourceSystemId !== event.source.sourceSystemId
      && candidate.operationalContext.proposedDisposition === event.operationalContext.proposedDisposition
    );
    if (!independentSupport) issues.push({ code: 'corroboration-without-independent-source', path: '$.trust.assertionState', messageAr: 'لا تُقبل حالة التأييد دون مصدر مستقل يحمل الادعاء نفسه.', blocking: true });
  }
  if (requiresTrustedEvidence && !evidence.evidence.some((item) => item.verificationStatus === 'verified')) {
    issues.push({ code: 'trusted-event-without-verified-evidence', path: '$.evidenceRefs', messageAr: 'الحدث المتحقق أو المعتمد يحتاج دليلاً محلولاً تم التحقق منه.', blocking: true });
  }
  if (event.trust.assertionState === 'verified') {
    const prior = sameContextEntity.at(-1);
    if (prior && prior.source.actorId === event.source.actorId) issues.push({ code: 'verifier-not-independent', path: '$.source.actorId', messageAr: 'المتحقق يجب أن يكون مستقلاً عن منفذ الادعاء السابق.', blocking: true });
    if (event.eventType === 'verification.completed' && event.source.actorRole !== 'independent-verifier') issues.push({ code: 'verification-authority-missing', path: '$.source.actorRole', messageAr: 'حدث التحقق يحتاج دور متحقق مستقل.', blocking: true });
  }
  if (event.trust.assertionState === 'approved') {
    const verifiedPrior = [...sameContextEntity].reverse().find((candidate) => candidate.trust.assertionState === 'verified');
    if (!verifiedPrior) issues.push({ code: 'approval-without-verification', path: '$.trust.assertionState', messageAr: 'لا يعتمد الحدث قبل وجود حدث تحقق سابق في السياق نفسه.', blocking: true });
    if (verifiedPrior && verifiedPrior.source.actorId === event.source.actorId) issues.push({ code: 'approver-not-independent', path: '$.source.actorId', messageAr: 'سلطة الاعتماد يجب أن تبقى مستقلة عن المتحقق.', blocking: true });
    if (!event.trust.authorityRequirement || event.source.actorRole !== event.trust.authorityRequirement) issues.push({ code: 'approval-authority-mismatch', path: '$.source.actorRole', messageAr: 'دور منفذ الاعتماد لا يطابق السلطة المطلوبة في الحدث.', blocking: true });
  }
  return issues;
}
