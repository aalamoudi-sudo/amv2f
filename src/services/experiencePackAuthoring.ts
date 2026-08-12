import type { ExperiencePack, ExperiencePackCandidateRevision, ExperiencePackDifference } from '../types/experienceTwin';
import { stableSerialize } from './integrationHash';
import { materializeExperiencePack, validateExperiencePack, type ExperiencePackValidationOptions } from './experienceTwinValidation';

function clone<T>(value: T): T {
  return structuredClone(value);
}

function collectDifferences(before: unknown, after: unknown, path = ''): ExperiencePackDifference[] {
  if (stableSerialize(before) === stableSerialize(after)) return [];
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object' || Array.isArray(before) !== Array.isArray(after)) {
    return [{ path: path || '/', labelAr: 'تغيير في الحزمة المرشحة', before: clone(before), after: clone(after) }];
  }
  const beforeRecord = before as Record<string, unknown>;
  const afterRecord = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)]);
  return [...keys].flatMap((key) => collectDifferences(beforeRecord[key], afterRecord[key], `${path}/${key}`));
}

export function previewExperiencePackDifference(before: ExperiencePack, after: ExperiencePack): ExperiencePackDifference[] {
  return collectDifferences(before, after).filter((difference) => difference.path !== '/contentHash');
}

export function createExperiencePackCandidateRevision(
  current: ExperiencePack,
  proposed: ExperiencePack,
  changeReason: string,
  options: ExperiencePackValidationOptions = {}
): ExperiencePackCandidateRevision {
  if (!changeReason.trim()) throw new Error('سبب التغيير مطلوب قبل إنشاء مراجعة مرشحة.');
  if (current.packId !== proposed.packId || current.projectId !== proposed.projectId || current.eventId !== proposed.eventId) throw new Error('لا يمكن نقل مراجعة تجربة بين مشروعين أو فعاليتين.');
  const candidate = materializeExperiencePack({ ...clone(proposed), revision: current.revision + 1, packVersion: `${current.revision + 1}.0-candidate`, frozen: false, activated: false, baseline: false, operationalApproval: 'none' });
  const validation = validateExperiencePack(candidate, options);
  if (!validation.valid) throw new Error(validation.issues.find((issue) => issue.severity === 'blocking')?.messageAr ?? 'فشل التحقق من المراجعة المرشحة.');
  const differences = previewExperiencePackDifference(current, candidate);
  return {
    revisionId: `${candidate.packId}-R${candidate.revision}-${candidate.contentHash.slice(0, 12)}`,
    packId: candidate.packId,
    revision: candidate.revision,
    previousContentHash: current.contentHash,
    contentHash: candidate.contentHash,
    changeReason: changeReason.trim(),
    actorClassification: 'local-candidate-author',
    status: 'candidate-draft',
    differences,
    pack: clone(candidate)
  };
}

export function resetExperiencePackCandidate(current: ExperiencePack): ExperiencePack {
  return clone(current);
}

export function exportSanitizedExperiencePack(pack: ExperiencePack): string {
  const sanitized = clone(pack);
  sanitized.sceneAssets.forEach((asset) => {
    asset.localPreviewUri = asset.localPreviewUri ? asset.localPreviewUri.replace(/^.*\/local-assets\//, '/local-assets/') : null;
    asset.notes = asset.notes.filter((note) => !note.includes('/Users/') && !note.includes('file://'));
  });
  return JSON.stringify(sanitized, null, 2);
}

export function activateExperiencePack(): never {
  throw new Error('حزمة تجربة الفعالية المرشحة لا تملك مسار تفعيل أو اعتماد تشغيلي.');
}
