import {
  candidateGeometryStatusValues,
  sourceAuthorityStatusValues,
  sourceIngestionStatusValues,
  type CandidateExperienceRelationship,
  type CandidateSpatialEntity,
  type CandidateSpatialIntakePackage,
  type FieldEvidenceAsset,
  type FieldEvidenceBrowserRecord,
  type SourceAssetManifest,
  type SourceAssetRegistrationResult,
  type SourceAuthorityPromotion,
  type SourceAssetValidationIssue,
  type SourceAssetValidationResult,
  type VerifiedSourceFingerprintObservation
} from '../types/sourceIntake';

const sha256Pattern = /^[a-f0-9]{64}$/;
const candidateIdPattern = /^ENTITY-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3}$/;
const blockedIngestionStates = new Set(['hash-mismatch', 'quarantined', 'blocked', 'missing']);

export function isSafeLocalPreviewUrl(value: string): boolean {
  return /^\/local-assets\/[A-Za-z0-9._/-]+$/.test(value)
    && !value.includes('..')
    && !value.includes('//')
    && !value.includes('\\');
}

export class SourceIntakeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'SourceIntakeError';
    this.code = code;
  }
}

function issue(code: string, path: string, messageAr: string, blocking = true): SourceAssetValidationIssue {
  return { code, path, messageAr, blocking };
}

export function validateSourceAssetManifest(manifest: SourceAssetManifest): SourceAssetValidationResult {
  const issues: SourceAssetValidationIssue[] = [];
  const requiredText: Array<[keyof SourceAssetManifest, unknown]> = [
    ['sourceAssetId', manifest.sourceAssetId],
    ['projectId', manifest.projectId],
    ['eventId', manifest.eventId],
    ['venueId', manifest.venueId],
    ['sourceName', manifest.sourceName],
    ['sourceType', manifest.sourceType],
    ['sourceRole', manifest.sourceRole],
    ['provider', manifest.provider],
    ['providerPermissionRisk', manifest.providerPermissionRisk],
    ['rightsStatus', manifest.rightsStatus],
    ['privacyStatus', manifest.privacyStatus],
    ['retentionStatus', manifest.retentionStatus],
    ['operationalBaselineStatus', manifest.operationalBaselineStatus],
    ['geometryApprovalStatus', manifest.geometryApprovalStatus]
  ];
  requiredText.forEach(([field, value]) => {
    if (typeof value !== 'string' || !value.trim()) issues.push(issue('source-field-missing', `$.${field}`, `حقل المصدر ${String(field)} مطلوب.`));
  });
  if (!sourceAuthorityStatusValues.includes(manifest.authorityStatus)) issues.push(issue('source-authority-invalid', '$.authorityStatus', 'حالة سلطة المصدر غير مدعومة.'));
  if (!sourceIngestionStatusValues.includes(manifest.ingestionStatus)) issues.push(issue('source-ingestion-invalid', '$.ingestionStatus', 'حالة استقبال المصدر غير مدعومة.'));
  if (manifest.expectedByteSize !== null && (!Number.isInteger(manifest.expectedByteSize) || manifest.expectedByteSize < 0)) {
    issues.push(issue('source-expected-size-invalid', '$.expectedByteSize', 'الحجم المتوقع يجب أن يكون عدد بايت صحيحًا غير سالب.'));
  }
  if (manifest.observedByteSize !== null && (!Number.isInteger(manifest.observedByteSize) || manifest.observedByteSize < 0)) {
    issues.push(issue('source-observed-size-invalid', '$.observedByteSize', 'الحجم المرصود يجب أن يكون عدد بايت صحيحًا غير سالب.'));
  }
  if (manifest.expectedSha256 !== null && !sha256Pattern.test(manifest.expectedSha256)) {
    issues.push(issue('source-expected-hash-invalid', '$.expectedSha256', 'بصمة SHA-256 المتوقعة غير قانونية.'));
  }
  if (manifest.observedSha256 !== null && !sha256Pattern.test(manifest.observedSha256)) {
    issues.push(issue('source-observed-hash-invalid', '$.observedSha256', 'بصمة SHA-256 المرصودة غير قانونية.'));
  }
  if (manifest.expectedSha256 && manifest.observedSha256 && manifest.expectedSha256 !== manifest.observedSha256) {
    issues.push(issue('source-hash-mismatch', '$.observedSha256', 'بصمة الملف المرصودة لا تطابق البصمة المتوقعة؛ المصدر محجوب.'));
    if (manifest.ingestionStatus !== 'hash-mismatch' && manifest.ingestionStatus !== 'quarantined' && manifest.ingestionStatus !== 'blocked') {
      issues.push(issue('source-hash-mismatch-not-blocked', '$.ingestionStatus', 'يجب أن يحجب hash mismatch المصدر صراحة.'));
    }
  }
  if (manifest.expectedByteSize !== null && manifest.observedByteSize !== null && manifest.expectedByteSize !== manifest.observedByteSize) {
    issues.push(issue('source-size-mismatch', '$.observedByteSize', 'حجم الملف المرصود لا يطابق الحجم المتوقع؛ يلزم الحجب والمراجعة.'));
  }
  if (manifest.ingestionStatus === 'duplicate-confirmed' && (!manifest.duplicateOfSourceAssetId || manifest.contentStatus !== 'duplicate')) {
    issues.push(issue('source-duplicate-incomplete', '$.duplicateOfSourceAssetId', 'التكرار المؤكد يحتاج مرجع المصدر القانوني وحالة محتوى duplicate.'));
  }
  if (manifest.authorityStatus === 'missing' && manifest.ingestionStatus !== 'missing') {
    issues.push(issue('source-missing-state-conflict', '$.ingestionStatus', 'المصدر المفقود يجب أن يبقى في حالة استقبال missing.'));
  }
  if (manifest.providerPermissionRisk === 'DRIVE-PERMISSION-ANONYMOUS-WRITER'
    && !manifest.notes.some((note) => note.includes('DRIVE-PERMISSION-ANONYMOUS-WRITER'))) {
    issues.push(issue('source-provider-risk-undisclosed', '$.notes', 'مخاطرة الكاتب المجهول يجب أن تبقى ظاهرة وغير محلولة.'));
  }
  return { valid: !issues.some((entry) => entry.blocking), issues };
}

