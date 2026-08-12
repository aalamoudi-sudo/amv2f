export type ViewMode = 'operator' | 'top' | 'projection';

export function isViewMode(value: unknown): value is ViewMode {
  return value === 'operator' || value === 'top' || value === 'projection';
}

export type ProjectionPresetId = 'executiveWide' | 'topPlan' | 'routesOnly';

export interface ProjectionPreset {
  id: ProjectionPresetId;
  nameAr: string;
  descriptionAr: string;
  cameraPosition: [number, number, number];
  target: [number, number, number];
  labelsVisible: boolean;
  routesVisible: boolean;
  statusColorsVisible: boolean;
}

export interface ProjectionSettings {
  presetId: ProjectionPresetId;
  labelsVisible: boolean;
  routesVisible: boolean;
  statusColorsVisible: boolean;
}
