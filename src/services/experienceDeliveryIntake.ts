import { isSha256, sha256PayloadSync } from './integrationHash';
import type {
  ExperienceDeliveryAcceptance,
  ExperienceDeliveryManifestPreview,
  ExperienceDeliveryReadinessProjection,
  ExperienceDeliveryState,
  ExperienceDeliveryValidationContext,
  ExperienceDeliveryValidationIssue,
  ExperienceDeliveryValidationResult,
  OperationalDeliveryManifest,
  Studio3DDeliveryManifest
} from '../types/experienceDelivery';
import { validateExperienceDeliverySchema } from './experienceDeliverySchema';

const issuedPreviews = new WeakMap<object, ExperienceDeliveryIntakeGateway>();

function deepFreezeDeliveryValue<T>(value: T): Readonly<T> {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value as Record<string, unknown>).forEach((nested) => deepFreezeDeliveryValue(nested));
  return Object.freeze(value);
}

function issue(
  code: string,
  path: string,
  messageAr: string,
  severity: 'blocking' | 'warning' = 'blocking',
  recommendedActionAr = 'صحح البيانات ثم أعد المعاينة؛ لم يتغير توأم التجربة.',
  safeTechnicalDetail = code
): ExperienceDeliveryValidationIssue {
  return {
    code,
    path,
    messageAr,
    severity,
    affectedFile: null,
    affectedField: path,
    blocking: severity === 'blocking',
    recommendedActionAr,
    safeTechnicalDetail
  };
}

function safeFilename(value: string | null): boolean {
  const containsControlCharacter = value ? [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  }) : false;
  return Boolean(
    value
    && value.trim()
    && !value.startsWith('.')
    && !value.includes('/')
    && !value.includes('\\')
    && !value.includes('\0')
    && !containsControlCharacter
  );
}

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

export function validateExperienceDeliveryReadinessProjection(
  projection: ExperienceDeliveryReadinessProjection
): readonly ExperienceDeliveryValidationIssue[] {
  const issues: ExperienceDeliveryValidationIssue[] = [];
  if (!projection.projectionId.trim() || !projection.projectId.trim() || !projection.eventId.trim() || !projection.venueId.trim()) issues.push(issue('experience-delivery-projection-scope-missing', '/projectId', 'هوية إسقاط التسليم أو نطاقه مفقود.'));
  const laneIds = projection.lanes.map((lane) => lane.laneId);
  if (!unique(laneIds) || !laneIds.includes('operational') || !laneIds.includes('studio-3d')) issues.push(issue('experience-delivery-lanes-invalid', '/lanes', 'إسقاط التسليم يجب أن يحتوي مساري التشغيل والاستوديو دون تكرار.'));
  projection.lanes.forEach((lane, index) => {
    if (!lane.statusMessageAr.trim() || !lane.validationMessageAr.trim()) issues.push(issue('experience-delivery-status-missing', `/lanes/${index}`, 'حالة مسار التسليم أو رسالة التحقق مفقودة.'));
    if (
      (lane.status === 'awaiting-delivery' || lane.status === 'preview-ready')
      && (lane.acceptedManifestCount !== 0 || lane.projectionBindingStatus !== 'not-started')
    ) {
      issues.push(issue('experience-delivery-pending-promoted', `/lanes/${index}`, 'مسار التسليم المعلق أو الجاهز للمعاينة لا يجوز أن يدعي قبول ملف أو بدء الربط.'));
    }
  });
  if (!projection.builtCapabilitiesAr.length || !projection.nextInputsAr.length) issues.push(issue('experience-delivery-dashboard-incomplete', '/', 'لوحة ما تم بناؤه وما التالي غير مكتملة.'));
  return issues;
}

export function materializeExperienceDeliveryReadinessProjection(
  projection: ExperienceDeliveryReadinessProjection
): Readonly<ExperienceDeliveryReadinessProjection> {
  const immutable = deepFreezeDeliveryValue(structuredClone(projection));
  const blockingIssues = validateExperienceDeliveryReadinessProjection(immutable as ExperienceDeliveryReadinessProjection).filter((candidate) => candidate.severity === 'blocking');
  if (blockingIssues.length) throw new Error(blockingIssues[0]!.messageAr);
  return immutable;
}

