import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const bundleName = 'mayadeen-ex1f-client-review-deployment-ready';
const zipPath = path.join(os.homedir(), 'Downloads', `${bundleName}.zip`);
const staging = mkdtempSync(path.join(os.tmpdir(), 'mayadeen-ex1f-client-review-'));
const bundleRoot = path.join(staging, bundleName);
const forbiddenExtensions = new Set(['.pdf', '.pptx', '.docx', '.xlsx', '.xls', '.csv', '.zip', '.dwg', '.dxf', '.max', '.rvt', '.skp', '.blend', '.3dm', '.c4d', '.heic', '.heif', '.mov', '.mp4']);

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    const metadata = lstatSync(absolute);
    if (metadata.isSymbolicLink()) throw new Error(`Symlink is prohibited in deployment package: ${absolute}`);
    return metadata.isDirectory() ? files(absolute) : metadata.isFile() ? [absolute] : [];
  });
}

mkdirSync(bundleRoot, { recursive: true });
cpSync(path.join(root, 'dist'), path.join(bundleRoot, 'frontend'), { recursive: true });
cpSync(path.join(root, 'deploy', 'client-review', 'client-review.config.example.json'), path.join(bundleRoot, 'client-review.config.example.json'));

const documentation = [
  'docs/experience-twin/ex1f-client-review-deployment.md',
  'docs/experience-twin/ex1f-delivery-rollback-runbook.md',
  'docs/experience-twin/ex1f-delivery-accelerator.md'
];
mkdirSync(path.join(bundleRoot, 'documentation'), { recursive: true });
for (const file of documentation) cpSync(path.join(root, file), path.join(bundleRoot, 'documentation', path.basename(file)));
writeFileSync(path.join(bundleRoot, 'README.md'), [
  '# Mayadeen EX.1F Client Review Build',
  '',
  'This package is a static local client-review artifact. It is not a public deployment and is not proof of operational readiness.',
  '',
  '- Serve `frontend/` with SPA fallback to `index.html`.',
  '- Keep the IoT gateway local/offline unless separately authorized.',
  '- Do not infer client, engineering, HSE, opening or production approval.',
  '- Roll back by restoring the complete previous build directory; never mix files across revisions.',
  ''
].join('\n'));

const packagedFiles = files(bundleRoot).sort();
for (const file of packagedFiles) {
  if (forbiddenExtensions.has(path.extname(file).toLowerCase())) throw new Error(`Raw source entered deployment package: ${file}`);
  const bytes = readFileSync(file);
  if (bytes.length <= 8 * 1024 * 1024) {
    const text = bytes.toString('utf8');
    if (
      /\/Users\/[A-Za-z0-9._-]+/u.test(text)
      || /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/u.test(text)
      || /(?:api[_-]?key|client[_-]?secret)\s*[:=]\s*["'][^"']+/iu.test(text)
    ) throw new Error(`Private path or secret-like content entered deployment package: ${file}`);
  }
}
const checksums = packagedFiles.map((file) => `${sha256(readFileSync(file))}  ${path.relative(bundleRoot, file)}`).join('\n');
writeFileSync(path.join(bundleRoot, 'SHA256SUMS'), `${checksums}\n`);

rmSync(zipPath, { force: true });
execFileSync('zip', ['-q', '-r', zipPath, bundleName], { cwd: staging });
execFileSync('unzip', ['-t', zipPath], { stdio: 'ignore' });
const zipHash = sha256(readFileSync(zipPath));
rmSync(staging, { recursive: true, force: true });
process.stdout.write(`${JSON.stringify({ status: 'CLIENT_REVIEW_DEPLOYMENT_READY', zipPath, sha256: zipHash, files: packagedFiles.length + 1, rawSources: 0, privatePaths: 0, secrets: 0 }, null, 2)}\n`);
