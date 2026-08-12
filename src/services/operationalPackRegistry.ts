import type {
  EventPackageValidationIssue,
  OperationalPackDefinition,
  OperationalPackResolution,
  OperationalPackRuntimeConfiguration
} from '../types/eventPackage';
import type { EntityType } from '../types/spatial';

export const platformCapabilityIds = [
  'spatial-rendering-2d',
  'spatial-rendering-3d',
  'route-visualization',
  'readiness-validation',
  'decision-integrity',
  'local-capture-validation',
  'iot-observation-validation',
  'scripted-exercise',
  'projection-preview',
  'physical-output-preview'
] as const;

export const operationalPackRegistry: OperationalPackDefinition[] = [
  {
    packId: 'spatial-foundation',
    packVersion: '1.0.0',
    titleAr: 'الأساس المكاني',
    titleEn: 'Spatial Foundation',
    descriptionAr: 'يعرض العناصر والمسارات في قائمتي 2D و3D من تهيئة موحدة.',
    capabilityIds: ['spatial-rendering-2d', 'spatial-rendering-3d', 'route-visualization'],
    requiredPackIds: [],
    optionalPackIds: ['spatial-output'],
    incompatiblePackIds: [],
    requiredEntityTypes: ['site'],
    requiredRoleIds: ['role-operator'],
    requiredAuthorityIds: [],
    requiredIntegrationProfileIds: [],
    requiredOutputProfileIds: [],
    configurationSchemaVersion: '1.0.0',
    status: 'active',
    limitations: ['الهندسة المرجعية إجرائية ومحلية ولا تمثل مسحاً معتمداً للموقع.']
  },
  {
    packId: 'zone-readiness',
    packVersion: '1.0.0',
    titleAr: 'جاهزية المناطق',
    titleEn: 'Zone Readiness',
    descriptionAr: 'يطبق عقد الجاهزية وقائمة التدخل على مناطق الحزمة.',
    capabilityIds: ['readiness-validation'],
    requiredPackIds: ['spatial-foundation'],
    optionalPackIds: ['decision-engine'],
    incompatiblePackIds: [],
    requiredEntityTypes: ['zone'],
    requiredRoleIds: ['role-operator'],
    requiredAuthorityIds: [],
    requiredIntegrationProfileIds: [],
    requiredOutputProfileIds: [],
    configurationSchemaVersion: '1.0.0',
    status: 'active',
    limitations: ['الحالات تجريبية ولا تمثل جاهزية حية أو معتمدة.']
  },
  {
    packId: 'decision-engine',
    packVersion: '1.0.0',
    titleAr: 'محرك القرارات',
    titleEn: 'Decision Engine',
    descriptionAr: 'يدير عقود القرار المحلية وعلاقاتها الصريحة من دون سير عمل دائم.',
    capabilityIds: ['decision-integrity'],
    requiredPackIds: ['spatial-foundation'],
    optionalPackIds: ['zone-readiness'],
    incompatiblePackIds: [],
    requiredEntityTypes: ['zone'],
    requiredRoleIds: ['role-decision-owner', 'role-approver'],
    requiredAuthorityIds: ['authority-operational'],
    requiredIntegrationProfileIds: [],
    requiredOutputProfileIds: [],
    configurationSchemaVersion: '1.0.0',
    status: 'active',
    limitations: ['الهوية والاعتماد محليان وغير ملزمين تشغيلياً.']
  },
  {
    packId: 'operational-capture',
    packVersion: '1.0.0',
    titleAr: 'الالتقاط التشغيلي',
    titleEn: 'Operational Capture',
    descriptionAr: 'يعلن احتياجات الالتقاط المحلية وقياسات IoT المحايدة عبر حد الموائم القابل للاستبدال.',
    capabilityIds: ['local-capture-validation', 'iot-observation-validation'],
    requiredPackIds: ['spatial-foundation'],
    optionalPackIds: ['decision-engine'],
    incompatiblePackIds: [],
    requiredEntityTypes: ['zone'],
    requiredRoleIds: ['role-operator'],
    requiredAuthorityIds: [],
    requiredIntegrationProfileIds: ['integration-local-capture'],
    requiredOutputProfileIds: [],
    configurationSchemaVersion: '1.0.0',
    status: 'experimental',
    limitations: ['لا توجد شبكة أو هوية إنتاجية أو وقت جهاز موثوق أو أجهزة متصلة.']
  },
  {
    packId: 'scenario-player',
    packVersion: '1.0.0',
    titleAr: 'مشغل التمرين',
    titleEn: 'Scenario Player',
    descriptionAr: 'يشغل تسلسلاً نصياً معزولاً عن خط الأساس، وليس محاكاة علمية.',
    capabilityIds: ['scripted-exercise'],
    requiredPackIds: ['spatial-foundation'],
    optionalPackIds: ['zone-readiness'],
    incompatiblePackIds: [],
    requiredEntityTypes: ['zone'],
    requiredRoleIds: ['role-operator'],
    requiredAuthorityIds: [],
    requiredIntegrationProfileIds: [],
    requiredOutputProfileIds: [],
    configurationSchemaVersion: '1.0.0',
    status: 'active',
    limitations: ['التسلسل تمرين نصي ولا يجوز تسميته محاكاة.']
  },
  {
    packId: 'spatial-output',
    packVersion: '1.0.0',
    titleAr: 'المخرجات المكانية',
    titleEn: 'Spatial Output',
    descriptionAr: 'يربط تمثيلات القوائم و2D و3D بهوية تهيئة واحدة.',
    capabilityIds: ['spatial-rendering-2d', 'spatial-rendering-3d'],
    requiredPackIds: ['spatial-foundation'],
    optionalPackIds: ['projection-preview'],
    incompatiblePackIds: [],
    requiredEntityTypes: ['site'],
    requiredRoleIds: ['role-operator'],
    requiredAuthorityIds: [],
    requiredIntegrationProfileIds: [],
    requiredOutputProfileIds: ['output-spatial-preview'],
    configurationSchemaVersion: '1.0.0',
    status: 'active',
    limitations: ['المخرجات للمعاينة المحلية ولا تثبت تطابقاً فيزيائياً.']
  },
  {
    packId: 'projection-preview',
    packVersion: '1.0.0',
    titleAr: 'معاينة الإسقاط',
    titleEn: 'Projection Preview',
    descriptionAr: 'يحدد إعدادات عرض إسقاط بصري من دون معايرة أو جهاز مادي.',
    capabilityIds: ['projection-preview', 'physical-output-preview'],
    requiredPackIds: ['spatial-output'],
    optionalPackIds: [],
    incompatiblePackIds: [],
    requiredEntityTypes: ['site'],
    requiredRoleIds: ['role-operator'],
    requiredAuthorityIds: [],
    requiredIntegrationProfileIds: [],
    requiredOutputProfileIds: ['output-projection-preview'],
    configurationSchemaVersion: '1.0.0',
    status: 'experimental',
    limitations: ['لا توجد معايرة فيزيائية أو أجهزة متصلة.']
  }
];

