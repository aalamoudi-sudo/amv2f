import {
  cadPermittedUseValues,
  cadProhibitedUseValues,
  type CadAuthorityAssertion,
  type CadConversionAdapter,
  type CadConversionRequest,
  type CadConversionResult,
  type CadSourceContentIdentity,
  type CadSourceLocation,
  type DerivedSpatialArtifact,
  type EffectiveCadAuthority,
  type SpatialEntityMapping,
  type SpatialProjectionLineage,
  type SpatialTransformManifest
} from '../types/spatialAuthoring';

export class CadSpatialIntakeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'CadSpatialIntakeError';
    this.code = code;
  }
}

export function acceptExpectedCadHash(expectedHash: string, actualHash: string): true {
  if (!/^[a-f0-9]{64}$/.test(expectedHash) || actualHash !== expectedHash) {
    throw new CadSpatialIntakeError('cad-hash-mismatch', 'بصمة ملف CAD لا تطابق المصدر المصرح به؛ أوقف الاستقبال دون معالجة.');
  }
  return true;
}

export function registerCadSourceLocation(
  sources: readonly CadSourceContentIdentity[],
  locations: readonly CadSourceLocation[],
  source: CadSourceContentIdentity,
  location: CadSourceLocation
): { sources: CadSourceContentIdentity[]; locations: CadSourceLocation[]; sourceId: string } {
  if (location.sourceHash !== source.contentHash) throw new CadSpatialIntakeError('cad-location-hash-mismatch', 'الموقع المحلي لا يشير إلى بصمة محتوى المصدر.');
  const existing = sources.find((entry) => entry.contentHash === source.contentHash);
  const sourceId = existing?.sourceId ?? source.sourceId;
  const normalizedLocation = { ...location, sourceId };
  const nextLocations = locations.some((entry) => entry.locationId === normalizedLocation.locationId)
    ? [...locations]
    : [...locations, normalizedLocation];
  return {
    sources: existing ? [...sources] : [...sources, source],
    locations: nextLocations,
    sourceId
  };
}

export function appendCadAuthorityAssertion(
  source: CadSourceContentIdentity,
  history: readonly CadAuthorityAssertion[],
  assertion: CadAuthorityAssertion
): CadAuthorityAssertion[] {
  if (history.some((entry) => entry.authorityAssertionId === assertion.authorityAssertionId)) {
    throw new CadSpatialIntakeError('duplicate-authority-assertion', 'معرّف إقرار السلطة موجود مسبقًا؛ السجل append-only ولا يُستبدل.');
  }
  if (assertion.sourceId !== source.sourceId || assertion.sourceHash !== source.contentHash) {
    throw new CadSpatialIntakeError('authority-source-mismatch', 'إقرار السلطة لا يطابق هوية محتوى CAD.');
  }
  return [...history, structuredClone(assertion)];
}

export function deriveEffectiveCadAuthority(
  source: CadSourceContentIdentity,
  assertions: readonly CadAuthorityAssertion[]
): EffectiveCadAuthority {
  const applicable = assertions.filter((entry) => entry.sourceId === source.sourceId
    && entry.sourceHash === source.contentHash
    && entry.revokedAt === null);
  const sourceApproved = applicable.some((entry) => entry.authorityType === 'founder-approved-cad-source');
  const working = sourceApproved
    || applicable.some((entry) => entry.authorityType === 'platform-owner-working-approval');
  return {
    sourceId: source.sourceId,
    sourceHash: source.contentHash,
    classification: sourceApproved
      ? 'founder-approved-cad-source'
      : working
        ? 'approved-working-baseline'
        : 'provisional-capture',
    authorityAssertionIds: applicable.map((entry) => entry.authorityAssertionId),
    permittedUses: working ? [...cadPermittedUseValues] : [],
    prohibitedUses: [...cadProhibitedUseValues],
    engineeringAuthority: 'none',
    spatialConfidence: 'unknown',
    mappingApproval: 'none',
    supersessionState: 'current'
  };
}

export function assertSpatialMappingScope(
  mapping: SpatialEntityMapping,
  scope: { projectId: string; eventId: string; venueId: string },
  stableEntityIds: readonly string[]
): true {
  if (mapping.projectId !== scope.projectId || mapping.eventId !== scope.eventId || mapping.venueId !== scope.venueId) {
    throw new CadSpatialIntakeError('cross-project-mapping', 'حُجبت المواءمة لأنها لا تنتمي إلى المشروع والفعالية والموقع النشطين.');
  }
  if (!stableEntityIds.includes(mapping.entityId)) {
    throw new CadSpatialIntakeError('unstable-zone-id', 'معرّف المنطقة غير موجود في سجل KAP الثابت.');
  }
  return true;
}

