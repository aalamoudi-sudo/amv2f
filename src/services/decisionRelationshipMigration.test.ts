import { describe, expect, it } from 'vitest';
import { cloneDemoDecisions } from '../data/decisions';
import type { LegacyDecisionRecordInput } from '../types/decision';
import {
  DECISION_INTEGRITY_SCHEMA_VERSION,
  migrateLegacyDecisionRecord,
  migrateLegacyDecisionRecordWithWarnings,
  migrateLegacyDecisionRelationships
} from './decisionRelationshipMigration';

describe('decision relationship migration', () => {
  it('deterministically maps the first legacy ID to execution-target and the rest to affected', () => {
    const current = cloneDemoDecisions()[0]!;
    const relationships = migrateLegacyDecisionRelationships({
      decisionId: current.decisionId,
      relatedEntityIds: ['ZONE-005', 'ROUTE-001', 'ROUTE-003'],
      expectedImpact: current.expectedImpact,
      source: current.source,
      confidence: current.confidence,
      stateContext: current.stateContext
    });

    expect(relationships.map((relation) => relation.relationType)).toEqual(['execution-target', 'affected', 'affected']);
    expect(relationships.map((relation) => relation.relationId)).toEqual(['RELATION-001-01', 'RELATION-001-02', 'RELATION-001-03']);
  });

  it('removes the legacy positional field from the migrated runtime record', () => {
    const current = cloneDemoDecisions()[0]!;
    const legacy: Record<string, unknown> = { ...current, relatedEntityIds: ['ZONE-005', 'ROUTE-001'] };
    delete legacy.relationships;
    delete legacy.completionEvidenceIds;
    delete legacy.completionNote;
    delete legacy.verifiedBy;
    delete legacy.verifiedAt;
    delete legacy.verificationEvidenceIds;
    delete legacy.closedBy;
    delete legacy.closedAt;
    delete legacy.closureReason;
    const migrated = migrateLegacyDecisionRecord(legacy as unknown as LegacyDecisionRecordInput);

    expect('relatedEntityIds' in migrated).toBe(false);
    expect(migrated.relationships[0]?.relationType).toBe('execution-target');
  });

  it('does not fabricate verification or closure provenance', () => {
    const current = cloneDemoDecisions()[4]!;
    const legacy: Record<string, unknown> = { ...current, relatedEntityIds: ['ZONE-004'] };
    delete legacy.relationships;
    delete legacy.completionEvidenceIds;
    delete legacy.completionNote;
    delete legacy.verifiedBy;
    delete legacy.verifiedAt;
    delete legacy.verificationEvidenceIds;
    delete legacy.closedBy;
    delete legacy.closedAt;
    delete legacy.closureReason;

    const result = migrateLegacyDecisionRecordWithWarnings(legacy as unknown as LegacyDecisionRecordInput);

    expect(result.record.completionEvidenceIds).toEqual([]);
    expect(result.record.completionNote).toBe('');
    expect(result.record.verifiedBy).toBeNull();
    expect(result.record.verifiedAt).toBeNull();
    expect(result.record.verificationEvidenceIds).toEqual([]);
    expect(result.record.closedBy).toBeNull();
    expect(result.record.closedAt).toBeNull();
    expect(result.record.closureReason).toBe('');
    expect(result.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining([
      'legacy-positional-relationships',
      'missing-completion-provenance',
      'missing-verification-provenance',
      'missing-closure-provenance'
    ]));
    expect(result.fieldsRequiringReview).toEqual(expect.arrayContaining(['completionEvidenceIds', 'verificationEvidenceIds', 'closureReason']));
    expect(result.originalSchemaVersion).toBe(1);
    expect(result.targetSchemaVersion).toBe(DECISION_INTEGRITY_SCHEMA_VERSION);
  });
});
