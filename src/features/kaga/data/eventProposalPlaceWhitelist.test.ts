import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { illustratedRegisteredHotspots } from '../illustratedMap/illustratedMapRegistration';
import { gardenById, gardens } from '../knowledge/gardens';
import {
  getKnowledgeForEventPlace,
  placeKnowledgeAliasByEventPlaceId,
  placeKnowledgeAliases,
} from '../knowledge/placeKnowledgeAliases';
import { executiveGardenRegistrations } from '../spatial/gardenRegistration';
import { pointToRegisteredRouteDistance, registeredJourneys } from '../spatial/registeredJourneys';
import { journeyById, journeys } from './journeys';
import {
  eventProposalExecutiveGardenIds,
  eventProposalExecutiveGardens,
  eventProposalMappedExecutiveGardenIds,
  eventProposalPlaceById,
  getEventProposalPlaceForStop,
  journeyStopPlaceIds,
} from './eventProposalPlaceWhitelist';

const exactGuestStops = [
  ['A', 'المدخل الرئيسي', undefined],
  ['B', 'نقطة النزول وإركاب عربات الجولف', undefined],
  ['C', 'الاستقبال والعرضة السعودية', 60],
  ['D', 'بداية الجولة التعريفية - حديقة الخيارات', 6],
  ['E', 'الحديقة البليوسينية', 6],
  ['F', 'ممر العصور', 4],
  ['G', 'الحديقة العائلية', 6],
  ['H', 'الحديقة الديفونية', 6],
  ['I', 'الحديقة الحديثة', 6],
  ['J', 'نقطة نهاية الرحلة', undefined],
  ['K', 'تسليم الهدايا', 5],
  ['L', 'مسار خروج رحلة الضيوف', undefined],
] as const;

