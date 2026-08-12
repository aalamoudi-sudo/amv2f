import kapCandidateManifest from '../../pilot-input/manifests/kap-operational-readiness-pack-candidate-v1.json';
import {
  validateOperationalReadinessPack,
  verifyOperationalReadinessPackHash
} from '../services/operationalReadinessPack';
import {
  openOperationalReadinessTrustSession
} from '../services/operationalReadinessTrustGateway';
import type { OperationalReadinessPack } from '../types/operationalReadinessPack';

const candidate = kapCandidateManifest as unknown as OperationalReadinessPack;
export const kapOperationalReadinessPackTrustSession =
  openOperationalReadinessTrustSession(candidate);
const validation = validateOperationalReadinessPack(candidate, {
  trustSession: kapOperationalReadinessPackTrustSession ?? undefined
});

if (
  !kapOperationalReadinessPackTrustSession
  || !verifyOperationalReadinessPackHash(candidate)
  || !validation.valid
) {
  throw new Error(
    `KAP_OPERATIONAL_READINESS_PACK_TEST_FIXTURE_INVALID:${validation.issues.map((issue) => issue.code).join(',')}`
  );
}

export const kapOperationalReadinessPackCandidate = Object.freeze(candidate);
