import {
  rehearsalLensValues,
  rehearsalViewValues,
  type DigitalRehearsalPlan,
  type RehearsalLens,
  type RehearsalView
} from '../types/digitalRehearsal';

export interface DigitalRehearsalSelection {
  eventDayId: string;
  personaVariantId: string;
  runId: string | null;
  momentId: string;
  lens: RehearsalLens;
  view: RehearsalView;
  siteCandidateId: string | null;
  scenarioId: string;
}

export interface DigitalRehearsalSelectionResult {
  valid: boolean;
  selection: DigitalRehearsalSelection | null;
  messageAr: string | null;
}

function explicitOrDefault<T extends string>(
  explicit: string | null,
  allowed: readonly T[],
  fallback: T,
  labelAr: string
): { valid: true; value: T } | { valid: false; messageAr: string } {
  if (!explicit) return { valid: true, value: fallback };
  if (!allowed.includes(explicit as T)) return { valid: false, messageAr: `${labelAr} المطلوب غير معروف؛ لم يُستخدم بديل تلقائي.` };
  return { valid: true, value: explicit as T };
}

export function resolveDigitalRehearsalSelection(url: URL, plan: DigitalRehearsalPlan): DigitalRehearsalSelectionResult {
  const day = explicitOrDefault(url.searchParams.get('rehearsalDay'), plan.eventDays.map((item) => item.eventDayId), plan.eventDays[0]!.eventDayId, 'يوم البروفة');
  if (!day.valid) return { valid: false, selection: null, messageAr: day.messageAr };
  const eventDay = plan.eventDays.find((item) => item.eventDayId === day.value)!;
  const persona = explicitOrDefault(url.searchParams.get('rehearsalPersona'), eventDay.personaVariantIds, eventDay.personaVariantIds[0]!, 'منظور الشخصية');
  if (!persona.valid) return { valid: false, selection: null, messageAr: persona.messageAr };
  const moment = explicitOrDefault(url.searchParams.get('rehearsalMoment'), eventDay.momentIds, eventDay.momentIds[0]!, 'لحظة البرنامج');
  if (!moment.valid) return { valid: false, selection: null, messageAr: moment.messageAr };
  const lens = explicitOrDefault(url.searchParams.get('rehearsalLens'), rehearsalLensValues, 'visitor', 'عدسة البروفة');
  if (!lens.valid) return { valid: false, selection: null, messageAr: lens.messageAr };
  const view = explicitOrDefault(url.searchParams.get('rehearsalView'), rehearsalViewValues, 'command', 'عرض البروفة');
  if (!view.valid) return { valid: false, selection: null, messageAr: view.messageAr };
  const scenario = url.searchParams.get('rehearsalScenario');
  if (scenario && scenario !== plan.scenarioId) return { valid: false, selection: null, messageAr: 'سيناريو البروفة لا يطابق الخطة النشطة؛ لم يُستخدم سيناريو بديل.' };
  const requestedSite = url.searchParams.get('rehearsalSite');
  if (requestedSite && !eventDay.siteCandidateIds.includes(requestedSite)) return { valid: false, selection: null, messageAr: 'موقع البروفة لا ينتمي إلى اليوم المحدد؛ لم يُستخدم موقع بديل.' };
  return {
    valid: true,
    messageAr: null,
    selection: {
      eventDayId: eventDay.eventDayId,
      personaVariantId: persona.value,
      runId: url.searchParams.get('rehearsalRun'),
      momentId: moment.value,
      lens: lens.value,
      view: view.value,
      siteCandidateId: requestedSite,
      scenarioId: plan.scenarioId
    }
  };
}

export function writeDigitalRehearsalSelectionToUrl(current: URL, selection: DigitalRehearsalSelection): URL {
  const url = new URL(current.href);
  url.searchParams.set('rehearsalDay', selection.eventDayId);
  url.searchParams.set('rehearsalPersona', selection.personaVariantId);
  url.searchParams.set('rehearsalMoment', selection.momentId);
  url.searchParams.set('rehearsalLens', selection.lens);
  url.searchParams.set('rehearsalView', selection.view);
  url.searchParams.set('rehearsalScenario', selection.scenarioId);
  if (selection.runId) url.searchParams.set('rehearsalRun', selection.runId);
  else url.searchParams.delete('rehearsalRun');
  if (selection.siteCandidateId) url.searchParams.set('rehearsalSite', selection.siteCandidateId);
  else url.searchParams.delete('rehearsalSite');
  return url;
}
