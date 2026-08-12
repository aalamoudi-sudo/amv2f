import {
  evidenceSchemaVersion,
  type CanonicalEvidenceReference,
  type ProvenanceBundle
} from '../types/integration';
import type {
  OperationalReadinessTrustedEvidenceEntry,
  OperationalReadinessTrustedEvidenceRegistrySnapshot,
  OperationalReadinessTrustedRootCatalogEntry
} from '../types/operationalReadinessTrust';
import type { OperationalAuthorityKind } from '../types/operationalReadinessPack';
import { sha256PayloadSync } from '../services/integrationHash';

const syntheticPackId = 'READINESS-PACK-SYNTHETIC-ELIGIBLE-v1';
const syntheticProjectId = 'PROJECT-SYNTHETIC-ELIGIBLE';
const syntheticEventId = 'EVENT-SYNTHETIC-ELIGIBLE';
const syntheticVenueId = 'VENUE-SYNTHETIC-ELIGIBLE';
const syntheticSourceSystemId = 'SOURCE-SYNTHETIC-AUTHORITY-LAB';

function evidence(input: {
  evidenceId: string;
  evidenceType: CanonicalEvidenceReference['evidenceType'];
  capturedBy: string;
  authorityKind: string;
  authorityId: string;
  resolverAuthorityId: string;
  sha256: string;
}): CanonicalEvidenceReference {
  return {
    schemaVersion: evidenceSchemaVersion,
    evidenceId: input.evidenceId,
    stateContext: 'temporary-demo',
    evidenceType: input.evidenceType,
    uri: `local-reference://synthetic-trust/${input.evidenceId.toLowerCase()}.json`,
    fileName: `${input.evidenceId.toLowerCase()}.json`,
    mimeType: 'application/json',
    sha256: input.sha256,
    capturedAt: '2026-07-29T18:10:00+03:00',
    capturedBy: input.capturedBy,
    sourceSystemId: syntheticSourceSystemId,
    relatedEntityIds: [],
    relatedEventIds: [syntheticEventId],
    relatedRequirementIds: [],
    relatedActionIds: [],
    spatialReference: null,
    instructionId: null,
    instructionVersion: null,
    retentionClass: 'temporary-validation',
    sensitivityClass: 'internal',
    verificationStatus: 'verified',
    supersededByEvidenceId: null,
    metadata: {
      readinessPackId: syntheticPackId,
      authorityKind: input.authorityKind,
      authorityId: input.authorityId,
      resolverAuthorityId: input.resolverAuthorityId,
      fixture: true,
      binaryStored: false,
      identityBoundary: 'local-test-only'
    }
  };
}

