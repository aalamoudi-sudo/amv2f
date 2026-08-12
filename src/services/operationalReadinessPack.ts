import { sha256PayloadSync } from './integrationHash';
import {
  deriveExpectedOperationalAuthorities,
  operationalAuthorityRequirementPolicy
} from './operationalAuthorityRequirementPolicy';
import {
  deriveOperationalAuthorityTriggerFingerprint,
  hashOperationalAuthorityTriggerFact,
  operationalAuthorityTriggerFactId,
  operationalAuthorityTriggerFactMatchesRequirement,
  operationalAuthorityTriggerKinds,
  operationalAuthorityTriggerPolicyId,
  operationalAuthorityTriggerSourceInputFingerprint
} from './operationalAuthorityTriggerPolicy';
import {
  verifyOperationalAuthorityWaiverIdentity
} from './operationalAuthorityWaiver';
import {
  deriveOperationalReadinessAuthorityAssignmentFingerprint
} from './operationalReadinessCustodyFingerprint';
import {
  acceptOperationalReadinessRevision,
  discardOperationalReadinessRevisionPermit,
  inspectOperationalReadinessTrustSession,
  inspectOperationalReadinessWaiverLedger,
  prepareOperationalReadinessActivationRevision,
  prepareOperationalReadinessAuthoringRevision,
  prepareOperationalReadinessFreezeRevision,
  prepareOperationalReadinessLocalDraft,
  resolveOperationalReadinessTrustedEvidence
} from './operationalReadinessTrustGateway';
import {
  operationalReadinessPackStatusValues,
  readinessPackSourceClassificationValues,
  type OperationalAuthorityKind,
  type OperationalExpectedAuthorityObligation,
  type OperationalGovernanceAuthorityReference,
  type OperationalGovernanceAssertion,
  type OperationalReadinessActivationRecord,
  type OperationalReadinessActorReference,
  type OperationalReadinessAuthoringState,
  type OperationalReadinessConflict,
  type OperationalReadinessDecisionDraft,
  type OperationalReadinessEligibilityGate,
  type OperationalReadinessGapRecord,
  type OperationalReadinessPack,
  type OperationalReadinessPackDiagnostics,
  type OperationalReadinessPackDiffEntry,
  type OperationalReadinessPackRevision,
  type OperationalReadinessRequirement,
  type OperationalReadinessSource,
  type OperationalReadinessSourceExtractionManifest,
  type OperationalReadinessAuthoritySlot,
  type OperationalRequiredAuthorityDeclaration,
  type ReadinessPackPreparationMetric,
  type ReadinessPackPreparationSnapshot
} from '../types/operationalReadinessPack';
import type {
  OperationalReadinessRevisionAuthorityCommand,
  OperationalReadinessRevisionPermit,
  OperationalReadinessTrustSession
} from '../types/operationalReadinessTrust';

type PackWithoutHash = Omit<OperationalReadinessPack, 'contentHash'>;
type JsonObject = Record<string, unknown>;

export interface OperationalReadinessPackValidationIssue {
  code: string;
  path: string;
  messageAr: string;
}

export interface OperationalReadinessPackValidationResult {
  valid: boolean;
  issues: OperationalReadinessPackValidationIssue[];
}

export interface OperationalReadinessPackValidationContext {
  trustSession?: OperationalReadinessTrustSession;
  revisionPermit?: OperationalReadinessRevisionPermit;
}

export interface OperationalAuthorityContractProjection {
  expected: OperationalExpectedAuthorityObligation;
  declaration: OperationalRequiredAuthorityDeclaration | null;
  authoritySlot: OperationalReadinessAuthoritySlot | null;
  contractStatus: 'matched' | 'missing-declaration' | 'mismatched';
  assignmentStatus: 'assigned' | 'not-applicable' | 'missing-or-invalid';
  activeTriggerCount: number;
  waiverStatus: 'not-requested' | 'valid' | 'invalid' | 'prohibited';
  resolverStatus: 'not-required' | 'resolved' | 'unresolved';
  evidenceResolutionStatus: 'not-required' | 'resolved' | 'unresolved';
  chronologyStatus: 'not-required' | 'valid' | 'invalid';
  issueMessagesAr: string[];
}

export type OperationalReadinessPackTransitionInput =
  OperationalReadinessRevisionAuthorityCommand;

export type OperationalReadinessPackFreezeResult =
  | {
    frozen: false;
    blockingGateIds: string[];
    messageAr: string;
  }
  | {
    frozen: true;
    blockingGateIds: [];
    messageAr: string;
    pack: OperationalReadinessPack;
  };

export interface OperationalReadinessPackActivationInput
  extends OperationalReadinessPackTransitionInput {
  actor: OperationalReadinessActorReference;
}

export type OperationalReadinessPackActivationResult =
  | {
    activated: false;
    blockingGateIds: string[];
    messageAr: string;
  }
  | {
    activated: true;
    blockingGateIds: [];
    messageAr: string;
    pack: OperationalReadinessPack;
  };

const percentMetricDefinitions = {
  'source-coverage': ['تغطية المصدر', 'تقيس وجود تصنيف ومحدد مصدر صالح للمتطلبات القانونية.'],
  'workstream-coverage': ['تغطية مسارات العمل', 'تقيس ارتباط المتطلبات القانونية بمسارات عمل معرّفة.'],
  'owner-coverage': ['تغطية المالك', 'تقيس تعيين مالك لكل متطلب قانوني دون استنتاج سلطة.'],
  'responsible-party-coverage': ['تغطية مسؤول التنفيذ', 'تقيس تعيين الطرف المسؤول عن التسليم دون تعارض مفتوح.'],
  'verification-authority-coverage': ['تغطية جهة التحقق', 'تقيس وجود جهة تحقق منفصلة ومحددة.'],
  'approval-authority-coverage': ['تغطية الاعتماد الداخلي', 'تقيس وجود جهة اعتماد داخلية صريحة.'],
  'external-acceptance-coverage': ['تغطية القبول الخارجي', 'تقيس وجود جهة قبول خارجية صريحة.'],
  'evidence-rule-coverage': ['تغطية قواعد الدليل', 'تقيس اكتمال نوع الدليل وحفظه والتحقق منه.'],
  'spatial-scope-coverage': ['تغطية النطاق المكاني', 'تقيس الربط المرشح أو التصريح الموثق بعدم انطباق النطاق.'],
  'dependency-coverage': ['تغطية التبعيات', 'تقيس تمثيل التبعيات بمعرّفات متطلبات صالحة.']
} as const;

const legalClassifications = new Set(['source-backed', 'founder-directed', 'conflicting']);
const assignableActorClassifications = new Set(['source-backed', 'founder-directed']);

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepFreezeValue<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== 'object') return value;
  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);
  Reflect.ownKeys(object).forEach((key) => {
    deepFreezeValue((object as Record<PropertyKey, unknown>)[key], seen);
  });
  return Object.freeze(value);
}

export function immutableOperationalReadinessClone<T>(value: T): T {
  return deepFreezeValue(structuredClone(value));
}

function withoutContentHash(pack: OperationalReadinessPack | PackWithoutHash): PackWithoutHash {
  const { contentHash, ...content } = pack as OperationalReadinessPack;
  void contentHash;
  return structuredClone(content);
}

export function canonicalOperationalReadinessPack(
  pack: OperationalReadinessPack | PackWithoutHash
): PackWithoutHash {
  return withoutContentHash(pack);
}

export function hashOperationalReadinessPack(
  pack: OperationalReadinessPack | PackWithoutHash
): string {
  return sha256PayloadSync(canonicalOperationalReadinessPack(pack));
}

export function freezeOperationalReadinessPackContent(
  pack: PackWithoutHash
): OperationalReadinessPack {
  const canonical = canonicalOperationalReadinessPack(pack);
  return immutableOperationalReadinessClone({
    ...canonical,
    contentHash: hashOperationalReadinessPack(canonical)
  });
}

export function verifyOperationalReadinessPackHash(pack: OperationalReadinessPack): boolean {
  return /^[a-f0-9]{64}$/.test(pack.contentHash)
    && hashOperationalReadinessPack(pack) === pack.contentHash;
}

function canonicalSourceIdentity(source: OperationalReadinessSource) {
  return {
    sourceId: source.sourceId,
    sourceRevisionId: source.sourceRevisionId,
    sourceRevision: source.sourceRevision,
    originalFilename: source.originalFilename,
    observedByteSize: source.observedByteSize,
    observedSha256: source.observedSha256,
    sourceClassification: source.sourceClassification,
    approvalScope: source.approvalScope,
    approvalLimitations: [...source.approvalLimitations].sort(),
    supersedesSourceId: source.supersedesSourceId,
    supersedesSourceRevisionId: source.supersedesSourceRevisionId,
    previousSourceHash: source.previousSourceHash
  };
}

export function operationalSourceRevisionId(source: Pick<
  OperationalReadinessSource,
  'sourceId' | 'sourceRevision' | 'observedSha256'
>): string {
  return `${source.sourceId}:R${source.sourceRevision}:${source.observedSha256.slice(0, 16).toUpperCase()}`;
}

export function deriveOperationalSourceFingerprint(
  sourceRegistry: OperationalReadinessSource[]
): string {
  return sha256PayloadSync(
    [...sourceRegistry]
      .sort((left, right) =>
        `${left.sourceId}:${left.sourceRevision}`.localeCompare(`${right.sourceId}:${right.sourceRevision}`)
      )
      .map(canonicalSourceIdentity)
  );
}

export function deriveOperationalSourceTraceFingerprint(
  sourceTraces: OperationalReadinessPack['sourceTraces']
): string {
  return sha256PayloadSync(
    [...sourceTraces]
      .sort((left, right) => left.traceId.localeCompare(right.traceId))
      .map((trace) => structuredClone(trace))
  );
}

export function freezeOperationalReadinessSourceExtractionManifest(
  manifest: Omit<OperationalReadinessSourceExtractionManifest, 'sourceFingerprint' | 'sourceTraceFingerprint' | 'extractionFingerprint'>
): OperationalReadinessSourceExtractionManifest {
  const sourceFingerprint = deriveOperationalSourceFingerprint(manifest.sourceRegistry);
  const sourceTraceFingerprint = deriveOperationalSourceTraceFingerprint(manifest.sourceTraces);
  const canonical = {
    ...structuredClone(manifest),
    sourceFingerprint,
    sourceTraceFingerprint
  };
  return immutableOperationalReadinessClone({
    ...canonical,
    extractionFingerprint: sha256PayloadSync(canonical)
  });
}

function legalRequirements(pack: OperationalReadinessPack): OperationalReadinessRequirement[] {
  return pack.requirements.filter((requirement) => legalClassifications.has(requirement.classification));
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function sameCanonicalValue(left: unknown, right: unknown): boolean {
  return sha256PayloadSync(left) === sha256PayloadSync(right);
}

function sourceRevisionMap(pack: OperationalReadinessPack): Map<string, OperationalReadinessSource> {
  return new Map(
    pack.sourceRegistry.map((source) => [`${source.sourceId}:R${source.sourceRevision}`, source])
  );
}

function sourceForTrace(
  pack: OperationalReadinessPack,
  trace: OperationalReadinessPack['sourceTraces'][number]
): OperationalReadinessSource | undefined {
  return sourceRevisionMap(pack).get(`${trace.sourceId}:R${trace.sourceRevision}`);
}

function traceMap(pack: OperationalReadinessPack) {
  return new Map(pack.sourceTraces.map((trace) => [trace.traceId, trace]));
}

function traceLocatorIsComplete(trace: OperationalReadinessPack['sourceTraces'][number]): boolean {
  if (trace.locatorType === 'slide-shape') {
    return trace.slideNumber !== null && Boolean(trace.shapeId);
  }
  if (trace.locatorType === 'slide-table-row') {
    return trace.slideNumber !== null && trace.tableIndex !== null && trace.rowNumber !== null;
  }
  if (trace.locatorType === 'workbook-row') {
    return Boolean(trace.sheetName) && trace.rowNumber !== null;
  }
  if (trace.locatorType === 'founder-direction' || trace.locatorType === 'platform-contract') {
    return Boolean(trace.sectionReference);
  }
  return trace.locatorType === 'file-fingerprint';
}

function traceResolves(pack: OperationalReadinessPack, traceId: string): boolean {
  const trace = traceMap(pack).get(traceId);
  if (!trace) return false;
  const source = sourceForTrace(pack, trace);
  return Boolean(
    source
    && trace.sourceRevision === source.sourceRevision
    && trace.sourceHash === source.observedSha256
    && traceLocatorIsComplete(trace)
  );
}

function allTracesResolve(pack: OperationalReadinessPack, traceIds: string[]): boolean {
  return traceIds.length > 0 && traceIds.every((traceId) => traceResolves(pack, traceId));
}

function sourceIntegrityIssues(pack: OperationalReadinessPack): OperationalReadinessPackValidationIssue[] {
  const issues: OperationalReadinessPackValidationIssue[] = [];
  const add = (code: string, path: string, messageAr: string) => issues.push({ code, path, messageAr });
  const sourceKeys = pack.sourceRegistry.map((source) => `${source.sourceId}:${source.sourceRevision}`);
  if (new Set(sourceKeys).size !== sourceKeys.length) {
    add('source-revision-duplicate', '$.sourceRegistry', 'لا يجوز تكرار مراجعة المصدر أو استبدالها في موضعها.');
  }
  pack.sourceRegistry.forEach((source, index) => {
    if (
      !/^[a-f0-9]{64}$/.test(source.observedSha256)
      || source.observedByteSize < 1
      || (
        source.fingerprintStatus === 'verified'
        && (
          source.expectedSha256 !== source.observedSha256
          || source.expectedByteSize !== source.observedByteSize
        )
      )
    ) {
      add(
        'source-observation-invalid',
        `$.sourceRegistry[${index}]`,
        'حجم وبصمة المصدر المرصودان لا يطابقان مراجعة المصدر المسجلة.'
      );
    }
    if (source.sourceRevisionId !== operationalSourceRevisionId(source)) {
      add(
        'source-revision-identity',
        `$.sourceRegistry[${index}].sourceRevisionId`,
        'هوية مراجعة المصدر لا تطابق بصمة بايتات المراجعة.'
      );
    }
    if (source.fingerprintStatus === 'mismatch') {
      add('source-fingerprint-mismatch', `$.sourceRegistry[${index}]`, 'بصمة المصدر غير مطابقة والمصدر في الحجر.');
    }
    if (
      source.sourceRevision > 1
      && (!source.supersedesSourceRevisionId || !source.previousSourceHash)
    ) {
      add(
        'source-revision-lineage',
        `$.sourceRegistry[${index}]`,
        'المراجعة الجديدة للمصدر تحتاج هوية وبصمة المراجعة السابقة.'
      );
    }
    if (source.sourceRevision > 1) {
      const parent = pack.sourceRegistry.find((candidate) =>
        candidate.sourceRevisionId === source.supersedesSourceRevisionId
      );
      if (!parent || parent.sourceId !== source.sourceId) {
        add(
          'source-revision-parent-unknown',
          `$.sourceRegistry[${index}].supersedesSourceRevisionId`,
          'المراجعة السابقة المعلنة للمصدر غير مسجلة في سلسلة المصدر.'
        );
      } else {
        if (
          source.previousSourceHash !== parent.observedSha256
          || source.supersedesSourceId !== parent.sourceId
        ) {
          add(
            'source-revision-previous-hash',
            `$.sourceRegistry[${index}]`,
            'بصمة أو هوية المصدر السابق لا تطابق المراجعة الأب المسجلة.'
          );
        }
        if (source.sourceRevision !== parent.sourceRevision + 1) {
          add(
            'source-revision-sequence',
            `$.sourceRegistry[${index}].sourceRevision`,
            'تسلسل مراجعات المصدر غير متصل أو يتجاوز مراجعة مسجلة.'
          );
        }
      }
    }
  });
  const sourceChildren = new Map<string, number>();
  pack.sourceRegistry.forEach((source) => {
    if (!source.supersedesSourceRevisionId) return;
    sourceChildren.set(
      source.supersedesSourceRevisionId,
      (sourceChildren.get(source.supersedesSourceRevisionId) ?? 0) + 1
    );
  });
  if ([...sourceChildren.values()].some((count) => count > 1)) {
    add(
      'source-revision-fork',
      '$.sourceRegistry',
      'سجل المصدر يحتوي فرع مراجعة متوازياً؛ يلزم تسلسل أبوي واحد غير متشعب.'
    );
  }
  if (pack.sourceFingerprint !== deriveOperationalSourceFingerprint(pack.sourceRegistry)) {
    add('source-fingerprint-aggregate', '$.sourceFingerprint', 'بصمة سجل المصادر المجمعة غير صحيحة.');
  }
  if (pack.sourceTraceFingerprint !== deriveOperationalSourceTraceFingerprint(pack.sourceTraces)) {
    add('source-trace-fingerprint-aggregate', '$.sourceTraceFingerprint', 'بصمة سجل مواضع المصدر المجمعة غير صحيحة.');
  }
  const sourceIds = new Set(pack.sourceRegistry.map((source) => source.sourceId));
  const traceIds = pack.sourceTraces.map((trace) => trace.traceId);
  if (new Set(traceIds).size !== traceIds.length) {
    add('source-trace-duplicate', '$.sourceTraces', 'معرّفات مواضع المصدر يجب أن تكون فريدة.');
  }
  pack.sourceTraces.forEach((trace, index) => {
    if (!sourceIds.has(trace.sourceId)) {
      add('source-trace-unknown-source', `$.sourceTraces[${index}].sourceId`, 'مرجع الموضع يشير إلى مصدر غير مسجل.');
      return;
    }
    const source = sourceForTrace(pack, trace);
    if (!source) {
      add('source-trace-revision-mismatch', `$.sourceTraces[${index}].sourceRevision`, 'مراجعة الموضع لا تطابق مراجعة المصدر.');
      return;
    }
    if (trace.sourceHash !== source.observedSha256) {
      add('source-trace-hash-mismatch', `$.sourceTraces[${index}].sourceHash`, 'بصمة الموضع لا تطابق بصمة المصدر.');
    }
    if (!traceLocatorIsComplete(trace)) {
      add('source-trace-locator-invalid', `$.sourceTraces[${index}]`, 'إحداثيات محدد المصدر غير مكتملة.');
    }
  });
  return issues;
}

function unresolvedConflictsFromAssertions(
  assertions: OperationalGovernanceAssertion[]
): OperationalReadinessConflict[] {
  const groups = new Map<string, OperationalGovernanceAssertion[]>();
  assertions.forEach((assertion) => {
    groups.set(assertion.conflictId, [...(groups.get(assertion.conflictId) ?? []), assertion]);
  });
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([conflictId, candidates]) => {
      const values = new Set(candidates.map((candidate) => candidate.normalizedValue));
      if (candidates.length < 2 || values.size < 2) return [];
      const first = candidates[0]!;
      return [{
        conflictId,
        labelAr: first.labelAr,
        classification: 'conflicting' as const,
        sourceTraceIds: uniqueSorted(candidates.flatMap((candidate) => candidate.sourceTraceIds)),
        affectedIds: uniqueSorted(candidates.flatMap((candidate) => candidate.affectedIds)),
        resolutionStatus: 'unresolved' as const,
        requiredAuthorityKind: first.requiredAuthorityKind,
        candidateAssignments: candidates
          .filter((candidate) => candidate.candidateActor)
          .map((candidate) => ({
            candidateId: candidate.assertionId,
            actor: candidate.candidateActor,
            labelAr: candidate.candidateActor?.displayNameAr ?? candidate.normalizedValue,
            sourceTraceIds: [...candidate.sourceTraceIds],
            candidateScope: candidate.normalizedValue
          })),
        authorizedResolverAuthorityId: first.authorizedResolverAuthorityId,
        derivedFromAssertionIds: candidates.map((candidate) => candidate.assertionId).sort()
      }];
    });
}

