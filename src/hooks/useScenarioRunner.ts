import { useEffect } from 'react';
import { selectRuntimeScenarios, useEventStore } from '../store/useEventStore';

export function useScenarioRunner(): void {
  const runtime = useEventStore((state) => state.scenarioRuntime);
  const scenarios = useEventStore(selectRuntimeScenarios);
  const advanceScenario = useEventStore((state) => state.advanceScenario);

  useEffect(() => {
    if (runtime.playback !== 'playing' || !runtime.scenarioId) {
      return undefined;
    }

    const scenario = scenarios.find((item) => item.id === runtime.scenarioId);
    const step = scenario?.steps[runtime.stepIndex];

    if (!step) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      advanceScenario();
    }, step.durationMs);

    return () => window.clearTimeout(timeoutId);
  }, [advanceScenario, runtime.playback, runtime.scenarioId, runtime.stepIndex, runtime.lastAppliedStepId, scenarios]);
}
