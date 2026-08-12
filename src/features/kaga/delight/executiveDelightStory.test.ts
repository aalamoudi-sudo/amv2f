import { describe, expect, it } from 'vitest';
import { journeyById } from '../data/journeys';
import { registeredJourneyById } from '../spatial/registeredJourneys';
import { delightActAt, executiveDelightActs, guestDelightSignatureStop, guestProgressAtDelightTime, signatureStopDecision, xrayAnnotations } from './executiveDelightStory';

describe('KAGA executive delight 90-second source contract', () => {
  it('uses the approved kinetic arc without temporal gaps', () => {
    expect(executiveDelightActs.map((act) => act.id)).toEqual(['majesty', 'discovery', 'journey', 'experience', 'depth', 'return', 'glimpse', 'tease']);
    expect(executiveDelightActs[0]!.startsAtMs).toBe(0);
    expect(executiveDelightActs.at(-1)!.endsAtMs).toBe(92_000);
    executiveDelightActs.slice(1).forEach((act, index) => expect(act.startsAtMs).toBe(executiveDelightActs[index]!.endsAtMs));
    executiveDelightActs.forEach((act) => expect(act.sourcePages.length).toBeGreaterThan(0));
  });

  it('uses the approved page-26 Guest Journey without changing source data', () => {
    expect(journeyById.guests.title).toBe('رحلة الضيوف');
    expect(journeyById.guests.source.pdfPages).toEqual([26]);
    expect(registeredJourneyById.guests.stops.map((stop) => stop.code).join('')).toBe('ABCDEFGHIJKL');
    expect(guestDelightSignatureStop.code).toBe('C');
    expect(guestDelightSignatureStop.durationMinutes).toBe(60);
    expect(signatureStopDecision.sourcePages).toEqual([25, 26, 27]);
  });

  it('arrives exactly at C, restores it, then advances on the same approved route toward D', () => {
    const stopD = registeredJourneyById.guests.stops.find((stop) => stop.code === 'D')!;
    expect(guestProgressAtDelightTime(0)).toBe(0);
    expect(guestProgressAtDelightTime(42_000)).toBe(guestDelightSignatureStop.pathProgress);
    expect(guestProgressAtDelightTime(75_999)).toBe(guestDelightSignatureStop.pathProgress);
    expect(guestProgressAtDelightTime(89_000)).toBe(stopD.pathProgress);
    expect(delightActAt(58_000).id).toBe('depth');
    expect(delightActAt(72_000).id).toBe('return');
  });

  it('keeps every X-Ray annotation source-backed', () => {
    expect(xrayAnnotations).toHaveLength(5);
    xrayAnnotations.forEach((annotation) => expect(annotation.sourcePages.length).toBeGreaterThan(0));
  });
});