function gapsFromGovernanceRequirements(
  pack: OperationalReadinessPack
): OperationalReadinessGapRecord[] {
  return pack.governanceRequirements
    .filter((requirement) => requirement.status !== 'satisfied')
    .map((requirement) => ({
      gapId: `GAP-${requirement.governanceRequirementId}`,
      labelAr: requirement.labelAr,
      category: requirement.category,
      classification: requirement.status === 'conflicting'
        ? 'conflicting' as const
        : 'missing' as const,
      sourceTraceIds: [...requirement.sourceTraceIds],
      affectedIds: [...requirement.affectedIds],
      impactAr: requirement.impactAr,
      nextActionAr: requirement.nextActionAr
    }))
    .sort((left, right) => left.gapId.localeCompare(right.gapId));
}

function conflictAffects(
  conflicts: OperationalReadinessConflict[],
  ids: string[]
): boolean {
  const candidates = new Set(ids);
  return conflicts.some((conflict) =>
    conflict.resolutionStatus === 'unresolved'
    && conflict.affectedIds.some((id) => candidates.has(id))
  );
}

function actorIsLegallyAssigned(
  actor: OperationalReadinessActorReference | null,
  pack: OperationalReadinessPack,
  scopeIds: string[] = []
): boolean {
  if (
    !actor
    || actor.actorType === 'unknown'
    || !assignableActorClassifications.has(actor.classification)
    || !allTracesResolve(pack, actor.sourceTraceIds)
  ) {
    return false;
  }
  const conflicts = unresolvedConflictsFromAssertions(pack.governanceAssertions);
  return !conflictAffects(conflicts, [actor.actorRef, ...scopeIds]);
}

function authorityScopeMatches(
  pack: OperationalReadinessPack,
  authority: OperationalReadinessAuthoritySlot
): boolean {
  if (authority.scopeType === 'pack') return authority.scopeId === pack.id;
  if (authority.scopeType === 'project') return authority.scopeId === pack.projectId;
  if (authority.scopeType === 'event') return authority.scopeId === pack.eventId;
  if (authority.scopeType === 'venue') return authority.scopeId === pack.venueId;
  if (authority.scopeType === 'requirement') {
    return pack.requirements.some((requirement) => requirement.id === authority.scopeId);
  }
  return pack.workstreams.some((workstream) => workstream.workstreamId === authority.scopeId);
}

function operationalAuthorityTriggerProjectionIssues(
  pack: OperationalReadinessPack
): OperationalReadinessPackValidationIssue[] {
  const issues: OperationalReadinessPackValidationIssue[] = [];
  const add = (code: string, path: string, messageAr: string) =>
    issues.push({ code, path, messageAr });
  const authorityTriggerFacts = pack.authorityTriggerFacts ?? [];
  if (pack.authorityTriggerPolicyId !== operationalAuthorityTriggerPolicyId) {
    add(
      'authority-trigger-policy-mismatch',
      '$.authorityTriggerPolicyId',
      'سياسة إسقاط محفزات السلطة لا تطابق السياسة المدعومة في المنصة.'
    );
  }
  if (
    pack.authorityTriggerFingerprint
    !== deriveOperationalAuthorityTriggerFingerprint(authorityTriggerFacts)
  ) {
    add(
      'authority-trigger-projection-fingerprint-mismatch',
      '$.authorityTriggerFingerprint',
      'بصمة إسقاط محفزات السلطة لا تطابق الحقائق المخزنة.'
    );
  }

  const legal = legalRequirements(pack);
  const legalIds = new Set(legal.map((requirement) => requirement.id));
  pack.requirements.forEach((requirement, index) => {
    if (
      !Array.isArray(requirement.authorityImpactKinds)
      || new Set(requirement.authorityImpactKinds).size
      !== requirement.authorityImpactKinds.length
      || requirement.authorityImpactKinds.some(
        (kind) => !operationalAuthorityTriggerKinds.includes(kind)
      )
    ) {
      add(
        'authority-trigger-impact-kind-invalid',
        `$.requirements[${index}].authorityImpactKinds`,
        'أنواع أثر السلطة في المتطلب مكررة أو غير مدعومة.'
      );
    }
  });

  legal.forEach((requirement) => {
    operationalAuthorityTriggerKinds.forEach((authorityKind) => {
      const candidates = authorityTriggerFacts.filter((fact) =>
        fact.requirementId === requirement.id
        && fact.authorityKind === authorityKind
      );
      if (candidates.length !== 1) {
        add(
          candidates.length === 0
            ? 'authority-trigger-fact-missing'
            : 'authority-trigger-fact-duplicate',
          '$.authorityTriggerFacts',
          `يجب وجود حقيقة محفز واحدة لـ ${authorityKind} والمتطلب ${requirement.id}.`
        );
        return;
      }
      const fact = candidates[0]!;
      const factPath = `$.authorityTriggerFacts[${authorityTriggerFacts.indexOf(fact)}]`;
      if (
        fact.triggerFactId
        !== operationalAuthorityTriggerFactId(requirement.id, authorityKind)
      ) {
        add(
          'authority-trigger-fact-identity-mismatch',
          `${factPath}.triggerFactId`,
          'هوية حقيقة محفز السلطة لا تطابق المتطلب ونوع السلطة.'
        );
      }
      if (
        fact.sourceInputFingerprint
        !== operationalAuthorityTriggerSourceInputFingerprint(requirement)
      ) {
        add(
          'authority-trigger-input-mismatch',
          `${factPath}.sourceInputFingerprint`,
          'تغيرت حقول محفز السلطة دون إنشاء إسقاط ومراجعة تأليف محكومين.'
        );
      }
      if (fact.fingerprint !== hashOperationalAuthorityTriggerFact(fact)) {
        add(
          'authority-trigger-fact-fingerprint-mismatch',
          `${factPath}.fingerprint`,
          'بصمة حقيقة محفز السلطة لا تطابق محتواها.'
        );
      }
      if (
        fact.revision < 1
        || fact.revision > pack.revision
      ) {
        add(
          'authority-trigger-revision-invalid',
          `${factPath}.revision`,
          'مراجعة حقيقة محفز السلطة غير متسقة مع مراجعة الحزمة.'
        );
      }
      if (!allTracesResolve(pack, fact.sourceTraceIds)) {
        add(
          'authority-trigger-source-invalid',
          `${factPath}.sourceTraceIds`,
          'مراجع مصدر حقيقة محفز السلطة غير مكتملة أو غير قابلة للحل.'
        );
      }
      if (!operationalAuthorityTriggerFactMatchesRequirement(fact, requirement)) {
        add(
          'authority-trigger-fact-mismatch',
          factPath,
          'حقيقة محفز السلطة لا تطابق الإسقاط المنظم للمتطلب ومصدره.'
        );
      }
    });
  });

  authorityTriggerFacts.forEach((fact, index) => {
    if (!legalIds.has(fact.requirementId)) {
      add(
        'authority-trigger-fact-unexpected',
        `$.authorityTriggerFacts[${index}]`,
        'حقيقة محفز السلطة تشير إلى متطلب غير داخل المقام القانوني.'
      );
    }
  });
  return issues;
}

function operationalAuthorityTriggerTrustIssues(
  pack: OperationalReadinessPack,
  context?: OperationalReadinessPackValidationContext
): OperationalReadinessPackValidationIssue[] {
  const trust = inspectOperationalReadinessTrustSession(
    context?.trustSession,
    pack,
    context?.revisionPermit
  );
  if (trust.valid) return [];
  return [{
    code: context?.trustSession
      ? 'authority-trigger-trust-session-mismatch'
      : 'authority-trigger-trust-session-missing',
    path: '$.authorityTriggerFingerprint',
    messageAr: 'تعذر إثبات سلسلة الثقة المحلية. التجميد والتفعيل محجوبان.'
  }];
}

interface AuthorityContractIssue extends OperationalReadinessPackValidationIssue {
  authorityKind: OperationalAuthorityKind | null;
}

function governanceAuthorityReference(
  pack: OperationalReadinessPack,
  reference: OperationalGovernanceAuthorityReference
): OperationalReadinessAuthoritySlot | null {
  return pack.governance[reference];
}

function declarationForExpectedAuthority(
  pack: OperationalReadinessPack,
  expected: OperationalExpectedAuthorityObligation
): OperationalRequiredAuthorityDeclaration | null {
  const declarations = pack.requiredAuthorities.filter(
    (declaration) => declaration.authorityKind === expected.authorityKind
  );
  return declarations.length === 1 ? declarations[0]! : null;
}

function authoritySlotForDeclaration(
  pack: OperationalReadinessPack,
  declaration: OperationalRequiredAuthorityDeclaration
): OperationalReadinessAuthoritySlot | null {
  const slots = pack.authorityMatrix.filter(
    (authority) => authority.authorityId === declaration.authorityId
  );
  return slots.length === 1 ? slots[0]! : null;
}

interface OperationalAuthorityWaiverValidation {
  valid: boolean;
  resolverValid: boolean;
  evidenceValid: boolean;
  chronologyValid: boolean;
  issues: OperationalReadinessPackValidationIssue[];
}

function isoTimestamp(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(
    value
  );
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const millisecond = Number(match[7] ?? '0');
  const offsetHour = match[8] === 'Z' ? 0 : Number(match[10]);
  const offsetMinute = match[8] === 'Z' ? 0 : Number(match[11]);
  if (
    year < 1
    || month < 1
    || month > 12
    || day < 1
    || day > new Date(Date.UTC(year, month, 0)).getUTCDate()
    || hour > 23
    || minute > 59
    || second > 59
    || offsetHour > 14
    || offsetMinute > 59
    || (offsetHour === 14 && offsetMinute !== 0)
  ) {
    return null;
  }
  const localEpoch = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    millisecond
  );
  const offsetDirection = match[9] === '-' ? -1 : 1;
  const offsetMilliseconds = offsetDirection
    * ((offsetHour * 60) + offsetMinute)
    * 60_000;
  return localEpoch - offsetMilliseconds;
}

