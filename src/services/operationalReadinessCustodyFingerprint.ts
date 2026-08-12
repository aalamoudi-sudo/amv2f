import type {
  OperationalReadinessActorReference,
  OperationalReadinessAuthoritySlot,
  OperationalReadinessPack,
  OperationalReadinessSource
} from '../types/operationalReadinessPack';
import { sha256PayloadSync, stableSerialize } from './integrationHash';

type SourceTrace = OperationalReadinessPack['sourceTraces'][number];

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

function canonicalActor(actor: OperationalReadinessActorReference | null) {
  if (!actor) return null;
  return {
    actorRef: actor.actorRef,
    actorType: actor.actorType,
    classification: actor.classification,
    assignmentScope: actor.assignmentScope,
    sourceTraceIds: sorted(actor.sourceTraceIds),
    founderDirectionReference: actor.founderDirectionReference,
    authorityLimitations: sorted(actor.authorityLimitations)
  };
}

function canonicalAuthorityBase(authority: OperationalReadinessAuthoritySlot) {
  return {
    authorityId: authority.authorityId,
    authorityKind: authority.authorityKind,
    scopeType: authority.scopeType,
    scopeId: authority.scopeId,
    classification: authority.classification,
    separationOfDutiesGroup: authority.separationOfDutiesGroup,
    sourceTraceIds: sorted(authority.sourceTraceIds)
  };
}

function canonicalAuthority(authority: OperationalReadinessAuthoritySlot) {
  return {
    ...canonicalAuthorityBase(authority),
    status: authority.status,
    actor: canonicalActor(authority.actor),
    waiverHash: authority.notApplicableDeclaration?.waiverHash ?? null
  };
}

function authorityById(
  pack: OperationalReadinessPack,
  authorityId: string
): OperationalReadinessAuthoritySlot | null {
  const matches = pack.authorityMatrix.filter(
    (authority) => authority.authorityId === authorityId
  );
  return matches.length === 1 ? matches[0]! : null;
}

function governanceProjection(pack: OperationalReadinessPack) {
  const referenceKeys = [
    'requirementAuthority',
    'verificationAuthority',
    'internalApprovalAuthority',
    'externalAcceptanceAuthority',
    'openingDecisionAuthority',
    'activationAuthority'
  ] as const;
  return {
    packOwner: canonicalActor(pack.governance.packOwner),
    separationOfDutiesPolicy: pack.governance.separationOfDutiesPolicy,
    references: referenceKeys.map((key) => {
      const authority = pack.governance[key];
      return {
        key,
        authority: authority ? canonicalAuthority(authority) : null
      };
    })
  };
}

export function operationalReadinessAuthorityTopologyProjection(
  pack: OperationalReadinessPack
) {
  return {
    authorityRequirementPolicyId: pack.authorityRequirementPolicyId,
    authorities: [...pack.authorityMatrix]
      .sort((left, right) => left.authorityId.localeCompare(right.authorityId))
      .map(canonicalAuthority),
    requiredAuthorities: [...pack.requiredAuthorities]
      .sort((left, right) =>
        left.declarationId.localeCompare(right.declarationId)
      )
      .map((declaration) => ({
        declarationId: declaration.declarationId,
        policyRuleId: declaration.policyRuleId,
        authorityId: declaration.authorityId,
        authorityKind: declaration.authorityKind,
        phase: declaration.phase,
        applicable: declaration.applicable,
        requiredScopeType: declaration.requiredScopeType,
        requiredScopeId: declaration.requiredScopeId,
        separationFromAuthorityKinds: sorted(
          declaration.separationFromAuthorityKinds
        ),
        sourceTraceIds: sorted(declaration.sourceTraceIds),
        waiverHash: declaration.notApplicableDeclaration?.waiverHash ?? null
      })),
    governance: governanceProjection(pack)
  };
}

export function deriveOperationalReadinessAuthorityTopologyFingerprint(
  pack: OperationalReadinessPack
): string {
  return sha256PayloadSync(
    operationalReadinessAuthorityTopologyProjection(pack)
  );
}

export function deriveOperationalReadinessAuthorityAssignmentFingerprint(
  pack: OperationalReadinessPack,
  authorityId: string
): string | null {
  const authority = authorityById(pack, authorityId);
  return authority ? sha256PayloadSync(canonicalAuthority(authority)) : null;
}

