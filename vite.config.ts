import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import {
  kagaProductionRuntimeAssets,
  kagaProductionSanitizedGeoJsonAssets,
} from './scripts/kaga-final/client-runtime-manifest';

const isKagaAbsoluteFinal = process.env.VITE_KAGA_ABSOLUTE_FINAL === 'true';
const isKagaFinal = process.env.VITE_KAGA_FINAL === 'true' || isKagaAbsoluteFinal;
const kagaBuildOutputRoot = isKagaAbsoluteFinal ? 'dist-kaga-absolute-final' : 'dist-kaga-final';

function kagaProductionRuntimePlugin(): Plugin {
  return {
    name: 'kaga-production-runtime-whitelist',
    apply: 'build',
    async closeBundle() {
      const outputRoot = resolve(process.cwd(), kagaBuildOutputRoot);
      for (const asset of kagaProductionRuntimeAssets) {
        const source = resolve(process.cwd(), 'public', asset.source);
        const target = resolve(outputRoot, asset.target);
        await mkdir(resolve(target, '..'), { recursive: true });
        await cp(source, target, { recursive: true, force: true });
      }
      for (const asset of kagaProductionSanitizedGeoJsonAssets) {
        const source = resolve(process.cwd(), 'public', asset.source);
        const target = resolve(outputRoot, asset.target);
        const sourceData = JSON.parse(await readFile(source, 'utf8')) as {
          type: string;
          features: Array<{ type: string; properties: Record<string, unknown>; geometry: unknown }>;
        };
        const runtimeData = asset.kind === 'registered-gardens'
          ? {
              type: sourceData.type,
              features: sourceData.features.map((feature) => ({
                type: feature.type,
                properties: {
                  canonicalGardenId: feature.properties.canonicalGardenId,
                  titleAr: feature.properties.titleAr,
                },
                geometry: feature.geometry,
              })),
            }
          : { type: 'FeatureCollection', features: [] };
        await mkdir(resolve(target, '..'), { recursive: true });
        await writeFile(target, `${JSON.stringify(runtimeData)}\n`, 'utf8');
      }
    },
  };
}

export default defineConfig({
  base: process.env.VITE_KAGA_EXECUTIVE === 'true' ? './' : '/',
  publicDir: isKagaFinal ? false : 'public',
  plugins: [react(), ...(isKagaFinal ? [kagaProductionRuntimePlugin()] : [])],
  build: {
    outDir: isKagaFinal
      ? kagaBuildOutputRoot
      : process.env.VITE_KAGA_V2 === 'true'
      ? 'dist-kaga-v2'
      : process.env.VITE_KAGA_EXECUTIVE === 'true'
        ? 'dist-kaga'
        : 'dist'
  },
  server: {
    host: '127.0.0.1',
    port: 5173
  },
  preview: {
    host: '127.0.0.1',
    port: 4173
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    // A single thread avoids fork startup timeouts while preserving every suite.
    pool: 'threads',
    maxWorkers: 1,
    fileParallelism: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**']
  }
});