export interface OperationalPackResolutionContext {
  enabledPackIds: string[];
  configurationByPackId?: Record<string, Partial<OperationalPackRuntimeConfiguration>>;
  entityTypes: Iterable<EntityType>;
  roleIds: Iterable<string>;
  authorityIds: Iterable<string>;
  integrationProfileIds: Iterable<string>;
  outputProfileIds: Iterable<string>;
  supportedCapabilityIds?: Iterable<string>;
  registry?: OperationalPackDefinition[];
}

function blocking(code: string, path: string, messageAr: string): EventPackageValidationIssue {
  return { code, path, messageAr, severity: 'blocking' };
}

export function resolveOperationalPacks(context: OperationalPackResolutionContext): OperationalPackResolution {
  const registry = context.registry ?? operationalPackRegistry;
  const registryById = new Map(registry.map((pack) => [pack.packId, pack]));
  const enabled = context.enabledPackIds;
  const enabledSet = new Set(enabled);
  const entityTypes = new Set(context.entityTypes);
  const roleIds = new Set(context.roleIds);
  const authorityIds = new Set(context.authorityIds);
  const integrationProfileIds = new Set(context.integrationProfileIds);
  const outputProfileIds = new Set(context.outputProfileIds);
  const capabilityIds = new Set(context.supportedCapabilityIds ?? platformCapabilityIds);
  const issues: EventPackageValidationIssue[] = [];

  if (enabledSet.size !== enabled.length) {
    issues.push(blocking('duplicate-pack-activation', '$.operationalPackConfiguration.enabledPackIds', 'لا يمكن تفعيل الحزمة التشغيلية نفسها أكثر من مرة.'));
  }

  for (const packId of enabledSet) {
    const pack = registryById.get(packId);
    if (!pack) {
      issues.push(blocking('unknown-operational-pack', `$.operationalPackConfiguration.enabledPackIds.${packId}`, `الحزمة التشغيلية ${packId} غير معروفة في السجل الحالي.`));
      continue;
    }
    const requestedVersion = context.configurationByPackId?.[packId]?.packVersion;
    if (requestedVersion !== undefined && requestedVersion !== pack.packVersion) {
      issues.push(blocking('unsupported-pack-version', `$.operationalPackConfiguration.configurationByPackId.${packId}.packVersion`, `إصدار الحزمة ${packId} غير مدعوم في المنصة الحالية.`));
    }
    pack.requiredPackIds.forEach((requiredPackId) => {
      if (!enabledSet.has(requiredPackId)) {
        issues.push(blocking('missing-pack-dependency', `$.operationalPackConfiguration.enabledPackIds.${packId}`, `الحزمة ${pack.titleAr} تحتاج إلى تفعيل ${registryById.get(requiredPackId)?.titleAr ?? requiredPackId}.`));
      }
    });
    pack.incompatiblePackIds.forEach((incompatiblePackId) => {
      if (enabledSet.has(incompatiblePackId)) {
        issues.push(blocking('incompatible-operational-packs', `$.operationalPackConfiguration.enabledPackIds.${packId}`, `الحزمة ${pack.titleAr} تتعارض مع ${registryById.get(incompatiblePackId)?.titleAr ?? incompatiblePackId}.`));
      }
    });
    pack.capabilityIds.forEach((capabilityId) => {
      if (!capabilityIds.has(capabilityId)) issues.push(blocking('unsupported-platform-capability', `$.requiredCapabilityIds.${capabilityId}`, `القدرة ${capabilityId} غير مدعومة في هذا الإصدار من المنصة.`));
    });
    pack.requiredEntityTypes.forEach((entityType) => {
      if (!entityTypes.has(entityType)) issues.push(blocking('missing-required-entity-type', `$.spatialConfiguration.entities.${entityType}`, `الحزمة ${pack.titleAr} تحتاج إلى عنصر مكاني من نوع ${entityType}.`));
    });
    pack.requiredRoleIds.forEach((roleId) => {
      if (!roleIds.has(roleId)) issues.push(blocking('missing-required-role', `$.roleConfiguration.${roleId}`, `الحزمة ${pack.titleAr} تحتاج إلى الدور ${roleId}.`));
    });
    pack.requiredAuthorityIds.forEach((authorityId) => {
      if (!authorityIds.has(authorityId)) issues.push(blocking('missing-required-authority', `$.authorityConfiguration.${authorityId}`, `الحزمة ${pack.titleAr} تحتاج إلى جهة الصلاحية ${authorityId}.`));
    });
    pack.requiredIntegrationProfileIds.forEach((profileId) => {
      if (!integrationProfileIds.has(profileId)) issues.push(blocking('missing-required-integration-profile', `$.integrationProfileConfiguration.${profileId}`, `الحزمة ${pack.titleAr} تحتاج إلى ملف التكامل ${profileId}.`));
    });
    pack.requiredOutputProfileIds.forEach((profileId) => {
      if (!outputProfileIds.has(profileId)) issues.push(blocking('missing-required-output-profile', `$.projectionProfileConfiguration.${profileId}`, `الحزمة ${pack.titleAr} تحتاج إلى ملف الإخراج ${profileId}.`));
    });
  }

  const temporary = new Set<string>();
  const permanent = new Set<string>();
  const ordered: OperationalPackDefinition[] = [];
  const visit = (packId: string, ancestry: string[]) => {
    if (permanent.has(packId)) return;
    if (temporary.has(packId)) {
      issues.push(blocking('pack-dependency-cycle', `$.operationalPackConfiguration.enabledPackIds.${packId}`, `توجد دورة اعتماد بين الحزم: ${[...ancestry, packId].join(' ← ')}.`));
      return;
    }
    const pack = registryById.get(packId);
    if (!pack || !enabledSet.has(packId)) return;
    temporary.add(packId);
    pack.requiredPackIds.forEach((dependencyId) => visit(dependencyId, [...ancestry, packId]));
    temporary.delete(packId);
    permanent.add(packId);
    ordered.push(pack);
  };
  enabled.forEach((packId) => visit(packId, []));

  return {
    valid: !issues.some((issue) => issue.severity === 'blocking'),
    orderedPacks: ordered,
    issues
  };
}
