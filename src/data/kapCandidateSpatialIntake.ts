import candidateEntitiesManifest from '../../pilot-input/manifests/kap-candidate-operational-entities-v1.json';
import approvedSourceAuthorityManifest from '../../pilot-input/manifests/kap-approved-source-authority-3g0-v1.json';
import relationshipsManifest from '../../pilot-input/manifests/kap-candidate-experience-mappings-v1.json';
import fieldEvidenceManifest from '../../pilot-input/manifests/kap-field-evidence-inventory-v1.json';
import spatialPackageManifest from '../../pilot-input/manifests/kap-candidate-spatial-package-v1.json';
import sourceAssetsManifest from '../../pilot-input/manifests/kap-source-assets-3e4a-v1.json';
import {
  applySourceAuthorityPromotion,
  validateCandidateSpatialIntakePackage
} from '../services/sourceIntake';
import type {
  CandidateExperienceRelationship,
  CandidateSourceLayer,
  CandidateSpatialEntity,
  CandidateSpatialIntakePackage,
  CandidateSpatialOverlayMetadata,
  FieldEvidenceInventorySnapshot,
  ProviderPermissionRisk,
  ProjectSourceReadinessSummary,
  SourceAssetManifest,
  SourceAuthorityPromotion
} from '../types/sourceIntake';
import { kapExperienceIntelligencePack } from './experienceIntelligencePacks';

export const kapExperienceObjectIds = kapExperienceIntelligencePack.experiencePoints.map((point) => point.relatedEntityId);

const originalSourceAssets = structuredClone(sourceAssetsManifest.sourceAssets) as SourceAssetManifest[];
const authorityPromotions = structuredClone(
  approvedSourceAuthorityManifest.authorityPromotions
) as SourceAuthorityPromotion[];
const promotedSourceAssetIds = new Set(authorityPromotions.map((promotion) => promotion.sourceAssetId));
const sourceAssets = [
  ...originalSourceAssets.map((asset) => {
    const promotion = authorityPromotions.find((candidate) => candidate.sourceAssetId === asset.sourceAssetId);
    return promotion ? applySourceAuthorityPromotion(asset, promotion) : asset;
  }),
  ...structuredClone(approvedSourceAuthorityManifest.addedSourceAssets) as SourceAssetManifest[]
];
if (promotedSourceAssetIds.size !== authorityPromotions.length
  || authorityPromotions.some((promotion) => !originalSourceAssets.some((asset) => asset.sourceAssetId === promotion.sourceAssetId))) {
  throw new Error('Invalid KAP source authority promotion references.');
}
const sourceLayers = structuredClone(spatialPackageManifest.sourceLayers) as CandidateSourceLayer[];
const candidateEntities = structuredClone(candidateEntitiesManifest.candidateEntities) as CandidateSpatialEntity[];
const relationships = structuredClone(relationshipsManifest.relationships) as CandidateExperienceRelationship[];
const fieldEvidenceInventory = structuredClone(fieldEvidenceManifest.fieldEvidenceInventory) as FieldEvidenceInventorySnapshot;

export const kapCandidateSpatialIntake: CandidateSpatialIntakePackage = {
  schemaVersion: '1.0.0',
  packageId: spatialPackageManifest.packageId,
  projectId: spatialPackageManifest.projectId,
  eventId: spatialPackageManifest.eventId,
  venueId: spatialPackageManifest.venueId,
  sourceAssets,
  canonicalSourceAssetIds: [...spatialPackageManifest.canonicalSourceAssetIds],
  sourceIntegrityRiskIds: [...spatialPackageManifest.sourceIntegrityRiskIds] as ProviderPermissionRisk[],
  sourceLayers,
  overlay: structuredClone(spatialPackageManifest.overlay) as CandidateSpatialOverlayMetadata,
  candidateEntities,
  relationships,
  fieldEvidenceInventory,
  sourceReadiness: {
    ...structuredClone(spatialPackageManifest.sourceReadiness) as ProjectSourceReadinessSummary,
    sourceAssetCount: sourceAssets.length
  },
  blockedGateIds: [...spatialPackageManifest.blockedGateIds]
};

export const kapCandidateSpatialValidation = validateCandidateSpatialIntakePackage(
  kapCandidateSpatialIntake,
  kapExperienceObjectIds
);

if (!kapCandidateSpatialValidation.valid) {
  const codes = kapCandidateSpatialValidation.issues.map((entry) => entry.code).join(', ');
  throw new Error(`Invalid KAP candidate spatial intake package: ${codes}`);
}

export function getKapSourceAsset(sourceAssetId: string): SourceAssetManifest | null {
  return kapCandidateSpatialIntake.sourceAssets.find((asset) => asset.sourceAssetId === sourceAssetId) ?? null;
}

export function getKapCandidateEntity(candidateId: string): CandidateSpatialEntity | null {
  return kapCandidateSpatialIntake.candidateEntities.find((entity) => entity.candidateId === candidateId) ?? null;
}

export function getKapRelationshipsForCandidate(candidateId: string): CandidateExperienceRelationship[] {
  return kapCandidateSpatialIntake.relationships.filter((relationship) => relationship.candidateEntityIds.includes(candidateId));
}

export function getKapRelationshipForExperience(experienceObjectId: string): CandidateExperienceRelationship | null {
  return kapCandidateSpatialIntake.relationships.find((relationship) => relationship.experienceObjectId === experienceObjectId) ?? null;
}
