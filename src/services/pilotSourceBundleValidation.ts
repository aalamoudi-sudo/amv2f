import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import eventPackageSchema from '../../schemas/event-package/v1/event-package.schema.json';
import captureEnvelopeSchema from '../../schemas/integration/v1/capture-envelope.schema.json';
import pilotSourceBundleSchema from '../../schemas/pilot/v1/pilot-source-bundle.schema.json';
import type { PilotSourceBundle, PilotSourceBundleValidationResult, PilotValidationCategory, PilotValidationIssue } from '../types/pilotAuthoring';
import { validatePilotIdGovernance } from './pilotIdGovernance';

const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: false });
ajv.addSchema(eventPackageSchema);
ajv.addSchema(captureEnvelopeSchema);
const schemaValidator: ValidateFunction = ajv.compile(pilotSourceBundleSchema);

function issue(code: string, path: string, messageAr: string, category: PilotValidationCategory, severity: PilotValidationIssue['severity'] = 'blocking'): PilotValidationIssue {
  return { code, path, messageAr, category, severity };
}

function schemaIssue(error: ErrorObject): PilotValidationIssue {
  const path = error.instancePath || '$';
  const field = error.params && 'missingProperty' in error.params ? `.${String(error.params.missingProperty)}` : '';
  const fullPath = `${path}${field}`;
  if (/readinessRecords.*owner/.test(fullPath)) return issue('pilot-readiness-owner-missing', fullPath, `سجل الجاهزية عند ${fullPath} يفتقد مالك الحالة.`, 'readiness');
  if (/readinessRecords.*source/.test(fullPath)) return issue('pilot-readiness-source-missing', fullPath, `سجل الجاهزية عند ${fullPath} يفتقد المصدر.`, 'readiness');
  if (/readinessRecords.*updatedAt/.test(fullPath)) return issue('pilot-readiness-updated-at-missing', fullPath, `سجل الجاهزية عند ${fullPath} يفتقد وقت تحديث صالحاً.`, 'readiness');
  if (/entities.*(?:position|rotation|scale)/.test(fullPath)) return issue('pilot-invalid-entity-geometry', fullPath, `هندسة العنصر عند ${fullPath} غير صالحة.`, 'spatial');
  if (/routes.*points/.test(fullPath)) return issue('pilot-invalid-route-geometry', fullPath, `هندسة المسار عند ${fullPath} غير صالحة.`, 'route');
  if (/integrationCandidates/.test(fullPath)) return issue('pilot-integration-metadata-missing', fullPath, `بيان مرشح التكامل غير مكتمل عند ${fullPath}.`, 'integration');
  return issue('pilot-schema-invalid', fullPath, `بنية حزمة المصدر غير صالحة عند ${fullPath}؛ يجب استكمال الحقل قبل الترجمة.`, 'schema');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  values.forEach((value) => seen.has(value) ? repeated.add(value) : seen.add(value));
  return [...repeated];
}

const secretKeyPattern = /(?:password|accessToken|refreshToken|privateKey|apiKey|clientSecret|credentialValue)/i;
const secretValuePatterns = [
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/i,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i,
  /\bsk-[A-Za-z0-9_-]{12,}/i,
  /(?:token|password|secret)\s*[=:]\s*[^\s]{8,}/i
];

function detectSecrets(value: unknown, path = '$', issues: PilotValidationIssue[] = []): PilotValidationIssue[] {
  if (Array.isArray(value)) {
    value.forEach((item, index) => detectSecrets(item, `${path}[${index}]`, issues));
    return issues;
  }
  if (isRecord(value)) {
    Object.entries(value).forEach(([key, candidate]) => {
      const candidatePath = `${path}.${key}`;
      if (secretKeyPattern.test(key)) issues.push(issue('pilot-secret-field-rejected', candidatePath, 'تحتوي المدخلات حقلاً سرياً محظوراً؛ يجب إبقاء بيانات الاعتماد خارج الحزمة والسجل.', 'security'));
      detectSecrets(candidate, candidatePath, issues);
    });
    return issues;
  }
  if (typeof value === 'string' && secretValuePatterns.some((pattern) => pattern.test(value))) {
    issues.push(issue('pilot-secret-value-rejected', path, 'اكتُشفت قيمة تشبه بيانات اعتماد أو مفتاحاً سرياً؛ لم تُقبل في حزمة التأليف.', 'security'));
  }
  return issues;
}

