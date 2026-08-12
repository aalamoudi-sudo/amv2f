import {
  findOperationalReadinessTrustedRoot,
  trustedEvidenceRegistryFingerprint
} from '../data/operationalReadinessTrustCatalog';
import type { CanonicalEvidenceReference } from '../types/integration';
import type {
  OperationalAuthorityKind,
  OperationalAuthorityWaiverRecord,
  OperationalReadinessActorReference,
  OperationalReadinessAuthoritySlot,
  OperationalReadinessPack
} from '../types/operationalReadinessPack';
import type {
  OperationalReadinessRevisionAuthorityCommand,
  OperationalReadinessRevisionPermit,
  OperationalReadinessTrustSession,
  OperationalReadinessTrustStatus,
  OperationalReadinessTrustedEvidenceRegistrySnapshot,
  OperationalReadinessTrustedRevisionRecord,
  OperationalReadinessTrustedRootCatalogEntry,
  OperationalReadinessTrustedWaiverLedgerEntry
} from '../types/operationalReadinessTrust';
import { EvidenceResolver, type EvidenceResolutionResult } from './evidenceResolver';
import { sha256PayloadSync, stableSerialize } from './integrationHash';
import { operationalAuthorityRequirementPolicy } from './operationalAuthorityRequirementPolicy';
import {
  authorityTopologyTransitionIsGoverned,
  deriveOperationalReadinessAuthorityTopologyFingerprint,
  deriveOperationalReadinessSourceBindingFingerprint,
  deriveOperationalReadinessTraceBindingFingerprint,
  operationalReadinessSourceCustodyRejection
} from './operationalReadinessCustodyFingerprint';
import { ProvenanceResolver } from './provenanceResolver';
import { validateOperationalReadinessPack } from './operationalReadinessPack';

interface TrustedEvidenceRuntime {
  snapshot: OperationalReadinessTrustedEvidenceRegistrySnapshot;
  resolver: EvidenceResolver;
  valid: boolean;
}

interface TrustedRevisionState {
  pack: OperationalReadinessPack;
  record: OperationalReadinessTrustedRevisionRecord;
}

interface TrustedStore {
  root: OperationalReadinessTrustedRootCatalogEntry;
  rootPack: OperationalReadinessPack;
  revisionsByHash: Map<string, TrustedRevisionState>;
  revisionOrder: string[];
  headHash: string;
  evidence: TrustedEvidenceRuntime | null;
  waiverLedgerInitialized: boolean;
  waiverHistory: Map<string, OperationalReadinessTrustedWaiverLedgerEntry[]>;
}

interface TrustSessionState {
  store: TrustedStore;
  status: 'active' | 'expired' | 'superseded';
  issuedAt: string;
}

interface RevisionPermitState {
  session: OperationalReadinessTrustSession;
  previousHash: string;
  nextHash: string;
  nextRevision: number;
  mode: 'trusted-authoring' | 'local-draft' | 'freeze' | 'activation';
  command: OperationalReadinessRevisionAuthorityCommand | null;
  changedTriggerFactIds: string[];
  consumed: boolean;
}

export interface OperationalReadinessTrustedEvidenceRequest {
  evidenceRefs: string[];
  authorityKind: OperationalAuthorityKind;
  authorityId: string;
  resolverAuthorityId: string;
  subjectActorRef: string;
  subjectAuthorityId: string;
  subjectAuthorityKind: OperationalAuthorityKind;
  authorityAssignmentFingerprint: string;
  acceptedEvidenceTypes: readonly CanonicalEvidenceReference['evidenceType'][];
}

export interface OperationalReadinessTrustedEvidenceResolution {
  valid: boolean;
  evidence: CanonicalEvidenceReference[];
  registryFingerprint: string | null;
  validatedAt: string | null;
  authoritativeTimeAvailable: false;
  issues: string[];
}

export interface OperationalReadinessWaiverLedgerInspection {
  available: boolean;
  head: OperationalReadinessTrustedWaiverLedgerEntry | null;
  history: OperationalReadinessTrustedWaiverLedgerEntry[];
}

const stores = new Map<string, TrustedStore>();
const sessions = new WeakMap<
  OperationalReadinessTrustSession,
  TrustSessionState
>();
const permits = new WeakMap<
  OperationalReadinessRevisionPermit,
  RevisionPermitState
>();