function canonicalSourceBinding(source: OperationalReadinessSource) {
  return {
    sourceId: source.sourceId,
    sourceRevisionId: source.sourceRevisionId,
    sourceRevision: source.sourceRevision,
    originalFilename: source.originalFilename,
    absoluteLocalPath: source.absoluteLocalPath,
    expectedByteSize: source.expectedByteSize,
    observedByteSize: source.observedByteSize,
    expectedSha256: source.expectedSha256,
    observedSha256: source.observedSha256,
    fingerprintStatus: source.fingerprintStatus,
    sourceClassification: source.sourceClassification,
    approvalScope: source.approvalScope,
    approvalLimitations: sorted(source.approvalLimitations),
    extractedAt: source.extractedAt,
    supersedesSourceId: source.supersedesSourceId,
    supersedesSourceRevisionId: source.supersedesSourceRevisionId,
    previousSourceHash: source.previousSourceHash,
    extractionTool: source.extractionTool,
    extractionToolVersion: source.extractionToolVersion,
    committedBinary: source.committedBinary
  };
}

function sourceForTrace(
  pack: OperationalReadinessPack,
  trace: SourceTrace
): OperationalReadinessSource | null {
  return pack.sourceRegistry.find((source) =>
    source.sourceId === trace.sourceId
    && source.sourceRevision === trace.sourceRevision
    && source.observedSha256 === trace.sourceHash
  ) ?? null;
}

function canonicalTraceBinding(
  pack: OperationalReadinessPack,
  trace: SourceTrace
) {
  return {
    traceId: trace.traceId,
    sourceId: trace.sourceId,
    sourceRevision: trace.sourceRevision,
    sourceRevisionId: sourceForTrace(pack, trace)?.sourceRevisionId ?? null,
    sourceHash: trace.sourceHash,
    locatorType: trace.locatorType,
    slideNumber: trace.slideNumber,
    sheetName: trace.sheetName,
    rowNumber: trace.rowNumber,
    tableIndex: trace.tableIndex,
    shapeId: trace.shapeId,
    sectionReference: trace.sectionReference,
    sanitizedSourceLabel: trace.sanitizedSourceLabel,
    extractedMeaning: trace.extractedMeaning,
    extractionConfidence: trace.extractionConfidence,
    reviewStatus: trace.reviewStatus
  };
}

export function deriveOperationalReadinessSourceBindingFingerprint(
  pack: OperationalReadinessPack
): string {
  return sha256PayloadSync(
    [...pack.sourceRegistry]
      .sort((left, right) =>
        left.sourceRevisionId.localeCompare(right.sourceRevisionId)
      )
      .map(canonicalSourceBinding)
  );
}

export function deriveOperationalReadinessTraceBindingFingerprint(
  pack: OperationalReadinessPack
): string {
  return sha256PayloadSync(
    [...pack.sourceTraces]
      .sort((left, right) => left.traceId.localeCompare(right.traceId))
      .map((trace) => canonicalTraceBinding(pack, trace))
  );
}

function waiverTransition(
  previous: OperationalReadinessAuthoritySlot,
  next: OperationalReadinessAuthoritySlot
): boolean {
  if (
    stableSerialize(canonicalAuthorityBase(previous))
      !== stableSerialize(canonicalAuthorityBase(next))
  ) {
    return false;
  }
  const firstWaiver = previous.status === 'assigned'
    && previous.actor !== null
    && previous.notApplicableDeclaration === null
    && next.status === 'not-applicable'
    && next.actor === null
    && next.notApplicableDeclaration !== null;
  const replacementWaiver = previous.status === 'not-applicable'
    && previous.actor === null
    && previous.notApplicableDeclaration !== null
    && next.status === 'not-applicable'
    && next.actor === null
    && next.notApplicableDeclaration !== null
    && next.notApplicableDeclaration.previousWaiverHash
      === previous.notApplicableDeclaration.waiverHash
    && next.notApplicableDeclaration.revision
      > previous.notApplicableDeclaration.revision;
  return firstWaiver || replacementWaiver;
}

function declarationTransitionIsWaiver(
  previous: OperationalReadinessPack['requiredAuthorities'][number],
  next: OperationalReadinessPack['requiredAuthorities'][number]
): boolean {
  const previousBase = {
    ...previous,
    applicable: undefined,
    notApplicableDeclaration: undefined
  };
  const nextBase = {
    ...next,
    applicable: undefined,
    notApplicableDeclaration: undefined
  };
  if (stableSerialize(previousBase) !== stableSerialize(nextBase)) return false;
  const firstWaiver = previous.applicable
    && previous.notApplicableDeclaration === null
    && !next.applicable
    && next.notApplicableDeclaration !== null;
  const replacementWaiver = !previous.applicable
    && previous.notApplicableDeclaration !== null
    && !next.applicable
    && next.notApplicableDeclaration !== null
    && next.notApplicableDeclaration.previousWaiverHash
      === previous.notApplicableDeclaration.waiverHash
    && next.notApplicableDeclaration.revision
      > previous.notApplicableDeclaration.revision;
  return firstWaiver || replacementWaiver;
}

