import type { DecisionRecord, EventId, VenueId } from './decision';
import type {
  AdapterType,
  CaptureEnvelope,
  InputAdapterType,
  OperationalRequirement
} from './integration';
import type { RouteDefinition } from './routes';
import type { ScenarioPlayerPackConfiguration } from './scenario';
import type {
  ApprovalStatus,
  EntityType,
  OperationalStateContext,
  SpatialEntity,
  SpatialEntityId,
  SpatialEntityRecord,
  Vector3Tuple,
  ZoneReadinessRecord
} from './spatial';

export const eventPackageSchemaVersion = '1.0.0' as const;
export const eventPackageIdentityVersion = 'v1' as const;
export const currentPlatformVersion = '0.1.0' as const;

export const referenceEventTypeValues = ['exhibition', 'conference', 'festival'] as const;
export type ReferenceEventType = (typeof referenceEventTypeValues)[number];

export const eventPackageStatusValues = ['draft', 'validated', 'approved', 'deprecated'] as const;
export type EventPackageStatus = (typeof eventPackageStatusValues)[number];

export const eventDataClassificationValues = ['temporary-demo', 'internal', 'restricted'] as const;
export type EventDataClassification = (typeof eventDataClassificationValues)[number];

export interface EventTemplate {
  eventTemplateId: string;
  eventType: string;
  lifecycleProfileId: string;
  defaultOperationalPackIds: string[];
  supportedSpatialEntityTypes: EntityType[];
  requiredRoleIds: string[];
}

export interface EventInstance {
  eventInstanceId: EventId;
  eventTemplateId: string;
  eventNameAr: string;
  eventNameEn: string;
  venueId: VenueId;
  startAt: string;
  endAt: string;
  timeZone: string;
  stateContext: OperationalStateContext;
}

export interface RoleDefinition {
  roleId: string;
  titleAr: string;
  titleEn: string;
  responsibility: string;
  allowedActionTypes: string[];
  allowedEntityTypes: EntityType[];
  operationalPackIds: string[];
  escalationTargets: string[];
  separationOfDutyTags: string[];
}

export interface AuthorityDefinition {
  authorityId: string;
  titleAr: string;
  titleEn: string;
  decisionCategories: DecisionRecord['decisionType'][];
  approvalLevels: string[];
  allowedStateContexts: OperationalStateContext[];
  requiredEvidenceTypes: string[];
  requiredRoleIds: string[];
  separationOfDutyRules: Array<{
    ruleId: string;
    actorRoleId: string;
    prohibitedCounterpartyRoleId: string;
    descriptionAr: string;
  }>;
}

export interface IntegrationProfileDefinition {
  integrationProfileId: string;
  titleAr: string;
  titleEn: string;
  direction: 'input' | 'output' | 'bidirectional';
  adapterType: AdapterType;
  adapterId: string;
  adapterVersion: string;
  sourceSystemIds: string[];
  requiredSchemaVersions: string[];
  requiredEntityTypes: EntityType[];
  requiredOperationalPackIds: string[];
  offlinePolicy: 'not-supported' | 'queue-local-preview' | 'manual-retry-preview';
  conflictPolicy: 'reject' | 'manual-review';
  evidencePolicy: 'optional' | 'required' | 'verified-required';
  provenancePolicy: 'reference-only' | 'connected-graph-required';
  outputProfileId: string | null;
  enabled: boolean;
  limitations: string[];
}

export interface ModelReferenceDefinition {
  modelReferenceId: string;
  format: 'procedural' | 'glb' | 'gltf' | 'openusd' | '3d-tiles';
  uri: string | null;
  mappingVersion: string;
  entityNodeMap: Record<string, string>;
}

