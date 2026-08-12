import type { MissionContext, MissionGraphProjection } from '../types/missionControl';

export type MissionAdvisorCapability = 'explain' | 'compare' | 'simulate' | 'draftRecommendation';

export interface MissionAdvisorRequest {
  capability: MissionAdvisorCapability;
  context: MissionContext;
  projection: MissionGraphProjection;
  questionAr: string;
}

export interface MissionAdvisorResponse {
  explanationAr: string;
  sources: string[];
  assumptionsAr: string[];
  confidence: 'high' | 'medium' | 'low' | 'unknown';
  alternativesAr: string[];
  expectedImpactAr: string;
  humanAuthorityRequiredAr: string;
  approvalAllowed: false;
  evidenceVerificationAllowed: false;
  readinessMutationAllowed: false;
  baselineMutationAllowed: false;
  deviceControlAllowed: false;
  openingDecisionAllowed: false;
}

/** Replaceable future boundary only. No provider is connected in Mission Canvas RC1. */
export interface MissionAdvisor {
  readonly providerId: string;
  readonly capabilities: readonly MissionAdvisorCapability[];
  advise(request: MissionAdvisorRequest): Promise<MissionAdvisorResponse>;
}
