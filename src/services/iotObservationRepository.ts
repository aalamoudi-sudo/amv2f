import type { IoTObservation } from '../types/iot';
import { sha256Payload } from './integrationHash';

export type IoTObservationCollisionType = 'idempotency-key' | 'observation-id' | 'source-sequence' | 'source-identity';

export type IoTObservationAppendResult =
  | { status: 'appended'; observation: IoTObservation; fingerprint: string }
  | {
    status: 'duplicate';
    observation: IoTObservation;
    duplicateOfObservationId: string;
    collisionType: IoTObservationCollisionType;
    existingFingerprint: string;
    incomingFingerprint: string;
    messageAr: string;
  }
  | {
    status: 'conflict';
    observation: IoTObservation;
    collisionType: IoTObservationCollisionType;
    existingObservationId: string;
    incomingObservationId: string;
    existingFingerprint: string;
    incomingFingerprint: string;
    messageAr: string;
  };

export interface IoTObservationRepository {
  append(observation: IoTObservation): Promise<IoTObservationAppendResult>;
  get(observationId: string): IoTObservation | undefined;
  list(): IoTObservation[];
  count(): number;
}

interface IoTCollisionIndexEntry {
  observationId: string;
  observationFingerprint: string;
  sourcePayloadFingerprint: string;
}

interface IoTCollisionCandidate {
  collisionType: IoTObservationCollisionType;
  existing: IoTCollisionIndexEntry;
  existingFingerprint: string;
  incomingFingerprint: string;
}

function cloneObservation(observation: IoTObservation): IoTObservation {
  return structuredClone(observation);
}

function compareObservations(left: IoTObservation, right: IoTObservation): number {
  return left.platformReceivedAt.localeCompare(right.platformReceivedAt)
    || left.sequence - right.sequence
    || left.observationId.localeCompare(right.observationId);
}

function duplicateMessageAr(collisionType: IoTObservationCollisionType): string {
  if (collisionType === 'idempotency-key') return 'مفتاح منع التكرار يعود إلى قراءة IoT مطابقة؛ لم تُضف نسخة ثانية.';
  if (collisionType === 'observation-id') return 'هوية القراءة موجودة بمحتوى قانوني مطابق؛ لم تُضف نسخة ثانية.';
  if (collisionType === 'source-sequence') return 'تسلسل الجهاز والقناة مسجل بحمولة مطابقة؛ لم تُضف نسخة ثانية.';
  return 'هوية سجل المصدر وحمولته مسجلتان مسبقاً؛ لم تُضف نسخة ثانية.';
}

function conflictMessageAr(collisionType: IoTObservationCollisionType): string {
  if (collisionType === 'idempotency-key') return 'أعيد استخدام مفتاح منع التكرار لقراءة IoT مختلفة؛ أُوقف الإلحاق.';
  if (collisionType === 'observation-id') return 'أعيد استخدام هوية القراءة مع محتوى مختلف؛ أُوقف الإلحاق.';
  if (collisionType === 'source-sequence') return 'أعيد استخدام تسلسل الجهاز والقناة مع حمولة مختلفة؛ أُوقف الإلحاق.';
  return 'أعيد استخدام هوية سجل المصدر مع حمولة مختلفة؛ أُوقف الإلحاق.';
}

export class LocalIoTObservationRepository implements IoTObservationRepository {
  private observations: IoTObservation[] = [];
  private observationIds = new Map<string, IoTCollisionIndexEntry>();
  private idempotencyKeys = new Map<string, IoTCollisionIndexEntry>();
  private sourceSequences = new Map<string, IoTCollisionIndexEntry>();
  private sourceIdentities = new Map<string, IoTCollisionIndexEntry>();

  async append(observation: IoTObservation): Promise<IoTObservationAppendResult> {
    const sourceSequence = `${observation.deviceId}::${observation.streamId}::${observation.sequence}`;
    const sourceIdentity = `${observation.sourceSystemId}::${observation.sourceRecordId}`;
    const observationFingerprint = await sha256Payload(observation);
    const sourcePayloadFingerprint = observation.payloadHash;
    const candidates: IoTCollisionCandidate[] = [];

    const candidateEntries: Array<[
      IoTObservationCollisionType,
      IoTCollisionIndexEntry | undefined,
      'observation' | 'source'
    ]> = [
      ['idempotency-key', this.idempotencyKeys.get(observation.idempotencyKey), 'observation'],
      ['observation-id', this.observationIds.get(observation.observationId), 'observation'],
      ['source-sequence', this.sourceSequences.get(sourceSequence), 'source'],
      ['source-identity', this.sourceIdentities.get(sourceIdentity), 'source']
    ];

    for (const [collisionType, existing, comparison] of candidateEntries) {
      if (!existing) continue;
      candidates.push({
        collisionType,
        existing,
        existingFingerprint: comparison === 'observation' ? existing.observationFingerprint : existing.sourcePayloadFingerprint,
        incomingFingerprint: comparison === 'observation' ? observationFingerprint : sourcePayloadFingerprint
      });
    }

    const conflict = candidates.find((candidate) => candidate.existingFingerprint !== candidate.incomingFingerprint);
    if (conflict) {
      return {
        status: 'conflict',
        observation: cloneObservation(observation),
        collisionType: conflict.collisionType,
        existingObservationId: conflict.existing.observationId,
        incomingObservationId: observation.observationId,
        existingFingerprint: conflict.existingFingerprint,
        incomingFingerprint: conflict.incomingFingerprint,
        messageAr: conflictMessageAr(conflict.collisionType)
      };
    }

    const duplicate = candidates[0];
    if (duplicate) {
      return {
        status: 'duplicate',
        observation: cloneObservation(observation),
        duplicateOfObservationId: duplicate.existing.observationId,
        collisionType: duplicate.collisionType,
        existingFingerprint: duplicate.existingFingerprint,
        incomingFingerprint: duplicate.incomingFingerprint,
        messageAr: duplicateMessageAr(duplicate.collisionType)
      };
    }

    const stored = cloneObservation(observation);
    const indexEntry = { observationId: stored.observationId, observationFingerprint, sourcePayloadFingerprint };
    const nextObservations = [...this.observations, stored].sort(compareObservations);
    const nextObservationIds = new Map(this.observationIds);
    const nextIdempotencyKeys = new Map(this.idempotencyKeys);
    const nextSourceSequences = new Map(this.sourceSequences);
    const nextSourceIdentities = new Map(this.sourceIdentities);
    nextObservationIds.set(stored.observationId, indexEntry);
    nextIdempotencyKeys.set(stored.idempotencyKey, indexEntry);
    nextSourceSequences.set(sourceSequence, indexEntry);
    nextSourceIdentities.set(sourceIdentity, indexEntry);

    this.observations = nextObservations;
    this.observationIds = nextObservationIds;
    this.idempotencyKeys = nextIdempotencyKeys;
    this.sourceSequences = nextSourceSequences;
    this.sourceIdentities = nextSourceIdentities;
    return { status: 'appended', observation: cloneObservation(stored), fingerprint: observationFingerprint };
  }

  get(observationId: string): IoTObservation | undefined {
    const observation = this.observations.find((candidate) => candidate.observationId === observationId);
    return observation ? cloneObservation(observation) : undefined;
  }

  list(): IoTObservation[] {
    return this.observations.map(cloneObservation);
  }

  count(): number {
    return this.observations.length;
  }
}