export function validateSpatialMapping(mapping: SpatialEntityMapping): true {
  const hasGeometry = Boolean(mapping.geometryReference && mapping.layerReferences.length);
  if (mapping.mappingStatus === 'unmapped' && hasGeometry) {
    throw new CadSpatialIntakeError('unmapped-geometry-present', 'المواءمة غير المربوطة لا يجوز أن تحمل مرجع هندسة.');
  }
  if (mapping.mappingStatus !== 'unmapped' && mapping.mappingStatus !== 'rejected' && mapping.mappingStatus !== 'superseded' && !hasGeometry) {
    throw new CadSpatialIntakeError('mapping-geometry-missing', 'المواءمة تحتاج مرجع هندسة وطبقة صريحين.');
  }
  if ((mapping.mappingMethod === 'name-suggestion' || mapping.mappingMethod === 'geometry-suggestion') && !['suggested', 'rejected', 'superseded'].includes(mapping.mappingStatus)) {
    throw new CadSpatialIntakeError('automatic-mapping-promotion', 'المطابقة الآلية أو الاسمية لا تتجاوز حالة suggested تلقائيًا.');
  }
  if (mapping.mappingStatus === 'approved-working' && (!mapping.reviewedBy || !mapping.approvedBy)) {
    throw new CadSpatialIntakeError('mapping-approval-incomplete', 'المواءمة approved-working تحتاج مراجعًا ومعتمدًا صريحين.');
  }
  return true;
}

export function findSpatialMappingConflicts(mappings: readonly SpatialEntityMapping[]): Array<{ geometryReference: string; entityIds: string[] }> {
  const assignments = new Map<string, Set<string>>();
  mappings.filter((mapping) => mapping.geometryReference && !['unmapped', 'rejected', 'superseded'].includes(mapping.mappingStatus)).forEach((mapping) => {
    const key = `${mapping.projectId}|${mapping.sourceHash}|${mapping.geometryReference}`;
    const ids = assignments.get(key) ?? new Set<string>();
    ids.add(mapping.entityId);
    assignments.set(key, ids);
  });
  return [...assignments.entries()]
    .filter(([, entityIds]) => entityIds.size > 1)
    .map(([key, entityIds]) => ({ geometryReference: key.split('|').at(-1)!, entityIds: [...entityIds] }));
}

export function saveCandidateMapping(mapping: SpatialEntityMapping, actor: string, reason: string): SpatialEntityMapping {
  if (!mapping.geometryReference || !mapping.layerReferences.length || !reason.trim()) {
    throw new CadSpatialIntakeError('candidate-mapping-incomplete', 'الحفظ المرشح يحتاج هندسة وطبقة وسببًا موثقًا.');
  }
  const candidate: SpatialEntityMapping = {
    ...mapping,
    mappingMethod: 'manual-selection',
    mappingStatus: 'candidate',
    mappedBy: actor,
    reviewedBy: null,
    approvedBy: null,
    revision: mapping.revision + 1,
    changeReason: reason,
    confidence: mapping.confidence === 'unknown' ? 'low' : mapping.confidence
  };
  validateSpatialMapping(candidate);
  return candidate;
}

export function supersedeSpatialMapping(mapping: SpatialEntityMapping, actor: string, reason: string): SpatialEntityMapping {
  if (!reason.trim()) throw new CadSpatialIntakeError('supersession-reason-missing', 'سبب الاستبدال أو التراجع مطلوب.');
  return {
    ...mapping,
    mappingStatus: 'superseded',
    revision: mapping.revision + 1,
    changeReason: `${reason} · بواسطة ${actor}`
  };
}

function rotateX([x, y, z]: [number, number, number], radians: number): [number, number, number] {
  return [x, y * Math.cos(radians) - z * Math.sin(radians), y * Math.sin(radians) + z * Math.cos(radians)];
}

function rotateY([x, y, z]: [number, number, number], radians: number): [number, number, number] {
  return [x * Math.cos(radians) + z * Math.sin(radians), y, -x * Math.sin(radians) + z * Math.cos(radians)];
}

function rotateZ([x, y, z]: [number, number, number], radians: number): [number, number, number] {
  return [x * Math.cos(radians) - y * Math.sin(radians), x * Math.sin(radians) + y * Math.cos(radians), z];
}

export function applyDisplayTransform(point: [number, number, number], manifest: SpatialTransformManifest): [number, number, number] {
  if (!manifest.scale || !manifest.rotation || !manifest.translation) throw new CadSpatialIntakeError('transform-unknown', 'لا يمكن تطبيق تحويل مكاني ما دامت قيمه مجهولة.');
  let current: [number, number, number] = point.map((value, index) => value * manifest.scale![index]!) as [number, number, number];
  current = rotateX(current, manifest.rotation[0] * Math.PI / 180);
  current = rotateY(current, manifest.rotation[1] * Math.PI / 180);
  current = rotateZ(current, manifest.rotation[2] * Math.PI / 180);
  return current.map((value, index) => value + manifest.translation![index]!) as [number, number, number];
}

