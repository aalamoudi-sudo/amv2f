import { Pause, Play, RotateCcw, SkipForward, Square } from 'lucide-react';
import { isOperationalPackEnabled, selectRuntimeScenarioConfiguration, selectRuntimeScenarios, useEventStore } from '../../store/useEventStore';

export function ScenarioControls() {
  const runtime = useEventStore((state) => state.scenarioRuntime);
  const scenarioDefinitions = useEventStore(selectRuntimeScenarios);
  const scenarioPackEnabled = useEventStore((state) => isOperationalPackEnabled(state, 'scenario-player'));
  const scenarioConfiguration = useEventStore(selectRuntimeScenarioConfiguration);
  const startScenario = useEventStore((state) => state.startScenario);
  const pauseScenario = useEventStore((state) => state.pauseScenario);
  const resumeScenario = useEventStore((state) => state.resumeScenario);
  const advanceScenario = useEventStore((state) => state.advanceScenario);
  const stopScenario = useEventStore((state) => state.stopScenario);
  const resetScenario = useEventStore((state) => state.resetScenario);
  const fallbackScenario = scenarioDefinitions.find((scenario) => scenario.id === scenarioConfiguration?.defaultScenarioId) ?? scenarioDefinitions[0];
  if (!scenarioPackEnabled || !fallbackScenario) {
    return (
      <div data-testid="scenario-unavailable" className="rounded border border-command-line bg-command-panelStrong p-3 text-sm leading-6 text-command-muted">
        مشغل التمرين غير مفعّل في حزمة الفعالية الحالية، ولا يمكن تنفيذ خطوات سيناريو.
      </div>
    );
  }
  const selectedScenarioId = runtime.scenarioId ?? fallbackScenario.id;
  const selectedScenario = scenarioDefinitions.find((scenario) => scenario.id === selectedScenarioId) ?? fallbackScenario;
  const currentStep = runtime.playback === 'idle' ? undefined : selectedScenario.steps[runtime.stepIndex];
  const isRunning = runtime.playback === 'playing';
  const isPaused = runtime.playback === 'paused';
  const canStep = runtime.playback === 'playing' || runtime.playback === 'paused';
  const playbackStatus = {
    idle: { label: 'جاهز للتشغيل', className: 'border-command-line bg-command-panelStrong text-command-muted' },
    playing: { label: 'قيد التشغيل', className: 'border-command-accent/70 bg-command-accent/15 text-emerald-100' },
    paused: { label: 'متوقف مؤقتاً', className: 'border-command-amber/70 bg-command-amber/15 text-amber-100' },
    completed: { label: 'اكتمل', className: 'border-command-blue/70 bg-command-blue/15 text-blue-100' }
  }[runtime.playback];

  return (
    <div className="space-y-3.5">
      <label className="block">
        <span className="mb-2 block text-xs font-semibold text-command-muted">التمرين التشغيلي الإجرائي</span>
        <select
          data-testid="scenario-select"
          value={selectedScenarioId}
          onChange={(event) => startScenario(event.target.value)}
          className="command-select"
        >
          {scenarioDefinitions.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.nameAr}
            </option>
          ))}
        </select>
      </label>

      <div className="command-card p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-command-muted">التمرين الحالي</p>
            <p className="mt-1 truncate text-[15px] font-semibold text-command-text">{selectedScenario.nameAr}</p>
          </div>
          <span className={`shrink-0 rounded border px-2 py-1 text-[11px] ${playbackStatus.className}`}>
            {playbackStatus.label}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-command-muted">
          <span>التقدم التشغيلي</span>
          <span className="text-command-text">
            الخطوة {new Intl.NumberFormat('ar-SA').format(runtime.playback === 'idle' ? 0 : runtime.stepIndex + 1)} من{' '}
            {new Intl.NumberFormat('ar-SA').format(selectedScenario.steps.length)} · {new Intl.NumberFormat('ar-SA').format(runtime.progress)}٪
          </span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-black/30"
          role="progressbar"
          aria-label="تقدم السيناريو التشغيلي"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={runtime.progress}
          aria-valuetext={`${new Intl.NumberFormat('ar-SA').format(runtime.progress)}٪`}
        >
          <div
            data-testid="scenario-progress"
            className="h-full rounded-full bg-command-accent transition-all"
            style={{ width: `${runtime.progress}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="rounded border border-command-accent/25 bg-command-accent/5 p-3">
        <p className="text-xs font-semibold text-command-accent">{currentStep?.titleAr ?? 'لا توجد خطوة نشطة'}</p>
        <p data-testid="scenario-message" aria-live="polite" className="mt-2 text-[15px] leading-7 text-command-text">
          {runtime.messageAr}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          data-testid="scenario-start"
          type="button"
          onClick={() => startScenario(selectedScenarioId)}
          className="command-button command-button-primary"
        >
          <span className="flex items-center justify-center gap-2">
            <Play className="h-4 w-4" aria-hidden="true" />
            تشغيل
          </span>
        </button>
        <button
          type="button"
          onClick={isPaused ? resumeScenario : pauseScenario}
          disabled={!isRunning && !isPaused}
          className="command-button"
        >
          <span className="flex items-center justify-center gap-2">
            {isPaused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
            {isPaused ? 'متابعة' : 'إيقاف مؤقت'}
          </span>
        </button>
        <button
          type="button"
          onClick={advanceScenario}
          disabled={!canStep}
          className="command-button"
        >
          <span className="flex items-center justify-center gap-2">
            <SkipForward className="h-4 w-4" aria-hidden="true" />
            الانتقال للخطوة التالية
          </span>
        </button>
        <button
          type="button"
          onClick={resetScenario}
          className="command-button"
        >
          <span className="flex items-center justify-center gap-2">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            إعادة
          </span>
        </button>
        <button
          type="button"
          onClick={stopScenario}
          className="command-button col-span-2 border-red-300/50 bg-red-500/10 text-red-50 hover:border-red-200"
        >
          <span className="flex items-center justify-center gap-2">
            <Square className="h-4 w-4" aria-hidden="true" />
            إيقاف
          </span>
        </button>
      </div>
    </div>
  );
}