function scopeIssues(
  manifest: Pick<OperationalDeliveryManifest, 'projectId' | 'eventId' | 'venueId'>,
  context: ExperienceDeliveryValidationContext
): ExperienceDeliveryValidationIssue[] {
  return manifest.projectId === context.projectId && manifest.eventId === context.eventId && manifest.venueId === context.venueId
    ? []
    : [issue('experience-delivery-scope-mismatch', '/projectId', 'حزمة التسليم لا تنتمي إلى المشروع والفعالية والموقع النشط.')];
}

function sourceIdentityIssues(manifest: Pick<OperationalDeliveryManifest, 'sourceId' | 'filename' | 'hash' | 'size' | 'revision' | 'authority'>): ExperienceDeliveryValidationIssue[] {
  const issues: ExperienceDeliveryValidationIssue[] = [];
  if (!manifest.sourceId?.trim()) issues.push(issue('experience-delivery-source-missing', '/sourceId', 'معرّف مصدر التسليم مفقود.'));
  if (!safeFilename(manifest.filename)) issues.push(issue('experience-delivery-filename-invalid', '/filename', 'اسم الملف مفقود أو يحتوي مسارًا غير مسموح.'));
  if (!isSha256(manifest.hash)) issues.push(issue('experience-delivery-hash-invalid', '/hash', 'بصمة SHA-256 للمصدر مفقودة أو غير صالحة.'));
  if (!Number.isSafeInteger(manifest.size) || (manifest.size ?? 0) <= 0) issues.push(issue('experience-delivery-size-invalid', '/size', 'حجم ملف المصدر مفقود أو غير صالح.'));
  if (!Number.isSafeInteger(manifest.revision) || (manifest.revision ?? 0) < 1) issues.push(issue('experience-delivery-revision-invalid', '/revision', 'مراجعة المصدر مفقودة أو غير صالحة.'));
  if (manifest.authority === 'unknown') issues.push(issue('experience-delivery-authority-unknown', '/authority', 'سلطة المصدر غير مصنفة؛ القبول محجوب.'));
  return issues;
}