function provenance(
  evidenceRecord: CanonicalEvidenceReference,
  suffix: string
): OperationalReadinessTrustedEvidenceEntry['provenance'] {
  const sourceNodeId = `PROV-SOURCE-${suffix}`;
  const activityNodeId = `PROV-ACTIVITY-${suffix}`;
  const eventNodeId = `PROV-EVENT-${suffix}`;
  const agentNodeId = `PROV-AGENT-${suffix}`;
  const adapterId = 'ADAPTER-SYNTHETIC-TRUST-REGISTRY';
  const adapterVersion = '1.0.0';
  const eventId = `OPERATIONAL-EVENT-SYNTHETIC-${suffix}`;
  const bundle: ProvenanceBundle = {
    bundleId: `PROVENANCE-SYNTHETIC-TRUST-${suffix}`,
    stateContext: 'temporary-demo',
    nodes: [
      {
        provenanceId: sourceNodeId,
        nodeType: 'entity',
        label: 'Synthetic evidence source record',
        type: 'source-record',
        attributes: {
          sourceRecordId: evidenceRecord.evidenceId,
          sourceSystemId: syntheticSourceSystemId
        }
      },
      {
        provenanceId: activityNodeId,
        nodeType: 'activity',
        label: 'Synthetic evidence normalization',
        type: 'adapter-normalization',
        attributes: { adapterId, adapterVersion }
      },
      {
        provenanceId: eventNodeId,
        nodeType: 'entity',
        label: 'Synthetic evidence custody event',
        type: 'operational-event',
        attributes: { eventId }
      },
      {
        provenanceId: agentNodeId,
        nodeType: 'agent',
        label: 'Synthetic local evidence registry',
        type: 'local-test-registry',
        attributes: { sourceSystemId: syntheticSourceSystemId }
      }
    ],
    relations: [
      {
        relationId: `PROV-REL-USED-${suffix}`,
        relationType: 'used',
        fromId: activityNodeId,
        toId: sourceNodeId,
        role: 'source-record'
      },
      {
        relationId: `PROV-REL-GENERATED-${suffix}`,
        relationType: 'wasGeneratedBy',
        fromId: eventNodeId,
        toId: activityNodeId,
        role: 'normalization'
      },
      {
        relationId: `PROV-REL-AGENT-${suffix}`,
        relationType: 'wasAssociatedWith',
        fromId: activityNodeId,
        toId: agentNodeId,
        role: 'local-test-registry'
      },
      {
        relationId: `PROV-REL-PRIMARY-${suffix}`,
        relationType: 'hadPrimarySource',
        fromId: eventNodeId,
        toId: sourceNodeId,
        role: 'primary-source'
      }
    ],
    unknownFields: ['productionIdentity', 'authoritativeDeviceTime']
  };
  return {
    bundle,
    bundleFingerprint: sha256PayloadSync(bundle),
    eventId,
    sourceRecordId: evidenceRecord.evidenceId,
    sourceSystemId: syntheticSourceSystemId,
    adapterId,
    adapterVersion
  };
}

function evidenceEntry(
  evidenceRecord: CanonicalEvidenceReference,
  suffix: string,
  identity: {
    subjectActorRef: string;
    authorityId: string;
    authorityKind: OperationalAuthorityKind;
    authorityAssignmentFingerprint: string;
  }
): OperationalReadinessTrustedEvidenceEntry {
  const trustedProvenance = provenance(evidenceRecord, suffix);
  return {
    evidence: evidenceRecord,
    evidenceFingerprint: sha256PayloadSync(evidenceRecord),
    provenance: trustedProvenance,
    identityBinding: {
      ...identity,
      eventId: syntheticEventId,
      packId: syntheticPackId,
      trustedProvenanceFingerprint: trustedProvenance.bundleFingerprint
    }
  };
}

function registryFingerprintPayload(
  registry: Omit<
    OperationalReadinessTrustedEvidenceRegistrySnapshot,
    'registryFingerprint' | 'currentHead'
  >
) {
  return {
    ...registry,
    trustedSourceSystemIds: [...registry.trustedSourceSystemIds].sort(),
    evidence: [...registry.evidence]
      .sort((left, right) =>
        left.evidence.evidenceId.localeCompare(right.evidence.evidenceId)
      )
  };
}

const waiverEvidence = evidence({
  evidenceId: 'EVIDENCE-SYNTHETIC-WAIVER-001',
  evidenceType: 'external-record',
  capturedBy: 'ROLE-SYNTHETIC-1',
  authorityKind: 'engineering-authority',
  authorityId: 'AUTH-SYNTHETIC-ENGINEERING',
  resolverAuthorityId: 'AUTH-SYNTHETIC-DENOMINATOR',
  sha256: '6'.repeat(64)
});

const activationEvidence = evidence({
  evidenceId: 'EVIDENCE-SYNTHETIC-ACTIVATION-001',
  evidenceType: 'signature',
  capturedBy: 'ROLE-SYNTHETIC-9',
  authorityKind: 'readiness-pack-activation',
  authorityId: 'AUTH-SYNTHETIC-ACTIVATION',
  resolverAuthorityId: 'AUTH-SYNTHETIC-ACTIVATION',
  sha256: '7'.repeat(64)
});

