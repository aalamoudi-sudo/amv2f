import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const dist = path.join(root, 'dist');
const forbiddenExtensions = new Set(['.pdf', '.pptx', '.docx', '.xlsx', '.xls', '.csv', '.zip', '.dwg', '.dxf', '.max', '.rvt', '.skp', '.blend', '.3dm', '.c4d', '.heic', '.heif', '.mp4', '.mov']);
const forbiddenText = [/\/Users\/[A-Za-z0-9._-]+/u, /private-input\//u, /private-output\//u, /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/u, /(?:api[_-]?key|client[_-]?secret)\s*[:=]\s*["'][^"']+/iu];

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? files(absolute) : entry.isFile() ? [absolute] : [];
  });
}

const builtFiles = files(dist).sort();
for (const file of builtFiles) {
  const extension = path.extname(file).toLowerCase();
  if (forbiddenExtensions.has(extension)) throw new Error(`Raw/private source extension found in client build: ${path.relative(dist, file)}`);
  if (statSync(file).size <= 8 * 1024 * 1024 && ['.html', '.js', '.css', '.json', '.txt', '.svg'].includes(extension)) {
    const content = readFileSync(file, 'utf8');
    const matched = forbiddenText.find((pattern) => pattern.test(content));
    if (matched) throw new Error(`Private path or secret-like content found in client build: ${path.relative(dist, file)}`);
  }
}

const featureCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const records = builtFiles.map((file) => {
  const bytes = readFileSync(file);
  return { file: path.relative(dist, file), bytes: bytes.length, sha256: sha256(bytes) };
});
const manifest = {
  profile: 'client-review',
  buildId: `EX1F-CLIENT-REVIEW-${featureCommit.slice(0, 12)}`,
  featureCommit,
  createdAt: new Date().toISOString(),
  projectScope: 'configured-at-runtime',
  spaFallbackRequired: true,
  externalIntegrations: 'disabled',
  iotGateway: 'local-offline',
  developmentDryRunsVisibleInKap: false,
  operationalReadiness: 'cannot-determine',
  realOperationalPackagesAccepted: 0,
  realStudioPackagesAccepted: 0,
  files: records
};
writeFileSync(path.join(dist, 'client-review-build-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
const manifestBytes = readFileSync(path.join(dist, 'client-review-build-manifest.json'));
writeFileSync(path.join(dist, 'client-review-checksums.sha256'), `${[
  ...records.map((record) => `${record.sha256}  ${record.file}`),
  `${sha256(manifestBytes)}  client-review-build-manifest.json`
].join('\n')}\n`);
process.stdout.write(`${JSON.stringify({ status: 'CLIENT_REVIEW_BUILD_READY', buildId: manifest.buildId, featureCommit, files: records.length + 2, privateSources: 0, secrets: 0 }, null, 2)}\n`);