function validateNotApplicableAuthority(
  pack: OperationalReadinessPack,
  authority: OperationalReadinessAuthoritySlot,
  declaration: OperationalRequiredAuthorityDeclaration,
  expected: OperationalExpectedAuthorityObligation,
  context?: OperationalReadinessPackValidationContext
): OperationalAuthorityWaiverValidation {
  const issues: OperationalReadinessPackValidationIssue[] = [];
  const add = (code: string, path: string, messageAr: string) =>
    issues.push({ code, path, messageAr });
  const statement = declaration.notApplicableDeclaration;
  const path = `$.requiredAuthorities[${pack.requiredAuthorities.indexOf(declaration)}].notApplicableDeclaration`;
  if (
    expected.applicability !== 'conditional'
    || expected.triggeredBy.length > 0
  ) {
    add(
      'authority-waiver-required-obligation',
      path,
      'لا يجوز إعفاء سلطة مطلوبة أو مرتبطة بمحفز نشط.'
    );
  }
  if (!expected.notApplicablePermitted) {
    add(
      'authority-waiver-policy-prohibited',
      path,
      'سياسة المنصة لا تسمح بعدم انطباق هذا النوع من السلطات.'
    );
  }
  if (
    declaration.applicable
    || authority.status !== 'not-applicable'
    || authority.actor
    || !statement
    || !authority.notApplicableDeclaration
    || !sameCanonicalValue(statement, authority.notApplicableDeclaration)
  ) {
    add(
      'authority-waiver-canonical-state-mismatch',
      path,
      'سجل الإعفاء لا يطابق التصريح وخانة السلطة القانونية.'
    );
  }
  if (!statement) {
    return {
      valid: false,
      resolverValid: false,
      evidenceValid: false,
      chronologyValid: false,
      issues
    };
  }

  if (
    statement.policyId !== operationalAuthorityRequirementPolicy.policyId
    || statement.policyRuleId !== expected.policyRuleId
    || statement.authorityKind !== expected.authorityKind
    || statement.authorityId !== authority.authorityId
    || statement.scopeType !== expected.requiredScopeType
    || statement.scopeId !== expected.requiredScopeId
    || !statement.reasonAr.trim()
    || !sameCanonicalValue(
      [...statement.triggeredBySnapshot].sort(),
      [...expected.triggeredBy].sort()
    )
    || !verifyOperationalAuthorityWaiverIdentity(statement)
  ) {
    add(
      'authority-waiver-identity-invalid',
      path,
      'هوية سجل الإعفاء أو نطاقه أو لقطة محفزاته لا تطابق عقد السلطة.'
    );
  }
  if (!allTracesResolve(pack, statement.sourceTraceIds)) {
    add(
      'authority-waiver-source-invalid',
      `${path}.sourceTraceIds`,
      'مراجع مصدر سجل الإعفاء غير قابلة للحل في مراجعة المصدر المسجلة.'
    );
  }

  const resolverSlots = pack.authorityMatrix.filter(
    (candidate) => candidate.authorityId === statement.resolverAuthorityId
  );
  const resolverAuthority = resolverSlots.length === 1 ? resolverSlots[0]! : null;
  const resolverExpected = expected.notApplicableResolverAuthorityKind
    ? deriveExpectedOperationalAuthorities(pack).find(
      (candidate) =>
        candidate.authorityKind === expected.notApplicableResolverAuthorityKind
    ) ?? null
    : null;
  const resolverDeclaration = resolverExpected
    ? declarationForExpectedAuthority(pack, resolverExpected)
    : null;
  const resolverOwnDutyConflict = Boolean(
    resolverAuthority?.actor
    && resolverExpected
    && pack.authorityMatrix.some((other) =>
      other.authorityId !== resolverAuthority.authorityId
      && other.status === 'assigned'
      && other.actor?.actorRef === resolverAuthority.actor?.actorRef
      && resolverExpected.separationFromAuthorityKinds.includes(other.authorityKind)
    )
  );
  const resolverSourceLineageMatches = Boolean(
    resolverAuthority?.actor
    && sameCanonicalValue(
      [...resolverAuthority.actor.sourceTraceIds].sort(),
      [...resolverAuthority.sourceTraceIds].sort()
    )
    && resolverDeclaration
    && sameCanonicalValue(
      [...resolverDeclaration.sourceTraceIds].sort(),
      [...resolverAuthority.sourceTraceIds].sort()
    )
  );
  const resolverValid = Boolean(
    expected.notApplicableResolverAuthorityKind
    && resolverAuthority
    && resolverAuthority.authorityId !== authority.authorityId
    && resolverAuthority.authorityKind === expected.notApplicableResolverAuthorityKind
    && resolverAuthority.status === 'assigned'
    && resolverAuthority.actor
    && resolverAuthority.actor.actorRef === statement.authorizedActorRef
    && statement.authorityReference === resolverAuthority.authorityId
    && resolverAuthority.scopeType === expected.requiredScopeType
    && resolverAuthority.scopeId === expected.requiredScopeId
    && assignableActorClassifications.has(resolverAuthority.classification)
    && authorityScopeMatches(pack, resolverAuthority)
    && allTracesResolve(pack, resolverAuthority.sourceTraceIds)
    && actorIsLegallyAssigned(
      resolverAuthority.actor,
      pack,
      [resolverAuthority.authorityId, resolverAuthority.scopeId]
    )
    && resolverAuthority.actor.assignmentScope === resolverAuthority.scopeId
    && resolverExpected
    && resolverDeclaration
    && resolverDeclaration.applicable
    && !resolverDeclaration.notApplicableDeclaration
    && resolverSourceLineageMatches
    && !resolverOwnDutyConflict
    && expectedAuthorityBindingMatches(
      pack,
      resolverExpected,
      resolverDeclaration,
      resolverAuthority
    )
  );
  if (statement.resolverAuthorityId === authority.authorityId) {
    add(
      'authority-waiver-self-authorized',
      `${path}.resolverAuthorityId`,
      'لا يجوز للسلطة المعفاة أن تعتمد إعفاءها بنفسها.'
    );
  }
  if (!resolverValid) {
    add(
      'authority-waiver-resolver-invalid',
      `${path}.resolverAuthorityId`,
      'جهة حل الإعفاء غير موجودة أو غير معيّنة أو لا تطابق خانة السلطة القانونية المسموح بها.'
    );
  }
  if (resolverAuthority?.actor) {
    const resolverActorRef = resolverAuthority.actor.actorRef;
    const dutyConflict = pack.authorityMatrix.some((other) =>
      other.authorityId !== resolverAuthority.authorityId
      && other.status === 'assigned'
      && other.actor?.actorRef === resolverActorRef
      && (
        other.authorityKind === expected.authorityKind
        || expected.separationFromAuthorityKinds.includes(other.authorityKind)
      )
    );
    if (dutyConflict || resolverOwnDutyConflict) {
      add(
        'authority-waiver-separation-of-duties',
        `${path}.authorizedActorRef`,
        'جهة حل الإعفاء تخالف فصل الواجبات أو تشغل السلطة المطلوب إعفاؤها.'
      );
    }
  }

  const evidenceResolution = resolveOperationalReadinessTrustedEvidence(
    context?.trustSession,
    pack,
    {
      evidenceRefs: statement.evidenceRefs,
      authorityKind: expected.authorityKind,
      authorityId: authority.authorityId,
      resolverAuthorityId: statement.resolverAuthorityId,
      subjectActorRef: resolverAuthority?.actor?.actorRef ?? '',
      subjectAuthorityId: resolverAuthority?.authorityId ?? '',
      subjectAuthorityKind:
        resolverAuthority?.authorityKind ?? 'requirement-owner',
      authorityAssignmentFingerprint:
        resolverAuthority
          ? deriveOperationalReadinessAuthorityAssignmentFingerprint(
            pack,
            resolverAuthority.authorityId
          ) ?? ''
          : '',
      acceptedEvidenceTypes: expected.notApplicableAcceptedEvidenceTypes
    },
    context?.revisionPermit
  );
  const evidenceValid = statement.evidenceRefs.length > 0
    && evidenceResolution.valid
    && statement.evidenceRegistryFingerprint
      === evidenceResolution.registryFingerprint;
  if (!evidenceValid) {
    add(
      'authority-waiver-evidence-unresolved',
      `${path}.evidenceRefs`,
      'أدلة الإعفاء غير موجودة في سجل الأدلة الموثوق أو لا تطابق الحزمة والسلطة وجهة الحل.'
    );
  }
  if (
    statement.evidenceRegistryFingerprint
    !== evidenceResolution.registryFingerprint
  ) {
    add(
      'authority-waiver-evidence-registry-mismatch',
      `${path}.evidenceRegistryFingerprint`,
      'بصمة سجل أدلة الإعفاء لا تطابق سجل الحيازة الموثوق.'
    );
  }

  const declaredAt = isoTimestamp(statement.declaredAt);
  const createdAt = isoTimestamp(pack.createdAt);
  const validatedAt = evidenceResolution.validatedAt
    ? isoTimestamp(evidenceResolution.validatedAt)
    : null;
  const revisionHistory = pack.authoringHistory.filter(
    (entry) => entry.revision === statement.revision
  );
  const waiverLedger = inspectOperationalReadinessWaiverLedger(
    context?.trustSession,
    pack,
    statement,
    context?.revisionPermit
  );
  const ledgerHead = waiverLedger.head;
  const anchoredStatement = waiverLedger.history.find(
    (entry) => entry.waiverHash === statement.waiverHash
  ) ?? null;
  const statementAlreadyAnchored = Boolean(anchoredStatement);
  const priorWaiverMatches = waiverLedger.available && (
    statementAlreadyAnchored
      ? anchoredStatement!.revision === statement.revision
        && anchoredStatement!.previousWaiverHash
          === statement.previousWaiverHash
      : ledgerHead
        ? statement.previousWaiverHash === ledgerHead.waiverHash
          && statement.revision > ledgerHead.revision
        : statement.previousWaiverHash === null
  );
  const chronologyParent = statementAlreadyAnchored
    ? statement.previousWaiverHash
      ? waiverLedger.history.find(
        (entry) => entry.waiverHash === statement.previousWaiverHash
      ) ?? null
      : null
    : ledgerHead;
  const priorWaiverChronologyMatches = !chronologyParent
    ? true
    : (() => {
      const previousDeclaredAt = isoTimestamp(chronologyParent.declaredAt);
      return previousDeclaredAt !== null
        && declaredAt !== null
        && previousDeclaredAt <= declaredAt;
    })();
  if (!waiverLedger.available) {
    add(
      'authority-waiver-ledger-missing',
      `${path}.previousWaiverHash`,
      'تعذر إثبات دفتر حيازة الإعفاءات المحلي؛ لا يمكن إنشاء أو استبدال الإعفاء.'
    );
  } else if (!priorWaiverMatches) {
    add(
      'authority-waiver-ledger-chain-mismatch',
      `${path}.previousWaiverHash`,
      'سجل الإعفاء لا يتصل بالرأس الموثوق لدفتر الإعفاءات.'
    );
  }
  const chronologyValid = Boolean(
    declaredAt !== null
    && createdAt !== null
    && declaredAt >= createdAt
    && statement.revision >= 1
    && statement.revision <= pack.revision
    && statement.timeTrust !== 'unknown'
    && (
      statement.timeTrust !== 'authoritative'
      || evidenceResolution.authoritativeTimeAvailable
    )
    && revisionHistory.length > 0
    && revisionHistory.every((entry) => {
      const entryAt = isoTimestamp(entry.at);
      return entryAt !== null && declaredAt <= entryAt;
    })
    && (
      validatedAt !== null
      && declaredAt <= validatedAt
    )
    && statement.sourceTraceIds.every((traceId) => {
      const trace = traceMap(pack).get(traceId);
      const source = trace ? sourceForTrace(pack, trace) : null;
      const extractedAt = source ? isoTimestamp(source.extractedAt) : null;
      return extractedAt !== null && extractedAt <= declaredAt;
    })
    && (
      statement.evidenceRefs.every((evidenceId) => {
        const evidence = evidenceResolution.evidence.find(
          (candidate) => candidate.evidenceId === evidenceId
        );
        const capturedAt = evidence ? isoTimestamp(evidence.capturedAt) : null;
        return capturedAt !== null && capturedAt <= declaredAt;
      })
    )
    && priorWaiverMatches
    && priorWaiverChronologyMatches
    && statement.previousWaiverHash !== statement.waiverHash
  );
  if (!chronologyValid) {
    add(
      'authority-waiver-chronology-invalid',
      `${path}.declaredAt`,
      'زمن الإعفاء أو ثقته أو تسلسل مراجعته غير صالح.'
    );
  }

  return {
    valid: issues.length === 0,
    resolverValid,
    evidenceValid,
    chronologyValid,
    issues
  };
}

function notApplicableAuthorityIsValid(
  pack: OperationalReadinessPack,
  authority: OperationalReadinessAuthoritySlot,
  declaration: OperationalRequiredAuthorityDeclaration,
  expected: OperationalExpectedAuthorityObligation,
  context?: OperationalReadinessPackValidationContext
): boolean {
  return validateNotApplicableAuthority(
    pack,
    authority,
    declaration,
    expected,
    context
  ).valid;
}

function expectedAuthorityBindingMatches(
  pack: OperationalReadinessPack,
  expected: OperationalExpectedAuthorityObligation,
  declaration: OperationalRequiredAuthorityDeclaration,
  authority: OperationalReadinessAuthoritySlot
): boolean {
  const governanceReference = expected.requiredGovernanceReference
    ? governanceAuthorityReference(pack, expected.requiredGovernanceReference)
    : null;
  return (
    declaration.policyRuleId === expected.policyRuleId
    && declaration.phase === expected.lifecyclePhase
    && declaration.requiredScopeType === expected.requiredScopeType
    && declaration.requiredScopeId === expected.requiredScopeId
    && sameCanonicalValue(
      [...declaration.separationFromAuthorityKinds].sort(),
      [...expected.separationFromAuthorityKinds].sort()
    )
    && authority.authorityKind === expected.authorityKind
    && authority.scopeType === expected.requiredScopeType
    && authority.scopeId === expected.requiredScopeId
    && authorityScopeMatches(pack, authority)
    && allTracesResolve(pack, declaration.sourceTraceIds)
    && (
      !expected.requiredGovernanceReference
      || Boolean(
        governanceReference
        && governanceReference.authorityId === declaration.authorityId
        && sameCanonicalValue(governanceReference, authority)
      )
    )
  );
}