describe('Event Proposal authoritative place model', () => {
  it('whitelists only Event Proposal gardens with explicit source pages', () => {
    expect(eventProposalExecutiveGardens.map((place) => place.displayNameAr)).toEqual([
      'حديقة الخيارات',
      'الحديقة البليوسينية',
      'الحديقة العائلية',
      'الحديقة الديفونية',
      'الحديقة الحديثة',
      'حديقة الطبيعة',
    ]);
    expect(eventProposalExecutiveGardens.every((place) => place.eventSourcePages.length > 0)).toBe(true);
  });

  it('keeps Knowledge-Guide-only and Illustrator-only gardens out of executive map and Explorer', () => {
    const executiveIds = executiveGardenRegistrations.map((registration) => registration.canonicalGardenId);
    expect(executiveIds).toEqual(['devonianGarden', 'plioceneGarden', 'optionsGarden']);
    expect(illustratedRegisteredHotspots.map((hotspot) => hotspot.id)).toEqual(executiveIds);
    ['butterflyGarden', 'aviaryGarden', 'mazeGarden', 'soundLightGarden', 'waterGarden'].forEach((id) => {
      expect(eventProposalExecutiveGardenIds.has(id)).toBe(false);
      expect(executiveIds).not.toContain(id);
    });
    expect(gardens.some((garden) => garden.id === 'butterflyGarden')).toBe(true);
  });

  it('uses explicit reviewed knowledge aliases and never fuzzy runtime matching', () => {
    expect(placeKnowledgeAliases.every((item) => eventProposalPlaceById[item.eventPlaceId])).toBe(true);
    expect(placeKnowledgeAliases.every((item) => gardenById[item.knowledgeEntityId])).toBe(true);
    expect(placeKnowledgeAliases.every((item) => item.sourcePages.eventProposal.length > 0)).toBe(true);
    expect(placeKnowledgeAliases.every((item) => item.sourcePages.knowledgeGuide.length > 0)).toBe(true);
    expect(placeKnowledgeAliasByEventPlaceId.modernGarden).toMatchObject({
      eventDisplayNameAr: 'الحديقة الحديثة',
      knowledgeEntityId: 'modernLifeGarden',
      knowledgeNameAr: 'حديقة الحياة الحديثة',
      matchMethod: 'reviewed-source-variant',
    });
    expect(getKnowledgeForEventPlace('not-an-approved-place')).toBeUndefined();
    const source = readFileSync('src/features/kaga/knowledge/placeKnowledgeAliases.ts', 'utf8');
    expect(source).not.toMatch(/fuzzy|levenshtein|localeCompare|normalize\(/i);
  });

  it('keeps Family Garden valid but without invented Knowledge Guide fields', () => {
    expect(eventProposalPlaceById.familyGarden).toMatchObject({
      displayNameAr: 'الحديقة العائلية',
      executiveStatus: 'UNMAPPED',
      executiveMapEligible: false,
    });
    expect(placeKnowledgeAliasByEventPlaceId.familyGarden).toBeUndefined();
    expect(getKnowledgeForEventPlace('familyGarden')).toBeUndefined();
  });

  it('never gives an unmapped place a fabricated executive hotspot', () => {
    const hotspotIds = new Set(illustratedRegisteredHotspots.map((hotspot) => hotspot.id));
    eventProposalExecutiveGardens
      .filter((place) => place.locationConfidence === 'unmapped')
      .forEach((place) => expect(hotspotIds.has(place.id)).toBe(false));
    expect([...eventProposalMappedExecutiveGardenIds].sort()).toEqual([...hotspotIds].sort());
  });

  it('maps every primary and optional stop to one canonical Event Proposal place', () => {
    journeys.forEach((journey) => {
      [...journey.stops, ...(journey.optionalBranches ?? []).flatMap((branch) => branch.stops)].forEach((stop) => {
        const place = getEventProposalPlaceForStop(journey.id, stop.code);
        expect(place, `${journey.id}:${stop.code}`).toBeDefined();
        expect(place?.eventSourcePages).toContain(stop.source.pdfPages[0]);
      });
    });
  });

  it('uses one canonical physical entity across all journeys for shared registered gardens', () => {
    ['devonianGarden', 'plioceneGarden', 'optionsGarden'].forEach((placeId) => {
      const registrations = registeredJourneys.flatMap((journey) => journey.stops)
        .filter((stop) => stop.canonicalPlaceId === placeId);
      expect(registrations.length).toBeGreaterThan(1);
      expect(new Set(registrations.map((stop) => stop.physicalEntityId))).toEqual(new Set([placeId]));
      registrations.forEach((stop) => {
        const route = registeredJourneys.find((journey) => journey.journeyId === stop.journeyId)!;
        expect(pointToRegisteredRouteDistance(stop.mapPoint, route)).toBeLessThan(0.001);
      });
    });
  });

  it('preserves Guest page 26 exactly with no added or substituted stop', () => {
    const guests = journeyById.guests;
    expect(guests.title).toBe('رحلة الضيوف');
    expect(guests.window).toBe('من 05:30 م إلى 07:30 م');
    expect(guests.stops.map((stop) => [stop.code, stop.title, stop.durationMinutes])).toEqual(exactGuestStops);
    expect(guests.stops.find((stop) => stop.code === 'C')?.detailAr).toContain('مجسم الحدائق');
    expect(guests.stops.find((stop) => stop.code === 'C')?.detailAr).toContain('النصب التذكاري');
    expect(guests.stops.find((stop) => stop.code === 'I')?.title).not.toBe('حديقة الحياة الحديثة');
  });

  it('preserves optional branches as optional canonical relationships', () => {
    expect(journeyStopPlaceIds.workers.P).toBe('natureGarden');
    expect(journeyStopPlaceIds.media.Q).toBe('natureGarden');
    expect(journeyById.workers.stops.some((stop) => stop.code === 'P')).toBe(false);
    expect(journeyById.media.stops.some((stop) => stop.code === 'Q')).toBe(false);
  });
});
