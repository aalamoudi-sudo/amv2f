import { experiences } from '../data/experiences';
import { journeyById } from '../data/journeys';
import { registeredJourneyById } from '../spatial/registeredJourneys';

export type ExecutiveDelightActId = 'majesty' | 'discovery' | 'journey' | 'experience' | 'depth' | 'return' | 'glimpse' | 'tease';

export type KineticCameraState =
  | 'cinematic-majesty'
  | 'site-reveal'
  | 'route-origin'
  | 'route-awakening'
  | 'approach-b'
  | 'travel-ab'
  | 'travel-bc'
  | 'arrival-approach'
  | 'arrival-settle'
  | 'aperture-origin'
  | 'aperture-expand'
  | 'experience-wide'
  | 'xray-place'
  | 'xray-journey'
  | 'xray-protocol'
  | 'xray-experience'
  | 'xray-content'
  | 'spatial-collapse'
  | 'return-c'
  | 'garden-approach'
  | 'garden-glimpse'
  | 'royal-trace'
  | 'royal-hold';

export type ExperienceShotId = 'none' | 'wide' | 'performers' | 'flag' | 'protocol';

export interface KineticDramaturgyState {
  id: KineticCameraState;
  startsAtMs: number;
  endsAtMs: number;
  subjectAr: string;
  narrativeBeatAr: string;
  shot: ExperienceShotId;
}

export interface ExecutiveDelightAct {
  id: ExecutiveDelightActId;
  startsAtMs: number;
  endsAtMs: number;
  titleAr: string;
  sourcePages: number[];
}

export const executiveDelightActs: ExecutiveDelightAct[] = [
  { id: 'majesty', startsAtMs: 0, endsAtMs: 6_000, titleAr: 'المهابة', sourcePages: [1] },
  { id: 'discovery', startsAtMs: 6_000, endsAtMs: 13_000, titleAr: 'دخول الموقع', sourcePages: [1, 26] },
  { id: 'journey', startsAtMs: 13_000, endsAtMs: 41_000, titleAr: 'الرحلة', sourcePages: [26] },
  { id: 'experience', startsAtMs: 41_000, endsAtMs: 52_000, titleAr: 'المكان يصبح تجربة', sourcePages: [26, 27] },
  { id: 'depth', startsAtMs: 52_000, endsAtMs: 67_000, titleAr: 'كشف التجربة', sourcePages: [25, 26, 27] },
  { id: 'return', startsAtMs: 67_000, endsAtMs: 76_000, titleAr: 'العودة إلى المكان', sourcePages: [26, 27] },
  { id: 'glimpse', startsAtMs: 76_000, endsAtMs: 84_000, titleAr: 'امتداد الرحلة', sourcePages: [26] },
  { id: 'tease', startsAtMs: 84_000, endsAtMs: 92_000, titleAr: 'لحظة التدشين', sourcePages: [15] },
];

export const kineticDramaturgyStates: readonly KineticDramaturgyState[] = [
  { id: 'cinematic-majesty', startsAtMs: 0, endsAtMs: 6_000, subjectAr: 'المشهد الجوي', narrativeBeatAr: 'المهابة', shot: 'none' },
  { id: 'site-reveal', startsAtMs: 6_000, endsAtMs: 10_000, subjectAr: 'الموقع الكامل', narrativeBeatAr: 'دخول الموقع', shot: 'none' },
  { id: 'route-origin', startsAtMs: 10_000, endsAtMs: 13_000, subjectAr: 'بداية رحلة الضيوف', narrativeBeatAr: 'اكتشاف نقطة البداية', shot: 'none' },
  { id: 'route-awakening', startsAtMs: 13_000, endsAtMs: 17_000, subjectAr: 'المحطة A', narrativeBeatAr: 'استيقاظ المسار', shot: 'none' },
  { id: 'approach-b', startsAtMs: 17_000, endsAtMs: 22_000, subjectAr: 'الانتقال نحو B', narrativeBeatAr: 'الاقتراب', shot: 'none' },
  { id: 'travel-ab', startsAtMs: 22_000, endsAtMs: 27_000, subjectAr: 'المسار A إلى B', narrativeBeatAr: 'الحركة في الموقع', shot: 'none' },
  { id: 'travel-bc', startsAtMs: 27_000, endsAtMs: 32_000, subjectAr: 'المسار B إلى C', narrativeBeatAr: 'الانتقال إلى الاستقبال', shot: 'none' },
  { id: 'arrival-approach', startsAtMs: 32_000, endsAtMs: 36_000, subjectAr: 'محيط المحطة C', narrativeBeatAr: 'التباطؤ', shot: 'none' },
  { id: 'arrival-settle', startsAtMs: 36_000, endsAtMs: 41_000, subjectAr: 'المحطة C', narrativeBeatAr: 'الوصول', shot: 'none' },
  { id: 'aperture-origin', startsAtMs: 41_000, endsAtMs: 45_000, subjectAr: 'مرساة المحطة C', narrativeBeatAr: 'فتح المكان', shot: 'wide' },
  { id: 'aperture-expand', startsAtMs: 45_000, endsAtMs: 48_000, subjectAr: 'الانتقال المكاني', narrativeBeatAr: 'المكان يصبح تجربة', shot: 'wide' },
  { id: 'experience-wide', startsAtMs: 48_000, endsAtMs: 52_000, subjectAr: 'مشهد العرضة الكامل', narrativeBeatAr: 'تأسيس التجربة', shot: 'wide' },
  { id: 'xray-place', startsAtMs: 52_000, endsAtMs: 55_000, subjectAr: 'الموقع', narrativeBeatAr: 'كشف الموقع', shot: 'wide' },
  { id: 'xray-journey', startsAtMs: 55_000, endsAtMs: 58_000, subjectAr: 'الرحلة', narrativeBeatAr: 'كشف الرحلة', shot: 'performers' },
  { id: 'xray-protocol', startsAtMs: 58_000, endsAtMs: 61_000, subjectAr: 'البروتوكول', narrativeBeatAr: 'كشف البروتوكول', shot: 'flag' },
  { id: 'xray-experience', startsAtMs: 61_000, endsAtMs: 64_000, subjectAr: 'التجربة', narrativeBeatAr: 'كشف التجربة', shot: 'protocol' },
  { id: 'xray-content', startsAtMs: 64_000, endsAtMs: 67_000, subjectAr: 'المحتوى المرتبط', narrativeBeatAr: 'اكتمال الرسم الذكي', shot: 'wide' },
  { id: 'spatial-collapse', startsAtMs: 67_000, endsAtMs: 71_000, subjectAr: 'العودة إلى مرساة C', narrativeBeatAr: 'انكماش التجربة', shot: 'wide' },
  { id: 'return-c', startsAtMs: 71_000, endsAtMs: 76_000, subjectAr: 'المحطة C والمسار', narrativeBeatAr: 'استعادة المكان', shot: 'none' },
  { id: 'garden-approach', startsAtMs: 76_000, endsAtMs: 80_000, subjectAr: 'المسار نحو D', narrativeBeatAr: 'استمرار الرحلة', shot: 'none' },
  { id: 'garden-glimpse', startsAtMs: 80_000, endsAtMs: 84_000, subjectAr: 'حديقة الخيارات', narrativeBeatAr: 'لمحة أعمق', shot: 'none' },
  { id: 'royal-trace', startsAtMs: 84_000, endsAtMs: 88_000, subjectAr: 'مجسم لحظة التدشين', narrativeBeatAr: 'الإشارة الاحتفائية', shot: 'none' },
  { id: 'royal-hold', startsAtMs: 88_000, endsAtMs: 92_000, subjectAr: 'لحظة التدشين', narrativeBeatAr: 'الختام المفتوح', shot: 'none' },
] as const;

