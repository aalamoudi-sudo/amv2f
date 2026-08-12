import { create } from 'zustand';
import { eventDays } from '../data/eventDays';
import type { JourneyId } from '../data/spatialTypes';
import type { IllustratedMapReading } from '../illustratedMap/illustratedMapRegistration';
import { registeredJourneyById } from '../spatial/registeredJourneys';
import { inaugurationLegendaryStory } from './globalDirectorStory';
import { legendaryStories } from './journeys';
import { nextLegendaryBeat, previousLegendaryBeat } from './legendaryStoryGraph';
import type { LegendaryDayId, LegendaryLens, LegendarySystemReturnContext, LegendarySystemSession } from './legendaryTypes';

const firstStory = legendaryStories.prince;
const firstBeat = firstStory[0]!;

export const initialLegendarySystemSession: LegendarySystemSession = {
  dayId: 'day-03',
  journeyId: 'prince',
  activeBeatId: firstBeat.id,
  activeStopId: firstBeat.journeyStopId,
  cinematicProgress: 0,
  spatialFocus: firstBeat.mapFocus,
  mode: 'paused',
  lens: 'story',
  completed: false,
  evidenceMode: false,
  revealedBeatIds: [],
  mapReading: 'masterplan',
};

interface LegendarySystemActions {
  selectDay: (dayId: LegendaryDayId) => void;
  selectJourney: (journeyId: JourneyId) => void;
  setLens: (lens: LegendaryLens) => void;
  startJourneyDirector: (journeyId?: JourneyId) => void;
  startGlobalDirector: () => void;
  advance: () => void;
  previous: () => void;
  pauseForExplore: () => void;
  resume: () => void;
  setProgress: (progress: number) => void;
  openExperience: (experienceId: string) => void;
  openKnowledge: (knowledgeId: string) => void;
  focusPlace: (placeId: string, stopId?: string) => void;
  returnToContext: () => void;
  toggleEvidence: () => void;
  setMapReading: (reading: IllustratedMapReading) => void;
  reset: () => void;
}

const snapshot = (state: LegendarySystemSession): LegendarySystemReturnContext => ({
  dayId: state.dayId,
  journeyId: state.journeyId,
  activeBeatId: state.activeBeatId,
  activeStopId: state.activeStopId,
  cinematicProgress: state.cinematicProgress,
  spatialFocus: state.spatialFocus,
  lens: state.lens,
  directorScope: state.directorScope,
  globalChapterId: state.globalChapterId,
  mapReading: state.mapReading,
});

const dayForJourney = (journeyId: JourneyId): LegendaryDayId =>
  (eventDays.find((day) => day.journeyIds?.includes(journeyId))?.id ?? 'day-03') as LegendaryDayId;

