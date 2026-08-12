import type { GardenKnowledge } from './knowledgeTypes';
import { knowledgeGuideRef } from './knowledgeSourceMap';

export const internalGardens: GardenKnowledge[] = [
  {
    id: 'devonianGarden',
    titleAr: 'الحديقة الديفونية',
    category: 'internal',
    areaSqm: 3_600,
    descriptionAr: 'تعطي هذه الحدائق الانطباع الأول عن أصول النباتات والحياة على كوكب الأرض، وسيتم تشكيل النباتات والمناخ الذي كان قبل 400 مليون عام.',
    source: [knowledgeGuideRef([10])],
  },
  {
    id: 'carboniferousGarden',
    titleAr: 'الحديقة الكربونية',
    category: 'internal',
    areaSqm: 6_500,
    descriptionAr: 'الهدف من هذه الحديقة هو إعادة بناء البيئة الرطبة للمستنقعات الفحمية التي وجدت في خطوط العرض المماثلة للمملكة العربية السعودية أثناء الجزء الأول من الفترة الفحمية، منذ ما يزيد عن 300 مليون سنة.',
    source: [knowledgeGuideRef([10])],
  },
  {
    id: 'jurassicGarden',
    titleAr: 'الحديقة الجوراسية',
    category: 'internal',
    areaSqm: 6_500,
    descriptionAr: 'سيتم في هذه الحديقة إعادة الغابات الطبيعية الخصبة من عصر الديناصورات، باستخدام ذلك في إظهار تنوع الجيمنوسبيرمات والسراخس الحية.',
    source: [knowledgeGuideRef([10])],
  },
  {
    id: 'cretaceousGarden',
    titleAr: 'الحديقة الطباشيرية',
    category: 'internal',
    areaSqm: 6_500,
    descriptionAr: 'الهدف من هذه الحديقة هو إعادة بيان أصول الأزهار المختلفة وما كان فيها من تنوع، وفي هذه الحديقة ستوضع الأشكال الحية لهذه الزهور القديمة بجانب المجموعات النباتية المعاصرة.',
    source: [knowledgeGuideRef([10])],
  },
  {
    id: 'modernLifeGarden',
    titleAr: 'حديقة الحياة الحديثة',
    category: 'internal',
    areaSqm: 2_800,
    descriptionAr: 'الهدف من هذه الحديقة هو إظهار واستكشاف المجموعة المتنوعة الرائعة من الأزهار، وهذا النوع من المكتبة الحية يؤسس كمصدر تعليمي للطلاب، ومنظر جمالي للزوار.',
    source: [knowledgeGuideRef([10])],
  },
  {
    id: 'plioceneGarden',
    titleAr: 'الحديقة البليوسينية',
    category: 'internal',
    areaSqm: 4_800,
    descriptionAr: 'يعرض في هذه الحديقة موضوع تغير المناخ، مع الاهتمام بالتغير في المملكة العربية السعودية وحياة النبات في الرياض أثناء العصور الجيولوجية السابقة الأكثر حداثة.',
    source: [knowledgeGuideRef([10])],
  },
  {
    id: 'optionsGarden',
    titleAr: 'حديقة الخيارات',
    category: 'internal',
    areaSqm: 3_800,
    descriptionAr: 'سيتم زراعة الحديقة بأنواع النباتات الضرورية لحياتنا على الكرة الأرضية من ناحية الاستخدامات الطبية والطاقة، بالإضافة إلى الأنواع التي تحقق الاستقرار للكثبان الرملية وشواطئ البحر.',
    source: [knowledgeGuideRef([10])],
  },
];

export const namedExternalGardens: GardenKnowledge[] = [
  {
    id: 'butterflyGarden',
    titleAr: 'حديقة الفراشات',
    category: 'external',
    areaSqm: 2_900,
    descriptionAr: 'تحتوي هذه الحديقة على أنواع مختلفة من الفراشات النادرة والمحلية والاستوائية ومرتفعة الرطوبة والصحراوية والقاحلة، الداخلية والخارجية، وسيتم تقسيمها إلى منطقتين: منطقة للفراشات الاستوائية والنادرة، ومنطقة أخرى للفراشات المحلية.',
    source: [knowledgeGuideRef([11])],
  },
  {
    id: 'aviaryGarden',
    titleAr: 'حديقة الطيور',
    category: 'external',
    areaSqm: 6_500,
    descriptionAr: 'تهدف حديقة الطيور المقترحة إلى تقديم مجموعة متنوعة وغنية من أنواع الطيور النادرة، في هيكل مسور بالسياج، مما سيمثل إضافة إلى المعارض الرئيسية الأخرى.',
    source: [knowledgeGuideRef([11])],
  },
  {
    id: 'mazeGarden',
    titleAr: 'حديقة المتاهة',
    category: 'external',
    areaSqm: 4_600,
    descriptionAr: 'مبدأ حديقة المتاهة قائم على رغبة الإنسان الفطرية في حب الاستكشاف وإثارة الفضول، وتزود الزائر بتجربة شخصية تقوده للوصول إلى المركز والمنطقة المطوقة.',
    source: [knowledgeGuideRef([11])],
  },
  {
    id: 'soundLightGarden',
    titleAr: 'حديقة الصوت والضوء',
    category: 'external',
    areaSqm: 1_000,
    descriptionAr: 'تعد حديقة الصوت والضوء استمراراً لفكرة التعلم عن طريق التشويق والتفاعل، حيث تعرض الحدائق في مجموعات دائرية متشابكة ومحاطة بالسياج، بما يتيح إدارتها بشكل منفصل وفتحها أو إغلاقها حسب الحاجة.',
    source: [knowledgeGuideRef([11])],
  },
  {
    id: 'natureGarden',
    titleAr: 'الحديقة الطبيعية',
    category: 'external',
    areaSqm: 5_000,
    descriptionAr: 'الوظيفة الرئيسية لهذه الحديقة تعليمية، من خلال عرض مجموعة متنوعة من النباتات المستخدمة لأغراض طبية، كما تبرز وجود العلاج في بيئتنا الطبيعية.',
    source: [knowledgeGuideRef([11])],
  },
  {
    id: 'waterGarden',
    titleAr: 'الحديقة المائية',
    category: 'external',
    areaSqm: 3_000,
    descriptionAr: 'تبرز الحدائق المائية استخدام المياه كعنصر للتفاعل والتفاصيل، وتعالج ندرة المياه في الموقع كنقطة بداية، ويمتد مفهومها بأسلوب مبتكر.',
    source: [knowledgeGuideRef([11])],
  },
];

export const gardens: GardenKnowledge[] = [...internalGardens, ...namedExternalGardens];

export const gardenById = Object.fromEntries(gardens.map((garden) => [garden.id, garden])) as Record<string, GardenKnowledge>;
