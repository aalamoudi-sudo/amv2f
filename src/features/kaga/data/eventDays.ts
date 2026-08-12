import type { InaugurationDay } from '../experience/types';
import { sourceRef } from './sourceReferences';

export const eventDays: InaugurationDay[] = [
  {
    id: 'day-01',
    ordinalLabel: 'اليوم الأول',
    title: 'ما قبل التدشين الملكي',
    gregorianDate: '31 أكتوبر 2026',
    hijriDate: '20 جمادى الأولى 1448',
    location: 'حدائق الملك عبدالله',
    attendance: '350+',
    summary: 'يوم تجريبي يزور خلاله سمو أمين منطقة الرياض الحدائق ويلتقي العاملين فيها وأسر من رحل منهم.',
    journeyIds: ['workers', 'mayor'],
    entryPoints: [
      { id: 'garden-model', label: 'مجسم الحدائق', source: sourceRef([7, 45]) },
      { id: 'era-walk', label: 'ممر العصور', source: sourceRef([7, 48, 49]) },
      { id: 'memory-corner', label: 'ركن الذكريات', source: sourceRef([7, 47]) },
    ],
    source: sourceRef([4, 5, 6, 7, 8, 9, 10]),
  },
  {
    id: 'day-02',
    ordinalLabel: 'اليوم الثاني',
    title: 'التدشين الملكي وعرض التدشين',
    gregorianDate: '1 نوفمبر 2026',
    hijriDate: '21 جمادى الأولى 1448',
    location: 'قصر العوجا / حدائق الملك عبدالله',
    attendance: 'غير محدد',
    summary: 'التدشين الملكي في قصر العوجا، مع عرض التدشين البصري الخاص في حدائق الملك عبدالله.',
    entryPoints: [
      { id: 'royal', label: 'لحظة التدشين', source: sourceRef([12, 15, 16]) },
      { id: 'launch', label: 'عرض التدشين', source: sourceRef([19, 20, 21, 22]) },
    ],
    source: sourceRef([4, 11, 12, 15, 16, 19, 20, 21, 22], 'يعرض المصدر موقعين لفعاليات اليوم نفسه؛ لا يُستنتج ترتيب الانتقال بينهما.'),
  },
  {
    id: 'day-03',
    ordinalLabel: 'اليوم الثالث',
    title: 'زيارة سمو أمير منطقة الرياض',
    gregorianDate: '2 نوفمبر 2026',
    hijriDate: '22 جمادى الأولى 1448',
    location: 'حدائق الملك عبدالله',
    attendance: '100',
    summary: 'زيارة خاصة لسمو أمير منطقة الرياض وسمو نائبه إلى حدائق الملك عبدالله.',
    journeyIds: ['prince', 'guests'],
    entryPoints: [
      { id: 'vip-area', label: 'منطقة كبار الشخصيات', source: sourceRef([23, 24, 43]) },
      { id: 'memorial', label: 'النصب التذكاري', source: sourceRef([25, 46]) },
    ],
    source: sourceRef([4, 23, 24, 25, 26, 27, 28, 29, 30, 31]),
  },
  {
    id: 'day-04',
    ordinalLabel: 'اليوم الرابع',
    title: 'المؤتمر الصحفي',
    gregorianDate: '3 نوفمبر 2026',
    hijriDate: '23 جمادى الأولى 1448',
    location: 'حدائق الملك عبدالله',
    attendance: '200 ضيف',
    summary: 'مؤتمر صحفي بحضور سمو أمين منطقة الرياض ووزير الإعلام، يسبقه جولات للإعلاميين ويتبعه العشاء والدروع التذكارية.',
    journeyIds: ['mayorMedia', 'media'],
    entryPoints: [
      { id: 'press-conference', label: 'المؤتمر الصحفي', source: sourceRef([32, 33, 36]) },
      { id: 'dinner', label: 'منطقة العشاء', source: sourceRef([33, 37]) },
    ],
    source: sourceRef([4, 32, 33, 34, 35, 36, 37, 38, 39, 40]),
  },
];
