import { kapOperationalReadinessPackCandidate } from './kapOperationalReadinessPack';
import {
  deriveOperationalSourceFingerprint,
  deriveOperationalSourceTraceFingerprint,
  materializeOperationalReadinessPackDerivedState
} from '../services/operationalReadinessPack';
import {
  createOperationalAuthorityTriggerFacts,
  deriveOperationalAuthorityTriggerFingerprint
} from '../services/operationalAuthorityTriggerPolicy';
import type { OperationalReadinessPack } from '../types/operationalReadinessPack';

const replacements = [
  ['KAP', 'CONF-ALPHA'],
  ['حدائق الملك عبدالله', 'مؤتمر ألفا الخيالي'],
  ['أحمد', 'مدير اختبار ألفا'],
  ['محمد إبراهيم', 'ممثل اختبار ألفا'],
  ['جوزيف حداد', 'مرشح اختبار بيتا'],
  ['ماجد قاسم', 'مالك تشغيل اختباري'],
  ['إبراهيم الغمري', 'مالك محتوى اختباري']
] as const;

function replaceFixtureIdentity(value: unknown): OperationalReadinessPack {
  let serialized = JSON.stringify(value);
  replacements.forEach(([from, to]) => {
    serialized = serialized.replaceAll(from, to);
  });
  return JSON.parse(serialized) as OperationalReadinessPack;
}

/**
 * Synthetic package proving that package configuration, not Core branches,
 * supplies all event-specific identities and operator copy.
 */
export function createFictionalConferenceReadinessPack(): OperationalReadinessPack {
  const replaced = replaceFixtureIdentity(kapOperationalReadinessPackCandidate);
  const fixturePackId = 'READINESS-PACK-CONFERENCE-ALPHA-FICTIONAL-v1';
  const fixtureProjectId = 'PROJECT-CONFERENCE-ALPHA-FICTIONAL';
  const fixtureEventId = 'EVENT-CONFERENCE-ALPHA-FICTIONAL';
  const fixtureVenueId = 'VENUE-CONFERENCE-ALPHA-FICTIONAL';
  const sourceRegistry = replaced.sourceRegistry.map((source, index) => ({
    ...source,
    originalFilename: `fictional-source-${index + 1}.json`,
    absoluteLocalPath: `/fixtures/conference-alpha/fictional-source-${index + 1}.json`,
    approvalScope: 'بيانات اختبار خيالية لإثبات إعادة استخدام المحرك.',
    approvalLimitations: ['ليست بيانات مشروع أو جاهزية حقيقية.']
  }));
  const sourceFingerprint = deriveOperationalSourceFingerprint(sourceRegistry);
  const sourceTraceFingerprint = deriveOperationalSourceTraceFingerprint(replaced.sourceTraces);
  const requirements = replaced.requirements.map((requirement) => ({
    ...requirement,
    projectId: fixtureProjectId,
    eventId: fixtureEventId,
    venueId: fixtureVenueId
  }));
  const authorityTriggerFacts = createOperationalAuthorityTriggerFacts({
    requirements,
    revision: replaced.revision
  });
  const scopedAuthorities = replaced.authorityMatrix.map((authority) => ({
    ...authority,
    scopeId: authority.scopeType === 'pack' ? fixturePackId : authority.scopeId
  }));
  const authorityById = new Map(scopedAuthorities.map((authority) => [authority.authorityId, authority]));
  const { contentHash: ignored, ...withoutHash } = replaced;
  void ignored;
  return materializeOperationalReadinessPackDerivedState({
    ...withoutHash,
    id: fixturePackId,
    projectId: fixtureProjectId,
    eventId: fixtureEventId,
    venueId: fixtureVenueId,
    title: 'حزمة جاهزية مؤتمر ألفا الخيالي',
    description: 'حزمة اختبار خيالية لا تمثل فعالية تشغيلية.',
    sourceRegistry,
    sourceFingerprint,
    sourceTraceFingerprint,
    requirements,
    authorityTriggerFacts,
    authorityTriggerFingerprint:
      deriveOperationalAuthorityTriggerFingerprint(authorityTriggerFacts),
    authorityMatrix: scopedAuthorities,
    requiredAuthorities: replaced.requiredAuthorities.map((declaration) => ({
      ...declaration,
      requiredScopeId: declaration.requiredScopeType === 'pack'
        ? fixturePackId
        : declaration.requiredScopeId
    })),
    governance: {
      ...replaced.governance,
      requirementAuthority: replaced.governance.requirementAuthority
        ? authorityById.get(replaced.governance.requirementAuthority.authorityId) ?? null
        : null,
      verificationAuthority: replaced.governance.verificationAuthority
        ? authorityById.get(replaced.governance.verificationAuthority.authorityId) ?? null
        : null,
      internalApprovalAuthority: replaced.governance.internalApprovalAuthority
        ? authorityById.get(replaced.governance.internalApprovalAuthority.authorityId) ?? null
        : null,
      externalAcceptanceAuthority: replaced.governance.externalAcceptanceAuthority
        ? authorityById.get(replaced.governance.externalAcceptanceAuthority.authorityId) ?? null
        : null,
      openingDecisionAuthority: replaced.governance.openingDecisionAuthority
        ? authorityById.get(replaced.governance.openingDecisionAuthority.authorityId) ?? null
        : null,
      activationAuthority: replaced.governance.activationAuthority
        ? authorityById.get(replaced.governance.activationAuthority.authorityId) ?? null
        : null
    },
    displayConfig: {
      shortLabelAr: 'حزمة مؤتمر ألفا الخيالية',
      executiveNoticeAr: 'هذه حزمة اختبار عامة ولا تمثل جاهزية تشغيلية.',
      identityBoundaryAr: 'كل الهويات خيالية ومخصصة للاختبار.',
      spatialBoundaryAr: 'العلاقات المكانية الاختبارية مرشحة وغير هندسية.',
      executionConflictLabelAr: 'مرشحا الاختبار متعارضان ولا يحتسب أي منهما.'
    },
    founderReviewStatus: 'not-reviewed',
    operationalReadiness: 'cannot-determine'
  });
}
