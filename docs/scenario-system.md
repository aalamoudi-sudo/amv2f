# Scenario System

Scenarios are structured scripted exercises, not simulations and not large UI components.

Each exercise contains:

- `id`
- `nameAr`
- `nameEn`
- `descriptionAr`
- `steps`

Each step may include:

- Arabic title and message.
- Duration.
- Entity camera focus.
- Highlighted entity IDs.
- Routes to show or hide.
- Entity status, readiness, or risk changes.

Step changes apply to the current scenario view while the store retains the baseline snapshot separately. Stopping or resetting the exercise restores the baseline; scenario output is not operational evidence.

The runner is split between:

- `src/data/scenarios.ts` for definitions.
- `src/services/scenarioEngine.ts` for pure helpers.
- `src/hooks/useScenarioRunner.ts` for timed playback.
- `src/store/useEventStore.ts` for applying actions.

Demo scenarios:

- رحلة الزائر
- جاهزية الموقع
- الإخلاء
