import type {
  DesignAssetManifest,
  DesignAssetDerivative,
  DesignAssetValidationIssue,
  DesignAssetValidationResult,
  DesignExperienceConfiguration
} from '../types/designExperience';
import { sha256PayloadSync } from './integrationHash';
import { isSafeDesignRuntimeUri } from './designAssetStagingPolicy';

export interface GlbInspection {
  validContainer: boolean;
  declaredLength: number;
  sceneCount: number;
  nodeCount: number;
  meshCount: number;
  primitiveCount: number;
  vertexCount: number;
  triangleCount: number;
  materialCount: number;
  textureCount: number;
  externalUris: string[];
  extensionsRequired: string[];
  boundsMin: [number, number, number] | null;
  boundsMax: [number, number, number] | null;
  issues: DesignAssetValidationIssue[];
}

const issue = (code: string, field: string, messageAr: string, severity: DesignAssetValidationIssue['severity'] = 'blocking'): DesignAssetValidationIssue => ({ code, field, severity, messageAr });
const sha256Pattern = /^[a-f0-9]{64}$/;

export function materializeDesignAssetManifest(input: Omit<DesignAssetManifest, 'contentHash'>): DesignAssetManifest {
  return { ...structuredClone(input), contentHash: sha256PayloadSync(input) };
}

function tuple3(value: unknown): [number, number, number] | null {
  return Array.isArray(value) && value.length === 3 && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
    ? [value[0], value[1], value[2]]
    : null;
}

function sameTuple(left: [number, number, number], right: [number, number, number], tolerance = 0.001): boolean {
  return left.every((value, index) => Math.abs(value - right[index]!) <= tolerance);
}

