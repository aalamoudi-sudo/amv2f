import type { EventPackage, TemporaryDemoSeedRecord } from '../types/eventPackage';
import type {
  PilotCompilationResult,
  PilotFieldState,
  PilotPackageDraft,
  PilotSourceBundle,
  PilotValidationIssue
} from '../types/pilotAuthoring';
import { withEventPackageContentHash } from './eventPackageHash';
import { validateEventPackage } from './eventPackageValidation';
import { sha256Payload } from './integrationHash';
import { validatePilotIdGovernance } from './pilotIdGovernance';
import { validatePilotSourceBundle } from './pilotSourceBundleValidation';

const requiredBundleFields: Array<keyof PilotSourceBundle> = [
  'schemaVersion', 'sourceType', 'pilotBundleId', 'pilotBundleVersion', 'eventNameAr', 'eventNameEn',
  'eventType', 'eventId', 'venueId', 'startAt', 'endAt', 'timeZone', 'source', 'sourceOwner',
  'preparedBy', 'preparedAt', 'approvalStatus', 'approvedBy', 'approvedAt', 'securityClassification',
  'privacyClassification', 'permittedUse', 'retentionPolicy', 'revision', 'changeReason', 'entities',
  'routes', 'readinessRecords', 'decisionRecords', 'requirements', 'roles', 'authorities',
  'integrationProfiles', 'projectionProfile', 'physicalOutputProfile', 'spatialProfile',
  'scenarioConfiguration', 'captureFixtures', 'evidenceRegister', 'sourceRegister',
  'integrationCandidates', 'entityOperationalCoverage', 'enabledOperationalPackIds', 'knownLimitations'
];

function pilotIssue(code: string, path: string, messageAr: string): PilotValidationIssue {
  return { code, path, messageAr, severity: 'blocking', category: 'governance' };
}

function issueTargetsField(issue: PilotValidationIssue, field: keyof PilotSourceBundle): boolean {
  const dotPath = `$.${String(field)}`;
  const pointerPath = `/${String(field)}`;
  return issue.path === dotPath
    || issue.path.startsWith(`${dotPath}.`)
    || issue.path.startsWith(`${dotPath}[`)
    || issue.path === pointerPath
    || issue.path.startsWith(`${pointerPath}/`);
}

function stateFromIssues(issues: PilotValidationIssue[]): PilotFieldState {
  if (issues.some((current) => /(?:unapproved|approval-incomplete)/.test(current.code))) return 'unapproved';
  if (issues.some((current) => /(?:duplicate|renamed|cross-event|self-approval|cycle|mismatch)/.test(current.code))) return 'conflicting';
  return 'invalid';
}

function fieldStates(
  sourceBundle: Partial<PilotSourceBundle>,
  issues: PilotValidationIssue[] = [],
  validated = false,
  valid = false
): Record<string, PilotFieldState> {
  return Object.fromEntries(requiredBundleFields.map((field) => {
    const value = sourceBundle[field];
    const missing = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
    if (missing) return [String(field), 'missing'];
    if (!validated) return [String(field), 'unknown'];
    const fieldIssues = issues.filter((current) => issueTargetsField(current, field));
    if (fieldIssues.length) return [String(field), stateFromIssues(fieldIssues)];
    return [String(field), valid ? 'ready-to-freeze' : 'complete'];
  }));
}

export function createPilotPackageDraft(
  sourceBundle: Partial<PilotSourceBundle> = {},
  now = new Date().toISOString()
): PilotPackageDraft {
  const revision = typeof sourceBundle.revision === 'number' && sourceBundle.revision > 0 ? sourceBundle.revision : 1;
  return {
    draftId: `PILOT-DRAFT-${String(revision).padStart(3, '0')}`,
    draftRevision: revision,
    sourceBundle: structuredClone(sourceBundle),
    fieldStates: fieldStates(sourceBundle),
    issues: [],
    createdAt: now,
    updatedAt: now,
    frozenArtifactId: null
  };
}

