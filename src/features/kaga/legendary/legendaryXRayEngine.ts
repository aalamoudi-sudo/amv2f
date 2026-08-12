import { experiences } from '../data/experiences';
import { journeyById } from '../data/journeys';
import type { JourneyId } from '../data/spatialTypes';
import type { LegendaryXrayAnnotation } from './legendarySignaturePresentation';

const positions = [
  { anchor: [28, 68], labelPosition: [6, 79] },
  { anchor: [54, 55], labelPosition: [68, 47] },
  { anchor: [39, 36], labelPosition: [7, 22] },
  { anchor: [70, 34], labelPosition: [73, 17] },
] as const;

export function xrayForExperience(journeyId: JourneyId, stopId: string, experienceId: string): LegendaryXrayAnnotation[] {
  const journey = journeyById[journeyId];
  const stop = journey.stops.find((item) => item.id === stopId);
  const experience = experiences.find((item) => item.id === experienceId);
  if (!stop || !experience) return [];
  const values = [
    ['location', 'الموقع', experience.location ?? stop.title],
    ['journey', 'الرحلة', journey.title],
    ['protocol', 'البروتوكول', stop.title],
    ['experience', 'التجربة', experience.title],
  ] as const;
  return values.map(([category, labelAr, valueAr], index) => ({
    id: `${journeyId}-${stopId}-${category}`,
    category,
    labelAr,
    valueAr,
    anchor: positions[index]!.anchor,
    labelPosition: positions[index]!.labelPosition,
    sourcePages: [...new Set([...stop.source.pdfPages, ...experience.source.pdfPages])],
  }));
}

export const xrayExperienceIds = new Set(['royal-arrival', 'garden-model', 'era-walk', 'press-conference', 'dinner']);
