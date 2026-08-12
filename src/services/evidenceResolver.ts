import type {
  CanonicalEvidenceReference,
  EvidenceType,
  ValidationIssue
} from '../types/integration';
import type { OperationalStateContext, SpatialEntityId } from '../types/spatial';
import { stableSerialize } from './integrationHash';
import { validateEvidenceReference } from './integrationValidation';

export interface EvidenceResolutionRequest {
  evidenceRefs: string[];
  targetEntityId: SpatialEntityId | null;
  stateContext: OperationalStateContext;
  requiredTypes?: EvidenceType[];
  requireVerified?: boolean;
  relatedEventId?: string | null;
  relatedRequirementId?: string | null;
  relatedActionId?: string | null;
  instructionId?: string | null;
  instructionVersion?: string | null;
}

export interface EvidenceResolutionResult {
  valid: boolean;
  evidence: CanonicalEvidenceReference[];
  issues: ValidationIssue[];
}

function issue(code: string, path: string, messageAr: string, blocking = true): ValidationIssue {
  return { code, path, messageAr, blocking };
}

export class EvidenceResolver {
  private readonly evidenceById = new Map<string, CanonicalEvidenceReference>();

  constructor(evidence: CanonicalEvidenceReference[], private readonly knownEntityIds: ReadonlySet<SpatialEntityId>) {
    for (const item of evidence) {
      if (this.evidenceById.has(item.evidenceId)) throw new Error(`Duplicate evidence reference: ${item.evidenceId}`);
      this.evidenceById.set(item.evidenceId, structuredClone(item));
    }
  }

  get(evidenceId: string): CanonicalEvidenceReference | undefined {
    const evidence = this.evidenceById.get(evidenceId);
    return evidence ? structuredClone(evidence) : undefined;
  }

  list(): CanonicalEvidenceReference[] {
    return [...this.evidenceById.values()].map((item) => structuredClone(item));
  }

  resolve(request: EvidenceResolutionRequest): EvidenceResolutionResult {
    const issues: ValidationIssue[] = [];
    const resolved: CanonicalEvidenceReference[] = [];
    const seen = new Set<string>();

    request.evidenceRefs.forEach((evidenceId, index) => {
      const path = `$.evidenceRefs[${index}]`;
      if (seen.has(evidenceId)) {
        issues.push(issue('duplicate-evidence-reference', path, `مرجع الدليل ${evidenceId} مكرر.`));
        return;
      }
      seen.add(evidenceId);
      const evidence = this.evidenceById.get(evidenceId);
      if (!evidence) {
        issues.push(issue('unresolved-evidence', path, `مرجع الدليل ${evidenceId} غير موجود في سجل الأدلة المعتمد للمختبر.`));
        return;
      }

      const contractIssues = validateEvidenceReference(evidence, this.knownEntityIds)
        .map((currentIssue) => ({ ...currentIssue, path: `${path}${currentIssue.path === '$' ? '' : currentIssue.path.slice(1)}` }));
      issues.push(...contractIssues);
      if (contractIssues.some((currentIssue) => currentIssue.blocking)) return;

      if (evidence.stateContext !== request.stateContext) {
        issues.push(issue('evidence-context-mismatch', path, `الدليل ${evidenceId} ينتمي إلى سياق مختلف ولا يمكن استخدامه هنا.`));
      }
      if (
        request.targetEntityId
        && !evidence.relatedEntityIds.includes(request.targetEntityId)
      ) {
        issues.push(issue('evidence-entity-mismatch', path, `الدليل ${evidenceId} غير مرتبط بالعنصر المستهدف ${request.targetEntityId}.`));
      }
      if (evidence.verificationStatus === 'rejected' || evidence.verificationStatus === 'expired') {
        issues.push(issue('evidence-not-usable', path, `الدليل ${evidenceId} مرفوض أو منتهي الصلاحية.`));
      }
      if (evidence.supersededByEvidenceId) {
        issues.push(issue('evidence-superseded', path, `الدليل ${evidenceId} مستبدل بالدليل ${evidence.supersededByEvidenceId}.`));
      }
      if (request.requireVerified && evidence.verificationStatus !== 'verified') {
        issues.push(issue('evidence-not-verified', path, `الدليل ${evidenceId} لم يصل إلى حالة تحقق صالحة لهذا الإجراء.`));
      }
      if (request.relatedEventId && !evidence.relatedEventIds.includes(request.relatedEventId)) {
        issues.push(issue('evidence-event-mismatch', path, `الدليل ${evidenceId} غير مرتبط بالحدث المطلوب.`));
      }
      if (request.relatedRequirementId && !evidence.relatedRequirementIds.includes(request.relatedRequirementId)) {
        issues.push(issue('evidence-requirement-mismatch', path, `الدليل ${evidenceId} غير مرتبط بالمتطلب المطلوب.`));
      }
      if (request.relatedActionId && !evidence.relatedActionIds.includes(request.relatedActionId)) {
        issues.push(issue('evidence-action-mismatch', path, `الدليل ${evidenceId} غير مرتبط بالفعل المحكوم المطلوب.`));
      }
      if (request.instructionId && evidence.instructionId !== request.instructionId) {
        issues.push(issue('evidence-instruction-mismatch', path, `الدليل ${evidenceId} لا يطابق تعليمات العمل المطلوبة.`));
      }
      if (request.instructionVersion && evidence.instructionVersion !== request.instructionVersion) {
        issues.push(issue('evidence-instruction-version-mismatch', path, `إصدار تعليمات الدليل ${evidenceId} لا يطابق إصدار الإجراء.`));
      }
      resolved.push(structuredClone(evidence));
    });

    for (const requiredType of request.requiredTypes ?? []) {
      if (!resolved.some((evidence) => evidence.evidenceType === requiredType)) {
        issues.push(issue('missing-required-evidence', '$.evidenceRefs', `لا يوجد دليل محلول من النوع المطلوب ${requiredType}.`));
      }
    }

    return {
      valid: !issues.some((currentIssue) => currentIssue.blocking),
      evidence: resolved,
      issues
    };
  }

  matchesRegistry(candidate: CanonicalEvidenceReference): boolean {
    const stored = this.evidenceById.get(candidate.evidenceId);
    return Boolean(stored && stableSerialize(stored) === stableSerialize(candidate));
  }
}
