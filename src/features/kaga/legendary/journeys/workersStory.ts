import { authorJourneyStory } from './storyFactory';

export const workersLegendaryStory = authorJourneyStory('workers', [
  { code: 'A', type: 'opening', chapterAr: 'بداية يوم العاملين', presentationDurationMs: 9_000 },
  { code: 'C', type: 'arrival', chapterAr: 'النقل الترددي', presentationDurationMs: 10_000 },
  { code: 'D', type: 'experience', chapterAr: 'الاستقبال والضيافة', presentationDurationMs: 13_000 },
  { code: 'F', type: 'experience', chapterAr: 'ممر العصور', presentationDurationMs: 15_000, autoRevealExperience: true },
  { code: 'H', type: 'knowledge', chapterAr: 'الحديقة الديفونية', presentationDurationMs: 12_000, knowledgeId: 'devonianGarden' },
  { code: 'J', type: 'experience', chapterAr: 'ركن الذكريات', presentationDurationMs: 12_000 },
  { code: 'L', type: 'knowledge', chapterAr: 'حديقة الخيارات', presentationDurationMs: 11_000, knowledgeId: 'optionsGarden' },
  { code: 'N', type: 'stop', chapterAr: 'الجلسات والضيافة', presentationDurationMs: 11_000 },
  { code: 'Q', type: 'finale', chapterAr: 'اكتمال الرحلة', presentationDurationMs: 9_000 },
]);