export function inspectGlbBinary(input: Uint8Array): GlbInspection {
  const issues: DesignAssetValidationIssue[] = [];
  const empty: Omit<GlbInspection, 'issues'> = {
    validContainer: false,
    declaredLength: 0,
    sceneCount: 0,
    nodeCount: 0,
    meshCount: 0,
    primitiveCount: 0,
    vertexCount: 0,
    triangleCount: 0,
    materialCount: 0,
    textureCount: 0,
    externalUris: [],
    extensionsRequired: [],
    boundsMin: null,
    boundsMax: null
  };
  try {
    if (input.byteLength < 20) return { ...empty, issues: [issue('design-glb-header-short', 'file', 'ملف GLB أقصر من الترويسة القانونية.')] };
    const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
    const magic = view.getUint32(0, true);
    const version = view.getUint32(4, true);
    const declaredLength = view.getUint32(8, true);
    if (magic !== 0x46546c67) issues.push(issue('design-glb-magic-invalid', 'file', 'توقيع GLB غير صالح.'));
    if (version !== 2) issues.push(issue('design-glb-version-unsupported', 'file', 'يجب أن يكون أصل Web3D بصيغة glTF 2.0.'));
    if (declaredLength !== input.byteLength) issues.push(issue('design-glb-length-mismatch', 'file', 'طول حاوية GLB لا يطابق حجم الملف.'));
    const jsonLength = view.getUint32(12, true);
    const jsonType = view.getUint32(16, true);
    if (jsonType !== 0x4e4f534a || 20 + jsonLength > input.byteLength) {
      issues.push(issue('design-glb-json-chunk-invalid', 'file', 'مقطع JSON داخل GLB مفقود أو غير صالح.'));
      return { ...empty, declaredLength, issues };
    }
    const decodedJson = new TextDecoder().decode(input.subarray(20, 20 + jsonLength));
    const jsonText = decodedJson.slice(0, decodedJson.lastIndexOf('}') + 1).trim();
    const document = JSON.parse(jsonText) as {
      scenes?: unknown[];
      nodes?: unknown[];
      meshes?: Array<{ primitives?: Array<{ attributes?: Record<string, number>; indices?: number }> }>;
      accessors?: Array<{ count?: number; min?: unknown; max?: unknown }>;
      materials?: unknown[];
      textures?: unknown[];
      images?: Array<{ uri?: string }>;
      buffers?: Array<{ uri?: string }>;
      extensionsRequired?: string[];
    };
    const accessors = document.accessors ?? [];
    const primitives = (document.meshes ?? []).flatMap((mesh) => mesh.primitives ?? []);
    const positionAccessors = primitives.flatMap((primitive) => typeof primitive.attributes?.POSITION === 'number' ? [accessors[primitive.attributes.POSITION]] : []).filter(Boolean);
    const boundsMin = positionAccessors.reduce<[number, number, number] | null>((current, accessor) => {
      const candidate = tuple3(accessor?.min);
      if (!candidate) return current;
      return current ? current.map((value, index) => Math.min(value, candidate[index]!)) as [number, number, number] : candidate;
    }, null);
    const boundsMax = positionAccessors.reduce<[number, number, number] | null>((current, accessor) => {
      const candidate = tuple3(accessor?.max);
      if (!candidate) return current;
      return current ? current.map((value, index) => Math.max(value, candidate[index]!)) as [number, number, number] : candidate;
    }, null);
    const externalUris = [...(document.buffers ?? []), ...(document.images ?? [])]
      .flatMap((entry) => entry.uri && !entry.uri.startsWith('data:') ? [entry.uri] : []);
    if (externalUris.length) issues.push(issue('design-glb-external-uri', 'externalUris', 'المشتق يحتوي مراجع خارجية غير مسموحة للعرض المحلي.'));
    if (!document.scenes?.length || !document.meshes?.length || !primitives.length) issues.push(issue('design-glb-empty-scene', 'scene', 'المشتق لا يحتوي مشهدًا شبكيًا قابلًا للفحص.'));
    return {
      validContainer: !issues.some((entry) => entry.severity === 'blocking'),
      declaredLength,
      sceneCount: document.scenes?.length ?? 0,
      nodeCount: document.nodes?.length ?? 0,
      meshCount: document.meshes?.length ?? 0,
      primitiveCount: primitives.length,
      vertexCount: positionAccessors.reduce((total, accessor) => total + (accessor?.count ?? 0), 0),
      triangleCount: primitives.reduce((total, primitive) => total + Math.floor((accessors[primitive.indices ?? -1]?.count ?? 0) / 3), 0),
      materialCount: document.materials?.length ?? 0,
      textureCount: document.textures?.length ?? 0,
      externalUris,
      extensionsRequired: document.extensionsRequired ?? [],
      boundsMin,
      boundsMax,
      issues
    };
  } catch {
    return { ...empty, issues: [issue('design-glb-parse-failed', 'file', 'تعذر تحليل GLB بأمان، لذلك حُجب الأصل.')] };
  }
}

