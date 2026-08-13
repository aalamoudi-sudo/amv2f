import { describe, expect, it } from 'vitest';
import { registeredJourneyById } from '../spatial/registeredJourneys';
import { journeyById } from './journeys';

describe('Guest Journey page-26 source contract', () => {
  const journey = journeyById.guests;

  it('preserves the exact source title, window, stop order, and durations', () => {
    expect(journey.title).toBe('رحلة الضيوف');
    expect(journey.window).toBe('من 05:30 م إلى 07:30 م');
    expect(journey.source.pdfPages).toEqual([26]);
    expect(journey.stops.map((stop) => stop.code)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']);
    expect(journey.stops.map((stop) => stop.title)).toEqual([
      'المدخل الرئيسي',
      'نقطة النزول وإركاب عربات الجولف',
      'الاستقبال والعرضة السعودية',
      'بداية الجولة التعريفية حديقة الخيارات',
      'الحديقة البليوسينية',
      'ممر العصور',
      'الحديقة العائلية',
      'حديقة الديفونية',
      'حديقة الحياة الحديثة',
      'نقطة نهاية الرحلة',
      'تسليم الهدايا',
      'مسار خروج رحلة الضيوف',
    ]);
    expect(journey.stops.map((stop) => stop.durationMinutes)).toEqual([
      undefined, undefined, 60, 6, 6, 4, 6, 6, 6, undefined, 5, undefined,
    ]);
  });

  it('preserves reception, temporary-model, valet, and options-garden detail', () => {
    expect(journey.stops.find((stop) => stop.code === 'B')?.detailAr).toBe('حيث يتم الاستقبال من قبل خدمة صف السيارات');
    const ceremonial = journey.stops.find((stop) => stop.code === 'C')!;
    expect(ceremonial.durationMinutes).toBe(60);
    expect(ceremonial.detailAr).toContain('مجسم الحدائق');
    expect(ceremonial.detailAr).toContain('سيتم نقل مؤقت لمجسم الحدائق إلى منطقة كبار الشخصيات يوم الزيارة فقط');
    expect(ceremonial.detailAr).toContain('النصب التذكاري');
    expect(journey.stops.find((stop) => stop.code === 'D')?.detailAr).toBe('حديقة الخيارات');
  });

  it('preserves transport semantics and the sourced 1400m tour', () => {
    expect(journey.segments.map((segment) => [segment.kind, segment.transport])).toEqual([
      ['entry', 'vehicle'],
      ['shuttle', 'golf-cart'],
      ['tour', 'golf-cart'],
      ['exit', 'golf-cart'],
      ['exit', 'vehicle'],
    ]);
    expect(journey.segments.find((segment) => segment.kind === 'tour')?.distanceMeters).toBe(1400);
  });

  it('rebuilds route anchors from V.15 while keeping one monotonic A-L playback timeline', () => {
    const registered = registeredJourneyById.guests;
    expect(journey.registrationTransform?.sourceCoordinateSpace).toBe('KAGA-VISITOR-V15-SLIDE-4');
    expect(registered.stops.map((stop) => stop.code)).toEqual(journey.stops.map((stop) => stop.code));
    journey.stops.forEach((stop, index) => {
      if (index > 0) expect(stop.pathProgress).toBeGreaterThan(journey.stops[index - 1]!.pathProgress);
    });
    registered.stops.forEach((stop, index) => {
      if (index > 0) expect(stop.pathProgress).toBeGreaterThan(registered.stops[index - 1]!.pathProgress);
    });
  });

  it('contains no extra or omitted mandatory stops', () => {
    expect(new Set(journey.stops.map((stop) => stop.id)).size).toBe(12);
    expect(journey.optionalBranches).toBeUndefined();
  });
});
