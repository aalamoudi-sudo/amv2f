import type { LegendaryBeat } from './legendaryTypes';

export function evidenceForBeat(beat: LegendaryBeat) {
  return beat.source.map((source) => ({
    documentAr: source.sourceLabel ?? 'المصدر المعتمد',
    pagesAr: source.pdfPages.length ? `صفحة ${source.pdfPages.join('، ')}` : '',
    noteAr: source.notes,
  }));
}

export function humanSpatialEvidence(confidence?: string) {
  if (!confidence) return undefined;
  return { documentAr: 'المخطط الهندسي', pagesAr: 'طبقة معتمدة', confidence };
}
