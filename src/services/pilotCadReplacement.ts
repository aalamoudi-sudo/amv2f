import type {
  PilotCadComparisonResult,
  PilotCadDifference,
  PilotCadManifest,
  PilotCadReplacementResult,
  PilotCandidateValidationIssue
} from '../types/pilotCandidate';
import type { SpatialEntityId } from '../types/spatial';

function issue(code: string, path: string, messageAr: string): PilotCandidateValidationIssue {
  return { code, path, messageAr, severity: 'blocking' };
}

function printable(value: unknown): string {
  if (value === null || value === undefined) return 'غير معروف';
  if (Array.isArray(value)) return value.length ? value.join('، ') : 'لا يوجد';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return 'غير معروف';
}

function difference(
  field: PilotCadDifference['field'],
  currentValue: unknown,
  stagedValue: unknown,
  explanationAr: string,
  changed: boolean | null = JSON.stringify(currentValue) !== JSON.stringify(stagedValue)
): PilotCadDifference {
  return {
    field,
    changed,
    currentValue: printable(currentValue),
    stagedValue: printable(stagedValue),
    explanationAr
  };
}

function missingIds(expectedEntityIds: SpatialEntityId[], mappedEntityIds: SpatialEntityId[]): SpatialEntityId[] {
  const mapped = new Set(mappedEntityIds);
  return expectedEntityIds.filter((entityId) => !mapped.has(entityId));
}

function orphanIds(expectedEntityIds: SpatialEntityId[], mappedEntityIds: SpatialEntityId[]): SpatialEntityId[] {
  const expected = new Set(expectedEntityIds);
  return mappedEntityIds.filter((entityId) => !expected.has(entityId));
}

export function comparePilotCadManifests(
  current: PilotCadManifest,
  staged: PilotCadManifest | null,
  stableEntityIds: SpatialEntityId[]
): PilotCadComparisonResult {
  if (!staged) {
    const awaiting = 'لا يوجد مصدر بديل مرحلي؛ لا يمكن تحديد الفرق.';
    return {
      valid: false,
      currentManifestId: current.manifestId,
      stagedManifestId: null,
      differences: [
        difference('contentHash', current.contentHash, null, awaiting, null),
        difference('revision', current.revision, null, awaiting, null),
        difference('units', current.units, null, awaiting, null),
        difference('xyExtents', current.xyExtents, null, awaiting, null),
        difference('zExtents', current.zExtents, null, awaiting, null),
        difference('layerCount', current.layerCount, null, awaiting, null),
        difference('layerNames', current.layerNames, null, awaiting, null),
        difference('xrefLayerCount', current.xrefLayerCount, null, awaiting, null),
        difference('epsg', current.epsg, null, awaiting, null),
        difference('northAuthority', current.northAuthority, null, awaiting, null),
        difference('originAuthority', current.originAuthority, null, awaiting, null),
        difference('missingMappedEntities', missingIds(stableEntityIds, current.mappedEntityIds), null, awaiting, null),
        difference('orphanedMappings', orphanIds(stableEntityIds, current.mappedEntityIds), null, awaiting, null)
      ],
      missingMappedEntityIds: [...stableEntityIds],
      orphanedMappingIds: [],
      issues: [issue('pilot-cad-staged-source-missing', '$.stagedManifest', 'لم يصل بيان DWG بديل؛ بقيت المقارنة والترقية محجوبتين.')]
    };
  }

  const missingMappedEntityIds = missingIds(stableEntityIds, staged.mappedEntityIds);
  const orphanedMappingIds = orphanIds(stableEntityIds, staged.mappedEntityIds);
  const issues: PilotCandidateValidationIssue[] = [];
  if (staged.sourceStatus !== 'final-approved-source') issues.push(issue('pilot-cad-replacement-not-approved', '$.sourceStatus', 'المصدر البديل ليس مراجعة هندسية معتمدة؛ لا يمكن ترقيته.'));
  if (!/^[a-f0-9]{64}$/i.test(staged.contentHash)) issues.push(issue('pilot-cad-replacement-hash-invalid', '$.contentHash', 'بصمة المصدر البديل غير صالحة.'));
  if (!staged.revision) issues.push(issue('pilot-cad-replacement-revision-missing', '$.revision', 'المصدر البديل يفتقد رقم مراجعة معتمداً.'));
  if (staged.units !== 'metre') issues.push(issue('pilot-cad-replacement-units-invalid', '$.units', 'وحدة المصدر البديل غير معروفة أو ليست بالمتر.'));
  if (!staged.epsg || !staged.northAuthority || !staged.originAuthority) issues.push(issue('pilot-cad-replacement-coordinate-authority-missing', '$', 'المصدر البديل يفتقد EPSG أو الشمال أو نقطة الأصل المعتمدة.'));
  if (missingMappedEntityIds.length) issues.push(issue('pilot-cad-replacement-entity-mapping-missing', '$.mappedEntityIds', `المصدر البديل يفتقد ربط: ${missingMappedEntityIds.join('، ')}.`));
  if (orphanedMappingIds.length) issues.push(issue('pilot-cad-replacement-orphaned-mapping', '$.mappedEntityIds', `المصدر البديل يحتوي ربطاً خارج النطاق: ${orphanedMappingIds.join('، ')}.`));

  return {
    valid: issues.length === 0,
    currentManifestId: current.manifestId,
    stagedManifestId: staged.manifestId,
    differences: [
      difference('contentHash', current.contentHash, staged.contentHash, 'أي تغيير في البصمة يعني محتوى هندسياً مختلفاً.'),
      difference('revision', current.revision, staged.revision, 'رقم المراجعة يجب أن يأتي من سلطة المصدر.'),
      difference('units', current.units, staged.units, 'اختلاف الوحدة يوقف الاستبدال.'),
      difference('xyExtents', current.xyExtents, staged.xyExtents, 'تغير النطاق قد يغير الملاءمة والكاميرا.'),
      difference('zExtents', current.zExtents, staged.zExtents, 'تغير Z يراجع بحثاً عن القيم الشاذة.'),
      difference('layerCount', current.layerCount, staged.layerCount, 'عدد الطبقات مؤشر تغيير وليس إثباتاً لهوية العناصر.'),
      difference('layerNames', current.layerNames, staged.layerNames, 'لا يمكن مقارنة أسماء الطبقات إذا لم يوفر البيان القائمتين.', current.layerNames && staged.layerNames ? JSON.stringify(current.layerNames) !== JSON.stringify(staged.layerNames) : null),
      difference('xrefLayerCount', current.xrefLayerCount, staged.xrefLayerCount, 'تغير مراجع XREF يحتاج مراجعة مصادر.'),
      difference('epsg', current.epsg, staged.epsg, 'EPSG لا يستنتج من الإحداثيات.'),
      difference('northAuthority', current.northAuthority, staged.northAuthority, 'اتجاه الشمال يحتاج سلطة موثقة.'),
      difference('originAuthority', current.originAuthority, staged.originAuthority, 'نقطة الأصل تحتاج سلطة موثقة.'),
      difference('missingMappedEntities', missingIds(stableEntityIds, current.mappedEntityIds), missingMappedEntityIds, 'يجب بقاء كل المعرّفات المنطقية الخمسة مربوطة.'),
      difference('orphanedMappings', orphanIds(stableEntityIds, current.mappedEntityIds), orphanedMappingIds, 'الربط الخارج عن نطاق الحزمة لا يُفعّل بصمت.')
    ],
    missingMappedEntityIds,
    orphanedMappingIds,
    issues
  };
}

