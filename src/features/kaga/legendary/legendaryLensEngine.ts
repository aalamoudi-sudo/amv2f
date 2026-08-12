import type { LegendaryLens, LegendarySystemSession } from './legendaryTypes';

export const legendaryLensLabels: Record<LegendaryLens, { titleAr: string; questionAr: string }> = {
  story: { titleAr: 'القصة', questionAr: 'ماذا سيحدث؟' },
  place: { titleAr: 'المكان', questionAr: 'أين يحدث كل شيء؟' },
  guest: { titleAr: 'الضيف', questionAr: 'كيف سيعيش الضيف الحدث؟' },
  experience: { titleAr: 'التجربة', questionAr: 'ماذا سيعيش الحضور؟' },
};

export function preserveSessionAcrossLens(session: LegendarySystemSession, lens: LegendaryLens): LegendarySystemSession {
  return { ...session, lens };
}