export function validatePilotPackageDraft(draft: PilotPackageDraft, now = new Date().toISOString()): PilotPackageDraft {
  const result = validatePilotSourceBundle(draft.sourceBundle);
  return {
    ...structuredClone(draft),
    fieldStates: fieldStates(draft.sourceBundle, result.issues, true, result.valid),
    issues: result.issues,
    updatedAt: now
  };
}

function seedRecord<T>(bundle: PilotSourceBundle, seedId: string, record: T): TemporaryDemoSeedRecord<T> {
  return {
    seedId,
    stateContext: 'temporary-demo',
    source: bundle.source,
    createdAt: bundle.preparedAt,
    createdBy: bundle.preparedBy,
    approvalStatus: bundle.approvalStatus,
    revision: bundle.revision,
    dataClassification: 'temporary-demo',
    record: structuredClone(record)
  };
}

function slug(value: string): string {
  return value.replace(/^EVENT-/, '').replace(/[^A-Za-z0-9-]/g, '-').replace(/-+/g, '-').toUpperCase();
}

function eventPackageCandidate(bundle: PilotSourceBundle, previewGeneratedAt?: string): EventPackage {
  const eventSlug = slug(bundle.eventId);
  const eventTemplateId = `EVENT-TEMPLATE-PILOT-${eventSlug}-V1`;
  const entityTypes = [...new Set(bundle.entities.map((entity) => entity.type))];
  return {
    packageId: `EVENT-PACKAGE-PILOT-${eventSlug}`,
    packageVersion: bundle.pilotBundleVersion,
    schemaVersion: '1.0.0',
    packageContentHash: `EVENT-PACKAGE-v1-${'0'.repeat(64)}`,
    titleAr: `حزمة طيار محلية: ${bundle.eventNameAr}`,
    titleEn: `Local pilot package: ${bundle.eventNameEn}`,
    descriptionAr: 'حزمة محلية مضبوطة ناتجة من مختبر التأليف؛ ليست بيانات تشغيلية حية أو اعتماداً ميدانياً.',
    descriptionEn: 'Controlled local package compiled by the authoring laboratory; not live or operationally approved.',
    eventType: bundle.eventType,
    stateContext: 'temporary-demo',
    packageStatus: 'validated',
    dataClassification: 'temporary-demo',
    minimumPlatformVersion: '0.1.0',
    maximumPlatformVersion: '0.9.0',
    requiredCapabilityIds: ['spatial-rendering-2d', 'spatial-rendering-3d', 'route-visualization', 'readiness-validation', 'decision-integrity'],
    incompatibleCapabilityIds: [],
    eventTemplate: {
      eventTemplateId,
      eventType: bundle.eventType,
      lifecycleProfileId: 'lifecycle-major-event-local-preview-v1',
      defaultOperationalPackIds: [...bundle.enabledOperationalPackIds],
      supportedSpatialEntityTypes: entityTypes,
      requiredRoleIds: bundle.roles.map((role) => role.roleId)
    },
    eventInstance: {
      eventInstanceId: bundle.eventId,
      eventTemplateId,
      eventNameAr: bundle.eventNameAr,
      eventNameEn: bundle.eventNameEn,
      venueId: bundle.venueId,
      startAt: bundle.startAt,
      endAt: bundle.endAt,
      timeZone: bundle.timeZone,
      stateContext: 'temporary-demo'
    },
    spatialConfiguration: {
      siteBoundaryId: bundle.spatialProfile.siteBoundaryId,
      venueIds: [bundle.venueId],
      entities: structuredClone(bundle.entities),
      localCoordinateSystem: structuredClone(bundle.spatialProfile.localCoordinateSystem),
      geographicReference: structuredClone(bundle.spatialProfile.geographicReference),
      modelReferences: structuredClone(bundle.spatialProfile.modelReferences),
      entityLabels: Object.fromEntries(bundle.entities.map((entity) => [entity.id, entity.nameAr])),
      spatialMappingVersion: bundle.spatialProfile.spatialMappingVersion,
      projectionProfileVersion: bundle.spatialProfile.projectionProfileVersion,
      physicalOutputMappingVersion: bundle.spatialProfile.physicalOutputMappingVersion
    },
    routeConfiguration: { routes: structuredClone(bundle.routes) },
    requirementConfiguration: structuredClone(bundle.requirements),
    operationalPackConfiguration: {
      enabledPackIds: [...bundle.enabledOperationalPackIds],
      configurationByPackId: Object.fromEntries(bundle.enabledOperationalPackIds.map((packId) => [packId, {
        packVersion: '1.0.0',
        stateContext: 'temporary-demo',
        ...(packId === 'scenario-player' ? { scenarioPlayer: structuredClone(bundle.scenarioConfiguration) } : {})
      }]))
    },
    roleConfiguration: structuredClone(bundle.roles),
    authorityConfiguration: structuredClone(bundle.authorities),
    integrationProfileConfiguration: structuredClone(bundle.integrationProfiles),
    projectionProfileConfiguration: [structuredClone(bundle.projectionProfile)],
    physicalOutputProfileConfiguration: [structuredClone(bundle.physicalOutputProfile)],
    temporaryDemoSeedData: {
      readinessRecords: bundle.readinessRecords.map((record) => seedRecord(bundle, `SEED-READINESS-${record.zoneId}`, record)),
      decisionRecords: bundle.decisionRecords.map((record) => seedRecord(bundle, `SEED-${record.decisionId}`, record)),
      captureFixtures: bundle.captureFixtures.map((record) => seedRecord(bundle, `SEED-${record.envelopeId}`, record))
    },
    createdAt: bundle.preparedAt,
    createdBy: bundle.preparedBy,
    source: bundle.source,
    approvalStatus: bundle.approvalStatus,
    approvedBy: bundle.approvedBy,
    approvedAt: bundle.approvedAt,
    revision: bundle.revision,
    changeReason: bundle.changeReason,
    dependencies: [],
    ...(previewGeneratedAt ? { previewGeneratedAt } : {})
  };
}

