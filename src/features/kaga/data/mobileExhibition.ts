import type { ExhibitionQuestion } from '../types';
import { sourceRef } from './sourceReferences';

export const exhibitionQuestions: ExhibitionQuestion[] = [
  { id: 'jurassic', question: 'كيف تبدو الحياة النباتية في العصر الجوراسي؟', response: 'مشهد بصري يأخذ الزائر للحديقة الجوراسية.', source: sourceRef([52]) },
  { id: 'butterflies', question: 'كيف تبدو البيئة الداخلية لحديقة الفراشات؟', response: 'استعراض خلاب للبيئة المغلقة في حديقة الفراشات.', source: sourceRef([52]) },
  { id: 'crescents', question: 'كيف صُمم مبنى الهلالين لاحتضان البيئات النباتية؟', response: 'عرض يوضح العبقرية الهندسية لمبنى الهلالين، وكيف صُمم ليكون حاضنة ضخمة للبيئات النباتية المتنوعة.', source: sourceRef([52]) },
  { id: 'diversity', question: 'ما حجم التنوع النباتي في الحدائق الخارجية؟', response: 'رحلة بصرية تبرز التنوع النباتي والحدائق الخارجية.', source: sourceRef([52]) },
  { id: 'irrigation', question: 'كيف تُدار شبكات الري والمياه داخل الحدائق؟', response: 'عرض تقني مبسط يبرز شبكات الري الذكية وإعادة التدوير.', source: sourceRef([52]) },
  { id: 'maze', question: 'كيف يبدو تصميم المتاهة النباتية؟', response: 'جولة سريعة داخل المتاهة النباتية والممرات المتعرجة.', source: sourceRef([52]) },
  { id: 'final-form', question: 'كيف سيبدو الشكل النهائي لحدائق الملك عبدالله؟', response: 'لقطات شاملة للمشروع المكتمل ترتكز على رؤية المملكة.', source: sourceRef([52]) },
];

export const mobileExhibitionConcept = {
  title: 'المعرض المتنقل',
  diameter: '15 متراً',
  externalScreens: 8,
  internalScreens: 8,
  interactivePoints: 7,
  proposedLocations: ['جامعة الملك سعود', 'جامعة الأمير سلطان', 'حديقة السويدي', 'أمانة منطقة الرياض'],
  gifts: [
    { title: 'قلم ببذور قابلة للزراعة', image: '/kaga/assets/mobile/seed-pencil-p057.webp', source: sourceRef([57]) },
    { title: 'أحواض صغيرة ببذور نباتات محلية أو نادرة', image: '/kaga/assets/mobile/seed-kit-p058.webp', source: sourceRef([58]) },
  ],
  source: sourceRef([50, 51, 52, 53, 54, 55, 56, 57, 58]),
};
