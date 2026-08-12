import kapCandidateManifestUrl from '../../pilot-input/manifests/kap-operational-readiness-pack-candidate-v1.json?url';
import {
  immutableOperationalReadinessClone,
  validateOperationalReadinessPack,
  verifyOperationalReadinessPackHash
} from '../services/operationalReadinessPack';
import {
  openOperationalReadinessTrustSession
} from '../services/operationalReadinessTrustGateway';
import type {
  OperationalReadinessPack,
  ReadinessPackSourceClassification
} from '../types/operationalReadinessPack';
import type {
  OperationalReadinessTrustedPackLoad
} from '../types/operationalReadinessTrust';

export const kapOperationalReadinessPackCandidateId =
  'READINESS-PACK-KAP-OPERATIONAL-CANDIDATE-2026-v1';

interface OperationalReadinessPackCatalogEntry {
  packId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  manifestUrl: string;
  expectedContentHash: string;
  expectedSourceFingerprint: string;
  expectedSourceTraceFingerprint: string;
  expectedRevision: number;
  expectedTriggerFingerprint: string;
}

const operationalReadinessPackCatalog: readonly OperationalReadinessPackCatalogEntry[] = [
  {
    packId: kapOperationalReadinessPackCandidateId,
    projectId: 'PROJECT-KAP-OPENING-2026',
    eventId: 'EVENT-KAP-OPENING-2026',
    venueId: 'VENUE-KAP-001',
    manifestUrl: kapCandidateManifestUrl,
    expectedContentHash: '78de9ad4e49781cf24e0fac51e5834cb99dd47e9daf07fd13d8bea1856b35ccc',
    expectedSourceFingerprint: '9bc85024e3d1d8707518582607d1200560e4d64d0d5ef4902f01d971c6301f97',
    expectedSourceTraceFingerprint: '900cd8a205b170e4893fb2a938a98628925a504dfb13b20ee045131b3f7d5530',
    expectedRevision: 1,
    expectedTriggerFingerprint: '49c4ff2a7b75b236f549e68e5e5f73934589e03b917edb2404694d409562d937'
  }
];

export async function loadOperationalReadinessPackForScope(
  scope: {
    projectId: string;
    eventId: string;
    venueId: string;
  },
  signal?: AbortSignal
): Promise<OperationalReadinessTrustedPackLoad | null> {
  const entry = operationalReadinessPackCatalog.find((candidate) =>
    candidate.projectId === scope.projectId
    && candidate.eventId === scope.eventId
    && candidate.venueId === scope.venueId
  );
  if (!entry) return null;

  const response = await fetch(entry.manifestUrl, {
    credentials: 'same-origin',
    signal
  });
  if (!response.ok) {
    throw new Error(`OPERATIONAL_READINESS_PACK_FETCH_FAILED:${response.status}`);
  }
  const pack = await response.json() as OperationalReadinessPack;
  const trustSession = openOperationalReadinessTrustSession(pack);
  const validation = validateOperationalReadinessPack(pack, {
    trustSession: trustSession ?? undefined
  });
  if (
    pack.id !== entry.packId
    || pack.contentHash !== entry.expectedContentHash
    || pack.sourceFingerprint !== entry.expectedSourceFingerprint
    || pack.sourceTraceFingerprint !== entry.expectedSourceTraceFingerprint
    || pack.revision !== entry.expectedRevision
    || pack.authorityTriggerFingerprint !== entry.expectedTriggerFingerprint
    || !verifyOperationalReadinessPackHash(pack)
    || !trustSession
    || !validation.valid
  ) {
    throw new Error(
      `OPERATIONAL_READINESS_PACK_INVALID:${validation.issues.map((issue) => issue.code).join(',')}`
    );
  }
  if (
    pack.projectId !== scope.projectId
    || pack.eventId !== scope.eventId
    || pack.venueId !== scope.venueId
  ) {
    throw new Error('OPERATIONAL_READINESS_PACK_CROSS_PROJECT_REJECTED');
  }
  return {
    pack: immutableOperationalReadinessClone(pack),
    trustSession
  };
}

export function operationalRequirementClassificationCounts(
  pack: OperationalReadinessPack
): Record<ReadinessPackSourceClassification, number> {
  return pack.requirements.reduce<Record<ReadinessPackSourceClassification, number>>(
    (counts, requirement) => {
      counts[requirement.classification] += 1;
      return counts;
    },
    {
      'source-backed': 0,
      'founder-directed': 0,
      'template-proposed': 0,
      missing: 0,
      conflicting: 0,
      superseded: 0
    }
  );
}