export function reconcileSourceAssetManifest(manifest: SourceAssetManifest): SourceAssetManifest {
  const validation = validateSourceAssetManifest(manifest);
  const mismatch = validation.issues.some((entry) => entry.code === 'source-hash-mismatch' || entry.code === 'source-size-mismatch');
  if (!mismatch) return { ...manifest, validationErrors: validation.issues.map((entry) => entry.code) };
  return {
    ...manifest,
    ingestionStatus: 'hash-mismatch',
    contentStatus: 'rejected',
    validationErrors: validation.issues.map((entry) => entry.code)
  };
}

function assertByteVerificationEvidence(
  manifest: SourceAssetManifest,
  observation: VerifiedSourceFingerprintObservation
): void {
  if (!observation.verifiedFromBytes
    || observation.sourceAssetId !== manifest.sourceAssetId
    || observation.byteSize !== manifest.observedByteSize
    || observation.sha256 !== manifest.observedSha256) {
    throw new SourceIntakeError('source-byte-verification-evidence-mismatch', 'دليل قياس البايتات لا يطابق هوية المصدر المرصودة.');
  }
}

export function acceptExpectedSourceFingerprint(
  manifest: SourceAssetManifest,
  observation: VerifiedSourceFingerprintObservation
): true {
  assertByteVerificationEvidence(manifest, observation);
  const reconciled = reconcileSourceAssetManifest(manifest);
  const validation = validateSourceAssetManifest(reconciled);
  if (!validation.valid || reconciled.ingestionStatus === 'hash-mismatch') {
    throw new SourceIntakeError('source-fingerprint-rejected', 'فشلت بصمة المصدر أو حجمه؛ لم يُقبل المصدر.');
  }
  if (!reconciled.expectedSha256 || !reconciled.observedSha256 || reconciled.expectedSha256 !== reconciled.observedSha256) {
    throw new SourceIntakeError('source-fingerprint-unverified', 'لا توجد بصمتان متطابقتان لإثبات هوية المحتوى.');
  }
  return true;
}

