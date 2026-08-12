import type { CandidateSpatialEntity } from '../types/sourceIntake';
import type {
  SpatialDisplayLayer,
  SpatialFilterId,
  SpatialMapAdapter,
  SpatialMarkerLayout,
  SpatialMarkerLayoutViewport,
  SpatialSavedView,
  SpatialSearchResult,
  SpatialViewState
} from '../types/spatialMap';
import { spatialFilterIdValues } from '../types/spatialMap';
import type { SpatialCommandExperienceConfiguration, SpatialCommandMode } from '../types/spatialCommand';
import type { SpatialSemanticDecision, SpatialTruthPack } from '../types/spatialTruth';

export const spatialViewStoragePrefix = 'mayadeen-spatial-view:v1:';

export function clampSpatialOpacity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

export function clampSpatialZoom(value: number, minimumZoom: number, maximumZoom: number): number {
  if (!Number.isFinite(value)) return minimumZoom;
  return Math.min(maximumZoom, Math.max(minimumZoom, value));
}

export function clampSpatialPan(
  value: { x: number; y: number },
  viewport: { width: number; height: number }
): { x: number; y: number } {
  const maxX = Math.max(120, viewport.width * 0.8);
  const maxY = Math.max(120, viewport.height * 0.8);
  return {
    x: Math.max(-maxX, Math.min(maxX, Number.isFinite(value.x) ? value.x : 0)),
    y: Math.max(-maxY, Math.min(maxY, Number.isFinite(value.y) ? value.y : 0))
  };
}

export const candidateRasterMapAdapter: SpatialMapAdapter = {
  adapterId: 'SPATIAL-MAP-ADAPTER-CANDIDATE-RASTER-v1',
  rendererKind: 'candidate-raster',
  coordinateSpace: 'normalized-source-image',
  authorityCeiling: 'candidate-visual-anchor',
  projectAnchor: (anchor) => ({
    leftPercent: clampSpatialOpacity(anchor.x) * 100,
    topPercent: clampSpatialOpacity(anchor.y) * 100
  }),
  clampTransform: (transform, bounds) => {
    const pan = clampSpatialPan({ x: transform.x, y: transform.y }, {
      width: bounds.viewportWidth,
      height: bounds.viewportHeight
    });
    return {
      zoom: clampSpatialZoom(transform.zoom, bounds.minimumZoom, bounds.maximumZoom),
      ...pan
    };
  }
};

const spatialMapAdapters = new Map<string, SpatialMapAdapter>([
  [candidateRasterMapAdapter.adapterId, candidateRasterMapAdapter]
]);

export function resolveSpatialMapAdapter(adapterId: string): SpatialMapAdapter | null {
  return spatialMapAdapters.get(adapterId) ?? null;
}

export function validateSpatialDisplayLayers(layers: readonly SpatialDisplayLayer[]): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  layers.forEach((layer) => {
    if (ids.has(layer.layerId)) issues.push(`duplicate-layer:${layer.layerId}`);
    ids.add(layer.layerId);
    if (!layer.labelAr.trim()) issues.push(`missing-label:${layer.layerId}`);
    if (layer.compatibleModes.length === 0) issues.push(`missing-compatible-mode:${layer.layerId}`);
    if (clampSpatialOpacity(layer.opacity) !== layer.opacity) issues.push(`invalid-opacity:${layer.layerId}`);
    if (!Number.isInteger(layer.renderOrder)) issues.push(`invalid-render-order:${layer.layerId}`);
  });
  layers.forEach((layer) => {
    layer.dependencies.forEach((dependency) => {
      if (!ids.has(dependency)) issues.push(`missing-dependency:${layer.layerId}:${dependency}`);
    });
  });
  return issues;
}

export function compatibleSpatialDisplayLayers(
  layers: readonly SpatialDisplayLayer[],
  mode: SpatialCommandMode
): SpatialDisplayLayer[] {
  return layers
    .filter((layer) => layer.compatibleModes.includes(mode))
    .sort((left, right) => left.renderOrder - right.renderOrder);
}

