import { describe, expect, it } from 'vitest';
import { crescentBuilding, crescentStorySteps } from './crescentBuilding';
import { gardens, internalGardens, namedExternalGardens } from './gardens';
import { knowledgeFaq } from './faq';
import { knowledgeConflicts, siteDirectoryEntries } from './knowledgeSourceMap';
import { projectFactById, projectFacts } from './projectFacts';

const allKnowledgeItems = [
  ...projectFacts,
  ...gardens,
  crescentBuilding,
  ...crescentStorySteps,
  ...knowledgeFaq,
  ...siteDirectoryEntries,
  ...knowledgeConflicts,
];

describe('KAGA V2 knowledge-source integrity', () => {
  it('preserves the source headline totals without inventing missing garden names', () => {
    expect(projectFactById['botanical-garden-count']?.value).toBe(15);
    expect(projectFactById['internal-garden-count']?.value).toBe(7);
    expect(projectFactById['external-garden-count']?.value).toBe(8);
    expect(internalGardens).toHaveLength(7);
    expect(namedExternalGardens).toHaveLength(6);
    expect(knowledgeConflicts.find((item) => item.id === 'external-garden-naming-gap')?.status).toBe('unresolved');
  });

  it('uses the exact internal and named-external garden labels and areas from pages 10 and 11', () => {
    expect(internalGardens.map((garden) => [garden.titleAr, garden.areaSqm])).toEqual([
      ['الحديقة الديفونية', 3_600],
      ['الحديقة الكربونية', 6_500],
      ['الحديقة الجوراسية', 6_500],
      ['الحديقة الطباشيرية', 6_500],
      ['حديقة الحياة الحديثة', 2_800],
      ['الحديقة البليوسينية', 4_800],
      ['حديقة الخيارات', 3_800],
    ]);
    expect(namedExternalGardens.map((garden) => [garden.titleAr, garden.areaSqm])).toEqual([
      ['حديقة الفراشات', 2_900],
      ['حديقة الطيور', 6_500],
      ['حديقة المتاهة', 4_600],
      ['حديقة الصوت والضوء', 1_000],
      ['الحديقة الطبيعية', 5_000],
      ['الحديقة المائية', 3_000],
    ]);
  });

  it('gives every knowledge item explicit document, page and confidence provenance', () => {
    for (const item of allKnowledgeItems) {
      expect(item.source.length, item.id).toBeGreaterThan(0);
      for (const source of item.source) {
        expect(source.sourceDocument, item.id).toBeTruthy();
        expect(source.sourcePages.length, item.id).toBeGreaterThan(0);
        expect(source.sourcePages.every((page) => Number.isInteger(page) && page > 0), item.id).toBe(true);
        expect(source.sourceConfidence, item.id).toMatch(/^(exact|high|approximate|unresolved)$/);
      }
    }
  });

  it('has no duplicate canonical garden IDs', () => {
    const ids = gardens.map((garden) => garden.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not silently equate the Site Directory taxonomy with the Arabic garden table', () => {
    const cenozoic = siteDirectoryEntries.find((entry) => entry.id === 'directory-cenozoic');
    const family = siteDirectoryEntries.find((entry) => entry.id === 'directory-family');
    const crescentEntries = siteDirectoryEntries.filter((entry) => entry.directoryGroup === 'crescentHouse');
    const exteriorEntries = siteDirectoryEntries.filter((entry) => entry.directoryGroup === 'exteriorGardens');
    expect(cenozoic?.resolvedGardenId).toBeUndefined();
    expect(family?.labelEn).toBe('Family Garden');
    expect(family?.resolvedGardenId).toBeUndefined();
    expect(crescentEntries).toHaveLength(8);
    expect(exteriorEntries).toHaveLength(10);
    expect(exteriorEntries.every((entry) => entry.resolvedGardenId === undefined)).toBe(true);
    expect(knowledgeConflicts.find((item) => item.id === 'site-directory-internal-taxonomy')?.status).toBe('unresolved');
    expect(knowledgeConflicts.find((item) => item.id === 'site-directory-exterior-taxonomy')?.status).toBe('unresolved');
  });

  it('keeps knowledge garden footprints unregistered until the spatial audit resolves them', () => {
    expect(gardens.every((garden) => garden.footprintId === undefined)).toBe(true);
  });
});
