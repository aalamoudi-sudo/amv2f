import { sha256PayloadSync } from './integrationHash';
import { assessIntakePath, classifyStudioCapability, findUnexpectedExternalUris, safeDisplayFilename } from './experienceDeliverySafety';
import type {
  ExperienceDeliveryValidationIssue,
  PanoramaValidationInput,
  PanoramaValidationResult,
  StudioAssetValidationResult,
  StudioDependencyRecord,
  StudioDependencyReport,
  StudioDeliveryFormat,
  StudioVector3
} from '../types/experienceDelivery';

export const studioAssetValidatorVersion = 'EXPERIENCE-STUDIO-ASSET-VALIDATOR-v1' as const;

function issue(
  code: string,
  messageAr: string,
  severity: 'blocking' | 'warning' = 'blocking',
  field = '/asset',
  recommendedActionAr = 'صحح أصل الاستوديو ثم أعد الفحص المحلي.'
): ExperienceDeliveryValidationIssue {
  return {
    code,
    path: field,
    messageAr,
    severity,
    affectedFile: null,
    affectedField: field,
    blocking: severity === 'blocking',
    recommendedActionAr,
    safeTechnicalDetail: code
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringUris(document: Record<string, unknown>): string[] {
  const bufferUris = array(document.buffers).flatMap((entry) => {
    const uri = asRecord(entry)?.uri;
    return typeof uri === 'string' ? [uri] : [];
  });
  const imageUris = array(document.images).flatMap((entry) => {
    const uri = asRecord(entry)?.uri;
    return typeof uri === 'string' ? [uri] : [];
  });
  return [...bufferUris, ...imageUris];
}

function normalizedLocalResourceUri(uri: string): string | null {
  try {
    const decoded = decodeURIComponent(uri).replaceAll('\\', '/');
    if (/^[a-z][a-z0-9+.-]*:/iu.test(decoded) || decoded.startsWith('//')) return null;
    const assessment = assessIntakePath({ relativePath: decoded, symbolicLink: false, resolvedWithinRoot: true, directory: false, allowedDataExtensions: new Set(['bin']) });
    return assessment.safe ? decoded : null;
  } catch {
    return null;
  }
}

function calculateBoundingBox(document: Record<string, unknown>): { min: StudioVector3; max: StudioVector3 } | null {
  const positionAccessorIds = new Set<number>();
  for (const mesh of array(document.meshes)) {
    for (const primitive of array(asRecord(mesh)?.primitives)) {
      const position = asRecord(asRecord(primitive)?.attributes)?.POSITION;
      if (typeof position === 'number' && Number.isInteger(position)) positionAccessorIds.add(position);
    }
  }
  const accessors = array(document.accessors);
  const mins: StudioVector3[] = [];
  const maxs: StudioVector3[] = [];
  for (const id of positionAccessorIds) {
    const accessor = asRecord(accessors[id]);
    const min = array(accessor?.min).map(Number);
    const max = array(accessor?.max).map(Number);
    if (min.length >= 3 && max.length >= 3 && [...min, ...max].every(Number.isFinite)) {
      mins.push({ x: min[0]!, y: min[1]!, z: min[2]! });
      maxs.push({ x: max[0]!, y: max[1]!, z: max[2]! });
    }
  }
  if (!mins.length) return null;
  return {
    min: {
      x: Math.min(...mins.map((value) => value.x)),
      y: Math.min(...mins.map((value) => value.y)),
      z: Math.min(...mins.map((value) => value.z))
    },
    max: {
      x: Math.max(...maxs.map((value) => value.x)),
      y: Math.max(...maxs.map((value) => value.y)),
      z: Math.max(...maxs.map((value) => value.z))
    }
  };
}

function validateGltfReferences(document: Record<string, unknown>): ExperienceDeliveryValidationIssue[] {
  const issues: ExperienceDeliveryValidationIssue[] = [];
  const scenes = array(document.scenes);
  const nodes = array(document.nodes);
  const meshes = array(document.meshes);
  const materials = array(document.materials);
  const textures = array(document.textures);
  const images = array(document.images);
  const samplers = array(document.samplers);
  const accessors = array(document.accessors);
  const bufferViews = array(document.bufferViews);
  const buffers = array(document.buffers);
  const cameras = array(document.cameras);
  const skins = array(document.skins);

  const check = (value: unknown, length: number, code: string, messageAr: string, field: string) => {
    if (value === undefined || value === null) return;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value >= length) issues.push(issue(code, messageAr, 'blocking', field));
  };
  const checkMany = (values: unknown, length: number, code: string, messageAr: string, field: string) => {
    for (const value of array(values)) check(value, length, code, messageAr, field);
  };

  check(document.scene, scenes.length, 'studio-gltf-scene-reference-invalid', 'مرجع المشهد الافتراضي خارج نطاق المشاهد.', '/scene');
  scenes.forEach((scene, sceneIndex) => checkMany(asRecord(scene)?.nodes, nodes.length, 'studio-gltf-scene-node-reference-invalid', 'أحد مراجع عقد المشهد غير صالح.', `/scenes/${sceneIndex}/nodes`));
  nodes.forEach((node, nodeIndex) => {
    const record = asRecord(node);
    check(record?.mesh, meshes.length, 'studio-gltf-node-mesh-reference-invalid', 'مرجع شبكة داخل عقدة غير صالح.', `/nodes/${nodeIndex}/mesh`);
    check(record?.camera, cameras.length, 'studio-gltf-node-camera-reference-invalid', 'مرجع كاميرا داخل عقدة غير صالح.', `/nodes/${nodeIndex}/camera`);
    check(record?.skin, skins.length, 'studio-gltf-node-skin-reference-invalid', 'مرجع Skin داخل عقدة غير صالح.', `/nodes/${nodeIndex}/skin`);
    checkMany(record?.children, nodes.length, 'studio-gltf-node-child-reference-invalid', 'مرجع عقدة فرعية غير صالح.', `/nodes/${nodeIndex}/children`);
  });
  meshes.forEach((mesh, meshIndex) => array(asRecord(mesh)?.primitives).forEach((primitive, primitiveIndex) => {
    const record = asRecord(primitive);
    Object.values(asRecord(record?.attributes) ?? {}).forEach((accessor) => check(accessor, accessors.length, 'studio-gltf-attribute-reference-invalid', 'مرجع accessor لسمة هندسية غير صالح.', `/meshes/${meshIndex}/primitives/${primitiveIndex}/attributes`));
    check(record?.indices, accessors.length, 'studio-gltf-indices-reference-invalid', 'مرجع فهارس الشبكة غير صالح.', `/meshes/${meshIndex}/primitives/${primitiveIndex}/indices`);
    check(record?.material, materials.length, 'studio-gltf-material-reference-invalid', 'مرجع خامة الشبكة غير صالح.', `/meshes/${meshIndex}/primitives/${primitiveIndex}/material`);
    for (const target of array(record?.targets)) Object.values(asRecord(target) ?? {}).forEach((accessor) => check(accessor, accessors.length, 'studio-gltf-morph-reference-invalid', 'مرجع Morph Target غير صالح.', `/meshes/${meshIndex}/primitives/${primitiveIndex}/targets`));
  }));
  accessors.forEach((accessor, index) => check(asRecord(accessor)?.bufferView, bufferViews.length, 'studio-gltf-accessor-buffer-reference-invalid', 'مرجع bufferView داخل accessor غير صالح.', `/accessors/${index}/bufferView`));
  bufferViews.forEach((bufferView, index) => check(asRecord(bufferView)?.buffer, buffers.length, 'studio-gltf-buffer-view-reference-invalid', 'مرجع buffer داخل bufferView غير صالح.', `/bufferViews/${index}/buffer`));
  images.forEach((image, index) => {
    const record = asRecord(image);
    check(record?.bufferView, bufferViews.length, 'studio-gltf-image-buffer-reference-invalid', 'مرجع صورة مضمّنة غير صالح.', `/images/${index}/bufferView`);
    if (record?.uri === undefined && record?.bufferView === undefined) issues.push(issue('studio-gltf-image-source-missing', 'الصورة لا تحتوي URI أو bufferView صالحًا.', 'blocking', `/images/${index}`));
  });
  textures.forEach((texture, index) => {
    const record = asRecord(texture);
    check(record?.source, images.length, 'studio-gltf-texture-image-reference-invalid', 'مرجع صورة الخامة غير صالح.', `/textures/${index}/source`);
    check(record?.sampler, samplers.length, 'studio-gltf-texture-sampler-reference-invalid', 'مرجع sampler للخامة غير صالح.', `/textures/${index}/sampler`);
  });
  const checkTextureInfo = (value: unknown, field: string) => check(asRecord(value)?.index, textures.length, 'studio-gltf-material-texture-reference-invalid', 'مرجع texture داخل الخامة غير صالح.', field);
  materials.forEach((material, index) => {
    const record = asRecord(material);
    const pbr = asRecord(record?.pbrMetallicRoughness);
    checkTextureInfo(pbr?.baseColorTexture, `/materials/${index}/pbrMetallicRoughness/baseColorTexture`);
    checkTextureInfo(pbr?.metallicRoughnessTexture, `/materials/${index}/pbrMetallicRoughness/metallicRoughnessTexture`);
    checkTextureInfo(record?.normalTexture, `/materials/${index}/normalTexture`);
    checkTextureInfo(record?.occlusionTexture, `/materials/${index}/occlusionTexture`);
    checkTextureInfo(record?.emissiveTexture, `/materials/${index}/emissiveTexture`);
  });
  array(document.animations).forEach((animation, animationIndex) => {
    const record = asRecord(animation);
    const animationSamplers = array(record?.samplers);
    animationSamplers.forEach((animationSampler, samplerIndex) => {
      const sampler = asRecord(animationSampler);
      check(sampler?.input, accessors.length, 'studio-gltf-animation-input-reference-invalid', 'مرجع مدخل التحريك غير صالح.', `/animations/${animationIndex}/samplers/${samplerIndex}/input`);
      check(sampler?.output, accessors.length, 'studio-gltf-animation-output-reference-invalid', 'مرجع مخرج التحريك غير صالح.', `/animations/${animationIndex}/samplers/${samplerIndex}/output`);
    });
    array(record?.channels).forEach((channel, channelIndex) => {
      const channelRecord = asRecord(channel);
      check(channelRecord?.sampler, animationSamplers.length, 'studio-gltf-animation-sampler-reference-invalid', 'مرجع sampler لقناة التحريك غير صالح.', `/animations/${animationIndex}/channels/${channelIndex}/sampler`);
      check(asRecord(channelRecord?.target)?.node, nodes.length, 'studio-gltf-animation-node-reference-invalid', 'مرجع عقدة هدف التحريك غير صالح.', `/animations/${animationIndex}/channels/${channelIndex}/target/node`);
    });
  });
  skins.forEach((skin, skinIndex) => {
    const record = asRecord(skin);
    checkMany(record?.joints, nodes.length, 'studio-gltf-skin-joint-reference-invalid', 'مرجع joint غير صالح.', `/skins/${skinIndex}/joints`);
    check(record?.inverseBindMatrices, accessors.length, 'studio-gltf-skin-accessor-reference-invalid', 'مرجع inverse bind matrices غير صالح.', `/skins/${skinIndex}/inverseBindMatrices`);
    check(record?.skeleton, nodes.length, 'studio-gltf-skin-skeleton-reference-invalid', 'مرجع جذر skeleton غير صالح.', `/skins/${skinIndex}/skeleton`);
  });
  return issues;
}

function validateGltfDocumentInternal(
  document: Record<string, unknown>,
  sourceFingerprint: string,
  availableDependencies: ReadonlySet<string>,
  binaryBytes: number,
  allowedExtensions: ReadonlySet<string>
): StudioAssetValidationResult {
  const issues: ExperienceDeliveryValidationIssue[] = [];
  const asset = asRecord(document.asset);
  if (asset?.version !== '2.0') issues.push(issue('studio-gltf-version-invalid', 'ملف glTF يجب أن يعلن الإصدار 2.0.', 'blocking', '/asset/version'));
  const scenes = array(document.scenes);
  const nodes = array(document.nodes);
  const meshes = array(document.meshes);
  const textures = array(document.textures);
  const animations = array(document.animations);
  const primitiveCount = meshes.reduce<number>((total, mesh) => total + array(asRecord(mesh)?.primitives).length, 0);
  if (!scenes.length || !nodes.length || !meshes.length || primitiveCount === 0) issues.push(issue('studio-gltf-empty-scene', 'المشهد فارغ أو لا يحتوي عقدًا وشبكات قابلة للعرض.'));
  issues.push(...validateGltfReferences(document));

  const uris = stringUris(document);
  for (const uri of uris) {
    if (uri.startsWith('data:')) continue;
    const localUri = normalizedLocalResourceUri(uri);
    if (!localUri) {
      issues.push(issue('studio-gltf-external-uri', 'يحتوي النموذج مرجعًا خارجيًا أو مسارًا غير آمن.', 'blocking', '/uri', 'ضمّن المورد داخل الحزمة بمسار نسبي آمن وقدّم بصمة جديدة.'));
      continue;
    }
    if (!availableDependencies.has(localUri)) issues.push(issue('studio-gltf-missing-dependency', `التبعية ${safeDisplayFilename(localUri)} مفقودة من الحزمة المحلية.`, 'blocking', '/uri'));
  }
  const buffers = array(document.buffers);
  buffers.forEach((buffer, index) => {
    const record = asRecord(buffer);
    const byteLength = record?.byteLength;
    if (typeof byteLength !== 'number' || !Number.isSafeInteger(byteLength) || byteLength <= 0) issues.push(issue('studio-gltf-buffer-length-invalid', 'طول buffer مفقود أو غير صالح.', 'blocking', `/buffers/${index}/byteLength`));
    if (record?.uri === undefined) {
      if (binaryBytes <= 0) issues.push(issue('studio-gltf-buffer-source-missing', 'buffer غير مضمّن ولا يملك URI محليًا.', 'blocking', `/buffers/${index}`));
      else if (index > 0 || (typeof byteLength === 'number' && byteLength > binaryBytes)) issues.push(issue('studio-glb-binary-buffer-invalid', 'حجم أو ترتيب BIN buffer لا يطابق حاوية GLB.', 'blocking', `/buffers/${index}`));
    }
  });

  const extensions = array(document.extensionsUsed).filter((value): value is string => typeof value === 'string');
  for (const extension of extensions) {
    if (!allowedExtensions.has(extension)) issues.push(issue('studio-gltf-extension-unsupported', `الامتداد ${extension} غير مؤهل في عارض المراجعة الحالي.`, 'warning', '/extensionsUsed', 'اطلب تصدير GLB قياسيًا أو وثّق أداة فك الامتداد محليًا.'));
  }
  const requiredExtensions = array(document.extensionsRequired).filter((value): value is string => typeof value === 'string');
  for (const extension of requiredExtensions) {
    if (!allowedExtensions.has(extension)) issues.push(issue('studio-gltf-required-extension-unsupported', `يتطلب النموذج الامتداد ${extension} غير المؤهل في العارض الحالي.`, 'blocking', '/extensionsRequired', 'اطلب تصديرًا لا يعتمد على الامتداد أو وفّر محولًا محليًا معتمدًا.'));
  }

  const boundingBox = calculateBoundingBox(document);
  if (!boundingBox) issues.push(issue('studio-gltf-bounds-missing', 'تعذر اشتقاق حدود هندسية من POSITION accessors.', 'warning', '/accessors'));
  if (boundingBox) {
    const extents = [boundingBox.max.x - boundingBox.min.x, boundingBox.max.y - boundingBox.min.y, boundingBox.max.z - boundingBox.min.z];
    const largest = Math.max(...extents);
    if (largest > 10_000 || (largest > 0 && largest < 0.001)) issues.push(issue('studio-gltf-scale-suspicious', 'حدود النموذج تشير إلى مقياس مشتبه؛ لا يجوز افتراض الوحدات.', 'warning', '/accessors'));
  }

  const accessorBytes = array(document.bufferViews).reduce<number>((total, entry) => {
    const byteLength = asRecord(entry)?.byteLength;
    return total + (typeof byteLength === 'number' && Number.isFinite(byteLength) ? byteLength : 0);
  }, 0);
  const blocking = issues.some((candidate) => candidate.blocking);
  const optimizationRequired = binaryBytes > 50 * 1024 * 1024 || primitiveCount > 25_000 || textures.length > 120;
  if (optimizationRequired) issues.push(issue('studio-gltf-optimization-required', 'حجم أو تعقيد المشهد يتطلب نسخة ويب محسّنة قبل الربط.', 'warning', '/asset'));
  const missingDependencies = issues.some((candidate) => candidate.code === 'studio-gltf-missing-dependency');
  return {
    status: blocking
      ? missingDependencies ? 'missing-dependencies' : 'invalid'
      : optimizationRequired ? 'optimization-required'
        : issues.length ? 'runtime-compatible-with-warning' : 'runtime-compatible',
    capability: blocking ? 'structurally-validatable' : optimizationRequired ? 'requires-optimization' : 'runtime-compatible',
    valid: !blocking,
    issues,
    statistics: {
      sceneCount: scenes.length,
      nodeCount: nodes.length,
      meshCount: meshes.length,
      primitiveCount,
      textureCount: textures.length,
      animationCount: animations.length,
      approximateGeometryBytes: Math.max(binaryBytes, accessorBytes)
    },
    boundingBox,
    sourceFingerprint,
    validatorVersion: studioAssetValidatorVersion
  };
}

export function validateGltfDocument(
  value: unknown,
  options: {
    sourceFingerprint: string;
    availableDependencies?: ReadonlySet<string>;
    binaryBytes?: number;
    allowedExtensions?: ReadonlySet<string>;
  }
): StudioAssetValidationResult {
  try {
    const document = asRecord(value);
    if (!document) throw new Error('not-object');
    return validateGltfDocumentInternal(
      document,
      options.sourceFingerprint,
      options.availableDependencies ?? new Set(),
      options.binaryBytes ?? 0,
      options.allowedExtensions ?? new Set(['KHR_materials_unlit', 'KHR_texture_transform'])
    );
  } catch {
    return {
      status: 'invalid',
      capability: 'structurally-validatable',
      valid: false,
      issues: [issue('studio-gltf-json-invalid', 'بنية glTF JSON غير صالحة؛ لم يُحمّل الأصل في العارض.')],
      statistics: null,
      boundingBox: null,
      sourceFingerprint: options.sourceFingerprint,
      validatorVersion: studioAssetValidatorVersion
    };
  }
}

export function validateGlbBytes(
  bytes: Uint8Array,
  options: { sourceFingerprint: string; availableDependencies?: ReadonlySet<string>; allowedExtensions?: ReadonlySet<string> }
): StudioAssetValidationResult {
  try {
    if (bytes.byteLength < 20) throw new Error('short');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(0, true) !== 0x46546c67) throw new Error('magic');
    if (view.getUint32(4, true) !== 2) throw new Error('version');
    if (view.getUint32(8, true) !== bytes.byteLength) throw new Error('length');
    let offset = 12;
    let jsonDocument: unknown = null;
    let binaryBytes = 0;
    let chunkIndex = 0;
    let jsonChunkCount = 0;
    let binaryChunkCount = 0;
    while (offset < bytes.byteLength) {
      if (offset + 8 > bytes.byteLength) throw new Error('chunk-header');
      const length = view.getUint32(offset, true);
      const type = view.getUint32(offset + 4, true);
      const start = offset + 8;
      const end = start + length;
      if (end > bytes.byteLength || length % 4 !== 0) throw new Error('chunk-length');
      if (chunkIndex === 0 && type !== 0x4e4f534a) throw new Error('json-first');
      if (type === 0x4e4f534a) {
        jsonChunkCount += 1;
        if (jsonChunkCount > 1) throw new Error('json-duplicate');
        let text = new TextDecoder().decode(bytes.slice(start, end));
        while (text.length && [0, 32].includes(text.charCodeAt(text.length - 1))) text = text.slice(0, -1);
        jsonDocument = JSON.parse(text);
      } else if (type === 0x004e4942) {
        binaryChunkCount += 1;
        if (binaryChunkCount > 1) throw new Error('bin-duplicate');
        binaryBytes += length;
      }
      offset = end;
      chunkIndex += 1;
    }
    if (!jsonDocument || offset !== bytes.byteLength) throw new Error('json-missing');
    return validateGltfDocument(jsonDocument, {
      sourceFingerprint: options.sourceFingerprint,
      availableDependencies: options.availableDependencies,
      binaryBytes,
      allowedExtensions: options.allowedExtensions
    });
  } catch {
    return {
      status: 'invalid',
      capability: 'structurally-validatable',
      valid: false,
      issues: [issue('studio-glb-container-invalid', 'حاوية GLB تالفة أو غير مطابقة لـglTF 2.0؛ لم تُحمّل في العارض.')],
      statistics: null,
      boundingBox: null,
      sourceFingerprint: options.sourceFingerprint,
      validatorVersion: studioAssetValidatorVersion
    };
  }
}