export function resolveVisibleSpatialDisplayLayers(
  layers: readonly SpatialDisplayLayer[],
  mode: SpatialCommandMode,
  requestedVisibleLayerIds: readonly string[]
): Set<string> {
  const compatible = compatibleSpatialDisplayLayers(layers, mode);
  const requested = new Set(requestedVisibleLayerIds);
  const desired = new Set(
    compatible
      .filter((layer) => (requested.size === 0 && layer.visibility) || requested.has(layer.layerId))
      .map((layer) => layer.layerId)
  );
  const visible = new Set<string>();
  compatible.forEach((layer) => {
    if (desired.has(layer.layerId)
      && layer.dependencies.every((dependency) => desired.has(dependency))) {
      visible.add(layer.layerId);
    }
  });
  return visible;
}

export function deriveAdaptiveMarkerLayout(
  entities: readonly CandidateSpatialEntity[],
  zoom: number,
  selectedEntityId: string | null = null,
  viewport: SpatialMarkerLayoutViewport = { width: 1000, height: 780 }
): Map<string, SpatialMarkerLayout> {
  const markerScale = Math.min(1.18, Math.max(0.78, 0.76 + zoom * 0.16));
  const width = Number.isFinite(viewport.width) && viewport.width > 0 ? viewport.width : 1000;
  const height = Number.isFinite(viewport.height) && viewport.height > 0 ? viewport.height : 780;
  const safeTargetSpacing = (44 * markerScale * 1.26) + 8;
  const anchoredEntities = entities
    .filter((entity) => entity.normalizedAnchor)
    .sort((left, right) => (
      left.sourceNumber - right.sourceNumber
      || left.candidateId.localeCompare(right.candidateId)
    ));
  const groups = anchoredEntities.map((entity) => [entity]);
  const pointFor = (entity: CandidateSpatialEntity) => ({
    x: (entity.normalizedAnchor?.x ?? 0) * width,
    y: (entity.normalizedAnchor?.y ?? 0) * height
  });
  const groupCenter = (group: readonly CandidateSpatialEntity[]) => {
    const total = group.reduce((sum, entity) => {
      const point = pointFor(entity);
      return { x: sum.x + point.x, y: sum.y + point.y };
    }, { x: 0, y: 0 });
    return { x: total.x / group.length, y: total.y / group.length };
  };
  const hitAreasOverlap = (
    left: { x: number; y: number },
    right: { x: number; y: number }
  ) => (
    Math.abs(left.x - right.x) < safeTargetSpacing
    && Math.abs(left.y - right.y) < safeTargetSpacing
  );
  const expandedTargetsFor = (group: readonly CandidateSpatialEntity[]) => {
    const centroid = groupCenter(group);
    const columns = group.length > 1
      ? Math.ceil(Math.sqrt(group.length * (width / height)))
      : 1;
    const rows = Math.ceil(group.length / columns);
    const layoutWidth = Math.max(0, (Math.min(columns, group.length) - 1) * safeTargetSpacing);
    const layoutHeight = Math.max(0, (rows - 1) * safeTargetSpacing);
    const halfTarget = safeTargetSpacing / 2;
    const centerX = Math.max(
      (layoutWidth / 2) + halfTarget,
      Math.min(width - (layoutWidth / 2) - halfTarget, centroid.x)
    );
    const centerY = Math.max(
      (layoutHeight / 2) + halfTarget,
      Math.min(height - (layoutHeight / 2) - halfTarget, centroid.y)
    );
    return group.map((entity, index) => {
      const row = Math.floor(index / columns);
      const rowStart = row * columns;
      const rowCount = Math.min(columns, group.length - rowStart);
      const column = index - rowStart;
      return {
        entity,
        target: group.length > 1
          ? {
              x: centerX + (column - ((rowCount - 1) / 2)) * safeTargetSpacing,
              y: centerY + (row - ((rows - 1) / 2)) * safeTargetSpacing
            }
          : pointFor(entity)
      };
    });
  };
  let merged = true;
  while (merged) {
    merged = false;
    mergeSearch:
    for (let leftIndex = 0; leftIndex < groups.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < groups.length; rightIndex += 1) {
        const left = groups[leftIndex]!;
        const right = groups[rightIndex]!;
        const sourceTargetsOverlap = left.some((leftEntity) => (
          right.some((rightEntity) => hitAreasOverlap(pointFor(leftEntity), pointFor(rightEntity)))
        ));
        const summarizedTargetsOverlap = hitAreasOverlap(groupCenter(left), groupCenter(right));
        const leftExpandedTargets = expandedTargetsFor(left);
        const rightExpandedTargets = expandedTargetsFor(right);
        const expandedTargetsOverlap = leftExpandedTargets.some((leftTarget) => (
          rightExpandedTargets.some((rightTarget) => hitAreasOverlap(leftTarget.target, rightTarget.target))
        ));
        if (!sourceTargetsOverlap && !summarizedTargetsOverlap && !expandedTargetsOverlap) continue;
        groups[leftIndex] = [...left, ...right].sort((first, second) => (
          first.sourceNumber - second.sourceNumber
          || first.candidateId.localeCompare(second.candidateId)
        ));
        groups.splice(rightIndex, 1);
        merged = true;
        break mergeSearch;
      }
    }
  }
  const result = new Map<string, SpatialMarkerLayout>();
  let clusterIndex = 0;
  groups.forEach((cluster) => {
    const clusterId = cluster.length > 1 ? `marker-cluster-${clusterIndex += 1}` : null;
    expandedTargetsFor(cluster).forEach(({ entity, target }) => {
      const { x: anchorX, y: anchorY } = pointFor(entity);
      result.set(entity.candidateId, {
        candidateEntityId: entity.candidateId,
        clusterId,
        clusterSize: cluster.length,
        offsetX: target.x - anchorX,
        offsetY: target.y - anchorY,
        markerScale,
        labelVisible: zoom >= 1.18 || selectedEntityId === entity.candidateId
      });
    });
  });
  return result;
}

