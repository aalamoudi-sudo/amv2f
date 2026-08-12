import { beforeEach, describe, expect, it } from 'vitest';
import { journeyById } from '../data/journeys';
import { activeStopIndexAtProgress, useSpatialStore } from './spatialStore';

describe('KAGA spatial timeline store', () => {
  beforeEach(() => useSpatialStore.getState().selectJourney('workers'));

  it('activates a stop only after its calibrated path anchor is reached', () => {
    const stops = journeyById.workers.stops;
    const target = stops[4]!;
    expect(activeStopIndexAtProgress(stops, target.pathProgress - 0.001)).toBe(3);
    expect(activeStopIndexAtProgress(stops, target.pathProgress)).toBe(4);
  });

  it('moves Next and stop selection to the exact spatial anchor', () => {
    const store = useSpatialStore.getState();
    store.nextStop();
    expect(useSpatialStore.getState().progress).toBe(journeyById.workers.stops[1]!.pathProgress);
    const target = journeyById.workers.stops[6]!;
    useSpatialStore.getState().selectStop(target.id);
    expect(useSpatialStore.getState().progress).toBe(target.pathProgress);
    expect(useSpatialStore.getState().selectedStopId).toBe(target.id);
  });

  it('switches optional playback without inserting its stop into the primary timeline', () => {
    useSpatialStore.getState().selectBranch('nature');
    expect(useSpatialStore.getState().activeBranchId).toBe('nature');
    expect(useSpatialStore.getState().activeStopIndex).toBe(-1);
    useSpatialStore.getState().nextStop();
    expect(useSpatialStore.getState().progress).toBe(1);
    expect(useSpatialStore.getState().selectedStopId).toBe('STOP-7-P');
  });
});
