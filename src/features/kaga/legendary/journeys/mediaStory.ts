import { authorJourneyStory } from './storyFactory';

export const mediaLegendaryStory = authorJourneyStory('media', [
  { code: 'A', type: 'opening', chapterAr: 'بداية مسار الإعلاميين', presentationDurationMs: 9_000 },
  { code: 'D', type: 'experience', chapterAr: 'الاستقبال', presentationDurationMs: 11_000 },
  { code: 'F', type: 'experience', chapterAr: 'ممر العصور', presentationDurationMs: 12_000 },
  { code: 'J', type: 'experience', chapterAr: 'ركن الذكريات', presentationDurationMs: 11_000 },
  { code: 'L', type: 'knowledge', chapterAr: 'حديقة الخيارات', presentationDurationMs: 10_000, knowledgeId: 'optionsGarden' },
  { code: 'M', type: 'experience', chapterAr: 'منطقة الضيافة', presentationDurationMs: 14_000 },
  { code: 'N', type: 'experience', chapterAr: 'المؤتمر الصحفي', presentationDurationMs: 18_000, autoRevealExperience: true },
  { code: 'O', type: 'experience', chapterAr: 'منطقة العشاء', presentationDurationMs: 14_000 },
  { code: 'P', type: 'stop', chapterAr: 'توزيع الهدايا', presentationDurationMs: 9_000 },
  { code: 'R', type: 'finale', chapterAr: 'الخروج', presentationDurationMs: 9_000 },
]);
