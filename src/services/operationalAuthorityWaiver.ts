import { sha256PayloadSync } from './integrationHash';
import type {
  OperationalAuthorityWaiverRecord
} from '../types/operationalReadinessPack';

export type OperationalAuthorityWaiverInput =
  Omit<OperationalAuthorityWaiverRecord, 'waiverId' | 'waiverHash'>;

function canonicalWaiverPayload(
  waiver: OperationalAuthorityWaiverInput | OperationalAuthorityWaiverRecord
): OperationalAuthorityWaiverInput {
  const {
    waiverId,
    waiverHash,
    ...payload
  } = waiver as OperationalAuthorityWaiverRecord;
  void waiverId;
  void waiverHash;
  return {
    ...payload,
    triggeredBySnapshot: [...payload.triggeredBySnapshot].sort(),
    evidenceRefs: [...payload.evidenceRefs].sort(),
    sourceTraceIds: [...payload.sourceTraceIds].sort()
  };
}

export function hashOperationalAuthorityWaiver(
  waiver: OperationalAuthorityWaiverInput | OperationalAuthorityWaiverRecord
): string {
  return sha256PayloadSync(canonicalWaiverPayload(waiver));
}

export function operationalAuthorityWaiverId(waiverHash: string): string {
  return `AUTHORITY-WAIVER-v1-${waiverHash}`;
}

export function createOperationalAuthorityWaiverRecord(
  input: OperationalAuthorityWaiverInput
): OperationalAuthorityWaiverRecord {
  const canonical = canonicalWaiverPayload(input);
  const waiverHash = hashOperationalAuthorityWaiver(canonical);
  return Object.freeze({
    ...canonical,
    waiverId: operationalAuthorityWaiverId(waiverHash),
    waiverHash
  });
}

export function verifyOperationalAuthorityWaiverIdentity(
  waiver: OperationalAuthorityWaiverRecord
): boolean {
  const waiverHash = hashOperationalAuthorityWaiver(waiver);
  return /^[a-f0-9]{64}$/.test(waiver.waiverHash)
    && waiver.waiverHash === waiverHash
    && waiver.waiverId === operationalAuthorityWaiverId(waiverHash);
}
