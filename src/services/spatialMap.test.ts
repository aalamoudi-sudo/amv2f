import { describe, expect, it } from 'vitest';
import { kapSpatialCommandExperience } from '../data/spatialCommandExperiences';
import type { SpatialViewState } from '../types/spatialMap';
import {
  buildSpatialSearchIndex,
  candidateRasterMapAdapter,
  clampSpatialOpacity,
  clampSpatialPan,
  clampSpatialZoom,
  createBrowserSpatialViewRepository,
  deriveAdaptiveMarkerLayout,
  resolveVisibleSpatialDisplayLayers,
  sanitizeSpatialViewState,
  searchSpatialIndex,
  validateSpatialDisplayLayers
} from './spatialMap';

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function viewState(overrides: Partial<SpatialViewState> = {}): SpatialViewState {
  return {
    projectId: kapSpatialCommandExperience.projectId,
    eventId: kapSpatialCommandExperience.eventId,
    venueId: kapSpatialCommandExperience.venueId,
    mode: 'experience',
    sourceLayerId: kapSpatialCommandExperience.sourceLayers.find((layer) => layer.truthStatus === 'candidate')!.sourceLayerId,
    selectedEntityId: 'ENTITY-KAP-OP-006',
    zoom: 1,
    pan: { x: 0, y: 0 },
    viewMode: 'top',
    visibleLayers: kapSpatialCommandExperience.displayLayers.filter((layer) => layer.visibility).map((layer) => layer.layerId),
    opacity: Object.fromEntries(kapSpatialCommandExperience.displayLayers.map((layer) => [layer.layerId, layer.opacity])),
    collapsedPanels: { sourceLayers: true, context: false },
    savedViewId: 'VIEW-KAP-001',
    focusMode: false,
    filters: [],
    ...overrides
  };
}