const syntheticRegistryBase = {
  registryId: 'EVIDENCE-REGISTRY-SYNTHETIC-TRUST-v1',
  registryVersion: 1,
  projectId: syntheticProjectId,
  eventId: syntheticEventId,
  packId: syntheticPackId,
  trustedSourceSystemIds: [syntheticSourceSystemId],
  evidence: [
    evidenceEntry(waiverEvidence, 'WAIVER-001', {
      subjectActorRef: 'ROLE-SYNTHETIC-1',
      authorityId: 'AUTH-SYNTHETIC-DENOMINATOR',
      authorityKind: 'requirement-owner',
      authorityAssignmentFingerprint:
        'a843a5a27aeccfbbbd45682f2670263fdf8cb9ad8c8fc90b1bd17da55be785ce'
    }),
    evidenceEntry(activationEvidence, 'ACTIVATION-001', {
      subjectActorRef: 'ROLE-SYNTHETIC-9',
      authorityId: 'AUTH-SYNTHETIC-ACTIVATION',
      authorityKind: 'readiness-pack-activation',
      authorityAssignmentFingerprint:
        '742f5a4a073b5eab2e6b1d4330bf22bd5ff76602a221faae022e8104c41f9cc4'
    })
  ]
} satisfies Omit<
  OperationalReadinessTrustedEvidenceRegistrySnapshot,
  'registryFingerprint' | 'currentHead'
>;

const syntheticRegistryFingerprint = sha256PayloadSync(
  registryFingerprintPayload(syntheticRegistryBase)
);

const syntheticEvidenceRegistry: OperationalReadinessTrustedEvidenceRegistrySnapshot = {
  ...syntheticRegistryBase,
  registryFingerprint: syntheticRegistryFingerprint,
  currentHead: syntheticRegistryFingerprint
};

