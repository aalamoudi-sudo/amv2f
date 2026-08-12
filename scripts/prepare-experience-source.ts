import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const expectedSize = 35_931_866;
const expectedHash = '9663f853eda07ac131a0390968b0ff5e3cf4e0d6e72137050b15a18daac8099d';
const previewPages = [5, 8, 10, 12, 13, 33, 34, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 65];

function sourceArgument(): string {
  const index = process.argv.indexOf('--source');
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error('الاستخدام: pnpm prepare:experience-source --source "<pdf-path>"');
  return path.resolve(value);
}

async function hashFile(filePath: string): Promise<string> {
  return createHash('sha256').update(await readFile(filePath)).digest('hex');
}

function renderPage(binary: string, snapshotPath: string, outputDirectory: string, page: number): void {
  const prefix = path.join(outputDirectory, `page-${String(page).padStart(2, '0')}`);
  const result = spawnSync(binary, ['-f', String(page), '-singlefile', '-png', '-r', '100', '-scale-to-x', '1600', '-scale-to-y', '-1', snapshotPath, prefix], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`تعذر إنشاء معاينة الصفحة ${page}: ${result.stderr.trim()}`);
}

async function main(): Promise<void> {
  const sourcePath = sourceArgument();
  const sourceStat = await stat(sourcePath);
  const observedHash = await hashFile(sourcePath);
  if (sourceStat.size !== expectedSize || observedHash !== expectedHash) {
    throw new Error(`SOURCE_FINGERPRINT_MISMATCH: expected ${expectedSize}/${expectedHash}, observed ${sourceStat.size}/${observedHash}`);
  }

  const snapshotDirectory = path.resolve('tmp/experience-source-intake');
  const previewDirectory = path.resolve('public/local-assets/experience/kap');
  await mkdir(snapshotDirectory, { recursive: true });
  await mkdir(previewDirectory, { recursive: true });
  const snapshotPath = path.join(snapshotDirectory, `${expectedHash}.pdf`);
  await copyFile(sourcePath, snapshotPath);
  if (await hashFile(snapshotPath) !== expectedHash) throw new Error('SOURCE_SNAPSHOT_COPY_MISMATCH');

  const pdfToPpm = process.env.PDFTOPPM_BIN || 'pdftoppm';
  const probe = spawnSync(pdfToPpm, ['-v'], { encoding: 'utf8' });
  if (probe.error) {
    console.log(JSON.stringify({ status: 'validated-without-previews', byteSize: sourceStat.size, sha256: observedHash, localSnapshot: `tmp/experience-source-intake/${expectedHash}.pdf`, reason: 'pdftoppm-unavailable' }, null, 2));
    return;
  }
  previewPages.forEach((page) => renderPage(pdfToPpm, snapshotPath, previewDirectory, page));
  console.log(JSON.stringify({ status: 'preview-ready', byteSize: sourceStat.size, sha256: observedHash, localSnapshot: `tmp/experience-source-intake/${expectedHash}.pdf`, previewDirectory: 'public/local-assets/experience/kap', previewPages }, null, 2));
}

await main();