describe('Stage 3E.4C spatial map services', () => {
  it('validates reusable layers and enforces mode compatibility and dependencies', () => {
    expect(validateSpatialDisplayLayers(kapSpatialCommandExperience.displayLayers)).toEqual([]);
    const defaults = resolveVisibleSpatialDisplayLayers(
      kapSpatialCommandExperience.displayLayers,
      'experience',
      []
    );
    expect(defaults.has('DISPLAY-LAYER-KAP-CANDIDATE-ZONING')).toBe(true);
    expect(defaults.has('DISPLAY-LAYER-KAP-NARRATIVE-SEQUENCE')).toBe(false);
    const withoutSource = resolveVisibleSpatialDisplayLayers(
      kapSpatialCommandExperience.displayLayers,
      'experience',
      ['DISPLAY-LAYER-KAP-CANDIDATE-MARKERS']
    );
    expect(withoutSource.has('DISPLAY-LAYER-KAP-CANDIDATE-MARKERS')).toBe(false);
  });

  it('clamps opacity, zoom, pan, and adapter transforms safely', () => {
    expect(clampSpatialOpacity(-1)).toBe(0);
    expect(clampSpatialOpacity(2)).toBe(1);
    expect(clampSpatialZoom(8, 0.75, 3)).toBe(3);
    expect(clampSpatialZoom(-8, 0.75, 3)).toBe(.75);
    expect(clampSpatialPan({ x: 5_000, y: -5_000 }, { width: 1000, height: 500 })).toEqual({ x: 800, y: -400 });
    expect(candidateRasterMapAdapter.projectAnchor({ x: 1.2, y: -.2 })).toEqual({ leftPercent: 100, topPercent: 0 });
    expect(candidateRasterMapAdapter.clampTransform(
      { zoom: 20, x: 9_000, y: -9_000 },
      { minimumZoom: .75, maximumZoom: 3, viewportWidth: 1000, viewportHeight: 500 }
    )).toEqual({ zoom: 3, x: 800, y: -400 });
  });

  it('searches Arabic, English aliases, internal IDs, experience names, landmarks, and blockers', () => {
    const index = buildSpatialSearchIndex(kapSpatialCommandExperience, kapSpatialCommandExperience.spatialTruthPack);
    expect(searchSpatialIndex(index, 'ممر العصور')[0]).toMatchObject({
      targetId: 'ENTITY-KAP-OP-006',
      nameAr: 'ممر العصور'
    });
    expect(searchSpatialIndex(index, 'Tunnel')[0]).toMatchObject({
      targetId: 'ENTITY-KAP-OP-006',
      nameAr: 'ممر العصور'
    });
    expect(searchSpatialIndex(index, 'ENTITY-KAP-OP-006')[0]?.targetId).toBe('ENTITY-KAP-OP-006');
    expect(searchSpatialIndex(index, 'المسرح')[0]).toMatchObject({
      targetId: 'ZONE-SHOW-001',
      hasAnchor: false,
      spatialStatus: 'unresolved'
    });
    expect(searchSpatialIndex(index, 'النصب التذكاري')[0]).toMatchObject({
      targetId: 'ENTITY-KAP-OP-005',
      type: 'independent-landmark'
    });
    expect(searchSpatialIndex(index, 'كبار الشخصيات').some((result) => result.targetId === 'ZONE-DINNER-VIP-001')).toBe(true);
  });

  it('filters founder decisions, independent landmarks, conflicts, unresolved items, and candidate anchors', () => {
    const index = buildSpatialSearchIndex(kapSpatialCommandExperience, kapSpatialCommandExperience.spatialTruthPack);
    expect(searchSpatialIndex(index, '', ['independent-landmarks']).map((result) => result.targetId)).toEqual(expect.arrayContaining([
      'ENTITY-KAP-OP-004',
      'ENTITY-KAP-OP-011',
      'ENTITY-KAP-OP-005'
    ]));
    expect(searchSpatialIndex(index, '', ['independent-landmarks'])).toHaveLength(3);
    expect(searchSpatialIndex(index, '', ['conflicted']).some((result) => result.targetId === 'ENTITY-KAP-OP-006')).toBe(true);
    expect(searchSpatialIndex(index, '', ['unresolved']).some((result) => result.targetId === 'ZONE-SHOW-001')).toBe(true);
    expect(searchSpatialIndex(index, '', ['founder-approved']).every((result) => result.semanticStatus === 'founder-approved')).toBe(true);
    expect(searchSpatialIndex(index, '', ['candidate-anchors']).every((result) => result.hasAnchor)).toBe(true);
  });

  it('declutters overlapping markers without mutating stored candidate anchors', () => {
    const entities = structuredClone(kapSpatialCommandExperience.candidateEntities);
    const before = structuredClone(entities.map((entity) => entity.normalizedAnchor));
    entities[1]!.normalizedAnchor = { ...entities[0]!.normalizedAnchor! };
    const viewport = { width: 1000, height: 780 };
    const layout = deriveAdaptiveMarkerLayout(entities, 1, null, viewport);
    expect(layout.get(entities[0]!.candidateId)?.clusterSize).toBeGreaterThan(1);
    const first = layout.get(entities[0]!.candidateId)!;
    const second = layout.get(entities[1]!.candidateId)!;
    const firstCenter = {
      x: entities[0]!.normalizedAnchor!.x * viewport.width + first.offsetX,
      y: entities[0]!.normalizedAnchor!.y * viewport.height + first.offsetY
    };
    const secondCenter = {
      x: entities[1]!.normalizedAnchor.x * viewport.width + second.offsetX,
      y: entities[1]!.normalizedAnchor.y * viewport.height + second.offsetY
    };
    const selectedHitTargetSize = 44 * first.markerScale * 1.26;
    expect(
      Math.abs(firstCenter.x - secondCenter.x) >= selectedHitTargetSize
      || Math.abs(firstCenter.y - secondCenter.y) >= selectedHitTargetSize
    ).toBe(true);
    expect(kapSpatialCommandExperience.candidateEntities.map((entity) => entity.normalizedAnchor)).toEqual(before);
    expect(deriveAdaptiveMarkerLayout(entities, 2, entities[0]!.candidateId).get(entities[0]!.candidateId)?.labelVisible).toBe(true);
  });

  it('detects screen-space hit-area collisions deterministically and spreads every expanded target safely', () => {
    const viewport = { width: 240, height: 187.2 };
    const entities = structuredClone(kapSpatialCommandExperience.candidateEntities);
    const layout = deriveAdaptiveMarkerLayout(entities, 1, null, viewport);
    const reversed = deriveAdaptiveMarkerLayout([...entities].reverse(), 1, null, viewport);
    const markerSix = layout.get('ENTITY-KAP-OP-006')!;
    const markerSeven = layout.get('ENTITY-KAP-OP-007')!;

    expect(markerSix.clusterId).toBeTruthy();
    expect(markerSeven.clusterId).toBe(markerSix.clusterId);
    expect([...layout.entries()]).toEqual([...reversed.entries()]);

    for (let leftIndex = 0; leftIndex < entities.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < entities.length; rightIndex += 1) {
        const leftEntity = entities[leftIndex]!;
        const rightEntity = entities[rightIndex]!;
        const left = layout.get(leftEntity.candidateId)!;
        const right = layout.get(rightEntity.candidateId)!;
        const leftCenter = {
          x: leftEntity.normalizedAnchor!.x * viewport.width + left.offsetX,
          y: leftEntity.normalizedAnchor!.y * viewport.height + left.offsetY
        };
        const rightCenter = {
          x: rightEntity.normalizedAnchor!.x * viewport.width + right.offsetX,
          y: rightEntity.normalizedAnchor!.y * viewport.height + right.offsetY
        };
        const selectedHitTargetSize = 44 * Math.max(left.markerScale, right.markerScale) * 1.26;
        expect(
          Math.abs(leftCenter.x - rightCenter.x) >= selectedHitTargetSize
          || Math.abs(leftCenter.y - rightCenter.y) >= selectedHitTargetSize
        ).toBe(true);
      }
    }
  });

  it('sanitizes project-local view state and rejects malformed or foreign state without fallback', () => {
    const valid = sanitizeSpatialViewState(viewState({ zoom: 99 }), kapSpatialCommandExperience, kapSpatialCommandExperience);
    expect(valid?.zoom).toBe(3);
    expect(sanitizeSpatialViewState(viewState({ projectId: 'PROJECT-FOREIGN-001' }), kapSpatialCommandExperience, kapSpatialCommandExperience)).toBeNull();
    expect(sanitizeSpatialViewState({ ...viewState(), sourceLayerId: 'SOURCE-DEMO' }, kapSpatialCommandExperience, kapSpatialCommandExperience)).toBeNull();
    expect(sanitizeSpatialViewState({ ...viewState(), filters: ['invalid'] }, kapSpatialCommandExperience, kapSpatialCommandExperience)).toBeNull();
  });

  it('persists saved views per project and never writes them into the truth pack', async () => {
    const storage = new MemoryStorage();
    const repository = createBrowserSpatialViewRepository(storage);
    await repository.save({
      savedViewId: 'VIEW-KAP-001',
      labelAr: 'عرض KAP',
      savedAt: '2026-07-28T00:00:00.000Z',
      state: viewState()
    });
    expect(await repository.list(kapSpatialCommandExperience.projectId)).toHaveLength(1);
    expect(await repository.list('PROJECT-FOREIGN-001')).toEqual([]);
    expect(JSON.stringify(kapSpatialCommandExperience.spatialTruthPack)).not.toContain('VIEW-KAP-001');
  });
});
