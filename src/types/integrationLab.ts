import type {
  ActionDefinition,
  ActionSubmission,
  CanonicalEvidenceReference,
  CanonicalProjectionOptions,
  CaptureEnvelope,
  GovernedActionFixtureKind,
  InputAdapter,
  OperationalEvent,
  OperationalRequirement,
  OutputAdapter,
  PhysicalSceneCommand,
  ProjectionOutputOptions,
  ProvenanceBundle,
  SpatialOutputCommand
} from './integration';
import type { SpatialEntityId } from './spatial';

export interface IntegrationLabEntityDefinition {
  entityId: SpatialEntityId;
  labelAr: string;
}

export interface IntegrationLabConfiguration<TFixtureKind extends string = string> {
  configurationId: string;
  eventId: string;
  venueId: string;
  runtimeContext?: {
    packageId: string;
    eventNameAr: string;
    stateContext: 'temporary-demo';
    roleIds: string[];
    authorityIds: string[];
    integrationProfileIds: string[];
    projectionProfileId: string | null;
    physicalOutputProfileId: string | null;
  };
  entities: IntegrationLabEntityDefinition[];
  labels: Record<string, string>;
  requirements: OperationalRequirement[];
  actionDefinitions: ActionDefinition[];
  evidenceFixtures: CanonicalEvidenceReference[];
  provenanceFixtures: ProvenanceBundle[];
  inputAdapters: InputAdapter[];
  outputAdapters: Array<OutputAdapter<SpatialOutputCommand> | OutputAdapter<PhysicalSceneCommand>>;
  routeMappings: Record<string, SpatialEntityId[]>;
  projectionProfile: Omit<CanonicalProjectionOptions, 'entityLabels' | 'requirements'>;
  physicalOutputProfile: ProjectionOutputOptions;
  createFixture(kind: TFixtureKind): Promise<CaptureEnvelope>;
  createConformanceEnvelope(adapterId: string): Promise<CaptureEnvelope>;
  createActionSubmission(kind: GovernedActionFixtureKind): Promise<ActionSubmission>;
  createActionEvent(submission: ActionSubmission, revision: number): OperationalEvent;
  eventFactoryFailureCounts?: Record<string, number>;
}
