import type { DigitalRehearsalState, ExperiencePack, JourneyVariant } from '../types/experienceTwin';

export const digitalRehearsalTruthLabel = 'تسلسل مرشح للمراجعة، وليس محاكاة تشغيلية حية' as const;

export function createDigitalRehearsalState(pack: ExperiencePack): DigitalRehearsalState {
  return {
    status: 'idle',
    eventDayId: pack.defaultSelection.eventDayId,
    personaId: pack.defaultSelection.personaId,
    journeyId: pack.defaultSelection.journeyId,
    currentJourneyStepId: pack.defaultSelection.journeyStepId,
    comparedEventDayId: null,
    sequenceRevision: 1,
    truthLabelAr: digitalRehearsalTruthLabel
  };
}

function resolveJourney(pack: ExperiencePack, state: DigitalRehearsalState): JourneyVariant | null {
  return pack.journeys.find((journey) => journey.journeyId === state.journeyId && journey.eventDayId === state.eventDayId) ?? null;
}

export type DigitalRehearsalAction =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'reset' }
  | { type: 'select-step'; journeyStepId: string }
  | { type: 'select-journey'; eventDayId: string; personaId: string; journeyId: string }
  | { type: 'compare-day'; eventDayId: string | null };

export function reduceDigitalRehearsal(pack: ExperiencePack, state: DigitalRehearsalState, action: DigitalRehearsalAction): DigitalRehearsalState {
  const journey = resolveJourney(pack, state);
  const sequence = journey?.journeyStepIds ?? [];
  const currentIndex = Math.max(0, sequence.indexOf(state.currentJourneyStepId ?? ''));
  if (action.type === 'play') return { ...state, status: sequence.length ? 'playing' : 'idle' };
  if (action.type === 'pause') return { ...state, status: state.status === 'playing' ? 'paused' : state.status };
  if (action.type === 'reset') return createDigitalRehearsalState(pack);
  if (action.type === 'compare-day') return { ...state, comparedEventDayId: action.eventDayId };
  if (action.type === 'select-journey') {
    const nextJourney = pack.journeys.find((candidate) => candidate.journeyId === action.journeyId && candidate.eventDayId === action.eventDayId && candidate.personaId === action.personaId);
    if (!nextJourney) return state;
    return { ...state, status: 'paused', eventDayId: action.eventDayId, personaId: action.personaId, journeyId: action.journeyId, currentJourneyStepId: nextJourney.journeyStepIds[0] ?? null, sequenceRevision: state.sequenceRevision + 1 };
  }
  if (action.type === 'select-step') {
    if (!sequence.includes(action.journeyStepId)) return state;
    return { ...state, status: 'paused', currentJourneyStepId: action.journeyStepId };
  }
  if (!sequence.length) return state;
  const delta = action.type === 'next' ? 1 : -1;
  const nextIndex = Math.min(sequence.length - 1, Math.max(0, currentIndex + delta));
  return {
    ...state,
    currentJourneyStepId: sequence[nextIndex] ?? state.currentJourneyStepId,
    status: action.type === 'next' && nextIndex === sequence.length - 1 ? 'completed' : 'paused'
  };
}
