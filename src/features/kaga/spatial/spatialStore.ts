import { create } from "zustand";
import { getJourneyTimeline, journeyById } from "../data/journeys";
import type { JourneyId, JourneyStop } from "../data/spatialTypes";

export const playbackSpeeds = [0.75, 1, 1.5] as const;
export type PlaybackSpeed = (typeof playbackSpeeds)[number];

interface SpatialState {
  activeJourneyId: JourneyId;
  activeBranchId: string | null;
  isPlaying: boolean;
  progress: number;
  speed: PlaybackSpeed;
  activeStopIndex: number;
  selectedStopId: string | null;
  focusRequest: number;
  resetRequest: number;
  selectJourney: (id: JourneyId) => void;
  selectBranch: (branchId: string | null) => void;
  play: () => void;
  pause: () => void;
  restart: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  setProgress: (progress: number) => void;
  previousStop: () => void;
  nextStop: () => void;
  selectStop: (id: string, branchId?: string) => void;
  focusRoute: () => void;
  resetMap: () => void;
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function activeStopIndexAtProgress(stops: JourneyStop[], progress: number) {
  let result = -1;
  for (let index = 0; index < stops.length; index += 1) {
    if (stops[index]!.pathProgress <= progress + 0.000_001) result = index;
    else break;
  }
  return result;
}

function timelineFor(state: Pick<SpatialState, "activeJourneyId" | "activeBranchId">) {
  return getJourneyTimeline(journeyById[state.activeJourneyId], state.activeBranchId);
}

export const useSpatialStore = create<SpatialState>((set, get) => ({
  activeJourneyId: "workers",
  activeBranchId: null,
  isPlaying: false,
  progress: 0,
  speed: 1,
  activeStopIndex: 0,
  selectedStopId: "STOP-7-A",
  focusRequest: 0,
  resetRequest: 0,
  selectJourney: (id) => {
    const firstStop = journeyById[id].stops[0];
    set({ activeJourneyId: id, activeBranchId: null, progress: firstStop?.pathProgress ?? 0, activeStopIndex: firstStop ? 0 : -1, selectedStopId: firstStop?.id ?? null, isPlaying: false, focusRequest: get().focusRequest + 1 });
  },
  selectBranch: (branchId) => {
    const journey = journeyById[get().activeJourneyId];
    const stops = getJourneyTimeline(journey, branchId);
    const initialProgress = branchId ? 0 : (stops[0]?.pathProgress ?? 0);
    const activeStopIndex = activeStopIndexAtProgress(stops, initialProgress);
    set({ activeBranchId: branchId, progress: initialProgress, activeStopIndex, selectedStopId: activeStopIndex >= 0 ? stops[activeStopIndex]!.id : null, isPlaying: false });
  },
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  restart: () => {
    const stops = timelineFor(get());
    const progress = get().activeBranchId ? 0 : (stops[0]?.pathProgress ?? 0);
    const activeStopIndex = activeStopIndexAtProgress(stops, progress);
    set({ progress, activeStopIndex, selectedStopId: activeStopIndex >= 0 ? stops[activeStopIndex]!.id : null, isPlaying: true });
  },
  setSpeed: (speed) => set({ speed }),
  setProgress: (rawProgress) => {
    const progress = clamp(rawProgress);
    const stops = timelineFor(get());
    const activeStopIndex = activeStopIndexAtProgress(stops, progress);
    set({
      progress,
      activeStopIndex,
      selectedStopId: activeStopIndex >= 0 ? stops[activeStopIndex]!.id : null,
      isPlaying: progress >= 1 ? false : get().isPlaying,
    });
  },
  previousStop: () => {
    const stops = timelineFor(get());
    const current = get().activeStopIndex;
    const activeStopIndex = Math.max(0, current <= 0 ? 0 : current - 1);
    const stop = stops[activeStopIndex];
    if (stop) set({ activeStopIndex, progress: stop.pathProgress, selectedStopId: stop.id, isPlaying: false });
  },
  nextStop: () => {
    const stops = timelineFor(get());
    const activeStopIndex = Math.min(stops.length - 1, get().activeStopIndex + 1);
    const stop = stops[activeStopIndex];
    if (stop) set({ activeStopIndex, progress: stop.pathProgress, selectedStopId: stop.id, isPlaying: false });
  },
  selectStop: (id, branchId) => {
    const journey = journeyById[get().activeJourneyId];
    const resolvedBranchId = branchId ?? null;
    const stops = getJourneyTimeline(journey, resolvedBranchId);
    const activeStopIndex = stops.findIndex((stop) => stop.id === id);
    const stop = stops[activeStopIndex];
    if (stop) set({ activeBranchId: resolvedBranchId, selectedStopId: id, activeStopIndex, progress: stop.pathProgress, isPlaying: false });
  },
  focusRoute: () => set({ focusRequest: get().focusRequest + 1 }),
  resetMap: () => set({ resetRequest: get().resetRequest + 1 }),
}));
