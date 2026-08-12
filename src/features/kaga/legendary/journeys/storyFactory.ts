import { journeyById } from '../../data/journeys';
import type { JourneyId, SourceReference } from '../../data/spatialTypes';
import { registeredJourneyById } from '../../spatial/registeredJourneys';
import type { LegendaryBeat, LegendaryBeatType } from '../legendaryTypes';

export interface AuthoredBeatSpec {
  code: string;
  type: LegendaryBeatType;
  chapterAr: string;
  narrativeAr?: string;
  presentationDurationMs: number;
  experienceId?: string;
  knowledgeId?: string;
  visualAssetId?: string;
  autoRevealExperience?: boolean;
}

const eventSource = (pages: number[], notes?: string): SourceReference => ({
  pdfPages: pages,
  sourceLabel: 'عرض تدشين حدائق الملك عبدالله',
  ...(notes ? { notes } : {}),
});

const knowledgeSource = (pages: number[]): SourceReference => ({
  pdfPages: pages,
  sourceLabel: 'الدليل المعرفي لحدائق الملك عبدالله V3',
});

const knowledgePages: Record<string, number[]> = {
  devonianGarden: [10],
  optionsGarden: [10],
  plioceneGarden: [10],
};

export function authorJourneyStory(journeyId: JourneyId, specs: AuthoredBeatSpec[]): LegendaryBeat[] {
  const sourceJourney = journeyById[journeyId];
  const registered = registeredJourneyById[journeyId];
  return specs.map((spec, index) => {
    const stop = sourceJourney.stops.find((item) => item.code === spec.code);
    const anchor = registered.stops.find((item) => item.code === spec.code);
    if (!stop || !anchor) throw new Error(`Missing authored ${journeyId} stop ${spec.code}.`);
    const sources: SourceReference[] = [eventSource(stop.source.pdfPages, stop.detailAr)];
    if (spec.knowledgeId && knowledgePages[spec.knowledgeId]) sources.push(knowledgeSource(knowledgePages[spec.knowledgeId]!));
    return {
      id: `${journeyId}-${index + 1}-${spec.code.toLowerCase()}`,
      chapterAr: spec.chapterAr,
      titleAr: stop.title,
      narrativeAr: spec.narrativeAr ?? (stop.detailAr ? `${stop.title}؛ ${stop.detailAr.replaceAll('\n', '، ')}.` : `تصل الرحلة إلى ${stop.title} وفق تسلسل المسار المعتمد.`),
      type: spec.type,
      journeyStopId: stop.id,
      actualDurationMinutes: stop.durationMinutes,
      presentationDurationMs: spec.presentationDurationMs,
      mapFocus: {
        point: anchor.mapPoint,
        entityId: anchor.physicalEntityId,
        anchorConfidence: anchor.anchorConfidence,
      },
      experienceId: spec.experienceId ?? stop.experienceId,
      knowledgeId: spec.knowledgeId,
      visualAssetId: spec.visualAssetId,
      autoRevealExperience: spec.autoRevealExperience,
      source: sources,
    };
  });
}

export function journeyWindow(journeyId: JourneyId) {
  return journeyById[journeyId].window;
}
