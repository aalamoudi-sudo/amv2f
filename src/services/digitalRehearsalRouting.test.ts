import { describe, expect, it } from 'vitest';
import { kapDigitalRehearsalPlan } from '../data/digitalRehearsalPlans';
import { resolveDigitalRehearsalSelection, writeDigitalRehearsalSelectionToUrl } from './digitalRehearsalRouting';

describe('digital rehearsal deep-link isolation', () => {
  it('uses explicit defaults only when nested selection parameters are absent', () => {
    const result = resolveDigitalRehearsalSelection(new URL('http://localhost/?workspace=experience-rehearsal'), kapDigitalRehearsalPlan);
    expect(result.valid).toBe(true);
    expect(result.selection?.eventDayId).toBe(kapDigitalRehearsalPlan.eventDays[0]!.eventDayId);
  });

  it('round-trips day persona moment lens view site and run', () => {
    const day = kapDigitalRehearsalPlan.eventDays[1]!;
    const selection = { eventDayId: day.eventDayId, personaVariantId: day.personaVariantIds[3]!, runId: 'REHEARSAL-RUN-020', momentId: day.momentIds[4]!, lens: 'operations' as const, view: 'scene' as const, siteCandidateId: day.siteCandidateIds[0]!, scenarioId: kapDigitalRehearsalPlan.scenarioId };
    const url = writeDigitalRehearsalSelectionToUrl(new URL('http://localhost/?workspace=experience-rehearsal&project=PROJECT-KAP-OPENING-2026'), selection);
    expect(resolveDigitalRehearsalSelection(url, kapDigitalRehearsalPlan).selection).toEqual(selection);
  });

  it.each([
    ['rehearsalDay', 'DAY-FOREIGN'],
    ['rehearsalPersona', 'PERSONA-FOREIGN'],
    ['rehearsalMoment', 'MOMENT-FOREIGN'],
    ['rehearsalLens', 'live'],
    ['rehearsalView', 'dashboard'],
    ['rehearsalSite', 'SITE-FOREIGN'],
    ['rehearsalScenario', 'SCENARIO-FOREIGN']
  ])('rejects malformed or foreign %s without demo fallback', (key, value) => {
    const day = kapDigitalRehearsalPlan.eventDays[0]!;
    const url = new URL('http://localhost/?workspace=experience-rehearsal');
    url.searchParams.set('rehearsalDay', day.eventDayId);
    url.searchParams.set('rehearsalPersona', day.personaVariantIds[0]!);
    url.searchParams.set('rehearsalMoment', day.momentIds[0]!);
    url.searchParams.set(key, value);
    const result = resolveDigitalRehearsalSelection(url, kapDigitalRehearsalPlan);
    expect(result.valid).toBe(false);
    expect(result.selection).toBeNull();
    expect(result.messageAr).toContain('لم يُستخدم');
  });
});