export function validatePanorama(input: PanoramaValidationInput): PanoramaValidationResult {
  const issues: ExperienceDeliveryValidationIssue[] = [];
  const ratio = input.width / Math.max(input.height, 1);
  const ratioValid = Math.abs(ratio - 2) <= 0.01;
  const truePanorama = input.submittedAs === 'equirectangular-panorama' && ratioValid;
  if (input.submittedAs !== 'equirectangular-panorama') issues.push(issue('studio-panorama-flat-submission', 'الملف مصنف كمرجع مسطح ولا يجوز تقديمه كتجربة 360°.', 'blocking', '/submittedAs'));
  if (!ratioValid) issues.push(issue('studio-panorama-ratio-invalid', 'البانوراما الحقيقية يجب أن تكون Equirectangular بنسبة 2:1.', 'blocking', '/dimensions'));
  if (input.width < 4_096 || input.height < 2_048) issues.push(issue('studio-panorama-review-resolution-low', 'دقة الصورة أقل من حد المراجعة 4096×2048.', 'blocking', '/dimensions'));
  if (!input.cameraMetadataPresent) issues.push(issue('studio-panorama-camera-missing', 'بيانات الكاميرا غير موجودة؛ الربط المكاني محجوب.', 'warning', '/camera'));
  if (!input.destinationId) issues.push(issue('studio-panorama-destination-missing', 'المشهد غير مربوط بهوية وجهة دائمة.', 'blocking', '/destinationId'));
  if (['unknown', 'review-required', 'blocked'].includes(input.rightsStatus)) issues.push(issue('studio-panorama-rights-blocked', 'حقوق المشهد لا تسمح بعرض العميل.', 'blocking', '/rightsStatus'));
  if (input.gpsStatus === 'present') issues.push(issue('studio-panorama-gps-present', 'تحتوي اللقطة بيانات GPS؛ تُحجر حتى إنشاء مشتق منزوع الموقع.', 'blocking', '/gpsStatus'));
  if (input.gpsStatus === 'unknown') issues.push(issue('studio-panorama-gps-unknown', 'تعذر إثبات خلو الصورة من GPS؛ العرض للعميل محجوب.', 'blocking', '/gpsStatus'));
  const blocking = issues.some((candidate) => candidate.blocking);
  return {
    status: input.gpsStatus === 'present' || input.gpsStatus === 'unknown'
      ? 'privacy-quarantined'
      : ['unknown', 'review-required', 'blocked'].includes(input.rightsStatus)
        ? 'rights-blocked'
        : blocking ? 'invalid' : issues.length ? 'runtime-compatible-with-warning' : 'runtime-compatible',
    valid: !blocking,
    truePanorama,
    issues,
    reviewResolutionMet: input.width >= 4_096 && input.height >= 2_048 && ratioValid,
    preferredResolutionMet: input.width >= 8_192 && input.height >= 4_096 && ratioValid,
    gpsClientHandling: input.gpsStatus === 'present' ? 'strip-required' : input.gpsStatus === 'unknown' ? 'quarantine-required' : 'not-present',
    sourceFingerprint: input.sourceFingerprint
  };
}

