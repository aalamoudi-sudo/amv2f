import { beforeEach, describe, expect, it } from 'vitest';
import { assetById } from '../data/assets';
import { experiences } from '../data/experiences';
import { journeyById } from '../data/journeys';
import { gardenById } from '../knowledge';
import { registeredJourneyById } from '../spatial/registeredJourneys';
import { advanceLegendaryTemporalState, totalPresentationDurationMs } from './legendaryTemporalEngine';
import { experiencesForStop, placeForExperience, validateLegendaryCrossIndex, visualsForPlace } from './legendaryCrossIndex';
import { validateLegendaryStory } from './legendaryStoryGraph';
import { initialLegendarySession, useLegendaryStore } from './legendaryStore';
import { legendaryAuthoritativeSources } from './legendarySources';
import { princeReceptionXrayAnnotations } from './legendarySignaturePresentation';
import { princeLegendaryStory } from './prince/princeStory';

describe('KAGA Legendary Prince orchestration', () => {
  beforeEach(() => useLegendaryStore.getState().reset());

  it('pins all three authoritative source fingerprints', () => {
    expect(legendaryAuthoritativeSources.eventProposal.sha256).toBe('500f2bfaeaa871e8eee8fedf5cd571b2dc11d12e33af3bb497e5a17414c545ad');
    expect(legendaryAuthoritativeSources.knowledgeGuide.sha256).toBe('213204327d095354c11ea02f14052b98bdcb319a5fec253f19a67c110a119738');
    expect(legendaryAuthoritativeSources.spatialRhino.sha256).toBe('e754894193c1da6660218757a19adc2f5dfacde7b2f27aefd35597d860007a9e');
  });

  it('requires a valid provenance chain for every authored beat', () => {
    expect(validateLegendaryStory(princeLegendaryStory)).toBe(true);
    expect(princeLegendaryStory.every((beat) => beat.source.every((source) => source.pdfPages.length > 0))).toBe(true);
  });

  it('preserves the exact Prince source order and durations', () => {
    const sourceStops = registeredJourneyById.prince.stops;
    expect(sourceStops.map((stop) => stop.code)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    expect(sourceStops.slice(1).map((stop) => stop.durationMinutes)).toEqual([40, 8, 8, 8, 8, 9, 9]);
    expect(princeLegendaryStory.filter((beat) => beat.actualTime).map((beat) => beat.actualTime)).toEqual(['06:00 م', '07:30 م']);
    expect(totalPresentationDurationMs(princeLegendaryStory)).toBeGreaterThanOrEqual(120_000);
  });

  it('never overwrites source duration with cinematic duration', () => {
    const beat = princeLegendaryStory.find((item) => item.id === 'prince-ceremonial-reception')!;
    const step = advanceLegendaryTemporalState({ ...initialLegendarySession, started: true, mode: 'directed', activeBeatId: beat.id }, beat, 4_000);
    expect(beat.actualDurationMinutes).toBe(40);
    expect(beat.presentationDurationMs).toBe(24_000);
    expect(step.cinematicProgress).toBeCloseTo(1 / 6);
  });

  it('keeps the same beat, stop, progress, and map context through interruption and knowledge', () => {
    const store = useLegendaryStore.getState();
    store.startDirector();
    useLegendaryStore.getState().advanceBeat();
    useLegendaryStore.getState().setCinematicProgress(0.42);
    const before = useLegendaryStore.getState();
    useLegendaryStore.getState().interrupt();
    useLegendaryStore.getState().openKnowledge('optionsGarden');
    useLegendaryStore.getState().returnToJourney();
    useLegendaryStore.getState().resume();
    const after = useLegendaryStore.getState();
    expect(after.activeBeatId).toBe(before.activeBeatId);
    expect(after.activeStopId).toBe(before.activeStopId);
    expect(after.cinematicProgress).toBe(before.cinematicProgress);
    expect(after.spatialFocus).toEqual(before.spatialFocus);
    expect(after.mode).toBe('directed');
  });

  it('preserves Map to Experience to Map state without restart or duplicated progress', () => {
    useLegendaryStore.getState().startDirector();
    useLegendaryStore.getState().advanceBeat();
    useLegendaryStore.getState().advanceBeat();
    useLegendaryStore.getState().setCinematicProgress(0.36);
    const before = useLegendaryStore.getState();
    useLegendaryStore.getState().openExperience('royal-arrival');
    expect(useLegendaryStore.getState().activeExperienceId).toBe('royal-arrival');
    useLegendaryStore.getState().returnToJourney();
    const returned = useLegendaryStore.getState();
    expect(returned.activeBeatId).toBe(before.activeBeatId);
    expect(returned.activeStopId).toBe(before.activeStopId);
    expect(returned.cinematicProgress).toBe(before.cinematicProgress);
    expect(returned.mode).toBe('paused');
    expect(returned.activeExperienceId).toBeUndefined();
  });

  it('resolves every deterministic cross-index relationship to approved data', () => {
    expect(validateLegendaryCrossIndex()).toBe(true);
    const reception = placeForExperience('royal-arrival')!;
    expect(reception).toBeDefined();
    expect(experiencesForStop(reception.stopId).every((item) => experiences.some((source) => source.id === item.id))).toBe(true);
    expect(visualsForPlace(reception.stopId).every((item) => assetById.has(item.id))).toBe(true);
    expect(Object.keys(gardenById)).toContain('optionsGarden');
  });

  it('builds every X-Ray annotation from approved Prince reception data', () => {
    expect(princeReceptionXrayAnnotations.map((annotation) => annotation.category)).toEqual([
      'location',
      'journey',
      'protocol',
      'experience',
      'related-content',
    ]);
    expect(princeReceptionXrayAnnotations.every((annotation) => annotation.valueAr.length > 0 && annotation.sourcePages.length > 0)).toBe(true);
    expect(princeReceptionXrayAnnotations.find((annotation) => annotation.category === 'journey')?.valueAr).toBe(journeyById.prince.title);
    expect(princeReceptionXrayAnnotations.find((annotation) => annotation.category === 'experience')?.valueAr).toBe(experiences.find((item) => item.id === 'royal-arrival')?.title);
  });

  it('does not offer a spatial answer for an experience without a registered place', () => {
    expect(placeForExperience('royal-arrival')).toBeDefined();
    expect(placeForExperience('vip-area')).toBeUndefined();
  });

  it('restores the same experience after the spatial answer without losing the journey context', () => {
    useLegendaryStore.setState({ returnContext: undefined });
    useLegendaryStore.getState().startDirector();
    useLegendaryStore.getState().advanceBeat();
    useLegendaryStore.getState().advanceBeat();
    useLegendaryStore.getState().setCinematicProgress(0.48);
    useLegendaryStore.getState().openExperience('royal-arrival');
    const context = useLegendaryStore.getState().returnContext;

    useLegendaryStore.getState().inspectStop(placeForExperience('royal-arrival')!.stopId);
    useLegendaryStore.getState().showQuery('where-does-this-happen');
    expect(useLegendaryStore.getState().activeExperienceId).toBeUndefined();
    useLegendaryStore.getState().openExperience('royal-arrival');

    const restored = useLegendaryStore.getState();
    expect(restored.activeExperienceId).toBe('royal-arrival');
    expect(restored.returnContext).toEqual(context);
    expect(restored.activeBeatId).toBe('prince-ceremonial-reception');
    expect(restored.activeStopId).toBe(context?.stopId);
    expect(restored.cinematicProgress).toBe(context?.cinematicProgress);
  });
});