export function validateDesignDerivative(derivative: DesignAssetDerivative, bytes?: Uint8Array): DesignAssetValidationResult {
  try {
    const issues: DesignAssetValidationIssue[] = [];
    if (!sha256Pattern.test(derivative.sha256)) issues.push(issue('design-derivative-sha-invalid', 'sha256', 'بصمة المشتق غير صالحة.'));
    if (!sha256Pattern.test(derivative.sourceSha256)) issues.push(issue('design-source-sha-invalid', 'sourceSha256', 'بصمة المصدر المرتبط غير صالحة.'));
    if (derivative.authorityStatus !== 'derived-diagnostic-candidate' && derivative.spatialRegistrationStatus !== 'engineering-approved') {
      issues.push(issue('design-derivative-authority-invalid', 'authorityStatus', 'سلطة المشتق لا تتوافق مع حالة التسجيل الهندسي.'));
    }
    if (!isSafeDesignRuntimeUri(derivative.runtimeUri)) {
      issues.push(issue('design-runtime-uri-unsafe', 'runtimeUri', 'مسار المشتق يجب أن يكون محليًا وآمنًا دون كشف مسار خاص.'));
    }
    if (derivative.externalDependencyCount !== 0) issues.push(issue('design-external-dependencies-blocked', 'externalDependencyCount', 'المشتق ذو المراجع الخارجية محجوب حتى تعبئة تبعياته محليًا.'));
    if (derivative.spatialRegistrationStatus === 'engineering-approved' && derivative.authorityStatus === 'derived-diagnostic-candidate') {
      issues.push(issue('design-engineering-promotion-invalid', 'spatialRegistrationStatus', 'لا يجوز ترقية مشتق تشخيصي إلى هندسة معتمدة.'));
    }
    if (bytes) {
      if (bytes.byteLength !== derivative.byteSize) issues.push(issue('design-derivative-size-mismatch', 'byteSize', 'حجم المشتق لا يطابق السجل.'));
      const inspection = inspectGlbBinary(bytes);
      issues.push(...inspection.issues);
      const exactCounts: Array<[number, number, string, string]> = [
        [inspection.sceneCount, derivative.sceneCount, 'sceneCount', 'عدد المشاهد'],
        [inspection.nodeCount, derivative.nodeCount, 'nodeCount', 'عدد العقد'],
        [inspection.meshCount, derivative.meshCount, 'meshCount', 'عدد الشبكات'],
        [inspection.primitiveCount, derivative.primitiveCount, 'primitiveCount', 'عدد المقاطع'],
        [inspection.vertexCount, derivative.vertexCount, 'vertexCount', 'عدد الرؤوس'],
        [inspection.triangleCount, derivative.triangleCount, 'triangleCount', 'عدد المثلثات'],
        [inspection.materialCount, derivative.materialCount, 'materialCount', 'عدد المواد'],
        [inspection.textureCount, derivative.textureCount, 'textureCount', 'عدد الخامات']
      ];
      exactCounts.forEach(([observed, expected, field, label]) => {
        if (observed !== expected) issues.push(issue('design-derivative-fact-mismatch', field, `${label} لا يطابق سجل المشتق.`));
      });
      if (!inspection.boundsMin || !sameTuple(inspection.boundsMin, derivative.boundsMin) || !inspection.boundsMax || !sameTuple(inspection.boundsMax, derivative.boundsMax)) {
        issues.push(issue('design-derivative-bounds-mismatch', 'bounds', 'حدود المشتق لا تطابق السجل المتحقق.'));
      }
    }
    const blocking = issues.some((entry) => entry.severity === 'blocking');
    return {
      valid: !blocking,
      renderable: !blocking && derivative.runtimeUri !== null && derivative.authorityStatus === 'derived-diagnostic-candidate',
      issues,
      messageAr: blocking ? 'فشل تحقق مشتق التصميم وحُجب عن العارض.' : 'مشتق التصميم متحقق وقابل للعرض كمرشح تشخيصي.'
    };
  } catch {
    return { valid: false, renderable: false, issues: [issue('design-validation-failed-safe', 'manifest', 'تعذر التحقق من المشتق بأمان، لذلك حُجب.')], messageAr: 'تعذر التحقق من المشتق بأمان.' };
  }
}