function trustStoreKey(
  root: Pick<OperationalReadinessTrustedRootCatalogEntry, 'projectId' | 'packId'>
): string {
  return `${root.projectId}:${root.packId}`;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function packHash(pack: OperationalReadinessPack): string {
  const { contentHash, ...content } = pack;
  void contentHash;
  return sha256PayloadSync(content);
}

function rootMatchesPack(
  root: OperationalReadinessTrustedRootCatalogEntry,
  pack: OperationalReadinessPack
): boolean {
  return pack.id === root.packId
    && pack.projectId === root.projectId
    && pack.eventId === root.eventId
    && pack.venueId === root.venueId
    && pack.revision === root.expectedRevision
    && pack.contentHash === root.expectedContentHash
    && packHash(pack) === root.expectedContentHash
    && pack.authorityTriggerFingerprint === root.expectedTriggerFingerprint
    && pack.sourceFingerprint === root.expectedSourceFingerprint
    && pack.sourceTraceFingerprint === root.expectedSourceTraceFingerprint
    && deriveOperationalReadinessAuthorityTopologyFingerprint(pack)
      === root.expectedAuthorityTopologyFingerprint
    && deriveOperationalReadinessSourceBindingFingerprint(pack)
      === root.expectedSourceBindingFingerprint
    && deriveOperationalReadinessTraceBindingFingerprint(pack)
      === root.expectedTraceBindingFingerprint;
}

function evidenceRuntime(
  snapshot: OperationalReadinessTrustedEvidenceRegistrySnapshot | null
): TrustedEvidenceRuntime | null {
  if (!snapshot) return null;
  const evidenceIds = snapshot.evidence.map((entry) => entry.evidence.evidenceId);
  const validRegistryIdentity =
    snapshot.registryFingerprint === trustedEvidenceRegistryFingerprint(snapshot)
    && snapshot.currentHead === snapshot.registryFingerprint
    && new Set(evidenceIds).size === evidenceIds.length;
  const knownEntityIds = new Set(
    snapshot.evidence.flatMap((entry) => entry.evidence.relatedEntityIds)
  );
  const resolver = new EvidenceResolver(
    snapshot.evidence.map((entry) => entry.evidence),
    knownEntityIds
  );
  const validEntries = snapshot.evidence.every((entry) => {
    const provenanceResolver = new ProvenanceResolver([entry.provenance.bundle]);
    const provenance = provenanceResolver.resolve({
      provenanceRefs: [entry.provenance.bundle.bundleId],
      eventId: entry.provenance.eventId,
      stateContext: entry.evidence.stateContext,
      sourceRecordId: entry.provenance.sourceRecordId,
      sourceSystemId: entry.provenance.sourceSystemId,
      adapterId: entry.provenance.adapterId,
      adapterVersion: entry.provenance.adapterVersion
    });
    return entry.evidenceFingerprint === sha256PayloadSync(entry.evidence)
      && entry.provenance.bundleFingerprint
        === sha256PayloadSync(entry.provenance.bundle)
      && entry.identityBinding.trustedProvenanceFingerprint
        === entry.provenance.bundleFingerprint
      && entry.identityBinding.eventId === snapshot.eventId
      && entry.identityBinding.packId === snapshot.packId
      && entry.evidence.sourceSystemId === entry.provenance.sourceSystemId
      && snapshot.trustedSourceSystemIds.includes(entry.evidence.sourceSystemId)
      && entry.evidence.relatedEventIds.includes(snapshot.eventId)
      && provenance.valid;
  });
  return {
    snapshot: clone(snapshot),
    resolver,
    valid: validRegistryIdentity && validEntries
  };
}

function rootRevisionRecord(
  root: OperationalReadinessTrustedRootCatalogEntry,
  pack: OperationalReadinessPack
): OperationalReadinessTrustedRevisionRecord {
  return {
    revision: pack.revision,
    previousContentHash: null,
    contentHash: pack.contentHash,
    previousTriggerFingerprint: null,
    triggerFingerprint: pack.authorityTriggerFingerprint,
    previousAuthorityTopologyFingerprint: null,
    authorityTopologyFingerprint:
      deriveOperationalReadinessAuthorityTopologyFingerprint(pack),
    previousSourceBindingFingerprint: null,
    sourceBindingFingerprint:
      deriveOperationalReadinessSourceBindingFingerprint(pack),
    previousTraceBindingFingerprint: null,
    traceBindingFingerprint:
      deriveOperationalReadinessTraceBindingFingerprint(pack),
    authoringAuthorityId: root.trustRootId,
    actorRef: root.trustRootId,
    reasonAr: 'جذر compiled مسجل خارج الحزمة.',
    at: pack.createdAt,
    timeTrust: 'source-reported',
    changedTriggerFactIds: [],
    sourceTraceIds: [],
    changeSourceTraceIds: [],
    evidenceRefs: [],
    status: 'trusted-root'
  };
}

function createStore(
  root: OperationalReadinessTrustedRootCatalogEntry,
  pack: OperationalReadinessPack
): TrustedStore {
  const rootPack = clone(pack);
  return {
    root: clone(root),
    rootPack,
    revisionsByHash: new Map([
      [
        pack.contentHash,
        {
          pack: rootPack,
          record: rootRevisionRecord(root, rootPack)
        }
      ]
    ]),
    revisionOrder: [pack.contentHash],
    headHash: pack.contentHash,
    evidence: evidenceRuntime(root.evidenceRegistry),
    waiverLedgerInitialized: root.waiverLedgerInitialized,
    waiverHistory: new Map()
  };
}

function sessionObject(): OperationalReadinessTrustSession {
  return Object.freeze(Object.create(null)) as OperationalReadinessTrustSession;
}

function permitObject(): OperationalReadinessRevisionPermit {
  return Object.freeze(Object.create(null)) as OperationalReadinessRevisionPermit;
}

function activeSession(
  session: OperationalReadinessTrustSession | null | undefined
): TrustSessionState | null {
  if (!session) return null;
  const state = sessions.get(session);
  return state?.status === 'active' ? state : null;
}

interface ExactTrustedRevisionOrPermit {
  state: TrustSessionState;
  stored: TrustedRevisionState | null;
  permitState: RevisionPermitState | null;
}

function exactTrustedRevisionOrPermit(
  session: OperationalReadinessTrustSession | null | undefined,
  pack: OperationalReadinessPack,
  permit: OperationalReadinessRevisionPermit | null | undefined,
  allowedModes: readonly RevisionPermitState['mode'][]
): ExactTrustedRevisionOrPermit | null {
  const state = activeSession(session);
  if (
    !state
    || !session
    || !sameScope(state.store, pack)
    || packHash(pack) !== pack.contentHash
  ) {
    return null;
  }
  const stored = state.store.revisionsByHash.get(pack.contentHash) ?? null;
  if (stored && stableSerialize(stored.pack) === stableSerialize(pack)) {
    return { state, stored, permitState: null };
  }
  const permitState = permit ? permits.get(permit) ?? null : null;
  if (
    !permitState
    || permitState.session !== session
    || permitState.consumed
    || !allowedModes.includes(permitState.mode)
    || state.store.headHash !== permitState.previousHash
    || permitState.nextHash !== pack.contentHash
    || permitState.nextRevision !== pack.revision
  ) {
    return null;
  }
  return { state, stored: null, permitState };
}

function sameScope(
  store: TrustedStore,
  pack: Pick<OperationalReadinessPack, 'id' | 'projectId' | 'eventId' | 'venueId'>
): boolean {
  return store.root.packId === pack.id
    && store.root.projectId === pack.projectId
    && store.root.eventId === pack.eventId
    && store.root.venueId === pack.venueId;
}

function tracesResolve(pack: OperationalReadinessPack, traceIds: readonly string[]): boolean {
  if (traceIds.length === 0) return false;
  return traceIds.every((traceId) => {
    const trace = pack.sourceTraces.find((candidate) => candidate.traceId === traceId);
    if (!trace) return false;
    const source = pack.sourceRegistry.find((candidate) =>
      candidate.sourceId === trace.sourceId
      && candidate.sourceRevision === trace.sourceRevision
    );
    return Boolean(source && source.observedSha256 === trace.sourceHash);
  });
}

function isoTimestamp(value: string): number | null {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value
    )
  ) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function changedTriggerFactIds(
  previous: OperationalReadinessPack,
  next: OperationalReadinessPack
): string[] {
  const previousFacts = new Map(
    previous.authorityTriggerFacts.map((fact) => [fact.triggerFactId, fact])
  );
  const nextFacts = new Map(
    next.authorityTriggerFacts.map((fact) => [fact.triggerFactId, fact])
  );
  return [...new Set([...previousFacts.keys(), ...nextFacts.keys()])]
    .filter((factId) =>
      stableSerialize(previousFacts.get(factId))
      !== stableSerialize(nextFacts.get(factId))
    )
    .sort();
}