export function reverseDisplayTransform(point: [number, number, number], manifest: SpatialTransformManifest): [number, number, number] {
  if (!manifest.scale || !manifest.rotation || !manifest.translation || manifest.scale.some((value) => value === 0)) {
    throw new CadSpatialIntakeError('transform-unknown', 'لا يمكن عكس تحويل مكاني مجهول أو ذي مقياس صفري.');
  }
  let current = point.map((value, index) => value - manifest.translation![index]!) as [number, number, number];
  current = rotateZ(current, -manifest.rotation[2] * Math.PI / 180);
  current = rotateY(current, -manifest.rotation[1] * Math.PI / 180);
  current = rotateX(current, -manifest.rotation[0] * Math.PI / 180);
  return current.map((value, index) => value / manifest.scale![index]!) as [number, number, number];
}

export function buildSpatialProjectionLineage(
  scope: { projectId: string; eventId: string; venueId: string },
  sourceHash: string,
  transformVersion: string,
  mappings: readonly SpatialEntityMapping[]
): SpatialProjectionLineage | null {
  const reviewed = mappings.filter((mapping) => mapping.mappingStatus === 'reviewed' || mapping.mappingStatus === 'approved-working');
  if (!reviewed.length) return null;
  const mappingRevision = Math.max(...reviewed.map((mapping) => mapping.revision));
  return {
    ...scope,
    sourceHash,
    mappingRevision,
    spatialProjectionVersion: `SPATIAL-PROJECTION-${sourceHash.slice(0, 12)}-R${mappingRevision}`,
    transformVersion,
    outputs: ['experience-map', 'executive-command-map', 'spatial-2d', 'spatial-3d', 'projection-preview']
  };
}

export function validateDerivedArtifactLineage(
  artifact: DerivedSpatialArtifact,
  source: CadSourceContentIdentity,
  scope: { projectId: string; eventId: string; venueId: string }
): true {
  if (artifact.parentSourceId !== source.sourceId || artifact.parentSha256 !== source.contentHash) {
    throw new CadSpatialIntakeError('derived-lineage-mismatch', 'الأصل المشتق لا يشير إلى هوية وبصمة المصدر الأب.');
  }
  if (artifact.projectId !== scope.projectId || artifact.eventId !== scope.eventId || artifact.venueId !== scope.venueId) {
    throw new CadSpatialIntakeError('derived-cross-project', 'الأصل المشتق خارج سياق المشروع أو الفعالية أو الموقع.');
  }
  if (!artifact.conversionTool || !artifact.conversionToolVersion || !artifact.outputSha256 || !artifact.conversionProfile) {
    throw new CadSpatialIntakeError('derived-lineage-incomplete', 'بيانات أداة التحويل أو إصدارها أو بصمة الناتج غير مكتملة.');
  }
  return true;
}

export function materializeSpatialProjectionOutputs(lineage: SpatialProjectionLineage) {
  return lineage.outputs.map((output) => ({
    output,
    projectId: lineage.projectId,
    eventId: lineage.eventId,
    venueId: lineage.venueId,
    sourceHash: lineage.sourceHash,
    mappingRevision: lineage.mappingRevision,
    spatialProjectionVersion: lineage.spatialProjectionVersion,
    transformVersion: lineage.transformVersion
  }));
}

export function missingXrefWarnings(result: CadConversionResult): string[] {
  return result.status === 'converted'
    ? result.warningsAr.filter((warning) => /xref|مرجع خارجي/i.test(warning))
    : [];
}

export interface RouteAuthorityCandidate {
  routeId: string | null;
  geometryReference: string | null;
  sourceId: string | null;
  routeAuthority: string | null;
  revision: number | null;
  effectiveDate: string | null;
  approvalScope: string | null;
}

export function routeAuthorityAllowsActivation(route: RouteAuthorityCandidate): boolean {
  return Boolean(route.routeId && route.geometryReference && route.sourceId && route.routeAuthority
    && route.revision && route.effectiveDate && route.approvalScope);
}

export class UnavailableLocalCadConversionAdapter implements CadConversionAdapter {
  readonly adapterId = 'ADAPTER-LOCAL-CAD-CONVERSION-BOUNDARY';
  readonly adapterVersion = '1.0.0';
  readonly executionBoundary = 'local-offline' as const;

  convert(_request: CadConversionRequest, signal: AbortSignal): Promise<CadConversionResult> {
    if (signal.aborted) return Promise.reject(new DOMException('Conversion cancelled', 'AbortError'));
    return Promise.resolve({
      status: 'conversion-required',
      adapterId: this.adapterId,
      adapterVersion: this.adapterVersion,
      reasonAr: 'لا توجد أداة محلية مثبتة وقابلة للتوثيق لتحويل DWG بأمان. لم تُقرأ طبقات أو هندسة من الملف.',
      acceptableInputs: ['dxf-export', 'packaged-dwg-with-xrefs', 'approved-pdf-floor-plan']
    });
  }
}

export async function runCadConversion(
  adapter: CadConversionAdapter,
  request: CadConversionRequest,
  signal: AbortSignal
): Promise<CadConversionResult> {
  if (adapter.executionBoundary !== 'local-offline') throw new CadSpatialIntakeError('cloud-conversion-prohibited', 'التحويل السحابي أو الخارجي محظور لهذا المصدر.');
  return adapter.convert(request, signal);
}