export function promotePilotCadManifest(
  current: PilotCadManifest,
  staged: PilotCadManifest,
  stableEntityIds: SpatialEntityId[],
  approval: { authorityType: 'engineering-geometry' | 'platform'; authorityId: string },
  dependencyValidation: () => boolean
): PilotCadReplacementResult {
  const comparison = comparePilotCadManifests(current, staged, stableEntityIds);
  const issues = [...comparison.issues];
  if (approval.authorityType !== 'engineering-geometry') issues.push(issue('pilot-cad-platform-approval-misused', '$.approval', 'اعتماد المنصة لا يرقّي مصدر هندسة؛ يلزم اعتماد هندسي مستقل.'));
  let dependenciesValid = false;
  try {
    dependenciesValid = dependencyValidation();
  } catch {
    dependenciesValid = false;
  }
  if (!dependenciesValid) issues.push(issue('pilot-cad-replacement-dependency-failed', '$', 'فشل تحقق تابع أثناء الاستبدال؛ أُبقي المصدر الحالي دون تغيير.'));
  if (issues.length) {
    return {
      promoted: false,
      rolledBack: true,
      activeManifest: structuredClone(current),
      previousManifest: structuredClone(current),
      issues
    };
  }
  return {
    promoted: true,
    rolledBack: false,
    activeManifest: structuredClone(staged),
    previousManifest: structuredClone(current),
    issues: []
  };
}

export function rollbackPilotCadManifest(result: PilotCadReplacementResult): PilotCadReplacementResult {
  return {
    promoted: false,
    rolledBack: true,
    activeManifest: structuredClone(result.previousManifest),
    previousManifest: structuredClone(result.previousManifest),
    issues: []
  };
}