function inventoryIssues(manifest: Pick<OperationalDeliveryManifest, 'sourceId' | 'filename' | 'hash' | 'size' | 'authority' | 'sourceInventory'>): ExperienceDeliveryValidationIssue[] {
  const inventory = manifest.sourceInventory;
  if (!inventory) return [issue('experience-delivery-inventory-missing', '/sourceInventory', 'لم يُنشأ جرد محكوم للمصدر؛ القبول محجوب.', 'blocking', 'شغّل أداة الجرد المحلية قبل إنشاء المعاينة.')];
  const issues: ExperienceDeliveryValidationIssue[] = [];
  if (inventory.pathDisclosure !== 'redacted') issues.push(issue('experience-delivery-path-disclosure', '/sourceInventory/pathDisclosure', 'سجل المصدر قد يكشف مسارًا محليًا خاصًا؛ نُقل إلى الحجر.', 'blocking', 'أنشئ سجلًا منقحًا بمعرّف محلي مبهم فقط.'));
  if (inventory.fingerprintState !== 'verified') issues.push(issue('experience-delivery-fingerprint-unverified', '/sourceInventory/fingerprintState', 'لم تثبت استمرارية بصمة الملف بعد قراءته؛ القبول محجوب.', 'blocking', 'أعد الجرد من لقطة محلية ثابتة.'));
  if (inventory.sha256 !== manifest.hash || inventory.byteSize !== manifest.size) issues.push(issue('experience-delivery-inventory-fingerprint-mismatch', '/sourceInventory/sha256', 'بصمة أو حجم الجرد لا يطابق بيان التسليم.', 'blocking', 'لا تعِد حساب البيان يدويًا؛ أعد الجرد من البايتات الحالية.'));
  if (inventory.safeDisplayFilename !== manifest.filename) issues.push(issue('experience-delivery-inventory-filename-mismatch', '/sourceInventory/safeDisplayFilename', 'اسم العرض المنقح لا يطابق اسم الملف في البيان.', 'blocking', 'استخدم اسم العرض الصادر من أداة الجرد.'));
  if (inventory.verifiedAuthorityStatus !== manifest.authority) issues.push(issue('experience-delivery-inventory-authority-mismatch', '/sourceInventory/verifiedAuthorityStatus', 'تصنيف سلطة المصدر لا يطابق سجل الجرد.', 'blocking', 'اطلب مراجعة سلطة المصدر ولا تنسخ ادعاء الاعتماد من الملف.'));
  if (!inventory.localOpaqueSourceId.startsWith('LOCAL-SOURCE-') || inventory.localOpaqueSourceId.includes('/') || inventory.localOpaqueSourceId.includes('\\')) issues.push(issue('experience-delivery-opaque-id-invalid', '/sourceInventory/localOpaqueSourceId', 'معرّف المصدر المحلي غير منقح أو غير مبهم.', 'blocking', 'أعد توليد المعرّف من أداة الجرد المحلية.'));
  if (!manifest.sourceId || inventory.sourceRecordId !== manifest.sourceId) issues.push(issue('experience-delivery-inventory-source-mismatch', '/sourceInventory/sourceRecordId', 'هوية سجل الجرد لا تطابق هوية المصدر في البيان.', 'blocking', 'استخدم هوية سجل الجرد نفسها في البيان.'));
  return issues;
}

function roleWarnings(manifest: OperationalDeliveryManifest): ExperienceDeliveryValidationIssue[] {
  const issues: ExperienceDeliveryValidationIssue[] = [];
  if (!manifest.owner) issues.push(issue('experience-delivery-owner-missing', '/owner', 'مالك المتطلب التشغيلي غير محدد في المصدر.', 'warning'));
  if (!manifest.responsibleParty) issues.push(issue('experience-delivery-responsible-missing', '/responsibleParty', 'الطرف المسؤول غير محدد في المصدر.', 'warning'));
  if (!manifest.verificationAuthority) issues.push(issue('experience-delivery-verifier-missing', '/verificationAuthority', 'جهة التحقق غير محددة في المصدر.', 'warning'));
  if (!manifest.approvalAuthority) issues.push(issue('experience-delivery-approval-missing', '/approvalAuthority', 'جهة الاعتماد غير محددة في المصدر.', 'warning'));
  if (!manifest.evidenceRule.length) issues.push(issue('experience-delivery-evidence-rule-missing', '/evidenceRule', 'قواعد الأدلة لم تُسلّم بعد.', 'warning'));
  return issues;
}

