import { describe, expect, it } from 'vitest';
import {
  assessArchiveEntries,
  assessIntakePath,
  assessZipCentralDirectory,
  classifyDeliverySourceType,
  classifyGpsMetadata,
  classifyInventoryDuplicate,
  classifyStudioCapability,
  classifyStudioDeliveryFormat,
  detectCredentialLikeContent,
  findUnexpectedExternalUris,
  redactPrivateSourcePath,
  safeDisplayFilename
} from './experienceDeliverySafety';
import type { DeliverySourceInventoryRecord } from '../types/experienceDelivery';

const baseInventory: DeliverySourceInventoryRecord = {
  sourceRecordId: 'SOURCE-001', localOpaqueSourceId: 'LOCAL-SOURCE-aaaaaaaaaaaaaaaa', originalFilename: 'source.xlsx', safeDisplayFilename: 'source.xlsx',
  sourceType: 'xlsx', mimeType: null, byteSize: 100, sha256: 'a'.repeat(64), fingerprintState: 'verified', sourceOwner: null,
  suppliedBy: null, suppliedAt: null, revision: null, claimedApprovalStatus: null, verifiedAuthorityStatus: 'unknown', confidentialityClassification: 'unknown',
  retentionClassification: 'review-session', relevantDayIds: [], relevantPersonaIds: [], relevantDestinationIds: [], relevantWorkstreamIds: [],
  extractionStatus: 'inventory-only', conflictStatus: 'none', acceptanceStatus: 'inventory-created', modifiedAtReported: null, pathDisclosure: 'redacted'
};

