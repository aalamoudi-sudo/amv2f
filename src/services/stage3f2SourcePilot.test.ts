import { describe, expect, it } from 'vitest';
import type { Stage3F2SourceManifest } from '../types/stage3f2';
import { stage3f2PilotTemplate, stage3f2PilotStatusText, validateStage3F2SourceManifest } from './stage3f2SourcePilot';

function syntheticReadyManifest(): Stage3F2SourceManifest {
  return {
    ...stage3f2PilotTemplate,
    pilotId: 'CONFORMANCE-ONLY',
    eventId: 'EVENT-CONFORMANCE',
    venueId: 'VENUE-CONFORMANCE',
    entityId: 'ZONE-CONFORMANCE-001',
    zoneId: 'ZONE-CONFORMANCE-001',
    sourceId: 'SOURCE-CONFORMANCE',
    deviceId: 'DEVICE-CONFORMANCE',
    datastreamId: 'DATASTREAM-CONFORMANCE',
    sourceOwner: 'AUTOMATED-CONFORMANCE',
    technicalOwner: 'AUTOMATED-CONFORMANCE',
    approvedBy: 'AUTOMATED-CONFORMANCE',
    approvalDate: '2026-07-19',
    approvedScope: 'metadata-only',
    protocol: 'http-json-polling',
    authenticationMethod: 'server-side credential reference',
    environmentVariableNames: ['STAGE3F2_SOURCE_ENDPOINT', 'STAGE3F2_SOURCE_AUTH_REFERENCE'],
    observationFields: ['occupancyCount'],
    units: ['count'],
    expectedFrequencySeconds: 60,
    timePolicy: 'reported source time and gateway receipt time remain distinct',
    retentionPolicy: 'explicit policy required',
    privacyClassification: 'restricted',
    networkBoundary: 'approved boundary required',
    rollbackOwner: 'AUTOMATED-CONFORMANCE',
    pilotStart: '2026-07-19',
    pilotEnd: '2026-07-20',
    successThresholds: ['schema-valid observation'],
    accessAvailable: true,
    realSourceApproved: true
  };
}

describe('Stage 3F.2 controlled source pilot', () => {
  it('keeps the blank template blocked without fabricating approval, access, or a mapping', () => {
    const validation = validateStage3F2SourceManifest(stage3f2PilotTemplate);
    expect(stage3f2PilotStatusText()).toBe('READY_FOR_REAL_SOURCE');
    expect(validation.readyForRealSource).toBe(false);
    expect(validation.blockers).toContain('حقل eventId مطلوب.');
    expect(validation.blockers).toContain('حقل entityId أو zoneId مطلوب.');
    expect(validation.blockers).toContain('لا توجد موافقة مكتوبة على مصدر خارجي حقيقي.');
    expect(validation.blockers).toContain('لا يوجد وصول فعلي إلى المصدر الخارجي.');
    expect(stage3f2PilotTemplate.zoneId).toBeNull();
  });

  it('requires metadata-only fields without storing a source endpoint or credential', () => {
    expect(stage3f2PilotTemplate.observationFields).toEqual([]);
    expect(stage3f2PilotTemplate.observationFields).not.toContain('rawVideo');
    expect(stage3f2PilotTemplate.environmentVariableNames).toEqual([]);
    expect(stage3f2PilotTemplate.accessAvailable).toBe(false);
    expect(stage3f2PilotTemplate.realSourceApproved).toBe(false);
  });

  it('recognizes a synthetic conformance manifest without changing the persistent pilot status', () => {
    const manifest = syntheticReadyManifest();
    const validation = validateStage3F2SourceManifest(manifest);
    expect(validation.readyForRealSource).toBe(true);
    expect(validateStage3F2SourceManifest({ ...manifest, entityId: null }).readyForRealSource).toBe(true);
    expect(stage3f2PilotStatusText()).toBe('READY_FOR_REAL_SOURCE');
  });
});
