import type { EventRuntimeConfiguration } from './eventPackage';
import type { EventThemePackage } from './eventThemePackage';
import type { ProjectSourceReadinessSummary } from './sourceIntake';

export const projectStatusValues = ['draft', 'candidate', 'active', 'paused', 'completed', 'archived'] as const;
export type ProjectStatus = (typeof projectStatusValues)[number];

export const projectTruthContextValues = ['temporary-demo', 'baseline', 'scenario'] as const;
export type ProjectTruthContext = (typeof projectTruthContextValues)[number];

export const projectTypeValues = ['government-opening', 'exhibition', 'conference', 'festival', 'other'] as const;
export type ProjectType = (typeof projectTypeValues)[number];

export type ProjectSourceClassification = 'candidate-real' | 'demo' | 'reference';

export interface ProjectSourceReference {
  sourceId: string;
  classification: 'authoritative' | 'candidate' | 'provisional' | 'temporary-demo' | 'reference';
  statusAr: string;
  noteAr: string;
}

export interface ProjectOwner {
  organizationId: string;
  displayNameAr: string;
}

export interface ProjectDateRange {
  startAt: string | null;
  endAt: string | null;
  timeZone: string;
  assumption: boolean;
}

export interface ProjectWorkspace {
  projectId: string;
  organizationId: string;
  nameAr: string;
  nameEn: string;
  description: string;
  projectStatus: ProjectStatus;
  truthContext: ProjectTruthContext;
  projectType: ProjectType;
  eventIds: string[];
  venueIds: string[];
  defaultEventId: string;
  themeId: string;
  operationalPackIds: string[];
  sourceReferences: ProjectSourceReference[];
  owner: ProjectOwner;
  dateRange: ProjectDateRange;
  createdAt: string;
  updatedAt: string;
  revision: number;
  contentHash: string;
  sourceClassification: ProjectSourceClassification;
  sourceStateAr: string;
  sourceReadiness?: ProjectSourceReadinessSummary;
  portfolioPresentation?: {
    featured: boolean;
    coverUri: string | null;
    spatialCommandSummary?: {
      experienceObjectCount: number;
      openBlockerCount: number;
      fieldEvidenceStatusAr: string;
    };
    designSceneEntry?: {
      sceneAssetId: string;
      labelAr: string;
      authorityStatusAr: string;
    };
  };
}

export interface ProjectEventRecord {
  eventId: string;
  projectId: string;
  nameAr: string;
  nameEn: string;
  eventType: string;
  venueIds: string[];
  dateRange: ProjectDateRange;
  runtimePackageId: string | null;
  experiencePackId: string | null;
  experienceTwinPackId?: string | null;
  spatialCommandPackId: string | null;
  readinessPackId: string | null;
}

export interface ProjectVenueRecord {
  venueId: string;
  projectId: string;
  nameAr: string;
  nameEn: string;
  cadSourceIds: string[];
  geometryStatus: 'unavailable' | 'provisional' | 'approved';
}

export interface ProjectOperationalPackRecord {
  packId: string;
  projectId: string;
  eventId: string;
  kind: 'event-runtime' | 'experience' | 'experience-twin' | 'spatial-command' | 'readiness';
}

export interface ResolvedProjectConfiguration {
  project: ProjectWorkspace;
  event: ProjectEventRecord;
  venues: ProjectVenueRecord[];
  theme: EventThemePackage;
  runtime: EventRuntimeConfiguration | null;
  runtimeMode: 'event-package' | 'local-demo' | 'none';
  iotSourceIds: string[];
}
