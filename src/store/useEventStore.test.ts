import { beforeEach, describe, expect, it } from 'vitest';
import { routeDefinitions } from '../data/routes';
import { localStorageKeys } from '../services/storage';
import { createInitialEventStoreState, useEventStore } from './useEventStore';

function resetStore() {
  window.localStorage.clear();
  useEventStore.setState(createInitialEventStoreState());
}

describe('event store', () => {
  beforeEach(() => {
    resetStore();
  });

  it('selects entities and keeps selection available to every UI surface', () => {
    useEventStore.getState().selectEntity('ZONE-004');

    expect(useEventStore.getState().selectedEntityId).toBe('ZONE-004');
    expect(useEventStore.getState().entities['ZONE-004']!.nameAr).toBe('ساحة الفعاليات');
  });

  it('updates status, readiness, and risk with local persistence', () => {
    const store = useEventStore.getState();

    store.updateEntityStatus('ZONE-002', 'highRisk');
    store.updateEntityReadiness('ZONE-002', 112);
    store.updateEntityRiskLevel('ZONE-002', 'critical');

    const entity = useEventStore.getState().entities['ZONE-002']!;
    expect(entity.status).toBe('highRisk');
    expect(entity.readiness).toBe(100);
    expect(entity.riskLevel).toBe('critical');

    const persisted = JSON.parse(window.localStorage.getItem(localStorageKeys.eventStore) ?? '{}') as {
      state?: { entities?: Record<string, { status?: string; readiness?: number; riskLevel?: string }> };
    };

    expect(persisted.state?.entities?.['ZONE-002']?.status).toBe('highRisk');
    expect(persisted.state?.entities?.['ZONE-002']?.readiness).toBe(100);
    expect(persisted.state?.entities?.['ZONE-002']?.riskLevel).toBe('critical');
  });

  it('toggles route visibility from typed route definitions', () => {
    const evacuationRoute = routeDefinitions.find((route) => route.id === 'ROUTE-002');
    expect(evacuationRoute).toBeDefined();
    expect(useEventStore.getState().routeVisibility['ROUTE-002']).toBe(false);

    useEventStore.getState().toggleRoute('ROUTE-002');

    expect(useEventStore.getState().routeVisibility['ROUTE-002']).toBe(true);
  });

  it('progresses scenario steps and applies scenario actions', () => {
    const store = useEventStore.getState();

    store.startScenario('evacuation');

    expect(useEventStore.getState().scenarioRuntime.playback).toBe('playing');
    expect(useEventStore.getState().selectedEntityId).toBe('ZONE-004');
    expect(useEventStore.getState().entities['ZONE-004']!.status).toBe('emergency');

    store.advanceScenario();

    expect(useEventStore.getState().selectedEntityId).toBe('ROUTE-002');
    expect(useEventStore.getState().routeVisibility['ROUTE-002']).toBe(true);
    expect(useEventStore.getState().entities['GATE-003']!.status).toBe('ready');
    expect(useEventStore.getState().stateContext).toEqual({ dataSource: 'temporary-demo', stateLayer: 'scenario' });
    expect(useEventStore.getState().baselineEntities['ZONE-004']!.status).toBe('ready');
  });

  it('completes and resets scenarios back to demo data', () => {
    const store = useEventStore.getState();

    store.startScenario('visitorJourney');
    store.advanceScenario();
    store.advanceScenario();
    store.advanceScenario();
    store.advanceScenario();

    expect(useEventStore.getState().scenarioRuntime.playback).toBe('completed');

    store.resetScenario();

    expect(useEventStore.getState().scenarioRuntime.playback).toBe('idle');
    expect(useEventStore.getState().selectedEntityId).toBe('ZONE-001');
    expect(useEventStore.getState().entities['ZONE-002']!.status).toBe('preparing');
    expect(useEventStore.getState().routeVisibility['ROUTE-002']).toBe(false);
  });

  it('resets all locally edited demo data', () => {
    const store = useEventStore.getState();

    store.updateEntityStatus('ZONE-002', 'emergency');
    store.setRouteVisible('ROUTE-002', true);
    store.resetDemoData();

    expect(useEventStore.getState().entities['ZONE-002']!.status).toBe('preparing');
    expect(useEventStore.getState().routeVisibility['ROUTE-002']).toBe(false);
  });

  it('restores the baseline after stopping a scenario', () => {
    const store = useEventStore.getState();

    store.startScenario('evacuation');
    expect(useEventStore.getState().entities['ZONE-004']!.status).toBe('emergency');

    store.stopScenario();

    expect(useEventStore.getState().entities['ZONE-004']!.status).toBe('ready');
    expect(useEventStore.getState().stateContext.stateLayer).toBe('baseline');
  });

  it('does not persist a scenario overlay as the baseline', () => {
    useEventStore.getState().startScenario('evacuation');

    const persisted = JSON.parse(window.localStorage.getItem(localStorageKeys.eventStore) ?? '{}') as {
      state?: {
        entities?: Record<string, { status?: string }>;
        baselineEntities?: Record<string, { status?: string }>;
        stateContext?: { stateLayer?: string };
      };
    };

    expect(persisted.state?.entities?.['ZONE-004']?.status).toBe('ready');
    expect(persisted.state?.baselineEntities?.['ZONE-004']?.status).toBe('ready');
    expect(persisted.state?.stateContext?.stateLayer).toBe('baseline');
  });

  it('increments readiness revisions and rejects approval without evidence', () => {
    const store = useEventStore.getState();
    const initialRevision = store.zoneReadiness.find((record) => record.zoneId === 'ZONE-002')!.revision;

    store.updateZoneReadiness('ZONE-002', { approvalStatus: 'approved', evidence: [] });
    expect(useEventStore.getState().errorMessage).toContain('الدليل المنظم');
    expect(useEventStore.getState().zoneReadiness.find((record) => record.zoneId === 'ZONE-002')!.revision).toBe(initialRevision);

    const futureTargetReadinessDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    store.updateZoneReadiness('ZONE-002', {
      readiness: 88,
      targetReadinessDate: futureTargetReadinessDate,
      changeReason: 'تحديث اختبار محلي.'
    });
    expect(useEventStore.getState().zoneReadiness.find((record) => record.zoneId === 'ZONE-002')!.revision).toBe(initialRevision + 1);
    expect(useEventStore.getState().baselineZoneReadiness.find((record) => record.zoneId === 'ZONE-002')!.readiness).toBe(88);
  });

  it('keeps scenario readiness edits isolated from the baseline', () => {
    const store = useEventStore.getState();
    const baselineReadiness = store.baselineZoneReadiness.find((record) => record.zoneId === 'ZONE-005')!.readiness;

    store.startScenario('evacuation');
    store.updateZoneReadiness('ZONE-005', { readiness: 12, changeReason: 'تعديل سيناريو محلي.' });

    expect(useEventStore.getState().zoneReadiness.find((record) => record.zoneId === 'ZONE-005')!.readiness).toBe(12);
    expect(useEventStore.getState().baselineZoneReadiness.find((record) => record.zoneId === 'ZONE-005')!.readiness).toBe(baselineReadiness);

    store.stopScenario();
    expect(useEventStore.getState().zoneReadiness.find((record) => record.zoneId === 'ZONE-005')!.readiness).toBe(baselineReadiness);
  });

  it('creates, edits, and approves a generic decision locally', () => {
    const store = useEventStore.getState();
    const decisionId = store.createDecisionDraft({
      title: 'قرار اختبار عام',
      description: 'وصف قرار قابل لإعادة الاستخدام.',
      decisionType: 'technical',
      decisionOwner: 'مالك القرار',
      responsibleParty: 'منفذ القرار',
      relationships: [{ entityId: 'ZONE-001', relationType: 'execution-target', impactLevel: 'medium', descriptionAr: 'هدف تنفيذ الاختبار.' }]
    });

    expect(decisionId).toBe('DECISION-006');
    expect(useEventStore.getState().decisions.find((record) => record.decisionId === decisionId)?.status).toBe('draft');

    store.updateDecision(decisionId!, {
      status: 'review',
      evidence: [{ id: 'DECISION-EVIDENCE-006', type: 'exercise', titleAr: 'دليل اختبار', source: 'اختبار محلي', capturedAt: '2026-07-11T10:00:00Z', status: 'verified' }],
      selectedOption: 'OPTION-DRAFT',
      changeReason: 'رفع القرار للمراجعة.'
    });
    store.approveDecision(decisionId!, 'اعتماد اختبار محلي.');

    const approved = useEventStore.getState().decisions.find((record) => record.decisionId === decisionId)!;
    expect(approved.status).toBe('approved');
    expect(approved.approvalStatus).toBe('approved');
    expect(approved.approvedBy).toBe('المستخدم المحلي');
    expect(approved.revision).toBe(3);
  });

  it('rejects a new decision draft with an unknown spatial relationship', () => {
    const beforeCount = useEventStore.getState().decisions.length;
    const decisionId = useEventStore.getState().createDecisionDraft({
      title: 'قرار بعلاقة غير معروفة',
      description: 'يجب رفض المسودة قبل دخولها إلى المخزن.',
      decisionType: 'technical',
      decisionOwner: 'مالك تجريبي',
      responsibleParty: 'مسؤول تجريبي',
      relationships: [{ entityId: 'ZONE-999', relationType: 'execution-target', impactLevel: 'medium', descriptionAr: 'هدف غير معروف.' }]
    });

    expect(decisionId).toBeNull();
    expect(useEventStore.getState().decisions).toHaveLength(beforeCount);
    expect(useEventStore.getState().errorMessage).toContain('غير معروف');
  });

  it('keeps decision edits isolated from the baseline during a scenario', () => {
    const store = useEventStore.getState();
    const baselineTitle = store.baselineDecisions.find((record) => record.decisionId === 'DECISION-001')!.title;

    store.startScenario('visitorJourney');
    store.updateDecision('DECISION-001', { title: 'عنوان سيناريو محلي', changeReason: 'تعديل تمرين.' });

    expect(useEventStore.getState().decisions.find((record) => record.decisionId === 'DECISION-001')!.title).toBe('عنوان سيناريو محلي');
    expect(useEventStore.getState().decisions.find((record) => record.decisionId === 'DECISION-001')!.stateContext).toBe('scenario');
    expect(useEventStore.getState().baselineDecisions.find((record) => record.decisionId === 'DECISION-001')!.title).toBe(baselineTitle);
    expect(useEventStore.getState().baselineDecisions.find((record) => record.decisionId === 'DECISION-001')!.stateContext).toBe('temporary-demo');

    store.stopScenario();
    expect(useEventStore.getState().decisions.find((record) => record.decisionId === 'DECISION-001')!.title).toBe(baselineTitle);
    expect(useEventStore.getState().decisions.find((record) => record.decisionId === 'DECISION-001')!.stateContext).toBe('temporary-demo');
  });

  it('preserves temporary-demo context after editing and persistence updates', () => {
    const store = useEventStore.getState();
    store.updateDecision('DECISION-003', { title: 'عنوان تجريبي محفوظ', changeReason: 'اختبار حفظ السياق التجريبي.' });

    const current = useEventStore.getState().decisions.find((record) => record.decisionId === 'DECISION-003')!;
    const baselineLayer = useEventStore.getState().baselineDecisions.find((record) => record.decisionId === 'DECISION-003')!;
    expect(current.stateContext).toBe('temporary-demo');
    expect(baselineLayer.stateContext).toBe('temporary-demo');
    expect(current.relationships.every((relation) => relation.stateContext === 'temporary-demo')).toBe(true);
  });

  it('preserves a real baseline record context after editing', () => {
    const source = useEventStore.getState().decisions.find((record) => record.decisionId === 'DECISION-003')!;
    const baselineRecord = {
      ...source,
      stateContext: 'baseline' as const,
      relationships: source.relationships.map((relation) => ({ ...relation, stateContext: 'baseline' as const }))
    };
    useEventStore.setState({
      decisions: [baselineRecord],
      baselineDecisions: [baselineRecord],
      selectedDecisionId: baselineRecord.decisionId,
      stateContext: { dataSource: 'operational-baseline', stateLayer: 'baseline' }
    });

    useEventStore.getState().updateDecision(baselineRecord.decisionId, { title: 'عنوان أساسي محفوظ', changeReason: 'تحديث سجل أساسي محلي.' });

    const updated = useEventStore.getState().decisions[0]!;
    expect(updated.stateContext).toBe('baseline');
    expect(updated.relationships.every((relation) => relation.stateContext === 'baseline')).toBe(true);
  });

  it('keeps scenario relationships isolated from baseline relationships', () => {
    const store = useEventStore.getState();
    const baselineRelations = store.baselineDecisions.find((record) => record.decisionId === 'DECISION-001')!.relationships;
    store.startScenario('visitorJourney');
    store.updateDecision('DECISION-001', {
      relationships: [{ ...baselineRelations[0]!, entityId: 'ZONE-001', stateContext: 'scenario' }],
      changeReason: 'علاقة سيناريو محلية.'
    });

    expect(useEventStore.getState().decisions.find((record) => record.decisionId === 'DECISION-001')!.relationships[0]?.entityId).toBe('ZONE-001');
    expect(useEventStore.getState().baselineDecisions.find((record) => record.decisionId === 'DECISION-001')!.relationships[0]?.entityId).toBe(baselineRelations[0]?.entityId);
  });

  it('blocks skipped and incomplete lifecycle transitions through store actions', () => {
    const store = useEventStore.getState();
    store.transitionDecision('DECISION-001', 'closed');
    expect(useEventStore.getState().decisions.find((record) => record.decisionId === 'DECISION-001')?.status).toBe('review');
    expect(useEventStore.getState().errorMessage).toContain('لا يمكن الانتقال مباشرة');

    store.updateDecision('DECISION-001', { evidence: [], selectedOption: null, changeReason: 'اختبار اعتماد غير مكتمل.' });
    store.approveDecision('DECISION-001', 'اعتماد محلي.');
    expect(useEventStore.getState().decisions.find((record) => record.decisionId === 'DECISION-001')?.status).toBe('review');
    expect(useEventStore.getState().errorMessage).toContain('خياراً محدداً');
  });

  it('rejects unknown verification evidence and accepts an existing verified reference', () => {
    const closed = useEventStore.getState().decisions.find((record) => record.decisionId === 'DECISION-005')!;
    const completed = {
      ...closed,
      status: 'completed' as const,
      revision: 6,
      changeReason: closed.changeHistory[5]!.changeReason,
      changeHistory: closed.changeHistory.slice(0, 6),
      actualImpact: null,
      outcomeStatus: 'pending' as const,
      verifiedBy: null,
      verifiedAt: null,
      verificationEvidenceIds: [],
      closedBy: null,
      closedAt: null,
      closureReason: '',
      lessonsLearned: ''
    };
    useEventStore.setState({
      decisions: [completed],
      baselineDecisions: [completed],
      selectedDecisionId: completed.decisionId
    });

    useEventStore.getState().updateDecision(completed.decisionId, {
      status: 'verified',
      actualImpact: closed.actualImpact,
      outcomeStatus: 'positive',
      verifiedBy: 'مراجع محلي',
      verifiedAt: '2026-07-11T10:00:00Z',
      verificationEvidenceIds: ['EVIDENCE-UNKNOWN'],
      changeReason: 'محاولة تحقق بمرجع غير معروف.'
    });
    expect(useEventStore.getState().decisions[0]?.status).toBe('completed');
    expect(useEventStore.getState().errorMessage).toContain('غير موجود ضمن أدلة القرار');

    useEventStore.getState().updateDecision(completed.decisionId, {
      status: 'verified',
      actualImpact: closed.actualImpact,
      outcomeStatus: 'positive',
      verifiedBy: 'مراجع محلي',
      verifiedAt: '2026-07-11T10:00:00Z',
      verificationEvidenceIds: ['DECISION-EVIDENCE-005'],
      changeReason: 'تحقق محلي بمرجع موجود وموثق.'
    });
    expect(useEventStore.getState().decisions[0]?.status).toBe('verified');
    expect(useEventStore.getState().errorMessage).toBeNull();
  });

  it('rehydrates version 7 once and preserves structured recovery details', async () => {
    const createdId = useEventStore.getState().createDecisionDraft({
      title: 'قرار محفوظ من النسخة السابقة',
      description: 'سجل صالح يجب أن يبقى بعد ترحيل التخزين.',
      decisionType: 'technical',
      decisionOwner: 'مالك تجريبي',
      responsibleParty: 'منفذ تجريبي',
      relationships: [{ entityId: 'ZONE-001', relationType: 'execution-target', impactLevel: 'medium', descriptionAr: 'هدف تنفيذ تجريبي.' }]
    });
    const created = useEventStore.getState().decisions.find((record) => record.decisionId === createdId)!;
    const invalidDefault = {
      ...useEventStore.getState().decisions.find((record) => record.decisionId === 'DECISION-001')!,
      expectedImpact: { level: 'extreme', summaryAr: '', dimensions: { safety: 'unknown' } }
    };
    const persisted = {
      ...createInitialEventStoreState(),
      decisions: [invalidDefault, created],
      baselineDecisions: [invalidDefault, created],
      selectedDecisionId: created.decisionId
    };

    useEventStore.setState(createInitialEventStoreState());
    window.localStorage.setItem(localStorageKeys.eventStore, JSON.stringify({ state: persisted, version: 7 }));
    await useEventStore.persist.rehydrate();

    const restored = useEventStore.getState();
    expect(restored.decisions.some((record) => record.decisionId === created.decisionId)).toBe(true);
    expect(restored.selectedDecisionId).toBe(created.decisionId);
    expect(restored.decisions.find((record) => record.decisionId === created.decisionId)?.stateContext).toBe('temporary-demo');
    expect(restored.decisionRecovery.sourcePersistenceVersion).toBe(7);
    expect(restored.decisionRecovery.rejectedRecords.length).toBeGreaterThan(0);
    expect(restored.decisionRecovery.rejectedRecords.flatMap((record) => record.issues.map((currentIssue) => currentIssue.code))).toContain('invalid-impact');
  });
});