export interface SpatialConfiguration {
  siteBoundaryId: SpatialEntityId;
  venueIds: VenueId[];
  entities: SpatialEntity[];
  localCoordinateSystem: {
    coordinateSystemId: string;
    unit: 'meter';
    handedness: 'right-handed';
    upAxis: 'z-up';
    runtimeAdapter: 'threejs-y-up-v1';
    origin: Vector3Tuple;
  };
  geographicReference: {
    crs: string;
    latitude: number;
    longitude: number;
    elevationMeters: number;
  } | null;
  modelReferences: ModelReferenceDefinition[];
  entityLabels: Record<string, string>;
  spatialMappingVersion: string;
  projectionProfileVersion: string;
  physicalOutputMappingVersion: string;
}

export interface RouteConfiguration {
  routes: RouteDefinition[];
}

export interface OperationalPackDefinition {
  packId: string;
  packVersion: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  capabilityIds: string[];
  requiredPackIds: string[];
  optionalPackIds: string[];
  incompatiblePackIds: string[];
  requiredEntityTypes: EntityType[];
  requiredRoleIds: string[];
  requiredAuthorityIds: string[];
  requiredIntegrationProfileIds: string[];
  requiredOutputProfileIds: string[];
  configurationSchemaVersion: string;
  status: 'active' | 'experimental' | 'deprecated';
  limitations: string[];
}

export interface OperationalPackConfiguration {
  enabledPackIds: string[];
  configurationByPackId: Record<string, OperationalPackRuntimeConfiguration>;
}

export interface OperationalPackRuntimeConfiguration {
  packVersion: string;
  stateContext: 'temporary-demo';
  scenarioPlayer?: ScenarioPlayerPackConfiguration;
}

export interface ProjectionProfileDefinition {
  projectionProfileId: string;
  titleAr: string;
  projectionConfigurationVersion: string;
  spatialMappingVersion: string;
  outputProfileId: string;
  labelsVisible: boolean;
  routesVisible: boolean;
  statusColorsVisible: boolean;
  limitations: string[];
}

export interface PhysicalOutputProfileDefinition {
  physicalOutputProfileId: string;
  titleAr: string;
  coreStandardId: 'MEIOS-PDT-STD-001';
  coreStandardVersion: '1.0.0';
  approvedEquipmentListVersion: string;
  deploymentProfileId: string;
  modelManifestId: string | null;
  spatialMappingVersion: string;
  projectionProfileVersion: string;
  physicalOutputMappingVersion: string;
  outputProfileId: string;
  deviceId: null;
  calibrationStatus: 'not-configured';
  waiverIds: string[];
  limitations: string[];
}

export interface TemporaryDemoSeedRecord<T> {
  seedId: string;
  stateContext: 'temporary-demo';
  source: string;
  createdAt: string;
  createdBy: string;
  approvalStatus: ApprovalStatus;
  revision: number;
  dataClassification: 'temporary-demo';
  record: T;
}

export interface TemporaryDemoSeedData {
  readinessRecords: Array<TemporaryDemoSeedRecord<ZoneReadinessRecord>>;
  decisionRecords: Array<TemporaryDemoSeedRecord<DecisionRecord>>;
  captureFixtures: Array<TemporaryDemoSeedRecord<CaptureEnvelope>>;
}

export interface EventPackageDependency {
  packageId: string;
  versionRange: string;
}

export interface EventPackage {
  packageId: string;
  packageVersion: string;
  schemaVersion: typeof eventPackageSchemaVersion;
  packageContentHash: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  eventType: string;
  stateContext: 'temporary-demo';
  packageStatus: EventPackageStatus;
  dataClassification: 'temporary-demo';
  minimumPlatformVersion: string;
  maximumPlatformVersion: string;
  requiredCapabilityIds: string[];
  incompatibleCapabilityIds: string[];
  eventTemplate: EventTemplate;
  eventInstance: EventInstance;
  spatialConfiguration: SpatialConfiguration;
  routeConfiguration: RouteConfiguration;
  requirementConfiguration: OperationalRequirement[];
  operationalPackConfiguration: OperationalPackConfiguration;
  roleConfiguration: RoleDefinition[];
  authorityConfiguration: AuthorityDefinition[];
  integrationProfileConfiguration: IntegrationProfileDefinition[];
  projectionProfileConfiguration: ProjectionProfileDefinition[];
  physicalOutputProfileConfiguration: PhysicalOutputProfileDefinition[];
  temporaryDemoSeedData: TemporaryDemoSeedData;
  createdAt: string;
  createdBy: string;
  source: string;
  approvalStatus: ApprovalStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  revision: number;
  changeReason: string;
  dependencies: EventPackageDependency[];
  previewGeneratedAt?: string;
}

