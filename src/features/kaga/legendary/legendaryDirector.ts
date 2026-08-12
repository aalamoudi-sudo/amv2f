import { useEffect } from 'react';
import { advanceLegendaryTemporalState } from './legendaryTemporalEngine';
import { legendaryBeatById } from './legendaryStoryGraph';
import { useLegendaryStore } from './legendaryStore';
import { princeLegendaryStory } from './prince/princeStory';

export function useLegendaryDirector() {
  const mode = useLegendaryStore((state) => state.mode);
  const activeBeatId = useLegendaryStore((state) => state.activeBeatId);

  useEffect(() => {
    if (mode !== 'directed') return undefined;
    let previous = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsedMs = now - previous;
      previous = now;
      const state = useLegendaryStore.getState();
      if (state.mode !== 'directed') return;
      const beat = legendaryBeatById(princeLegendaryStory, state.activeBeatId);
      const step = advanceLegendaryTemporalState(state, beat, elapsedMs);
      state.setCinematicProgress(step.cinematicProgress);
      if (
        beat.autoRevealExperience
        && beat.experienceId
        && step.cinematicProgress >= 0.34
        && !state.revealedExperienceBeatIds.includes(beat.id)
      ) {
        useLegendaryStore.getState().openExperience(beat.experienceId);
        return;
      }
      if (step.beatComplete) {
        if (beat.type === 'finale') useLegendaryStore.getState().complete();
        else useLegendaryStore.getState().advanceBeat();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activeBeatId, mode]);
}
