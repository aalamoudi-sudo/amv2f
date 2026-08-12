import type { JourneyId } from '../data/spatialTypes';
import { registeredJourneyById } from '../spatial/registeredJourneys';
import { legendaryBeatIndex } from './legendaryStoryGraph';
import type { LegendaryBeat } from './legendaryTypes';

function stopProgress(journeyId: JourneyId, stopId?: string) {
  if (!stopId) return 0;
  return registeredJourneyById[journeyId].stops.find((stop) => stop.stopId === stopId)?.pathProgress ?? 0;
}

export function journeyProgressForLegendaryBeat(
  story: LegendaryBeat[],
  beatId: string,
  cinematicProgress: number,
  journeyId: JourneyId = 'prince',
) {
  const index = legendaryBeatIndex(story, beatId);
  const beat = story[index]!;
  const previous = story[Math.max(0, index - 1)]!;
  const from = stopProgress(journeyId, previous.journeyStopId);
  const to = stopProgress(journeyId, beat.journeyStopId);
  const arrivalFraction = beat.type === 'movement' || beat.type === 'arrival' ? 1 : 0.32;
  const spatialProgress = Math.min(1, cinematicProgress / arrivalFraction);
  const eased = 1 - (1 - spatialProgress) ** 3;
  return from + (to - from) * eased;
}

export function mapFocusPercent(beat: LegendaryBeat) {
  const point = beat.mapFocus?.point;
  if (!point) return { x: 50, y: 50 };
  return {
    x: Number(((point[0] / 1703.16) * 100).toFixed(3)),
    y: Number(((point[1] / 1371.235) * 100).toFixed(3)),
  };
}
