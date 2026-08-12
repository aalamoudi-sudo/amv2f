export type ImportedModelUpAxis = 'Y_UP' | 'Z_UP';

export interface ImportedModelNormalizationOptions {
  unitsPerMeter: number;
  upAxis: ImportedModelUpAxis;
  centerToOrigin: boolean;
  groundToZero: boolean;
  rotationYDegrees: number;
  uniformScale: number;
}

export interface ImportedModelNormalizationResult {
  sceneRootName: string;
  appliedScale: number;
  appliedRotationYDegrees: number;
  sourceUnitsPerMeter: number;
  notes: string[];
}

export const defaultModelNormalizationOptions: ImportedModelNormalizationOptions = {
  unitsPerMeter: 1,
  upAxis: 'Y_UP',
  centerToOrigin: true,
  groundToZero: true,
  rotationYDegrees: 0,
  uniformScale: 1
};

export function describeModelNormalization(
  sceneRootName: string,
  options: ImportedModelNormalizationOptions = defaultModelNormalizationOptions
): ImportedModelNormalizationResult {
  return {
    sceneRootName,
    appliedScale: options.uniformScale / options.unitsPerMeter,
    appliedRotationYDegrees: options.rotationYDegrees,
    sourceUnitsPerMeter: options.unitsPerMeter,
    notes: [
      options.centerToOrigin ? 'Center imported model bounds around the operational origin.' : 'Preserve source origin.',
      options.groundToZero ? 'Move model base to Y=0 after bounds calculation.' : 'Preserve source elevation.',
      options.upAxis === 'Z_UP' ? 'Rotate source from Z-up into the runtime Y-up scene.' : 'Source already uses Y-up.'
    ]
  };
}