export function validateDesignExperienceConfiguration(configuration: DesignExperienceConfiguration): DesignAssetValidationResult {
  try {
    const issues: DesignAssetValidationIssue[] = [];
    const sourceIds = new Set(configuration.sources.map((source) => source.sourceId));
    const derivativeIds = new Set(configuration.derivatives.map((item) => item.derivativeId));
    const sceneIds = new Set(configuration.scenes.map((scene) => scene.sceneId));
    const manifestIds = new Set(configuration.manifests.map((manifest) => manifest.manifestId));
    const relationIds = new Set(configuration.relations.map((relation) => relation.relationId));
    const viewpointIds = new Set(configuration.viewpoints.map((viewpoint) => viewpoint.viewpointId));
    const tourIds = new Set(configuration.cameraTours.map((tour) => tour.tourId));
    if (sourceIds.size !== configuration.sources.length) issues.push(issue('design-source-id-duplicate', 'sources', 'يوجد معرّف مصدر تصميم مكرر.'));
    if (derivativeIds.size !== configuration.derivatives.length) issues.push(issue('design-derivative-id-duplicate', 'derivatives', 'يوجد معرّف مشتق مكرر.'));
    if (sceneIds.size !== configuration.scenes.length) issues.push(issue('design-scene-id-duplicate', 'scenes', 'يوجد معرّف مشهد تصميم مكرر.'));
    if (manifestIds.size !== configuration.manifests.length) issues.push(issue('design-manifest-id-duplicate', 'manifests', 'يوجد معرّف بيان تصميم مكرر.'));
    if (relationIds.size !== configuration.relations.length) issues.push(issue('design-relation-id-duplicate', 'relations', 'يوجد معرّف علاقة تصميم مكرر.'));
    if (viewpointIds.size !== configuration.viewpoints.length) issues.push(issue('design-viewpoint-id-duplicate', 'viewpoints', 'يوجد معرّف منظور تصميم مكرر.'));
    if (tourIds.size !== configuration.cameraTours.length) issues.push(issue('design-tour-id-duplicate', 'cameraTours', 'يوجد معرّف جولة تصميم مكرر.'));
    configuration.sources.forEach((source, index) => {
      if (!sha256Pattern.test(source.observedSha256) || source.observedByteSize <= 0) issues.push(issue('design-source-fingerprint-invalid', `sources/${index}`, 'بصمة أو حجم مصدر التصميم غير صالح.'));
      if (source.safeFilename.includes('/') || source.safeFilename.includes('\\') || source.safeFilename.includes('..')) issues.push(issue('design-source-filename-unsafe', `sources/${index}/safeFilename`, 'اسم مصدر التصميم غير آمن للعرض.'));
      if (source.mayChangeBaseline || source.mayChangeReadiness) issues.push(issue('design-source-truth-mutation-invalid', `sources/${index}`, 'مصدر التصميم لا يجوز أن يغيّر الجاهزية أو الخط الأساسي.'));
    });
    configuration.derivatives.forEach((derivative, index) => {
      const source = configuration.sources.find((item) => item.sourceId === derivative.sourceId);
      if (!source) issues.push(issue('design-derivative-source-missing', `derivatives/${index}/sourceId`, 'المشتق لا يرتبط بمصدر تصميم مسجل.'));
      else if (derivative.sourceSha256 !== source.observedSha256) issues.push(issue('design-derivative-source-hash-mismatch', `derivatives/${index}/sourceSha256`, 'المشتق لا يرتبط ببصمة المصدر المسجلة نفسها.'));
      issues.push(...validateDesignDerivative(derivative).issues);
    });
    configuration.manifests.forEach((manifest, index) => {
      const source = configuration.sources.find((item) => item.sourceId === manifest.sourceId);
      if (!source) issues.push(issue('design-manifest-source-missing', `manifests/${index}/sourceId`, 'بيان التصميم لا يرتبط بمصدر مسجل.'));
      if (manifest.projectId !== source?.projectId || manifest.eventId !== source?.eventId || manifest.venueId !== source?.venueId) issues.push(issue('design-manifest-scope-mismatch', `manifests/${index}`, 'نطاق بيان التصميم لا يطابق نطاق المصدر.'));
      manifest.derivativeIds.filter((id) => !derivativeIds.has(id)).forEach(() => issues.push(issue('design-manifest-derivative-missing', `manifests/${index}/derivativeIds`, 'بيان التصميم يشير إلى مشتق غير مسجل.')));
      manifest.sceneIds.filter((id) => !sceneIds.has(id)).forEach(() => issues.push(issue('design-manifest-scene-missing', `manifests/${index}/sceneIds`, 'بيان التصميم يشير إلى مشهد غير مسجل.')));
      const { contentHash, ...payload } = manifest;
      if (!sha256Pattern.test(contentHash) || contentHash !== sha256PayloadSync(payload)) issues.push(issue('design-manifest-hash-mismatch', `manifests/${index}/contentHash`, 'بصمة بيان التصميم لا تطابق تمثيله القانوني.'));
    });
    configuration.scenes.forEach((scene, index) => {
      if (!derivativeIds.has(scene.derivativeId)) issues.push(issue('design-scene-derivative-missing', `scenes/${index}/derivativeId`, 'المشهد لا يرتبط بمشتق مسجل.'));
      if (scene.engineeringStatus === 'engineering-approved' || scene.operationalStatus !== 'cannot-determine' || scene.routeStatus !== 'none') {
        issues.push(issue('design-scene-truth-promotion-invalid', `scenes/${index}`, 'المشهد المرشح لا يجوز أن يدعي هندسة أو جاهزية أو مسارًا.'));
      }
      scene.relationshipIds.filter((id) => !relationIds.has(id)).forEach(() => issues.push(issue('design-scene-relation-missing', `scenes/${index}/relationshipIds`, 'علاقة المشهد غير مسجلة.')));
      scene.viewpointIds.filter((id) => !viewpointIds.has(id)).forEach(() => issues.push(issue('design-scene-viewpoint-missing', `scenes/${index}/viewpointIds`, 'منظور المشهد غير مسجل.')));
    });
    configuration.relations.forEach((relation, index) => {
      if (!sceneIds.has(relation.sceneId)) issues.push(issue('design-relation-scene-missing', `relations/${index}/sceneId`, 'العلاقة تشير إلى مشهد غير معروف.'));
      if (relation.createsApprovedGeometry || relation.createsSpatialRoute) {
        issues.push(issue('design-relation-authority-invalid', `relations/${index}`, 'علاقة التصميم المرشحة لا تنشئ هندسة أو مسارًا معتمدًا.'));
      }
    });
    configuration.viewpoints.forEach((viewpoint, index) => {
      if (!sceneIds.has(viewpoint.sceneId)) issues.push(issue('design-viewpoint-scene-missing', `viewpoints/${index}/sceneId`, 'منظور التصميم يشير إلى مشهد غير معروف.'));
      if (viewpoint.fieldOfViewDegrees < 20 || viewpoint.fieldOfViewDegrees > 90) issues.push(issue('design-viewpoint-fov-invalid', `viewpoints/${index}/fieldOfViewDegrees`, 'مجال رؤية كاميرا المعاينة خارج الحدود الآمنة.'));
    });
    configuration.cameraTours.forEach((tour, index) => {
      if (!sceneIds.has(tour.sceneId) || tour.viewpointIds.some((id) => !viewpointIds.has(id))) issues.push(issue('design-tour-reference-invalid', `cameraTours/${index}`, 'جولة التصميم تحتوي مرجع مشهد أو منظور غير صالح.'));
      if (tour.routeAuthority !== 'none' || tour.panoramaAuthority !== 'none') issues.push(issue('design-tour-authority-invalid', `cameraTours/${index}`, 'جولة كاميرا التصميم لا يجوز أن تدعي سلطة مسار أو 360.'));
    });
    const profileIds = new Set(configuration.performanceProfiles.map((profile) => profile.profileId));
    if (profileIds.size !== configuration.performanceProfiles.length || !(['balanced', 'high', 'low-power'] as const).every((id) => profileIds.has(id))) issues.push(issue('design-performance-profile-incomplete', 'performanceProfiles', 'ملفات أداء مشهد التصميم غير مكتملة أو مكررة.'));
    const blocking = issues.some((entry) => entry.severity === 'blocking');
    return { valid: !blocking, renderable: !blocking && configuration.derivatives.some((item) => item.runtimeUri), issues, messageAr: blocking ? 'سجل التصميم غير صالح وحُجب.' : 'سجل التصميم صالح ضمن حدود المراجعة المرشحة.' };
  } catch {
    return { valid: false, renderable: false, issues: [issue('design-configuration-validation-failed-safe', 'configuration', 'تعذر فحص سجل التصميم بأمان، لذلك حُجب.')], messageAr: 'تعذر فحص سجل التصميم بأمان.' };
  }
}
