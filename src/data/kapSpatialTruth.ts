import kapFounderSpatialTruthManifest from '../../pilot-input/manifests/kap-founder-spatial-truth-v1.json';
import {
  deepFreezeSpatialValue,
  verifySpatialTruthPackSync
} from '../services/spatialTruth';
import type { SpatialTruthPack } from '../types/spatialTruth';

const candidate = kapFounderSpatialTruthManifest as unknown as SpatialTruthPack;
const agesWalkway = candidate.semanticDecisions.find((decision) => decision.targetId === 'ENTITY-KAP-OP-006');
const unresolvedShow = candidate.semanticDecisions.find((decision) => decision.targetId === 'ZONE-SHOW-001');
const independentLandmarkIds = new Set(candidate.independentLandmarks.map((landmark) => landmark.candidateEntityId));

if (candidate.revision !== 1
  || candidate.approvedBy !== 'Ahmed'
  || candidate.authorityType !== 'founder-product-authority'
  || agesWalkway?.primaryLabelAr !== 'ممر العصور'
  || agesWalkway.semanticStatus !== 'founder-approved'
  || !agesWalkway.legacyAliases.includes('Tunnel')
  || unresolvedShow?.anchorReference !== null
  || unresolvedShow?.spatialStatus !== 'unresolved'
  || !['ENTITY-KAP-OP-004', 'ENTITY-KAP-OP-005', 'ENTITY-KAP-OP-011'].every((id) => independentLandmarkIds.has(id))
  || !verifySpatialTruthPackSync(candidate)) {
  throw new Error('KAP founder spatial truth manifest violates the frozen Stage 3E.4C decisions.');
}

export const kapFounderSpatialTruthPack = deepFreezeSpatialValue(candidate);
