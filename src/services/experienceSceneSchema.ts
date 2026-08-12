import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import sceneAssetManifestSchema from '../../schemas/experience-scene/v1/scene-asset-manifest.schema.json';
import sceneAssetRevisionSchema from '../../schemas/experience-scene/v1/scene-asset-revision.schema.json';
import sceneHotspotGraphSchema from '../../schemas/experience-scene/v1/scene-hotspot-graph.schema.json';
import sceneComparisonPairSchema from '../../schemas/experience-scene/v1/scene-comparison-pair.schema.json';
import sceneRegistryExportSchema from '../../schemas/experience-scene/v1/scene-registry-export.schema.json';
import type { SceneValidationIssue } from '../types/experienceScene';

export type ExperienceSceneSchemaName =
  | 'scene-asset-manifest'
  | 'scene-asset-revision'
  | 'scene-hotspot-graph'
  | 'scene-comparison-pair'
  | 'scene-registry-export';

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true, validateFormats: false });

const validators: Record<ExperienceSceneSchemaName, ValidateFunction> = {
  'scene-asset-manifest': ajv.compile(sceneAssetManifestSchema),
  'scene-asset-revision': ajv.compile(sceneAssetRevisionSchema),
  'scene-hotspot-graph': ajv.compile(sceneHotspotGraphSchema),
  'scene-comparison-pair': ajv.compile(sceneComparisonPairSchema),
  'scene-registry-export': ajv.compile(sceneRegistryExportSchema)
};

function issueFromAjv(error: ErrorObject): SceneValidationIssue {
  const location = error.instancePath || '/';
  return {
    code: `scene-schema-${error.keyword}`,
    path: location,
    severity: 'blocking',
    messageAr: `بنية سجل المشهد غير مكتملة أو غير صالحة عند ${location}.`
  };
}

export function validateExperienceSceneSchema(
  schemaName: ExperienceSceneSchemaName,
  value: unknown
): { valid: boolean; issues: SceneValidationIssue[] } {
  try {
    const validator = validators[schemaName];
    const valid = validator(value);
    return {
      valid: Boolean(valid),
      issues: valid ? [] : (validator.errors ?? []).map(issueFromAjv)
    };
  } catch {
    return {
      valid: false,
      issues: [{
        code: 'scene-schema-validation-failed-safe',
        path: '/',
        severity: 'blocking',
        messageAr: 'تعذر التحقق من بنية المشهد بأمان، لذلك تم حجب الأصل.'
      }]
    };
  }
}
