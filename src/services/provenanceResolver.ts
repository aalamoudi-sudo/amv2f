import type {
  NormalizedObservation,
  OperationalEvent,
  ProvenanceBundle,
  ProvenanceNode,
  ValidationIssue
} from '../types/integration';
import type { OperationalStateContext } from '../types/spatial';

export interface ProvenanceResolutionRequest {
  provenanceRefs: string[];
  eventId: string;
  stateContext: OperationalStateContext;
  sourceRecordId: string;
  sourceSystemId: string;
  adapterId: string;
  adapterVersion: string;
}

export interface ProvenanceResolutionResult {
  valid: boolean;
  bundles: ProvenanceBundle[];
  issues: ValidationIssue[];
}

function issue(code: string, path: string, messageAr: string, blocking = true): ValidationIssue {
  return { code, path, messageAr, blocking };
}

function duplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });
  return [...duplicates];
}

function requiredRelation(
  bundle: ProvenanceBundle,
  relationType: ProvenanceBundle['relations'][number]['relationType'],
  fromId: string,
  toId: string,
  path: string,
  missingCode: string,
  mismatchCode: string,
  missingMessageAr: string,
  mismatchMessageAr: string
): ValidationIssue[] {
  const candidates = bundle.relations.filter(
    (relation) => relation.relationType === relationType && relation.fromId === fromId
  );
  if (!candidates.length) return [issue(missingCode, path, missingMessageAr)];
  if (candidates.length !== 1 || candidates[0]?.toId !== toId) {
    return [issue(mismatchCode, path, mismatchMessageAr)];
  }
  return [];
}

function disconnectedNodeIds(bundle: ProvenanceBundle, rootId: string): string[] {
  const nodeIds = new Set(bundle.nodes.map((node) => node.provenanceId));
  const adjacency = new Map<string, Set<string>>();
  nodeIds.forEach((nodeId) => adjacency.set(nodeId, new Set()));
  bundle.relations.forEach((relation) => {
    if (!nodeIds.has(relation.fromId) || !nodeIds.has(relation.toId)) return;
    adjacency.get(relation.fromId)?.add(relation.toId);
    adjacency.get(relation.toId)?.add(relation.fromId);
  });

  const visited = new Set<string>();
  const queue = [rootId];
  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    adjacency.get(current)?.forEach((relatedId) => {
      if (!visited.has(relatedId)) queue.push(relatedId);
    });
  }
  return [...nodeIds].filter((nodeId) => !visited.has(nodeId));
}

export class ProvenanceResolver {
  private readonly bundles = new Map<string, ProvenanceBundle>();

  constructor(initialBundles: ProvenanceBundle[] = []) {
    initialBundles.forEach((bundle) => this.register(bundle));
  }

  register(bundle: ProvenanceBundle): void {
    if (this.bundles.has(bundle.bundleId)) throw new Error(`Duplicate provenance bundle: ${bundle.bundleId}`);
    this.bundles.set(bundle.bundleId, structuredClone(bundle));
  }

  get(bundleId: string): ProvenanceBundle | undefined {
    const bundle = this.bundles.get(bundleId);
    return bundle ? structuredClone(bundle) : undefined;
  }

  list(): ProvenanceBundle[] {
    return [...this.bundles.values()].map((bundle) => structuredClone(bundle));
  }