export function validateOperationalDeliveryManifest(
  manifest: OperationalDeliveryManifest,
  context: ExperienceDeliveryValidationContext
): readonly ExperienceDeliveryValidationIssue[] {
  const schemaIssues = validateExperienceDeliverySchema('operational-delivery-manifest', manifest, manifest.filename).issues;
  const issues = [...schemaIssues, ...scopeIssues(manifest, context), ...sourceIdentityIssues(manifest), ...inventoryIssues(manifest), ...roleWarnings(manifest)];
  if (manifest.day && !context.knownDayIds.has(manifest.day)) issues.push(issue('experience-delivery-day-unknown', '/day', 'اليوم المحدد غير موجود في حزمة التجربة النشطة.'));
  if (!unique(manifest.persona) || manifest.persona.some((personaId) => !context.knownPersonaIds.has(personaId))) issues.push(issue('experience-delivery-persona-unknown', '/persona', 'التسليم يتضمن شخصية مكررة أو غير معروفة.'));
  if (!unique(manifest.destinationIds) || manifest.destinationIds.some((destinationId) => !context.knownDestinationIds.has(destinationId))) issues.push(issue('experience-delivery-destination-unknown', '/destinationIds', 'التسليم يتضمن وجهة مكررة أو لا تنتمي إلى المشروع.'));

  const scheduleIds = manifest.schedule.map((entry) => entry.scheduleEntryId);
  if (!unique(scheduleIds)) issues.push(issue('experience-delivery-schedule-duplicate', '/schedule', 'جدول التسليم يحتوي معرّفًا مكررًا.'));
  manifest.schedule.forEach((entry, index) => {
    if (!context.knownDayIds.has(entry.dayId)) issues.push(issue('experience-delivery-schedule-day-unknown', `/schedule/${index}/dayId`, 'بند الجدول يشير إلى يوم غير معروف.'));
    if (entry.personaIds.some((personaId) => !context.knownPersonaIds.has(personaId))) issues.push(issue('experience-delivery-schedule-persona-unknown', `/schedule/${index}/personaIds`, 'بند الجدول يشير إلى شخصية غير معروفة.'));
  });

  const routeIds = manifest.routeCandidate.map((route) => route.routeCandidateId);
  if (!unique(routeIds)) issues.push(issue('experience-delivery-route-duplicate', '/routeCandidate', 'التسليم يحتوي معرّف مسار مرشح مكررًا.'));
  manifest.routeCandidate.forEach((route, index) => {
    if (!['candidate', 'conflicting', 'unresolved'].includes(route.status)) issues.push(issue('experience-delivery-route-promoted', `/routeCandidate/${index}/status`, 'لا يجوز للتسليم ترقية مسار مرشح إلى مسار معتمد.'));
    if (!context.knownDayIds.has(route.dayId)) issues.push(issue('experience-delivery-route-day-unknown', `/routeCandidate/${index}/dayId`, 'المسار المرشح يشير إلى يوم غير معروف.'));
    if (route.personaIds.some((personaId) => !context.knownPersonaIds.has(personaId)) || route.destinationIds.some((destinationId) => !context.knownDestinationIds.has(destinationId))) issues.push(issue('experience-delivery-route-reference-unknown', `/routeCandidate/${index}`, 'المسار المرشح يشير إلى شخصية أو وجهة غير معروفة.'));
  });

  if (manifest.approvalStatus === 'approved-for-candidate-binding' && !manifest.approvalAuthority) issues.push(issue('experience-delivery-approval-unsupported', '/approvalStatus', 'لا يمكن قبول ادعاء الاعتماد دون جهة اعتماد مسندة إلى المصدر.'));
  if (manifest.conflict.some((conflict) => conflict.status === 'resolved-by-authority' && !manifest.approvalAuthority)) issues.push(issue('experience-delivery-conflict-resolution-unsupported', '/conflict', 'لا يمكن إغلاق تعارض دون جهة مخولة مسندة إلى المصدر.'));
  return issues.map((candidate) => candidate.affectedFile ? candidate : { ...candidate, affectedFile: manifest.filename });
}

function isPanoramaFormat(format: Studio3DDeliveryManifest['format']): boolean {
  return [
    'jpeg-equirectangular',
    'tiff-equirectangular',
    'png-equirectangular',
    'webp-equirectangular'
  ].includes(format ?? '');
}

function isModelFormat(format: Studio3DDeliveryManifest['format']): boolean {
  return [
    'glb', 'gltf', 'fbx', 'obj', 'max', 'skp', 'rvt', 'blend', '3dm', 'c4d',
    'dwg', 'dxf', 'ifc', 'usd', 'usdz', 'stl', '3mf'
  ].includes(format ?? '');
}