export function createStudioDependencyReport(
  sourceFingerprint: string,
  inputs: ReadonlyArray<{
    name: string;
    dependencyType: StudioDependencyRecord['dependencyType'];
    exists: boolean;
    duplicate?: boolean;
    externalUri?: boolean;
    brokenPath?: boolean;
    unsupported?: boolean;
    privatePathPresent?: boolean;
  }>
): Readonly<StudioDependencyReport> {
  const dependencies: StudioDependencyRecord[] = inputs.map((input, index) => {
    const status: StudioDependencyRecord['status'] = input.externalUri ? 'external-uri'
      : input.brokenPath ? 'broken-path'
        : input.unsupported ? 'unsupported'
          : input.duplicate ? 'duplicate'
            : input.exists ? 'discovered' : 'missing';
    return {
      dependencyId: `DEPENDENCY-${sourceFingerprint.slice(0, 10)}-${String(index + 1).padStart(3, '0')}`,
      safeDisplayName: safeDisplayFilename(input.name),
      dependencyType: input.dependencyType,
      status,
      privatePathPresent: Boolean(input.privatePathPresent),
      safeOpaquePathId: input.privatePathPresent ? `LOCAL-PATH-${sourceFingerprint.slice(0, 10)}-${index + 1}` : null,
      blocking: ['missing', 'broken-path', 'external-uri', 'unsupported'].includes(status)
    };
  });
  const base = {
    reportId: `STUDIO-DEPENDENCY-REPORT-${sourceFingerprint.slice(0, 16)}`,
    sourceFingerprint,
    dependencies,
    missingCount: dependencies.filter((item) => item.status === 'missing' || item.status === 'broken-path').length,
    externalUriCount: dependencies.filter((item) => item.status === 'external-uri').length,
    blocking: dependencies.some((item) => item.blocking)
  };
  return Object.freeze({ ...base, dependencies: Object.freeze(dependencies.map((dependency) => Object.freeze(dependency))), contentHash: sha256PayloadSync(base) });
}

