import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LegendaryLivingMasterplan } from '../legendary/LegendaryLivingMasterplan';
import { useLegendarySystemStore } from '../legendary/legendarySystemStore';
import {
  illustratedMapRegistration,
  illustratedRegisteredHotspots,
  isCanonicalRuntimeLabel,
  preserveCanonicalPointAcrossReadings,
} from './illustratedMapRegistration';

describe('KAGA illustrated spatial layer', () => {
  beforeEach(() => useLegendarySystemStore.getState().reset());

  it('uses only Event-Proposal-whitelisted registered Garden entities as hotspots', () => {
    expect(illustratedRegisteredHotspots).toHaveLength(3);
    expect(illustratedRegisteredHotspots.every((hotspot) => isCanonicalRuntimeLabel(hotspot.titleAr))).toBe(true);
    expect(illustratedRegisteredHotspots.map((hotspot) => hotspot.id)).toEqual([
      'devonianGarden', 'plioceneGarden', 'optionsGarden',
    ]);
  });

  it('excludes Illustrator labels and known draft spelling from the runtime manifest', () => {
    const manifest = readFileSync('public/kaga/illustrated-map/manifest.json', 'utf8');
    expect(manifest).toContain('"rawAiShipped": false');
    expect(manifest).toContain('"Legends"');
    expect(illustratedRegisteredHotspots.map((item) => item.titleAr).join('|')).not.toMatch(/Graden|Dinning|Cenozoic/);
  });

  it('keeps the canonical point exactly stable across all three readings', () => {
    const point = [1015.727, 593.321] as const;
    expect(preserveCanonicalPointAcrossReadings(point, 'masterplan')).toBe(point);
    expect(preserveCanonicalPointAcrossReadings(point, 'illustrated')).toBe(point);
    expect(preserveCanonicalPointAcrossReadings(point, 'story')).toBe(point);
    expect(illustratedMapRegistration.canonicalCoordinateSpace).toBe('KAGA-SOURCE-2D-V1');
  });

  it('renders identical route geometry over source-true and illustrated readings', () => {
    const props = {
      dayId: 'day-03' as const,
      selectedJourneyId: 'prince' as const,
      activeStopId: 'STOP-25-B',
      onJourneySelect: vi.fn(),
      onStopSelect: vi.fn(),
    };
    const view = render(<LegendaryLivingMasterplan {...props} reading="masterplan" />);
    const sourcePaths = [...view.container.querySelectorAll('.route-line')].map((path) => path.getAttribute('d'));
    view.rerender(<LegendaryLivingMasterplan {...props} reading="illustrated" />);
    const illustratedPaths = [...view.container.querySelectorAll('.route-line')].map((path) => path.getAttribute('d'));
    expect(illustratedPaths).toEqual(sourcePaths);
    expect(screen.getByTestId('illustrated-map-layers')).toHaveAttribute('data-reading', 'illustrated');
  });

  it('switches visual reading without resetting day, journey, stop or progress', () => {
    useLegendarySystemStore.setState({ dayId: 'day-04', journeyId: 'mayorMedia', activeStopId: 'STOP-34-L', cinematicProgress: .47 });
    useLegendarySystemStore.getState().setMapReading('illustrated');
    expect(useLegendarySystemStore.getState()).toMatchObject({
      dayId: 'day-04', journeyId: 'mayorMedia', activeStopId: 'STOP-34-L', cinematicProgress: .47, mapReading: 'illustrated',
    });
  });

  it('restores the same illustrated reading with Director return context', () => {
    const store = useLegendarySystemStore.getState();
    store.startJourneyDirector('prince');
    store.setMapReading('illustrated');
    useLegendarySystemStore.getState().pauseForExplore();
    useLegendarySystemStore.getState().setMapReading('story');
    useLegendarySystemStore.getState().resume();
    expect(useLegendarySystemStore.getState().mapReading).toBe('illustrated');
  });

  it('keeps map reading controls keyboard-accessible and canonical', () => {
    const onReadingChange = vi.fn();
    render(<LegendaryLivingMasterplan dayId="day-03" selectedJourneyId="prince" onJourneySelect={vi.fn()} onStopSelect={vi.fn()} reading="masterplan" onReadingChange={onReadingChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'الخريطة التصويرية' }));
    expect(onReadingChange).toHaveBeenCalledWith('illustrated');
  });
});
