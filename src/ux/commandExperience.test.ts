import { describe, expect, it } from 'vitest';
import { productAreaForWorkspace, productAreas, presentationPresetLabels, workspaceTitle } from './commandExperience';

describe('universal command navigation model', () => {
  it('defines the five event-agnostic product areas and stable workspace mapping', () => {
    expect(productAreas.map((area) => area.labelAr)).toEqual(['القيادة', 'العمليات', 'المكان', 'التجربة', 'الإدارة التقنية']);
    expect(productAreaForWorkspace('executive')).toBe('leadership');
    expect(productAreaForWorkspace('command')).toBe('operations');
    expect(productAreaForWorkspace('spatial')).toBe('place');
    expect(productAreaForWorkspace('experience')).toBe('experience');
    expect(productAreaForWorkspace('iot')).toBe('technical');
  });

  it('labels display presets and routes in Arabic without attaching production permission semantics', () => {
    expect(presentationPresetLabels).toEqual({ executive: 'عرض تنفيذي', operator: 'عرض تشغيلي', technical: 'عرض تقني' });
    expect(workspaceTitle('configuration')).toBe('تهيئة الفعاليات والحزم التشغيلية');
    expect(workspaceTitle('launcher')).toBe('اختيار السياق');
  });
});