const trustedRoots: readonly OperationalReadinessTrustedRootCatalogEntry[] = [
  {
    trustRootId: 'READINESS-TRUST-ROOT-KAP-R1',
    trustPolicyVersion: 'OPERATIONAL-READINESS-TRUST-POLICY-v1',
    packId: 'READINESS-PACK-KAP-OPERATIONAL-CANDIDATE-2026-v1',
    projectId: 'PROJECT-KAP-OPENING-2026',
    eventId: 'EVENT-KAP-OPENING-2026',
    venueId: 'VENUE-KAP-001',
    expectedRevision: 1,
    expectedContentHash:
      '78de9ad4e49781cf24e0fac51e5834cb99dd47e9daf07fd13d8bea1856b35ccc',
    expectedTriggerFingerprint:
      '49c4ff2a7b75b236f549e68e5e5f73934589e03b917edb2404694d409562d937',
    expectedSourceFingerprint:
      '9bc85024e3d1d8707518582607d1200560e4d64d0d5ef4902f01d971c6301f97',
    expectedSourceTraceFingerprint:
      '900cd8a205b170e4893fb2a938a98628925a504dfb13b20ee045131b3f7d5530',
    expectedAuthorityTopologyFingerprint:
      '05b4e630dc9244077846e2e678593a62da9dbe2cff9cbde5e14bbe7faaa9f4fe',
    expectedSourceBindingFingerprint:
      '8dbb1f82f7deb7d39649a026046ba952579828bd8ca35caf9d47dcbac360207a',
    expectedTraceBindingFingerprint:
      '7bad19ec1d03d7280ccdc9f4b425bfde61c6538fe6ecc8ff2ab4c1a6014d9ad8',
    canonicalAuthoringAuthorityKind: 'requirement-owner',
    waiverLedgerInitialized: true,
    evidenceRegistry: null
  },
  {
    trustRootId: 'READINESS-TRUST-ROOT-SYNTHETIC-R1',
    trustPolicyVersion: 'OPERATIONAL-READINESS-TRUST-POLICY-v1',
    packId: syntheticPackId,
    projectId: syntheticProjectId,
    eventId: syntheticEventId,
    venueId: syntheticVenueId,
    expectedRevision: 1,
    expectedContentHash:
      'c26c3afbe01c4e71fd2e7f568277bdd7089224b15993657ba578a85ae63ad7cf',
    expectedTriggerFingerprint:
      'd1be3319d1773408d8822f1b7cbcb5448d56152f1107ac8d2a666ebbf340e499',
    expectedSourceFingerprint:
      '2f08cfc28640e060e85b9a008ba1bb5a58ca9137a920ab640951b0e94f34e95d',
    expectedSourceTraceFingerprint:
      '61bd0c95878e0e867bf1fd484d6d56173f4745dd9dd9cc01769389c1a7538a76',
    expectedAuthorityTopologyFingerprint:
      '8fdb8ea90fab3b624cc6f2b2e8b6633d220f3ee7fb8c355f64c0e3f33366a7ec',
    expectedSourceBindingFingerprint:
      '08483bec9eea2a6b8411239cf0fa6d62428c814f52fe3d8950bd7663a3e2e768',
    expectedTraceBindingFingerprint:
      '8711a46b30bd41ec15b33daca0cfa0d11df7d798f3059e8d4c01aba39ec60a4f',
    canonicalAuthoringAuthorityKind: 'requirement-owner',
    waiverLedgerInitialized: true,
    evidenceRegistry: syntheticEvidenceRegistry
  },
  {
    trustRootId: 'READINESS-TRUST-ROOT-CONFERENCE-ALPHA-R1',
    trustPolicyVersion: 'OPERATIONAL-READINESS-TRUST-POLICY-v1',
    packId: 'READINESS-PACK-CONFERENCE-ALPHA-FICTIONAL-v1',
    projectId: 'PROJECT-CONFERENCE-ALPHA-FICTIONAL',
    eventId: 'EVENT-CONFERENCE-ALPHA-FICTIONAL',
    venueId: 'VENUE-CONFERENCE-ALPHA-FICTIONAL',
    expectedRevision: 1,
    expectedContentHash:
      '7e20a205c76815976b7fbc8f991b5b3384206578ad1721cf19e1c711037e6024',
    expectedTriggerFingerprint:
      'f62e81e324b4b54ca715b4e4f850505ec5ce5b86d61cd07a23444c28d968a7ff',
    expectedSourceFingerprint:
      'd5060c928b5e04a71d0b6bb10a30d26d9dc0200778c284c373ce8c695d6e696c',
    expectedSourceTraceFingerprint:
      '6ec6db9958ea202e5828bd9e1c7dfb9f66b2647be16b07f12b6451c5eab3860f',
    expectedAuthorityTopologyFingerprint:
      '3d086c692629a91b485a776083ea2d5fc81885068195858d84fa56b2b014508e',
    expectedSourceBindingFingerprint:
      '6023412a4ea7982568c4cd9d66be75f80003131583924b342577f75b6337e0cf',
    expectedTraceBindingFingerprint:
      '4a082de3cc94812c047a0295208273d40f45063af10f765153de53b091b8c955',
    canonicalAuthoringAuthorityKind: 'requirement-owner',
    waiverLedgerInitialized: true,
    evidenceRegistry: null
  }
];

export function findOperationalReadinessTrustedRoot(input: {
  packId: string;
  projectId: string;
  eventId: string;
  venueId: string;
}): OperationalReadinessTrustedRootCatalogEntry | null {
  const root = trustedRoots.find((candidate) =>
    candidate.packId === input.packId
    && candidate.projectId === input.projectId
    && candidate.eventId === input.eventId
    && candidate.venueId === input.venueId
  );
  return root ? structuredClone(root) : null;
}

export function trustedEvidenceRegistryFingerprint(
  registry: OperationalReadinessTrustedEvidenceRegistrySnapshot
): string {
  const {
    registryFingerprint,
    currentHead,
    ...base
  } = registry;
  void registryFingerprint;
  void currentHead;
  return sha256PayloadSync(registryFingerprintPayload(base));
}