function nonEmpty(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function finiteVector(value: [number, number, number]): boolean {
  return value.length === 3 && value.every(Number.isFinite);
}

function semanticIssues(bundle: PilotSourceBundle): PilotValidationIssue[] {
  const issues: PilotValidationIssue[] = [];
  const startsAt = Date.parse(bundle.startAt);
  const endsAt = Date.parse(bundle.endAt);
  const preparedAt = Date.parse(bundle.preparedAt);
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || startsAt >= endsAt) issues.push(issue('pilot-invalid-event-dates', '$.endAt', 'يجب أن تكون تواريخ الفعالية صالحة وأن تأتي النهاية بعد البداية.', 'governance'));
  if (!Number.isFinite(preparedAt)) issues.push(issue('pilot-invalid-prepared-at', '$.preparedAt', 'وقت إعداد حزمة المصدر غير صالح.', 'governance'));
  if (bundle.approvalStatus !== 'approved') issues.push(issue('pilot-bundle-unapproved', '$.approvalStatus', 'حزمة المصدر غير معتمدة محلياً للتجميد؛ تبقى مسودة تأليف فقط.', 'governance'));
  if (bundle.approvalStatus === 'approved' && (!nonEmpty(bundle.approvedBy) || !bundle.approvedAt || !Number.isFinite(Date.parse(bundle.approvedAt)))) issues.push(issue('pilot-approval-incomplete', '$.approvedBy', 'الحزمة المصنفة معتمدة تحتاج إلى مراجع ووقت اعتماد صالحين.', 'governance'));
  if (bundle.sourceType === 'real-pilot-input' && (bundle.evidenceRegister.some((record) => record.exampleOnly) || bundle.sourceRegister.some((record) => record.exampleOnly))) issues.push(issue('pilot-real-bundle-contains-example', '$.sourceType', 'حزمة الطيار الحقيقية لا يجوز أن تحتوي صفوف الأمثلة الخيالية.', 'governance'));

  bundle.entities.forEach((entity, index) => {
    if (!finiteVector(entity.position) || !finiteVector(entity.rotation) || !finiteVector(entity.scale) || entity.scale.some((value) => value <= 0)) issues.push(issue('pilot-invalid-entity-geometry', `$.entities[${index}]`, `هندسة العنصر ${entity.id} مفقودة أو غير صالحة.`, 'spatial'));
  });
  bundle.routes.forEach((route, index) => {
    if (route.points.length < 2 || route.points.some((point) => !finiteVector(point))) issues.push(issue('pilot-invalid-route-geometry', `$.routes[${index}].points`, `هندسة المسار ${route.id} تحتاج إلى نقطتين صالحتين على الأقل.`, 'route'));
    if (!nonEmpty(route.geometrySource)) issues.push(issue('pilot-route-source-missing', `$.routes[${index}].geometrySource`, `المسار ${route.id} لا يملك مصدر هندسة موثقاً.`, 'route'));
    if (!nonEmpty(route.authority)) issues.push(issue('pilot-route-authority-missing', `$.routes[${index}].authority`, `المسار ${route.id} لا يملك جهة مسؤولة معلنة.`, 'route'));
    if (route.approvalStatus === 'approved' && (!nonEmpty(route.approvedBy) || !route.approvedAt)) issues.push(issue('pilot-route-approval-incomplete', `$.routes[${index}].approvalStatus`, `المسار ${route.id} مصنف معتمداً بلا مراجع أو وقت اعتماد.`, 'route'));
  });
  bundle.readinessRecords.forEach((record, index) => {
    if (!nonEmpty(record.owner)) issues.push(issue('pilot-readiness-owner-missing', `$.readinessRecords[${index}].owner`, `سجل جاهزية ${record.zoneId} يفتقد مالك الحالة.`, 'readiness'));
    if (!nonEmpty(record.responsibleParty)) issues.push(issue('pilot-readiness-responsible-missing', `$.readinessRecords[${index}].responsibleParty`, `سجل جاهزية ${record.zoneId} يفتقد مسؤول التنفيذ.`, 'readiness'));
    if (!nonEmpty(record.source)) issues.push(issue('pilot-readiness-source-missing', `$.readinessRecords[${index}].source`, `نسبة جاهزية ${record.zoneId} لا تملك مصدراً.`, 'readiness'));
    if (!Number.isFinite(Date.parse(record.updatedAt))) issues.push(issue('pilot-readiness-updated-at-missing', `$.readinessRecords[${index}].updatedAt`, `نسبة جاهزية ${record.zoneId} لا تملك وقت تحديث صالحاً.`, 'readiness'));
    if (!nonEmpty(record.requiredAction) || !Number.isFinite(Date.parse(record.dueAt))) issues.push(issue('pilot-readiness-action-incomplete', `$.readinessRecords[${index}].requiredAction`, `سجل جاهزية ${record.zoneId} يحتاج إجراءً وموعداً صالحين.`, 'readiness'));
  });
  bundle.decisionRecords.forEach((record, index) => {
    if (record.eventId !== bundle.eventId || record.venueId !== bundle.venueId) issues.push(issue('pilot-decision-scope-mismatch', `$.decisionRecords[${index}]`, `القرار ${record.decisionId} لا يطابق نطاق الفعالية والموقع.`, 'decision'));
    if (![record.problemStatement, record.decisionOwner, record.responsibleParty, record.approvingAuthority, record.source, record.changeReason].every(nonEmpty)) issues.push(issue('pilot-decision-contract-incomplete', `$.decisionRecords[${index}]`, `القرار ${record.decisionId} يفتقد المشكلة أو الملكية أو السلطة أو المصدر أو سبب التغيير.`, 'decision'));
    if (!record.availableOptions.length) issues.push(issue('pilot-decision-options-missing', `$.decisionRecords[${index}].availableOptions`, `القرار ${record.decisionId} يحتاج إلى خيار واحد على الأقل.`, 'decision'));
    if (record.decisionOwner === record.approvingAuthority || record.responsibleParty === record.approvingAuthority) issues.push(issue('pilot-decision-self-approval-conflict', `$.decisionRecords[${index}].approvingAuthority`, `القرار ${record.decisionId} لا يجوز أن تستخدم فيه جهة الاعتماد اسم المالك أو المنفذ نفسه.`, 'authority'));
  });

  const knownEntityIds = new Set(bundle.entities.map((entity) => entity.id));
  const coverageByEntity = new Map(bundle.entityOperationalCoverage.map((record) => [record.entityId, record]));
  bundle.entities.forEach((entity, index) => {
    if (!coverageByEntity.has(entity.id)) issues.push(issue('pilot-entity-coverage-missing', `$.entities[${index}].id`, `العنصر ${entity.id} يفتقد تصنيف تغطية الجاهزية والقرار.`, 'governance'));
  });
  bundle.entityOperationalCoverage.forEach((coverage, index) => {
    if (!knownEntityIds.has(coverage.entityId)) issues.push(issue('pilot-coverage-unknown-entity', `$.entityOperationalCoverage[${index}].entityId`, `تصنيف التغطية يشير إلى العنصر غير المعروف ${coverage.entityId}.`, 'relationship'));
    if (coverage.readinessCoverage === 'provided' && !bundle.readinessRecords.some((record) => record.zoneId === coverage.entityId)) issues.push(issue('pilot-readiness-coverage-mismatch', `$.entityOperationalCoverage[${index}].readinessCoverage`, `العنصر ${coverage.entityId} مصنف بوجود جاهزية من دون سجل مطابق.`, 'readiness'));
    if (coverage.decisionCoverage === 'provided' && !bundle.decisionRecords.some((record) => record.relationships.some((relation) => relation.entityId === coverage.entityId))) issues.push(issue('pilot-decision-coverage-mismatch', `$.entityOperationalCoverage[${index}].decisionCoverage`, `العنصر ${coverage.entityId} مصنف بوجود قرار من دون علاقة قرار مطابقة.`, 'decision'));
    if (coverage.readinessCoverage === 'unknown' || coverage.decisionCoverage === 'unknown') issues.push(issue('pilot-entity-coverage-unknown', `$.entityOperationalCoverage[${index}]`, `تغطية العنصر ${coverage.entityId} ما زالت مجهولة وتحتاج مراجعة قبل الطيار الحقيقي.`, 'governance', 'warning'));
  });

  const roleIds = new Set(bundle.roles.map((record) => record.roleId));
  bundle.authorities.forEach((authority, authorityIndex) => {
    authority.requiredRoleIds.forEach((roleId) => {
      if (!roleIds.has(roleId)) issues.push(issue('pilot-authority-role-missing', `$.authorities[${authorityIndex}].requiredRoleIds`, `جهة الصلاحية ${authority.authorityId} تشير إلى دور غير معروف.`, 'authority'));
    });
    authority.separationOfDutyRules.forEach((rule, ruleIndex) => {
      if (!roleIds.has(rule.actorRoleId) || !roleIds.has(rule.prohibitedCounterpartyRoleId) || rule.actorRoleId === rule.prohibitedCounterpartyRoleId) issues.push(issue('pilot-separation-of-duty-invalid', `$.authorities[${authorityIndex}].separationOfDutyRules[${ruleIndex}]`, `قاعدة فصل الواجبات ${rule.ruleId} غير صالحة أو تسمح للدور باعتماد نفسه.`, 'authority'));
    });
  });
  const requiredPaths = new Set(bundle.integrationCandidates.map((record) => record.path));
  const pathLabels = { input: 'الإدخال', spatial: 'المكاني', physical: 'المخرج المادي' } as const;
  (['input', 'spatial', 'physical'] as const).forEach((path) => {
    if (!requiredPaths.has(path)) issues.push(issue('pilot-integration-path-missing', '$.integrationCandidates', `مسار التكامل ${pathLabels[path]} غير موثق في بيان المرشحين.`, 'integration'));
  });
  bundle.integrationCandidates.forEach((record, index) => {
    if (![record.owner, record.stableIdMapping, record.errorBehavior, record.offlineBehavior, record.retryBehavior, record.evidencePolicy, record.dataResidency, record.retention, record.exitExportMethod].every(nonEmpty)) issues.push(issue('pilot-integration-metadata-missing', `$.integrationCandidates[${index}]`, `مرشح التكامل ${record.candidateId} يفتقد بيانات الحوكمة أو الفشل أو الخروج.`, 'integration'));
  });
  duplicates(bundle.sourceRegister.map((record) => record.sourceId)).forEach((sourceId) => issues.push(issue('pilot-duplicate-source-id', '$.sourceRegister', `معرّف المصدر ${sourceId} مكرر.`, 'governance')));
  duplicates(bundle.evidenceRegister.map((record) => record.evidenceId)).forEach((evidenceId) => issues.push(issue('pilot-duplicate-evidence-id', '$.evidenceRegister', `معرّف الدليل ${evidenceId} مكرر.`, 'governance')));
  bundle.sourceRegister.forEach((record, index) => {
    if (!nonEmpty(record.sourceOwner)) issues.push(issue('pilot-source-owner-missing', `$.sourceRegister[${index}].sourceOwner`, `المصدر ${record.sourceId} يفتقد مالكاً معلناً.`, 'governance'));
  });
  bundle.evidenceRegister.forEach((record, index) => {
    if (!nonEmpty(record.owner)) issues.push(issue('pilot-evidence-owner-missing', `$.evidenceRegister[${index}].owner`, `الدليل ${record.evidenceId} يفتقد مالكاً معلناً.`, 'governance'));
  });
  issues.push(...validatePilotIdGovernance(bundle).issues);
  return issues;
}