function analyzeOperationalAuthorityContract(
  pack: OperationalReadinessPack,
  context?: OperationalReadinessPackValidationContext
): {
  expected: OperationalExpectedAuthorityObligation[];
  issues: AuthorityContractIssue[];
} {
  const expected = deriveExpectedOperationalAuthorities(pack);
  const issues: AuthorityContractIssue[] = [];
  const add = (
    authorityKind: OperationalAuthorityKind | null,
    code: string,
    path: string,
    messageAr: string
  ) => issues.push({ authorityKind, code, path, messageAr });

  if (pack.authorityRequirementPolicyId !== operationalAuthorityRequirementPolicy.policyId) {
    add(
      null,
      'authority-contract-policy-reference-mismatch',
      '$.authorityRequirementPolicyId',
      'معرّف سياسة متطلبات السلطات لا يطابق السياسة المدعومة في المنصة.'
    );
  }
  operationalAuthorityTriggerProjectionIssues(pack).forEach((issue) =>
    add(null, issue.code, issue.path, issue.messageAr)
  );

  const expectedKinds = new Set(expected.map((obligation) => obligation.authorityKind));
  const declarationIds = new Map<string, number>();
  pack.requiredAuthorities.forEach((declaration, index) => {
    declarationIds.set(declaration.declarationId, (declarationIds.get(declaration.declarationId) ?? 0) + 1);
    if (!expectedKinds.has(declaration.authorityKind)) {
      add(
        declaration.authorityKind,
        'authority-contract-unexpected-declaration',
        `$.requiredAuthorities[${index}]`,
        'يتضمن الإسقاط تصريح سلطة لا تطلبه سياسة السلطات التشغيلية.'
      );
    }
  });
  declarationIds.forEach((count, declarationId) => {
    if (count > 1) {
      add(
        null,
        'authority-contract-unexpected-declaration',
        '$.requiredAuthorities',
        `معرّف تصريح السلطة ${declarationId} مكرر ولا يمثل إسقاطًا حتميًا.`
      );
    }
  });

  const kindsByAuthorityId = new Map<string, Set<OperationalAuthorityKind>>();
  pack.requiredAuthorities.forEach((declaration) => {
    const kinds = kindsByAuthorityId.get(declaration.authorityId) ?? new Set();
    kinds.add(declaration.authorityKind);
    kindsByAuthorityId.set(declaration.authorityId, kinds);
  });
  kindsByAuthorityId.forEach((kinds, authorityId) => {
    if (kinds.size <= 1) return;
    kinds.forEach((kind) => add(
      kind,
      'authority-contract-slot-reused',
      '$.requiredAuthorities',
      `لا يجوز استخدام خانة السلطة ${authorityId} لتمثيل أنواع سلطات مختلفة.`
    ));
  });

  expected.forEach((obligation) => {
    const declarations = pack.requiredAuthorities.filter(
      (declaration) => declaration.authorityKind === obligation.authorityKind
    );
    if (declarations.length === 0) {
      add(
        obligation.authorityKind,
        'authority-contract-missing-kind',
        '$.requiredAuthorities',
        `تصريح ${obligation.labelAr} المتوقع من سياسة المنصة مفقود.`
      );
      if (obligation.authorityKind === 'readiness-pack-activation') {
        add(
          obligation.authorityKind,
          'authority-contract-activation-missing',
          '$.requiredAuthorities',
          'تصريح سلطة تفعيل حزمة الجاهزية مفقود ولا يمكن حذفه من دورة الحياة.'
        );
      }
      return;
    }
    if (declarations.length > 1) {
      add(
        obligation.authorityKind,
        'authority-contract-unexpected-declaration',
        '$.requiredAuthorities',
        `يجب أن يوجد تصريح واحد فقط لـ ${obligation.labelAr}.`
      );
      return;
    }

    const declaration = declarations[0]!;
    const declarationIndex = pack.requiredAuthorities.indexOf(declaration);
    if (declaration.policyRuleId !== obligation.policyRuleId) {
      add(
        obligation.authorityKind,
        'authority-contract-policy-reference-mismatch',
        `$.requiredAuthorities[${declarationIndex}].policyRuleId`,
        `مرجع سياسة ${obligation.labelAr} لا يطابق قاعدة المنصة.`
      );
    }
    if (declaration.phase !== obligation.lifecyclePhase) {
      add(
        obligation.authorityKind,
        'authority-contract-lifecycle-phase-mismatch',
        `$.requiredAuthorities[${declarationIndex}].phase`,
        `مرحلة ${obligation.labelAr} لا تطابق مرحلة دورة الحياة المحددة في السياسة.`
      );
    }
    if (
      declaration.requiredScopeType !== obligation.requiredScopeType
      || declaration.requiredScopeId !== obligation.requiredScopeId
    ) {
      add(
        obligation.authorityKind,
        'authority-contract-scope-mismatch',
        `$.requiredAuthorities[${declarationIndex}]`,
        `نطاق تصريح ${obligation.labelAr} لا يطابق نطاق الحزمة المطلوب.`
      );
    }
    if (!sameCanonicalValue(
      [...declaration.separationFromAuthorityKinds].sort(),
      [...obligation.separationFromAuthorityKinds].sort()
    )) {
      add(
        obligation.authorityKind,
        'authority-contract-policy-reference-mismatch',
        `$.requiredAuthorities[${declarationIndex}].separationFromAuthorityKinds`,
        `قواعد فصل الواجبات لـ ${obligation.labelAr} لا تطابق سياسة المنصة.`
      );
    }
    if (!allTracesResolve(pack, declaration.sourceTraceIds)) {
      add(
        obligation.authorityKind,
        'authority-contract-source-trace-mismatch',
        `$.requiredAuthorities[${declarationIndex}].sourceTraceIds`,
        `مراجع مصدر تصريح ${obligation.labelAr} غير مكتملة أو لا تطابق مراجعة المصدر.`
      );
    }

    const slots = pack.authorityMatrix.filter(
      (authority) => authority.authorityId === declaration.authorityId
    );
    if (slots.length !== 1) {
      add(
        obligation.authorityKind,
        'authority-contract-unknown-slot',
        `$.requiredAuthorities[${declarationIndex}].authorityId`,
        `خانة ${obligation.labelAr} غير موجودة بصورة فريدة في مصفوفة السلطات.`
      );
      return;
    }
    const authority = slots[0]!;
    if (authority.authorityKind !== obligation.authorityKind) {
      add(
        obligation.authorityKind,
        'authority-contract-kind-mismatch',
        `$.authorityMatrix[${pack.authorityMatrix.indexOf(authority)}].authorityKind`,
        `نوع خانة ${obligation.labelAr} لا يطابق نوع التصريح المتوقع.`
      );
    }
    if (
      authority.scopeType !== obligation.requiredScopeType
      || authority.scopeId !== obligation.requiredScopeId
    ) {
      add(
        obligation.authorityKind,
        'authority-contract-scope-mismatch',
        `$.authorityMatrix[${pack.authorityMatrix.indexOf(authority)}]`,
        `نطاق خانة ${obligation.labelAr} لا يطابق نطاق العقد.`
      );
    }

    if (obligation.requiredGovernanceReference) {
      const governanceReference = governanceAuthorityReference(
        pack,
        obligation.requiredGovernanceReference
      );
      if (
        !governanceReference
        || governanceReference.authorityId !== declaration.authorityId
        || governanceReference.authorityKind !== obligation.authorityKind
        || !sameCanonicalValue(governanceReference, authority)
      ) {
        add(
          obligation.authorityKind,
          'authority-contract-governance-mismatch',
          `$.governance.${obligation.requiredGovernanceReference}`,
          `مرجع الحوكمة لـ ${obligation.labelAr} لا يحل إلى الخانة القانونية المطابقة.`
        );
      }
    }

    if (!declaration.applicable) {
      const waiverValidation = validateNotApplicableAuthority(
        pack,
        authority,
        declaration,
        obligation,
        context
      );
      if (!waiverValidation.valid) {
        add(
          obligation.authorityKind,
          'authority-contract-not-applicable-invalid',
          `$.requiredAuthorities[${declarationIndex}].notApplicableDeclaration`,
          `إقرار عدم انطباق ${obligation.labelAr} غير مخول أو غير مكتمل أو غير مسموح به.`
        );
      }
      waiverValidation.issues.forEach((issue) =>
        add(obligation.authorityKind, issue.code, issue.path, issue.messageAr)
      );
    } else if (
      declaration.notApplicableDeclaration
      || authority.status === 'not-applicable'
      || authority.notApplicableDeclaration
    ) {
      add(
        obligation.authorityKind,
        'authority-contract-not-applicable-invalid',
        `$.requiredAuthorities[${declarationIndex}]`,
        `حالة ${obligation.labelAr} المطلوبة تتعارض مع إقرار عدم الانطباق.`
      );
    }
  });

  const validatePolicyAuthorityReference = (
    authorityId: string | null,
    expectedKindsForReference: OperationalAuthorityKind[],
    path: string
  ) => {
    if (!authorityId) return;
    const slots = pack.authorityMatrix.filter((authority) => authority.authorityId === authorityId);
    if (
      slots.length !== 1
      || !expectedKindsForReference.includes(slots[0]!.authorityKind)
    ) {
      add(
        expectedKindsForReference[0] ?? null,
        'authority-contract-policy-reference-mismatch',
        path,
        'مرجع السلطة في السياسة لا يحل إلى خانة قانونية من النوع المسموح.'
      );
      return;
    }
    const slot = slots[0]!;
    if (
      expectedKinds.has(slot.authorityKind)
      && !pack.requiredAuthorities.some(
        (declaration) => declaration.authorityKind === slot.authorityKind
      )
    ) {
      add(
        slot.authorityKind,
        'authority-contract-policy-reference-mismatch',
        path,
        'مرجع السياسة يستخدم نوع سلطة حُذف تصريحه المتوقع من العقد.'
      );
    }
  };

  pack.verificationPolicies.forEach((policy, index) =>
    validatePolicyAuthorityReference(
      policy.verifierAuthorityId,
      ['evidence-verification', 'project-assignment'],
      `$.verificationPolicies[${index}].verifierAuthorityId`
    )
  );
  pack.approvalPolicies.forEach((policy, index) =>
    validatePolicyAuthorityReference(
      policy.authorityId,
      ['internal-approval'],
      `$.approvalPolicies[${index}].authorityId`
    )
  );
  pack.acceptancePolicies.forEach((policy, index) =>
    validatePolicyAuthorityReference(
      policy.externalAuthorityId,
      ['client-acceptance'],
      `$.acceptancePolicies[${index}].externalAuthorityId`
    )
  );
  pack.evidencePolicies.forEach((policy, index) =>
    validatePolicyAuthorityReference(
      policy.requiredApproverAuthorityId,
      ['internal-approval', 'hse-authority'],
      `$.evidencePolicies[${index}].requiredApproverAuthorityId`
    )
  );

  expected.forEach((obligation) => {
    const declaration = declarationForExpectedAuthority(pack, obligation);
    if (!declaration) return;
    const authority = authoritySlotForDeclaration(pack, declaration);
    if (!authority?.actor || authority.status !== 'assigned') return;
    const prohibited = new Set(obligation.separationFromAuthorityKinds);
    const conflict = pack.authorityMatrix.some((other) =>
      other.authorityId !== authority.authorityId
      && other.status === 'assigned'
      && other.actor?.actorRef === authority.actor?.actorRef
      && prohibited.has(other.authorityKind)
    );
    if (conflict) {
      add(
        obligation.authorityKind,
        'authority-contract-separation-of-duties',
        `$.authorityMatrix[${pack.authorityMatrix.indexOf(authority)}].actor`,
        `تعيين ${obligation.labelAr} يخالف فصل الواجبات المحدد في السياسة.`
      );
    }
  });

  return { expected, issues };
}

export function deriveOperationalAuthorityContractIssues(
  pack: OperationalReadinessPack,
  context?: OperationalReadinessPackValidationContext
): OperationalReadinessPackValidationIssue[] {
  return analyzeOperationalAuthorityContract(pack, context).issues.map(
    ({ code, path, messageAr }) => ({ code, path, messageAr })
  );
}

export function deriveOperationalAuthorityContractProjection(
  pack: OperationalReadinessPack,
  context?: OperationalReadinessPackValidationContext
): OperationalAuthorityContractProjection[] {
  const analysis = analyzeOperationalAuthorityContract(pack, context);
  return analysis.expected.map((expected) => {
    const declaration = declarationForExpectedAuthority(pack, expected);
    const authoritySlot = declaration
      ? authoritySlotForDeclaration(pack, declaration)
      : null;
    const issueMessagesAr = analysis.issues
      .filter((issue) => issue.authorityKind === null || issue.authorityKind === expected.authorityKind)
      .map((issue) => issue.messageAr);
    const waiverValidation = declaration && !declaration.applicable && authoritySlot
      ? validateNotApplicableAuthority(
        pack,
        authoritySlot,
        declaration,
        expected,
        context
      )
      : null;
    return {
      expected,
      declaration,
      authoritySlot,
      contractStatus: !declaration
        ? 'missing-declaration'
        : issueMessagesAr.length > 0
          ? 'mismatched'
          : 'matched',
      assignmentStatus: declaration && authoritySlot
        ? !declaration.applicable
          ? notApplicableAuthorityIsValid(
            pack,
            authoritySlot,
            declaration,
            expected,
            context
          )
            ? 'not-applicable'
            : 'missing-or-invalid'
          : operationalAuthorityObligationIsValid(pack, expected, context)
            ? 'assigned'
            : 'missing-or-invalid'
        : 'missing-or-invalid',
      activeTriggerCount: expected.triggeredBy.length,
      waiverStatus: !declaration || declaration.applicable
          ? 'not-requested'
        : expected.applicability !== 'conditional' || expected.triggeredBy.length > 0
          ? 'prohibited'
          : waiverValidation?.valid
            ? 'valid'
            : 'invalid',
      resolverStatus: !declaration || declaration.applicable
        ? 'not-required'
        : waiverValidation?.resolverValid
          ? 'resolved'
          : 'unresolved',
      evidenceResolutionStatus: !declaration || declaration.applicable
        ? 'not-required'
        : waiverValidation?.evidenceValid
          ? 'resolved'
          : 'unresolved',
      chronologyStatus: !declaration || declaration.applicable
        ? 'not-required'
        : waiverValidation?.chronologyValid
          ? 'valid'
          : 'invalid',
      issueMessagesAr
    };
  });
}

function operationalAuthorityObligationIsValid(
  pack: OperationalReadinessPack,
  expected: OperationalExpectedAuthorityObligation,
  context?: OperationalReadinessPackValidationContext
): boolean {
  const declaration = declarationForExpectedAuthority(pack, expected);
  if (!declaration) return false;
  const authority = authoritySlotForDeclaration(pack, declaration);
  if (!authority || !expectedAuthorityBindingMatches(pack, expected, declaration, authority)) {
    return false;
  }
  const contractIssues = analyzeOperationalAuthorityContract(pack, context).issues;
  if (contractIssues.some(
    (issue) => issue.authorityKind === null || issue.authorityKind === expected.authorityKind
  )) {
    return false;
  }
  if (!declaration.applicable) {
    return notApplicableAuthorityIsValid(pack, authority, declaration, expected, context);
  }
  if (
    authority.status !== 'assigned'
    || authority.classification === 'conflicting'
    || authority.classification === 'missing'
    || authority.classification === 'template-proposed'
    || authority.classification === 'superseded'
    || !allTracesResolve(pack, authority.sourceTraceIds)
    || !actorIsLegallyAssigned(authority.actor, pack, [authority.authorityId, authority.scopeId])
    || authority.actor?.assignmentScope !== authority.scopeId
    || conflictAffects(unresolvedConflictsFromAssertions(pack.governanceAssertions), [
      authority.authorityId,
      authority.scopeId,
      authority.actor?.actorRef ?? ''
    ])
  ) {
    return false;
  }
  return !pack.authorityMatrix.some((other) =>
    other.authorityId !== authority.authorityId
    && other.status === 'assigned'
    && other.actor?.actorRef === authority.actor?.actorRef
    && expected.separationFromAuthorityKinds.includes(other.authorityKind)
  );
}

export function operationalAuthorityAssignmentIsValid(
  pack: OperationalReadinessPack,
  authorityId: string,
  context?: OperationalReadinessPackValidationContext
): boolean {
  const expected = deriveExpectedOperationalAuthorities(pack).filter((obligation) => {
    const declaration = declarationForExpectedAuthority(pack, obligation);
    return declaration?.authorityId === authorityId;
  });
  return expected.length === 1 && operationalAuthorityObligationIsValid(
    pack,
    expected[0]!,
    context
  );
}

function policyHasValidTraces(
  pack: OperationalReadinessPack,
  policy: { classification: string; sourceTraceIds: string[] } | undefined
): boolean {
  return Boolean(
    policy
    && assignableActorClassifications.has(policy.classification)
    && allTracesResolve(pack, policy.sourceTraceIds)
  );
}

