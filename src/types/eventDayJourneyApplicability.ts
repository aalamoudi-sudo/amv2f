export type EventDayJourneyStatus = 'candidate' | 'not-applicable';

export type EventDayContextRelationship =
  | 'single-event-context'
  | 'separate-ceremony-activation-contexts-no-shared-transition';

export interface EventDayJourneyApplicability {
  operationalJourneyStatus: EventDayJourneyStatus;
  visitorJourneyStatus: EventDayJourneyStatus;
  spatialRouteRequired: boolean;
  sharedVisitorTransitionRequired: boolean;
  contextRelationship: EventDayContextRelationship;
}

export interface ExperienceTruthCorrectionRevision extends EventDayJourneyApplicability {
  correctionId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  affectedDayId: string;
  revision: number;
  effectiveDate: string;
  recordedAt: string;
  timeTrust: 'founder-directed-date';
  authorityType: 'founder-product-authority';
  authorityReferenceId: string;
  approvedBy: string;
  approvalScope: 'operational-journey-applicability';
  previousProjectionId: string;
  previousContentHash: string;
  previousInterpretationAr: string;
  founderCorrectionAr: string;
  legalProjectionAr: string;
  futureTechnicalActivityBoundaryAr: string;
  supersededConflictIds: string[];
  contentHash: string;
}
