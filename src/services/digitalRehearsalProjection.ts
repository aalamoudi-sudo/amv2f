import { sha256PayloadSync } from './integrationHash';
import { validateDigitalRehearsalSchema } from './digitalRehearsalSchema';
import type {
  DigitalRehearsalOutputProjection,
  DigitalRehearsalPlan,
  DigitalRehearsalRun,
  PersonaJourneyVariant,
  ProgramMoment,
  RehearsalMomentState,
  RehearsalProjection,
  RehearsalTimeTrust
} from '../types/digitalRehearsal';

export interface RehearsalProjectionTruthInput {
  readinessDisposition: 'cannot-determine' | 'not-applicable-to-reference';
  readinessExplanationAr: string;
  knownDecisionIds: readonly string[];
  knownEvidenceIds: readonly string[];
  sceneAvailabilityByAssetId: Readonly<Record<string, 'available-candidate' | 'missing' | 'unknown'>>;
  outputTimestamp: string;
  outputTimestampClassification: RehearsalTimeTrust;
}

function projectionIdentity(input: Omit<RehearsalProjection, 'projectionVersion'>): string {
  return sha256PayloadSync({
    projectId: input.projectId,
    eventId: input.eventId,
    venueId: input.venueId,
    planId: input.planId,
    runId: input.runId,
    eventDayId: input.eventDayId,
    personaVariantId: input.personaVariantId,
    momentId: input.momentId,
    selectedSiteId: input.selectedSiteId,
    activeBranchId: input.activeBranchId,
    runState: input.runState,
    momentState: input.momentState,
    rehearsalClock: input.rehearsalClock,
    readinessSummary: input.readinessSummary,
    decisionSummary: input.decisionSummary,
    evidenceSummary: input.evidenceSummary,
    visualState: input.visualState,
    cueState: input.cueState,
    actualExecution: false,
    mutationAllowed: false
  });
}

function sceneStatus(moment: ProgramMoment, input: RehearsalProjectionTruthInput): RehearsalProjection['visualState']['sceneStatus'] {
  if (!moment.sceneAssetIds.length) return 'missing';
  const states = moment.sceneAssetIds.map((assetId) => input.sceneAvailabilityByAssetId[assetId] ?? 'unknown');
  return states.includes('available-candidate') ? 'available-candidate' : states.every((state) => state === 'missing') ? 'missing' : 'unknown';
}

export function createRehearsalProjection(input: {
  plan: DigitalRehearsalPlan;
  run: DigitalRehearsalRun | null;
  eventDayId: string;
  personaVariantId: string;
  momentId: string;
  truth: RehearsalProjectionTruthInput;
}): RehearsalProjection {
  const { plan, run } = input;
  const day = plan.eventDays.find((candidate) => candidate.eventDayId === input.eventDayId);
  const persona = plan.personaVariants.find((candidate) => candidate.personaVariantId === input.personaVariantId && candidate.eventDayId === input.eventDayId);
  const moment = plan.moments.find((candidate) => candidate.momentId === input.momentId && candidate.eventDayId === input.eventDayId);
  if (!day || !persona || !moment) throw new Error('REHEARSAL_PROJECTION_CONTEXT_INVALID');
  const momentIndex = day.momentIds.indexOf(moment.momentId);
  const nextMoment = plan.moments.find((candidate) => candidate.momentId === day.momentIds[momentIndex + 1]) ?? null;
  const knownDecisions = new Set(input.truth.knownDecisionIds);
  const knownEvidence = new Set(input.truth.knownEvidenceIds);
  const decisionIds = moment.relatedDecisionIds.filter((id) => knownDecisions.has(id));
  const evidenceIds = moment.relatedEvidenceIds.filter((id) => knownEvidence.has(id));
  const momentState: RehearsalMomentState = run?.momentStates[moment.momentId] ?? (momentIndex === 0 ? 'current' : 'pending');
  const base: Omit<RehearsalProjection, 'projectionVersion'> = {
    projectId: plan.projectId,
    eventId: plan.eventId,
    venueId: plan.venueId,
    planId: plan.planId,
    runId: run?.runId ?? null,
    eventDayId: day.eventDayId,
    personaId: persona.personaId,
    personaVariantId: persona.personaVariantId,
    momentId: moment.momentId,
    journeyStepId: moment.journeyStepId,
    touchpointId: moment.touchpointId,
    selectedZoneIds: [...moment.relatedZoneIds],
    selectedEntityIds: [...moment.relatedEntityIds],
    selectedSiteId: run?.selectedSiteId ?? moment.siteCandidateId,
    mapFocus: {
      status: moment.spatialStatus === 'unresolved-no-anchor' ? 'unresolved' : moment.relatedEntityIds.length ? 'candidate-entity-selection' : 'semantic-only',
      entityIds: [...moment.relatedEntityIds],
      normalizedAnchor: null,
      routeAuthority: 'none'
    },
    sceneAssetId: moment.sceneAssetIds[0] ?? null,
    activeBranchId: run?.activeBranchId ?? null,
    runState: run?.state ?? 'not-started',
    momentState,
    rehearsalClock: run?.clock ?? {
      mode: 'manual-step',
      plannedTime: moment.plannedTime,
      rehearsalElapsedSeconds: 0,
      actualTime: null,
      actualTimeStatus: 'unavailable',
      deviceClockAuthority: 'none'
    },
    readinessSummary: {
      disposition: input.truth.readinessDisposition,
      explanationAr: input.truth.readinessExplanationAr,
      requirementIds: [...moment.relatedRequirementIds]
    },
    decisionSummary: { decisionIds, draftLinkIds: run?.decisionDraftLinks.filter((link) => link.momentId === moment.momentId).map((link) => link.linkId) ?? [], approvalMutationAllowed: false },
    evidenceSummary: { evidenceIds, verificationMutationAllowed: false },
    narrativeState: {
      currentAr: moment.labelAr,
      nextAr: nextMoment?.labelAr ?? null,
      truthLabelAr: 'تسلسل قصصي مرشح - ليس مسارًا ميدانيًا أو برنامجًا تشغيليًا معتمدًا'
    },
    visualState: { spatialStatus: moment.spatialStatus, sceneStatus: sceneStatus(moment, input.truth) },
    cueState: { cueIds: [...moment.cueIds], completed: momentState === 'completed' },
    colorSemantics: 'status-labels-primary-color-secondary',
    outputTimestamp: input.truth.outputTimestamp,
    outputTimestampClassification: input.truth.outputTimestampClassification,
    actualExecution: false,
    mutationAllowed: false
  };
  return { ...base, projectionVersion: projectionIdentity(base) };
}