export function deriveOperationalReadinessPackDiagnostics(
  pack: OperationalReadinessPack,
  context?: OperationalReadinessPackValidationContext
): OperationalReadinessPackDiagnostics {
  const legal = legalRequirements(pack);
  const evidencePolicies = new Map(pack.evidencePolicies.map((policy) => [policy.evidencePolicyId, policy]));
  const verificationPolicies = new Map(
    pack.verificationPolicies.map((policy) => [policy.verificationPolicyId, policy])
  );
  const approvalPolicies = new Map(pack.approvalPolicies.map((policy) => [policy.approvalPolicyId, policy]));
  const unresolvedConflicts = unresolvedConflictsFromAssertions(pack.governanceAssertions);
  const missingAuthorities = deriveExpectedOperationalAuthorities(pack)
    .filter((expected) => !operationalAuthorityObligationIsValid(pack, expected, context))
    .map((expected) => {
      const declaration = declarationForExpectedAuthority(pack, expected);
      if (
        !declaration
        || pack.requiredAuthorities.filter(
          (candidate) => candidate.authorityId === declaration.authorityId
        ).length !== 1
        || authoritySlotForDeclaration(pack, declaration)?.authorityKind !== expected.authorityKind
      ) {
        return `AUTHORITY-CONTRACT-${expected.authorityKind.toUpperCase()}`;
      }
      return declaration.authorityId;
    });
  const missingOwners = legal
    .filter((requirement) =>
      !actorIsLegallyAssigned(requirement.owner, pack, [requirement.id, requirement.workstreamId])
    )
    .map((requirement) => requirement.id);
  const missingEvidenceRules = legal
    .filter((requirement) => {
      const policy = requirement.evidencePolicyId
        ? evidencePolicies.get(requirement.evidencePolicyId)
        : undefined;
      return !requirement.evidencePolicyId
        || requirement.evidenceRequirements.length === 0
        || !policyHasValidTraces(pack, policy)
        || !policy
        || policy.acceptedEvidenceTypes.length === 0
        || policy.missingFields.length > 0;
    })
    .map((requirement) => requirement.id);
  const missingVerificationRules = legal
    .filter((requirement) => {
      const policy = requirement.verificationPolicyId
        ? verificationPolicies.get(requirement.verificationPolicyId)
        : undefined;
      return !requirement.verificationPolicyId
        || !policyHasValidTraces(pack, policy)
        || !policy?.method.trim()
        || !policy.verifierAuthorityId;
    })
    .map((requirement) => requirement.id);
  const missingApprovalRules = legal
    .filter((requirement) => {
      const policy = requirement.approvalPolicyId
        ? approvalPolicies.get(requirement.approvalPolicyId)
        : undefined;
      return !requirement.approvalPolicyId
        || !policyHasValidTraces(pack, policy)
        || !policy?.method.trim()
        || !policy.authorityId;
    })
    .map((requirement) => requirement.id);
  const missingSpatialMappings = legal
    .filter((requirement) => {
      const relationship = pack.spatialRelationships.find(
        (candidate) => candidate.requirementId === requirement.id
      );
      if (requirement.spatialScopeStatus === 'unresolved') return true;
      if (requirement.spatialScopeStatus === 'explicitly-not-applicable') {
        return !relationship || !allTracesResolve(pack, relationship.sourceTraceIds);
      }
      return !relationship;
    })
    .map((requirement) => requirement.id);
  return immutableOperationalReadinessClone({
    missingAuthorities: uniqueSorted(missingAuthorities),
    missingOwners: uniqueSorted(missingOwners),
    missingEvidenceRules: uniqueSorted(missingEvidenceRules),
    missingVerificationRules: uniqueSorted(missingVerificationRules),
    missingApprovalRules: uniqueSorted(missingApprovalRules),
    missingSpatialMappings: uniqueSorted(missingSpatialMappings),
    unresolvedConflicts,
    governanceGaps: gapsFromGovernanceRequirements(pack)
  });
}

function metric(
  metricId: keyof typeof percentMetricDefinitions,
  legal: OperationalReadinessRequirement[],
  eligible: (requirement: OperationalReadinessRequirement) => boolean
): ReadinessPackPreparationMetric {
  const includedItemIds = legal.filter(eligible).map((requirement) => requirement.id);
  const excludedItemIds = legal.filter((requirement) => !eligible(requirement)).map((requirement) => requirement.id);
  const denominator = legal.length;
  const numerator = includedItemIds.length;
  return {
    metricId,
    labelAr: percentMetricDefinitions[metricId][0],
    numerator,
    denominator,
    value: denominator === 0 ? null : Math.round((numerator / denominator) * 1000) / 10,
    unit: 'percent',
    includedItemIds,
    excludedItemIds,
    formulaVersion: 'READINESS-PACK-PREPARATION-v1',
    explanationAr: percentMetricDefinitions[metricId][1],
    notReadinessReasonAr: 'هذا المؤشر يصف اكتمال تعريف الحزمة فقط، ولا يقيس الإنجاز أو الجاهزية التشغيلية.'
  };
}

export function deriveReadinessPackPreparation(
  pack: OperationalReadinessPack,
  generatedAt = pack.createdAt
): ReadinessPackPreparationSnapshot {
  const diagnostics = deriveOperationalReadinessPackDiagnostics(pack);
  const legal = legalRequirements(pack);
  const workstreamIds = new Set(pack.workstreams.map((workstream) => workstream.workstreamId));
  const requirementIds = new Set(pack.requirements.map((requirement) => requirement.id));
  const evidencePolicies = new Map(pack.evidencePolicies.map((policy) => [policy.evidencePolicyId, policy]));
  const metrics: ReadinessPackPreparationMetric[] = [
    metric('source-coverage', legal, (requirement) =>
      allTracesResolve(pack, requirement.sourceTraces)
      && (
        requirement.classification !== 'founder-directed'
        || Boolean(requirement.founderDirectionReference)
      )
    ),
    metric('workstream-coverage', legal, (requirement) => workstreamIds.has(requirement.workstreamId)),
    metric('owner-coverage', legal, (requirement) =>
      actorIsLegallyAssigned(requirement.owner, pack, [requirement.id, requirement.workstreamId])
    ),
    metric('responsible-party-coverage', legal, (requirement) =>
      actorIsLegallyAssigned(requirement.responsibleParty, pack, [requirement.id, requirement.workstreamId])
    ),
    metric('verification-authority-coverage', legal, (requirement) =>
      actorIsLegallyAssigned(requirement.verifier, pack, [requirement.id])
    ),
    metric('approval-authority-coverage', legal, (requirement) =>
      actorIsLegallyAssigned(requirement.internalApprover, pack, [requirement.id])
    ),
    metric('external-acceptance-coverage', legal, (requirement) =>
      actorIsLegallyAssigned(requirement.externalAcceptingAuthority, pack, [requirement.id])
    ),
    metric('evidence-rule-coverage', legal, (requirement) => {
      const policy = requirement.evidencePolicyId
        ? evidencePolicies.get(requirement.evidencePolicyId)
        : undefined;
      return Boolean(
        policy
        && requirement.evidenceRequirements.length > 0
        && policy.acceptedEvidenceTypes.length > 0
        && policy.missingFields.length === 0
        && policyHasValidTraces(pack, policy)
      );
    }),
    metric('spatial-scope-coverage', legal, (requirement) =>
      !diagnostics.missingSpatialMappings.includes(requirement.id)
    ),
    metric('dependency-coverage', legal, (requirement) =>
      requirement.dependencyIds.every((dependencyId) => requirementIds.has(dependencyId))
    )
  ];

  const unresolved = diagnostics.unresolvedConflicts;
  metrics.push({
    metricId: 'conflict-count',
    labelAr: 'التعارضات المفتوحة',
    numerator: unresolved.length,
    denominator: unresolved.length,
    value: unresolved.length,
    unit: 'count',
    includedItemIds: unresolved.map((conflict) => conflict.conflictId),
    excludedItemIds: [],
    formulaVersion: 'READINESS-PACK-PREPARATION-v1',
    explanationAr: 'عدد التعارضات المشتقة من ادعاءات المصدر المتعارضة التي لم تحسمها سلطة موثقة.',
    notReadinessReasonAr: 'عدد التعارضات مؤشر أهلية للحزمة ولا يصف حالة التنفيذ الميداني.'
  });

  const criticalMissing = uniqueSorted([
    ...diagnostics.missingAuthorities,
    ...diagnostics.missingOwners,
    ...diagnostics.missingEvidenceRules,
    ...diagnostics.missingVerificationRules,
    ...diagnostics.missingApprovalRules,
    ...diagnostics.missingSpatialMappings,
    ...diagnostics.governanceGaps.map((gap) => gap.gapId)
  ]);
  metrics.push({
    metricId: 'missing-critical-field-count',
    labelAr: 'الحقول الحرجة المفقودة',
    numerator: criticalMissing.length,
    denominator: criticalMissing.length,
    value: criticalMissing.length,
    unit: 'count',
    includedItemIds: criticalMissing,
    excludedItemIds: [],
    formulaVersion: 'READINESS-PACK-PREPARATION-v1',
    explanationAr: 'عدد الفجوات الحرجة المعاد اشتقاقها من المتطلبات والسلطات والسياسات والحوكمة.',
    notReadinessReasonAr: 'الفجوات تمنع التقييم ولا تعني أن الجاهزية تساوي صفرًا.'
  });

  const scored = metrics.filter(
    (candidate) => candidate.unit === 'percent' && candidate.value !== null
  );
  const overallPreparationCompleteness = scored.length === 0
    ? null
    : Math.round(
      (scored.reduce((total, candidate) => total + (candidate.value ?? 0), 0) / scored.length) * 10
    ) / 10;

  return immutableOperationalReadinessClone({
    snapshotId: `${pack.id}:PREPARATION:${pack.revision}:${pack.contentHash.slice(0, 12)}`,
    packId: pack.id,
    packRevision: pack.revision,
    packFingerprint: pack.contentHash,
    generatedAt,
    modelVersion: 'READINESS-PACK-PREPARATION-v1',
    metrics,
    overallPreparationCompleteness,
    operationalReadiness: 'cannot-determine',
    explanationAr: 'تعرض النسبة اكتمال تعريف الحزمة فقط. لا توجد تقييمات تشغيلية مؤهلة، لذلك تظل الجاهزية غير قابلة للتحديد.'
  });
}

function gate(
  phase: OperationalReadinessEligibilityGate['phase'],
  gateId: string,
  labelAr: string,
  passed: boolean,
  affectedIds: string[],
  explanationAr: string,
  nextActionAr: string
): OperationalReadinessEligibilityGate {
  return {
    gateId,
    labelAr,
    rule: gateId,
    status: passed ? 'passed' : 'failed',
    blocking: true,
    affectedIds: uniqueSorted(affectedIds),
    explanationAr,
    nextActionAr,
    phase
  };
}

function requiredAuthorityGates(
  pack: OperationalReadinessPack,
  phase: 'pre-freeze' | 'pre-activation',
  context?: OperationalReadinessPackValidationContext
): OperationalReadinessEligibilityGate[] {
  const analysis = analyzeOperationalAuthorityContract(pack, context);
  return analysis.expected
    .filter((expected) => expected.lifecyclePhase === phase)
    .sort((left, right) => left.policyRuleId.localeCompare(right.policyRuleId))
    .map((expected) => {
      const declaration = declarationForExpectedAuthority(pack, expected);
      const contractIssues = analysis.issues.filter(
        (issue) => issue.authorityKind === null || issue.authorityKind === expected.authorityKind
      );
      const passed = contractIssues.length === 0
        && operationalAuthorityObligationIsValid(pack, expected, context);
      return gate(
        phase,
        `ELIGIBILITY-AUTHORITY-${declaration?.declarationId ?? expected.authorityKind.toUpperCase()}`,
        declaration?.labelAr ?? expected.labelAr,
        passed,
        passed
          ? []
          : [declaration?.authorityId ?? `AUTHORITY-CONTRACT-${expected.authorityKind.toUpperCase()}`],
        contractIssues.length > 0
          ? contractIssues[0]!.messageAr
          : declaration?.applicable === false
            ? 'عدم الانطباق يحتاج سببًا ومرجعًا ودليلًا وإقرارًا من ممثل مخول في المراجعة الحالية.'
            : 'يجب أن تطابق السلطة عقد المنصة وأن تكون معيّنة لممثل صالح وموثقة المصدر وخالية من تعارض الواجبات.',
        contractIssues.length > 0
          ? 'تصحيح التصريح وخانة السلطة ومرجع الحوكمة لتطابق عقد السلطات المشتق.'
          : declaration?.applicable === false
            ? 'استكمال إقرار عدم الانطباق المخول أو إعادة السلطة إلى حالة مطلوبة.'
            : 'تعيين السلطة بمرجع مصدر صالح وحسم أي تعارض يؤثر فيها.'
      );
    });
}

export function derivePreFreezeEligibility(
  pack: OperationalReadinessPack,
  context?: OperationalReadinessPackValidationContext
): OperationalReadinessEligibilityGate[] {
  const diagnostics = deriveOperationalReadinessPackDiagnostics(pack, context);
  const legal = legalRequirements(pack);
  const workstreamIds = new Set(pack.workstreams.map((workstream) => workstream.workstreamId));
  const sourceIssues = sourceIntegrityIssues(pack);
  return [
    gate(
      'pre-freeze',
      'ELIGIBILITY-SOURCE-LINEAGE',
      'سلامة سلسلة المصادر',
      sourceIssues.length === 0,
      sourceIssues.map((issue) => issue.path),
      'يجب أن تطابق كل بصمة ومراجعة ومحدد موضعي سجل المصدر المسجل.',
      'إعادة الاستخراج من البايتات المسجلة أو إنشاء مراجعة مصدر جديدة.'
    ),
    gate(
      'pre-freeze',
      'ELIGIBILITY-WORKSTREAMS-DEFINED',
      'تعريف مسارات العمل',
      pack.workstreams.length > 0 && legal.every((requirement) => workstreamIds.has(requirement.workstreamId)),
      legal.filter((requirement) => !workstreamIds.has(requirement.workstreamId)).map((requirement) => requirement.id),
      'يجب أن يرتبط كل متطلب قانوني بمسار عمل معرّف.',
      'تعريف مسار العمل أو تصحيح الارتباط.'
    ),
    gate(
      'pre-freeze',
      'ELIGIBILITY-CLASSIFIED',
      'تصنيف كل متطلب قانوني',
      legal.length > 0 && legal.every((requirement) =>
        readinessPackSourceClassificationValues.includes(requirement.classification)
      ),
      legal.filter((requirement) =>
        !readinessPackSourceClassificationValues.includes(requirement.classification)
      ).map((requirement) => requirement.id),
      'كل متطلب قانوني يحتاج تصنيف مصدر واحدًا.',
      'مراجعة التصنيفات غير الصالحة.'
    ),
    gate(
      'pre-freeze',
      'ELIGIBILITY-OWNERS',
      'تعيين الملاك',
      diagnostics.missingOwners.length === 0,
      diagnostics.missingOwners,
      'لا تزال بعض ملكيات المتطلبات غير معيّنة من ممثل موثق وغير متعارض.',
      'تعيين مالك موثّق لكل متطلب قانوني.'
    ),
    gate(
      'pre-freeze',
      'ELIGIBILITY-EVIDENCE-RULES',
      'قواعد الأدلة',
      diagnostics.missingEvidenceRules.length === 0,
      diagnostics.missingEvidenceRules,
      'قواعد الدليل غير مكتملة أو غير موثقة لبعض المتطلبات.',
      'تعريف نوع الدليل والحفظ والتحقق والصلاحية بمرجع مصدر.'
    ),
    gate(
      'pre-freeze',
      'ELIGIBILITY-VERIFICATION-RULES',
      'قواعد التحقق',
      diagnostics.missingVerificationRules.length === 0,
      diagnostics.missingVerificationRules,
      'قواعد التحقق غير مكتملة أو غير موثقة لبعض المتطلبات.',
      'تعريف طريقة التحقق وسلطتها.'
    ),
    gate(
      'pre-freeze',
      'ELIGIBILITY-APPROVAL-RULES',
      'قواعد الاعتماد',
      diagnostics.missingApprovalRules.length === 0,
      diagnostics.missingApprovalRules,
      'قواعد الاعتماد غير مكتملة أو غير موثقة لبعض المتطلبات.',
      'تعريف طريقة الاعتماد وسلطتها.'
    ),
    gate(
      'pre-freeze',
      'ELIGIBILITY-SPATIAL-SCOPE',
      'النطاق المكاني',
      diagnostics.missingSpatialMappings.length === 0,
      diagnostics.missingSpatialMappings,
      'بعض المتطلبات غير مربوطة مكانيًا ولم يوثق عدم انطباقها.',
      'ربط النطاق المرشح أو تسجيل عدم الانطباق بمرجع مخول.'
    ),
    gate(
      'pre-freeze',
      'ELIGIBILITY-CONFLICTS',
      'حل تعارضات الحوكمة',
      diagnostics.unresolvedConflicts.length === 0,
      diagnostics.unresolvedConflicts.map((conflict) => conflict.conflictId),
      'تعارضات المصدر المفتوحة تمنع تجميد مقام قانوني موثوق.',
      'حسم كل تعارض بمرجع مصدر أو إعفاء من سلطة مخولة.'
    ),
    gate(
      'pre-freeze',
      'ELIGIBILITY-GOVERNANCE-GAPS',
      'اكتمال الحوكمة التشغيلية',
      diagnostics.governanceGaps.length === 0,
      diagnostics.governanceGaps.map((gap) => gap.gapId),
      'توجد فجوات حوكمة وتشغيل موثقة لم تُستكمل.',
      'استكمال الفجوات بمصدر أو قرار سلطة صالح.'
    ),
    ...requiredAuthorityGates(pack, 'pre-freeze', context)
  ];
}