export const guestDelightJourney = registeredJourneyById.guests;
export const guestDelightSourceJourney = journeyById.guests;
export const guestDelightSignatureStop = guestDelightJourney.stops.find((stop) => stop.code === 'C')!;
export const guestDelightExperience = experiences.find((experience) => experience.id === 'royal-arrival')!;

export const signatureStopDecision = {
  stopCode: 'C',
  reasonAr: 'المحطة C هي لحظة الاستقبال والعرضة السعودية الواردة صراحة في صفحة 26، وترتبط بأصل بصري معتمد في صفحة 27 وبمرساة محطة محفوظة على مسار الضيوف. يستخدم الانتقال مرساة الرحلة ولا يدّعي بصمة مكان دقيقة مستقلة.',
  anchorConfidence: guestDelightSignatureStop.anchorConfidence,
  sourcePages: [25, 26, 27],
} as const;

export const xrayAnnotations = [
  { id: 'place', labelAr: 'الموقع', valueAr: 'محطة الاستقبال على رحلة الضيوف', sourcePages: [26] },
  { id: 'journey', labelAr: 'الرحلة', valueAr: 'رحلة الضيوف · المحطة C', sourcePages: [26] },
  { id: 'protocol', labelAr: 'البروتوكول', valueAr: 'الاستقبال والعرضة السعودية', sourcePages: [25, 26] },
  { id: 'experience', labelAr: 'التجربة', valueAr: 'مجسم الحدائق والنصب التذكاري', sourcePages: [25, 26, 27] },
  { id: 'content', labelAr: 'المحتوى المرتبط', valueAr: 'مدة المحطة 60 دقيقة', sourcePages: [26] },
] as const;

export function delightActAt(elapsedMs: number) {
  return executiveDelightActs.find((act) => elapsedMs >= act.startsAtMs && elapsedMs < act.endsAtMs)
    ?? executiveDelightActs.at(-1)!;
}

export function kineticStateAt(elapsedMs: number) {
  return kineticDramaturgyStates.find((state) => elapsedMs >= state.startsAtMs && elapsedMs < state.endsAtMs)
    ?? kineticDramaturgyStates.at(-1)!;
}

const interpolate = (start: number, end: number, progress: number) => start + ((end - start) * Math.max(0, Math.min(1, progress)));

export function guestProgressAtDelightTime(elapsedMs: number) {
  const stopA = guestDelightJourney.stops.find((stop) => stop.code === 'A')!;
  const stopB = guestDelightJourney.stops.find((stop) => stop.code === 'B')!;
  const stopC = guestDelightSignatureStop;
  const stopD = guestDelightJourney.stops.find((stop) => stop.code === 'D')!;
  if (elapsedMs < 13_000) return stopA.pathProgress;
  if (elapsedMs < 22_000) return interpolate(stopA.pathProgress, stopB.pathProgress, (elapsedMs - 13_000) / 9_000);
  if (elapsedMs < 36_000) return interpolate(stopB.pathProgress, stopC.pathProgress, (elapsedMs - 22_000) / 14_000);
  if (elapsedMs < 76_000) return stopC.pathProgress;
  if (elapsedMs < 84_000) return interpolate(stopC.pathProgress, stopD.pathProgress, (elapsedMs - 76_000) / 8_000);
  return stopD.pathProgress;
}
