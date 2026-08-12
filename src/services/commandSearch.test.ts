import { describe, expect, it } from 'vitest';
import { createInitialEventStoreState, selectRuntimeRoutes } from '../store/useEventStore';
import { createCommandSearchIndex, normalizeCommandSearch, searchCommandIndex } from './commandSearch';

function createIndex(activeEventId: string | null = 'EVENT-DEMO-001') {
  const state = createInitialEventStoreState();
  return createCommandSearchIndex({
    entities: state.entities,
    routes: selectRuntimeRoutes(state),
    decisions: state.decisions,
    readiness: state.zoneReadiness,
    activeEventId,
    activeVenueId: activeEventId ? 'VENUE-DEMO-001' : null,
    activeEventNameAr: activeEventId ? 'فعالية العرض العامة' : null,
    mappingVersion: 'ux1-test-mapping'
  });
}

describe('universal command search', () => {
  it('normalizes Arabic text and indexes structured runtime records with stable identifiers', () => {
    const index = createIndex();
    expect(normalizeCommandSearch('مِنْطَقَة الـمَعارض')).toBe(normalizeCommandSearch('منطقة المعارض'));
    expect(index.some((item) => item.id === 'entity:ZONE-002' && item.kind === 'entity')).toBe(true);
    expect(index.some((item) => item.id === 'route:ROUTE-001' && item.kind === 'route')).toBe(true);
    expect(index.some((item) => item.id === 'decision:DECISION-001' && item.kind === 'decision')).toBe(true);
    expect(index.some((item) => item.id === 'readiness:ZONE-002' && item.kind === 'readiness')).toBe(true);
    expect(index.some((item) => item.id === 'device:DEVICE-IOT-COUNT-001' && item.kind === 'device')).toBe(true);
    expect(index.some((item) => item.id === 'stream:DEVICE-IOT-COUNT-001:occupancy-count' && item.kind === 'datastream')).toBe(true);
  });

  it('finds Arabic labels and identifiers without introducing hardcoded search records', () => {
    const index = createIndex();
    const arabic = searchCommandIndex(index, 'منطقة المعارض', 'EVENT-DEMO-001');
    const stableId = searchCommandIndex(index, 'ZONE-002', 'EVENT-DEMO-001');

    expect(arabic.some((item) => item.id === 'entity:ZONE-002')).toBe(true);
    expect(stableId.map((item) => item.id)).toContain('entity:ZONE-002');
    expect(stableId.every((item) => item.eventId === 'EVENT-DEMO-001')).toBe(true);
  });

  it('keeps an active event scope isolated and exposes experience points only through explicit candidate context', () => {
    const operationalIndex = createIndex();
    const injectedOtherEvent = {
      ...operationalIndex.find((item) => item.id === 'decision:DECISION-001')!,
      id: 'decision:DECISION-OTHER',
      eventId: 'EVENT-OTHER',
      titleAr: 'قرار من فعالية أخرى',
      searchText: ['قرار من فعالية أخرى', 'DECISION-OTHER']
    };
    const scoped = searchCommandIndex([...operationalIndex, injectedOtherEvent], 'قرار', 'EVENT-DEMO-001');
    expect(scoped.some((item) => item.id === 'decision:DECISION-OTHER')).toBe(false);

    const launcherIndex = createIndex(null);
    expect(launcherIndex.some((item) => item.kind === 'experience-point' && item.scope === 'candidate-experience')).toBe(true);
  });
});
