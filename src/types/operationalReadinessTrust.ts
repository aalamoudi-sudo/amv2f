import type {
  CanonicalEvidenceReference,
  ProvenanceBundle
} from './integration';
import type {
  OperationalAuthorityKind,
  OperationalAuthorityWaiverRecord,
  OperationalAuthorityWaiverTimeTrust,
  OperationalReadinessPack
} from './operationalReadinessPack';

declare const operationalReadinessTrustSessionBrand: unique symbol;
declare const operationalReadinessRevisionPermitBrand: unique symbol;

export interface OperationalReadinessTrustSession {
  readonly [operationalReadinessTrustSessionBrand]: true;
}

export interface OperationalReadinessRevisionPermit {
  readonly [operationalReadinessRevisionPermitBrand]: true;
}

export type OperationalReadinessTrustPolicyVersion =
  'OPERATIONAL-READINESS-TRUST-POLICY-v1';

export interface OperationalReadinessTrustedEvidenceProvenance {
  bundle: ProvenanceBundle;
  bundleFingerprint: string;
  eventId: string;
  sourceRecordId: string;
  sourceSystemId: string;
  adapterId: string;
  adapterVersion: string;
}

export interface OperationalReadinessTrustedEvidenceEntry {
  evidence: CanonicalEvidenceReference;
  evidenceFingerprint: string;
  provenance: OperationalReadinessTrustedEvidenceProvenance;
  identityBinding: {
    subjectActorRef: string;
    authorityId: string;
    authorityKind: OperationalAuthorityKind;
    authorityAssignmentFingerprint: string;
    eventId: string;
    packId: string;
    trustedProvenanceFingerprint: string;
  };
}

export interface OperationalReadinessTrustedEvidenceRegistrySnapshot {
  registryId: string;
  registryVersion: number;
  registryFingerprint: string;
  projectId: string;
  eventId: string;
  packId: string;
  currentHead: string;
  trustedSourceSystemIds: string[];
  evidence: OperationalReadinessTrustedEvidenceEntry[];
}

export interface OperationalReadinessTrustedRootCatalogEntry {
  trustRootId: string;
  trustPolicyVersion: OperationalReadinessTrustPolicyVersion;
  packId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  expectedRevision: number;
  expectedContentHash: string;
  expectedTriggerFingerprint: string;
  expectedSourceFingerprint: string;
  expectedSourceTraceFingerprint: string;
  expectedAuthorityTopologyFingerprint: string;
  expectedSourceBindingFingerprint: string;
  expectedTraceBindingFingerprint: string;
  canonicalAuthoringAuthorityKind: 'requirement-owner';
  waiverLedgerInitialized: boolean;
  evidenceRegistry: OperationalReadinessTrustedEvidenceRegistrySnapshot | null;
}

export interface OperationalReadinessRevisionAuthorityCommand {
  authorityId: string;
  actorRef: string;
  reasonAr: string;
  at: string;
  timeTrust: OperationalAuthorityWaiverTimeTrust;
  sourceTraceIds: string[];
  changeSourceTraceIds: string[];
  evidenceRefs: string[];
}

export interface OperationalReadinessTrustedRevisionRecord {
  revision: number;
  previousContentHash: string | null;
  contentHash: string;
  previousTriggerFingerprint: string | null;
  triggerFingerprint: string;
  previousAuthorityTopologyFingerprint: string | null;
  authorityTopologyFingerprint: string;
  previousSourceBindingFingerprint: string | null;
  sourceBindingFingerprint: string;
  previousTraceBindingFingerprint: string | null;
  traceBindingFingerprint: string;
  authoringAuthorityId: string;
  actorRef: string;
  reasonAr: string;
  at: string;
  timeTrust: OperationalAuthorityWaiverTimeTrust;
  changedTriggerFactIds: string[];
  sourceTraceIds: string[];
  changeSourceTraceIds: string[];
  evidenceRefs: string[];
  status: 'trusted-root' | 'trusted-candidate' | 'frozen-candidate' | 'activated-baseline';
}

export interface OperationalReadinessTrustedWaiverLedgerEntry {
  packId: string;
  authorityKind: OperationalAuthorityKind;
  authorityId: string;
  scopeType: OperationalAuthorityWaiverRecord['scopeType'];
  scopeId: string;
  waiverHash: string;
  previousWaiverHash: string | null;
  revision: number;
  declaredAt: string;
  resolverAuthorityId: string;
  evidenceRegistryFingerprint: string;
  status: 'active' | 'superseded' | 'revoked';
}

export interface OperationalReadinessTrustStatus {
  valid: boolean;
  sessionStatus: 'active' | 'expired' | 'superseded' | 'missing' | 'scope-mismatch';
  trustRootId: string | null;
  trustPolicyVersion: OperationalReadinessTrustPolicyVersion | null;
  revisionStatus:
    | 'trusted-root'
    | 'trusted-revision'
    | 'prospective-revision'
    | 'local-draft'
    | 'untrusted';
  trustedRevisionHead: number | null;
  trustedContentHead: string | null;
  evidenceRegistryStatus: 'trusted' | 'missing' | 'mismatch';
  evidenceRegistryFingerprint: string | null;
  waiverLedgerStatus: 'trusted' | 'missing';
  canonicalAuthoringAuthorityKind: 'requirement-owner' | null;
  messageAr: string;
}

export interface OperationalReadinessTrustedPackLoad {
  pack: OperationalReadinessPack;
  trustSession: OperationalReadinessTrustSession;
}
