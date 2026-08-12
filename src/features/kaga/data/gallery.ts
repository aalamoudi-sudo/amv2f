import type { GalleryEnvironment } from '../types';
import { sourceRef } from './sourceReferences';

const angles = (folder: string, startPage: number, endPage: number, title: string) =>
  Array.from({ length: endPage - startPage + 1 }, (_, index) => {
    const page = startPage + index;
    return {
      src: `/kaga/assets/gallery/${folder}/angle-${String(index + 1).padStart(2, '0')}-p${String(page).padStart(3, '0')}.webp`,
      alt: `${title} - زاوية ${index + 1}`,
      source: sourceRef([page]),
    };
  });

export const galleryEnvironments: GalleryEnvironment[] = [
  { id: 'vip', title: 'منطقة كبار الشخصيات', description: 'تكوينات جلوس خارجية وإضاءة نباتية ضمن المشهد الليلي.', images: angles('vip', 79, 84, 'منطقة كبار الشخصيات'), source: sourceRef([78, 79, 80, 81, 82, 83, 84]) },
  { id: 'majlis', title: 'المجلس', description: 'مشاهد المجلس وتوزيع الجلسات والأثاث والإضاءة من زوايا متعددة.', images: angles('majlis', 86, 98, 'المجلس'), source: sourceRef([85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98]) },
  { id: 'dinner', title: 'منطقة العشاء', description: 'توزيع موائد العشاء وممرات الخدمة والتنسيق النباتي.', images: angles('dinner', 100, 107, 'منطقة العشاء'), source: sourceRef([99, 100, 101, 102, 103, 104, 105, 106, 107]) },
  { id: 'memory', title: 'ركن الذكريات', description: 'التكوين المقترح لقوسَي التصوير وتفاصيل القاعدة.', images: angles('memory', 109, 110, 'ركن الذكريات'), source: sourceRef([108, 109, 110]) },
  { id: 'memorial', title: 'النصب التذكاري', description: 'زوايا النصب الحجري والصندوق الزجاجي ومجسم التدشين.', images: angles('memorial', 112, 114, 'النصب التذكاري'), source: sourceRef([111, 112, 113, 114]) },
  { id: 'garden-model', title: 'مجسم الحدائق', description: 'المجسم التفاعلي المقترح وتفاصيل هيكله والعرض المحيط به.', images: angles('garden-model', 116, 117, 'مجسم الحدائق'), source: sourceRef([115, 116, 117]) },
  { id: 'era-walk', title: 'ممر العصور', description: 'بيئة الممر المتحفي ومحطاته وشاشاته والتكوينات النباتية.', images: angles('era-walk', 119, 125, 'ممر العصور'), source: sourceRef([118, 119, 120, 121, 122, 123, 124, 125]) },
  { id: 'press', title: 'المؤتمر الصحفي', description: 'المسرح وتوزيع المقاعد والمنصة من مستويات وزوايا مختلفة.', images: angles('press', 127, 131, 'المؤتمر الصحفي'), source: sourceRef([126, 127, 128, 129, 130, 131]) },
];