export function authorityTopologyTransitionIsGoverned(
  previous: OperationalReadinessPack,
  next: OperationalReadinessPack
): boolean {
  if (
    deriveOperationalReadinessAuthorityTopologyFingerprint(previous)
      === deriveOperationalReadinessAuthorityTopologyFingerprint(next)
  ) {
    return true;
  }
  const previousAuthorityIds = previous.authorityMatrix.map(
    (authority) => authority.authorityId
  );
  const nextAuthorityIds = next.authorityMatrix.map(
    (authority) => authority.authorityId
  );
  const previousDeclarationIds = previous.requiredAuthorities.map(
    (declaration) => declaration.declarationId
  );
  const nextDeclarationIds = next.requiredAuthorities.map(
    (declaration) => declaration.declarationId
  );
  if (
    previous.authorityRequirementPolicyId !== next.authorityRequirementPolicyId
    || previous.authorityMatrix.length !== next.authorityMatrix.length
    || previous.requiredAuthorities.length !== next.requiredAuthorities.length
    || new Set(nextAuthorityIds).size !== nextAuthorityIds.length
    || new Set(nextDeclarationIds).size !== nextDeclarationIds.length
    || stableSerialize(sorted(previousAuthorityIds))
      !== stableSerialize(sorted(nextAuthorityIds))
    || stableSerialize(sorted(previousDeclarationIds))
      !== stableSerialize(sorted(nextDeclarationIds))
    || stableSerialize(canonicalActor(previous.governance.packOwner))
      !== stableSerialize(canonicalActor(next.governance.packOwner))
    || previous.governance.separationOfDutiesPolicy
      !== next.governance.separationOfDutiesPolicy
  ) {
    return false;
  }

  const previousAuthorities = new Map(
    previous.authorityMatrix.map((authority) => [
      authority.authorityId,
      authority
    ])
  );
  const changedAuthorityIds = new Set<string>();
  for (const authority of next.authorityMatrix) {
    const prior = previousAuthorities.get(authority.authorityId);
    if (!prior) return false;
    if (stableSerialize(prior) === stableSerialize(authority)) continue;
    if (!waiverTransition(prior, authority)) return false;
    changedAuthorityIds.add(authority.authorityId);
  }

  const previousDeclarations = new Map(
    previous.requiredAuthorities.map((declaration) => [
      declaration.declarationId,
      declaration
    ])
  );
  const changedDeclarationAuthorities = new Set<string>();
  for (const declaration of next.requiredAuthorities) {
    const prior = previousDeclarations.get(declaration.declarationId);
    if (!prior) return false;
    if (stableSerialize(prior) === stableSerialize(declaration)) continue;
    if (!declarationTransitionIsWaiver(prior, declaration)) return false;
    changedDeclarationAuthorities.add(declaration.authorityId);
  }
  if (
    stableSerialize(sorted([...changedAuthorityIds]))
      !== stableSerialize(sorted([...changedDeclarationAuthorities]))
  ) {
    return false;
  }

  for (const authorityId of changedAuthorityIds) {
    const authority = authorityById(next, authorityId);
    const declaration = next.requiredAuthorities.find(
      (candidate) => candidate.authorityId === authorityId
    );
    if (
      !authority?.notApplicableDeclaration
      || !declaration?.notApplicableDeclaration
      || authority.notApplicableDeclaration.waiverHash
        !== declaration.notApplicableDeclaration.waiverHash
    ) {
      return false;
    }
  }

  const governanceKeys = [
    'requirementAuthority',
    'verificationAuthority',
    'internalApprovalAuthority',
    'externalAcceptanceAuthority',
    'openingDecisionAuthority',
    'activationAuthority'
  ] as const;
  return governanceKeys.every((key) => {
    const prior = previous.governance[key];
    const current = next.governance[key];
    if (!prior || !current) return prior === current;
    if (prior.authorityId !== current.authorityId) return false;
    const canonicalCurrent = authorityById(next, current.authorityId);
    return Boolean(
      canonicalCurrent
      && stableSerialize(current) === stableSerialize(canonicalCurrent)
      && (
        stableSerialize(prior) === stableSerialize(current)
        || changedAuthorityIds.has(current.authorityId)
      )
    );
  });
}