export function validateStudio3DDeliveryManifest(
  manifest: Studio3DDeliveryManifest,
  context: ExperienceDeliveryValidationContext
): readonly ExperienceDeliveryValidationIssue[] {
  const schemaIssues = validateExperienceDeliverySchema('studio-3d-delivery-manifest', manifest, manifest.filename).issues;
  const issues: ExperienceDeliveryValidationIssue[] = [...schemaIssues, ...scopeIssues(manifest, context)];
  issues.push(...sourceIdentityIssues({ ...manifest, revision: manifest.version ? 1 : null }));
  issues.push(...inventoryIssues(manifest));
  if (!manifest.version?.trim()) issues.push(issue('experience-studio-version-missing', '/version', 'إصدار أصل الاستوديو مفقود.'));
  if (!manifest.format) issues.push(issue('experience-studio-format-missing', '/format', 'صيغة أصل الاستوديو غير محددة.'));
  if (manifest.destinationId && !context.knownDestinationIds.has(manifest.destinationId)) issues.push(issue('experience-studio-destination-unknown', '/destinationId', 'المشهد يشير إلى وجهة لا تنتمي إلى المشروع.'));
  if (manifest.dayVariant.some((dayId) => !context.knownDayIds.has(dayId))) issues.push(issue('experience-studio-day-unknown', '/dayVariant', 'متغير اليوم لا ينتمي إلى حزمة التجربة.'));
  if (manifest.personaVariant.some((personaId) => !context.knownPersonaIds.has(personaId))) issues.push(issue('experience-studio-persona-unknown', '/personaVariant', 'متغير الشخصية لا ينتمي إلى حزمة التجربة.'));
  if (!unique(manifest.dayVariant) || !unique(manifest.personaVariant)) issues.push(issue('experience-studio-variant-duplicate', '/dayVariant', 'متغيرات اليوم أو الشخصية تحتوي تكرارًا.'));

  if (isPanoramaFormat(manifest.format)) {
    const width = manifest.dimensions?.width ?? 0;
    const height = manifest.dimensions?.height ?? 0;
    if (width < 4_096 || height < 2_048 || Math.abs(width / Math.max(height, 1) - 2) > 0.01) issues.push(issue('experience-studio-panorama-invalid', '/dimensions', 'البانوراما يجب أن تكون Equirectangular بنسبة 2:1 وبحجم مراجعة لا يقل عن 4096×2048.'));
    if (!manifest.cameraId || manifest.cameraHeight === null || manifest.cameraHeading === null) issues.push(issue('experience-studio-panorama-camera-missing', '/cameraId', 'هوية الكاميرا وارتفاعها واتجاهها مطلوبة لربط مشهد 360.'));
  }

  if (isModelFormat(manifest.format)) {
    if (!manifest.units || manifest.units === 'unknown' || manifest.scale === null || !manifest.origin) issues.push(issue('experience-studio-model-frame-missing', '/units', 'وحدات النموذج ومقياسه ونقطة أصله مطلوبة قبل الربط المكاني.'));
    if ((manifest.size ?? 0) > 50 * 1024 * 1024 && manifest.optimizationStatus !== 'required' && manifest.optimizationStatus !== 'in-progress') issues.push(issue('experience-studio-model-size-warning', '/size', 'حجم المشهد يتجاوز 50 MB ويجب وسمه بأنه يحتاج تحسينًا.', 'warning'));
  }

  if (manifest.format === 'png-flat-render' || manifest.format === 'jpeg-flat-render') {
    if (manifest.cameraHeading !== null || manifest.northDirection !== null) issues.push(issue('experience-studio-flat-spatial-claim', '/cameraHeading', 'المرجع المسطح لا يجوز أن يدّعي اتجاه بانوراما أو تسجيلًا مكانيًا.'));
  }

  if (manifest.missingDependencies.length) issues.push(issue('experience-studio-dependency-missing', '/missingDependencies', 'حزمة الاستوديو تحتوي تبعيات مفقودة ويجب حجرها قبل القبول.', 'blocking'));
  if (manifest.rightsStatus === 'unknown' || manifest.rightsStatus === 'review-required' || manifest.rightsStatus === 'blocked') issues.push(issue('experience-studio-rights-blocked', '/rightsStatus', 'حقوق استخدام الأصل غير مكتملة؛ الربط والعرض محجوبان.', 'warning'));
  if (manifest.approvalStatus === 'unknown' || manifest.approvalStatus === 'rejected') issues.push(issue('experience-studio-approval-blocked', '/approvalStatus', 'حالة اعتماد أصل الاستوديو لا تسمح بقبوله.', 'blocking'));
  return issues.map((candidate) => candidate.affectedFile ? candidate : { ...candidate, affectedFile: manifest.filename });
}

