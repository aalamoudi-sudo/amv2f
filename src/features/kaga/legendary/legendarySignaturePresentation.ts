import { experiences } from '../data/experiences';
import { journeyById } from '../data/journeys';

export type LegendaryXrayCategory = 'location' | 'journey' | 'protocol' | 'experience' | 'related-content';

export interface LegendaryXrayAnnotation {
  id: string;
  category: LegendaryXrayCategory;
  labelAr: string;
  valueAr: string;
  anchor: readonly [number, number];
  labelPosition: readonly [number, number];
  sourcePages: number[];
}

const princeJourney = journeyById.prince;
const receptionStop = princeJourney.stops.find((stop) => stop.code === 'B');
const receptionExperience = experiences.find((experience) => experience.id === 'royal-arrival');

if (!receptionStop || !receptionExperience) {
  throw new Error('The approved Prince reception sources are required for the Legendary signature scene.');
}

const relatedContent = receptionStop.detailAr
  ?.split('\n')
  .filter((line) => line && !line.startsWith('('))
  .join(' · ') ?? '';

/**
 * Presentation-only annotation positions over the approved reception scene.
 * Labels and source pages are derived from existing approved KAGA entities.
 */
export const princeReceptionXrayAnnotations: LegendaryXrayAnnotation[] = [
  {
    id: 'reception-location',
    category: 'location',
    labelAr: 'الموقع',
    valueAr: `${receptionExperience.location} · ${receptionStop.code}`,
    anchor: [31, 72],
    labelPosition: [8, 80],
    sourcePages: receptionStop.source.pdfPages,
  },
  {
    id: 'reception-journey',
    category: 'journey',
    labelAr: 'الرحلة',
    valueAr: princeJourney.title,
    anchor: [56, 57],
    labelPosition: [69, 48],
    sourcePages: princeJourney.source.pdfPages,
  },
  {
    id: 'reception-protocol',
    category: 'protocol',
    labelAr: 'البروتوكول',
    valueAr: receptionStop.title,
    anchor: [39, 39],
    labelPosition: [7, 25],
    sourcePages: receptionStop.source.pdfPages,
  },
  {
    id: 'reception-experience',
    category: 'experience',
    labelAr: 'التجربة',
    valueAr: receptionExperience.title,
    anchor: [68, 34],
    labelPosition: [73, 19],
    sourcePages: receptionExperience.source.pdfPages,
  },
  {
    id: 'reception-related-content',
    category: 'related-content',
    labelAr: 'المحتوى المرتبط',
    valueAr: relatedContent,
    anchor: [72, 72],
    labelPosition: [67, 82],
    sourcePages: receptionStop.source.pdfPages,
  },
];
