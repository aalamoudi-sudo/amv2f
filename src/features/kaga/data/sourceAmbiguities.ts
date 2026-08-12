import { sourceRef } from './sourceReferences';

export interface SourceAmbiguity {
  id: string;
  description: string;
  handling: string;
  source: ReturnType<typeof sourceRef>;
}

export const sourceAmbiguities: SourceAmbiguity[] = [
  {
    id: 'day-02-multiple-locations',
    description: 'يعرض اليوم الثاني التدشين الملكي في قصر العوجا وعرض التدشين في حدائق الملك عبدالله، من دون مسار انتقال مفصل بين الموقعين.',
    handling: 'عُرض الموقعان معاً ولم تُختلق هندسة انتقال أو مدة رحلة.',
    source: sourceRef([4, 11, 19]),
  },
  {
    id: 'launch-option-copy',
    description: 'نص الخيارات الثلاثة في صفحة عرض التدشين غير قابل للاستخراج بشكل موثوق بسبب ترميز الخط المضمن.',
    handling: 'اعتمدت طبقات XR والدرونز والألعاب النارية الواضحة في الصفحة التالية فقط.',
    source: sourceRef([20, 21]),
  },
  {
    id: 'garden-model-dimensions',
    description: 'تعرض صفحة مجسم الحدائق القياس 1:350 وأبعاداً مكتوبة بصيغة قد تُقرأ 4700م × 4700م، وهي صيغة وحدات ملتبسة.',
    handling: 'لم تُستخدم الأبعاد رقمياً، ولم تُصحح إلى وحدة مفترضة.',
    source: sourceRef([45]),
  },
  {
    id: 'visual-gallery-page-footer-offset',
    description: 'تبدأ أرقام التذييل المرئية في قسم ممر العصور بالتأخر صفحة واحدة عن رقم صفحة PDF الفعلي.',
    handling: 'يعتمد التتبع على رقم صفحة PDF الفعلي لا رقم التذييل المطبوع.',
    source: sourceRef([118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131]),
  },
];