function validationStatus(issues: readonly ExperienceDeliveryValidationIssue[], hasSource: boolean, studio = false): ExperienceDeliveryState {
  if (!hasSource) return 'missing';
  if (issues.some((candidate) => candidate.code.includes('quarantine') || candidate.code.includes('path-disclosure'))) return 'quarantined';
  if (issues.some((candidate) => candidate.blocking)) return issues.some((candidate) => candidate.code.includes('missing') || candidate.code.includes('unknown')) ? 'incomplete' : 'invalid';
  if (studio && issues.some((candidate) => candidate.code.includes('optimization'))) return 'optimization-required';
  if (issues.some((candidate) => candidate.code.includes('authority') || candidate.code.includes('rights'))) return 'awaiting-authority';
  return 'awaiting-founder-review';
}

function validationResult(
  issues: readonly ExperienceDeliveryValidationIssue[],
  filename: string | null,
  sourceFingerprint: string | null,
  hasSource: boolean,
  studio = false
): ExperienceDeliveryValidationResult {
  const errors = issues.filter((candidate) => candidate.blocking);
  const warnings = issues.filter((candidate) => !candidate.blocking);
  const status = validationStatus(issues, hasSource, studio);
  const blocking = errors.length > 0;
  return deepFreezeDeliveryValue({
    status,
    valid: !blocking,
    errors,
    warnings,
    operatorMessageAr: blocking
      ? errors[0]?.messageAr ?? 'التحقق محجوب بأمان.'
      : warnings.length
        ? 'اكتملت البنية، وتبقى مراجعة التحذيرات والسلطة قبل القبول المرشح.'
        : 'اكتملت المعاينة البنيوية؛ يلزم قرار أحمد قبل أي قبول مرشح.',
    affectedFile: filename,
    blocking,
    recommendedActionAr: blocking
      ? errors[0]?.recommendedActionAr ?? 'صحح المصدر ثم أعد المعاينة.'
      : 'راجع الفرق والسلطة والحقوق ثم سجّل قرار المؤسس صراحة.',
    safeTechnicalDetail: `${errors.length} blocking / ${warnings.length} warning`,
    sourceFingerprint,
    validatorVersion: 'EXPERIENCE-DELIVERY-VALIDATOR-v1'
  });
}

export function validateOperationalDeliveryManifestSafe(value: unknown, context: ExperienceDeliveryValidationContext): ExperienceDeliveryValidationResult {
  try {
    const schema = validateExperienceDeliverySchema('operational-delivery-manifest', value);
    if (!schema.valid) return validationResult(schema.issues, null, null, false);
    const manifest = value as OperationalDeliveryManifest;
    return validationResult(validateOperationalDeliveryManifest(manifest, context), manifest.filename, manifest.hash, Boolean(manifest.sourceId));
  } catch {
    return validationResult([issue('experience-delivery-validation-failed-safe', '/', 'تعذر التحقق من الحزمة بأمان؛ لم يحدث قبول أو ربط.')], null, null, false);
  }
}

export function validateStudio3DDeliveryManifestSafe(value: unknown, context: ExperienceDeliveryValidationContext): ExperienceDeliveryValidationResult {
  try {
    const schema = validateExperienceDeliverySchema('studio-3d-delivery-manifest', value);
    if (!schema.valid) return validationResult(schema.issues, null, null, false, true);
    const manifest = value as Studio3DDeliveryManifest;
    return validationResult(validateStudio3DDeliveryManifest(manifest, context), manifest.filename, manifest.hash, Boolean(manifest.sourceId), true);
  } catch {
    return validationResult([issue('experience-studio-validation-failed-safe', '/', 'تعذر التحقق من أصل الاستوديو بأمان؛ لم يحدث قبول أو ربط.')], null, null, false, true);
  }
}