function zipCentralEntry(name: string, options: { symlink?: boolean; encrypted?: boolean; compressedSize?: number; uncompressedSize?: number } = {}): Uint8Array {
  const encodedName = new TextEncoder().encode(name);
  const bytes = new Uint8Array(46 + encodedName.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(8, options.encrypted ? 1 : 0, true);
  view.setUint16(10, 8, true);
  view.setUint32(20, options.compressedSize ?? 100, true);
  view.setUint32(24, options.uncompressedSize ?? 200, true);
  view.setUint16(28, encodedName.length, true);
  if (options.symlink) view.setUint32(38, 0xa000 << 16, true);
  bytes.set(encodedName, 46);
  return bytes;
}

describe('EX.1F delivery private intake safety', () => {
  it('rejects path traversal, absolute paths, symlinks, root escape, hidden executables and control characters', () => {
    expect(assessIntakePath({ relativePath: '../secret.xlsx', symbolicLink: false, resolvedWithinRoot: false, directory: false }).safe).toBe(false);
    expect(assessIntakePath({ relativePath: '/tmp/source.xlsx', symbolicLink: false, resolvedWithinRoot: false, directory: false }).codes).toContain('delivery-path-absolute');
    expect(assessIntakePath({ relativePath: 'model.glb', symbolicLink: true, resolvedWithinRoot: false, directory: false }).codes).toContain('delivery-path-symbolic-link');
    expect(assessIntakePath({ relativePath: '.hidden.exe', symbolicLink: false, resolvedWithinRoot: true, directory: false }).codes).toEqual(expect.arrayContaining(['delivery-path-hidden-file', 'delivery-path-hidden-executable']));
    expect(assessIntakePath({ relativePath: 'geometry.bin', symbolicLink: false, resolvedWithinRoot: true, directory: false }).codes).toContain('delivery-path-hidden-executable');
    expect(assessIntakePath({ relativePath: 'geometry.bin', symbolicLink: false, resolvedWithinRoot: true, directory: false, allowedDataExtensions: new Set(['bin']) }).safe).toBe(true);
    expect(assessIntakePath({ relativePath: 'package/<source>.glb', symbolicLink: false, resolvedWithinRoot: true, directory: false }).codes).toContain('delivery-path-malicious-filename');
    expect(assessIntakePath({ relativePath: 'bad\u0000name.pdf', symbolicLink: false, resolvedWithinRoot: true, directory: false }).safe).toBe(false);
  });

  it('inspects archive entry structure without extracting it', () => {
    expect(assessArchiveEntries(['package/model.glb', 'package/textures/base.png']).safe).toBe(true);
    expect(assessArchiveEntries(['../escape.glb', 'package/run.exe']).codes).toEqual(expect.arrayContaining(['delivery-path-traversal', 'delivery-path-hidden-executable']));
    expect(assessArchiveEntries(['package/geometry.bin']).safe).toBe(false);
    expect(assessArchiveEntries(['package/geometry.bin'], { allowedDataExtensions: new Set(['bin']) }).safe).toBe(true);
    expect(assessZipCentralDirectory(zipCentralEntry('package/model.glb')).safe).toBe(true);
    expect(assessZipCentralDirectory(zipCentralEntry('package/geometry.bin'), { allowedDataExtensions: new Set(['bin']) }).safe).toBe(true);
    expect(assessZipCentralDirectory(zipCentralEntry('package/model.glb', { symlink: true, encrypted: true, compressedSize: 1, uncompressedSize: 1_000 })).codes).toEqual(expect.arrayContaining([
      'delivery-archive-symbolic-link', 'delivery-archive-encrypted-entry', 'delivery-archive-expansion-risk'
    ]));
    expect(assessZipCentralDirectory(new Uint8Array([1, 2, 3])).codes).toContain('delivery-archive-structure-invalid');
  });

  it('redacts private paths and sanitizes malicious display names', () => {
    const redacted = redactPrivateSourcePath('/Users/private/client/source.xlsx', 'f'.repeat(64));
    expect(redacted).toEqual({ safeDisplayName: 'source.xlsx', safeOpaquePathId: 'LOCAL-PATH-ffffffffffffffff', pathDisclosure: 'redacted' });
    expect(JSON.stringify(redacted)).not.toContain('/Users/private');
    expect(safeDisplayFilename('../../Majed/<source>.xlsx')).toBe('_source_.xlsx');
  });

  it('distinguishes duplicate content from conflicting content', () => {
    expect(classifyInventoryDuplicate(baseInventory, { ...baseInventory, sourceRecordId: 'SOURCE-002', safeDisplayFilename: 'copy.xlsx' })).toBe('duplicate');
    expect(classifyInventoryDuplicate(baseInventory, { ...baseInventory, sha256: 'b'.repeat(64), byteSize: 101 })).toBe('conflict');
    expect(classifyInventoryDuplicate(baseInventory, { ...baseInventory, sourceRecordId: 'SOURCE-002', safeDisplayFilename: 'other.xlsx', sha256: 'c'.repeat(64) })).toBe('distinct');
  });

  it('classifies formats honestly without claiming native conversion support', () => {
    expect(classifyDeliverySourceType('program.xlsx', 'operational')).toBe('xlsx');
    expect(classifyStudioDeliveryFormat('master.max')).toBe('max');
    expect(classifyStudioCapability('max')).toBe('requires-native-software');
    expect(classifyStudioCapability('glb')).toBe('structurally-validatable');
    expect(classifyStudioCapability(null)).toBe('unsupported');
  });

  it('detects external URIs, credential-like content and GPS presence without exposing values', () => {
    expect(findUnexpectedExternalUris('{"uri":"https://vendor.invalid/private.bin"}')).toHaveLength(1);
    expect(detectCredentialLikeContent('api_key=abcdefghijklmnop')).toContain('credential-assignment');
    const exifGps = new Uint8Array([0xff, 0xd8, 0x45, 0x78, 0x69, 0x66, 0, 0, 0x88, 0x25, 0, 0]);
    expect(classifyGpsMetadata(exifGps)).toBe('present');
    expect(classifyGpsMetadata(new Uint8Array([0xff, 0xd8, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))).toBe('absent');
  });
});
