import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  findSpatialCommandExperience,
  kapSpatialCommandExperience
} from '../data/spatialCommandExperiences';
import type {
  SpatialCommandExperienceConfiguration,
  SpatialJourneyPlaybackState
} from '../types/spatialCommand';
import { SourceTruthDrawer } from '../components/spatial-command/SourceTruthDrawer';
import {
  resolveSpatialCommandRouteState,
  spatialOperatorLabel,
  switchSpatialSourceLayer,
  transitionSpatialJourneyState,
  validateSpatialCommandConfiguration
} from './spatialCommand';

afterEach(cleanup);

function cloneConfiguration(): SpatialCommandExperienceConfiguration {
  return structuredClone(kapSpatialCommandExperience);
}

function createGenericConfiguration(): SpatialCommandExperienceConfiguration {
  const source = structuredClone(
    kapSpatialCommandExperience.sourceTruth.sources.find((entry) => entry.sourceRole === 'candidate-operational-zoning')!
  );
  const sourceLayer = structuredClone(
    kapSpatialCommandExperience.sourceLayers.find((entry) => entry.truthStatus === 'candidate')!
  );
  const entity = structuredClone(kapSpatialCommandExperience.candidateEntities[0]!);
  const inventory = structuredClone(kapSpatialCommandExperience.evidenceSummary.inventory);
  const scope = {
    projectId: 'PROJECT-GENERIC-001',
    eventId: 'EVENT-GENERIC-001',
    venueId: 'VENUE-GENERIC-001'
  };

  Object.assign(source, scope, {
    sourceAssetId: 'SOURCE-GENERIC-CANDIDATE-001',
    externalFileId: 'EXTERNAL-GENERIC-001',
    sourceName: 'generic-candidate-plan.png',
    providerPermissionRisk: 'none-recorded',
    notes: ['Generic candidate fixture.']
  });
  Object.assign(sourceLayer, {
    sourceLayerId: 'SOURCE-LAYER-GENERIC-CANDIDATE',
    sourceAssetId: source.sourceAssetId,
    labelAr: 'مصدر مرشح عام',
    labelEn: 'Generic candidate source',
    previewUrl: '/local-assets/generic/candidate.png',
    operatorContext: {
      eyebrowAr: 'سياق مصدر مرشح',
      titleAr: 'مخطط مرشح عام',
      summaryAr: 'سياق اختبار عام لا يثبت هندسة.',
      canvasTitleAr: 'مرشح غير معاير',
      canvasSummaryAr: 'مرساة بصرية للمراجعة فقط.',
      facts: [{ labelAr: 'السلطة', valueAr: 'مرشح' }]
    }
  });
  Object.assign(entity, scope, {
    candidateId: 'ENTITY-GENERIC-001',
    sourceAssetId: source.sourceAssetId,
    labelAr: 'وجهة عامة',
    workingLabelEn: 'Generic destination',
    sourceNumber: 1,
    mappingStatus: 'probable'
  });
  Object.assign(inventory, scope, {
    snapshotId: 'EVIDENCE-GENERIC-001',
    photographCount: 0,
    videoCount: 0,
    categories: [],
    notes: ['Metadata-only generic fixture.']
  });
  const genericTruthHash = 'a'.repeat(64);

  return {
    schemaVersion: '1.0.0',
    configurationId: 'SPATIAL-COMMAND-GENERIC-001',
    version: '0.1.0-candidate',
    contentHash: 'GENERIC-CANDIDATE-CONTENT-HASH',
    ...scope,
    experienceTitle: 'تجربة قيادة مكانية عامة',
    truthContext: {
      packageStatus: 'candidate',
      operationalBaselineStatus: 'absent',
      geometryAuthority: 'none',
      liveDataStatus: 'absent',
      routeAuthority: 'none',
      readinessInference: 'prohibited',
      scaleStatus: 'unknown',
      crsStatus: 'unknown',
      drawingApprovalStatus: 'missing',
      calibrationStatus: 'incomplete'
    },
    sourceLayers: [sourceLayer],
    displayLayers: [
      {
        layerId: 'DISPLAY-LAYER-GENERIC-CANDIDATE',
        labelAr: 'المصدر المرشح',
        type: 'candidate-zoning',
        sourceId: source.sourceAssetId,
        authority: 'founder-selected-working-candidate',
        visibility: true,
        opacity: 1,
        compatibleModes: ['experience', 'executive', 'journey'],
        truthClassification: 'candidate-raster-uncalibrated',
        renderOrder: 10,
        legend: { labelAr: 'مصدر مرشح', symbol: 'source' },
        dependencies: []
      },
      {
        layerId: 'DISPLAY-LAYER-GENERIC-MARKERS',
        labelAr: 'المراسي المرشحة',
        type: 'candidate-entity-markers',
        sourceId: source.sourceAssetId,
        authority: 'candidate-visual-anchor',
        visibility: true,
        opacity: 1,
        compatibleModes: ['experience', 'executive', 'journey'],
        truthClassification: 'candidate-visual-anchor',
        renderOrder: 20,
        legend: { labelAr: 'مرساة مرشحة', symbol: 'marker' },
        dependencies: ['DISPLAY-LAYER-GENERIC-CANDIDATE']
      }
    ],
    candidateEntities: [entity],
    experienceObjects: [{
      experienceObjectId: 'ZONE-GENERIC-001',
      labelAr: 'تجربة عامة',
      legacyAliasEn: null,
      sequence: 1
    }],
    entityRelationships: [{
      relationshipId: 'REL-GENERIC-001',
      ...scope,
      experienceObjectId: 'ZONE-GENERIC-001',
      candidateEntityIds: [entity.candidateId],
      state: 'probable',
      confidence: 'medium',
      conflictCodes: [],
      requiredApproval: 'Founder and independent authority',
      requiredApprovalAr: 'تأكيد المؤسس والسلطة المستقلة.',
      notes: ['Generic candidate relationship.']
    }],
    narrativeJourney: {
      journeyId: 'JOURNEY-GENERIC-001',
      labelAr: 'قصة عامة',
      physicalRouteId: null,
      routeAuthority: 'none',
      playbackStepDurationMs: 1_000,
      steps: [{
        stepId: 'generic-step',
        sequence: 1,
        labelAr: 'مشهد عام',
        descriptionAr: 'انتقال سردي فقط.',
        experienceObjectId: 'ZONE-GENERIC-001',
        candidateEntityIds: [entity.candidateId],
        status: 'candidate',
        narrativeOnly: true,
        operatorNoticeAr: null
      }],
      connections: []
    },
    spatialRoutes: [],
    executiveBlockers: [{
      blockerId: 'GENERIC-DECISION-001',
      labelAr: 'قرار عام مطلوب',
      category: 'mapping',
      affectedCandidateEntityIds: [entity.candidateId],
      affectedExperienceObjectIds: ['ZONE-GENERIC-001'],
      whyItMattersAr: 'العلاقة مرشحة.',
      requiredDecisionAr: 'مراجعة العلاقة.',
      decisionAuthority: 'founder',
      decisionAuthorityAr: 'المؤسس',
      nextAcceptedEvidenceAr: 'قرار موثق.'
    }],
    evidenceSummary: {
      inventory,
      exactGpsExposed: false,
      personalIdentifiersExposed: false,
      readinessMutationAllowed: false,
      statusAr: 'بيانات وصفية فقط.'
    },
    presentation: {
      durationLabelAr: 'ثانية واحدة',
      phaseDurationMs: 1_000,
      phases: [{ phaseId: 'generic-intro', labelAr: 'افتتاح عام', mode: 'experience' }]
    },
    visualConfiguration: {
      mapAdapterId: 'SPATIAL-MAP-ADAPTER-CANDIDATE-RASTER-v1',
      projectLabelAr: 'مشروع عام',
      venueLabelAr: 'موقع عام',
      mapAspectRatio: 1,
      initialZoom: 1,
      minimumZoom: 0.75,
      maximumZoom: 3,
      defaultViewMode: 'top',
      projectCoverUri: null,
      visitorMapInputSpecUri: null,
      accent: 'botanical'
    },
    sourceTruth: {
      sources: [source],
      compactTruthAr: 'مصدر مرشح عام',
      riskIds: [],
      risks: []
    },
    technicalRoutes: [],
    unresolvedItems: [],
    spatialTruthPack: {
      schemaVersion: '1.0.0',
      packId: `SPATIAL-TRUTH-PACK-v1-${genericTruthHash}`,
      ...scope,
      revision: 1,
      effectiveDate: '2026-07-28',
      authorityType: 'founder-product-authority',
      approvedBy: 'Generic founder',
      approvalScope: ['Generic semantic decision fixture'],
      sourceReferences: [{
        sourceReferenceId: 'TRUTH-SOURCE-GENERIC-001',
        sourceAssetId: source.sourceAssetId,
        sourceHash: source.observedSha256,
        authorityStatus: 'founder-selected-working-candidate',
        role: 'candidate-zoning'
      }],
      semanticDecisions: [{
        decisionId: 'SEMANTIC-GENERIC-001',
        targetType: 'candidate-entity',
        targetId: entity.candidateId,
        primaryLabelAr: entity.labelAr,
        primaryLabelEn: entity.workingLabelEn,
        legacyAliases: [],
        semanticStatus: 'source-derived',
        spatialStatus: 'candidate-visual-anchor',
        engineeringStatus: 'unverified',
        operationalStatus: 'unavailable',
        journeyMembership: 'current-five-step',
        anchorReference: {
          sourceLayerId: sourceLayer.sourceLayerId,
          sourceHash: sourceLayer.previewSha256!,
          anchorStatus: 'frozen-candidate-visual-anchor',
          revision: 1
        },
        notes: ['Generic fixture decision.']
      }],
      candidateRelationships: [{
        relationshipId: 'TRUTH-REL-GENERIC-001',
        experienceObjectId: 'ZONE-GENERIC-001',
        candidateEntityIds: [entity.candidateId],
        relationshipStatus: 'probable',
        semanticAuthority: 'source-derived',
        engineeringStatus: 'unverified',
        operationalStatus: 'unavailable',
        notes: ['Generic fixture relationship.']
      }],
      unresolvedItems: [],
      independentLandmarks: [],
      engineeringLimitations: [{
        limitationId: 'GENERIC-SCALE-UNKNOWN',
        labelAr: 'المقياس غير معروف',
        status: 'unknown',
        scope: 'candidate raster'
      }],
      operationalLimitations: [{
        limitationId: 'GENERIC-OPERATIONAL-UNAVAILABLE',
        labelAr: 'الحالة التشغيلية غير متاحة',
        status: 'unavailable',
        scope: 'all entities'
      }],
      supersedes: null,
      revisionMetadata: null,
      frozen: true,
      contentHash: genericTruthHash
    }
  };
}

