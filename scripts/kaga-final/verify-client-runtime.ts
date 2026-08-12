import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import {
  assertSafeKagaRuntimePaths,
  kagaForbiddenRuntimeMetadataKeys,
  kagaRequiredRuntimePaths,
  normalizeRuntimePath,
} from './client-runtime-manifest';

const root = resolve(process.cwd(), process.env.KAGA_RUNTIME_DIST ?? 'dist-kaga-final');

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const absolute = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [normalizeRuntimePath(relative(root, absolute))];
  }));
  return files.flat();
}

const runtimeFiles = await walk(root);
assertSafeKagaRuntimePaths(runtimeFiles);

for (const requiredPath of kagaRequiredRuntimePaths) {
  const required = resolve(root, requiredPath);
  const requiredStat = await stat(required).catch(() => undefined);
  if (!requiredStat?.isFile()) throw new Error(`Missing required KAGA runtime file: ${requiredPath}`);
}

const generatedAssets = runtimeFiles.filter((path) => path.startsWith('assets/'));
if (generatedAssets.length === 0) throw new Error('Missing generated Vite assets directory.');

for (const path of runtimeFiles.filter((runtimePath) => runtimePath.endsWith('.json') || runtimePath.endsWith('.geojson'))) {
  const contents = await readFile(resolve(root, path), 'utf8');
  const leakedKeys = kagaForbiddenRuntimeMetadataKeys.filter((key) => contents.includes(`"${key}"`));
  if (leakedKeys.length > 0) throw new Error(`Internal spatial metadata in ${path}: ${leakedKeys.join(', ')}`);
}

console.log(`KAGA client runtime safety PASS: ${runtimeFiles.length} files, ${generatedAssets.length} generated assets.`);
