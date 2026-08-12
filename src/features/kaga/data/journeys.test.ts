import { describe, expect, it } from 'vitest';
import { journeys, journeyById } from './journeys';
import { mapPoints, MASTERPLAN_VIEWBOX, masterplanSource } from './spatialMap';
import type { SourceReference } from './spatialTypes';

const expectedJourneyIds = ['workers', 'mayor', 'prince', 'guests', 'mayorMedia', 'media'] as const;
const svgPathStart = /^M\s*-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?/;

function expectValidSource(source: SourceReference) {
  expect(source.pdfPages.length).toBeGreaterThan(0);
  for (const page of source.pdfPages) {
    expect(Number.isInteger(page)).toBe(true);
    expect(page).toBeGreaterThan(0);
    expect(page).toBeLessThanOrEqual(132);
  }
}

describe('KAGA spatial journey source model', () => {
  it('defines the six required source-backed journey families exactly once', () => {
    expect(journeys.map((journey) => journey.id)).toEqual(expectedJourneyIds);
    expect(new Set(journeys.map((journey) => journey.id)).size).toBe(journeys.length);
    for (const id of expectedJourneyIds) expect(journeyById[id]?.id).toBe(id);
  });

  it('keeps every masterplan point in the canonical SVG coordinate system', () => {
    expect(MASTERPLAN_VIEWBOX).toBe('0 0 1200 900');
    expectValidSource(masterplanSource);
    const permanentIds = new Set<string>();
    for (const point of Object.values(mapPoints)) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1200);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(900);
      expect(point.id).toMatch(/^(?:SITE|ZONE|HALL|GATE|ROUTE|STAGE|PARK|SERVICE|ASSEMBLY|ASSET)-\d{3}$/);
      expect(permanentIds.has(point.id)).toBe(false);
      permanentIds.add(point.id);
      expectValidSource(point.source);
    }
  });

  it('keeps route, stop and segment references deterministic and complete', () => {
    const journeyStopIds = new Set<string>();
    const segmentIds = new Set<string>();

    for (const journey of journeys) {
      expect(journey.title.trim()).not.toBe('');
      expect(journey.presentationDurationSeconds).toBeGreaterThan(0);
      expect(journey.stops.length).toBeGreaterThan(1);
      expect(journey.segments.length).toBeGreaterThan(0);
      expect(journey.playbackPath).toMatch(svgPathStart);
      expectValidSource(journey.source);

      for (const stop of journey.stops) {
        expect(journeyStopIds.has(stop.id)).toBe(false);
        journeyStopIds.add(stop.id);
        expect(stop.title.trim()).not.toBe('');
        expect(stop.point.x).toBeGreaterThanOrEqual(0);
        expect(stop.point.x).toBeLessThanOrEqual(1200);
        expect(stop.point.y).toBeGreaterThanOrEqual(0);
        expect(stop.point.y).toBeLessThanOrEqual(900);
        expectValidSource(stop.source);
        expectValidSource(stop.point.source);
        expect(stop.pathProgress).toBeGreaterThanOrEqual(0);
        expect(stop.pathProgress).toBeLessThanOrEqual(1);
      }

      for (const branch of journey.optionalBranches ?? []) {
        expect(branch.path).toMatch(svgPathStart);
        expectValidSource(branch.source);
        expect(branch.stops.every((stop) => stop.branchId === branch.id)).toBe(true);
      }

      for (const segment of journey.segments) {
        expect(segmentIds.has(segment.id)).toBe(false);
        segmentIds.add(segment.id);
        expect(segment.path).toMatch(svgPathStart);
        expect(['walking', 'golf-cart', 'shuttle', 'vehicle']).toContain(segment.transport);
        if (segment.distanceMeters !== undefined) expect(segment.distanceMeters).toBeGreaterThan(0);
        if (segment.realDurationMinutes !== undefined) expect(segment.realDurationMinutes).toBeGreaterThan(0);
        expectValidSource(segment.source);
      }
    }
  });

  it('does not confuse normalized playback time with real-world route information', () => {
    for (const journey of journeys) {
      const realDuration = journey.segments.reduce(
        (total, segment) => total + (segment.realDurationMinutes ?? 0),
        0,
      );
      expect(realDuration).toBeGreaterThan(0);
      expect(journey.presentationDurationSeconds).toBeLessThan(realDuration * 60);
    }
  });
});
