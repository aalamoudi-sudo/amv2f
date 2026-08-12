import { beforeEach, describe, expect, it } from 'vitest';
import { sha256PayloadSync } from '../services/integrationHash';
import { createInitialEventStoreState, useEventStore } from './useEventStore';

const input = {
  projectId: 'PROJECT-KAP-OPENING-2026',
  eventId: 'EVENT-KAP-OPENING-2026' as const,
  venueId: 'VENUE-KAP-001' as const,
  title: 'مسألة بروفة مرشحة',
  description: 'يلزم قرار محكوم قبل تحويل الملاحظة إلى أي إجراء.',
  createdAt: '2026-08-01T06:00:00.000Z',
  runId: 'REHEARSAL-RUN-001',
  eventDayId: 'EVENT-DAY-KAP-01',
  momentId: 'MOMENT-KAP-D01-001',
  personaVariantId: 'PERSONA-VARIANT-KAP-D01-VISITOR',
  journeyStepId: 'JOURNEY-STEP-KAP-D01-001',
  relatedSpatialObjectIds: ['ZONE-ARRIVAL-001', 'ENTITY-KAP-OP-001'],
  sourceTraceIds: ['TRACE-KAP-FOUR-DAY-P08']
};

function resetScopedStore() {
  window.localStorage.clear();
  const initial = createInitialEventStoreState();
  useEventStore.setState({
    ...initial,
    activeProjectId: input.projectId,
    activeProjectEventId: input.eventId,
    decisions: [],
    selectedDecisionId: null
  });
}

describe('rehearsal decision draft legal boundary', () => {
  beforeEach(resetScopedStore);

  it('creates only a scenario draft and leaves governed baseline projections unchanged', () => {
    const before = useEventStore.getState();
    const protectedFingerprint = sha256PayloadSync({
      baselineDecisions: before.baselineDecisions,
      baselineZoneReadiness: before.baselineZoneReadiness,
      zoneReadiness: before.zoneReadiness,
      entities: before.entities,
      baselineEntities: before.baselineEntities
    });

    const decisionId = before.createRehearsalDecisionDraft(input);
    const after = useEventStore.getState();
    const created = after.decisions.find((decision) => decision.decisionId === decisionId);

    expect(after.errorMessage).toBeNull();
    expect(decisionId).not.toBeNull();
    expect(created).toMatchObject({
      status: 'draft',
      approvalStatus: 'draft',
      stateContext: 'scenario',
      sourceType: 'exercise',
      approvedBy: null,
      verifiedBy: null,
      outcomeStatus: 'not-started'
    });
    expect(created?.evidence).toEqual([]);
    expect(created?.relationships).toEqual([expect.objectContaining({ entityId: 'ZONE-ARRIVAL-001', stateContext: 'scenario', confidence: 'low' })]);
    expect(created?.completionEvidenceIds).toEqual([]);
    expect(created?.verificationEvidenceIds).toEqual([]);
    expect(created?.assumptions).toContain(`تشغيل البروفة: ${input.runId}`);
    expect(sha256PayloadSync({
      baselineDecisions: after.baselineDecisions,
      baselineZoneReadiness: after.baselineZoneReadiness,
      zoneReadiness: after.zoneReadiness,
      entities: after.entities,
      baselineEntities: after.baselineEntities
    })).toBe(protectedFingerprint);
  });

  it('rejects a cross-project rehearsal draft without creating a fallback record', () => {
    const decisionId = useEventStore.getState().createRehearsalDecisionDraft({
      ...input,
      projectId: 'PROJECT-FOREIGN'
    });

    expect(decisionId).toBeNull();
    expect(useEventStore.getState().decisions).toEqual([]);
    expect(useEventStore.getState().errorMessage).toContain('لا تطابق المشروع والفعالية');
  });
});
