import path from 'node:path';

const allowedExtensionsByKind = {
  screenshot: new Set(['.png']),
  manifest: new Set(['.json']),
  documentation: new Set(['.md'])
} as const;

export type ReviewBundleEntryKind = keyof typeof allowedExtensionsByKind;

export function assertAllowlistedReviewEntry(relativePath: string, kind: ReviewBundleEntryKind): void {
  if (path.isAbsolute(relativePath) || relativePath.includes('..') || relativePath.includes('\\')) {
    throw new Error(`Unsafe review bundle path: ${relativePath}`);
  }
  const extension = path.extname(relativePath).toLowerCase();
  if (!allowedExtensionsByKind[kind].has(extension)) {
    throw new Error(`Review bundle entry is not allowlisted for ${kind}: ${relativePath}`);
  }
}
export function assertExactEntryNames(actualNames: readonly string[], expectedNames: readonly string[], scope: string): void {
  const actual = [...actualNames].sort();
  const expected = [...expectedNames].sort();
  if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) {
    throw new Error(`Unexpected review artifacts in ${scope}.`);
  }
}
