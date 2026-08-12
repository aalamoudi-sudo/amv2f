import type { JourneyId } from '../../data/spatialTypes';
import type { LegendaryBeat } from '../legendaryTypes';
import { princeLegendaryStory } from '../prince/princeStory';
import { guestsLegendaryStory } from './guestsStory';
import { mayorMediaLegendaryStory } from './mayorMediaStory';
import { mayorLegendaryStory } from './mayorStory';
import { mediaLegendaryStory } from './mediaStory';
import { workersLegendaryStory } from './workersStory';

export const legendaryStories: Record<JourneyId, LegendaryBeat[]> = {
  workers: workersLegendaryStory,
  mayor: mayorLegendaryStory,
  prince: princeLegendaryStory,
  guests: guestsLegendaryStory,
  mayorMedia: mayorMediaLegendaryStory,
  media: mediaLegendaryStory,
};

export { workersLegendaryStory, mayorLegendaryStory, princeLegendaryStory, guestsLegendaryStory, mayorMediaLegendaryStory, mediaLegendaryStory };
