import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cloneDemoDecisions } from '../data/decisions';
import { cloneDemoEntities } from '../data/entities';
import { parseDecisionCsv, previewDecisionPack, serializeDecisionValidationReport } from './decisionImport';

const options = {
  knownEntityIds: Object.keys(cloneDemoEntities()) as Array<keyof ReturnType<typeof cloneDemoEntities>>,
  knownEventIds: ['EVENT-DEMO-001'] as const,
  knownVenueIds: ['VENUE-DEMO-001'] as const,
  now: new Date('2026-07-11T10:00:00Z')
};

function csvEscape(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return `"${text.replaceAll('"', '""')}"`;
}

describe('operational decision pack import preview', () => {
  it('previews valid JSON without writing it to baseline', () => {
    const source = JSON.stringify({ decisions: [cloneDemoDecisions()[0]!] });
    const preview = previewDecisionPack(source, 'pack.json', 'json', options);

    expect(preview.canAcceptForExperiment).toBe(true);
    expect(preview.validRecords).toHaveLength(1);
    expect(preview.blockingErrorCount).toBe(0);
  });

  it('parses CSV fields including explicit relationships', () => {
    const record = cloneDemoDecisions()[2]!;
    const headers = Object.keys(record);
    const source = `${headers.join(',')}\n${headers.map((header) => csvEscape(record[header as keyof typeof record])).join(',')}`;
    const parsed = parseDecisionCsv(source);
    const preview = previewDecisionPack(source, 'pack.csv', 'csv', options);

    expect((parsed[0] as { relationships: unknown[] }).relationships).toHaveLength(record.relationships.length);
    expect(preview.canAcceptForExperiment).toBe(true);
  });

  it('blocks duplicates, unknown entities, and scenario records from baseline preview', () => {
    const record = cloneDemoDecisions()[0]!;
    const invalid = { ...record, stateContext: 'scenario', relationships: record.relationships.map((relation) => ({ ...relation, entityId: 'ZONE-999', stateContext: 'scenario' })) };
    const preview = previewDecisionPack(JSON.stringify([invalid, invalid]), 'invalid.json', 'json', options);
    const codes = preview.issues.map((currentIssue) => currentIssue.code);

    expect(preview.canAcceptForExperiment).toBe(false);
    expect(codes).toEqual(expect.arrayContaining(['duplicate-decision', 'unknown-related-entity', 'scenario-imported-as-baseline']));
    expect(serializeDecisionValidationReport(preview, 'json')).toContain('blockingErrorCount');
  });

  it('keeps both reusable five-decision templates importable', () => {
    const jsonSource = readFileSync(path.join(process.cwd(), 'templates/operational-decision-pack.json'), 'utf8');
    const csvSource = readFileSync(path.join(process.cwd(), 'templates/operational-decision-pack.csv'), 'utf8');
    const jsonPreview = previewDecisionPack(jsonSource, 'operational-decision-pack.json', 'json', options);
    const csvPreview = previewDecisionPack(csvSource, 'operational-decision-pack.csv', 'csv', options);

    expect(jsonPreview.records).toHaveLength(5);
    expect(csvPreview.records).toHaveLength(5);
    expect(jsonPreview.canAcceptForExperiment).toBe(true);
    expect(csvPreview.canAcceptForExperiment).toBe(true);
  });

  it('blocks skipped lifecycle history with record and path context', () => {
    const source = cloneDemoDecisions()[4]!;
    const invalid = {
      ...source,
      status: 'approved',
      revision: 2,
      changeHistory: [source.changeHistory[0], { ...source.changeHistory[2], revision: 2 }]
    };
    const preview = previewDecisionPack(JSON.stringify([invalid]), 'skipped.json', 'json', options);
    const skipped = preview.issues.find((currentIssue) => currentIssue.code === 'skipped-lifecycle');

    expect(preview.canAcceptForExperiment).toBe(false);
    expect(skipped?.recordIndex).toBe(0);
    expect(skipped?.path).toContain('$[0].changeHistory');
    expect(skipped?.blocking).toBe(true);
  });

  it('blocks malformed impact and dangling evidence references', () => {
    const source = cloneDemoDecisions()[4]!;
    const malformedImpact = { ...source, decisionId: 'DECISION-IMPACT', expectedImpact: { level: 'extreme', summaryAr: '', dimensions: { safety: Number.NaN } }, relationships: source.relationships.map((relation) => ({ ...relation, decisionId: 'DECISION-IMPACT' })) };
    const danglingEvidence = { ...source, decisionId: 'DECISION-EVIDENCE', verificationEvidenceIds: ['EVIDENCE-UNKNOWN'], relationships: source.relationships.map((relation) => ({ ...relation, decisionId: 'DECISION-EVIDENCE' })) };
    const preview = previewDecisionPack(JSON.stringify([malformedImpact, danglingEvidence]), 'invalid-contracts.json', 'json', options);

    expect(preview.canAcceptForExperiment).toBe(false);
    expect(preview.validRecords).toEqual([]);
    expect(preview.issues.map((currentIssue) => currentIssue.code)).toEqual(expect.arrayContaining(['invalid-impact', 'dangling-verification-evidence']));
  });

  it('reports legacy migration warnings without fabricating provenance', () => {
    const source = cloneDemoDecisions()[0]!;
    const legacy: Record<string, unknown> = { ...source, relatedEntityIds: ['ZONE-005', 'ROUTE-001'] };
    delete legacy.relationships;
    const preview = previewDecisionPack(JSON.stringify([legacy]), 'legacy.json', 'json', options);

    expect(preview.migrationNotices).toHaveLength(1);
    expect(preview.migrationNotices[0]?.warnings.map((warning) => warning.code)).toContain('legacy-positional-relationships');
  });
});
