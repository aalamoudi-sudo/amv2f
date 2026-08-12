import type { SourceReference } from '../types';
import { galleryEnvironments } from './gallery';
import { identityApplications } from './identity';
import { sourceRef } from './sourceReferences';

export interface KagaAsset {
  id: string;
  path: string;
  kind: 'core' | 'experience' | 'mobile' | 'invitation' | 'identity' | 'gallery';
  alt: string;
  source: SourceReference;
}

const asset = (id: string, path: string, kind: KagaAsset['kind'], alt: string, page: number): KagaAsset => ({ id, path, kind, alt, source: sourceRef([page]) });

const standaloneAssets: KagaAsset[] = [
  asset('cover', '/kaga/assets/core/cover-p001.webp', 'core', 'الغلاف الرسمي لتدشين حدائق الملك عبدالله', 1),
  asset('workers-map', '/kaga/assets/core/workers-masterplan-p007.webp', 'core', 'مخطط رحلة العاملين', 7),
  asset('mayor-map', '/kaga/assets/core/mayor-masterplan-p008.webp', 'core', 'مخطط رحلة سمو الأمين', 8),
  asset('iconic-photo', '/kaga/assets/core/iconic-photo-p009.webp', 'core', 'موقع الصورة الأيقونية', 9),
  asset('commemorative-gift', '/kaga/assets/core/commemorative-gift-p010.webp', 'core', 'الهدية التذكارية', 10),
  asset('royal-moment', '/kaga/assets/core/royal-moment-p015.webp', 'core', 'مجسم لحظة التدشين الملكي', 15),
  asset('royal-shield-open', '/kaga/assets/core/royal-shield-open-p017.webp', 'core', 'الدرع التذكاري الملكي مفتوحاً', 17),
  asset('royal-shield', '/kaga/assets/core/royal-shield-p018.webp', 'core', 'الدرع التذكاري الملكي', 18),
  asset('launch-show', '/kaga/assets/core/launch-show-p020.webp', 'core', 'التصور البصري لعرض التدشين', 20),
  asset('launch-layers', '/kaga/assets/core/launch-layers-p021.webp', 'core', 'تقنيات عرض التدشين', 21),
  asset('prince-day', '/kaga/assets/core/prince-day-p023.webp', 'core', 'بطاقة زيارة أمير منطقة الرياض', 23),
  asset('prince-map', '/kaga/assets/core/prince-masterplan-p025.webp', 'core', 'مخطط رحلة أمير منطقة الرياض', 25),
  asset('guests-map', '/kaga/assets/core/guests-masterplan-p026.webp', 'core', 'مخطط رحلة الضيوف', 26),
  asset('saudi-ardah', '/kaga/assets/core/saudi-ardah-p027.webp', 'core', 'العرضة السعودية', 27),
  asset('vip-book', '/kaga/assets/core/vip-book-p028.webp', 'core', 'سجل كبار الشخصيات', 28),
  asset('prince-shield', '/kaga/assets/core/prince-shield-p029.webp', 'core', 'الدرع التذكاري لسمو أمير منطقة الرياض', 29),
  asset('deputy-prince-shield', '/kaga/assets/core/deputy-prince-shield-p030.webp', 'core', 'الدرع التذكاري لسمو نائب أمير منطقة الرياض', 30),
  asset('vip-shield', '/kaga/assets/core/vip-shield-p031.webp', 'core', 'الدرع التذكاري لكبار الشخصيات', 31),
  asset('press-day', '/kaga/assets/core/press-day-p032.webp', 'core', 'بطاقة يوم المؤتمر الصحفي', 32),
  asset('mayor-media-map', '/kaga/assets/core/mayor-media-masterplan-p034.webp', 'core', 'مخطط رحلة سمو الأمين ووزير الإعلام', 34),
  asset('media-map', '/kaga/assets/core/media-masterplan-p035.webp', 'core', 'مخطط مسار الإعلاميين', 35),
  asset('press-conference', '/kaga/assets/experiences/press-conference-p036.webp', 'experience', 'تصميم المؤتمر الصحفي', 36),
  asset('dinner', '/kaga/assets/experiences/dinner-p037.webp', 'experience', 'تصميم منطقة العشاء', 37),
  asset('media-minister-shield', '/kaga/assets/core/media-minister-shield-p038.webp', 'core', 'الدرع التذكاري لوزير الإعلام', 38),
  asset('vip-shield-alt', '/kaga/assets/core/vip-shield-alt-p039.webp', 'core', 'تصميم بديل لدرع كبار الشخصيات', 39),
  asset('vip-book-alt', '/kaga/assets/core/vip-book-alt-p040.webp', 'core', 'سجل كبار الشخصيات ضمن يوم المؤتمر', 40),
  asset('reception', '/kaga/assets/experiences/reception-p042.webp', 'experience', 'منطقة الاستقبال والضيافة', 42),
  asset('vip-area', '/kaga/assets/experiences/vip-p043.webp', 'experience', 'منطقة كبار الشخصيات', 43),
  asset('garden-model', '/kaga/assets/experiences/garden-model-p045.webp', 'experience', 'مجسم الحدائق', 45),
  asset('memorial', '/kaga/assets/experiences/memorial-p046.webp', 'experience', 'النصب التذكاري', 46),
  asset('memory-corner', '/kaga/assets/experiences/memory-corner-p047.webp', 'experience', 'ركن الذكريات', 47),
  asset('era-walk', '/kaga/assets/experiences/era-walk-p048.webp', 'experience', 'مفهوم ممر العصور', 48),
  asset('era-walk-render', '/kaga/assets/experiences/era-walk-render-p049.webp', 'experience', 'تصميم ممر العصور', 49),
  asset('mobile-concept', '/kaga/assets/mobile/concept-p051.webp', 'mobile', 'مفهوم المعرض المتنقل', 51),
  asset('mobile-exterior', '/kaga/assets/mobile/exterior-p054.webp', 'mobile', 'واجهة المعرض المتنقل', 54),
  asset('mobile-interior', '/kaga/assets/mobile/interior-screens-p055.webp', 'mobile', 'شاشات المعرض الداخلية', 55),
  asset('mobile-table', '/kaga/assets/mobile/interactive-table-p056.webp', 'mobile', 'الطاولة التفاعلية المركزية', 56),
  asset('mobile-gift-one', '/kaga/assets/mobile/seed-pencil-p057.webp', 'mobile', 'هدية القلم ذي البذور', 57),
  asset('mobile-gift-two', '/kaga/assets/mobile/seed-kit-p058.webp', 'mobile', 'هدية حوض البذور', 58),
  asset('invitation-platform', '/kaga/assets/invitations/platform-p060.webp', 'invitation', 'واجهة منصة إدارة الدعوات', 60),
  asset('invitation-control', '/kaga/assets/invitations/control-panel-p061.webp', 'invitation', 'لوحة تحكم الدعوات', 61),
  asset('invitation-printed', '/kaga/assets/invitations/printed-vip-p062.webp', 'invitation', 'الدعوة المطبوعة لكبار الشخصيات', 62),
];

const galleryAssets: KagaAsset[] = galleryEnvironments.flatMap((environment) => environment.images.map((image, index) => ({
  id: `gallery-${environment.id}-${index + 1}`,
  path: image.src,
  kind: 'gallery' as const,
  alt: image.alt,
  source: image.source,
})));

const identityAssets: KagaAsset[] = identityApplications.flatMap((application) => application.proposals.map((proposal, index) => ({
  id: `identity-${application.id}-${index + 1}`,
  path: proposal.image,
  kind: 'identity' as const,
  alt: `${application.title} - ${proposal.label}`,
  source: proposal.source,
})));

export const assetManifest: KagaAsset[] = [...standaloneAssets, ...identityAssets, ...galleryAssets];

export const assetById = new Map(assetManifest.map((item) => [item.id, item]));