function normalizeArabicSearch(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLocaleLowerCase('ar-SA')
    .replace(/\s+/g, ' ')
    .trim();
}

function truthDecisionFor(
  pack: SpatialTruthPack,
  targetId: string
): SpatialSemanticDecision | undefined {
  return pack.semanticDecisions.find((decision) => decision.targetId === targetId);
}

export function buildSpatialSearchIndex(
  configuration: SpatialCommandExperienceConfiguration,
  truthPack: SpatialTruthPack
): SpatialSearchResult[] {
  const candidateLayerId = configuration.sourceLayers.find((layer) => layer.truthStatus === 'candidate')?.sourceLayerId ?? '';
  const independentIds = new Set(truthPack.independentLandmarks.map((landmark) => landmark.candidateEntityId));
  const entityItems = configuration.candidateEntities.map((entity): SpatialSearchResult => {
    const decision = truthDecisionFor(truthPack, entity.candidateId);
    const relationship = configuration.entityRelationships.find((entry) => entry.candidateEntityIds.includes(entity.candidateId));
    const experience = configuration.experienceObjects.find((entry) => entry.experienceObjectId === relationship?.experienceObjectId);
    const type = independentIds.has(entity.candidateId) ? 'independent-landmark' : 'candidate-entity';
    const nameAr = decision?.primaryLabelAr ?? entity.labelAr;
    const nameEn = decision?.primaryLabelEn ?? entity.workingLabelEn;
    const aliases = decision?.legacyAliases ?? [];
    return {
      resultId: `entity:${entity.candidateId}`,
      targetId: entity.candidateId,
      type,
      nameAr,
      nameEn,
      aliases,
      semanticStatus: decision?.semanticStatus ?? 'source-derived',
      spatialStatus: decision?.spatialStatus ?? (entity.mappingStatus === 'conflicted' ? 'conflicted' : entity.mappingStatus === 'unresolved' ? 'unresolved' : 'candidate-visual-anchor'),
      engineeringStatus: decision?.engineeringStatus ?? 'unverified',
      operationalStatus: decision?.operationalStatus ?? 'unavailable',
      hasAnchor: Boolean(entity.normalizedAnchor),
      sourceAr: 'مخطط التقسيم التشغيلي المرشح',
      relationshipAr: experience ? `مرتبط بـ ${experience.labelAr}` : 'معلم مستقل خارج الرحلة الحالية',
      candidateEntityId: entity.candidateId,
      experienceObjectId: experience?.experienceObjectId ?? null,
      blockerId: null,
      mode: 'experience',
      sourceLayerId: candidateLayerId,
      searchText: normalizeArabicSearch([nameAr, nameEn, ...aliases, entity.candidateId, experience?.labelAr].filter(Boolean).join(' '))
    };
  });
  const experienceItems = configuration.experienceObjects.map((experience): SpatialSearchResult => {
    const decision = truthDecisionFor(truthPack, experience.experienceObjectId);
    const relationship = configuration.entityRelationships.find((entry) => entry.experienceObjectId === experience.experienceObjectId);
    const nameAr = decision?.primaryLabelAr ?? experience.labelAr;
    return {
      resultId: `experience:${experience.experienceObjectId}`,
      targetId: experience.experienceObjectId,
      type: 'experience-object',
      nameAr,
      nameEn: decision?.primaryLabelEn ?? experience.legacyAliasEn,
      aliases: decision?.legacyAliases ?? (experience.legacyAliasEn ? [experience.legacyAliasEn] : []),
      semanticStatus: decision?.semanticStatus ?? 'source-derived',
      spatialStatus: decision?.spatialStatus ?? (relationship?.state === 'unresolved' ? 'unresolved' : relationship?.state === 'conflicted' ? 'conflicted' : 'probable'),
      engineeringStatus: decision?.engineeringStatus ?? 'unverified',
      operationalStatus: decision?.operationalStatus ?? 'unavailable',
      hasAnchor: Boolean(relationship?.candidateEntityIds.length),
      sourceAr: relationship?.candidateEntityIds.length ? 'علاقة مرشحة من مخطط التقسيم' : 'لا يوجد مصدر مكاني مطابق',
      relationshipAr: relationship?.candidateEntityIds.length ? `${relationship.candidateEntityIds.length} وجهة مرتبطة` : 'بلا علاقة مكانية',
      candidateEntityId: relationship?.candidateEntityIds[0] ?? null,
      experienceObjectId: experience.experienceObjectId,
      blockerId: null,
      mode: 'experience',
      sourceLayerId: candidateLayerId,
      searchText: normalizeArabicSearch([nameAr, decision?.primaryLabelEn, ...(decision?.legacyAliases ?? []), experience.experienceObjectId].filter(Boolean).join(' '))
    };
  });
  const blockerItems = configuration.executiveBlockers.map((blocker): SpatialSearchResult => ({
    resultId: `blocker:${blocker.blockerId}`,
    targetId: blocker.blockerId,
    type: 'executive-blocker',
    nameAr: blocker.labelAr,
    nameEn: blocker.blockerId,
    aliases: [],
    semanticStatus: blocker.decisionState === 'founder-frozen' ? 'founder-approved' : 'unresolved',
    spatialStatus: blocker.affectedCandidateEntityIds.length ? 'conflicted' : 'unresolved',
    engineeringStatus: 'unverified',
    operationalStatus: 'unavailable',
    hasAnchor: blocker.affectedCandidateEntityIds.length > 0,
    sourceAr: 'سجل عوائق القرار',
    relationshipAr: blocker.affectedCandidateEntityIds.length
      ? `${blocker.affectedCandidateEntityIds.length} وجهة متأثرة`
      : 'سجل قرار بلا مرساة',
    candidateEntityId: blocker.affectedCandidateEntityIds[0] ?? null,
    experienceObjectId: blocker.affectedExperienceObjectIds[0] ?? null,
    blockerId: blocker.blockerId,
    mode: 'executive',
    sourceLayerId: candidateLayerId,
    searchText: normalizeArabicSearch(`${blocker.labelAr} ${blocker.blockerId}`)
  }));
  return [...entityItems, ...experienceItems, ...blockerItems];
}