export interface EventRuntimeIdentity {
  packageId: string;
  packageVersion: string;
  packageContentHash: string;
  eventInstanceId: EventId;
  eventTemplateId: string;
  eventType: string;
  eventNameAr: string;
  eventNameEn: string;
  venueId: VenueId;
  stateContext: 'temporary-demo';
  dataClassification: 'temporary-demo';
}

export interface EventRuntimeConfiguration {
  identity: EventRuntimeIdentity;
  entities: SpatialEntityRecord;
  entityLabels: Record<string, string>;
  routes: RouteDefinition[];
  requirements: OperationalRequirement[];
  roles: RoleDefinition[];
  authorities: AuthorityDefinition[];
  enabledOperationalPacks: OperationalPackDefinition[];
  operationalPackConfiguration: OperationalPackConfiguration;
  integrationProfiles: IntegrationProfileDefinition[];
  integrationProfilesCanonical: string;
  captureFixtures: CaptureEnvelope[];
  scenarioConfigurationCanonical: string | null;
  projectionProfiles: ProjectionProfileDefinition[];
  physicalOutputProfiles: PhysicalOutputProfileDefinition[];
  spatialConfiguration: Pick<SpatialConfiguration,
    | 'siteBoundaryId'
    | 'venueIds'
    | 'localCoordinateSystem'
    | 'geographicReference'
    | 'modelReferences'
    | 'spatialMappingVersion'
    | 'projectionProfileVersion'
    | 'physicalOutputMappingVersion'
  >;
  readinessRecords: ZoneReadinessRecord[];
  decisions: DecisionRecord[];
  scopeKey: string;
}

export type EventPackageValidationSeverity = 'blocking' | 'warning';

export interface EventPackageValidationIssue {
  code: string;
  path: string;
  messageAr: string;
  severity: EventPackageValidationSeverity;
}

export interface EventPackageValidationResult {
  valid: boolean;
  schemaValid: boolean;
  contentHashValid: boolean;
  issues: EventPackageValidationIssue[];
  runtime: EventRuntimeConfiguration | null;
}

export interface OperationalPackResolution {
  valid: boolean;
  orderedPacks: OperationalPackDefinition[];
  issues: EventPackageValidationIssue[];
}

export interface EventPackageDifference {
  field: string;
  labelAr: string;
  previousValue: string;
  nextValue: string;
}

export interface EventPackageActivationHistoryEntry {
  activationId: string;
  packageId: string;
  packageContentHash: string;
  activatedAt: string;
  activatedBy: 'local-demo-operator';
  outcome: 'activated' | 'blocked' | 'rolled-back' | 'reset';
  reasonAr: string;
}

export interface EventPackageActivationSnapshot {
  activeRuntime: EventRuntimeConfiguration | null;
  previousRuntime: EventRuntimeConfiguration | null;
  history: EventPackageActivationHistoryEntry[];
}

export interface EventPackageImportPreview {
  rawJson: string;
  parsedPackage: EventPackage | null;
  validation: EventPackageValidationResult | null;
  differences: EventPackageDifference[];
}

export function isInputIntegrationProfile(
  profile: IntegrationProfileDefinition
): profile is IntegrationProfileDefinition & { adapterType: InputAdapterType } {
  return profile.direction === 'input' || profile.direction === 'bidirectional';
}