export function validatePilotSourceBundle(value: unknown): PilotSourceBundleValidationResult {
  try {
    const schemaValid = schemaValidator(value) === true;
    const schemaIssues = schemaValid ? [] : (schemaValidator.errors ?? []).map(schemaIssue);
    const securityIssues = detectSecrets(value);
    if (!schemaValid || !isRecord(value)) {
      let safeSemanticIssues: PilotValidationIssue[] = [];
      if (isRecord(value)) {
        try {
          safeSemanticIssues = semanticIssues(structuredClone(value) as unknown as PilotSourceBundle);
        } catch {
          safeSemanticIssues = [];
        }
      }
      return { valid: false, schemaValid, bundle: null, issues: [...schemaIssues, ...securityIssues, ...safeSemanticIssues] };
    }
    const bundle = structuredClone(value) as unknown as PilotSourceBundle;
    const issues = [...securityIssues, ...semanticIssues(bundle)];
    return { valid: issues.every((current) => current.severity !== 'blocking'), schemaValid: true, bundle, issues };
  } catch {
    return {
      valid: false,
      schemaValid: false,
      bundle: null,
      issues: [issue('pilot-validation-never-throw-boundary', '$', 'تعذر فحص حزمة المصدر بأمان؛ بقيت خارج مسار التأليف والتفعيل.', 'schema')]
    };
  }
}