export function spatialResultMatchesFilters(
  result: SpatialSearchResult,
  filters: readonly SpatialFilterId[]
): boolean {
  if (filters.length === 0) return true;
  return filters.every((filter) => {
    switch (filter) {
      case 'experience-linked':
        return Boolean(result.experienceObjectId && result.candidateEntityId);
      case 'independent-landmarks':
        return result.type === 'independent-landmark';
      case 'conflicted':
        return result.spatialStatus === 'conflicted';
      case 'unresolved':
        return result.spatialStatus === 'unresolved';
      case 'founder-approved':
        return result.semanticStatus === 'founder-approved';
      case 'candidate-anchors':
        return result.hasAnchor && result.engineeringStatus === 'unverified';
      case 'missing-engineering-controls':
        return result.engineeringStatus === 'unverified';
    }
  });
}

export function searchSpatialIndex(
  index: readonly SpatialSearchResult[],
  query: string,
  filters: readonly SpatialFilterId[] = []
): SpatialSearchResult[] {
  const normalized = normalizeArabicSearch(query);
  const matchRank = (result: SpatialSearchResult) => {
    if (!normalized) return 0;
    const exactFields = [
      result.nameAr,
      result.nameEn,
      result.targetId,
      ...result.aliases
    ].filter((value): value is string => Boolean(value)).map(normalizeArabicSearch);
    if (exactFields.includes(normalized)) return 0;
    if (exactFields.some((value) => value.startsWith(normalized))) return 1;
    return 2;
  };
  return index
    .filter((result) => spatialResultMatchesFilters(result, filters))
    .filter((result) => !normalized || result.searchText.includes(normalized))
    .sort((left, right) => {
      return matchRank(left) - matchRank(right) || left.nameAr.localeCompare(right.nameAr, 'ar');
    })
    .slice(0, 24);
}