export function classifyUnopenedStudioAsset(format: StudioDeliveryFormat | null, filename: string): StudioAssetValidationResult {
  const capability = classifyStudioCapability(format);
  const unsupported = capability === 'unsupported';
  const native = capability === 'requires-native-software' || capability === 'requires-export';
  return {
    status: unsupported ? 'unsupported-extension' : native ? 'runtime-compatible-with-warning' : 'invalid',
    capability,
    valid: false,
    issues: [issue(
      unsupported ? 'studio-format-unsupported' : native ? 'studio-native-export-required' : 'studio-asset-not-opened',
      unsupported
        ? `صيغة ${safeDisplayFilename(filename)} غير مدعومة في مسار المراجعة.`
        : native
          ? 'تم التعرف على الصيغة للجرد فقط؛ يلزم تصدير محكوم بواسطة البرنامج الأصلي.'
          : 'لم يُفتح الأصل بعد بواسطة فاحص محلي مؤهل.',
      native ? 'warning' : 'blocking'
    )],
    statistics: null,
    boundingBox: null,
    sourceFingerprint: 'not-fingerprinted',
    validatorVersion: studioAssetValidatorVersion
  };
}

export function findGltfExternalUris(value: unknown): readonly string[] {
  try {
    return findUnexpectedExternalUris(JSON.stringify(value));
  } catch {
    return [];
  }
}
