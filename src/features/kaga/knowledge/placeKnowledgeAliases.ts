import { eventProposalPlaceById } from '../data/eventProposalPlaceWhitelist';
import { gardenById } from './gardens';
import type { SourceConfidence } from './knowledgeTypes';

export interface PlaceKnowledgeAlias {
  eventPlaceId: string;
  eventDisplayNameAr: string;
  knowledgeEntityId: string;
  knowledgeNameAr: string;
  matchMethod: 'exact-reviewed-name' | 'reviewed-source-variant';
  eventSourcePages: number[];
  knowledgeSourcePages: number[];
  sourcePages: {
    eventProposal: number[];
    knowledgeGuide: number[];
  };
  confidence: SourceConfidence;
}

const alias = (
  eventPlaceId: string,
  knowledgeEntityId: string,
  matchMethod: PlaceKnowledgeAlias['matchMethod'],
  confidence: SourceConfidence = 'exact',
): PlaceKnowledgeAlias => {
  const eventPlace = eventProposalPlaceById[eventPlaceId]!;
  const knowledge = gardenById[knowledgeEntityId]!;
  const eventSourcePages = [...eventPlace.eventSourcePages];
  const knowledgeSourcePages = [...new Set(knowledge.source.flatMap((source) => source.sourcePages))];
  return {
    eventPlaceId,
    eventDisplayNameAr: eventPlace.displayNameAr,
    knowledgeEntityId,
    knowledgeNameAr: knowledge.titleAr,
    matchMethod,
    eventSourcePages,
    knowledgeSourcePages,
    sourcePages: {
      eventProposal: eventSourcePages,
      knowledgeGuide: knowledgeSourcePages,
    },
    confidence,
  };
};

/** Explicit, reviewed joins only. Runtime name inference is intentionally absent. */
export const placeKnowledgeAliases: PlaceKnowledgeAlias[] = [
  alias('devonianGarden', 'devonianGarden', 'exact-reviewed-name'),
  alias('plioceneGarden', 'plioceneGarden', 'exact-reviewed-name'),
  alias('optionsGarden', 'optionsGarden', 'exact-reviewed-name'),
  alias('modernGarden', 'modernLifeGarden', 'reviewed-source-variant', 'high'),
  alias('natureGarden', 'natureGarden', 'reviewed-source-variant', 'high'),
];

export const placeKnowledgeAliasByEventPlaceId = Object.fromEntries(
  placeKnowledgeAliases.map((item) => [item.eventPlaceId, item]),
) as Record<string, PlaceKnowledgeAlias>;

export function getKnowledgeForEventPlace(eventPlaceId: string) {
  const explicitAlias = placeKnowledgeAliasByEventPlaceId[eventPlaceId];
  return explicitAlias ? gardenById[explicitAlias.knowledgeEntityId] : undefined;
}
