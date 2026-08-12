import { create } from 'zustand';
import { legendaryBeatById, nextLegendaryBeat } from './legendaryStoryGraph';
import type { LegendaryLens, LegendarySession, LegendarySpatialQuery } from './legendaryTypes';
import { princeJourneyWindow, princeLegendaryStory } from './prince/princeStory';

const firstBeat = princeLegendaryStory[0]!;

export const initialLegendarySession: LegendarySession = {
  journeyId: 'prince',
  started: false,
  activeBeatId: firstBeat.id,
  activeStopId: firstBeat.journeyStopId,
  sourceEventTime: princeJourneyWindow,
  cinematicProgress: 0,
  spatialFocus: firstBeat.mapFocus,
  mode: 'paused',
  lens: 'guest',
  revealedExperienceBeatIds: [],
  xrayEnabled: false,
  completed: false,
};

interface LegendaryActions {
  startDirector: () => void;
  setCinematicProgress: (progress: number) => void;
  advanceBeat: () => void;
  previousBeat: () => void;
  pause: () => void;
  interrupt: () => void;
  resume: () => void;
  inspectStop: (stopId: string) => void;
  openExperience: (experienceId: string) => void;
  openKnowledge: (knowledgeId: string) => void;
  returnToJourney: () => void;
  showQuery: (query?: LegendarySpatialQuery) => void;
  toggleXray: () => void;
  setLens: (lens: LegendaryLens) => void;
  complete: () => void;
  restart: () => void;
  reset: () => void;
}

const returnContext = (state: LegendarySession) => state.returnContext ?? {
  beatId: state.activeBeatId,
  stopId: state.activeStopId,
  cinematicProgress: state.cinematicProgress,
  spatialFocus: state.spatialFocus,
  mode: state.mode,
};

export const useLegendaryStore = create<LegendarySession & LegendaryActions>((set, get) => ({
  ...initialLegendarySession,
  startDirector: () => set({ ...initialLegendarySession, started: true, mode: 'directed' }),
  setCinematicProgress: (progress) => set({ cinematicProgress: Math.max(0, Math.min(1, progress)) }),
  advanceBeat: () => {
    const state = get();
    const next = nextLegendaryBeat(princeLegendaryStory, state.activeBeatId);
    if (!next) {
      set({ cinematicProgress: 1, mode: 'paused', completed: true });
      return;
    }
    set({
      activeBeatId: next.id,
      activeStopId: next.journeyStopId,
      inspectedStopId: undefined,
      cinematicProgress: 0,
      spatialFocus: next.mapFocus,
      activeExperienceId: undefined,
      activeKnowledgeId: undefined,
      activeQuery: undefined,
      xrayEnabled: false,
      completed: false,
    });
  },
  previousBeat: () => {
    const state = get();
    const index = Math.max(0, princeLegendaryStory.findIndex((beat) => beat.id === state.activeBeatId) - 1);
    const previous = princeLegendaryStory[index]!;
    set({ activeBeatId: previous.id, activeStopId: previous.journeyStopId, cinematicProgress: 0, spatialFocus: previous.mapFocus, mode: 'paused', completed: false });
  },
  pause: () => set({ mode: 'paused' }),
  interrupt: () => {
    const state = get();
    set({ returnContext: returnContext(state), mode: 'explore', activeQuery: undefined });
  },
  resume: () => {
    const state = get();
    const context = state.returnContext;
    set(context ? {
      activeBeatId: context.beatId,
      activeStopId: context.stopId,
      cinematicProgress: context.cinematicProgress,
      spatialFocus: context.spatialFocus,
      mode: 'directed',
      returnContext: undefined,
      activeExperienceId: undefined,
      activeKnowledgeId: undefined,
      activeQuery: undefined,
      xrayEnabled: false,
    } : { mode: 'directed' });
  },
  inspectStop: (stopId) => set({ activeStopId: stopId, inspectedStopId: stopId, activeQuery: undefined }),
  openExperience: (experienceId) => {
    const state = get();
    set({
      returnContext: returnContext(state),
      activeExperienceId: experienceId,
      activeKnowledgeId: undefined,
      activeQuery: undefined,
      mode: 'explore',
      revealedExperienceBeatIds: state.revealedExperienceBeatIds.includes(state.activeBeatId)
        ? state.revealedExperienceBeatIds
        : [...state.revealedExperienceBeatIds, state.activeBeatId],
    });
  },
  openKnowledge: (knowledgeId) => {
    const state = get();
    set({ returnContext: returnContext(state), activeKnowledgeId: knowledgeId, activeExperienceId: undefined, activeQuery: undefined, mode: 'explore' });
  },
  returnToJourney: () => {
    const state = get();
    const context = state.returnContext;
    set(context ? {
      activeBeatId: context.beatId,
      activeStopId: context.stopId,
      cinematicProgress: context.cinematicProgress,
      spatialFocus: context.spatialFocus,
      activeExperienceId: undefined,
      activeKnowledgeId: undefined,
      activeQuery: undefined,
      xrayEnabled: false,
      mode: 'paused',
    } : { activeExperienceId: undefined, activeKnowledgeId: undefined, activeQuery: undefined, xrayEnabled: false, mode: 'paused' });
  },
  showQuery: (query) => set({ activeQuery: query, activeExperienceId: undefined, activeKnowledgeId: undefined, mode: 'explore' }),
  toggleXray: () => set((state) => ({ xrayEnabled: !state.xrayEnabled })),
  setLens: (lens) => set({ lens }),
  complete: () => set({ completed: true, cinematicProgress: 1, mode: 'paused', activeExperienceId: undefined, activeKnowledgeId: undefined }),
  restart: () => set({ ...initialLegendarySession, started: true, mode: 'directed' }),
  reset: () => set({ ...initialLegendarySession }),
}));

export function currentLegendaryBeat() {
  return legendaryBeatById(princeLegendaryStory, useLegendaryStore.getState().activeBeatId);
}
