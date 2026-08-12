import { authorJourneyStory } from './storyFactory';

export const mayorLegendaryStory = authorJourneyStory('mayor', [
  { code: 'A', type: 'opening', chapterAr: 'بداية الزيارة', presentationDurationMs: 10_000 },
  { code: 'C', type: 'experience', chapterAr: 'الاستقبال', presentationDurationMs: 13_000 },
  { code: 'D', type: 'experience', chapterAr: 'مجسم الحدائق', presentationDurationMs: 14_000, autoRevealExperience: true },
  { code: 'E', type: 'experience', chapterAr: 'ممر العصور', presentationDurationMs: 13_000 },
  { code: 'G', type: 'knowledge', chapterAr: 'الحديقة الديفونية', presentationDurationMs: 12_000, knowledgeId: 'devonianGarden' },
  { code: 'I', type: 'experience', chapterAr: 'ركن الذكريات', presentationDurationMs: 12_000 },
  { code: 'K', type: 'knowledge', chapterAr: 'حديقة الخيارات', presentationDurationMs: 12_000, knowledgeId: 'optionsGarden' },
  { code: 'L', type: 'finale', chapterAr: 'الصورة الأيقونية', presentationDurationMs: 11_000 },
]);