export async function createPilotSourceBundleHash(bundle: PilotSourceBundle): Promise<string> {
  return `PILOT-SOURCE-v1-${await sha256Payload(bundle)}`;
}

export async function compilePilotPackageDraft(
  draft: PilotPackageDraft,
  previewGeneratedAt?: string
): Promise<PilotCompilationResult> {
  try {
    const sourceValidation = validatePilotSourceBundle(draft.sourceBundle);
    if (!sourceValidation.valid || !sourceValidation.bundle) {
      return { success: false, sourceBundleHash: null, eventPackage: null, issues: sourceValidation.issues, eventPackageIssues: [], idMappingReport: null };
    }
    const bundle = sourceValidation.bundle;
    const idMappingReport = validatePilotIdGovernance(bundle);
    if (!idMappingReport.valid) {
      return { success: false, sourceBundleHash: null, eventPackage: null, issues: idMappingReport.issues, eventPackageIssues: [], idMappingReport };
    }
    const sourceBundleHash = await createPilotSourceBundleHash(bundle);
    const eventPackage = await withEventPackageContentHash(eventPackageCandidate(bundle, previewGeneratedAt));
    const packageValidation = await validateEventPackage(eventPackage);
    if (!packageValidation.valid) {
      return {
        success: false,
        sourceBundleHash,
        eventPackage: null,
        issues: [pilotIssue('pilot-event-package-incompatible', '$', 'ناتج المترجم لا يجتاز عقد حزمة الفعالية المجمّد؛ لم تُنشأ حزمة قابلة للتجميد.')],
        eventPackageIssues: packageValidation.issues,
        idMappingReport
      };
    }
    return { success: true, sourceBundleHash, eventPackage, issues: sourceValidation.issues, eventPackageIssues: [], idMappingReport };
  } catch {
    return {
      success: false,
      sourceBundleHash: null,
      eventPackage: null,
      issues: [pilotIssue('pilot-compiler-never-throw-boundary', '$', 'تعذر ترجمة المسودة بأمان؛ بقيت خارج التجميد والتفعيل.')],
      eventPackageIssues: [],
      idMappingReport: null
    };
  }
}