  resolve(request: ProvenanceResolutionRequest): ProvenanceResolutionResult {
    const issues: ValidationIssue[] = [];
    const bundles: ProvenanceBundle[] = [];
    const seen = new Set<string>();

    request.provenanceRefs.forEach((bundleId, index) => {
      const path = `$.provenanceRefs[${index}]`;
      if (seen.has(bundleId)) {
        issues.push(issue('duplicate-provenance-reference', path, `مرجع المصدر ${bundleId} مكرر.`));
        return;
      }
      seen.add(bundleId);
      const bundle = this.bundles.get(bundleId);
      if (!bundle) {
        issues.push(issue('unresolved-provenance', path, `مرجع المصدر ${bundleId} غير قابل للحل.`));
        return;
      }
      if (bundle.stateContext !== request.stateContext) {
        issues.push(issue('provenance-context-mismatch', path, `مرجع المصدر ${bundleId} ينتمي إلى سياق حالة مختلف.`));
      }

      const duplicateNodeIds = duplicateValues(bundle.nodes.map((node) => node.provenanceId));
      duplicateNodeIds.forEach((nodeId) => {
        issues.push(issue('duplicate-provenance-node-id', `${path}.nodes`, `هوية عقدة المصدر ${nodeId} مكررة ولا يمكن اعتماد الرسم.`));
      });
      const duplicateRelationIds = duplicateValues(bundle.relations.map((relation) => relation.relationId));
      duplicateRelationIds.forEach((relationId) => {
        issues.push(issue('duplicate-provenance-relation-id', `${path}.relations`, `هوية علاقة المصدر ${relationId} مكررة ولا يمكن اعتماد الرسم.`));
      });

      const nodeIds = new Set(bundle.nodes.map((node) => node.provenanceId));
      bundle.relations.forEach((relation, relationIndex) => {
        if (!nodeIds.has(relation.fromId) || !nodeIds.has(relation.toId)) {
          issues.push(issue(
            'provenance-relation-endpoint-missing',
            `${path}.relations[${relationIndex}]`,
            'تشير علاقة في رسم المصدر إلى عقدة غير موجودة.'
          ));
        }
      });

      const sourceRecordMatches = bundle.nodes.filter(
        (node) => node.nodeType === 'entity'
          && node.type === 'source-record'
          && node.attributes.sourceRecordId === request.sourceRecordId
      );
      const sourceSystemMatches = bundle.nodes.filter(
        (node) => node.nodeType === 'entity'
          && node.type === 'source-record'
          && node.attributes.sourceSystemId === request.sourceSystemId
      );
      const sourceMatches = sourceRecordMatches.filter(
        (node) => node.attributes.sourceSystemId === request.sourceSystemId
      );
      let sourceNode: ProvenanceNode | undefined;
      if (sourceMatches.length === 1) {
        [sourceNode] = sourceMatches;
      } else if (sourceMatches.length > 1) {
        issues.push(issue('provenance-source-record-ambiguous', `${path}.nodes`, 'توجد أكثر من عقدة تطابق سجل المصدر ونظامه؛ لا يمكن تحديد المصدر القانوني.'));
      } else if (sourceRecordMatches.length && sourceSystemMatches.length) {
        issues.push(issue('provenance-composite-source-rejected', `${path}.nodes`, 'لا يجوز تركيب هوية المصدر من عقدتين مختلفتين؛ يجب أن تحمل عقدة واحدة سجل المصدر ونظامه معاً.'));
      } else {
        issues.push(issue('provenance-source-record-missing', `${path}.nodes`, 'لا توجد عقدة واحدة تمثل سجل المصدر ونظامه تمثيلاً صحيحاً.'));
      }

      const activityMatches = bundle.nodes.filter(
        (node) => node.nodeType === 'activity'
          && node.type === 'adapter-normalization'
          && node.attributes.adapterId === request.adapterId
          && node.attributes.adapterVersion === request.adapterVersion
      );
      const activityNode = activityMatches.length === 1 ? activityMatches[0] : undefined;
      if (!activityMatches.length) {
        issues.push(issue('provenance-activity-missing', `${path}.nodes`, 'لا توجد عقدة نشاط تمثل الموائم وإصداره الصحيحين.'));
      } else if (activityMatches.length > 1) {
        issues.push(issue('provenance-activity-ambiguous', `${path}.nodes`, 'توجد أكثر من عقدة تطابق نشاط الموائم؛ لا يمكن تحديد نشاط التحويل القانوني.'));
      }

      const eventMatches = bundle.nodes.filter(
        (node) => node.nodeType === 'entity'
          && node.type === 'operational-event'
          && node.attributes.eventId === request.eventId
      );
      const eventNode = eventMatches.length === 1 ? eventMatches[0] : undefined;
      if (!eventMatches.length) {
        issues.push(issue('provenance-result-event-missing', `${path}.nodes`, 'لا توجد عقدة تربط الحدث الناتج الصحيح بعملية التحويل.'));
      } else if (eventMatches.length > 1) {
        issues.push(issue('provenance-result-event-ambiguous', `${path}.nodes`, 'توجد أكثر من عقدة تطابق الحدث الناتج؛ لا يمكن تحديد النتيجة القانونية.'));
      }

      const agentMatches = bundle.nodes.filter(
        (node) => node.nodeType === 'agent'
          && (node.attributes.sourceSystemId === request.sourceSystemId
            || node.attributes.adapterId === request.adapterId)
      );
      const agentNode = agentMatches.length === 1 ? agentMatches[0] : undefined;
      if (!agentMatches.length) {
        const hasAgent = bundle.nodes.some((node) => node.nodeType === 'agent');
        issues.push(issue(
          hasAgent ? 'provenance-agent-identity-mismatch' : 'provenance-agent-missing',
          `${path}.nodes`,
          hasAgent
            ? 'هوية الجهة المشاركة لا تمثل نظام المصدر أو الموائم المتوقع.'
            : 'سلسلة المصدر لا تمثل نظام المصدر أو الموائم المشارك في التحويل.'
        ));
      } else if (agentMatches.length > 1) {
        issues.push(issue('provenance-agent-ambiguous', `${path}.nodes`, 'توجد أكثر من جهة تطابق هوية نظام المصدر أو الموائم؛ لا يمكن اعتماد الارتباط.'));
      }

      if (sourceNode && activityNode && eventNode && agentNode) {
        issues.push(...requiredRelation(
          bundle,
          'used',
          activityNode.provenanceId,
          sourceNode.provenanceId,
          `${path}.relations`,
          'provenance-source-usage-missing',
          'provenance-source-usage-mismatch',
          'لا توجد علاقة تثبت استخدام نشاط الموائم لسجل المصدر.',
          'علاقة استخدام المصدر لا تربط نشاط الموائم بسجل المصدر نفسه.'
        ));
        issues.push(...requiredRelation(
          bundle,
          'wasGeneratedBy',
          eventNode.provenanceId,
          activityNode.provenanceId,
          `${path}.relations`,
          'provenance-generation-missing',
          'provenance-generation-mismatch',
          'لا توجد علاقة تثبت أن نشاط الموائم ولّد الحدث.',
          'علاقة توليد الحدث لا تشير إلى نشاط الموائم نفسه.'
        ));
        issues.push(...requiredRelation(
          bundle,
          'wasAssociatedWith',
          activityNode.provenanceId,
          agentNode.provenanceId,
          `${path}.relations`,
          'provenance-agent-association-missing',
          'provenance-agent-association-mismatch',
          'لا توجد علاقة تربط نشاط الموائم بجهة المصدر المتوقعة.',
          'نشاط الموائم مرتبط بجهة مختلفة عن نظام المصدر أو الموائم المتوقع.'
        ));
        issues.push(...requiredRelation(
          bundle,
          'hadPrimarySource',
          eventNode.provenanceId,
          sourceNode.provenanceId,
          `${path}.relations`,
          'provenance-primary-source-missing',
          'provenance-primary-source-mismatch',
          'لا توجد علاقة تربط الحدث بسجل مصدره الأساسي.',
          'يرتبط الحدث بسجل مصدر مختلف عن السجل الذي استخدمه نشاط الموائم.'
        ));

        const disconnected = disconnectedNodeIds(bundle, eventNode.provenanceId);
        if (disconnected.length) {
          issues.push(issue('provenance-graph-disconnected', `${path}.nodes`, 'يحتوي رسم المصدر على عقد منفصلة لا ترتبط بسلسلة الحدث القانونية.'));
        }
      }
      for (const unknownField of ['productionIdentity', 'authoritativeDeviceTime']) {
        if (!bundle.unknownFields.includes(unknownField)) {
          const labelAr = unknownField === 'productionIdentity' ? 'هوية الإنتاج' : 'وقت الجهاز الموثوق';
          issues.push(issue('provenance-unknown-not-explicit', path, `يجب أن يبقى ${labelAr} معلماً صراحةً كمجهول في المختبر المحلي.`, false));
        }
      }
      bundles.push(structuredClone(bundle));
    });

    if (!request.provenanceRefs.length) {
      issues.push(issue('missing-provenance', '$.provenanceRefs', 'يلزم مرجع مصدر واحد على الأقل.'));
    }
    return { valid: !issues.some((currentIssue) => currentIssue.blocking), bundles, issues };
  }
}

export function provenanceRequestForEvent(event: OperationalEvent): ProvenanceResolutionRequest {
  return {
    provenanceRefs: event.provenanceRefs,
    eventId: event.eventId,
    stateContext: event.stateContext,
    sourceRecordId: event.source.sourceRecordId,
    sourceSystemId: event.source.sourceSystemId,
    adapterId: event.source.adapterId,
    adapterVersion: event.source.adapterVersion
  };
}

export function provenanceRequestForObservation(
  observation: NormalizedObservation,
  eventId: string,
  provenanceRefs: string[]
): ProvenanceResolutionRequest {
  return {
    provenanceRefs,
    eventId,
    stateContext: observation.stateContext,
    sourceRecordId: observation.sourceRecordId,
    sourceSystemId: observation.sourceSystemId,
    adapterId: observation.adapterId,
    adapterVersion: observation.adapterVersion
  };
}
