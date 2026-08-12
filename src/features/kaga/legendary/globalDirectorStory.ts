import type { LegendaryGlobalChapter } from './legendaryTypes';

const event = (pdfPages: number[], notes?: string) => ({ sourceLabel: 'عرض تدشين حدائق الملك عبدالله', pdfPages, notes });
const knowledge = (pdfPages: number[]) => ({ sourceLabel: 'الدليل المعرفي لحدائق الملك عبدالله V3', pdfPages });

export const inaugurationLegendaryStory: LegendaryGlobalChapter[] = [
  { id: 'global-opening', titleAr: 'حدائق الملك عبدالله', narrativeAr: 'تبدأ القصة من المكان الذي سيحمل أيام التدشين الأربعة.', surface: 'opening', presentationDurationMs: 28_000, source: [event([1, 4]), knowledge([4, 5])] },
  { id: 'global-scale', titleAr: 'مكان بحجم قصة', narrativeAr: 'أكثر من مليوني متر مربع، وأكثر من مليون نبات، وخمس عشرة حديقة نباتية.', surface: 'scale', presentationDurationMs: 26_000, source: [knowledge([4, 5])] },
  { id: 'global-place', titleAr: 'المكان ثابت', narrativeAr: 'المخطط الحقيقي هو المسرح الذي تتغير فوقه خطة الحدث.', surface: 'place', dayId: 'day-01', presentationDurationMs: 30_000, source: [event([7, 8, 25, 26, 34, 35])] },
  { id: 'global-days', titleAr: 'أربعة أيام من التدشين', narrativeAr: 'تتبدل الرحلات والتجارب بينما تظل الحدائق هي المكان الجامع.', surface: 'days', dayId: 'day-03', presentationDurationMs: 34_000, source: [event([4, 5, 11, 23, 32])] },
  { id: 'global-journeys', titleAr: 'الرحلات تصنع البروتوكول', narrativeAr: 'تظهر رحلة سمو أمير المنطقة نموذجاً للعلاقة بين الضيف والوقت والمكان.', surface: 'journey', dayId: 'day-03', journeyId: 'prince', stopId: 'STOP-25-B', presentationDurationMs: 42_000, source: [event([23, 24, 25, 27])] },
  { id: 'global-royal', titleAr: 'لحظة التدشين', narrativeAr: 'التصور المعتمد للحظة التدشين الملكية ضمن اليوم الثاني.', surface: 'royal', dayId: 'day-02', presentationDurationMs: 42_000, source: [event([12, 15, 16])] },
  { id: 'global-launch', titleAr: 'عرض التدشين', narrativeAr: 'تجتمع تقنيات XR والدرونز والألعاب النارية فوق المشهد الفعلي للحدائق.', surface: 'launch', dayId: 'day-02', presentationDurationMs: 42_000, source: [event([19, 20, 21, 22])] },
  { id: 'global-experiences', titleAr: 'تجارب المكان', narrativeAr: 'تلتقي الضيافة والتفعيلات والمعرفة في محطات الحدث.', surface: 'experience', dayId: 'day-04', journeyId: 'mayorMedia', stopId: 'STOP-34-L', experienceId: 'press-conference', presentationDurationMs: 36_000, source: [event([32, 33, 34, 36])] },
  { id: 'global-finale', titleAr: 'حدائق الملك عبدالله', narrativeAr: 'المكان قبل أن يُفتتح. الرحلة قبل أن تبدأ.', surface: 'finale', presentationDurationMs: 28_000, source: [event([1, 132])] },
];
