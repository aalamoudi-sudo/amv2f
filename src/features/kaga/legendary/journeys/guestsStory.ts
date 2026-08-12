import { authorJourneyStory } from './storyFactory';

export const guestsLegendaryStory = authorJourneyStory('guests', [
  { code: 'A', type: 'opening', chapterAr: 'وصول الضيوف', presentationDurationMs: 9_000 },
  { code: 'B', type: 'movement', chapterAr: 'عربات الجولف', presentationDurationMs: 10_000 },
  { code: 'C', type: 'experience', chapterAr: 'الاستقبال والعرضة', presentationDurationMs: 16_000, autoRevealExperience: true },
  { code: 'D', type: 'knowledge', chapterAr: 'حديقة الخيارات', presentationDurationMs: 11_000, knowledgeId: 'optionsGarden' },
  { code: 'F', type: 'experience', chapterAr: 'ممر العصور', presentationDurationMs: 13_000 },
  { code: 'H', type: 'knowledge', chapterAr: 'الحديقة الديفونية', presentationDurationMs: 11_000, knowledgeId: 'devonianGarden' },
  { code: 'J', type: 'stop', chapterAr: 'نهاية الجولة', presentationDurationMs: 10_000 },
  { code: 'L', type: 'finale', chapterAr: 'المغادرة', presentationDurationMs: 9_000 },
]);