export function applySourceAuthorityPromotion(
  manifest: SourceAssetManifest,
  promotion: SourceAuthorityPromotion
): SourceAssetManifest {
  if (promotion.sourceAssetId !== manifest.sourceAssetId) {
    throw new SourceIntakeError('source-authority-promotion-id-mismatch', 'قرار سلطة المصدر لا يطابق معرّف أصل المصدر.');
  }
  if (promotion.previousAuthorityStatus !== manifest.authorityStatus) {
    throw new SourceIntakeError('source-authority-promotion-previous-status-mismatch', 'حالة السلطة السابقة لا تطابق سجل المصدر.');
  }
  if (promotion.contentRevisionCreated
    || promotion.operationalBaselineGranted
    || promotion.geometryApprovalGranted) {
    throw new SourceIntakeError('source-authority-promotion-scope-overreach', 'ترقية سلطة المصدر لا يجوز أن تنشئ مراجعة محتوى أو اعتمادًا تشغيليًا أو هندسيًا.');
  }
  if (manifest.observedByteSize !== promotion.expectedByteSize
    || manifest.observedSha256 !== promotion.expectedSha256
    || manifest.expectedByteSize !== promotion.expectedByteSize
    || manifest.expectedSha256 !== promotion.expectedSha256) {
    throw new SourceIntakeError('source-authority-promotion-fingerprint-mismatch', 'قرار ترقية السلطة لا يطابق بصمة وحجم المحتوى المسجلين.');
  }
  if (!sourceAuthorityStatusValues.includes(promotion.nextAuthorityStatus)) {
    throw new SourceIntakeError('source-authority-promotion-status-invalid', 'حالة سلطة المصدر الجديدة غير مدعومة.');
  }
  return {
    ...structuredClone(manifest),
    authorityStatus: promotion.nextAuthorityStatus,
    operationalBaselineStatus: 'not-baseline',
    geometryApprovalStatus: 'not-approved',
    notes: [
      ...manifest.notes,
      ...promotion.notes,
      `Authority decision: ${promotion.authorityDecisionId}.`,
      `Approved source name: ${promotion.approvedSourceName}.`
    ]
  };
}

export function registerSourceAsset(
  existingAssets: readonly SourceAssetManifest[],
  incoming: SourceAssetManifest,
  observation: VerifiedSourceFingerprintObservation
): SourceAssetRegistrationResult {
  assertByteVerificationEvidence(incoming, observation);
  const reconciled = reconcileSourceAssetManifest(incoming);
  const validation = validateSourceAssetManifest(reconciled);
  if (!validation.valid || reconciled.ingestionStatus === 'hash-mismatch') {
    throw new SourceIntakeError('source-registration-blocked', 'حُجب تسجيل المصدر بسبب أخطاء سلامة مانعة.');
  }
  const duplicate = reconciled.observedSha256
    ? existingAssets.find((entry) => entry.observedSha256 === reconciled.observedSha256
      && entry.observedByteSize === reconciled.observedByteSize)
    : undefined;
  if (!duplicate) {
    return {
      assets: [...existingAssets, structuredClone(reconciled)],
      canonicalSourceAssetId: reconciled.sourceAssetId,
      duplicateConfirmed: false,
      contentRevisionCreated: true
    };
  }
  const duplicateRecord: SourceAssetManifest = {
    ...structuredClone(reconciled),
    contentStatus: 'duplicate',
    ingestionStatus: 'duplicate-confirmed',
    duplicateOfSourceAssetId: duplicate.sourceAssetId,
    validationErrors: []
  };
  return {
    assets: [...existingAssets, duplicateRecord],
    canonicalSourceAssetId: duplicate.sourceAssetId,
    duplicateConfirmed: true,
    contentRevisionCreated: false
  };
}