function trustSensitiveProjection(pack: OperationalReadinessPack) {
  return {
    sourceFingerprint: pack.sourceFingerprint,
    sourceTraceFingerprint: pack.sourceTraceFingerprint,
    sourceRegistry: pack.sourceRegistry,
    sourceTraces: pack.sourceTraces,
    authorityRequirementPolicyId: pack.authorityRequirementPolicyId,
    authorityTriggerPolicyId: pack.authorityTriggerPolicyId,
    authorityTriggerFacts: pack.authorityTriggerFacts,
    authorityTriggerFingerprint: pack.authorityTriggerFingerprint,
    requiredAuthorities: pack.requiredAuthorities,
    authorityMatrix: pack.authorityMatrix,
    governance: pack.governance,
    evidencePolicies: pack.evidencePolicies,
    verificationPolicies: pack.verificationPolicies,
    approvalPolicies: pack.approvalPolicies,
    acceptancePolicies: pack.acceptancePolicies,
    unresolvedConflicts: pack.unresolvedConflicts,
    governanceAssertions: pack.governanceAssertions,
    requirements: pack.requirements.map((requirement) => ({
      id: requirement.id,
      classification: requirement.classification,
      sourceTraces: requirement.sourceTraces,
      category: requirement.category,
      requirementType: requirement.requirementType,
      authorityImpactKinds: requirement.authorityImpactKinds,
      spatialScopeStatus: requirement.spatialScopeStatus,
      relatedRouteIds: requirement.relatedRouteIds,
      evidencePolicyId: requirement.evidencePolicyId,
      verificationPolicyId: requirement.verificationPolicyId,
      approvalPolicyId: requirement.approvalPolicyId,
      acceptancePolicyId: requirement.acceptancePolicyId,
      owner: requirement.owner,
      verifier: requirement.verifier,
      internalApprover: requirement.internalApprover,
      externalAcceptingAuthority: requirement.externalAcceptingAuthority,
      openingAuthorityImpact: requirement.openingAuthorityImpact,
      openingImpact: requirement.openingImpact
    }))
  };
}

function affectingConflict(
  pack: OperationalReadinessPack,
  authority: OperationalReadinessAuthoritySlot,
  actor: OperationalReadinessActorReference
): boolean {
  return pack.unresolvedConflicts.some((conflict) =>
    conflict.resolutionStatus === 'unresolved'
    && (
      conflict.affectedIds.includes(pack.id)
      || conflict.affectedIds.includes(authority.authorityId)
      || conflict.affectedIds.includes(actor.actorRef)
      || conflict.requiredAuthorityKind === authority.authorityKind
    )
  );
}

