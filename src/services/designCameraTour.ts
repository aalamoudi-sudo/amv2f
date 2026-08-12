import type { DesignCameraTour } from '../types/designExperience';

export const designCameraTourSpeedValues = [0.75, 1, 1.5] as const;
export type DesignCameraTourSpeed = (typeof designCameraTourSpeedValues)[number];

export function normalizeDesignCameraTourSpeed(value: number): DesignCameraTourSpeed {
  return designCameraTourSpeedValues.includes(value as DesignCameraTourSpeed) ? value as DesignCameraTourSpeed : 1;
}

export function stepDesignCameraTour(
  tour: DesignCameraTour,
  currentViewpointId: string | null,
  direction: -1 | 1
): string | null {
  if (!tour.viewpointIds.length) return null;
  const currentIndex = Math.max(0, tour.viewpointIds.indexOf(currentViewpointId ?? ''));
  const nextIndex = Math.max(0, Math.min(tour.viewpointIds.length - 1, currentIndex + direction));
  return tour.viewpointIds[nextIndex] ?? null;
}

export function mayAutoplayDesignCameraTour(reducedMotion: boolean, visible: boolean): boolean {
  return !reducedMotion && visible;
}
