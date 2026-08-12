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
      'بداية الجولة التعريفية - حديقة الخيارات',
      'الحديقة البليوسينية',
      'ممر العصور',
      'الحديقة العائلية',
      'الحديقة الديفونية',
      'الحديقة الحديثة',
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
    ]);
    expect(journey.segments.find((segment) => segment.kind === 'tour')?.distanceMeters).toBe(1400);
  });

  it('keeps the approved route anchors and registered geometry unchanged', () => {
    expect(journey.stops.map((stop) => stop.pathProgress)).toEqual([0, .16, .28, .4, .48, .6, .67, .72, .77, .82, .88, 1]);
    expect(registeredJourneyById.guests.stops.map((stop) => stop.code)).toEqual(journey.stops.map((stop) => stop.code));
    expect(registeredJourneyById.guests.stops.map((stop) => stop.pathProgress)).toEqual([0, .16, .28, .4, .48, .6, .67, .72, .77, .82, .88, 1]);
  });

  it('contains no extra or omitted mandatory stops', () => {
    expect(new Set(journey.stops.map((stop) => stop.id)).size).toBe(12);
    expect(journey.optionalBranches).toBeUndefined();
  });
});