function activationRecordIsValid(
  pack: OperationalReadinessPack,
  record: OperationalReadinessActivationRecord | null,
  context?: OperationalReadinessPackValidationContext,
  custodyPack: OperationalReadinessPack = pack
): boolean {
  if (!record || record.evidenceRefs.length === 0 || record.sourceTraceIds.length === 0) return false;
  const authority = pack.authorityMatrix.find((candidate) => candidate.authorityId === record.authorityId);
  const evidence = resolveOperationalReadinessTrustedEvidence(
    context?.trustSession,
    custodyPack,
    {
      evidenceRefs: record.evidenceRefs,
      authorityKind: 'readiness-pack-activation',
      authorityId: record.authorityId,
      resolverAuthorityId: record.authorityId,
      subjectActorRef: record.actor.actorRef,
      subjectAuthorityId: record.authorityId,
      subjectAuthorityKind: 'readiness-pack-activation',
      authorityAssignmentFingerprint:
        deriveOperationalReadinessAuthorityAssignmentFingerprint(
          pack,
          record.authorityId
        ) ?? '',
      acceptedEvidenceTypes: ['signature', 'external-record', 'document']
    },
    context?.revisionPermit
  );
  return Boolean(
    authority
    && authority.authorityKind === 'readiness-pack-activation'
    && operationalAuthorityAssignmentIsValid(pack, record.authorityId, context)
    && authority.actor?.actorRef === record.actor.actorRef
    && actorIsLegallyAssigned(record.actor, pack, [record.authorityId])
    && allTracesResolve(pack, record.sourceTraceIds)
    && record.frozenRevision === pack.revision
    && record.frozenContentHash === pack.contentHash
    && record.frozenSourceFingerprint === pack.sourceFingerprint
    && record.frozenSourceTraceFingerprint === pack.sourceTraceFingerprint
    && record.reasonAr.trim()
    && record.approvedAt
    && evidence.valid
  );
}

export function derivePreActivationEligibility(
  pack: OperationalReadinessPack,
  proposedActivation: OperationalReadinessActivationRecord | null = pack.activationRecord,
  context?: OperationalReadinessPackValidationContext
): OperationalReadinessEligibilityGate[] {
  const preFreeze = derivePreFreezeEligibility(pack, context);
  const frozenProjection = pack.packStatus === 'activated-baseline' && proposedActivation
    ? {
      ...pack,
      packStatus: 'frozen-candidate' as const,
      activationStatus: 'frozen-awaiting-activation' as const,
      stateContext: 'candidate-preparation' as const,
      activationRecord: null,
      revision: proposedActivation.frozenRevision,
      contentHash: proposedActivation.frozenContentHash
    }
    : pack;
  const frozenRevision = frozenProjection.packStatus === 'frozen-candidate'
    && frozenProjection.activationStatus === 'frozen-awaiting-activation'
    && frozenProjection.stateContext === 'candidate-preparation'
    && frozenProjection.operationalReadiness === 'cannot-determine'
    && Boolean(frozenProjection.frozenFromContentHash)
    && frozenProjection.frozenSourceFingerprint === frozenProjection.sourceFingerprint
    && frozenProjection.frozenSourceTraceFingerprint === frozenProjection.sourceTraceFingerprint;
  const recordValid = proposedActivation
    ? activationRecordIsValid(frozenProjection, proposedActivation, context, pack)
    : false;
  return [
    gate(
      'pre-activation',
      'ELIGIBILITY-PRE-FREEZE-COMPLETE',
      'اكتمال بوابات ما قبل التجميد',
      preFreeze.every((candidate) => candidate.status === 'passed'),
      preFreeze.filter((candidate) => candidate.status !== 'passed').map((candidate) => candidate.gateId),
      'لا يمكن التفعيل إذا فشلت بوابة من بوابات ما قبل التجميد.',
      'استكمال بوابات ما قبل التجميد في مراجعة مرشحة جديدة.'
    ),
    gate(
      'pre-activation',
      'ELIGIBILITY-FROZEN-CANDIDATE',
      'مراجعة مرشحة مجمدة',
      frozenRevision,
      frozenRevision ? [] : [pack.id],
      'التفعيل يقبل مراجعة مرشحة مجمدة فقط ولا يقبل مرشحًا قابلًا للتحرير.',
      'تجميد مراجعة مؤهلة أولًا.'
    ),
    gate(
      'pre-activation',
      'ELIGIBILITY-FROZEN-SOURCE',
      'ثبات مراجعة المصدر المجمدة',
      Boolean(pack.frozenSourceFingerprint)
    && pack.frozenSourceFingerprint === pack.sourceFingerprint
    && pack.frozenSourceTraceFingerprint === pack.sourceTraceFingerprint,
      pack.frozenSourceFingerprint === pack.sourceFingerprint
        && pack.frozenSourceTraceFingerprint === pack.sourceTraceFingerprint
        ? []
        : [pack.id],
      'يجب أن تبقى بصمتا سجل المصدر ومحدداته مساويتين للبصمتين اللتين جمدت معهما المراجعة.',
      'إنشاء مراجعة مرشحة جديدة عند تغير المصدر.'
    ),
    ...requiredAuthorityGates(pack, 'pre-activation', context),
    gate(
      'pre-activation',
      'ELIGIBILITY-ACTIVATION-EVIDENCE',
      'دليل قرار التفعيل',
      recordValid,
      recordValid ? [] : [proposedActivation?.authorityId ?? pack.id],
      'التفعيل يحتاج سلطة مستقلة ودليلًا ومواضع مصدر مرتبطة بالمراجعة المجمدة.',
      'تقديم قرار تفعيل موثق من السلطة المسجلة.'
    )
  ];
}

export function deriveOperationalAssessmentEligibility(
  pack: OperationalReadinessPack
): OperationalReadinessEligibilityGate[] {
  const baselineTuple = pack.packStatus === 'activated-baseline'
    && pack.stateContext === 'baseline'
    && pack.activationStatus === 'activated';
  return [
    gate(
      'operational-assessment',
      'ELIGIBILITY-ACTIVATED-REQUIREMENTS-BASELINE',
      'أساس متطلبات مفعّل',
      baselineTuple,
      baselineTuple ? [] : [pack.id],
      'التقييم التشغيلي يحتاج أساس متطلبات مفعّلًا.',
      'إكمال التجميد والتفعيل القانوني أولًا.'
    ),
    gate(
      'operational-assessment',
      'ELIGIBILITY-QUALIFIED-EVIDENCE-ASSESSMENTS',
      'تقييمات أدلة تشغيلية مؤهلة',
      false,
      [pack.id],
      'هذه المرحلة لا تنشئ تقييمات أدلة تشغيلية ولا تحسب جاهزية فعلية.',
      'تشغيل محرك تقييم أدلة مخول في مرحلة لاحقة بعد توفير المدخلات الحقيقية.'
    )
  ];
}

export function deriveOperationalReadinessEligibility(
  pack: OperationalReadinessPack,
  context?: OperationalReadinessPackValidationContext
): OperationalReadinessEligibilityGate[] {
  return [
    ...derivePreFreezeEligibility(pack, context),
    ...derivePreActivationEligibility(pack, pack.activationRecord, context)
  ];
}

export function deriveOperationalReadinessActivationStatus(
  pack: OperationalReadinessPack,
  context?: OperationalReadinessPackValidationContext
): OperationalReadinessPack['activationStatus'] {
  if (pack.packStatus === 'activated-baseline') return 'activated';
  if (pack.packStatus === 'frozen-candidate') return 'frozen-awaiting-activation';
  return derivePreFreezeEligibility(pack, context).every(
    (candidate) => candidate.status === 'passed'
  )
    ? 'eligible-for-freeze'
    : 'not-eligible';
}

export function materializeOperationalReadinessPackDerivedState(
  pack: PackWithoutHash,
  context?: OperationalReadinessPackValidationContext
): OperationalReadinessPack {
  const provisional = freezeOperationalReadinessPackContent(pack);
  const diagnostics = deriveOperationalReadinessPackDiagnostics(provisional, context);
  const activationStatus = deriveOperationalReadinessActivationStatus(provisional, context);
  return freezeOperationalReadinessPackContent({
    ...canonicalOperationalReadinessPack(provisional),
    ...diagnostics,
    activationStatus,
    eligibilityGates: deriveOperationalReadinessEligibility(provisional, context)
  });
}

function referencedTraceGroups(pack: OperationalReadinessPack): Array<{ path: string; ids: string[] }> {
  const groups: Array<{ path: string; ids: string[] }> = [];
  const actor = (path: string, candidate: OperationalReadinessActorReference | null) => {
    if (candidate) groups.push({ path: `${path}.sourceTraceIds`, ids: candidate.sourceTraceIds });
  };
  pack.requirements.forEach((requirement, index) => {
    groups.push({ path: `$.requirements[${index}].sourceTraces`, ids: requirement.sourceTraces });
    actor(`$.requirements[${index}].owner`, requirement.owner);
    actor(`$.requirements[${index}].responsibleParty`, requirement.responsibleParty);
    actor(`$.requirements[${index}].accountableParty`, requirement.accountableParty);
    actor(`$.requirements[${index}].verifier`, requirement.verifier);
    actor(`$.requirements[${index}].internalApprover`, requirement.internalApprover);
    actor(`$.requirements[${index}].externalAcceptingAuthority`, requirement.externalAcceptingAuthority);
  });
  pack.workstreams.forEach((workstream, index) => {
    groups.push({ path: `$.workstreams[${index}].sourceTraceIds`, ids: workstream.sourceTraceIds });
    actor(`$.workstreams[${index}].owner`, workstream.owner);
    actor(`$.workstreams[${index}].responsibleParty`, workstream.responsibleParty);
  });
  pack.authorityMatrix.forEach((authority, index) => {
    groups.push({ path: `$.authorityMatrix[${index}].sourceTraceIds`, ids: authority.sourceTraceIds });
    actor(`$.authorityMatrix[${index}].actor`, authority.actor);
  });
  pack.requiredAuthorities.forEach((declaration, index) => {
    groups.push({ path: `$.requiredAuthorities[${index}].sourceTraceIds`, ids: declaration.sourceTraceIds });
    if (declaration.notApplicableDeclaration) {
      groups.push({
        path: `$.requiredAuthorities[${index}].notApplicableDeclaration.sourceTraceIds`,
        ids: declaration.notApplicableDeclaration.sourceTraceIds
      });
    }
  });
  (pack.authorityTriggerFacts ?? []).forEach((fact, index) =>
    groups.push({
      path: `$.authorityTriggerFacts[${index}].sourceTraceIds`,
      ids: fact.sourceTraceIds
    })
  );
  pack.evidencePolicies.forEach((policy, index) =>
    groups.push({ path: `$.evidencePolicies[${index}].sourceTraceIds`, ids: policy.sourceTraceIds })
  );
  pack.verificationPolicies.forEach((policy, index) =>
    groups.push({ path: `$.verificationPolicies[${index}].sourceTraceIds`, ids: policy.sourceTraceIds })
  );
  pack.approvalPolicies.forEach((policy, index) =>
    groups.push({ path: `$.approvalPolicies[${index}].sourceTraceIds`, ids: policy.sourceTraceIds })
  );
  pack.acceptancePolicies.forEach((policy, index) =>
    groups.push({ path: `$.acceptancePolicies[${index}].sourceTraceIds`, ids: policy.sourceTraceIds })
  );
  pack.spatialRelationships.forEach((relationship, index) =>
    groups.push({ path: `$.spatialRelationships[${index}].sourceTraceIds`, ids: relationship.sourceTraceIds })
  );
  pack.governanceAssertions.forEach((assertion, index) =>
    groups.push({ path: `$.governanceAssertions[${index}].sourceTraceIds`, ids: assertion.sourceTraceIds })
  );
  pack.governanceRequirements.forEach((requirement, index) =>
    groups.push({ path: `$.governanceRequirements[${index}].sourceTraceIds`, ids: requirement.sourceTraceIds })
  );
  return groups;
}

function validateLifecycleState(
  pack: OperationalReadinessPack,
  add: (code: string, path: string, messageAr: string) => void,
  context?: OperationalReadinessPackValidationContext
): void {
  if (pack.operationalReadiness !== 'cannot-determine') {
    add(
      'operational-readiness-self-declaration',
      '$.operationalReadiness',
      'لا يجوز للحزمة أن تعلن الجاهزية التشغيلية. يبقى الناتج غير قابل للتحديد حتى تقييم أدلة مخول.'
    );
  }
  const expectedActivationStatus = deriveOperationalReadinessActivationStatus(pack, context);
  if (pack.activationStatus !== expectedActivationStatus) {
    add(
      'lifecycle-activation-derived',
      '$.activationStatus',
      `حالة التفعيل مشتقة من الانتقال القانوني ويجب أن تكون ${expectedActivationStatus}.`
    );
  }
  if (pack.packStatus === 'candidate' || pack.packStatus === 'review') {
    if (pack.stateContext !== 'candidate-preparation') {
      add('lifecycle-candidate-context', '$.stateContext', 'الحزمة المرشحة أو قيد المراجعة يجب أن تبقى في سياق الإعداد المرشح.');
    }
    if (
      pack.activationRecord
      || pack.frozenFromContentHash
      || pack.frozenSourceFingerprint
      || pack.frozenSourceTraceFingerprint
    ) {
      add('lifecycle-candidate-freeze-claim', '$', 'لا يجوز للمرشح القابل للتحرير أن يحمل سجل تجميد أو تفعيل.');
    }
    return;
  }
  if (pack.packStatus === 'frozen-candidate') {
    if (
      pack.stateContext !== 'candidate-preparation'
      || pack.activationStatus !== 'frozen-awaiting-activation'
      || !pack.frozenFromContentHash
      || pack.frozenSourceFingerprint !== pack.sourceFingerprint
      || pack.frozenSourceTraceFingerprint !== pack.sourceTraceFingerprint
      || pack.activationRecord
    ) {
      add(
        'lifecycle-frozen-tuple',
        '$',
        'المراجعة المجمدة يجب أن تبقى مرشحة وغير مفعلة مع بصمة مصدر مجمدة وسجل تفعيل فارغ.'
      );
    }
    const failed = derivePreFreezeEligibility(pack, context).filter(
      (gateItem) => gateItem.status !== 'passed'
    );
    if (failed.length > 0) {
      add(
        'lifecycle-frozen-with-failed-gates',
        '$.packStatus',
        `لا يجوز تجميد المراجعة مع ${failed.length} بوابة ما قبل تجميد فاشلة.`
      );
    }
    return;
  }
  if (
    pack.stateContext !== 'baseline'
    || pack.activationStatus !== 'activated'
    || !pack.activationRecord
    || !pack.frozenFromContentHash
    || pack.frozenSourceFingerprint !== pack.sourceFingerprint
    || pack.frozenSourceTraceFingerprint !== pack.sourceTraceFingerprint
  ) {
    add(
      'lifecycle-activated-baseline-tuple',
      '$',
      'الأساس المفعّل يحتاج سياق أساس وسجل تفعيل وسلطة ودليل وبصمة مصدر مجمدة.'
    );
  }
  const preActivation = derivePreActivationEligibility(
    pack,
    pack.activationRecord,
    context
  );
  if (preActivation.some((gateItem) => gateItem.status !== 'passed')) {
    add(
      'lifecycle-activated-with-failed-gates',
      '$.packStatus',
      'لا يجوز تفعيل أساس المتطلبات قبل نجاح كل بوابات ما قبل التفعيل.'
    );
  }
}

