import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { illustratedMapRegistration } from '../illustratedMap/illustratedMapRegistration';
import { activeRegisteredStopIndex } from '../spatial/registeredJourneys';
import {
  guestDelightJourney,
  guestProgressAtDelightTime,
  kineticDramaturgyStates,
  kineticStateAt,
  xrayAnnotations,
} from './executiveDelightStory';
import { kineticMotion } from './kineticMotion';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

describe('KAGA kinetic dramaturgy', () => {
  it('evolves the major composition at least every six seconds', () => {
    expect(kineticDramaturgyStates[0]?.startsAtMs).toBe(0);
    expect(kineticDramaturgyStates.at(-1)?.endsAtMs).toBe(92_000);

    kineticDramaturgyStates.forEach((state, index) => {
      expect(state.endsAtMs - state.startsAtMs).toBeLessThanOrEqual(6_000);
      if (index > 0) expect(state.startsAtMs).toBe(kineticDramaturgyStates[index - 1]?.endsAtMs);
    });

    const samples = Array.from({ length: 47 }, (_, index) => kineticStateAt(index * 2_000).id);
    let unchangedSamples = 1;
    samples.forEach((sample, index) => {
      if (index === 0) return;
      unchangedSamples = sample === samples[index - 1] ? unchangedSamples + 1 : 1;
      expect(unchangedSamples).toBeLessThanOrEqual(3);
    });
  });

  it('uses five compact, source-backed X-Ray beats', () => {
    const xrayStates = kineticDramaturgyStates.filter((state) => state.id.startsWith('xray-'));
    expect(xrayStates).toHaveLength(5);
    expect(xrayStates.map((state) => state.endsAtMs - state.startsAtMs)).toEqual(Array(5).fill(3_000));
    expect(xrayAnnotations.map((annotation) => annotation.labelAr)).toEqual([
      'الموقع',
      'الرحلة',
      'البروتوكول',
      'التجربة',
      'المحتوى المرتبط',
    ]);
    expect(xrayAnnotations.every((annotation) => annotation.sourcePages.length > 0)).toBe(true);
    expect(xrayAnnotations.every((annotation) => !('visualTarget' in annotation))).toBe(true);
  });

  it('preserves the approved A to B to C progression, then continues toward D', () => {
    const activeCodeAt = (elapsedMs: number) => {
      const progress = guestProgressAtDelightTime(elapsedMs);
      return guestDelightJourney.stops[activeRegisteredStopIndex(guestDelightJourney, progress)]?.code;
    };

    expect(activeCodeAt(13_000)).toBe('A');
    expect(activeCodeAt(22_000)).toBe('B');
    expect(activeCodeAt(36_000)).toBe('C');
    expect(activeCodeAt(75_999)).toBe('C');
    expect(activeCodeAt(84_000)).toBe('D');
  });

  it('locks the approved Guest route geometry and Illustrator registration', () => {
    const routeContract = {
      pathD: guestDelightJourney.pathD,
      segments: guestDelightJourney.segments,
      stops: guestDelightJourney.stops.map(({ code, eventLabel, durationMinutes, pathProgress, mapPoint, canonicalPlaceId, physicalEntityId, anchorConfidence }) => ({
        code, eventLabel, durationMinutes, pathProgress, mapPoint, canonicalPlaceId, physicalEntityId, anchorConfidence,
      })),
    };
    const mapContract = {
      canonicalCoordinateSpace: illustratedMapRegistration.canonicalCoordinateSpace,
      canonicalTransform: illustratedMapRegistration.canonicalTransform,
      controlPoints: illustratedMapRegistration.controlPoints,
    };

    expect(hash(routeContract)).toBe('9275c6c6f5ac0ab567c317800faf15f5f3608423966dafab3009a7911a38d53d');
    expect(hash(mapContract)).toBe('2d01c56b023fb7cfd230e1782309c516cca5fdaac5bb8a1c2da057c59965fc2d');
  });

  it('restores the exact C progress before moving only to defensibly registered D', () => {
    const stopC = guestDelightJourney.stops.find((stop) => stop.code === 'C')!;
    const stopD = guestDelightJourney.stops.find((stop) => stop.code === 'D')!;
    expect(stopC.eventLabel).toBe('الاستقبال والعرضة السعودية');
    expect(stopC.durationMinutes).toBe(60);
    expect([36_000, 67_000, 71_000, 75_999].map(guestProgressAtDelightTime)).toEqual(Array(4).fill(stopC.pathProgress));
    expect(stopD.canonicalPlaceId).toBe('optionsGarden');
    expect(stopD.physicalEntityId).toBe('optionsGarden');
    expect(stopD.anchorConfidence).toBe('high');
  });

  it('defines the approved reusable kinetic vocabulary', () => {
    expect(Object.keys(kineticMotion)).toEqual([
      'cinematicDescent', 'siteReveal', 'spatialApproach', 'journeyTrace', 'arrivalSettle',
      'apertureExpand', 'xrayFocus', 'spatialCollapse', 'royalTease',
    ]);
  });
});