export const useLegendarySystemStore = create<LegendarySystemSession & LegendarySystemActions>((set, get) => ({
  ...initialLegendarySystemSession,
  selectDay: (dayId) => {
    const current = get();
    const day = eventDays.find((item) => item.id === dayId);
    const journeyId = (day?.journeyIds?.includes(current.journeyId) ? current.journeyId : day?.journeyIds?.[0] ?? current.journeyId) as JourneyId;
    const beat = legendaryStories[journeyId][0]!;
    set({ dayId, journeyId, activeBeatId: beat.id, activeStopId: beat.journeyStopId, spatialFocus: beat.mapFocus, cinematicProgress: 0, completed: false });
  },
  selectJourney: (journeyId) => {
    const beat = legendaryStories[journeyId][0]!;
    set({ journeyId, dayId: dayForJourney(journeyId), activeBeatId: beat.id, activeStopId: beat.journeyStopId, spatialFocus: beat.mapFocus, cinematicProgress: 0, completed: false, activeExperienceId: undefined, activeKnowledgeId: undefined, activePlaceId: undefined });
  },
  setLens: (lens) => set({ lens }),
  startJourneyDirector: (requestedJourney) => {
    const journeyId = requestedJourney ?? get().journeyId;
    const beat = legendaryStories[journeyId][0]!;
    set({ journeyId, dayId: dayForJourney(journeyId), activeBeatId: beat.id, activeStopId: beat.journeyStopId, spatialFocus: beat.mapFocus, cinematicProgress: 0, mode: 'directed', directorScope: 'journey', globalChapterId: undefined, completed: false });
  },
  startGlobalDirector: () => {
    const chapter = inaugurationLegendaryStory[0]!;
    set({ ...initialLegendarySystemSession, mode: 'directed', directorScope: 'inauguration', globalChapterId: chapter.id, completed: false });
  },
  advance: () => {
    const state = get();
    if (state.directorScope === 'inauguration') {
      const index = inaugurationLegendaryStory.findIndex((chapter) => chapter.id === state.globalChapterId);
      const chapter = inaugurationLegendaryStory[index + 1];
      if (!chapter) { set({ completed: true, mode: 'paused', cinematicProgress: 1 }); return; }
      const journeyId = chapter.journeyId ?? state.journeyId;
      const story = legendaryStories[journeyId];
      const beat = chapter.stopId ? story.find((item) => item.journeyStopId === chapter.stopId) ?? story[0]! : story[0]!;
      set({
        globalChapterId: chapter.id,
        dayId: chapter.dayId ?? state.dayId,
        journeyId,
        activeBeatId: beat.id,
        activeStopId: chapter.stopId ?? beat.journeyStopId,
        spatialFocus: beat.mapFocus,
        activeExperienceId: chapter.experienceId,
        cinematicProgress: 0,
      });
      return;
    }
    const story = legendaryStories[state.journeyId];
    const next = nextLegendaryBeat(story, state.activeBeatId);
    if (!next) { set({ completed: true, mode: 'paused', cinematicProgress: 1 }); return; }
    set({ activeBeatId: next.id, activeStopId: next.journeyStopId, spatialFocus: next.mapFocus, cinematicProgress: 0, activeExperienceId: undefined, activeKnowledgeId: undefined });
  },
  previous: () => {
    const state = get();
    if (state.directorScope === 'inauguration') {
      const index = Math.max(0, inaugurationLegendaryStory.findIndex((chapter) => chapter.id === state.globalChapterId) - 1);
      set({ globalChapterId: inaugurationLegendaryStory[index]!.id, cinematicProgress: 0, mode: 'paused' });
      return;
    }
    const previous = previousLegendaryBeat(legendaryStories[state.journeyId], state.activeBeatId)!;
    set({ activeBeatId: previous.id, activeStopId: previous.journeyStopId, spatialFocus: previous.mapFocus, cinematicProgress: 0, mode: 'paused', completed: false });
  },
  pauseForExplore: () => set((state) => ({ returnContext: snapshot(state), mode: 'explore' })),
  resume: () => {
    const state = get();
    const context = state.returnContext;
    set(context ? { ...context, mode: 'directed', returnContext: undefined, activeExperienceId: undefined, activeKnowledgeId: undefined, activePlaceId: undefined } : { mode: 'directed' });
  },
  setProgress: (cinematicProgress) => set({ cinematicProgress: Math.max(0, Math.min(1, cinematicProgress)) }),
  openExperience: (activeExperienceId) => set((state) => ({ returnContext: state.returnContext ?? snapshot(state), activeExperienceId, activeKnowledgeId: undefined, mode: 'explore', lens: 'experience', revealedBeatIds: state.revealedBeatIds.includes(state.activeBeatId) ? state.revealedBeatIds : [...state.revealedBeatIds, state.activeBeatId] })),
  openKnowledge: (activeKnowledgeId) => set((state) => ({ returnContext: state.returnContext ?? snapshot(state), activeKnowledgeId, activeExperienceId: undefined, mode: 'explore', lens: 'place' })),
  focusPlace: (activePlaceId, activeStopId) => {
    const state = get();
    const stop = activeStopId ? registeredJourneyById[state.journeyId].stops.find((item) => item.stopId === activeStopId) : undefined;
    set({ activePlaceId, activeStopId: activeStopId ?? state.activeStopId, spatialFocus: stop ? { point: stop.mapPoint, entityId: stop.physicalEntityId, anchorConfidence: stop.anchorConfidence } : state.spatialFocus, lens: 'place' });
  },
  returnToContext: () => {
    const context = get().returnContext;
    set(context ? { ...context, mode: 'paused', returnContext: undefined, activeExperienceId: undefined, activeKnowledgeId: undefined, activePlaceId: undefined } : { activeExperienceId: undefined, activeKnowledgeId: undefined, activePlaceId: undefined });
  },
  toggleEvidence: () => set((state) => ({ evidenceMode: !state.evidenceMode })),
  setMapReading: (mapReading) => set({ mapReading }),
  reset: () => set({ ...initialLegendarySystemSession }),
}));
