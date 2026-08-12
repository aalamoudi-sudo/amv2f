import type { JourneyId } from '../data/spatialTypes';
import { registeredJourneyById } from '../spatial/registeredJourneys';
import { legendaryBeatById, legendaryBeatIndex } from './legendaryStoryGraph';
import type { LegendaryBeat } from './legendaryTypes';

export function choreographyState(journeyId: JourneyId, story: LegendaryBeat[], beatId: string) {
  const beat = legendaryBeatById(story, beatId);
  const stop = registeredJourneyById[journeyId].stops.find((item) => item.stopId === beat.journeyStopId);
  const index = legendaryBeatIndex(story, beatId);
  return {
    beat,
    stop,
    previousBeat: story[Math.max(0, index - 1)],
    nextBeat: story[index + 1],
    chapterIndex: index,
    chapterCount: story.length,
  };
}