function canonicalAuthority(
  pack: OperationalReadinessPack,
  command: OperationalReadinessRevisionAuthorityCommand,
  allowedKind: OperationalAuthorityKind
): OperationalReadinessAuthoritySlot | null {
  const authorities = pack.authorityMatrix.filter(
    (authority) => authority.authorityId === command.authorityId
  );
  if (authorities.length !== 1) return null;
  const authority = authorities[0]!;
  const actor = authority.actor;
  if (
    authority.authorityKind !== allowedKind
    || authority.status !== 'assigned'
    || authority.scopeType !== 'pack'
    || authority.scopeId !== pack.id
    || !actor
    || actor.actorRef !== command.actorRef
    || actor.assignmentScope !== pack.id
    || actor.actorType === 'unknown'
    || !['source-backed', 'founder-directed'].includes(authority.classification)
    || !['source-backed', 'founder-directed'].includes(actor.classification)
    || !tracesResolve(pack, authority.sourceTraceIds)
    || !tracesResolve(pack, actor.sourceTraceIds)
    || affectingConflict(pack, authority, actor)
  ) {
    return null;
  }
  const rule = operationalAuthorityRequirementPolicy.rules.find(
    (candidate) => candidate.authorityKind === allowedKind
  );
  const dutyConflict = pack.authorityMatrix.some((other) =>
    other.authorityId !== authority.authorityId
    && other.status === 'assigned'
    && other.actor?.actorRef === actor.actorRef
    && rule?.separationFromAuthorityKinds.includes(other.authorityKind)
  );
  return dutyConflict ? null : authority;
}

function commandIsChronologicallyValid(
  command: OperationalReadinessRevisionAuthorityCommand,
  previous: OperationalReadinessPack
): boolean {
  const commandAt = isoTimestamp(command.at);
  const previousAt = isoTimestamp(
    previous.authoringHistory.at(-1)?.at ?? previous.createdAt
  );
  return commandAt !== null
    && previousAt !== null
    && commandAt >= previousAt
    && command.timeTrust !== 'unknown'
    && command.reasonAr.trim().length > 0;
}

function matchingHistoryEntry(
  next: OperationalReadinessPack,
  previous: OperationalReadinessPack,
  command: OperationalReadinessRevisionAuthorityCommand,
  mode: 'trusted-authoring' | 'freeze' | 'activation'
): boolean {
  const expectedAction = mode === 'trusted-authoring'
    ? 'previewed'
    : mode === 'freeze'
      ? 'frozen'
      : 'activated';
  const entries = next.authoringHistory.filter((entry) =>
    entry.revision === next.revision
    && entry.previousFingerprint === previous.contentHash
    && entry.actorRef === command.actorRef
    && entry.reason.trim() === command.reasonAr.trim()
    && entry.at === command.at
    && entry.action === expectedAction
  );
  return entries.length === 1
    && previous.authoringHistory.every((entry) =>
      next.authoringHistory.some(
        (candidate) => stableSerialize(candidate) === stableSerialize(entry)
      )
    );
}

function waiverKey(
  waiver: Pick<
    OperationalAuthorityWaiverRecord,
    'authorityKind' | 'authorityId' | 'scopeType' | 'scopeId'
  >
): string {
  return [
    waiver.authorityKind,
    waiver.authorityId,
    waiver.scopeType,
    waiver.scopeId
  ].join(':');
}

function packWaivers(pack: OperationalReadinessPack): OperationalAuthorityWaiverRecord[] {
  const byHash = new Map<string, OperationalAuthorityWaiverRecord>();
  pack.requiredAuthorities.forEach((declaration) => {
    const waiver = declaration.notApplicableDeclaration;
    if (waiver) byHash.set(waiver.waiverHash, waiver);
  });
  return [...byHash.values()];
}

function waiverRemovalWouldEraseCustody(
  store: TrustedStore,
  pack: OperationalReadinessPack
): boolean {
  const currentWaivers = packWaivers(pack);
  const currentWaiverHashes = new Set(
    currentWaivers.map((waiver) => waiver.waiverHash)
  );
  return [...store.waiverHistory.values()].some((history) => {
    const head = history.at(-1);
    if (
      !head
      || head.status !== 'active'
      || currentWaiverHashes.has(head.waiverHash)
    ) {
      return false;
    }
    const governedReplacement = currentWaivers.some((waiver) =>
      waiverKey(waiver) === waiverKey(head)
      && waiver.previousWaiverHash === head.waiverHash
      && waiver.revision > head.revision
    );
    return !governedReplacement;
  });
}

function permitFor(
  session: OperationalReadinessTrustSession,
  previous: OperationalReadinessPack,
  next: OperationalReadinessPack,
  mode: RevisionPermitState['mode'],
  command: OperationalReadinessRevisionAuthorityCommand | null
): OperationalReadinessRevisionPermit {
  const permit = permitObject();
  permits.set(permit, {
    session,
    previousHash: previous.contentHash,
    nextHash: next.contentHash,
    nextRevision: next.revision,
    mode,
    command: command ? clone(command) : null,
    changedTriggerFactIds: changedTriggerFactIds(previous, next),
    consumed: false
  });
  return permit;
}