export function validateOperationalReadinessPack(
  pack: OperationalReadinessPack,
  context?: OperationalReadinessPackValidationContext
): OperationalReadinessPackValidationResult {
  const issues: OperationalReadinessPackValidationIssue[] = [];
  const add = (code: string, path: string, messageAr: string) => issues.push({ code, path, messageAr });
  if (pack.schemaVersion !== '1.1.0') add('schema-version', '$.schemaVersion', 'إصدار المخطط غير مدعوم.');
  if (!operationalReadinessPackStatusValues.includes(pack.packStatus)) {
    add('pack-status', '$.packStatus', 'حالة الحزمة غير صالحة.');
  }
  if (!verifyOperationalReadinessPackHash(pack)) {
    add('content-hash', '$.contentHash', 'بصمة محتوى الحزمة غير صحيحة.');
  }
  sourceIntegrityIssues(pack).forEach((issue) => issues.push(issue));
  operationalAuthorityTriggerTrustIssues(pack, context).forEach(
    (issue) => issues.push(issue)
  );
  validateLifecycleState(pack, add, context);
  if (new Set(pack.requirements.map((requirement) => requirement.id)).size !== pack.requirements.length) {
    add('duplicate-requirement', '$.requirements', 'معرّفات المتطلبات يجب أن تكون فريدة.');
  }
  if (pack.requirements.some((requirement) =>
    !readinessPackSourceClassificationValues.includes(requirement.classification)
  )) {
    add('requirement-classification', '$.requirements', 'لكل متطلب تصنيف مصدر واحد صالح.');
  }
  if (pack.requirements.some((requirement) =>
    requirement.classification === 'template-proposed' && requirement.eligibilityStatus !== 'excluded-template'
  )) {
    add('template-denominator', '$.requirements', 'المتطلبات المقترحة بالقالب يجب استبعادها من المقام القانوني.');
  }
  if (pack.requirements.some((requirement) => requirement.spatialScopeStatus === 'mapped-approved')) {
    add('approved-spatial-claim', '$.requirements', 'لا تحتوي هذه المرحلة هندسة مكانية معتمدة.');
  }
  const evidencePolicyIds = new Set(pack.evidencePolicies.map((policy) => policy.evidencePolicyId));
  const verificationPolicyIds = new Set(pack.verificationPolicies.map((policy) => policy.verificationPolicyId));
  const approvalPolicyIds = new Set(pack.approvalPolicies.map((policy) => policy.approvalPolicyId));
  const acceptancePolicyIds = new Set(pack.acceptancePolicies.map((policy) => policy.acceptancePolicyId));
  pack.requirements.forEach((requirement, index) => {
    if (
      requirement.projectId !== pack.projectId
      || requirement.eventId !== pack.eventId
      || requirement.venueId !== pack.venueId
    ) {
      add('cross-project-requirement', `$.requirements[${index}]`, 'نطاق المتطلب لا يطابق نطاق الحزمة.');
    }
    if (requirement.evidencePolicyId && !evidencePolicyIds.has(requirement.evidencePolicyId)) {
      add('missing-evidence-policy', `$.requirements[${index}].evidencePolicyId`, 'سياسة الدليل المشار إليها غير موجودة.');
    }
    if (requirement.verificationPolicyId && !verificationPolicyIds.has(requirement.verificationPolicyId)) {
      add('missing-verification-policy', `$.requirements[${index}].verificationPolicyId`, 'سياسة التحقق المشار إليها غير موجودة.');
    }
    if (requirement.approvalPolicyId && !approvalPolicyIds.has(requirement.approvalPolicyId)) {
      add('missing-approval-policy', `$.requirements[${index}].approvalPolicyId`, 'سياسة الاعتماد المشار إليها غير موجودة.');
    }
    if (requirement.acceptancePolicyId && !acceptancePolicyIds.has(requirement.acceptancePolicyId)) {
      add('missing-acceptance-policy', `$.requirements[${index}].acceptancePolicyId`, 'سياسة القبول المشار إليها غير موجودة.');
    }
  });
  referencedTraceGroups(pack).forEach((group) => {
    group.ids.forEach((traceId) => {
      if (!traceResolves(pack, traceId)) {
        add('source-reference-invalid', group.path, `مرجع المصدر ${traceId} غير موجود أو لا يطابق مراجعته وبصمته.`);
      }
    });
  });
  const authorityIds = pack.authorityMatrix.map((authority) => authority.authorityId);
  if (new Set(authorityIds).size !== authorityIds.length) {
    add('authority-duplicate', '$.authorityMatrix', 'معرّفات السلطات يجب أن تكون فريدة.');
  }
  const declarationIds = pack.requiredAuthorities.map((declaration) => declaration.declarationId);
  if (new Set(declarationIds).size !== declarationIds.length) {
    add('authority-declaration-duplicate', '$.requiredAuthorities', 'معرّفات متطلبات السلطة يجب أن تكون فريدة.');
  }
  deriveOperationalAuthorityContractIssues(pack, context).forEach((issue) => issues.push(issue));
  const diagnostics = deriveOperationalReadinessPackDiagnostics(pack, context);
  const comparisons: Array<{
    key: keyof Pick<
      OperationalReadinessPackDiagnostics,
      | 'missingAuthorities'
      | 'missingOwners'
      | 'missingEvidenceRules'
      | 'missingVerificationRules'
      | 'missingApprovalRules'
      | 'missingSpatialMappings'
      | 'unresolvedConflicts'
      | 'governanceGaps'
    >;
    stored: unknown;
  }> = [
    { key: 'missingAuthorities', stored: pack.missingAuthorities },
    { key: 'missingOwners', stored: pack.missingOwners },
    { key: 'missingEvidenceRules', stored: pack.missingEvidenceRules },
    { key: 'missingVerificationRules', stored: pack.missingVerificationRules },
    { key: 'missingApprovalRules', stored: pack.missingApprovalRules },
    { key: 'missingSpatialMappings', stored: pack.missingSpatialMappings },
    { key: 'unresolvedConflicts', stored: pack.unresolvedConflicts },
    { key: 'governanceGaps', stored: pack.governanceGaps }
  ];
  comparisons.forEach(({ key, stored }) => {
    if (!sameCanonicalValue(stored, diagnostics[key])) {
      add(
        `derived-diagnostic-mismatch-${key}`,
        `$.${key}`,
        'الإسقاط التشخيصي المخزن لا يطابق النتيجة المعاد اشتقاقها من الحقائق القانونية.'
      );
    }
  });
  const derivedGates = deriveOperationalReadinessEligibility(pack, context);
  if (!sameCanonicalValue(pack.eligibilityGates, derivedGates)) {
    add(
      'derived-eligibility-mismatch',
      '$.eligibilityGates',
      'بوابات الأهلية المخزنة لا تطابق البوابات المعاد اشتقاقها.'
    );
  }
  return { valid: issues.length === 0, issues };
}

function diffImpact(path: string): OperationalReadinessPackDiffEntry['impact'] {
  if (path.includes('.source')) return 'source';
  if (path.includes('.requirements')) return 'requirement';
  if (path.includes('.owner') || path.includes('.responsible')) return 'ownership';
  if (path.includes('Authority') || path.includes('.authority')) return 'authority';
  if (path.includes('evidence')) return 'evidence';
  if (path.includes('spatial')) return 'spatial';
  if (path.includes('eligibility') || path.includes('activation')) return 'eligibility';
  return 'other';
}

function cloneUnknown(value: unknown): unknown {
  return value === undefined ? undefined : structuredClone(value);
}

