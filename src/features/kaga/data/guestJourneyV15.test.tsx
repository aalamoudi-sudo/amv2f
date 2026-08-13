import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { registeredJourneyById } from '../spatial/registeredJourneys';
import { RegisteredMasterplan } from '../v2/RegisteredMasterplan';
import { guestTransportEmoji, guestTransportLabels } from '../v2/guestJourneyPresentation';
import {
  GUEST_JOURNEY_V15_SHA256,
  guestJourneyV15ColorCode,
  guestJourneyV15Registration,
  guestJourneyV15Segments,
  guestJourneyV15StopPoints,
} from './guestJourneyV15';
import { journeyById } from './journeys';

const exactStops = [
  ['A', 'المدخل الرئيسي', undefined],
  ['B', 'نقطة النزول وإركاب عربات الجولف', undefined],
  ['C', 'الاستقبال والعرضة السعودية', 60],
  ['D', 'بداية الجولة التعريفية حديقة الخيارات', 6],
  ['E', 'الحديقة البليوسينية', 6],
  ['F', 'ممر العصور', 4],
  ['G', 'الحديقة العائلية', 6],
  ['H', 'حديقة الديفونية', 6],
  ['I', 'حديقة الحياة الحديثة', 6],
  ['J', 'نقطة نهاية الرحلة', undefined],
  ['K', 'تسليم الهدايا', 5],
  ['L', 'مسار خروج رحلة الضيوف', undefined],
] as const;

const transformPoint = (point: { x: number; y: number }) => {
  const [a, b, c, d, e, f] = guestJourneyV15Registration.matrix;
  return [a * point.x + c * point.y + e, b * point.x + d * point.y + f] as const;
};

describe('Guest Journey V.15 source reflection', () => {
  it('locks the attached V.15 source and exact A-L journey semantics', () => {
    const journey = journeyById.guests;
    expect(GUEST_JOURNEY_V15_SHA256).toBe('80cbd5c243102ad531252055adf9b677ae65a621ece409591ca7bcbd3283d46a');
    expect(journey.title).toBe('رحلة الضيوف');
    expect(journey.window).toBe('من 05:30 م إلى 07:30 م');
    expect(journey.stops.map((stop) => [stop.code, stop.title, stop.durationMinutes])).toEqual(exactStops);
    expect(journey.stops.map((stop) => stop.code).join('')).toBe('ABCDEFGHIJKL');
    expect(journey.contextNotesAr).toEqual(['يسبق وصول الضيوف وصول سمو أمير منطقة الرياض بـ30 دقيقة.']);
  });

  it('uses the five distinct V.15 movement codes without collapsing the two red exit readings', () => {
    expect(guestJourneyV15ColorCode).toEqual([
      expect.objectContaining({ id: 'guests-entry', color: '#00B050', pattern: 'solid', distanceMeters: 760, durationMinutes: 5 }),
      expect.objectContaining({ id: 'guests-transfer', color: '#00B0F0', pattern: 'solid', distanceMeters: 420, durationMinutes: 3 }),
      expect.objectContaining({ id: 'guests-tour', color: '#7030A0', pattern: 'solid', distanceMeters: 1400, durationMinutes: 10 }),
      expect.objectContaining({ id: 'guests-golf-exit', color: '#FF0000', pattern: 'dashed', distanceMeters: 420, durationMinutes: 3 }),
      expect.objectContaining({ id: 'guests-final-exit', color: '#FF0000', pattern: 'solid', distanceMeters: undefined, durationMinutes: undefined }),
    ]);
    expect(guestJourneyV15Segments.map((segment) => segment.id)).toEqual([
      'guests-entry', 'guests-transfer', 'guests-tour', 'guests-golf-exit', 'guests-final-exit',
    ]);
  });

  it('shows source-safe transport emoji without implying an unsourced walking segment', () => {
    expect(guestTransportEmoji).toEqual({
      car: '🚗',
      'golf-cart': '⛳',
      tour: '⛳',
      exit: '🚗',
    });
    expect(guestTransportLabels.tour).toBe('جولة بعربة جولف');
    expect(Object.values(guestTransportEmoji)).not.toContain('🚶');
  });

  it('registers every PowerPoint control point into the canonical Rhino frame with the reviewed matrix', () => {
    const registered = registeredJourneyById.guests;
    registered.stops.forEach((stop) => {
      const expected = transformPoint(guestJourneyV15StopPoints[stop.code as keyof typeof guestJourneyV15StopPoints]);
      expect(stop.mapPoint[0]).toBeCloseTo(expected[0], 2);
      expect(stop.mapPoint[1]).toBeCloseTo(expected[1], 2);
      expect(stop.anchorConfidence).toBe('approximate');
      expect(stop.anchorSource).toContain('V.15 slide 4');
    });
    expect(guestJourneyV15Registration.inlierControlPoints).toBe(38);
    expect(guestJourneyV15Registration.rmsErrorCanonicalUnits).toBeLessThan(1);
    expect(guestJourneyV15Registration.maxErrorCanonicalUnits).toBeLessThan(2.1);
  });

  it('keeps source segment colors and patterns in the rendered map DOM', () => {
    const html = renderToStaticMarkup(
      <RegisteredMasterplan
        mode="event"
        journeyId="guests"
        progress={0}
        reading="masterplan"
        sourceFidelityMode
        selectedStopIndex={0}
        onGardenSelect={() => undefined}
        onStopSelect={() => undefined}
      />,
    );
    expect(html).toContain('data-source-segment="guests-entry"');
    expect(html).toContain('data-movement="road-entry"');
    expect(html).toContain('--source-segment-color:#00B050');
    expect(html).toContain('data-source-segment="guests-golf-exit"');
    expect(html).toContain('data-pattern="dashed"');
    expect(html).toContain('data-source-segment="guests-final-exit"');
  });
});