function prepareTrustedRevisionPermit(
  session: OperationalReadinessTrustSession,
  previous: OperationalReadinessPack,
  next: OperationalReadinessPack,
  command: OperationalReadinessRevisionAuthorityCommand,
  mode: 'trusted-authoring' | 'freeze' | 'activation',
  allowedAuthorityKind: OperationalAuthorityKind
): OperationalReadinessRevisionPermit {
  const state = activeSession(session);
  if (!state || !sameScope(state.store, previous) || !sameScope(state.store, next)) {
    throw new Error('OPERATIONAL_TRUST_SESSION_SCOPE_REJECTED');
  }
  const trustedHead = state.store.revisionsByHash.get(state.store.headHash);
  if (
    !trustedHead
    || trustedHead.pack.contentHash !== previous.contentHash
    || stableSerialize(trustedHead.pack) !== stableSerialize(previous)
    || next.revision !== previous.revision + 1
    || next.id !== previous.id
    || next.projectId !== previous.projectId
    || next.eventId !== previous.eventId
    || next.venueId !== previous.venueId
    || packHash(next) !== next.contentHash
    || !commandIsChronologicallyValid(command, previous)
    || !matchingHistoryEntry(next, previous, command, mode)
    || !canonicalAuthority(previous, command, allowedAuthorityKind)
    || !tracesResolve(previous, command.sourceTraceIds)
  ) {
    throw new Error('OPERATIONAL_TRUST_REVISION_COMMAND_REJECTED');
  }
  if (!authorityTopologyTransitionIsGoverned(previous, next)) {
    throw new Error('OPERATIONAL_TRUST_AUTHORITY_TOPOLOGY_REJECTED');
  }
  if (waiverRemovalWouldEraseCustody(state.store, next)) {
    throw new Error('OPERATIONAL_TRUST_WAIVER_CUSTODY_REJECTED');
  }
  const sourceCustodyRejection = operationalReadinessSourceCustodyRejection(
    previous,
    next
  );
  if (sourceCustodyRejection) {
    throw new Error(sourceCustodyRejection);
  }
  const previousTraceIds = new Set(
    previous.sourceTraces.map((trace) => trace.traceId)
  );
  const newTraceIds = next.sourceTraces
    .map((trace) => trace.traceId)
    .filter((traceId) => !previousTraceIds.has(traceId));
  const changeTraceIds = new Set(command.changeSourceTraceIds);
  if (
    (
      command.changeSourceTraceIds.length > 0
      && !tracesResolve(next, command.changeSourceTraceIds)
    )
    || newTraceIds.some((traceId) => !changeTraceIds.has(traceId))
  ) {
    throw new Error('OPERATIONAL_TRUST_SOURCE_CHANGE_TRACE_UNRESOLVED');
  }
  const changedFacts = changedTriggerFactIds(previous, next);
  if (changedFacts.length > 0) {
    const changedFactsTraceable = next.authorityTriggerFacts
      .filter((fact) => changedFacts.includes(fact.triggerFactId))
      .every((fact) =>
        fact.revision === next.revision
        && fact.sourceTraceIds.length > 0
        && fact.sourceTraceIds.every((traceId) => changeTraceIds.has(traceId))
      );
    if (!changedFactsTraceable) {
      throw new Error('OPERATIONAL_TRUST_TRIGGER_SOURCE_REJECTED');
    }
  }
  return permitFor(session, previous, next, mode, command);
}

export function openOperationalReadinessTrustSession(
  pack: OperationalReadinessPack
): OperationalReadinessTrustSession | null {
  const root = findOperationalReadinessTrustedRoot({
    packId: pack.id,
    projectId: pack.projectId,
    eventId: pack.eventId,
    venueId: pack.venueId
  });
  if (!root || !rootMatchesPack(root, pack)) return null;
  const key = trustStoreKey(root);
  let store = stores.get(key);
  if (!store) {
    store = createStore(root, pack);
    stores.set(key, store);
  } else if (
    !rootMatchesPack(store.root, pack)
    || stableSerialize(store.rootPack) !== stableSerialize(pack)
  ) {
    return null;
  }
  const session = sessionObject();
  sessions.set(session, {
    store,
    status: 'active',
    issuedAt: new Date().toISOString()
  });
  return session;
}