function preview<T>(kind: 'operational' | 'studio-3d', manifest: T, validation: ExperienceDeliveryValidationResult): ExperienceDeliveryManifestPreview<T> {
  const immutableManifest = deepFreezeDeliveryValue(structuredClone(manifest));
  const manifestFingerprint = sha256PayloadSync(immutableManifest);
  const blocking = validation.blocking;
  const issues = [...validation.errors, ...validation.warnings];
  return deepFreezeDeliveryValue({
    previewId: `DELIVERY-PREVIEW-${manifestFingerprint.slice(0, 16)}`,
    kind,
    manifest: immutableManifest,
    manifestFingerprint,
    issues: structuredClone(issues),
    valid: !blocking,
    canAcceptMetadata: !blocking,
    canBindProjection: !blocking && issues.length === 0,
    validation
  });
}

export class ExperienceDeliveryIntakeGateway {
  readonly #context: ExperienceDeliveryValidationContext;
  readonly #acceptedOperational = new Map<string, Readonly<OperationalDeliveryManifest>>();
  readonly #acceptedStudio = new Map<string, Readonly<Studio3DDeliveryManifest>>();

  constructor(context: ExperienceDeliveryValidationContext) {
    this.#context = context;
  }

  previewOperational(manifest: OperationalDeliveryManifest): ExperienceDeliveryManifestPreview<OperationalDeliveryManifest> {
    const result = preview('operational', manifest, validateOperationalDeliveryManifestSafe(manifest, this.#context));
    issuedPreviews.set(result, this);
    return result;
  }

  previewStudio3D(manifest: Studio3DDeliveryManifest): ExperienceDeliveryManifestPreview<Studio3DDeliveryManifest> {
    const result = preview('studio-3d', manifest, validateStudio3DDeliveryManifestSafe(manifest, this.#context));
    issuedPreviews.set(result, this);
    return result;
  }

  acceptOperational(previewResult: ExperienceDeliveryManifestPreview<OperationalDeliveryManifest>): ExperienceDeliveryAcceptance<OperationalDeliveryManifest> {
    if (issuedPreviews.get(previewResult) !== this || previewResult.kind !== 'operational' || !previewResult.canAcceptMetadata) return { accepted: false, value: null, manifestFingerprint: null, messageAr: 'لم تُقبل الحزمة: المعاينة غير صالحة أو لم تصدر من بوابة الاستلام النشطة.' };
    this.#acceptedOperational.set(previewResult.manifestFingerprint, previewResult.manifest);
    return { accepted: true, value: previewResult.manifest, manifestFingerprint: previewResult.manifestFingerprint, messageAr: 'قُبلت بيانات المصدر الوصفية فقط؛ لم يتغير إسقاط توأم التجربة.' };
  }

  acceptStudio3D(previewResult: ExperienceDeliveryManifestPreview<Studio3DDeliveryManifest>): ExperienceDeliveryAcceptance<Studio3DDeliveryManifest> {
    if (issuedPreviews.get(previewResult) !== this || previewResult.kind !== 'studio-3d' || !previewResult.canAcceptMetadata) return { accepted: false, value: null, manifestFingerprint: null, messageAr: 'لم تُقبل الحزمة: المعاينة غير صالحة أو لم تصدر من بوابة الاستلام النشطة.' };
    this.#acceptedStudio.set(previewResult.manifestFingerprint, previewResult.manifest);
    return { accepted: true, value: previewResult.manifest, manifestFingerprint: previewResult.manifestFingerprint, messageAr: 'قُبلت بيانات أصل الاستوديو الوصفية فقط؛ لم يحدث ربط أو عرض تلقائي.' };
  }

  acceptedCounts(): Readonly<{ operational: number; studio3D: number }> {
    return Object.freeze({ operational: this.#acceptedOperational.size, studio3D: this.#acceptedStudio.size });
  }
}