export function filterIdsAreValid(filters: readonly string[]): filters is SpatialFilterId[] {
  return filters.every((filter) => spatialFilterIdValues.includes(filter as SpatialFilterId));
}

export function sanitizeSpatialViewState(
  candidate: unknown,
  expectedScope: Pick<SpatialViewState, 'projectId' | 'eventId' | 'venueId'>,
  configuration: SpatialCommandExperienceConfiguration
): SpatialViewState | null {
  if (!candidate || typeof candidate !== 'object') return null;
  const value = candidate as Partial<SpatialViewState>;
  if (value.projectId !== expectedScope.projectId
    || value.eventId !== expectedScope.eventId
    || value.venueId !== expectedScope.venueId) return null;
  const sourceLayerId = value.sourceLayerId;
  if (!sourceLayerId || !configuration.sourceLayers.some((layer) => layer.sourceLayerId === sourceLayerId)) return null;
  if (!value.mode || !['experience', 'executive', 'journey'].includes(value.mode)) return null;
  if (!value.viewMode || !['top', 'presentation'].includes(value.viewMode)) return null;
  if (!Array.isArray(value.visibleLayers) || !value.opacity || !value.collapsedPanels || !Array.isArray(value.filters)) return null;
  if (!filterIdsAreValid(value.filters)) return null;
  const selectedEntityId = value.selectedEntityId
    && configuration.candidateEntities.some((entity) => entity.candidateId === value.selectedEntityId)
    ? value.selectedEntityId
    : null;
  return {
    projectId: expectedScope.projectId,
    eventId: expectedScope.eventId,
    venueId: expectedScope.venueId,
    mode: value.mode,
    sourceLayerId,
    selectedEntityId,
    zoom: clampSpatialZoom(value.zoom ?? configuration.visualConfiguration.initialZoom, configuration.visualConfiguration.minimumZoom, configuration.visualConfiguration.maximumZoom),
    pan: clampSpatialPan(value.pan ?? { x: 0, y: 0 }, { width: 1920, height: 1080 }),
    viewMode: value.viewMode,
    visibleLayers: value.visibleLayers.filter((layerId) => configuration.displayLayers.some((layer) => layer.layerId === layerId)),
    opacity: Object.fromEntries(Object.entries(value.opacity).filter(([layerId]) => configuration.displayLayers.some((layer) => layer.layerId === layerId)).map(([layerId, opacity]) => [layerId, clampSpatialOpacity(opacity)])),
    collapsedPanels: {
      sourceLayers: Boolean(value.collapsedPanels.sourceLayers),
      context: Boolean(value.collapsedPanels.context)
    },
    savedViewId: typeof value.savedViewId === 'string' ? value.savedViewId : null,
    focusMode: Boolean(value.focusMode),
    filters: value.filters
  };
}

export interface SpatialViewRepository {
  list(projectId: string): Promise<SpatialSavedView[]>;
  save(view: SpatialSavedView): Promise<void>;
  clear(projectId: string): Promise<void>;
}

export function createBrowserSpatialViewRepository(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
): SpatialViewRepository {
  return {
    list(projectId) {
      try {
        const raw = storage.getItem(`${spatialViewStoragePrefix}${projectId}`);
        const parsed: unknown = raw ? JSON.parse(raw) as unknown : [];
        return Promise.resolve(Array.isArray(parsed) ? parsed as SpatialSavedView[] : []);
      } catch {
        return Promise.resolve([]);
      }
    },
    async save(view) {
      const key = `${spatialViewStoragePrefix}${view.state.projectId}`;
      const current = await this.list(view.state.projectId);
      const next = [view, ...current.filter((candidate) => candidate.savedViewId !== view.savedViewId)].slice(0, 8);
      storage.setItem(key, JSON.stringify(next));
    },
    clear(projectId) {
      storage.removeItem(`${spatialViewStoragePrefix}${projectId}`);
      return Promise.resolve();
    }
  };
}
