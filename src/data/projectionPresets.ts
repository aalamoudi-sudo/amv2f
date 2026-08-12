import type { ProjectionPreset, ProjectionSettings } from '../types/projection';

export const projectionPresets: ProjectionPreset[] = [
  {
    id: 'executiveWide',
    nameAr: 'عرض تنفيذي واسع',
    descriptionAr: 'منظور مائل يوازن بين العمق وقراءة المناطق.',
    cameraPosition: [22, 22, 22],
    target: [0, 0, 0],
    labelsVisible: true,
    routesVisible: true,
    statusColorsVisible: true
  },
  {
    id: 'topPlan',
    nameAr: 'مخطط علوي',
    descriptionAr: 'لقطة نظيفة تشبه مخطط التشغيل المكاني.',
    cameraPosition: [0, 48, 0.1],
    target: [0, 0, 0],
    labelsVisible: true,
    routesVisible: true,
    statusColorsVisible: true
  },
  {
    id: 'routesOnly',
    nameAr: 'المسارات فقط',
    descriptionAr: 'تركيز بصري على الحركة ومسارات التشغيل.',
    cameraPosition: [24, 24, 18],
    target: [1, 0, -1],
    labelsVisible: false,
    routesVisible: true,
    statusColorsVisible: false
  }
];

export const defaultProjectionSettings: ProjectionSettings = {
  presetId: 'executiveWide',
  labelsVisible: true,
  routesVisible: true,
  statusColorsVisible: true
};

export function isProjectionPresetId(value: unknown): value is ProjectionSettings['presetId'] {
  return typeof value === 'string' && projectionPresets.some((preset) => preset.id === value);
}

export function getProjectionPreset(id: ProjectionSettings['presetId']): ProjectionPreset {
  const fallbackPreset = projectionPresets[0]!;
  return projectionPresets.find((preset) => preset.id === id) ?? fallbackPreset;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function normalizeProjectionSettings(
  value: unknown,
  fallback: ProjectionSettings = defaultProjectionSettings
): ProjectionSettings {
  const candidate = isRecord(value) ? value : {};
  const preset = isProjectionPresetId(candidate.presetId) ? getProjectionPreset(candidate.presetId) : getProjectionPreset(fallback.presetId);

  return {
    presetId: preset.id,
    labelsVisible: typeof candidate.labelsVisible === 'boolean' ? candidate.labelsVisible : fallback.labelsVisible,
    routesVisible: typeof candidate.routesVisible === 'boolean' ? candidate.routesVisible : fallback.routesVisible,
    statusColorsVisible:
      typeof candidate.statusColorsVisible === 'boolean' ? candidate.statusColorsVisible : fallback.statusColorsVisible
  };
}
