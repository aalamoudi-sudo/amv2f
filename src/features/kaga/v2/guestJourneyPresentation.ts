import { journeyById } from '../data/journeys';

export type GuestTransportMode = 'car' | 'golf-cart' | 'tour' | 'exit';

export interface GuestStopPresentation {
  code: string;
  shortTitleAr: string;
  descriptionAr: string;
  transport: GuestTransportMode;
}

export const guestTransportLabels: Record<GuestTransportMode, string> = {
  car: 'سيارة',
  'golf-cart': 'عربة جولف',
  tour: 'جولة',
  exit: 'خروج',
};

export const guestStopPresentation: GuestStopPresentation[] = [
  { code: 'A', shortTitleAr: 'المدخل الرئيسي', descriptionAr: 'وصول الضيوف إلى المدخل الرئيسي من المواقف بالسيارة.', transport: 'car' },
  { code: 'B', shortTitleAr: 'النزول وعربات الجولف', descriptionAr: 'نقطة النزول وإركاب عربات الجولف، حيث يتم الاستقبال من قبل خدمة صف السيارات.', transport: 'golf-cart' },
  { code: 'C', shortTitleAr: 'الاستقبال والعرضة', descriptionAr: 'الاستقبال والعرضة السعودية، ومجسم الحدائق والنصب التذكاري.', transport: 'golf-cart' },
  { code: 'D', shortTitleAr: 'بداية الجولة', descriptionAr: 'بداية الجولة التعريفية من حديقة الخيارات.', transport: 'tour' },
  { code: 'E', shortTitleAr: 'الحديقة البليوسينية', descriptionAr: 'تنتقل الجولة إلى الحديقة البليوسينية وفق تسلسل رحلة الضيوف.', transport: 'tour' },
  { code: 'F', shortTitleAr: 'ممر العصور', descriptionAr: 'تمر رحلة الضيوف عبر ممر العصور.', transport: 'tour' },
  { code: 'G', shortTitleAr: 'الحديقة العائلية', descriptionAr: 'تتواصل الجولة في الحديقة العائلية.', transport: 'tour' },
  { code: 'H', shortTitleAr: 'الحديقة الديفونية', descriptionAr: 'تصل الجولة إلى الحديقة الديفونية.', transport: 'tour' },
  { code: 'I', shortTitleAr: 'الحديقة الحديثة', descriptionAr: 'تختتم محطات الحدائق في الحديقة الحديثة.', transport: 'tour' },
  { code: 'J', shortTitleAr: 'نهاية الرحلة', descriptionAr: 'نقطة نهاية جولة رحلة الضيوف.', transport: 'tour' },
  { code: 'K', shortTitleAr: 'تسليم الهدايا', descriptionAr: 'تُسلّم الهدايا للضيوف قبل المغادرة.', transport: 'golf-cart' },
  { code: 'L', shortTitleAr: 'مسار الخروج', descriptionAr: 'مسار خروج رحلة الضيوف بعربة الجولف.', transport: 'exit' },
];

export const guestStopPresentationByCode = Object.fromEntries(
  guestStopPresentation.map((item) => [item.code, item]),
) as Record<string, GuestStopPresentation>;

export const guestJourneyMovementSummary = journeyById.guests.segments.map((segment) => ({
  id: segment.id,
  labelAr: segment.label,
  transportAr: segment.transport === 'vehicle' ? 'سيارة' : 'عربة جولف',
  distanceMeters: segment.distanceMeters,
  realDurationMinutes: segment.realDurationMinutes,
}));
