import type { SpatialCommandMode, SpatialCommandViewMode } from './spatialCommand';
import type {
  SpatialEngineeringStatus,
  SpatialOperationalStatus,
  SpatialSemanticStatus,
  SpatialTruthStatus
} from './spatialTruth';

export const spatialDisplayLayerTypeValues = [
  'base-working-source',
  'candidate-zoning',
  'candidate-entity-markers',
  'experience-relationships',
  'narrative-sequence',
  'executive-blockers',
  'independent-landmarks',
  'evidence-availability-metadata',
  'unresolved-items',
  'future-external-spatial-adapter'
] as const;
export type SpatialDisplayLayerType = (typeof spatialDisplayLayerTypeValues)[number];

export interface SpatialDisplayLayer {
  layerId: string;
  labelAr: string;
  type: SpatialDisplayLayerType;
  sourceId: string | null;
  authority: string;
  visibility: boolean;
  opacity: number;
  compatibleModes: SpatialCommandMode[];
  truthClassification: string;
  renderOrder: number;
  legend: {
    labelAr: string;
    symbol: 'source' | 'marker' | 'relationship' | 'narrative' | 'blocker' | 'landmark' | 'evidence' | 'unresolved' | 'adapter';
  };
  dependencies: string[];
}

export interface SpatialMapTransform {
  zoom: number;
  x: number;
  y: number;
}

export interface MayadeenExchangePoint {
  x: number;
  y: number;
  z: number;
  frame: 'mayadeen-rh-m-z-up';
  frameVersion: string;
}

export interface SpatialRendererPoint {
  x: number;
  y: number;
  z: number;
  rendererFrame: string;
}

export interface SpatialViewState {
  projectId: string;
  eventId: string;
  venueId: string;
  mode: SpatialCommandMode;
  sourceLayerId: string;
  selectedEntityId: string | null;
  zoom: number;
  pan: { x: number; y: number };
  viewMode: SpatialCommandViewMode;
  visibleLayers: string[];
  opacity: Record<string, number>;
  collapsedPanels: {
    sourceLayers: boolean;
    context: boolean;
  };
  savedViewId: string | null;
  focusMode: boolean;
  filters: SpatialFilterId[];
}

export interface SpatialSavedView {
  savedViewId: string;
  labelAr: string;
  savedAt: string;
  state: SpatialViewState;
}

export interface SpatialMapAdapter {
  adapterId: string;
  rendererKind:
    | 'candidate-raster'
    | 'approved-vector'
    | 'three-dimensional-tiles'
    | 'bim'
    | 'openusd'
    | 'projection'
    | 'print'
    | 'physical-digital-twin';
  coordinateSpace: 'normalized-source-image' | 'approved-world-space';
  authorityCeiling: 'candidate-visual-anchor' | 'engineering-approved';
  projectAnchor(anchor: { x: number; y: number }): { leftPercent: number; topPercent: number };
  projectWorldPoint?: (point: MayadeenExchangePoint) => SpatialRendererPoint;
  clampTransform(
    transform: SpatialMapTransform,
    bounds: { minimumZoom: number; maximumZoom: number; viewportWidth: number; viewportHeight: number }
  ): SpatialMapTransform;
}

export interface SpatialMarkerLayout {
  candidateEntityId: string;
  clusterId: string | null;
  clusterSize: number;
  offsetX: number;
  offsetY: number;
  markerScale: number;
  labelVisible: boolean;
}

export interface SpatialMarkerLayoutViewport {
  width: number;
  height: number;
}

export const spatialFilterIdValues = [
  'experience-linked',
  'independent-landmarks',
  'conflicted',
  'unresolved',
  'founder-approved',
  'candidate-anchors',
  'missing-engineering-controls'
] as const;
export type SpatialFilterId = (typeof spatialFilterIdValues)[number];

export interface SpatialSearchResult {
  resultId: string;
  targetId: string;
  type: 'candidate-entity' | 'experience-object' | 'independent-landmark' | 'executive-blocker';
  nameAr: string;
  nameEn: string | null;
  aliases: string[];
  semanticStatus: SpatialSemanticStatus;
  spatialStatus: SpatialTruthStatus;
  engineeringStatus: SpatialEngineeringStatus;
  operationalStatus: SpatialOperationalStatus;
  hasAnchor: boolean;
  sourceAr: string;
  relationshipAr: string;
  candidateEntityId: string | null;
  experienceObjectId: string | null;
  blockerId: string | null;
  mode: SpatialCommandMode;
  sourceLayerId: string;
  searchText: string;
}
