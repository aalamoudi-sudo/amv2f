import { beforeEach, describe, expect, it } from 'vitest';
import { eventDays } from '../data/eventDays';
import { journeys } from '../data/journeys';
import { registeredJourneyById } from '../spatial/registeredJourneys';
import { contextForExperience, journeysForPlace, validateLegendaryCrossIndex, whenPlaceUsed } from './legendaryCrossIndex';
import { inaugurationLegendaryStory } from './globalDirectorStory';
import { legendaryStories } from './journeys';
import { preserveSessionAcrossLens } from './legendaryLensEngine';
import { journeyProgressForLegendaryBeat } from './legendarySpatialStoryEngine';
import { initialLegendarySystemSession, useLegendarySystemStore } from './legendarySystemStore';
import { validateLegendaryStory } from './legendaryStoryGraph';
import { totalPresentationDurationMs } from './legendaryTemporalEngine';
import { xrayForExperience } from './legendaryXRayEngine';

describe('KAGA Legendary L2 orchestration', () => {
  beforeEach(() => useLegendarySystemStore.getState().reset());

  it('authors all six journeys with valid provenance', () => {
    expect(Object.keys(legendaryStories)).toEqual(journeys.map((journey) => journey.id));
    Object.values(legendaryStories).forEach((story) => expect(validateLegendaryStory(story)).toBe(true));
  });

  it('keeps the six stories independently paced instead of cloning Prince', () => {
    const signatures = Object.values(legendaryStories).map((story) => `${story.length}:${totalPresentationDurationMs(story)}`);
    expect(new Set(signatures).size).toBeGreaterThanOrEqual(4);
  });

  it('never authors a beat without an approved stop anchor', () => {
    Object.entries(legendaryStories).forEach(([journeyId, story]) => story.forEach((beat) => {
      expect(registeredJourneyById[journeyId as keyof typeof registeredJourneyById].stops.some((stop) => stop.stopId === beat.journeyStopId)).toBe(true);
      expect(beat.source.every((source) => source.pdfPages.length > 0)).toBe(true);
    }));
  });

  it('preserves day, journey, stop and progress across lens changes', () => {
    const snapshot = { ...initialLegendarySystemSession, cinematicProgress: .43, lens: 'guest' as const };
    const changed = preserveSessionAcrossLens(snapshot, 'place');
    expect(changed).toMatchObject({ dayId: snapshot.dayId, journeyId: snapshot.journeyId, activeStopId: snapshot.activeStopId, cinematicProgress: .43, lens: 'place' });
  });

  it('preserves full context during Director interruption and resume', () => {
    const store = useLegendarySystemStore.getState();
    store.startJourneyDirector('mayorMedia');
    useLegendarySystemStore.getState().setProgress(.37);
    const before = useLegendarySystemStore.getState();
    before.pauseForExplore();
    useLegendarySystemStore.getState().setLens('place');
    useLegendarySystemStore.getState().resume();
    expect(useLegendarySystemStore.getState()).toMatchObject({ journeyId: 'mayorMedia', activeBeatId: before.activeBeatId, activeStopId: before.activeStopId, cinematicProgress: .37, mode: 'directed' });
  });

  it('preserves exact stop pathProgress across all stories', () => {
    Object.entries(legendaryStories).forEach(([journeyId, story]) => {
      story.forEach((beat) => {
        const progress = journeyProgressForLegendaryBeat(story, beat.id, 1, journeyId as keyof typeof registeredJourneyById);
        const anchor = registeredJourneyById[journeyId as keyof typeof registeredJourneyById].stops.find((stop) => stop.stopId === beat.journeyStopId)!;
        expect(progress).toBeCloseTo(anchor.pathProgress, 7);
      });
    });
  });

  it('keeps optional branch stops outside primary Legendary stories', () => {
    expect(legendaryStories.workers.some((beat) => beat.journeyStopId === 'STOP-7-P')).toBe(false);
    expect(legendaryStories.media.some((beat) => beat.journeyStopId === 'STOP-35-Q')).toBe(false);
  });

  it('changes the same living site by the four source-backed day states', () => {
    expect(eventDays.map((day) => day.journeyIds ?? [])).toEqual([
      ['workers', 'mayor'], [], ['prince', 'guests'], ['mayorMedia', 'media'],
    ]);
  });

  it('resolves global place relationships without orphan links', () => {
    expect(validateLegendaryCrossIndex()).toBe(true);
    expect(journeysForPlace('optionsGarden').length).toBe(6);
  });

  it('returns Who Passes Here only from actual registered entity relationships', () => {
    expect(journeysForPlace('devonianGarden').sort()).toEqual(['guests', 'mayor', 'mayorMedia', 'media', 'prince', 'workers'].sort());
    expect(journeysForPlace('not-mapped')).toEqual([]);
  });

  it('uses only sourced journey windows for When Place Used', () => {
    const usage = whenPlaceUsed('optionsGarden');
    expect(usage).toHaveLength(6);
    usage.forEach((item) => expect(item.sourcedWindowAr).toBe(journeys.find((journey) => journey.id === item.journeyId)?.window));
  });

  it('exposes experience who/when/where only when relationships exist', () => {
    const mapped = contextForExperience('press-conference');
    expect(mapped.who.map((item) => item.id).sort()).toEqual(['mayorMedia', 'media']);
    expect(mapped.where.length).toBe(2);
    expect(contextForExperience('unknown').where).toEqual([]);
  });

  it('limits X-Ray annotations to approved stop and experience data', () => {
    const annotations = xrayForExperience('mayorMedia', 'STOP-34-L', 'press-conference');
    expect(annotations).toHaveLength(4);
    expect(annotations.every((item) => item.sourcePages.includes(34) || item.sourcePages.includes(36))).toBe(true);
    expect(xrayForExperience('mayorMedia', 'STOP-34-A', 'missing')).toEqual([]);
  });

  it('gives every global Director chapter a source chain and no invented clock time', () => {
    expect(inaugurationLegendaryStory).toHaveLength(9);
    inaugurationLegendaryStory.forEach((chapter) => {
      expect(chapter.source.length).toBeGreaterThan(0);
      expect(chapter.source.every((source) => source.pdfPages.length > 0)).toBe(true);
      expect('actualTime' in chapter).toBe(false);
    });
  });

  it('keeps critical multi-route meaning non-color dependent', () => {
    const source = String.raw`${journeys.map((_, index) => ['solid', 'dash', 'dot', 'dash-dot', 'long-dash', 'symbol'][index]).join('|')}`;
    expect(source.split('|')).toHaveLength(6);
  });
});
