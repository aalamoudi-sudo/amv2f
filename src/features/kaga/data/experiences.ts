import type { ExperienceItem } from '../types';
import { sourceRef } from './sourceReferences';

export const experiences: ExperienceItem[] = [
  { id: 'reception', title: 'الاستقبال والضيافة', location: 'مقدمة رحلة الزائر', description: 'منطقة لاستقبال الضيوف بالقهوة السعودية والتمر، وتسليم الدروع التذكارية عند التوديع.', image: '/kaga/assets/experiences/reception-p042.webp', source: sourceRef([41, 42]) },
  { id: 'royal-arrival', title: 'الاستقبال والعرضة السعودية', location: 'محطة الاستقبال الرسمية', description: 'استقبال الضيوف بالعرضة السعودية، مع مجسم الحدائق والنصب التذكاري وفق تسلسل الزيارة المعتمد.', image: '/kaga/assets/core/saudi-ardah-p027.webp', source: sourceRef([25, 26, 27]) },
  { id: 'vip-area', title: 'منطقة كبار الشخصيات', description: 'مساحة مصممة لتنسجم مع أجواء الحديقة وتاريخ الحدث وتثري رحلة الضيوف.', image: '/kaga/assets/experiences/vip-p043.webp', source: sourceRef([43]) },
  { id: 'garden-model', title: 'مجسم الحدائق', description: 'مجسم تفصيلي يبرز العناصر المعمارية والطبيعية، مع شاشة تفاعلية مقترحة للتحكم والتعرّف إلى مكونات الحدائق.', image: '/kaga/assets/experiences/garden-model-p045.webp', source: sourceRef([45]) },
  { id: 'era-walk', title: 'ممر العصور', description: 'ممر متحفي من مجسمات شفافة مستقلة وشاشات تفاعلية، تمثل كل محطة فيه حقبة جيولوجية وعناصرها النباتية.', image: '/kaga/assets/experiences/era-walk-render-p049.webp', source: sourceRef([48, 49]) },
  { id: 'memory-corner', title: 'ركن الذكريات', description: 'مساحة تصوير على شكل قوسين زجاجيين بإضاءة مدمجة وتكوينات نباتية مستوحاة من هوية الحديقة.', image: '/kaga/assets/experiences/memory-corner-p047.webp', source: sourceRef([47]) },
  { id: 'memorial', title: 'النصب التذكاري', description: 'قاعدة حجرية وصندوق زجاجي يحتضن مجسم التدشين بوصفه الجزء المحوري للنصب.', image: '/kaga/assets/experiences/memorial-p046.webp', source: sourceRef([46]) },
  { id: 'press-conference', title: 'المؤتمر الصحفي', description: 'توزيع شعاعي يركز الرؤية على منصة رئيسية وبوديوم المتحدث، مع منطقة أمامية لكبار الشخصيات ومقاعد لـ200 ضيف وإعلامي.', image: '/kaga/assets/experiences/press-conference-p036.webp', source: sourceRef([32, 33, 36]) },
  { id: 'dinner', title: 'منطقة العشاء', description: 'مساحة عشاء بهوية الحدائق، مخصصة لنوعية الحفل وفئة حضوره، وتتسع حتى 200 ضيف.', image: '/kaga/assets/experiences/dinner-p037.webp', source: sourceRef([37]) },
];
