import type { CaptureEnvelope, ConflictRecord, OfflineQueueEntry, OperationalEvent } from '../types/integration';

export interface ReconciliationResult {
  outcome: 'replay' | 'duplicate' | 'conflict' | 'rejected';
  entry: OfflineQueueEntry;
  conflict: ConflictRecord | null;
  reasonAr: string;
}

export function queueOfflineEnvelope(envelope: CaptureEnvelope, queuedAt: string): OfflineQueueEntry {
  return {
    queueId: `QUEUE-${envelope.envelopeId}`,
    envelope: structuredClone(envelope),
    queuedAt,
    status: 'queued',
    replayedAt: null,
    resultEventId: null
  };
}

export function reconcileOfflineEntry(
  entry: OfflineQueueEntry,
  existingEvents: OperationalEvent[],
  now: string
): ReconciliationResult {
  const duplicate = existingEvents.find((event) => event.delivery.idempotencyKey === entry.envelope.idempotencyKey);
  if (duplicate) {
    return {
      outcome: 'duplicate',
      entry: { ...entry, status: 'replayed', replayedAt: now, resultEventId: duplicate.eventId },
      conflict: null,
      reasonAr: 'السجل موجود مسبقاً؛ تم تجاهل إعادة الإرسال بأمان.'
    };
  }
  const data = (entry.envelope.payload as { data?: Record<string, unknown> }).data ?? {};
  const entityId = typeof data.entityId === 'string' ? data.entityId : '';
  const priorDisposition = typeof data.priorDisposition === 'string' ? data.priorDisposition : null;
  const latest = [...existingEvents]
    .filter((event) => event.subjects.entityId === entityId && event.stateContext === entry.envelope.stateContext)
    .sort((left, right) => right.time.recordTime.localeCompare(left.time.recordTime) || right.revision - left.revision || right.eventId.localeCompare(left.eventId))[0];
  if (latest && priorDisposition && latest.operationalContext.proposedDisposition !== priorDisposition) {
    const conflict: ConflictRecord = {
      conflictId: `CONFLICT-${entry.envelope.envelopeId}`,
      entityId: latest.subjects.entityId,
      stateContext: entry.envelope.stateContext,
      existingEventId: latest.eventId,
      incomingEnvelopeId: entry.envelope.envelopeId,
      existingDisposition: latest.operationalContext.proposedDisposition,
      proposedDisposition: typeof data.proposedDisposition === 'string' ? data.proposedDisposition : 'unknown',
      reasonAr: 'الحالة التي بُني عليها السجل غير المتصل لا تطابق آخر حالة معروفة؛ يلزم مراجعة بشرية.',
      detectedAt: now,
      status: 'requires-review'
    };
    return { outcome: 'conflict', entry: { ...entry, status: 'conflict', replayedAt: now }, conflict, reasonAr: conflict.reasonAr };
  }
  return { outcome: 'replay', entry: { ...entry, status: 'replayed', replayedAt: now }, conflict: null, reasonAr: 'السجل جاهز لإعادة التشغيل مرة واحدة.' };
}