function collectDiff(
  before: unknown,
  after: unknown,
  path = '$',
  entries: OperationalReadinessPackDiffEntry[] = []
): OperationalReadinessPackDiffEntry[] {
  if (Object.is(before, after)) return entries;
  if (Array.isArray(before) || Array.isArray(after)) {
    if (!Array.isArray(before) || !Array.isArray(after)) {
      entries.push({ path, before: cloneUnknown(before), after: cloneUnknown(after), impact: diffImpact(path) });
      return entries;
    }
    for (let index = 0; index < Math.max(before.length, after.length); index += 1) {
      collectDiff(before[index], after[index], `${path}[${index}]`, entries);
    }
    return entries;
  }
  if (isObject(before) && isObject(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    keys.forEach((key) => collectDiff(before[key], after[key], `${path}.${key}`, entries));
    return entries;
  }
  entries.push({ path, before: cloneUnknown(before), after: cloneUnknown(after), impact: diffImpact(path) });
  return entries;
}

function revisionStatus(pack: OperationalReadinessPack): OperationalReadinessPackRevision['status'] {
  if (pack.packStatus === 'frozen-candidate') return 'frozen-candidate';
  if (pack.packStatus === 'activated-baseline') return 'activated-baseline';
  return 'active-candidate';
}

export function createOperationalReadinessAuthoringState(
  pack: OperationalReadinessPack,
  trustSession: OperationalReadinessTrustSession
): OperationalReadinessAuthoringState {
  const validation = validateOperationalReadinessPack(pack, { trustSession });
  if (!validation.valid) throw new Error('OPERATIONAL_PACK_INVALID');
  const revisionId = `${pack.id}:r${pack.revision}:${pack.contentHash}`;
  return immutableOperationalReadinessClone({
    projectId: pack.projectId,
    initialRevisionId: revisionId,
    activeRevisionId: revisionId,
    revisions: [{
      revisionId,
      packId: pack.id,
      revision: pack.revision,
      status: revisionStatus(pack),
      previousContentHash: null,
      contentHash: pack.contentHash,
      changeReason: pack.revisionReason,
      actorRef: pack.createdBy,
      createdAt: pack.createdAt,
      diff: [],
      pack
    }],
    quarantinedRevisionIds: []
  });
}

function sourceRevisionWasOverwritten(
  previous: OperationalReadinessPack,
  next: OperationalReadinessPack
): boolean {
  const previousSources = new Map(
    previous.sourceRegistry.map((source) => [`${source.sourceId}:${source.sourceRevision}`, source])
  );
  return next.sourceRegistry.some((source) => {
    const prior = previousSources.get(`${source.sourceId}:${source.sourceRevision}`);
    return Boolean(prior && !sameCanonicalValue(canonicalSourceIdentity(prior), canonicalSourceIdentity(source)));
  });
}

function sourceTraceRevisionWasOverwritten(
  previous: OperationalReadinessPack,
  next: OperationalReadinessPack
): boolean {
  const previousSources = new Set(
    previous.sourceRegistry.map((source) => `${source.sourceId}:R${source.sourceRevision}`)
  );
  const previousTraces = new Map(
    previous.sourceTraces.map((trace) => [trace.traceId, trace])
  );
  return next.sourceTraces.some((trace) => {
    const prior = previousTraces.get(trace.traceId);
    if (!prior) return false;
    const sameRegisteredRevision = previousSources.has(`${trace.sourceId}:R${trace.sourceRevision}`);
    return sameRegisteredRevision && !sameCanonicalValue(prior, trace);
  });
}

function changedAuthorityTriggerFactIds(
  previous: OperationalReadinessPack,
  next: OperationalReadinessPack
): string[] {
  const previousFacts = new Map(
    (previous.authorityTriggerFacts ?? []).map((fact) => [fact.triggerFactId, fact])
  );
  const nextFacts = new Map(
    (next.authorityTriggerFacts ?? []).map((fact) => [fact.triggerFactId, fact])
  );
  return uniqueSorted(
    [...new Set([...previousFacts.keys(), ...nextFacts.keys()])]
      .filter((triggerFactId) =>
        !sameCanonicalValue(
          previousFacts.get(triggerFactId),
          nextFacts.get(triggerFactId)
        )
      )
  );
}

function authoringLifecycleTransitionIsValid(
  previous: OperationalReadinessPack,
  next: OperationalReadinessPack
): boolean {
  if (previous.packStatus === 'candidate') {
    return next.packStatus === 'candidate' || next.packStatus === 'review';
  }
  return previous.packStatus === 'review' && next.packStatus === 'review';
}

function prepareProjectedTrustedRevision(
  session: OperationalReadinessTrustSession,
  previous: OperationalReadinessPack,
  candidate: OperationalReadinessPack,
  prepare: (
    session: OperationalReadinessTrustSession,
    previous: OperationalReadinessPack,
    next: OperationalReadinessPack,
    command: OperationalReadinessRevisionAuthorityCommand
  ) => OperationalReadinessRevisionPermit,
  command: OperationalReadinessRevisionAuthorityCommand
): {
  pack: OperationalReadinessPack;
  permit: OperationalReadinessRevisionPermit;
} {
  const provisionalPermit = prepare(session, previous, candidate, command);
  const projected = materializeOperationalReadinessPackDerivedState(
    canonicalOperationalReadinessPack(candidate),
    { trustSession: session, revisionPermit: provisionalPermit }
  );
  if (projected.contentHash === candidate.contentHash) {
    return { pack: candidate, permit: provisionalPermit };
  }
  discardOperationalReadinessRevisionPermit(session, provisionalPermit);
  return {
    pack: projected,
    permit: prepare(session, previous, projected, command)
  };
}

export function previewOperationalReadinessPackRevision(input: {
  state: OperationalReadinessAuthoringState;
  nextPack: OperationalReadinessPack;
  changeReason: string;
  actorRef: string;
  createdAt: string;
  trustSession: OperationalReadinessTrustSession;
  authorityCommand?: OperationalReadinessRevisionAuthorityCommand;
}): { state: OperationalReadinessAuthoringState; revision: OperationalReadinessPackRevision } {
  if (!input.changeReason.trim()) throw new Error('OPERATIONAL_PACK_CHANGE_REASON_REQUIRED');
  if (
    input.authorityCommand
    && (
      input.actorRef !== input.authorityCommand.actorRef
      || input.changeReason.trim() !== input.authorityCommand.reasonAr.trim()
      || input.createdAt !== input.authorityCommand.at
    )
  ) {
    throw new Error('OPERATIONAL_PACK_AUTHORITY_COMMAND_METADATA_MISMATCH');
  }
  if (input.nextPack.projectId !== input.state.projectId) throw new Error('OPERATIONAL_PACK_CROSS_PROJECT_REJECTED');
  const active = input.state.revisions.find((revision) => revision.revisionId === input.state.activeRevisionId);
  if (!active) throw new Error('OPERATIONAL_PACK_ACTIVE_REVISION_MISSING');
  if (!validateOperationalReadinessPack(active.pack, {
    trustSession: input.trustSession
  }).valid) {
    throw new Error('OPERATIONAL_PACK_ACTIVE_REVISION_UNTRUSTED');
  }
  if (input.nextPack.id !== active.packId) throw new Error('OPERATIONAL_PACK_ID_IMMUTABLE');
  if (input.nextPack.revision !== active.revision + 1) throw new Error('OPERATIONAL_PACK_REVISION_SEQUENCE_INVALID');
  if (!authoringLifecycleTransitionIsValid(active.pack, input.nextPack)) {
    throw new Error('OPERATIONAL_PACK_DIRECT_BASELINE_TRANSITION_REJECTED');
  }
  if (
    sourceRevisionWasOverwritten(active.pack, input.nextPack)
    || sourceTraceRevisionWasOverwritten(active.pack, input.nextPack)
  ) {
    throw new Error('OPERATIONAL_PACK_SOURCE_REVISION_OVERWRITE_REJECTED');
  }
  if (active.pack.authorityTriggerFingerprint !== input.nextPack.authorityTriggerFingerprint) {
    const changedTriggerFactIds = changedAuthorityTriggerFactIds(
      active.pack,
      input.nextPack
    );
    const currentRevisionFactIds = new Set(
      input.nextPack.authorityTriggerFacts
        .filter((fact) => fact.revision === input.nextPack.revision)
        .map((fact) => fact.triggerFactId)
    );
    if (
      changedTriggerFactIds.length === 0
      || changedTriggerFactIds.some(
        (triggerFactId) => !currentRevisionFactIds.has(triggerFactId)
      )
      || !input.nextPack.authoringHistory.some((entry) =>
        entry.revision === input.nextPack.revision
        && entry.actorRef === input.actorRef
        && entry.at === input.createdAt
        && entry.reason.trim() === input.changeReason.trim()
        && entry.previousFingerprint === active.contentHash
      )
    ) {
      throw new Error('OPERATIONAL_PACK_TRIGGER_REVISION_GOVERNANCE_REQUIRED');
    }
  }
  const prepared = input.authorityCommand
    ? prepareProjectedTrustedRevision(
      input.trustSession,
      active.pack,
      input.nextPack,
      prepareOperationalReadinessAuthoringRevision,
      input.authorityCommand
    )
    : {
      pack: input.nextPack,
      permit: prepareOperationalReadinessLocalDraft(
        input.trustSession,
        active.pack,
        input.nextPack
      )
    };
  const validation = validateOperationalReadinessPack(prepared.pack, {
    trustSession: input.trustSession,
    revisionPermit: prepared.permit
  });
  if (validation.valid && input.authorityCommand) {
    acceptOperationalReadinessRevision(
      input.trustSession,
      prepared.permit,
      prepared.pack,
      'trusted-candidate'
    );
  }
  const revisionId = `${prepared.pack.id}:r${prepared.pack.revision}:${prepared.pack.contentHash}`;
  const revision = immutableOperationalReadinessClone<OperationalReadinessPackRevision>({
    revisionId,
    packId: prepared.pack.id,
    revision: prepared.pack.revision,
    status: validation.valid
      ? input.authorityCommand
        ? 'draft'
        : 'local-draft'
      : 'quarantined',
    previousContentHash: active.contentHash,
    contentHash: prepared.pack.contentHash,
    changeReason: input.changeReason.trim(),
    actorRef: input.actorRef,
    createdAt: input.createdAt,
    diff: collectDiff(active.pack, prepared.pack),
    pack: prepared.pack
  });
  return {
    revision,
    state: immutableOperationalReadinessClone({
      ...input.state,
      revisions: [...input.state.revisions, revision],
      quarantinedRevisionIds: validation.valid
        ? [...input.state.quarantinedRevisionIds]
        : [...input.state.quarantinedRevisionIds, revisionId]
    })
  };
}

export function activateOperationalCandidateRevision(
  state: OperationalReadinessAuthoringState,
  revisionId: string,
  trustSession: OperationalReadinessTrustSession
): OperationalReadinessAuthoringState {
  const target = state.revisions.find((revision) => revision.revisionId === revisionId);
  if (
    !target
    || (target.status !== 'draft' && target.status !== 'local-draft')
  ) {
    throw new Error('OPERATIONAL_PACK_DRAFT_NOT_ACTIVATABLE');
  }
  if (
    target.status === 'draft'
    && !inspectOperationalReadinessTrustSession(trustSession, target.pack).valid
  ) {
    throw new Error('OPERATIONAL_PACK_DRAFT_NOT_TRUSTED');
  }
  if (target.pack.projectId !== state.projectId) throw new Error('OPERATIONAL_PACK_CROSS_PROJECT_REJECTED');
  if (target.pack.packStatus !== 'candidate' && target.pack.packStatus !== 'review') {
    throw new Error('OPERATIONAL_PACK_BASELINE_PROMOTION_REJECTED');
  }
  return immutableOperationalReadinessClone({
    ...state,
    activeRevisionId: revisionId,
    revisions: state.revisions.map((revision) => ({
      ...revision,
      status: revision.revisionId === revisionId
        ? target.status === 'local-draft'
          ? 'local-draft'
          : 'active-candidate'
        : revision.status === 'active-candidate'
          ? 'rolled-back'
          : revision.status
    }))
  });
}

export function rollbackOperationalCandidateRevision(
  state: OperationalReadinessAuthoringState,
  revisionId: string,
  trustSession: OperationalReadinessTrustSession
): OperationalReadinessAuthoringState {
  const target = state.revisions.find((revision) => revision.revisionId === revisionId);
  if (
    !target
    || target.status === 'quarantined'
    || target.pack.packStatus === 'activated-baseline'
    || target.pack.projectId !== state.projectId
    || !inspectOperationalReadinessTrustSession(trustSession, target.pack).valid
  ) {
    throw new Error('OPERATIONAL_PACK_ROLLBACK_TARGET_INVALID');
  }
  return immutableOperationalReadinessClone({
    ...state,
    activeRevisionId: revisionId,
    revisions: state.revisions
  });
}

function appendHistory(
  pack: OperationalReadinessPack,
  input: OperationalReadinessPackTransitionInput,
  action: 'frozen' | 'activated'
) {
  return [
    ...pack.authoringHistory,
    {
      historyId: `HISTORY-${action.toUpperCase()}-${pack.revision + 1}`,
      revision: pack.revision + 1,
      actorRef: input.actorRef,
      at: input.at,
      action,
      reason: input.reasonAr,
      previousFingerprint: pack.contentHash
    }
  ];
}

export function attemptOperationalReadinessPackFreeze(
  pack: OperationalReadinessPack,
  input?: OperationalReadinessPackTransitionInput,
  context?: OperationalReadinessPackValidationContext
): OperationalReadinessPackFreezeResult {
  if (!context?.trustSession) {
    return {
      frozen: false,
      blockingGateIds: ['TRUST:SESSION-REQUIRED'],
      messageAr: 'تعذر إثبات سلسلة الثقة المحلية. التجميد والتفعيل محجوبان.'
    };
  }
  const validation = validateOperationalReadinessPack(pack, context);
  if (!validation.valid) {
    return {
      frozen: false,
      blockingGateIds: validation.issues.map((issue) => `VALIDATION:${issue.code}`),
      messageAr: 'تعذر التجميد: الحزمة الحالية فشلت في تحقق النزاهة.'
    };
  }
  if ((pack.packStatus !== 'candidate' && pack.packStatus !== 'review') || pack.stateContext !== 'candidate-preparation') {
    return {
      frozen: false,
      blockingGateIds: ['LIFECYCLE:NOT-EDITABLE-CANDIDATE'],
      messageAr: 'تعذر التجميد: الانتقال يقبل مرشحًا أو مراجعة قابلة للتأليف فقط.'
    };
  }
  const gates = derivePreFreezeEligibility(pack, context);
  const blockingGateIds = gates
    .filter((candidate) => candidate.blocking && candidate.status !== 'passed')
    .map((candidate) => candidate.gateId);
  if (
    blockingGateIds.length > 0
    || !input?.authorityId
    || !input.actorRef
    || !input.reasonAr.trim()
    || !input.at
    || input.timeTrust === 'unknown'
    || input.sourceTraceIds.length === 0
  ) {
    return {
      frozen: false,
      blockingGateIds: blockingGateIds.length > 0
        ? blockingGateIds
        : ['TRANSITION:FREEZE-METADATA-REQUIRED'],
      messageAr: 'تعذر التجميد: توجد بوابات ما قبل التجميد غير مستوفاة أو بيانات الانتقال ناقصة.'
    };
  }
  const frozenCandidate = materializeOperationalReadinessPackDerivedState(
    {
      ...canonicalOperationalReadinessPack(pack),
      revision: pack.revision + 1,
      packStatus: 'frozen-candidate',
      stateContext: 'candidate-preparation',
      activationStatus: 'frozen-awaiting-activation',
      activationRecord: null,
      frozenFromContentHash: pack.contentHash,
      frozenSourceFingerprint: pack.sourceFingerprint,
      frozenSourceTraceFingerprint: pack.sourceTraceFingerprint,
      revisionReason: input.reasonAr.trim(),
      authoringHistory: appendHistory(pack, input, 'frozen'),
      operationalReadiness: 'cannot-determine'
    },
    context
  );
  let frozen: OperationalReadinessPack;
  let revisionPermit: OperationalReadinessRevisionPermit;
  try {
    const prepared = prepareProjectedTrustedRevision(
      context.trustSession,
      pack,
      frozenCandidate,
      prepareOperationalReadinessFreezeRevision,
      input
    );
    frozen = prepared.pack;
    revisionPermit = prepared.permit;
  } catch {
    return {
      frozen: false,
      blockingGateIds: ['TRUST:FREEZE-AUTHORITY-REJECTED'],
      messageAr: 'تعذر التجميد: جهة تأليف الحزمة أو سلسلة المراجعة غير موثوقة.'
    };
  }
  const frozenValidation = validateOperationalReadinessPack(frozen, {
    trustSession: context.trustSession,
    revisionPermit
  });
  if (!frozenValidation.valid) {
    return {
      frozen: false,
      blockingGateIds: frozenValidation.issues.map((issue) => `VALIDATION:${issue.code}`),
      messageAr: 'تعذر التجميد: فشلت المراجعة الجديدة في تحقق النزاهة.'
    };
  }
  try {
    acceptOperationalReadinessRevision(
      context.trustSession,
      revisionPermit,
      frozen,
      'frozen-candidate'
    );
  } catch {
    return {
      frozen: false,
      blockingGateIds: ['TRUST:FREEZE-CUSTODY-REJECTED'],
      messageAr: 'تعذر التجميد: لم تُقبل المراجعة في سجل الحيازة المحلي.'
    };
  }
  return {
    frozen: true,
    blockingGateIds: [],
    messageAr: 'تم إنشاء مراجعة مرشحة مجمدة جديدة. لم تُفعّل كأساس ولم تتغير الجاهزية التشغيلية.',
    pack: frozen
  };
}

export function attemptOperationalReadinessPackActivation(
  pack: OperationalReadinessPack,
  input: OperationalReadinessPackActivationInput,
  context?: OperationalReadinessPackValidationContext
): OperationalReadinessPackActivationResult {
  if (!context?.trustSession) {
    return {
      activated: false,
      blockingGateIds: ['TRUST:SESSION-REQUIRED'],
      messageAr: 'تعذر إثبات سلسلة الثقة المحلية. التجميد والتفعيل محجوبان.'
    };
  }
  const validation = validateOperationalReadinessPack(pack, context);
  if (!validation.valid || pack.packStatus !== 'frozen-candidate') {
    return {
      activated: false,
      blockingGateIds: validation.valid
        ? ['LIFECYCLE:FROZEN-CANDIDATE-REQUIRED']
        : validation.issues.map((issue) => `VALIDATION:${issue.code}`),
      messageAr: 'تعذر التفعيل: يجب تقديم مراجعة مرشحة مجمدة وصالحة.'
    };
  }
  const activationRecord: OperationalReadinessActivationRecord = {
    activationId: `ACTIVATION-${sha256PayloadSync({
      packId: pack.id,
      revision: pack.revision,
      authorityId: input.authorityId,
      actorRef: input.actor.actorRef,
      evidenceRefs: [...input.evidenceRefs].sort(),
      at: input.at
    }).slice(0, 20).toUpperCase()}`,
    authorityId: input.authorityId,
    actor: immutableOperationalReadinessClone(input.actor),
    evidenceRefs: uniqueSorted(input.evidenceRefs),
    sourceTraceIds: uniqueSorted(input.sourceTraceIds),
    approvedAt: input.at,
    reasonAr: input.reasonAr.trim(),
    frozenRevision: pack.revision,
    frozenContentHash: pack.contentHash,
    frozenSourceFingerprint: pack.sourceFingerprint,
    frozenSourceTraceFingerprint: pack.sourceTraceFingerprint
  };
  const gates = derivePreActivationEligibility(pack, activationRecord, context);
  const blockingGateIds = gates
    .filter((candidate) => candidate.blocking && candidate.status !== 'passed')
    .map((candidate) => candidate.gateId);
  if (
    blockingGateIds.length > 0
    || !input.authorityId
    || !input.actorRef
    || input.actorRef !== input.actor.actorRef
    || !input.reasonAr.trim()
    || input.timeTrust === 'unknown'
    || input.evidenceRefs.length === 0
    || input.sourceTraceIds.length === 0
  ) {
    return {
      activated: false,
      blockingGateIds: blockingGateIds.length > 0
        ? blockingGateIds
        : ['TRANSITION:ACTIVATION-METADATA-REQUIRED'],
      messageAr: 'تعذر التفعيل: بوابات ما قبل التفعيل أو بيانات قرار التفعيل غير مكتملة.'
    };
  }
  const activatedCandidate = materializeOperationalReadinessPackDerivedState(
    {
      ...canonicalOperationalReadinessPack(pack),
      revision: pack.revision + 1,
      packStatus: 'activated-baseline',
      stateContext: 'baseline',
      activationStatus: 'activated',
      activationRecord,
      revisionReason: input.reasonAr.trim(),
      authoringHistory: appendHistory(pack, input, 'activated'),
      operationalReadiness: 'cannot-determine'
    },
    context
  );
  let activated: OperationalReadinessPack;
  let revisionPermit: OperationalReadinessRevisionPermit;
  try {
    const prepared = prepareProjectedTrustedRevision(
      context.trustSession,
      pack,
      activatedCandidate,
      prepareOperationalReadinessActivationRevision,
      input
    );
    activated = prepared.pack;
    revisionPermit = prepared.permit;
  } catch {
    return {
      activated: false,
      blockingGateIds: ['TRUST:ACTIVATION-AUTHORITY-REJECTED'],
      messageAr: 'تعذر التفعيل: سلطة التفعيل أو سلسلة المراجعة غير موثوقة.'
    };
  }
  const activatedValidation = validateOperationalReadinessPack(activated, {
    trustSession: context.trustSession,
    revisionPermit
  });
  if (!activatedValidation.valid) {
    return {
      activated: false,
      blockingGateIds: activatedValidation.issues.map((issue) => `VALIDATION:${issue.code}`),
      messageAr: 'تعذر التفعيل: فشل أساس المتطلبات الجديد في تحقق النزاهة.'
    };
  }
  try {
    acceptOperationalReadinessRevision(
      context.trustSession,
      revisionPermit,
      activated,
      'activated-baseline'
    );
  } catch {
    return {
      activated: false,
      blockingGateIds: ['TRUST:ACTIVATION-CUSTODY-REJECTED'],
      messageAr: 'تعذر التفعيل: لم يُقبل أساس المتطلبات في سجل الحيازة المحلي.'
    };
  }
  return {
    activated: true,
    blockingGateIds: [],
    messageAr: 'تم إنشاء مراجعة أساس متطلبات مفعّلة. الجاهزية التشغيلية ما زالت غير قابلة للتحديد.',
    pack: activated
  };
}

export function createReadinessPackDecisionDraft(input: {
  pack: OperationalReadinessPack;
  blockerType: OperationalReadinessDecisionDraft['blockerType'];
  affectedIds: string[];
  sourceTraceIds: string[];
  titleAr: string;
  expectedImpactAr: string;
  createdAt: string;
}): OperationalReadinessDecisionDraft {
  const beforeHash = input.pack.contentHash;
  const draft: OperationalReadinessDecisionDraft = {
    decisionId: `DECISION-DRAFT-${sha256PayloadSync({
      packId: input.pack.id,
      revision: input.pack.revision,
      blockerType: input.blockerType,
      affectedIds: [...input.affectedIds].sort(),
      createdAt: input.createdAt
    }).slice(0, 16).toUpperCase()}`,
    projectId: input.pack.projectId,
    eventId: input.pack.eventId,
    venueId: input.pack.venueId,
    titleAr: input.titleAr,
    status: 'draft',
    blockerType: input.blockerType,
    affectedIds: [...input.affectedIds],
    sourceTraceIds: [...input.sourceTraceIds],
    expectedImpactAr: input.expectedImpactAr,
    createdAt: input.createdAt,
    readinessMutation: false,
    baselineMutation: false
  };
  if (input.pack.contentHash !== beforeHash) throw new Error('OPERATIONAL_PACK_DECISION_MUTATED_READINESS');
  return immutableOperationalReadinessClone(draft);
}