export function validateCandidateSpatialEntities(
  entities: readonly CandidateSpatialEntity[],
  sourceAssets: readonly SourceAssetManifest[],
  scope: { projectId: string; eventId: string; venueId: string },
  expectedCount = 11
): SourceAssetValidationIssue[] {
  const issues: SourceAssetValidationIssue[] = [];
  if (entities.length !== expectedCount) issues.push(issue('candidate-entity-count', '$.candidateEntities', `يجب أن تحتوي الحزمة على ${expectedCount} كيانًا مرشحًا.`));
  const ids = new Set<string>();
  const sourceNumbers = new Set<number>();
  const sourceAssetById = new Map(sourceAssets.map((asset) => [asset.sourceAssetId, asset]));
  entities.forEach((entity, index) => {
    const path = `$.candidateEntities[${index}]`;
    if (!candidateIdPattern.test(entity.candidateId)) issues.push(issue('candidate-id-invalid', `${path}.candidateId`, 'معرّف الكيان المرشح غير قانوني.'));
    if (ids.has(entity.candidateId)) issues.push(issue('candidate-id-duplicate', `${path}.candidateId`, 'معرّف الكيان المرشح مكرر.'));
    ids.add(entity.candidateId);
    if (!Number.isInteger(entity.sourceNumber) || entity.sourceNumber < 1 || sourceNumbers.has(entity.sourceNumber)) {
      issues.push(issue('candidate-source-number-invalid', `${path}.sourceNumber`, 'رقم المصدر يجب أن يكون فريدًا وموجبًا.'));
    }
    sourceNumbers.add(entity.sourceNumber);
    const sourceAsset = sourceAssetById.get(entity.sourceAssetId);
    if (!sourceAsset) issues.push(issue('candidate-source-dangling', `${path}.sourceAssetId`, 'مرجع مصدر الكيان المرشح غير موجود.'));
    if (sourceAsset && (sourceAsset.sourceRole !== 'candidate-operational-zoning'
      || sourceAsset.authorityStatus !== 'founder-selected-working-candidate'
      || blockedIngestionStates.has(sourceAsset.ingestionStatus))) {
      issues.push(issue('candidate-source-not-eligible', `${path}.sourceAssetId`, 'مصدر الكيان غير مؤهل لإنشاء مرساة مرشحة.'));
    }
    if (entity.projectId !== scope.projectId || entity.eventId !== scope.eventId || entity.venueId !== scope.venueId) {
      issues.push(issue('candidate-cross-project-scope', path, 'الكيان المرشح خارج نطاق المشروع أو الفعالية أو الموقع.'));
    }
    if (!candidateGeometryStatusValues.includes(entity.geometryStatus)) issues.push(issue('candidate-geometry-status-invalid', `${path}.geometryStatus`, 'حالة هندسة الكيان المرشح غير مدعومة.'));
    if (entity.geometryStatus === 'approved-geometry') issues.push(issue('candidate-approved-geometry-prohibited', `${path}.geometryStatus`, 'لا يجوز تمثيل هندسة معتمدة في هذا الاستقبال المرشح.'));
    if (entity.geometryStatus === 'normalized-image-anchor') {
      if (entity.anchorMethod !== 'manual-derived-from-candidate-raster') issues.push(issue('candidate-anchor-method-invalid', `${path}.anchorMethod`, 'المرساة المطبعة يجب أن تصرح بأنها مشتقة يدويًا من raster المرشح.'));
      if (!entity.normalizedAnchor
        || !Number.isFinite(entity.normalizedAnchor.x)
        || !Number.isFinite(entity.normalizedAnchor.y)
        || entity.normalizedAnchor.x < 0
        || entity.normalizedAnchor.x > 1
        || entity.normalizedAnchor.y < 0
        || entity.normalizedAnchor.y > 1) {
        issues.push(issue('candidate-anchor-invalid', `${path}.normalizedAnchor`, 'إحداثيات المرساة المطبعة يجب أن تقع بين 0 و1.'));
      }
      if (entity.normalizedAnchor
        && (entity.normalizedAnchor.coordinateSpace !== 'normalized-image'
          || entity.normalizedAnchor.origin !== 'top-left'
          || entity.normalizedAnchor.pageNumber !== 1
          || !sha256Pattern.test(entity.normalizedAnchor.previewSha256))) {
        issues.push(issue('candidate-anchor-frame-invalid', `${path}.normalizedAnchor`, 'مرساة الصورة تحتاج مساحة normalized-image وأصل top-left ورقم صفحة وبصمة preview قانونية.'));
      }
    }
    if (entity.authorityStatus !== 'founder-selected-working-candidate') {
      issues.push(issue('candidate-authority-invalid', `${path}.authorityStatus`, 'كيان zoning يجب أن يبقى founder-selected-working-candidate.'));
    }
  });
  return issues;
}