export type OperationalReadinessSourceCustodyRejection =
  | 'OPERATIONAL_TRUST_SOURCE_TRACE_REBINDING_REJECTED'
  | 'OPERATIONAL_TRUST_SOURCE_PARENT_UNKNOWN_REJECTED'
  | 'OPERATIONAL_TRUST_SOURCE_PREVIOUS_HASH_REJECTED'
  | 'OPERATIONAL_TRUST_SOURCE_REVISION_FORK_REJECTED'
  | 'OPERATIONAL_TRUST_SOURCE_CHANGE_TRACE_UNRESOLVED';

export function operationalReadinessSourceCustodyRejection(
  previous: OperationalReadinessPack,
  next: OperationalReadinessPack
): OperationalReadinessSourceCustodyRejection | null {
  const nextSourceRevisionIds = next.sourceRegistry.map(
    (source) => source.sourceRevisionId
  );
  if (
    new Set(nextSourceRevisionIds).size !== nextSourceRevisionIds.length
  ) {
    return 'OPERATIONAL_TRUST_SOURCE_REVISION_FORK_REJECTED';
  }
  const nextSourcesByRevisionId = new Map(
    next.sourceRegistry.map((source) => [source.sourceRevisionId, source])
  );
  for (const source of previous.sourceRegistry) {
    const current = nextSourcesByRevisionId.get(source.sourceRevisionId);
    if (
      !current
      || stableSerialize(canonicalSourceBinding(source))
        !== stableSerialize(canonicalSourceBinding(current))
    ) {
      return 'OPERATIONAL_TRUST_SOURCE_REVISION_FORK_REJECTED';
    }
  }

  const nextTraceIds = next.sourceTraces.map((trace) => trace.traceId);
  if (new Set(nextTraceIds).size !== nextTraceIds.length) {
    return 'OPERATIONAL_TRUST_SOURCE_TRACE_REBINDING_REJECTED';
  }
  const nextTraces = new Map(
    next.sourceTraces.map((trace) => [trace.traceId, trace])
  );
  for (const trace of previous.sourceTraces) {
    const current = nextTraces.get(trace.traceId);
    if (
      !current
      || stableSerialize(canonicalTraceBinding(previous, trace))
        !== stableSerialize(canonicalTraceBinding(next, current))
    ) {
      return 'OPERATIONAL_TRUST_SOURCE_TRACE_REBINDING_REJECTED';
    }
  }

  const previousRevisionIds = new Set(
    previous.sourceRegistry.map((source) => source.sourceRevisionId)
  );
  const newSources = next.sourceRegistry.filter(
    (source) => !previousRevisionIds.has(source.sourceRevisionId)
  );
  const childrenByParent = new Map<string, number>();
  for (const source of next.sourceRegistry) {
    if (source.supersedesSourceRevisionId) {
      childrenByParent.set(
        source.supersedesSourceRevisionId,
        (childrenByParent.get(source.supersedesSourceRevisionId) ?? 0) + 1
      );
    }
  }
  for (const source of newSources) {
    if (source.sourceRevision === 1) {
      return 'OPERATIONAL_TRUST_SOURCE_PARENT_UNKNOWN_REJECTED';
    }
    const parent = previous.sourceRegistry.find(
      (candidate) =>
        candidate.sourceRevisionId === source.supersedesSourceRevisionId
    );
    if (!parent || parent.sourceId !== source.sourceId) {
      return 'OPERATIONAL_TRUST_SOURCE_PARENT_UNKNOWN_REJECTED';
    }
    if (
      source.previousSourceHash !== parent.observedSha256
      || source.supersedesSourceId !== parent.sourceId
    ) {
      return 'OPERATIONAL_TRUST_SOURCE_PREVIOUS_HASH_REJECTED';
    }
    if (
      source.sourceRevision !== parent.sourceRevision + 1
      || (childrenByParent.get(parent.sourceRevisionId) ?? 0) !== 1
    ) {
      return 'OPERATIONAL_TRUST_SOURCE_REVISION_FORK_REJECTED';
    }
  }

  const newSourceRevisionIds = new Set(
    newSources.map((source) => source.sourceRevisionId)
  );
  const previousTraceIds = new Set(
    previous.sourceTraces.map((trace) => trace.traceId)
  );
  const newTraces = next.sourceTraces.filter(
    (trace) => !previousTraceIds.has(trace.traceId)
  );
  const newSourceHasTrace = newSources.every((source) =>
    newTraces.some((trace) =>
      trace.sourceId === source.sourceId
      && trace.sourceRevision === source.sourceRevision
      && trace.sourceHash === source.observedSha256
      && newSourceRevisionIds.has(source.sourceRevisionId)
    )
  );
  if (!newSourceHasTrace) {
    return 'OPERATIONAL_TRUST_SOURCE_CHANGE_TRACE_UNRESOLVED';
  }
  return null;
}
