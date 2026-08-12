import type { SourceReference } from '../../data/spatialTypes';
import { registeredJourneyById } from '../../spatial/registeredJourneys';
import type { LegendaryBeat } from '../legendaryTypes';

const prince = registeredJourneyById.prince;
const stop = (code: string) => {
  const result = prince.stops.find((item) => item.code === code);
  if (!result) throw new Error(`Prince source stop ${code} is missing.`);
  return result;
};
const focus = (code: string) => {
  const item = stop(code);
  return { point: item.mapPoint, entityId: item.physicalEntityId, anchorConfidence: item.anchorConfidence } as const;
};
const event = (pages: number[], notes?: string): SourceReference => ({
  pdfPages: pages,
  sourceLabel: 'مقترح تدشين حدائق الملك عبدالله',
  ...(notes ? { notes } : {}),
});
const knowledge = (pages: number[]): SourceReference => ({
  pdfPages: pages,
  sourceLabel: 'الدليل المعرفي لحدائق الملك عبدالله V3',
});

export const princeLegendaryStory: LegendaryBeat[] = [
  {
    id: 'prince-opening',
    chapterAr: 'البداية',
    titleAr: 'زيارة سمو أمير منطقة الرياض',
    narrativeAr: 'تبدأ الزيارة الخاصة ضمن اليوم الثالث في حدائق الملك عبدالله، بحضور سمو أمير المنطقة وسمو نائبه وسمو الأمين.',
    type: 'opening', journeyStopId: stop('A').stopId, actualTime: '06:00 م', presentationDurationMs: 12_000,
    mapFocus: focus('A'), visualAssetId: 'prince-day', source: [event([23, 24, 25])],
  },
  {
    id: 'prince-arrival-route',
    chapterAr: 'الوصول',
    titleAr: 'من المدخل الرئيسي إلى الاستقبال',
    narrativeAr: 'مسار دخول بطول 1100 متر ومدة فعلية قدرها 5 دقائق، كما يورده مخطط الرحلة.',
    type: 'arrival', journeyStopId: stop('B').stopId, actualDurationMinutes: 5, presentationDurationMs: 14_000,
    mapFocus: focus('B'), visualAssetId: 'prince-map', source: [event([25], 'مسار الدخول: 1100 متر، مدة الرحلة 5 دقائق.')],
  },
  {
    id: 'prince-ceremonial-reception',
    chapterAr: 'الاستقبال والعرضة',
    titleAr: 'الاستقبال والعرضة السعودية',
    narrativeAr: 'محطة الاستقبال الرسمية تجمع العرضة السعودية، مجسم الحدائق المنقول مؤقتاً، والنصب التذكاري ضمن مدة فعلية قدرها 40 دقيقة.',
    type: 'experience', journeyStopId: stop('B').stopId, actualDurationMinutes: 40, presentationDurationMs: 24_000,
    mapFocus: focus('B'), visualAssetId: 'saudi-ardah', experienceId: 'royal-arrival', autoRevealExperience: true,
    source: [event([24, 25, 27])],
  },
  {
    id: 'prince-options-garden', chapterAr: 'حديقة الخيارات', titleAr: 'بداية الجولة - حديقة الخيارات',
    narrativeAr: 'تبدأ الجولة الداخلية من حديقة الخيارات، وهي حديقة مصدرية مرتبطة بالنباتات الضرورية لحياتنا واستخداماتها.',
    type: 'knowledge', journeyStopId: stop('C').stopId, actualDurationMinutes: 8, presentationDurationMs: 14_000,
    mapFocus: focus('C'), knowledgeId: 'optionsGarden', source: [event([25]), knowledge([10])],
  },
  {
    id: 'prince-pliocene-garden', chapterAr: 'الحديقة البليوسينية', titleAr: 'الحديقة البليوسينية',
    narrativeAr: 'محطة تشرح تغير المناخ وحياة النبات في الرياض خلال العصور الجيولوجية الأكثر حداثة.',
    type: 'knowledge', journeyStopId: stop('D').stopId, actualDurationMinutes: 8, presentationDurationMs: 14_000,
    mapFocus: focus('D'), knowledgeId: 'plioceneGarden', source: [event([25]), knowledge([10])],
  },
  {
    id: 'prince-era-walk', chapterAr: 'ممر العصور', titleAr: 'ممر العصور',
    narrativeAr: 'ممر متحفي يمثل الحقب الجيولوجية من خلال مجسمات مستقلة وشاشات تفاعلية.',
    type: 'experience', journeyStopId: stop('E').stopId, actualDurationMinutes: 8, presentationDurationMs: 16_000,
    mapFocus: focus('E'), visualAssetId: 'era-walk-render', experienceId: 'era-walk', source: [event([25, 48, 49])],
  },
  {
    id: 'prince-family-garden', chapterAr: 'الحديقة العائلية', titleAr: 'الحديقة العائلية',
    narrativeAr: 'تستمر الجولة وفق تسلسل مخطط الرحلة عبر محطة الحديقة العائلية.',
    type: 'stop', journeyStopId: stop('F').stopId, actualDurationMinutes: 8, presentationDurationMs: 12_000,
    mapFocus: focus('F'), source: [event([25], 'لا تُربط المحطة بكيان معرفي مستقل بسبب تعارض التصنيف المسجل في الدليل.')],
  },
  {
    id: 'prince-devonian-garden', chapterAr: 'الحديقة الديفونية', titleAr: 'الحديقة الديفونية',
    narrativeAr: 'محطة معرفية تستعيد بدايات النباتات والحياة على الأرض قبل نحو 400 مليون عام.',
    type: 'knowledge', journeyStopId: stop('G').stopId, actualDurationMinutes: 9, presentationDurationMs: 16_000,
    mapFocus: focus('G'), knowledgeId: 'devonianGarden', source: [event([25]), knowledge([10])],
  },
  {
    id: 'prince-modern-garden', chapterAr: 'نهاية الجولة', titleAr: 'الحديقة الحديثة - نهاية الجولة',
    narrativeAr: 'تنتهي الجولة الداخلية عند الحديقة الحديثة وفق ترتيب المحطات المعتمد.',
    type: 'stop', journeyStopId: stop('H').stopId, actualDurationMinutes: 9, presentationDurationMs: 16_000,
    mapFocus: focus('H'), source: [event([25])],
  },
  {
    id: 'prince-finale', chapterAr: 'الختام', titleAr: 'اكتمال رحلة الزيارة الخاصة',
    narrativeAr: 'يعود المشهد إلى تكوين الموقع بعد اكتمال المسار، مع سجل كبار الشخصيات والدروع التذكارية ضمن برنامج الزيارة.',
    type: 'finale', journeyStopId: stop('H').stopId, actualTime: '07:30 م', presentationDurationMs: 14_000,
    mapFocus: focus('H'), visualAssetId: 'prince-shield', connectsBeatIds: ['prince-modern-garden'], source: [event([24, 25, 28, 29, 30, 31])],
  },
];

export const princeJourneyWindow = 'من 06:00 م إلى 07:30 م';