function issueCodes(configuration: SpatialCommandExperienceConfiguration): string[] {
  return validateSpatialCommandConfiguration(configuration).issues.map((entry) => entry.code);
}

describe('Stage 3E.4B spatial command configuration', () => {
  it('accepts the KAP candidate command experience without promoting truth', () => {
    const result = validateSpatialCommandConfiguration(kapSpatialCommandExperience);
    expect(result.valid, result.issues.map((entry) => entry.messageAr).join('\n')).toBe(true);
    expect(kapSpatialCommandExperience.candidateEntities).toHaveLength(11);
    expect(kapSpatialCommandExperience.experienceObjects).toHaveLength(5);
    expect(kapSpatialCommandExperience.truthContext).toMatchObject({
      packageStatus: 'candidate',
      operationalBaselineStatus: 'absent',
      geometryAuthority: 'none',
      routeAuthority: 'none',
      liveDataStatus: 'absent'
    });
  });

  it('accepts a one-entity generic project without KAP identifiers or core branches', () => {
    const generic = createGenericConfiguration();
    const result = validateSpatialCommandConfiguration(generic);
    expect(result.valid, result.issues.map((entry) => entry.messageAr).join('\n')).toBe(true);
    expect(JSON.stringify(generic)).not.toMatch(/KAP|حدائق الملك عبدالله/i);
    expect(generic.candidateEntities).toHaveLength(1);
  });

  it('blocks baseline, approved geometry, physical routes, and operational claims', () => {
    const baseline = cloneConfiguration();
    baseline.truthContext.operationalBaselineStatus = 'present' as 'absent';
    expect(issueCodes(baseline)).toContain('spatial-command-truth-escalation');

    const calibrated = cloneConfiguration();
    calibrated.truthContext.scaleStatus = 'known' as 'unknown';
    expect(issueCodes(calibrated)).toContain('spatial-command-truth-escalation');

    const geometry = cloneConfiguration();
    geometry.candidateEntities[0]!.geometryStatus = 'approved-geometry';
    expect(issueCodes(geometry)).toContain('spatial-command-approved-geometry');

    const route = cloneConfiguration();
    route.spatialRoutes.push({
      spatialRouteId: 'ROUTE-INVENTED',
      geometryAuthority: 'approved',
      geometrySourceId: 'SOURCE-INVENTED',
      routeApprovalId: 'APPROVAL-INVENTED'
    });
    expect(issueCodes(route)).toContain('spatial-command-spatial-route-without-authority');

    const operationalClaim = cloneConfiguration() as SpatialCommandExperienceConfiguration & { distanceMeters?: number };
    operationalClaim.distanceMeters = 100;
    expect(issueCodes(operationalClaim)).toContain('spatial-command-forbidden-operational-claim');
  });

  it('keeps narrative connections separate from spatial routes', () => {
    expect(kapSpatialCommandExperience.spatialRoutes).toEqual([]);
    expect(kapSpatialCommandExperience.narrativeJourney.physicalRouteId).toBeNull();
    expect(kapSpatialCommandExperience.narrativeJourney.routeAuthority).toBe('none');
    expect(kapSpatialCommandExperience.narrativeJourney.connections.every((connection) => (
      connection.connectionKind === 'storytelling-only'
      && connection.physicalRouteAuthority === 'none'
      && connection.disclosureAr === 'تسلسل قصصي — ليس مسارًا ميدانيًا معتمدًا'
    ))).toBe(true);
  });

  it('clears incompatible source context and restores the last candidate selection', () => {
    const candidateLayer = kapSpatialCommandExperience.sourceLayers.find((layer) => layer.truthStatus === 'candidate')!;
    const conceptLayer = kapSpatialCommandExperience.sourceLayers.find((layer) => layer.truthStatus === 'conceptual')!;
    const selected = {
      activeSourceLayerId: candidateLayer.sourceLayerId,
      visibleCandidateEntityId: 'ENTITY-KAP-OP-006',
      suspendedCandidateEntityId: 'ENTITY-KAP-OP-006'
    };
    const concept = switchSpatialSourceLayer(selected, conceptLayer.sourceLayerId, kapSpatialCommandExperience);
    expect(concept).toEqual({
      activeSourceLayerId: conceptLayer.sourceLayerId,
      visibleCandidateEntityId: null,
      suspendedCandidateEntityId: 'ENTITY-KAP-OP-006'
    });
    expect(switchSpatialSourceLayer(concept, candidateLayer.sourceLayerId, kapSpatialCommandExperience).visibleCandidateEntityId).toBe('ENTITY-KAP-OP-006');
  });

  it('resolves invalid deep links to safe project-local defaults', () => {
    const invalid = new URL('http://localhost/?workspace=spatial-command&mode=invalid&sourceLayer=SOURCE-UNKNOWN&candidateEntity=ENTITY-UNKNOWN&journeyStep=missing&viewMode=invalid');
    const result = resolveSpatialCommandRouteState(invalid, kapSpatialCommandExperience);
    expect(result.mode).toBe('experience');
    expect(result.sourceLayerId).toBe(kapSpatialCommandExperience.sourceLayers.find((layer) => layer.defaultVisible)!.sourceLayerId);
    expect(result.candidateEntityId).toBeNull();
    expect(result.correctionCodes).toEqual(expect.arrayContaining([
      'invalid-mode',
      'invalid-source-layer',
      'invalid-candidate-entity',
      'invalid-journey-step',
      'invalid-view-mode'
    ]));

    const executive = new URL('http://localhost/?mode=executive&candidateEntity=ENTITY-KAP-OP-001');
    expect(resolveSpatialCommandRouteState(executive, kapSpatialCommandExperience)).toMatchObject({
      mode: 'executive',
      candidateEntityId: null,
      correctionCodes: ['invalid-candidate-entity']
    });

    const authoring = new URL('http://localhost/?mode=experience&sourceLayer=SOURCE-LAYER-KAP-CANDIDATE-ZONING&edit=candidate-anchors&focus=map');
    expect(resolveSpatialCommandRouteState(authoring, kapSpatialCommandExperience)).toMatchObject({
      editingMode: 'candidate-anchors',
      focusMode: true,
      correctionCodes: []
    });
  });

  it('transitions play, pause, previous, next, reset, hide, and manual selection deterministically', () => {
    const steps = ['arrival', 'ages', 'show', 'media', 'dinner'];
    let state: SpatialJourneyPlaybackState = { stepId: 'arrival', playing: false, manuallySelectedEntityId: null };
    state = transitionSpatialJourneyState(state, { type: 'play' }, steps);
    expect(state.playing).toBe(true);
    state = transitionSpatialJourneyState(state, { type: 'advance' }, steps);
    expect(state).toMatchObject({ stepId: 'ages', playing: true });
    state = transitionSpatialJourneyState(state, { type: 'pause' }, steps);
    expect(state.playing).toBe(false);
    state = transitionSpatialJourneyState(state, { type: 'next' }, steps);
    expect(state.stepId).toBe('show');
    state = transitionSpatialJourneyState(state, { type: 'previous' }, steps);
    expect(state.stepId).toBe('ages');
    state = transitionSpatialJourneyState(state, { type: 'select-entity', candidateEntityId: 'ENTITY-001' }, steps);
    expect(state).toMatchObject({ playing: false, manuallySelectedEntityId: 'ENTITY-001' });
    state = transitionSpatialJourneyState(state, { type: 'hide' }, steps);
    expect(state.playing).toBe(false);
    expect(transitionSpatialJourneyState(state, { type: 'reset' }, steps)).toEqual({
      stepId: 'arrival',
      playing: false,
      manuallySelectedEntityId: null
    });
  });

  it('keeps the show unresolved and three landmarks independently classified', () => {
    const show = kapSpatialCommandExperience.narrativeJourney.steps.find((step) => step.experienceObjectId === 'ZONE-SHOW-001')!;
    const independent = kapSpatialCommandExperience.entityRelationships.find((relationship) => relationship.experienceObjectId === null)!;
    expect(show).toMatchObject({ status: 'unresolved', candidateEntityIds: [], narrativeOnly: true });
    expect(independent.state).toBe('unresolved');
    expect(independent.candidateEntityIds).toEqual([
      'ENTITY-KAP-OP-004',
      'ENTITY-KAP-OP-005',
      'ENTITY-KAP-OP-011'
    ]);
  });

  it('links executive blockers only to registered entities and experience objects', () => {
    const entityIds = new Set(kapSpatialCommandExperience.candidateEntities.map((entity) => entity.candidateId));
    const objectIds = new Set(kapSpatialCommandExperience.experienceObjects.map((object) => object.experienceObjectId));
    expect(kapSpatialCommandExperience.executiveBlockers).toHaveLength(8);
    expect(kapSpatialCommandExperience.executiveBlockers.every((blocker) => (
      blocker.affectedCandidateEntityIds.every((id) => entityIds.has(id))
      && blocker.affectedExperienceObjectIds.every((id) => objectIds.has(id))
    ))).toBe(true);
  });

  it('maps technical values to Arabic operator language', () => {
    expect(spatialOperatorLabel('duplicate-confirmed')).toBe('نسخة مطابقة موثقة');
    expect(spatialOperatorLabel('manual-derived-from-candidate-raster')).toBe('موضع مراجعة مشتق يدويًا');
    expect(spatialOperatorLabel('conflicted')).toBe('متعارض');
    expect(spatialOperatorLabel('unknown-code')).toContain('تفاصيل المصدر');
  });

  it('shows raw risk and fingerprint codes only when the technical drawer is open', () => {
    const props = {
      configuration: kapSpatialCommandExperience,
      returnFocusElement: null,
      onClose: vi.fn(),
      onOpenTechnicalRoute: vi.fn()
    };
    const { rerender } = render(<SourceTruthDrawer open={false} {...props} />);
    expect(screen.queryByTestId('source-truth-drawer')).not.toBeInTheDocument();
    expect(screen.queryByText('DRIVE-PERMISSION-ANONYMOUS-WRITER')).not.toBeInTheDocument();
    rerender(<SourceTruthDrawer open {...props} />);
    expect(screen.getByTestId('source-truth-drawer')).toBeInTheDocument();
    expect(screen.getByText('DRIVE-PERMISSION-ANONYMOUS-WRITER')).toBeInTheDocument();
    expect(screen.getAllByText(/1f37e95a7d00c38d/i).length).toBeGreaterThan(0);
  });

  it('keeps missing assets explicit and local previews optional', () => {
    const missing = kapSpatialCommandExperience.sourceLayers.find((layer) => layer.truthStatus === 'missing')!;
    const candidate = kapSpatialCommandExperience.sourceLayers.find((layer) => layer.truthStatus === 'candidate')!;
    expect(missing.previewUrl).toBeNull();
    expect(missing.operatorContext.titleAr).toContain('لم تُسلّم');
    expect(candidate.previewCommitted).toBe(false);
    expect(candidate.previewUrl).toMatch(/^\/local-assets\//);
  });

  it('prevents evidence from exposing GPS, identity, or readiness mutation', () => {
    expect(kapSpatialCommandExperience.evidenceSummary).toMatchObject({
      exactGpsExposed: false,
      personalIdentifiersExposed: false,
      readinessMutationAllowed: false
    });
    expect(JSON.stringify(kapSpatialCommandExperience.evidenceSummary)).not.toMatch(/"latitude"|"longitude"|"coordinates"/i);
  });

  it('rejects cross-project lookup instead of falling back to KAP or demo data', () => {
    expect(findSpatialCommandExperience(kapSpatialCommandExperience.configurationId, {
      projectId: 'PROJECT-REFERENCE-EXHIBITION-001',
      eventId: 'EVENT-EXHIBITION-DEMO-001',
      venueId: 'VENUE-EXHIBITION-DEMO-001'
    })).toBeNull();
    expect(findSpatialCommandExperience('SPATIAL-COMMAND-UNKNOWN', {
      projectId: kapSpatialCommandExperience.projectId,
      eventId: kapSpatialCommandExperience.eventId,
      venueId: kapSpatialCommandExperience.venueId
    })).toBeNull();
  });
});
