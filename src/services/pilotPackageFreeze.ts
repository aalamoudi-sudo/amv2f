import type {
  FrozenPilotPackage,
  PilotCompilationResult,
  PilotFreezeResult,
  PilotInputManifestRecord,
  PilotSourceBundle,
  PilotValidationIssue
} from '../types/pilotAuthoring';
import { createPilotSourceBundleHash } from './pilotPackageCompiler';

export const pilotInputTemplateFiles = [
  'README.md',
  'event.json',
  'venue.json',
  'entities.csv',
  'routes.json',
  'readiness.csv',
  'decisions.json',
  'roles.csv',
  'authorities.csv',
  'integration-profiles.json',
  'projection-profile.json',
  'evidence-register.csv',
  'sources-register.csv'
] as const;

function issue(code: string, path: string, messageAr: string): PilotValidationIssue {
  return { code, path, messageAr, severity: 'blocking', category: 'governance' };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
}

export function createPilotInputManifest(sourceType: PilotSourceBundle['sourceType']): PilotInputManifestRecord[] {
  return pilotInputTemplateFiles.map((fileName) => ({
    fileName,
    status: sourceType === 'fictional-example' ? 'template-only' : 'provided-local',
    classification: fileName === 'README.md' ? 'public' : 'internal',
    exampleRowsExcluded: sourceType === 'real-pilot-input'
  }));
}

export async function freezePilotPackage(
  bundle: PilotSourceBundle,
  compilation: PilotCompilationResult,
  frozenBy = 'منسق تأليف محلي غير موثوق الهوية',
  frozenAt = new Date().toISOString()
): Promise<PilotFreezeResult> {
  if (!compilation.success || !compilation.eventPackage || !compilation.sourceBundleHash || !compilation.idMappingReport) {
    return { success: false, artifact: null, issues: [issue('pilot-freeze-invalid-compilation', '$', 'لا يمكن تجميد مسودة لم تجتز الترجمة والتحقق الكاملين.')] };
  }
  if (bundle.approvalStatus !== 'approved' || !bundle.approvedBy || !bundle.approvedAt) {
    return { success: false, artifact: null, issues: [issue('pilot-freeze-unapproved-source', '$.approvalStatus', 'لا يمكن تجميد حزمة مصدر غير معتمدة محلياً.')] };
  }
  if (await createPilotSourceBundleHash(bundle) !== compilation.sourceBundleHash) {
    return { success: false, artifact: null, issues: [issue('pilot-freeze-source-hash-mismatch', '$', 'تختلف حزمة المصدر الحالية عن الحزمة التي اجتازت الترجمة؛ يجب إعادة التحقق والترجمة قبل التجميد.')] };
  }
  const artifact: FrozenPilotPackage = {
    artifactId: `PILOT-FROZEN-${bundle.pilotBundleId.replace(/^PILOT-BUNDLE-/, '')}-R${bundle.revision}`,
    sourceType: bundle.sourceType,
    eventPackage: structuredClone(compilation.eventPackage),
    packageContentHash: compilation.eventPackage.packageContentHash,
    sourceBundleHash: compilation.sourceBundleHash,
    eventId: bundle.eventId,
    venueId: bundle.venueId,
    frozenRevision: bundle.revision,
    frozenAt,
    frozenBy,
    inputManifest: createPilotInputManifest(bundle.sourceType),
    idMappingReport: structuredClone(compilation.idMappingReport),
    validationReport: {
      valid: true,
      issues: structuredClone(compilation.issues),
      eventPackageIssues: structuredClone(compilation.eventPackageIssues)
    },
    knownLimitations: [...bundle.knownLimitations],
    unresolvedWarnings: compilation.issues.filter((current) => current.severity === 'warning'),
    enabledOperationalPacks: [...bundle.enabledOperationalPackIds],
    integrationCandidateManifest: structuredClone(bundle.integrationCandidates),
    evidenceRegister: structuredClone(bundle.evidenceRegister),
    sourceRegister: structuredClone(bundle.sourceRegister),
    evidencePolicySummary: 'الأدلة تبقى مراجع محلية؛ لا يوجد مستودع أدلة أو سلسلة حيازة إنتاجية.',
    securityClassificationSummary: `${bundle.securityClassification} / ${bundle.privacyClassification} — تخزين محلي مؤقت فقط.`
  };
  return { success: true, artifact: deepFreeze(artifact), issues: [] };
}

export function cloneFrozenPilotPackage(artifact: FrozenPilotPackage): FrozenPilotPackage {
  return structuredClone(artifact);
}
