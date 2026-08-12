import { Eye, Expand, Map, Palette, RotateCcw, Route, X } from 'lucide-react';
import { projectionPresets } from '../../data/projectionPresets';
import { useEventStore } from '../../store/useEventStore';
import type { ProjectionPresetId } from '../../types/projection';

export function ProjectionToolbar() {
  const settings = useEventStore((state) => state.projectionSettings);
  const setProjectionPreset = useEventStore((state) => state.setProjectionPreset);
  const updateProjectionSettings = useEventStore((state) => state.updateProjectionSettings);
  const resetCamera = useEventStore((state) => state.resetCamera);
  const exitProjectionMode = useEventStore((state) => state.exitProjectionMode);
  const enterProjectionCleanMode = useEventStore((state) => state.enterProjectionCleanMode);
  const activeRuntime = useEventStore((state) => state.activeRuntime);
  const profile = activeRuntime?.projectionProfiles[0];
  const physicalProfile = activeRuntime?.physicalOutputProfiles[0];

  return (
    <div
      data-testid="projection-toolbar"
      data-projection-profile-id={profile?.projectionProfileId ?? 'fallback-visual-preset'}
      data-spatial-mapping-version={profile?.spatialMappingVersion ?? 'fallback-spatial-mapping'}
      data-output-profile-id={profile?.outputProfileId ?? 'fallback-local-output'}
      data-physical-output-profile-id={physicalProfile?.physicalOutputProfileId ?? 'unavailable'}
      className="pointer-events-auto absolute left-4 right-4 top-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded border border-command-line bg-command-panel/95 p-3 shadow-command"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-command-text">
          <Map className="h-4 w-4 text-command-accent" aria-hidden="true" />
          إخراج الإسقاط
        </span>
        {profile ? (
          <span data-testid="active-projection-profile" className="rounded border border-command-accent/45 bg-command-accent/10 px-2 py-1 text-[11px] text-command-accent">
            {profile.titleAr} · معاينة محلية بلا معايرة
          </span>
        ) : null}
        <label className="sr-only" htmlFor="projection-preset">
          اختيار إعداد الإسقاط
        </label>
        <select
          id="projection-preset"
          data-testid="projection-preset"
          value={settings.presetId}
          onChange={(event) => setProjectionPreset(event.target.value as ProjectionPresetId)}
          className="rounded border border-command-line bg-command-panelStrong px-3 py-2 text-sm text-command-text"
        >
          {projectionPresets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.nameAr}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ToggleButton
          active={settings.labelsVisible}
          label="الملصقات"
          icon={Eye}
          onClick={() => updateProjectionSettings({ labelsVisible: !settings.labelsVisible })}
        />
        <ToggleButton
          active={settings.routesVisible}
          label="المسارات"
          icon={Route}
          testId="projection-routes-toggle"
          onClick={() => updateProjectionSettings({ routesVisible: !settings.routesVisible })}
        />
        <ToggleButton
          active={settings.statusColorsVisible}
          label="ألوان الحالات"
          icon={Palette}
          onClick={() => updateProjectionSettings({ statusColorsVisible: !settings.statusColorsVisible })}
        />
        <button
          type="button"
          onClick={resetCamera}
          className="rounded border border-command-line bg-command-panelStrong px-3 py-2 text-sm text-command-text transition hover:border-command-accent"
          title="إعادة ضبط كاميرا الإسقاط"
          aria-label="إعادة ضبط كاميرا الإسقاط"
        >
          <span className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            إعادة الكاميرا
          </span>
        </button>
        <button
          data-testid="projection-clean-open"
          type="button"
          onClick={enterProjectionCleanMode}
          className="rounded border border-command-line bg-command-panelStrong px-3 py-2 text-sm text-command-text transition hover:border-command-accent"
          title="فتح إخراج نظيف بلا عناصر تحكم"
          aria-label="فتح إخراج نظيف بلا عناصر تحكم"
        >
          <span className="flex items-center gap-2">
            <Expand className="h-4 w-4" aria-hidden="true" />
            عرض نظيف
          </span>
        </button>
        <button
          data-testid="projection-close"
          type="button"
          onClick={exitProjectionMode}
          className="rounded border border-red-300/50 bg-red-500/10 px-3 py-2 text-sm text-red-50 transition hover:border-red-200"
          title="إغلاق وضع الإسقاط"
          aria-label="إغلاق وضع الإسقاط"
        >
          <span className="flex items-center gap-2">
            <X className="h-4 w-4" aria-hidden="true" />
            إغلاق
          </span>
        </button>
      </div>
    </div>
  );
}

interface ToggleButtonProps {
  active: boolean;
  label: string;
  icon: typeof Eye;
  testId?: string;
  onClick: () => void;
}

function ToggleButton({ active, label, icon: Icon, testId, onClick }: ToggleButtonProps) {
  return (
    <button
      data-testid={testId}
      type="button"
      onClick={onClick}
      className={`rounded border px-3 py-2 text-sm transition ${
        active
          ? 'border-command-accent bg-command-accent text-[#06120f]'
          : 'border-command-line bg-command-panelStrong text-command-text hover:border-command-accent'
      }`}
      aria-pressed={active}
      title={label}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </span>
    </button>
  );
}