export function createDigitalRehearsalOutputProjection(projection: RehearsalProjection): DigitalRehearsalOutputProjection {
  const output: DigitalRehearsalOutputProjection = {
    ...structuredClone(projection),
    physicalStandardId: 'MEIOS-PDT-STD-001',
    physicalStandardVersion: '1.0.0',
    calibrationStatus: 'not-calibrated',
    hardwareControlAllowed: false,
    procurementAuthorized: false
  };
  const schema = validateDigitalRehearsalSchema('rehearsal-projection-export', output);
  if (!schema.valid) throw new Error('REHEARSAL_OUTPUT_PROJECTION_INVALID');
  return output;
}

export interface RehearsalOutputAdapterResult {
  adapterId: 'screen' | 'story-map' | 'spatial-map' | 'scene-viewer' | 'projection-preview' | 'physical-twin-preview';
  projectionVersion: string;
  projectId: string;
  eventId: string;
  momentId: string;
  delivered: true;
  hardwareCommandIssued: false;
  calibrationClaimed: false;
}

export interface DigitalRehearsalOutputAdapter {
  readonly adapterId: RehearsalOutputAdapterResult['adapterId'];
  project(projection: DigitalRehearsalOutputProjection): RehearsalOutputAdapterResult;
}

abstract class PreviewOnlyAdapter implements DigitalRehearsalOutputAdapter {
  abstract readonly adapterId: RehearsalOutputAdapterResult['adapterId'];
  project(projection: DigitalRehearsalOutputProjection): RehearsalOutputAdapterResult {
    return {
      adapterId: this.adapterId,
      projectionVersion: projection.projectionVersion,
      projectId: projection.projectId,
      eventId: projection.eventId,
      momentId: projection.momentId,
      delivered: true,
      hardwareCommandIssued: false,
      calibrationClaimed: false
    };
  }
}

export class ScreenOutputAdapter extends PreviewOnlyAdapter { readonly adapterId = 'screen' as const; }
export class StoryMapOutputAdapter extends PreviewOnlyAdapter { readonly adapterId = 'story-map' as const; }
export class SpatialMapOutputAdapter extends PreviewOnlyAdapter { readonly adapterId = 'spatial-map' as const; }
export class SceneViewerOutputAdapter extends PreviewOnlyAdapter { readonly adapterId = 'scene-viewer' as const; }
export class ProjectionPreviewAdapter extends PreviewOnlyAdapter { readonly adapterId = 'projection-preview' as const; }
export class PhysicalTwinPreviewAdapter extends PreviewOnlyAdapter { readonly adapterId = 'physical-twin-preview' as const; }

export function projectToAllRehearsalOutputs(projection: RehearsalProjection): RehearsalOutputAdapterResult[] {
  const output = createDigitalRehearsalOutputProjection(projection);
  const adapters: DigitalRehearsalOutputAdapter[] = [
    new ScreenOutputAdapter(),
    new StoryMapOutputAdapter(),
    new SpatialMapOutputAdapter(),
    new SceneViewerOutputAdapter(),
    new ProjectionPreviewAdapter(),
    new PhysicalTwinPreviewAdapter()
  ];
  return adapters.map((adapter) => adapter.project(output));
}

export function resolveProjectionPersona(plan: DigitalRehearsalPlan, personaVariantId: string): PersonaJourneyVariant | null {
  return plan.personaVariants.find((candidate) => candidate.personaVariantId === personaVariantId) ?? null;
}
