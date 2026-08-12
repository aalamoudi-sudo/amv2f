import type { OperationalEvent } from '../types/integration';
import { sha256Payload } from './integrationHash';

export type EventCollisionType = 'idempotency-key' | 'event-id' | 'source-identity';

export type EventAppendResult =
  | { status: 'appended'; event: OperationalEvent; fingerprint: string }
  | {
    status: 'duplicate';
    event: OperationalEvent;
    duplicateOfEventId: string;
    collisionType: EventCollisionType;
    existingFingerprint: string;
    incomingFingerprint: string;
    messageAr: string;
  }
  | {
    status: 'conflict';
    event: OperationalEvent;
    collisionType: EventCollisionType;
    existingEventId: string;
    incomingEventId: string;
    existingFingerprint: string;
    incomingFingerprint: string;
    messageAr: string;
  };

export interface OperationalEventRepository {
  append(event: OperationalEvent): Promise<EventAppendResult>;
  get(eventId: string): OperationalEvent | undefined;
  list(): OperationalEvent[];
  count(): number;
}

function cloneEvent(event: OperationalEvent): OperationalEvent {
  return structuredClone(event);
}

function compareEvents(left: OperationalEvent, right: OperationalEvent): number {
  return left.time.recordTime.localeCompare(right.time.recordTime)
    || left.revision - right.revision
    || left.eventId.localeCompare(right.eventId);
}

interface CollisionIndexEntry {
  eventId: string;
  eventFingerprint: string;
  sourcePayloadFingerprint: string;
}

interface CollisionCandidate {
  collisionType: EventCollisionType;
  existing: CollisionIndexEntry;
  existingFingerprint: string;
  incomingFingerprint: string;
}

function canonicalEventContent(event: OperationalEvent): Omit<OperationalEvent, 'revision'> {
  return Object.fromEntries(
    Object.entries(event).filter(([field]) => field !== 'revision')
  ) as Omit<OperationalEvent, 'revision'>;
}

function duplicateMessageAr(collisionType: EventCollisionType): string {
  if (collisionType === 'idempotency-key') return 'مفتاح منع التكرار يعود إلى حدث مطابق؛ لم تُضف نسخة ثانية.';
  if (collisionType === 'event-id') return 'هوية الحدث موجودة بمحتوى قانوني مطابق؛ لم تُضف نسخة ثانية.';
  return 'هوية المصدر وحمولته القانونية مسجلتان مسبقاً؛ لم تُضف نسخة ثانية.';
}

function conflictMessageAr(collisionType: EventCollisionType): string {
  if (collisionType === 'idempotency-key') return 'أعيد استخدام مفتاح منع التكرار مع محتوى مختلف قانونياً؛ أُوقف الإلحاق.';
  if (collisionType === 'event-id') return 'أعيد استخدام هوية الحدث مع محتوى مختلف قانونياً؛ أُوقف الإلحاق.';
  return 'أعيد استخدام هوية المصدر مع حمولة مختلفة قانونياً؛ أُوقف الإلحاق.';
}

export class LocalOperationalEventRepository implements OperationalEventRepository {
  private events: OperationalEvent[] = [];
  private eventIds = new Map<string, CollisionIndexEntry>();
  private idempotencyKeys = new Map<string, CollisionIndexEntry>();
  private sourceIdentities = new Map<string, CollisionIndexEntry>();

  async append(event: OperationalEvent): Promise<EventAppendResult> {
    const sourceIdentity = `${event.source.sourceSystemId}::${event.source.sourceRecordId}`;
    const eventFingerprint = await sha256Payload(canonicalEventContent(event));
    const sourcePayloadFingerprint = event.delivery.payloadHash;
    const candidates: CollisionCandidate[] = [];
    const idempotencyEntry = this.idempotencyKeys.get(event.delivery.idempotencyKey);
    if (idempotencyEntry) {
      candidates.push({
        collisionType: 'idempotency-key',
        existing: idempotencyEntry,
        existingFingerprint: idempotencyEntry.eventFingerprint,
        incomingFingerprint: eventFingerprint
      });
    }
    const eventIdEntry = this.eventIds.get(event.eventId);
    if (eventIdEntry) {
      candidates.push({
        collisionType: 'event-id',
        existing: eventIdEntry,
        existingFingerprint: eventIdEntry.eventFingerprint,
        incomingFingerprint: eventFingerprint
      });
    }
    const sourceEntry = this.sourceIdentities.get(sourceIdentity);
    if (sourceEntry) {
      candidates.push({
        collisionType: 'source-identity',
        existing: sourceEntry,
        existingFingerprint: sourceEntry.sourcePayloadFingerprint,
        incomingFingerprint: sourcePayloadFingerprint
      });
    }

    const conflict = candidates.find(
      (candidate) => candidate.existingFingerprint !== candidate.incomingFingerprint
    );
    if (conflict) {
      return {
        status: 'conflict',
        event: cloneEvent(event),
        collisionType: conflict.collisionType,
        existingEventId: conflict.existing.eventId,
        incomingEventId: event.eventId,
        existingFingerprint: conflict.existingFingerprint,
        incomingFingerprint: conflict.incomingFingerprint,
        messageAr: conflictMessageAr(conflict.collisionType)
      };
    }

    const duplicate = candidates[0];
    if (duplicate) {
      return {
        status: 'duplicate',
        event: cloneEvent(event),
        duplicateOfEventId: duplicate.existing.eventId,
        collisionType: duplicate.collisionType,
        existingFingerprint: duplicate.existingFingerprint,
        incomingFingerprint: duplicate.incomingFingerprint,
        messageAr: duplicateMessageAr(duplicate.collisionType)
      };
    }

    const stored = cloneEvent(event);
    const indexEntry = { eventId: stored.eventId, eventFingerprint, sourcePayloadFingerprint };
    const nextEvents = [...this.events, stored].sort(compareEvents);
    const nextEventIds = new Map(this.eventIds);
    const nextIdempotencyKeys = new Map(this.idempotencyKeys);
    const nextSourceIdentities = new Map(this.sourceIdentities);
    nextEventIds.set(stored.eventId, indexEntry);
    nextIdempotencyKeys.set(stored.delivery.idempotencyKey, indexEntry);
    nextSourceIdentities.set(sourceIdentity, indexEntry);

    this.events = nextEvents;
    this.eventIds = nextEventIds;
    this.idempotencyKeys = nextIdempotencyKeys;
    this.sourceIdentities = nextSourceIdentities;
    return { status: 'appended', event: cloneEvent(stored), fingerprint: eventFingerprint };
  }

  get(eventId: string): OperationalEvent | undefined {
    const event = this.events.find((candidate) => candidate.eventId === eventId);
    return event ? cloneEvent(event) : undefined;
  }

  list(): OperationalEvent[] {
    return this.events.map(cloneEvent);
  }

  count(): number {
    return this.events.length;
  }

}

export function replayOperationalEvents<TState>(
  events: OperationalEvent[],
  initialState: TState,
  projector: (state: TState, event: OperationalEvent) => TState
): TState {
  return [...events].sort(compareEvents).reduce(projector, initialState);
}
