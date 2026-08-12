import { assetById, assetManifest } from '../data/assets';
import { eventDays } from '../data/eventDays';
import { experiences } from '../data/experiences';
import { journeyById, journeys } from '../data/journeys';
import type { JourneyId } from '../data/spatialTypes';
import { gardenById } from '../knowledge';
import { registeredJourneys } from '../spatial/registeredJourneys';
import type { LegendaryPlaceRelation } from './legendaryTypes';

const experienceIds = new Set(experiences.map((experience) => experience.id));
const knowledgeIds = new Set(Object.keys(gardenById));
const visualIds = new Set(assetManifest.map((asset) => asset.id));
const mapVisualByJourney: Record<JourneyId, string> = {
  workers: 'workers-map', mayor: 'mayor-map', prince: 'prince-map', guests: 'guests-map', mayorMedia: 'mayor-media-map', media: 'media-map',
};
const visualByExperience: Record<string, string[]> = {
  reception: ['reception'], 'royal-arrival': ['saudi-ardah'], 'vip-area': ['vip-area'],
  'garden-model': ['garden-model'], 'era-walk': ['era-walk', 'era-walk-render'],
  'memory-corner': ['memory-corner'], memorial: ['memorial'], 'press-conference': ['press-conference'], dinner: ['dinner'],
};

export const legendaryPlaceRelations: LegendaryPlaceRelation[] = registeredJourneys.flatMap((registered) => {
  const journey = journeyById[registered.journeyId];
  const days = eventDays.filter((day) => day.journeyIds?.includes(registered.journeyId)).map((day) => day.id);
  return registered.stops.map((registeredStop) => {
    const sourceStop = journey.stops.find((stop) => stop.id === registeredStop.stopId)!;
    const stopExperienceIds = sourceStop.experienceId && experienceIds.has(sourceStop.experienceId) ? [sourceStop.experienceId] : [];
    const stopKnowledgeIds = registeredStop.physicalEntityId && knowledgeIds.has(registeredStop.physicalEntityId) ? [registeredStop.physicalEntityId] : [];
    const visuals = [mapVisualByJourney[registered.journeyId], ...stopExperienceIds.flatMap((id) => visualByExperience[id] ?? [])]
      .filter((id, index, values) => visualIds.has(id) && values.indexOf(id) === index);
    return {
      id: `${registered.journeyId}:${registeredStop.stopId}`,
      journeyId: registered.journeyId,
      stopId: registeredStop.stopId,
      titleAr: registeredStop.eventLabel,
      mapPoint: registeredStop.mapPoint,
      sourcePages: registeredStop.eventSourcePages,
      dayIds: days,
      journeyIds: [registered.journeyId],
      experienceIds: stopExperienceIds,
      knowledgeIds: stopKnowledgeIds,
      visualAssetIds: visuals,
    };
  });
});

const relationsForPhysicalEntity = (entityId: string) => legendaryPlaceRelations.filter((relation) => {
  const stop = registeredJourneys.flatMap((journey) => journey.stops).find((item) => item.stopId === relation.stopId);
  return stop?.physicalEntityId === entityId;
});

export function relationForStop(stopId?: string, journeyId?: JourneyId) {
  if (!stopId) return undefined;
  return legendaryPlaceRelations.find((relation) => relation.stopId === stopId && (!journeyId || relation.journeyId === journeyId));
}

export function relationsForPlace(placeId: string) {
  const direct = legendaryPlaceRelations.filter((relation) => relation.id === placeId || relation.stopId === placeId);
  return direct.length ? direct : relationsForPhysicalEntity(placeId);
}

const unique = <T,>(values: T[]) => [...new Set(values)];
export const daysForPlace = (placeId: string) => unique(relationsForPlace(placeId).flatMap((relation) => relation.dayIds));
export const journeysForPlace = (placeId: string): JourneyId[] => unique(relationsForPlace(placeId).map((relation) => relation.journeyId));
export const stopsForPlace = (placeId: string) => relationsForPlace(placeId);
export const experiencesForPlace = (placeId: string) => unique(relationsForPlace(placeId).flatMap((relation) => relation.experienceIds)).map((id) => experiences.find((item) => item.id === id)!);
export const experiencesForStop = (stopId: string) => experiencesForPlace(stopId);
export const visualsForPlace = (placeId: string) => unique(relationsForPlace(placeId).flatMap((relation) => relation.visualAssetIds)).map((id) => assetById.get(id)!);
export const knowledgeForPlace = (placeId: string) => unique(relationsForPlace(placeId).flatMap((relation) => relation.knowledgeIds)).map((id) => gardenById[id]!);
// L1 compatibility: the approved Prince proof resolves only within its own
// authored spatial story. Project-wide queries use placesForExperience below.
export const placeForExperience = (experienceId: string) => legendaryPlaceRelations.find((relation) => relation.journeyId === 'prince' && relation.experienceIds.includes(experienceId));
export const placesForExperience = (experienceId: string) => legendaryPlaceRelations.filter((relation) => relation.experienceIds.includes(experienceId));

export function whenPlaceUsed(placeId: string) {
  return journeysForPlace(placeId).map((journeyId) => ({
    journeyId,
    journeyTitleAr: journeyById[journeyId].title,
    dayIds: eventDays.filter((day) => day.journeyIds?.includes(journeyId)).map((day) => day.id),
    sourcedWindowAr: journeyById[journeyId].window,
    sourcePages: journeyById[journeyId].source.pdfPages,
  }));
}

export function contextForExperience(experienceId: string) {
  const places = placesForExperience(experienceId);
  return {
    who: unique(places.map((place) => place.journeyId)).map((journeyId) => journeyById[journeyId]),
    when: unique(places.flatMap((place) => place.dayIds)).map((id) => eventDays.find((day) => day.id === id)!),
    where: places,
  };
}

export function validateLegendaryCrossIndex() {
  legendaryPlaceRelations.forEach((relation) => {
    if (!journeys.some((journey) => journey.id === relation.journeyId)) throw new Error(`Unknown Legendary journey: ${relation.journeyId}`);
    relation.experienceIds.forEach((id) => { if (!experienceIds.has(id)) throw new Error(`Unknown Legendary experience relationship: ${id}`); });
    relation.knowledgeIds.forEach((id) => { if (!knowledgeIds.has(id)) throw new Error(`Unknown Legendary knowledge relationship: ${id}`); });
    relation.visualAssetIds.forEach((id) => { if (!visualIds.has(id)) throw new Error(`Unknown Legendary visual relationship: ${id}`); });
  });
  return true;
}