export function inspectOperationalReadinessTrustSession(
  session: OperationalReadinessTrustSession | null | undefined,
  pack: OperationalReadinessPack,
  permit?: OperationalReadinessRevisionPermit | null
): OperationalReadinessTrustStatus {
  const known = session ? sessions.get(session) : null;
  if (!known) {
    return {
      valid: false,
      sessionStatus: 'missing',
      trustRootId: null,
      trustPolicyVersion: null,
      revisionStatus: 'untrusted',
      trustedRevisionHead: null,
      trustedContentHead: null,
      evidenceRegistryStatus: 'missing',
      evidenceRegistryFingerprint: null,
      waiverLedgerStatus: 'missing',
      canonicalAuthoringAuthorityKind: null,
      messageAr: 'تعذر إثبات سلسلة الثقة المحلية. التجميد والتفعيل محجوبان.'
    };
  }
  const store = known.store;
  const sessionStatus = known.status;
  const scopeMatches = sameScope(store, pack);
  const exact = exactTrustedRevisionOrPermit(
    session,
    pack,
    permit,
    ['trusted-authoring', 'local-draft', 'freeze', 'activation']
  );
  const stored = exact?.stored ?? null;
  const exactStored = Boolean(stored);
  const permitState = exact?.permitState ?? null;
  const permitMatches = Boolean(permitState);
  const valid = sessionStatus === 'active'
    && scopeMatches
    && (exactStored || permitMatches);
  const revisionStatus = exactStored
    ? stored?.record.status === 'trusted-root'
      ? 'trusted-root'
      : 'trusted-revision'
    : permitMatches
      ? permitState?.mode === 'local-draft'
        ? 'local-draft'
        : 'prospective-revision'
      : 'untrusted';
  return {
    valid,
    sessionStatus: sessionStatus === 'active'
      ? scopeMatches
        ? 'active'
        : 'scope-mismatch'
      : sessionStatus,
    trustRootId: store.root.trustRootId,
    trustPolicyVersion: store.root.trustPolicyVersion,
    revisionStatus,
    trustedRevisionHead:
      store.revisionsByHash.get(store.headHash)?.record.revision ?? null,
    trustedContentHead: store.headHash,
    evidenceRegistryStatus: store.evidence
      ? store.evidence.valid
        ? 'trusted'
        : 'mismatch'
      : 'missing',
    evidenceRegistryFingerprint:
      store.evidence?.snapshot.registryFingerprint ?? null,
    waiverLedgerStatus: store.waiverLedgerInitialized ? 'trusted' : 'missing',
    canonicalAuthoringAuthorityKind: store.root.canonicalAuthoringAuthorityKind,
    messageAr: valid
      ? revisionStatus === 'local-draft'
        ? 'مسودة محلية غير معتمدة في سلسلة الثقة.'
        : 'سلسلة الثقة المحلية مثبتة لهذه المراجعة.'
      : 'تعذر إثبات سلسلة الثقة المحلية. التجميد والتفعيل محجوبان.'
  };
}

export function prepareOperationalReadinessAuthoringRevision(
  session: OperationalReadinessTrustSession,
  previous: OperationalReadinessPack,
  next: OperationalReadinessPack,
  command: OperationalReadinessRevisionAuthorityCommand
): OperationalReadinessRevisionPermit {
  return prepareTrustedRevisionPermit(
    session,
    previous,
    next,
    command,
    'trusted-authoring',
    'requirement-owner'
  );
}

export function prepareOperationalReadinessLocalDraft(
  session: OperationalReadinessTrustSession,
  previous: OperationalReadinessPack,
  next: OperationalReadinessPack
): OperationalReadinessRevisionPermit {
  const state = activeSession(session);
  if (
    !state
    || !sameScope(state.store, previous)
    || !sameScope(state.store, next)
    || state.store.headHash !== previous.contentHash
    || next.revision !== previous.revision + 1
    || packHash(next) !== next.contentHash
    || stableSerialize(trustSensitiveProjection(previous))
      !== stableSerialize(trustSensitiveProjection(next))
  ) {
    throw new Error('OPERATIONAL_TRUST_LOCAL_DRAFT_REJECTED');
  }
  return permitFor(session, previous, next, 'local-draft', null);
}

export function prepareOperationalReadinessFreezeRevision(
  session: OperationalReadinessTrustSession,
  previous: OperationalReadinessPack,
  next: OperationalReadinessPack,
  command: OperationalReadinessRevisionAuthorityCommand
): OperationalReadinessRevisionPermit {
  return prepareTrustedRevisionPermit(
    session,
    previous,
    next,
    command,
    'freeze',
    'requirement-owner'
  );
}

export function prepareOperationalReadinessActivationRevision(
  session: OperationalReadinessTrustSession,
  previous: OperationalReadinessPack,
  next: OperationalReadinessPack,
  command: OperationalReadinessRevisionAuthorityCommand
): OperationalReadinessRevisionPermit {
  return prepareTrustedRevisionPermit(
    session,
    previous,
    next,
    command,
    'activation',
    'readiness-pack-activation'
  );
}

export function discardOperationalReadinessRevisionPermit(
  session: OperationalReadinessTrustSession,
  permit: OperationalReadinessRevisionPermit
): void {
  const permitState = permits.get(permit);
  if (
    !permitState
    || permitState.session !== session
    || permitState.consumed
  ) {
    throw new Error('OPERATIONAL_TRUST_PERMIT_DISCARD_REJECTED');
  }
  permitState.consumed = true;
}

