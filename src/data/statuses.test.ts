import { describe, expect, it } from 'vitest';
import { getStatusConfig, statusConfig } from './statuses';
import { operationalStatusValues } from '../types/status';

describe('operational status mapping', () => {
  it('defines Arabic labels and visual treatments for every supported status', () => {
    for (const status of operationalStatusValues) {
      const config = getStatusConfig(status);

      expect(config.value).toBe(status);
      expect(config.labelAr.length).toBeGreaterThan(2);
      expect(config.hexColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(config.sceneColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(config.surfaceClass).toContain('bg-');
      expect(config.borderClass).toContain('border-');
    }
  });

  it('uses the required Arabic operational status names', () => {
    expect(Object.values(statusConfig).map((status) => status.labelAr)).toEqual([
      'غير مفعلة',
      'قيد التجهيز',
      'جاهزة',
      'تحتاج متابعة',
      'متأخرة',
      'عالية الخطورة',
      'مغلقة',
      'طوارئ'
    ]);
  });
});
