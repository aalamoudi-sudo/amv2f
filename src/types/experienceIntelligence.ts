import type { OperationalStateContext, SpatialEntityId } from './spatial';

export const experienceSourceStatusValues = [
  'approved',
  'candidate',
  'provisional',
  'missing',
  'unlinked',
  'unapproved',
  'quarantined',
  'unknown'
] as const;

export type ExperienceSourceStatus = (typeof experienceSourceStatusValues)[number];
export type ExperienceGeometryStatus = 'mapped-approved' | 'mapped-provisional' | 'pending' | 'missing';
export type ExperienceContentStatus = 'available' | 'partial' | 'missing' | 'unknown';
export type ExperienceAuthoringStatus = 'candidate' | 'frozen-local' | 'activated-temporary';
export type ExperienceMode = 'experience-map' | 'executive-command' | 'visitor-story';
export type JourneyPlaybackStatus = 'idle' | 'playing' | 'paused' | 'stopped' | 'completed';

export interface LocalProvisionalPlanReference {
  localUri: string;
  sourceId: string;
  parentSourceId: string;
  parentSourceHash: string;
  previewContentHash: string;
  status: 'provisional';
  geometryAuthority: 'none';
  watermarkAr: string;
}

export interface ExperiencePoint {
  experiencePointId: string;
  relatedEntityId: SpatialEntityId;
  nameAr: string;
  nameEn: string;
  type: string;
  sequence: number;
  sourceStatus: ExperienceSourceStatus;
  sourceRefs: string[];
  geometryMappingStatus: ExperienceGeometryStatus;
  contentStatus: ExperienceContentStatus;
  experienceStatus: 'confirmed-logical' | 'candidate' | 'blocked' | 'unknown';
  audienceSegmentIds: string[];
  contentReferenceIds: string[];
  operationalOverlayIds: string[];
}

export interface VisitorJourney {
  journeyId: string;
  nameAr: string;
  nameEn: string;
  status: 'candidate' | 'approved' | 'unknown';
  journeyType: string;
  orderedStopIds: string[];
  routeId: string | null;
  routeAuthorityStatus: 'approved' | 'unapproved' | 'unknown';
  geometryStatus: ExperienceGeometryStatus;
  sourceRefs: string[];
  assumptions: string[];
}

export interface JourneyStop {
  stopId: string;
  experiencePointId: string;
  sequence: number;
  titleAr: string;
  titleEn: string;
  storyBeatId: string;
  transitionType: 'manual' | 'timed-candidate' | 'unknown';
  duration: number | null;
  durationAuthority: 'approved' | 'candidate' | 'unknown';
  geometryMappingStatus: ExperienceGeometryStatus;
}

export interface StoryBeat {
  storyBeatId: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  sourceStatus: ExperienceSourceStatus;
  contentReferenceIds: string[];
  operationalMessage: string | null;
  projectionFrameConfig: {
    layout: 'title-progress';
    showEventIdentity: boolean;
    showSourceDisclosure: boolean;
  };
}

export interface ExperienceOperationalOverlay {
  overlayId: string;
  relatedEntityIds: SpatialEntityId[];
  overlayType: 'source' | 'geometry' | 'evidence' | 'authority' | 'freeze-blocker' | 'missing-input';
  sourceStatus: ExperienceSourceStatus;
  dataStatus: ExperienceSourceStatus;
  trustStatus: ExperienceSourceStatus;
  displayRules: string[];
}

export interface ExperienceAudienceSegment {
  audienceSegmentId: string;
  labels: { ar: string; en: string };
  sourceStatus: ExperienceSourceStatus;
}

export interface ExperienceContentReference {
  contentReferenceId: string;
  sourceId: string;
  assetType: 'model-3d' | 'image' | 'video' | 'document' | 'unknown';
  status: ExperienceContentStatus;
  rights: string | null;
  version: string | null;
  contentHash: string | null;
  relatedEntityIds: SpatialEntityId[];
}

export interface ExperienceGovernanceSnapshot {
  confirmedLogicalEntityCount: number;
  unmappedEntityCount: number;
  freezeGateCount: number;
  blockedFreezeGateCount: number;
  quarantinedEvidenceCount: number;
  unresolvedProductionActorCount: number;
  unresolvedAuthorityCount: number;
  missingInputsAr: string[];
  cadStatusAr: string;
  candidate3dStatusAr: string;
}

export interface ExperienceIntelligencePack {
  schemaVersion: '1.0.0';
  packId: string;
  packageRole: 'experience' | 'demo' | 'reference';
  selectableFromLauncher: boolean;
  eventId: string;
  venueId: string;
  eventNameAr: string;
  eventNameEn: string;
  eventType: string;
  eventDate: string;
  dateAssumption: boolean;
  dateAssumptionMessageAr: string | null;
  version: string;
  stateContext: OperationalStateContext;
  authoringStatus: ExperienceAuthoringStatus;
  sourceRefs: string[];
  revision: number;
  contentHash: string;
  provisionalPlan: LocalProvisionalPlanReference | null;
  experiencePoints: ExperiencePoint[];
  visitorJourneys: VisitorJourney[];
  journeyStops: JourneyStop[];
  storyBeats: StoryBeat[];
  operationalOverlays: ExperienceOperationalOverlay[];
  audienceSegments: ExperienceAudienceSegment[];
  contentReferences: ExperienceContentReference[];
  governanceSnapshot: ExperienceGovernanceSnapshot;
}

export interface ExperienceValidationIssue {
  code: string;
  path: string;
  messageAr: string;
  blocking: boolean;
}

export interface ExperienceValidationResult {
  valid: boolean;
  issues: ExperienceValidationIssue[];
  pack: ExperienceIntelligencePack | null;
}

export interface ExperienceSessionState {
  mode: ExperienceMode;
  selectedExperiencePointId: string;
  currentStopIndex: number;
  playbackStatus: JourneyPlaybackStatus;
  projectionPreviewOpen: boolean;
}

export type ExperienceSessionAction =
  | { type: 'select-point'; experiencePointId: string }
  | { type: 'set-mode'; mode: ExperienceMode }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'previous' }
  | { type: 'next' }
  | { type: 'reset' }
  | { type: 'stop' }
  | { type: 'open-projection' }
  | { type: 'close-projection' };