export function resolveOperationalReadinessTrustedEvidence(
  session: OperationalReadinessTrustSession | null | undefined,
  pack: OperationalReadinessPack,
  request: OperationalReadinessTrustedEvidenceRequest,
  permit?: OperationalReadinessRevisionPermit | null
): OperationalReadinessTrustedEvidenceResolution {
  const exact = exactTrustedRevisionOrPermit(
    session,
    pack,
    permit,
    ['trusted-authoring', 'freeze', 'activation']
  );
  const state = exact?.state ?? null;
  if (!state || !state.store.evidence?.valid) {
    return {
      valid: false,
      evidence: [],
      registryFingerprint:
        state?.store.evidence?.snapshot.registryFingerprint ?? null,
      validatedAt: null,
      authoritativeTimeAvailable: false,
      issues: ['trusted-evidence-registry-unavailable']
    };
  }
  const runtime = state.store.evidence;
  const first = request.evidenceRefs
    .map((evidenceId) => runtime.resolver.get(evidenceId))
    .find(Boolean);
  const stateContext = first?.stateContext ?? 'temporary-demo';
  const resolution: EvidenceResolutionResult = runtime.resolver.resolve({
    evidenceRefs: request.evidenceRefs,
    targetEntityId: null,
    stateContext,
    requireVerified: true,
    relatedEventId: pack.eventId
  });
  const evidenceMatches = resolution.evidence.length
    === new Set(request.evidenceRefs).size
    && resolution.evidence.every((evidenceItem) => {
      const entry = runtime.snapshot.evidence.find(
        (candidate) => candidate.evidence.evidenceId === evidenceItem.evidenceId
      );
      return Boolean(
        entry
        && runtime.snapshot.trustedSourceSystemIds.includes(
          evidenceItem.sourceSystemId
        )
        && request.acceptedEvidenceTypes.includes(evidenceItem.evidenceType)
        && evidenceItem.metadata.readinessPackId === pack.id
        && evidenceItem.metadata.authorityKind === request.authorityKind
        && evidenceItem.metadata.authorityId === request.authorityId
        && evidenceItem.metadata.resolverAuthorityId
          === request.resolverAuthorityId
        && entry.identityBinding.subjectActorRef === request.subjectActorRef
        && entry.identityBinding.authorityId === request.subjectAuthorityId
        && entry.identityBinding.authorityKind === request.subjectAuthorityKind
        && entry.identityBinding.authorityAssignmentFingerprint
          === request.authorityAssignmentFingerprint
        && entry.identityBinding.eventId === pack.eventId
        && entry.identityBinding.packId === pack.id
      );
    });
  return {
    valid: resolution.valid && evidenceMatches,
    evidence: resolution.evidence,
    registryFingerprint: runtime.snapshot.registryFingerprint,
    validatedAt: state.issuedAt,
    authoritativeTimeAvailable: false,
    issues: [
      ...resolution.issues.map((issue) => issue.code),
      ...(evidenceMatches ? [] : ['trusted-evidence-metadata-mismatch'])
    ]
  };
}

export function inspectOperationalReadinessWaiverLedger(
  session: OperationalReadinessTrustSession | null | undefined,
  pack: OperationalReadinessPack,
  waiver: Pick<
    OperationalAuthorityWaiverRecord,
    'authorityKind' | 'authorityId' | 'scopeType' | 'scopeId'
  >,
  permit?: OperationalReadinessRevisionPermit | null
): OperationalReadinessWaiverLedgerInspection {
  const exact = exactTrustedRevisionOrPermit(
    session,
    pack,
    permit,
    ['trusted-authoring', 'freeze', 'activation']
  );
  const state = exact?.state ?? null;
  if (
    !state
    || !state.store.waiverLedgerInitialized
  ) {
    return { available: false, head: null, history: [] };
  }
  const history = state.store.waiverHistory.get(waiverKey(waiver)) ?? [];
  return {
    available: true,
    head: history.length ? clone(history.at(-1)!) : null,
    history: clone(history)
  };
}

function deriveWaiverHistory(
  store: TrustedStore,
  pack: OperationalReadinessPack
): Map<string, OperationalReadinessTrustedWaiverLedgerEntry[]> {
  const nextHistory = new Map(
    [...store.waiverHistory].map(([key, history]) => [key, clone(history)])
  );
  for (const waiver of packWaivers(pack)) {
    if (
      !store.waiverLedgerInitialized
      || !store.evidence?.valid
      || waiver.evidenceRegistryFingerprint
        !== store.evidence.snapshot.registryFingerprint
    ) {
      throw new Error('OPERATIONAL_TRUST_WAIVER_CUSTODY_REJECTED');
    }
    const key = waiverKey(waiver);
    const history = nextHistory.get(key) ?? [];
    const head = history.at(-1) ?? null;
    if (head?.waiverHash === waiver.waiverHash) continue;
    if (
      (head && waiver.previousWaiverHash !== head.waiverHash)
      || (!head && waiver.previousWaiverHash !== null)
      || (head && waiver.revision <= head.revision)
    ) {
      throw new Error('OPERATIONAL_TRUST_WAIVER_FORK_REJECTED');
    }
    if (head) head.status = 'superseded';
    history.push({
      packId: pack.id,
      authorityKind: waiver.authorityKind,
      authorityId: waiver.authorityId,
      scopeType: waiver.scopeType,
      scopeId: waiver.scopeId,
      waiverHash: waiver.waiverHash,
      previousWaiverHash: waiver.previousWaiverHash,
      revision: waiver.revision,
      declaredAt: waiver.declaredAt,
      resolverAuthorityId: waiver.resolverAuthorityId,
      evidenceRegistryFingerprint: waiver.evidenceRegistryFingerprint,
      status: 'active'
    });
    nextHistory.set(key, history);
  }
  return nextHistory;
}

