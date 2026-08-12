import { Box, Map, Projector } from 'lucide-react';
import { isOperationalPackEnabled, useEventStore } from '../../store/useEventStore';
import type { ViewMode } from '../../types/projection';

const viewModes: Array<{
  id: ViewMode;
  label: string;
  icon: typeof Box;
  title: string;
}> = [
  { id: 'operator', label: 'منظور', icon: Box, title: 'كاميرا المشغل' },
  { id: 'top', label: 'مخطط', icon: Map, title: 'عرض علوي' },
  { id: 'projection', label: 'إسقاط', icon: Projector, title: 'وضع الإسقاط' }
];

export function ViewModeControls() {
  const viewMode = useEventStore((state) => state.viewMode);
  const setViewMode = useEventStore((state) => state.setViewMode);
  const enterProjectionMode = useEventStore((state) => state.enterProjectionMode);
  const projectionEnabled = useEventStore((state) => isOperationalPackEnabled(state, 'projection-preview'));

  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="أنماط العرض">
      {viewModes.map((mode) => {
        const Icon = mode.icon;
        const active = viewMode === mode.id;
        const disabled = mode.id === 'projection' && !projectionEnabled;
        return (
          <button
            key={mode.id}
            data-testid={`view-mode-${mode.id}`}
            type="button"
            disabled={disabled}
            onClick={() => (mode.id === 'projection' ? enterProjectionMode() : setViewMode(mode.id))}
            className={`min-h-11 rounded border px-2 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
              active
                ? 'border-command-accent bg-command-accent text-command-inverse'
                : 'border-command-line bg-command-panelStrong text-command-text hover:border-command-accent'
            }`}
            aria-pressed={active}
            aria-label={`${mode.title}، ${disabled ? 'غير متاح في الحزمة الحالية' : active ? 'مفعّل' : 'غير مفعّل'}`}
            title={disabled ? 'معاينة الإسقاط غير مفعلة في الحزمة الحالية' : mode.title}
          >
            <span className="flex items-center justify-center gap-2">
              <Icon className="h-4 w-4" aria-hidden="true" />
              {mode.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
