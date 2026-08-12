import { authorJourneyStory } from './storyFactory';

export const mayorMediaLegendaryStory = authorJourneyStory('mayorMedia', [
  { code: 'A', type: 'opening', chapterAr: 'الوصول الرسمي', presentationDurationMs: 10_000 },
  { code: 'C', type: 'experience', chapterAr: 'الاستقبال والضيافة', presentationDurationMs: 12_000 },
  { code: 'D', type: 'experience', chapterAr: 'المجسم والنصب', presentationDurationMs: 12_000 },
  { code: 'E', type: 'experience', chapterAr: 'ممر العصور', presentationDurationMs: 13_000 },
  { code: 'G', type: 'knowledge', chapterAr: 'الحديقة الديفونية', presentationDurationMs: 11_000, knowledgeId: 'devonianGarden' },
  { code: 'I', type: 'experience', chapterAr: 'ركن الذكريات', presentationDurationMs: 11_000 },
  { code: 'K', type: 'knowledge', chapterAr: 'حديقة الخيارات', presentationDurationMs: 11_000, knowledgeId: 'optionsGarden' },
  { code: 'L', type: 'experience', chapterAr: 'المؤتمر الصحفي', presentationDurationMs: 18_000, autoRevealExperience: true },
  { code: 'M', type: 'experience', chapterAr: 'العشاء', presentationDurationMs: 15_000 },
  { code: 'N', type: 'finale', chapterAr: 'كبار الشخصيات', presentationDurationMs: 12_000 },
]);
