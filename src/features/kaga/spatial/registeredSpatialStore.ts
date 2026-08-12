import { create } from 'zustand';
import type { JourneyId } from '../data/spatialTypes';
import { activeRegisteredStopIndex, registeredJourneyById } from './registeredJourneys';

interface RegisteredSpatialState {
  journeyId: JourneyId;
  progress: number;
  playing: boolean;
  selectedStopIndex: number;
  selectJourney: (journeyId: JourneyId) => void;
  setProgress: (progress: number) => void;
  play: () => void;
  pause: () => void;
  restart: () => void;
  nextStop: () => void;
  previousStop: () => void;
  selectStop: (index: number) => void;
}

export const useRegisteredSpatialStore = create<RegisteredSpatialState>((set, get) => ({
  journeyId: 'workers',
  progress: 0,
  playing: false,
  selectedStopIndex: 0,
  selectJourney: (journeyId) => set({ journeyId, progress: 0, playing: false, selectedStopIndex: 0 }),
  setProgress: (progress) => {
    const bounded = Math.max(0, Math.min(1, progress));
    const journey = registeredJourneyById[get().journeyId];
    set({ progress: bounded, selectedStopIndex: activeRegisteredStopIndex(journey, bounded) });
  },
  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  restart: () => set({ progress: 0, playing: false, selectedStopIndex: 0 }),
  nextStop: () => {
    const state = get();
    const journey = registeredJourneyById[state.journeyId];
    const nextIndex = Math.min(journey.stops.length - 1, state.selectedStopIndex + 1);
    set({ progress: journey.stops[nextIndex]!.pathProgress, selectedStopIndex: nextIndex, playing: false });
  },
  previousStop: () => {
    const state = get();
    const journey = registeredJourneyById[state.journeyId];
    const previousIndex = Math.max(0, state.selectedStopIndex - 1);
    set({ progress: journey.stops[previousIndex]!.pathProgress, selectedStopIndex: previousIndex, playing: false });
  },
  selectStop: (index) => {
    const state = get();
    const journey = registeredJourneyById[state.journeyId];
    const bounded = Math.max(0, Math.min(journey.stops.length - 1, index));
    set({ progress: journey.stops[bounded]!.pathProgress, selectedStopIndex: bounded, playing: false });
  },
}));
