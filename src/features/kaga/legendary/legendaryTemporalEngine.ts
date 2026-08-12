import type { LegendaryBeat, LegendarySession } from './legendaryTypes';

export interface LegendaryTemporalStep {
  cinematicProgress: number;
  beatComplete: boolean;
}

export function advanceLegendaryTemporalState(
  session: LegendarySession,
  beat: LegendaryBeat,
  elapsedMs: number,
): LegendaryTemporalStep {
  if (session.mode !== 'directed' || elapsedMs <= 0) {
    return { cinematicProgress: session.cinematicProgress, beatComplete: false };
  }
  const next = Math.min(1, session.cinematicProgress + elapsedMs / beat.presentationDurationMs);
  return { cinematicProgress: next, beatComplete: next >= 1 };
}

export function sourceTimingLabel(beat: LegendaryBeat) {
  if (beat.actualTime) return beat.actualTime;
  if (beat.actualDurationMinutes !== undefined) return `${beat.actualDurationMinutes} دقيقة وفق المصدر`;
  return 'وفق تسلسل الزيارة المعتمد';
}

export function totalPresentationDurationMs(story: LegendaryBeat[]) {
  return story.reduce((total, beat) => total + beat.presentationDurationMs, 0);
}
