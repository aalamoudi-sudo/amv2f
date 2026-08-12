import { describe, expect, it } from 'vitest';
import { gardens, projectFactById } from '../../knowledge';
import {
  crescentRegistration,
  executiveGardenRegistrations,
  gardenRegistrationById,
} from '../../spatial/gardenRegistration';
import { registeredJourneys, routeRegistrationAudit } from '../../spatial/registeredJourneys';

describe('KAGA V2 Gate 4/5 integration contract', () => {
  it('exposes only Event-Proposal-whitelisted evidence-backed footprints while retaining textual knowledge internally', () => {
    expect(executiveGardenRegistrations).toHaveLength(3);
    expect(executiveGardenRegistrations.every((registration) =>
      registration.confidence === 'exact' || registration.confidence === 'high')).toBe(true);
    expect(gardens.length).toBeGreaterThan(executiveGardenRegistrations.length);
    expect(gardens.every((garden) => gardenRegistrationById[garden.id])).toBe(true);
  });

  it('keeps the unresolved Crescent out of executable map geometry', () => {
    expect(crescentRegistration.confidence).toBe('unresolved');
    expect(crescentRegistration.footprintId).toBeUndefined();
    expect(executiveGardenRegistrations.some((registration) => registration.canonicalGardenId === 'crescentBuilding')).toBe(false);
  });

  it('preserves all six event journeys and rejects unsupported route promotion', () => {
    expect(registeredJourneys).toHaveLength(6);
    expect(routeRegistrationAudit).toHaveLength(6);
    expect(routeRegistrationAudit.every((entry) => entry.automaticShortestPathUsed === false)).toBe(true);
    expect(routeRegistrationAudit.find((entry) => entry.journeyId === 'workers')?.outcome).toBe('frozen-pathway-registered');
    expect(routeRegistrationAudit.filter((entry) => entry.journeyId !== 'workers').every((entry) => entry.outcome === 'preserved-event-authored')).toBe(true);
  });

  it('keeps project-scale values deterministic and bidi-safe at the data boundary', () => {
    expect(projectFactById['garden-area']?.displayValueAr).toBe('+2M م²');
    expect(projectFactById['plant-count']?.displayValueAr).toBe('+1M');
    expect(projectFactById['botanical-garden-count']?.displayValueAr).toBe('15');
    expect(projectFactById['internal-garden-count']?.value).toBe(7);
    expect(projectFactById['external-garden-count']?.value).toBe(8);
  });
});