export function validateCandidateRelationships(
  relationships: readonly CandidateExperienceRelationship[],
  entities: readonly CandidateSpatialEntity[],
  scope: { projectId: string; eventId: string; venueId: string },
  allowedExperienceObjectIds: readonly string[]
): SourceAssetValidationIssue[] {
  const issues: SourceAssetValidationIssue[] = [];
  const entityIds = new Set(entities.map((entity) => entity.candidateId));
  const relationshipIds = new Set<string>();
  relationships.forEach((relationship, index) => {
    const path = `$.relationships[${index}]`;
    if (relationshipIds.has(relationship.relationshipId)) issues.push(issue('relationship-id-duplicate', `${path}.relationshipId`, 'معرّف العلاقة المرشحة مكرر.'));
    relationshipIds.add(relationship.relationshipId);
    if (relationship.projectId !== scope.projectId || relationship.eventId !== scope.eventId || relationship.venueId !== scope.venueId) {
      issues.push(issue('relationship-cross-project-scope', path, 'العلاقة المرشحة خارج نطاق المشروع أو الفعالية أو الموقع.'));
    }
    if (relationship.experienceObjectId && !allowedExperienceObjectIds.includes(relationship.experienceObjectId)) {
      issues.push(issue('relationship-experience-object-invalid', `${path}.experienceObjectId`, 'كائن الخبرة غير موجود في السجل الثابت.'));
    }
    relationship.candidateEntityIds.forEach((candidateId) => {
      if (!entityIds.has(candidateId)) issues.push(issue('relationship-candidate-dangling', `${path}.candidateEntityIds`, 'العلاقة تشير إلى كيان مرشح غير موجود.'));
    });
    if (relationship.state === 'conflicted' && relationship.conflictCodes.length === 0) {
      issues.push(issue('relationship-conflict-undocumented', `${path}.conflictCodes`, 'العلاقة المتعارضة تحتاج رمز تعارض ظاهرًا.'));
    }
    if (relationship.state === 'authority-confirmed') {
      issues.push(issue('relationship-authority-promotion-prohibited', `${path}.state`, 'لا يجوز أن تتجاوز العلاقة founder-confirmed في هذا sprint.'));
    }
  });
  const unresolvedShow = relationships.some((relationship) => relationship.experienceObjectId === 'ZONE-SHOW-001'
    && relationship.state === 'unresolved'
    && relationship.candidateEntityIds.length === 0);
  if (!unresolvedShow) issues.push(issue('relationship-show-must-remain-unresolved', '$.relationships', 'يجب أن يبقى ZONE-SHOW-001 بلا تطابق مخمّن.'));
  return issues;
}

export function sanitizeFieldEvidenceAsset(
  asset: Omit<FieldEvidenceAsset, 'gpsPresent' | 'gpsHandlingStatus'>,
  gpsDetected: boolean
): FieldEvidenceAsset {
  return {
    ...structuredClone(asset),
    gpsPresent: gpsDetected,
    gpsHandlingStatus: gpsDetected ? 'quarantined' : 'absent',
    privacyStatus: gpsDetected ? 'restricted' : asset.privacyStatus,
    notes: gpsDetected
      ? [...asset.notes, 'أُبلغ عن وجود GPS؛ الأصل محجور ولا تُنسخ الإحداثيات إلى سجل المتصفح.']
      : [...asset.notes]
  };
}

