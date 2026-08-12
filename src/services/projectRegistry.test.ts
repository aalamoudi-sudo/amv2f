import { describe, expect, it } from 'vitest';
import { kapProjectId, projectRegistry, referenceExhibitionProjectId } from '../data/projectRegistry';
import { neutralFallbackEventTheme } from '../data/eventThemePackages';
import type { ProjectRegistryInput } from './projectRegistry';
import { ProjectRegistry, ProjectRegistryError } from './projectRegistry';

function inputFixture(): ProjectRegistryInput {
  const dateRange = { startAt: '2026-08-01T00:00:00.000Z', endAt: '2026-08-02T00:00:00.000Z', timeZone: 'Asia/Riyadh', assumption: false };
  return {
    projects: [{
      projectId: 'PROJECT-A', organizationId: 'ORG-1', nameAr: 'مشروع ألف', nameEn: 'Project A', description: 'وصف مشروع ألف', projectStatus: 'candidate', truthContext: 'temporary-demo', projectType: 'conference', eventIds: ['EVENT-A'], venueIds: ['VENUE-A'], defaultEventId: 'EVENT-A', themeId: neutralFallbackEventTheme.themeId, operationalPackIds: ['PACK-A'], sourceReferences: [{ sourceId: 'SOURCE-A', classification: 'candidate', statusAr: 'مرشح', noteAr: 'مرجع اختبار' }], owner: { organizationId: 'ORG-1', displayNameAr: 'مَيادين' }, dateRange, createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-02T00:00:00.000Z', revision: 1, contentHash: 'hash-a', sourceClassification: 'candidate-real', sourceStateAr: 'مصدر مرشح'
    }],
    events: [{ eventId: 'EVENT-A', projectId: 'PROJECT-A', nameAr: 'فعالية ألف', nameEn: 'Event A', eventType: 'conference', venueIds: ['VENUE-A'], dateRange, runtimePackageId: 'PACK-A', experiencePackId: null, spatialCommandPackId: null, readinessPackId: null }],
    venues: [{ venueId: 'VENUE-A', projectId: 'PROJECT-A', nameAr: 'موقع ألف', nameEn: 'Venue A', cadSourceIds: [], geometryStatus: 'unavailable' }],
    packs: [{ packId: 'PACK-A', projectId: 'PROJECT-A', eventId: 'EVENT-A', kind: 'event-runtime' }],
    themes: [],
    fallbackTheme: neutralFallbackEventTheme
  };
}

describe('ProjectRegistry', () => {
  it('validates the universal project contract and KAP candidate identity', () => {
    const kap = projectRegistry.findById(kapProjectId)!;
    expect(kap.projectStatus).toBe('candidate');
    expect(kap.defaultEventId).toBe('EVENT-KAP-OPENING-2026');
    expect(kap.venueIds).toEqual(['VENUE-KAP-001']);
    expect(kap.sourceClassification).toBe('candidate-real');
    expect(kap.sourceStateAr).toContain('الحوكمة وCAD مصدران معتمدان');
    expect(kap.sourceStateAr).toContain('التشغيل غير مُقيّم');
    expect(kap.sourceStateAr).toContain('الهندسة والمعايرة');
    expect(kap.portfolioPresentation?.spatialCommandSummary).toEqual({
      experienceObjectCount: 5,
      openBlockerCount: 8,
      fieldEvidenceStatusAr: 'لقطة جرد ببيانات وصفية فقط: 195 صورة و6 فيديوهات'
    });
  });

  it('rejects duplicate stable IDs', () => {
    const input = inputFixture();
    input.projects.push(structuredClone(input.projects[0]!));
    expect(() => new ProjectRegistry(input)).toThrow(ProjectRegistryError);
    expect(ProjectRegistry.validate(input).map((issue) => issue.code)).toContain('duplicate-project-id');
  });

  it('rejects dangling event, venue, theme, and pack references', () => {
    const input = inputFixture();
    input.projects[0]!.eventIds.push('EVENT-MISSING');
    input.projects[0]!.venueIds.push('VENUE-MISSING');
    input.projects[0]!.themeId = 'THEME-MISSING';
    input.projects[0]!.operationalPackIds.push('PACK-MISSING');
    const codes = ProjectRegistry.validate(input).map((issue) => issue.code);
    expect(codes).toEqual(expect.arrayContaining(['dangling-event-reference', 'dangling-venue-reference', 'dangling-theme-reference', 'dangling-pack-reference']));
  });

  it('rejects relationships crossing project boundaries', () => {
    const input = inputFixture();
    const second = structuredClone(input.projects[0]!);
    second.projectId = 'PROJECT-B';
    second.nameAr = 'مشروع باء';
    second.nameEn = 'Project B';
    second.eventIds = ['EVENT-B'];
    second.venueIds = ['VENUE-B'];
    second.defaultEventId = 'EVENT-B';
    second.operationalPackIds = ['PACK-B'];
    input.projects.push(second);
    input.events.push({ ...structuredClone(input.events[0]!), eventId: 'EVENT-B', projectId: 'PROJECT-B', venueIds: ['VENUE-B'], runtimePackageId: 'PACK-B' });
    input.venues.push({ ...structuredClone(input.venues[0]!), venueId: 'VENUE-B', projectId: 'PROJECT-B' });
    input.packs.push({ packId: 'PACK-B', projectId: 'PROJECT-B', eventId: 'EVENT-B', kind: 'event-runtime' });
    input.projects[0]!.eventIds.push('EVENT-B');
    expect(ProjectRegistry.validate(input).map((issue) => issue.code)).toContain('cross-project-event');
  });

  it('resolves event, venue, and theme without leaking KAP identity', () => {
    const kapTheme = projectRegistry.resolveTheme(kapProjectId, 'EVENT-KAP-OPENING-2026')!;
    const referenceTheme = projectRegistry.resolveTheme(referenceExhibitionProjectId, 'EVENT-EXHIBITION-DEMO-001')!;
    expect(projectRegistry.resolveEvent(kapProjectId)?.venueIds).toEqual(['VENUE-KAP-001']);
    expect(projectRegistry.getVenues(kapProjectId)[0]?.venueId).toBe('VENUE-KAP-001');
    expect(kapTheme.imagery.length).toBeGreaterThan(0);
    expect(referenceTheme.themeId).toBe('THEME-MAYADEEN-NEUTRAL-FALLBACK');
    expect(JSON.stringify(referenceTheme)).not.toContain('kap-cover-review');
    expect(referenceTheme.eventTokens.primary.background).not.toBe(kapTheme.eventTokens.primary.background);
  });
});
