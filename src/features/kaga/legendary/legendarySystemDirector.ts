import { useEffect } from 'react';
import { inaugurationLegendaryStory } from './globalDirectorStory';
import { legendaryStories } from './journeys';
import { legendaryBeatById } from './legendaryStoryGraph';
import { useLegendarySystemStore } from './legendarySystemStore';

export function useLegendarySystemDirector() {
  const mode = useLegendarySystemStore((state) => state.mode);
  const activeBeatId = useLegendarySystemStore((state) => state.activeBeatId);
  const globalChapterId = useLegendarySystemStore((state) => state.globalChapterId);
  const directorScope = useLegendarySystemStore((state) => state.directorScope);

  useEffect(() => {
    if (mode !== 'directed') return undefined;
    let previous = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const state = useLegendarySystemStore.getState();
      if (state.mode !== 'directed') return;
      const elapsed = now - previous;
      previous = now;
      const duration = state.directorScope === 'inauguration'
        ? inaugurationLegendaryStory.find((chapter) => chapter.id === state.globalChapterId)?.presentationDurationMs ?? 30_000
        : legendaryBeatById(legendaryStories[state.journeyId], state.activeBeatId).presentationDurationMs;
      const next = Math.min(1, state.cinematicProgress + elapsed / duration);
      state.setProgress(next);
      if (state.directorScope === 'journey') {
        const beat = legendaryBeatById(legendaryStories[state.journeyId], state.activeBeatId);
        if (beat.autoRevealExperience && beat.experienceId && next >= .34 && !state.revealedBeatIds.includes(beat.id)) {
          state.openExperience(beat.experienceId);
          return;
        }
      }
      if (next >= 1) state.advance();
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activeBeatId, directorScope, globalChapterId, mode]);
}
