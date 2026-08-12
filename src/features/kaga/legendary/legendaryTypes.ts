import type { JourneyId, SourceReference } from '../data/spatialTypes';
import type { IllustratedMapReading } from '../illustratedMap/illustratedMapRegistration';
import type { AnchorConfidence, SpatialCoordinate } from '../spatial/registeredJourneys';

export type LegendaryMode = 'directed' | 'explore' | 'paused';
export type LegendaryLens = 'story' | 'place' | 'guest' | 'experience';
export type LegendaryBeatType =
  | 'opening'
  | 'arrival'
  | 'movement'
  | 'stop'
  | 'experience'
  | 'knowledge'
  | 'visual'
  | 'transition'
  | 'finale';

export interface LegendarySpatialFocus {
  point?: SpatialCoordinate;
  entityId?: string;
  anchorConfidence?: AnchorConfidence;
}

export interface LegendaryBeat {
  id: string;
  chapterAr: string;
  titleAr: string;
  narrativeAr: string;
  type: LegendaryBeatType;
  journeyStopId?: string;
  actualTime?: string;
  actualDurationMinutes?: number;
  presentationDurationMs: number;
  mapFocus?: LegendarySpatialFocus;
  visualAssetId?: string;
  experienceId?: string;
  knowledgeId?: string;
  autoRevealExperience?: boolean;
  connectsBeatIds?: string[];
  source: SourceReference[];
}

export interface LegendaryReturnContext {
  beatId: string;
  stopId?: string;
  cinematicProgress: number;
  spatialFocus?: LegendarySpatialFocus;
  mode: LegendaryMode;
}

export type LegendarySpatialQuery = 'what-happens' | 'where-does-this-happen';

export interface LegendarySession {
  journeyId: JourneyId;
  started: boolean;
  activeBeatId: string;
  activeStopId?: string;
  sourceEventTime?: string;
  cinematicProgress: number;
  spatialFocus?: LegendarySpatialFocus;
  activeExperienceId?: string;
  activeKnowledgeId?: string;
  inspectedStopId?: string;
  activeQuery?: LegendarySpatialQuery;
  mode: LegendaryMode;
  lens: LegendaryLens;
  returnContext?: LegendaryReturnContext;
  revealedExperienceBeatIds: string[];
  xrayEnabled: boolean;
  completed: boolean;
}

export type LegendaryDayId = 'day-01' | 'day-02' | 'day-03' | 'day-04';
export type LegendaryDirectorScope = 'journey' | 'inauguration';
export type LegendaryDirectorSurface =
  | 'opening'
  | 'scale'
  | 'place'
  | 'days'
  | 'journey'
  | 'royal'
  | 'launch'
  | 'experience'
  | 'finale';

export interface LegendaryGlobalChapter {
  id: string;
  titleAr: string;
  narrativeAr: string;
  surface: LegendaryDirectorSurface;
  dayId?: LegendaryDayId;
  journeyId?: JourneyId;
  stopId?: string;
  experienceId?: string;
  presentationDurationMs: number;
  source: SourceReference[];
}

export interface LegendarySystemReturnContext {
  dayId: LegendaryDayId;
  journeyId: JourneyId;
  activeBeatId: string;
  activeStopId?: string;
  cinematicProgress: number;
  spatialFocus?: LegendarySpatialFocus;
  lens: LegendaryLens;
  directorScope?: LegendaryDirectorScope;
  globalChapterId?: string;
  mapReading: IllustratedMapReading;
}

export interface LegendarySystemSession {
  dayId: LegendaryDayId;
  journeyId: JourneyId;
  activeBeatId: string;
  activeStopId?: string;
  cinematicProgress: number;
  spatialFocus?: LegendarySpatialFocus;
  activeExperienceId?: string;
  activeKnowledgeId?: string;
  activePlaceId?: string;
  mode: LegendaryMode;
  lens: LegendaryLens;
  directorScope?: LegendaryDirectorScope;
  globalChapterId?: string;
  returnContext?: LegendarySystemReturnContext;
  completed: boolean;
  evidenceMode: boolean;
  revealedBeatIds: string[];
  mapReading: IllustratedMapReading;
}

export interface LegendaryPlaceRelation {
  id: string;
  journeyId: JourneyId;
  stopId: string;
  titleAr: string;
  mapPoint: SpatialCoordinate;
  sourcePages: number[];
  dayIds: string[];
  journeyIds: JourneyId[];
  experienceIds: string[];
  knowledgeIds: string[];
  visualAssetIds: string[];
}
