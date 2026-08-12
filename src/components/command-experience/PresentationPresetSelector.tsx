import { BriefcaseBusiness, ShieldAlert, Wrench } from 'lucide-react';
import type { PresentationPreset } from '../../ux/commandExperience';
import { presentationPresetLabels } from '../../ux/commandExperience';

const icons = {
  executive: BriefcaseBusiness,
  operator: ShieldAlert,
  technical: Wrench
};

export function PresentationPresetSelector({
  value,
  onChange
}: {
  value: PresentationPreset;
  onChange: (preset: PresentationPreset) => void;
}) {
  return (
    <div data-testid="presentation-preset-selector" className="rounded border border-command-line bg-command-bg/60 p-1" aria-label="إعدادات العرض">
      <div className="flex items-center gap-1">
        {(['executive', 'operator', 'technical'] as const).map((preset) => {
          const Icon = icons[preset];
          const selected = value === preset;
          return (
            <button
              key={preset}
              data-testid={'presentation-preset-' + preset}
              type="button"
              onClick={() => onChange(preset)}
              aria-pressed={selected}
              className={'command-preset-button ' + (selected ? 'command-preset-button-active' : '')}
              title={presentationPresetLabels[preset]}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden 2xl:inline">{presentationPresetLabels[preset]}</span>
            </button>
          );
        })}
      </div>
      <span className="sr-only">هذه إعدادات عرض وليست صلاحيات إنتاجية ولا تمنح أو تقيّد الوصول.</span>
    </div>
  );
}