export function acceptOperationalReadinessRevision(
  session: OperationalReadinessTrustSession,
  permit: OperationalReadinessRevisionPermit,
  next: OperationalReadinessPack,
  status: OperationalReadinessTrustedRevisionRecord['status']
): void {
  const exact = exactTrustedRevisionOrPermit(
    session,
    next,
    permit,
    ['trusted-authoring', 'freeze', 'activation']
  );
  const state = exact?.state ?? null;
  const permitState = exact?.permitState ?? null;
  const expectedStatus = permitState?.mode === 'trusted-authoring'
    ? 'trusted-candidate'
    : permitState?.mode === 'freeze'
      ? 'frozen-candidate'
      : permitState?.mode === 'activation'
        ? 'activated-baseline'
        : null;
  if (
    !state
    || !permitState
    || permitState.mode === 'local-draft'
    || status !== expectedStatus
    || (
      permitState.mode === 'trusted-authoring'
      && next.packStatus !== 'candidate'
      && next.packStatus !== 'review'
    )
    || (
      permitState.mode === 'freeze'
      && next.packStatus !== 'frozen-candidate'
    )
    || (
      permitState.mode === 'activation'
      && next.packStatus !== 'activated-baseline'
    )
    || !validateOperationalReadinessPack(next, {
      trustSession: session,
      revisionPermit: permit
    }).valid
  ) {
    throw new Error('OPERATIONAL_TRUST_REVISION_ACCEPTANCE_REJECTED');
  }
  const nextWaiverHistory = deriveWaiverHistory(state.store, next);
  const previous = state.store.revisionsByHash.get(
    permitState.previousHash
  )!.pack;
  const command = permitState.command!;
  const record: OperationalReadinessTrustedRevisionRecord = {
    revision: next.revision,
    previousContentHash: previous.contentHash,
    contentHash: next.contentHash,
    previousTriggerFingerprint: previous.authorityTriggerFingerprint,
    triggerFingerprint: next.authorityTriggerFingerprint,
    previousAuthorityTopologyFingerprint:
      deriveOperationalReadinessAuthorityTopologyFingerprint(previous),
    authorityTopologyFingerprint:
      deriveOperationalReadinessAuthorityTopologyFingerprint(next),
    previousSourceBindingFingerprint:
      deriveOperationalReadinessSourceBindingFingerprint(previous),
    sourceBindingFingerprint:
      deriveOperationalReadinessSourceBindingFingerprint(next),
    previousTraceBindingFingerprint:
      deriveOperationalReadinessTraceBindingFingerprint(previous),
    traceBindingFingerprint:
      deriveOperationalReadinessTraceBindingFingerprint(next),
    authoringAuthorityId: command.authorityId,
    actorRef: command.actorRef,
    reasonAr: command.reasonAr,
    at: command.at,
    timeTrust: command.timeTrust,
    changedTriggerFactIds: [...permitState.changedTriggerFactIds],
    sourceTraceIds: [...command.sourceTraceIds],
    changeSourceTraceIds: [...command.changeSourceTraceIds],
    evidenceRefs: [...command.evidenceRefs],
    status
  };
  state.store.revisionsByHash.set(next.contentHash, {
    pack: clone(next),
    record
  });
  state.store.revisionOrder.push(next.contentHash);
  state.store.headHash = next.contentHash;
  state.store.waiverHistory = nextWaiverHistory;
  permitState.consumed = true;
}

export function isOperationalReadinessRevisionTrusted(
  session: OperationalReadinessTrustSession,
  pack: OperationalReadinessPack
): boolean {
  return inspectOperationalReadinessTrustSession(session, pack).valid;
}

export function listOperationalReadinessTrustedRevisions(
  session: OperationalReadinessTrustSession,
  pack: Pick<OperationalReadinessPack, 'id' | 'projectId' | 'eventId' | 'venueId'>
): OperationalReadinessTrustedRevisionRecord[] {
  const state = activeSession(session);
  if (!state || !sameScope(state.store, pack)) return [];
  return state.store.revisionOrder.map(
    (contentHash) => clone(state.store.revisionsByHash.get(contentHash)!.record)
  );
}

export function supersedeOperationalReadinessTrustSession(
  session: OperationalReadinessTrustSession
): void {
  const state = sessions.get(session);
  if (state) state.status = 'superseded';
}

export function expireOperationalReadinessTrustSession(
  session: OperationalReadinessTrustSession
): void {
  const state = sessions.get(session);
  if (state) state.status = 'expired';
}

export function resetOperationalReadinessSyntheticTrustForTests(): void {
  if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
    throw new Error('OPERATIONAL_TRUST_TEST_RESET_FORBIDDEN');
  }
  stores.delete(
    'PROJECT-SYNTHETIC-ELIGIBLE:READINESS-PACK-SYNTHETIC-ELIGIBLE-v1'
  );
}

export function corruptOperationalReadinessEvidenceCustodyForTests(
  session: OperationalReadinessTrustSession
): void {
  if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
    throw new Error('OPERATIONAL_TRUST_TEST_FAULT_FORBIDDEN');
  }
  const state = sessions.get(session);
  if (state?.store.evidence) state.store.evidence.valid = false;
}

export function removeOperationalReadinessWaiverLedgerForTests(
  session: OperationalReadinessTrustSession
): void {
  if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
    throw new Error('OPERATIONAL_TRUST_TEST_FAULT_FORBIDDEN');
  }
  const state = sessions.get(session);
  if (state) state.store.waiverLedgerInitialized = false;
}
