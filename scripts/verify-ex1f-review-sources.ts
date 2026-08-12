import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { kapFourDayExperienceTruthProjection } from '../src/data/experienceReviewProjections';
import { validateFourDayExperienceTruthProjection } from '../src/services/experienceSourceReconciliation';

const localPaths: Record<string, string> = {
  'SOURCE-KAP-PRESENTATION-V16-20260712': path.join(os.homedir(), 'Desktop', 'V 16 عرض الأمين final 12 Jul.pdf'),
  'SOURCE-KAP-ENTRY-PROPOSALS-V02': path.join(os.homedir(), 'Downloads', 'مقترحات الدخول  لكل الايام V.02.pdf'),
  'SOURCE-KAP-LAUNCH-GENERAL-BOOK': path.join(os.homedir(), 'Downloads', 'حفل التدشين - الملف العام  .pdf'),
  'SOURCE-LOCAL-a5befcff7e2bb8b4': path.join(process.cwd(), 'private-input', 'operational-delivery', 'اقتراحات الدخول V.11.pdf')
};

function sha256(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function pdfPageCount(filePath: string): number {
  const output = execFileSync(process.env.PDFINFO_BIN ?? 'pdfinfo', [filePath], { encoding: 'utf8' });
  const match = output.match(/^Pages:\s+(\d+)$/m);
  if (!match) throw new Error(`تعذر قراءة عدد صفحات المصدر: ${path.basename(filePath)}`);
  return Number(match[1]);
}

const records = kapFourDayExperienceTruthProjection.sourceManifests.map((manifest) => {
  const filePath = localPaths[manifest.sourceId];
  if (!filePath) throw new Error(`لا يوجد مسار محلي مسجل للمصدر: ${manifest.sourceId}`);
  const observedByteSize = statSync(filePath).size;
  const observedSha256 = sha256(filePath);
  const observedPageCount = pdfPageCount(filePath);
  const valid = observedByteSize === manifest.expectedByteSize
    && observedSha256 === manifest.expectedSha256
    && observedPageCount === manifest.pageCount;
  if (!valid) throw new Error(`فشل تحقق اللقطة المحلية: ${manifest.sourceId}`);
  return {
    sourceId: manifest.sourceId,
    sourceName: manifest.sourceName,
    expectedByteSize: manifest.expectedByteSize,
    observedByteSize,
    expectedSha256: manifest.expectedSha256,
    observedSha256,
    expectedPageCount: manifest.pageCount,
    observedPageCount,
    valid
  };
});

const projectionValidation = validateFourDayExperienceTruthProjection(kapFourDayExperienceTruthProjection);
if (!projectionValidation.valid) throw new Error(projectionValidation.issues.map((item) => item.messageAr).join('\n'));

process.stdout.write(`${JSON.stringify({
  status: 'EX1F_SOURCE_SNAPSHOTS_VERIFIED',
  projectionId: kapFourDayExperienceTruthProjection.projectionId,
  projectionHash: kapFourDayExperienceTruthProjection.contentHash,
  sourceCount: records.length,
  records
}, null, 2)}\n`);
