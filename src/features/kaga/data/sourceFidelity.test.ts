import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { eventDays } from './eventDays';
import { experiences } from './experiences';
import { journeys, journeyById } from './journeys';
import { mapPoints } from './spatialMap';
import { distanceBetweenPoints, pointAtPathProgress } from './svgPathGeometry';

function featureSourceText(directory = resolve(process.cwd(), 'src/features/kaga')): string {
  return readdirSync(directory, { withFileTypes: true }).map((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return featureSourceText(path);
    return /\.(?:ts|tsx|css)$/.test(entry.name) ? readFileSync(path, 'utf8') : '';
  }).join('\n');
}

describe('KAGA source-fidelity correction gates', () => {
  it('uses the source-faithful Devonian garden terminology exclusively', () => {
    const serialized = JSON.stringify({ journeys });
    const rejectedArabicTerm = ['الحديقة', 'الأفريقية'].join(' ');
    const rejectedLegacyId = ['african', 'Garden'].join('');
    expect(serialized).toContain('الحديقة الديفونية');
    expect(serialized).not.toContain(rejectedArabicTerm);
    expect(serialized).not.toContain(rejectedLegacyId);
  });

  it('uses the exact options-garden terminology and removes the rejected legacy term and identifier', () => {
    const rejectedArabicTerm = ['حديقة', 'الصباريات'].join(' ');
    const rejectedLegacyId = ['cactus', 'Garden'].join('');
    const sourceText = featureSourceText();
    for (const journey of journeys) {
      expect(journey.stops.some((stop) => stop.title.includes('حديقة الخيارات'))).toBe(true);
    }
    expect(mapPoints.optionsGarden.label).toBe('حديقة الخيارات');
    expect(sourceText).not.toContain(rejectedArabicTerm);
    expect(sourceText).not.toContain(rejectedLegacyId);
  });

  it('preserves the exact page-34 stop E title', () => {
    expect(journeyById.mayorMedia.stops.find((stop) => stop.code === 'E')?.title).toBe('ممر العصور');
  });

  it('preserves the authoritative page-25 title and ceremonial stop detail', () => {
    expect(journeyById.prince.title).toBe('رحلة سمو أمير المنطقة وسمو نائبه وسمو الأمين');
    const stop = journeyById.prince.stops.find((item) => item.code === 'B');
    expect(stop?.durationMinutes).toBe(40);
    expect(stop?.detailAr).toContain('مجسم الحدائق');
    expect(stop?.detailAr).toContain('سيتم نقل مؤقت لمجسم الحدائق إلى منطقة كبار الشخصيات يوم الزيارة فقط');
    expect(stop?.detailAr).toContain('النصب التذكاري');
  });

  it('preserves the page-26 ceremonial stop duration and detail', () => {
    const stop = journeyById.guests.stops.find((item) => item.code === 'C');
    expect(stop?.durationMinutes).toBe(60);
    expect(stop?.detailAr).toContain('مجسم الحدائق');
    expect(stop?.detailAr).toContain('النصب التذكاري');
  });

  it('resolves every journey stop experience ID to a real experience item', () => {
    const experienceIds = new Set(experiences.map((item) => item.id));
    const unresolved = journeys.flatMap((journey) => [
      ...journey.stops,
      ...(journey.optionalBranches ?? []).flatMap((branch) => branch.stops),
    ])
      .filter((stop) => stop.experienceId && !experienceIds.has(stop.experienceId))
      .map((stop) => `${stop.id}:${stop.experienceId}`);
    expect(unresolved).toEqual([]);
  });

  it('defines the page-34 mayor and media-minister journey independently', () => {
    const journey = journeyById.mayorMedia;
    expect(journey.title).toBe('رحلة سمو الأمين ومعالي وزير الإعلام');
    expect(journey.source.pdfPages).toEqual([34]);
    expect(journey.stops.map((stop) => stop.title)).toEqual(expect.arrayContaining([
      'المؤتمر الصحفي',
      'العشاء',
      'منطقة كبار الشخصيات',
    ]));
    expect(journeyById.mayor.source.pdfPages).toEqual([8]);
  });

  it('links Day 4 only to the two page-34/page-35 journeys', () => {
    expect(eventDays.find((day) => day.id === 'day-04')?.journeyIds).toEqual(['mayorMedia', 'media']);
  });

  it.each(journeys)('$id gives every primary stop a valid monotonic path anchor', (journey) => {
    const anchors = journey.stops.map((stop) => stop.pathProgress);
    expect(anchors.every((anchor) => anchor >= 0 && anchor <= 1)).toBe(true);
    for (let index = 1; index < anchors.length; index += 1) {
      expect(anchors[index]).toBeGreaterThan(anchors[index - 1]!);
    }
  });

  it('excludes optional nature-garden stops from default primary playback', () => {
    for (const id of ['workers', 'media'] as const) {
      const journey = journeyById[id];
      expect(journey.stops.some((stop) => stop.branchId)).toBe(false);
      expect(journey.stops.some((stop) => stop.title.includes('حديقة الطبيعة'))).toBe(false);
      expect(journey.optionalBranches?.[0]?.stops.every((stop) => stop.branchId === 'nature')).toBe(true);
    }
  });

  it.each(journeys)('$id keeps every primary stop on marker geometry within tolerance', (journey) => {
    for (const stop of journey.stops) {
      const marker = pointAtPathProgress(journey.playbackPath, stop.pathProgress);
      expect(distanceBetweenPoints(marker, stop.point)).toBeLessThanOrEqual(0.01);
    }
  });
});
