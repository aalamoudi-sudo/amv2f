import type { KnowledgeFaqItem } from './knowledgeTypes';
import { knowledgeGuideRef } from './knowledgeSourceMap';

export const knowledgeFaq: KnowledgeFaqItem[] = [
  {
    id: 'faq-what-is-kaga',
    questionAr: 'ما هي حدائق الملك عبدالله؟',
    answerAr: 'حدائق نباتية في مدينة الرياض، وتُعد أول حديقة نباتية شاملة من نوعها في المملكة العربية السعودية، ومن أكبر الحدائق النباتية المغطاة من حيث المساحة والتنوع النباتي والتصميم البيئي.',
    source: [knowledgeGuideRef([18])],
  },
  {
    id: 'faq-purpose',
    questionAr: 'ما الهدف من الحديقة؟',
    answerAr: 'الحفاظ على التنوع، ودعم البحث العلمي، ونشر الوعي البيئي، وتقديم تجربة تعليمية تروي تاريخ النباتات وتطورها.',
    source: [knowledgeGuideRef([18])],
  },
  {
    id: 'faq-distinction',
    questionAr: 'ما الذي يميز الحديقة؟',
    answerAr: 'اعتمادها على تقنيات التحكم بالمناخ لإعادة إنشاء بيئات نباتية متنوعة من أنحاء العالم في موقع واحد.',
    source: [knowledgeGuideRef([18])],
  },
  {
    id: 'faq-garden-count',
    questionAr: 'كم عدد الحدائق التي يضمها المشروع؟',
    answerAr: 'يضم المشروع 15 حديقة: 8 حدائق خارجية و7 حدائق داخلية.',
    relatedEntityIds: ['botanical-garden-count', 'internal-garden-count', 'external-garden-count'],
    source: [knowledgeGuideRef([19])],
  },
  {
    id: 'faq-internal-gardens',
    questionAr: 'ما أبرز الحدائق الداخلية؟',
    answerAr: 'الحديقة الديفونية، والحديقة الكربونية، والحديقة الجوراسية، والحديقة الطباشيرية، والحديقة البليوسينية، وحديقة الحياة الحديثة، وحديقة الخيارات.',
    relatedEntityIds: ['devonianGarden', 'carboniferousGarden', 'jurassicGarden', 'cretaceousGarden', 'plioceneGarden', 'modernLifeGarden', 'optionsGarden'],
    source: [knowledgeGuideRef([19])],
  },
  {
    id: 'faq-external-gardens',
    questionAr: 'ما أبرز الحدائق الخارجية؟',
    answerAr: 'حديقة الفراشات، وحديقة الطيور، وحديقة المتاهة، وحديقة الصوت والضوء، والحديقة الطبيعية، والحديقة المائية.',
    relatedEntityIds: ['butterflyGarden', 'aviaryGarden', 'mazeGarden', 'soundLightGarden', 'natureGarden', 'waterGarden'],
    source: [knowledgeGuideRef([19], 'exact', 'يسمي هذا الجواب ست حدائق رغم أن العدد الإجمالي المثبت للحدائق الخارجية هو ثمانٍ.')],
  },
  {
    id: 'faq-plant-origins',
    questionAr: 'من أين جرى توفير النباتات؟',
    answerAr: 'من عدة دول تشمل دول جنوب شرق آسيا، وأستراليا، وأمريكا اللاتينية، وعدداً من الدول الأوروبية.',
    source: [knowledgeGuideRef([19])],
  },
  {
    id: 'faq-beneficiaries',
    questionAr: 'من الفئات المستفيدة من الحديقة؟',
    answerAr: 'الباحثون، والطلاب، والجهات التعليمية، والعائلات، والزوار من داخل المملكة وخارجها.',
    source: [knowledgeGuideRef([20])],
  },
  {
    id: 'faq-not-only-recreation',
    questionAr: 'هل الحدائق ترفيهية فقط؟',
    answerAr: 'لا، بل تجمع بين التعليم والبحث العلمي والمحافظة على التنوع الحيوي إلى جانب التجربة التفاعلية للزوار.',
    source: [knowledgeGuideRef([20])],
  },
  {
    id: 'faq-crescent-prominence',
    questionAr: 'لماذا يُعد مبنى الهلالين العنصر الأبرز في المشروع؟',
    answerAr: 'يتميز بتصميم فريد يشكل هلالين متقابلين، ويوظف الإضاءة الطبيعية والتحكم بالمناخ الداخلي، مع فضاء معماري مفتوح يعزز ارتباط الزائر بالطبيعة.',
    relatedEntityIds: ['crescentBuilding'],
    source: [knowledgeGuideRef([20])],
  },
];

export const faqById = Object.fromEntries(knowledgeFaq.map((item) => [item.id, item])) as Record<string, KnowledgeFaqItem>;
