import type { LegendaryBeat } from './legendaryTypes';

export function legendaryBeatIndex(story: LegendaryBeat[], beatId: string) {
  return Math.max(0, story.findIndex((beat) => beat.id === beatId));
}

export function legendaryBeatById(story: LegendaryBeat[], beatId: string) {
  const beat = story.find((item) => item.id === beatId);
  if (!beat) throw new Error(`Unknown Legendary beat: ${beatId}`);
  return beat;
}

export function nextLegendaryBeat(story: LegendaryBeat[], beatId: string) {
  const index = legendaryBeatIndex(story, beatId);
  return story[index + 1];
}

export function previousLegendaryBeat(story: LegendaryBeat[], beatId: string) {
  const index = legendaryBeatIndex(story, beatId);
  return story[Math.max(0, index - 1)];
}

export function validateLegendaryStory(story: LegendaryBeat[]) {
  const ids = new Set<string>();
  story.forEach((beat) => {
    if (ids.has(beat.id)) throw new Error(`Duplicate Legendary beat: ${beat.id}`);
    if (beat.source.length === 0 || beat.source.some((source) => source.pdfPages.length === 0)) {
      throw new Error(`Legendary beat has no valid source: ${beat.id}`);
    }
    if (beat.presentationDurationMs <= 0) throw new Error(`Invalid presentation duration: ${beat.id}`);
    ids.add(beat.id);
  });
  story.forEach((beat) => beat.connectsBeatIds?.forEach((connectedId) => {
    if (!ids.has(connectedId)) throw new Error(`Unknown transition source beat: ${connectedId}`);
  }));
  return true;
}