export function toBrowserSafeFieldEvidenceRecord(asset: FieldEvidenceAsset): FieldEvidenceBrowserRecord {
  return {
    evidenceAssetId: asset.evidenceAssetId,
    projectId: asset.projectId,
    eventId: asset.eventId,
    venueId: asset.venueId,
    mediaType: asset.mediaType,
    gpsPresent: asset.gpsPresent,
    gpsHandlingStatus: asset.gpsHandlingStatus,
    privacyStatus: asset.privacyStatus,
    rightsStatus: asset.rightsStatus,
    linkedEntityIds: [...asset.linkedEntityIds],
    linkedZoneIds: [...asset.linkedZoneIds],
    evidenceStatus: asset.evidenceStatus,
    authorityStatus: asset.authorityStatus,
    notes: [...asset.notes]
  };
}

export function linkEvidenceWithoutReadinessMutation<T>(
  readiness: T,
  evidence: FieldEvidenceAsset
): { readiness: T; evidence: FieldEvidenceAsset } {
  return {
    readiness: structuredClone(readiness),
    evidence: structuredClone(evidence)
  };
}

export function validateCandidateSpatialIntakePackage(
  spatialPackage: CandidateSpatialIntakePackage,
  allowedExperienceObjectIds: readonly string[]
): SourceAssetValidationResult {
  const issues = spatialPackage.sourceAssets.flatMap((asset, index) =>
    validateSourceAssetManifest(asset).issues.map((entry) => ({ ...entry, path: `$.sourceAssets[${index}]${entry.path.slice(1)}` }))
  );
  const scope = { projectId: spatialPackage.projectId, eventId: spatialPackage.eventId, venueId: spatialPackage.venueId };
  spatialPackage.sourceAssets.forEach((asset, index) => {
    if (asset.projectId !== scope.projectId || asset.eventId !== scope.eventId || asset.venueId !== scope.venueId) {
      issues.push(issue('source-cross-project-scope', `$.sourceAssets[${index}]`, 'المصدر خارج نطاق المشروع أو الفعالية أو الموقع.'));
    }
    if (asset.operationalBaselineStatus !== 'not-baseline') {
      issues.push(issue('candidate-source-baseline-prohibited', `$.sourceAssets[${index}].operationalBaselineStatus`, 'مصدر حزمة المرشح لا يجوز أن يصبح operational baseline.'));
    }
    if (asset.geometryApprovalStatus !== 'not-approved') {
      issues.push(issue('candidate-source-geometry-approval-prohibited', `$.sourceAssets[${index}].geometryApprovalStatus`, 'مصدر حزمة المرشح لا يملك اعتماد هندسة.'));
    }
    if (asset.duplicateOfSourceAssetId
      && !spatialPackage.canonicalSourceAssetIds.includes(asset.duplicateOfSourceAssetId)
      && !spatialPackage.sourceAssets.some((candidate) => candidate.sourceAssetId === asset.duplicateOfSourceAssetId)) {
      issues.push(issue('source-duplicate-canonical-missing', `$.sourceAssets[${index}].duplicateOfSourceAssetId`, 'مرجع المصدر القانوني للتكرار غير مسجل.'));
    }
  });
  issues.push(...validateCandidateSpatialEntities(spatialPackage.candidateEntities, spatialPackage.sourceAssets, scope));
  issues.push(...validateCandidateRelationships(spatialPackage.relationships, spatialPackage.candidateEntities, scope, allowedExperienceObjectIds));
  const layerSourceIds = new Set(spatialPackage.sourceLayers.map((layer) => layer.sourceAssetId));
  const sourceAssetById = new Map(spatialPackage.sourceAssets.map((asset) => [asset.sourceAssetId, asset]));
  spatialPackage.sourceLayers.forEach((layer, index) => {
    const sourceAsset = sourceAssetById.get(layer.sourceAssetId);
    if (!sourceAsset) {
      issues.push(issue('source-layer-dangling', `$.sourceLayers[${index}].sourceAssetId`, 'طبقة المصدر تشير إلى أصل غير موجود.'));
      return;
    }
    if (layer.previewUrl) {
      if (!isSafeLocalPreviewUrl(layer.previewUrl)) {
        issues.push(issue('source-preview-url-unsafe', `$.sourceLayers[${index}].previewUrl`, 'رابط المعاينة يجب أن يكون مسارًا محليًا مقيدًا.'));
      }
      if (!layer.previewSha256 || !sha256Pattern.test(layer.previewSha256)) {
        issues.push(issue('source-preview-hash-invalid', `$.sourceLayers[${index}].previewSha256`, 'المعاينة المحلية تحتاج بصمة SHA-256 قانونية.'));
      }
      if (blockedIngestionStates.has(sourceAsset.ingestionStatus)) {
        issues.push(issue('source-preview-blocked', `$.sourceLayers[${index}].previewUrl`, 'لا يجوز عرض preview لمصدر محجوب أو محجور أو مفقود.'));
      }
    }
  });
  spatialPackage.sourceAssets.forEach((asset, index) => {
    if (!layerSourceIds.has(asset.sourceAssetId)) issues.push(issue('source-layer-missing', `$.sourceAssets[${index}]`, 'كل مصدر مراجعة يحتاج طبقة ظاهرة أو حالة مفقودة ظاهرة.'));
  });
  spatialPackage.candidateEntities.forEach((entity, index) => {
    if (!entity.normalizedAnchor) return;
    const sourceLayer = spatialPackage.sourceLayers.find((layer) => layer.sourceAssetId === entity.sourceAssetId);
    if (!sourceLayer?.previewSha256 || entity.normalizedAnchor.previewSha256 !== sourceLayer.previewSha256) {
      issues.push(issue('candidate-anchor-preview-mismatch', `$.candidateEntities[${index}].normalizedAnchor.previewSha256`, 'بصمة preview للمرساة لا تطابق مشتق المصدر المسجل.'));
    }
  });
  spatialPackage.sourceIntegrityRiskIds.forEach((riskId, index) => {
    if (riskId !== 'none-recorded' && !spatialPackage.blockedGateIds.includes(riskId)) {
      issues.push(issue('source-integrity-risk-gate-missing', `$.sourceIntegrityRiskIds[${index}]`, 'كل مخاطرة سلامة مصدر مسجلة يجب أن تبقى بوابة محجوبة.'));
    }
  });
  if (spatialPackage.sourceIntegrityRiskIds.includes('DRIVE-PERMISSION-ANONYMOUS-WRITER')) {
    spatialPackage.sourceAssets.forEach((asset, index) => {
      if (asset.provider === 'google-drive' && asset.providerPermissionRisk !== 'DRIVE-PERMISSION-ANONYMOUS-WRITER') {
        issues.push(issue('source-integrity-risk-suppressed', `$.sourceAssets[${index}].providerPermissionRisk`, 'لا يجوز إسقاط مخاطرة الكاتب المجهول من أصل Drive داخل هذه اللقطة.'));
      }
    });
  }
  if (spatialPackage.sourceReadiness.candidateOperationalEntityCount !== spatialPackage.candidateEntities.length) {
    issues.push(issue('source-readiness-count-mismatch', '$.sourceReadiness.candidateOperationalEntityCount', 'عدد الكيانات في ملخص الجاهزية لا يطابق الحزمة.'));
  }
  if (spatialPackage.overlay.scaleStatus !== 'unknown' || spatialPackage.overlay.crsStatus !== 'unknown') {
    issues.push(issue('candidate-spatial-controls-misrepresented', '$.overlay', 'يجب أن يبقى المقياس وCRS غير معروفين للمخطط المرشح.'));
  }
  if (spatialPackage.sourceReadiness.visitorMapStatus !== 'missing'
    || !spatialPackage.blockedGateIds.includes('VISITOR-MAP-EDITABLE-SOURCE-MISSING')) {
    issues.push(issue('visitor-map-gate-missing', '$.blockedGateIds', 'يجب أن تبقى بوابة خريطة الزائر التوضيحية محجوبة.'));
  }
  return { valid: !issues.some((entry) => entry.blocking), issues };
}
