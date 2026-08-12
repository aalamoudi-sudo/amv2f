import type {
  DeliverySourceInventoryRecord,
  DeliverySourceType,
  StudioAssetCapability,
  StudioDeliveryFormat
} from '../types/experienceDelivery';

export const experienceDeliveryInventoryPolicyVersion = 'EXPERIENCE-DELIVERY-INVENTORY-POLICY-v1' as const;

const executableExtensions = new Set([
  'app', 'bat', 'bin', 'cmd', 'com', 'cpl', 'dmg', 'dll', 'exe', 'jar', 'js', 'jse',
  'lnk', 'mjs', 'msi', 'pkg', 'ps1', 'scr', 'sh', 'vbs', 'wsf'
]);

const sourceTypes = new Map<string, DeliverySourceType>([
  ['pdf', 'pdf'], ['xlsx', 'xlsx'], ['csv', 'csv'], ['docx', 'docx'], ['pptx', 'pptx'], ['json', 'json'], ['zip', 'zip']
]);

const studioFormats = new Map<string, StudioDeliveryFormat>([
  ['glb', 'glb'], ['gltf', 'gltf'], ['fbx', 'fbx'], ['obj', 'obj'], ['max', 'max'], ['skp', 'skp'], ['rvt', 'rvt'],
  ['blend', 'blend'], ['3dm', '3dm'], ['c4d', 'c4d'], ['dwg', 'dwg'], ['dxf', 'dxf'], ['ifc', 'ifc'], ['usd', 'usd'],
  ['usdz', 'usdz'], ['stl', 'stl'], ['3mf', '3mf'], ['mp4', 'video'], ['mov', 'video'], ['hdr', 'environment-map'], ['exr', 'environment-map']
]);

const nativeStudioFormats = new Set<StudioDeliveryFormat>(['max', 'skp', 'rvt', 'blend', '3dm', 'c4d', 'unreal-project', 'unity-project', 'dwg', 'dxf', 'ifc']);
const exchangeFormats = new Set<StudioDeliveryFormat>(['glb', 'gltf', 'fbx', 'usd', 'usdz', 'obj', 'ifc']);

function extensionOf(filename: string): string {
  const basename = filename.replaceAll('\\', '/').split('/').at(-1) ?? '';
  const extension = basename.includes('.') ? basename.split('.').at(-1) ?? '' : '';
  return extension.toLowerCase();
}

export interface IntakePathAssessment {
  safe: boolean;
  quarantine: boolean;
  codes: readonly string[];
  messageAr: string;
}

export function assessIntakePath(input: {
  relativePath: string;
  symbolicLink: boolean;
  resolvedWithinRoot: boolean;
  directory: boolean;
  allowedDataExtensions?: ReadonlySet<string>;
}): IntakePathAssessment {
  const normalized = input.relativePath.replaceAll('\\', '/');
  const segments = normalized.split('/').filter(Boolean);
  const codes: string[] = [];
  const containsControlCharacter = [...normalized].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  if (!normalized || normalized.startsWith('/') || /^[a-z]:\//iu.test(normalized)) codes.push('delivery-path-absolute');
  if (segments.includes('..') || segments.includes('.')) codes.push('delivery-path-traversal');
  if (containsControlCharacter) codes.push('delivery-path-control-character');
  if (input.symbolicLink) codes.push('delivery-path-symbolic-link');
  if (!input.resolvedWithinRoot) codes.push('delivery-path-root-escape');
  if (!input.directory && segments.some((segment) => segment.startsWith('.'))) codes.push('delivery-path-hidden-file');
  if (segments.some((segment) => safeDisplayFilename(segment) !== segment)) codes.push('delivery-path-malicious-filename');
  const extension = extensionOf(normalized);
  if (!input.directory && executableExtensions.has(extension) && !input.allowedDataExtensions?.has(extension)) codes.push('delivery-path-hidden-executable');
  return {
    safe: codes.length === 0,
    quarantine: codes.length > 0,
    codes,
    messageAr: codes.length ? 'المسار أو الملف غير آمن للاستلام المحلي ونُقل إلى الحجر.' : 'المسار محصور داخل قناة الاستلام المحلية.'
  };
}

export function assessArchiveEntries(entries: readonly string[], options: { allowedDataExtensions?: ReadonlySet<string> } = {}): IntakePathAssessment {
  const codes = new Set<string>();
  for (const entry of entries) {
    const assessment = assessIntakePath({ relativePath: entry, symbolicLink: false, resolvedWithinRoot: true, directory: entry.endsWith('/'), allowedDataExtensions: options.allowedDataExtensions });
    assessment.codes.forEach((code) => codes.add(code));
    if (entry.split('/').filter(Boolean).length > 16) codes.add('delivery-archive-depth-exceeded');
  }
  if (entries.length > 10_000) codes.add('delivery-archive-entry-limit-exceeded');
  return {
    safe: codes.size === 0,
    quarantine: codes.size > 0,
    codes: [...codes].sort(),
    messageAr: codes.size ? 'بنية الأرشيف غير آمنة أو تتجاوز حدود الجرد؛ لم تُستخرج الملفات.' : 'بنية الأرشيف صالحة للجرد المحلي دون استخراج تلقائي.'
  };
}

export function assessZipCentralDirectory(bytes: Uint8Array, options: { allowedDataExtensions?: ReadonlySet<string> } = {}): IntakePathAssessment & { entries: readonly string[] } {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const decoder = new TextDecoder();
    const entries: string[] = [];
    const codes = new Set<string>();
    for (let offset = 0; offset + 46 <= bytes.length; offset += 1) {
      if (view.getUint32(offset, true) !== 0x02014b50) continue;
      const flags = view.getUint16(offset + 8, true);
      const compressionMethod = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const uncompressedSize = view.getUint32(offset + 24, true);
      const filenameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const externalAttributes = view.getUint32(offset + 38, true);
      const start = offset + 46;
      const end = start + filenameLength;
      if (end > bytes.length) throw new Error('invalid-central-directory');
      entries.push(decoder.decode(bytes.slice(start, end)));
      const unixMode = externalAttributes >>> 16;
      if ((unixMode & 0xf000) === 0xa000) codes.add('delivery-archive-symbolic-link');
      if ((flags & 0x1) !== 0) codes.add('delivery-archive-encrypted-entry');
      if (![0, 8].includes(compressionMethod)) codes.add('delivery-archive-compression-unsupported');
      if (uncompressedSize > 2 * 1024 * 1024 * 1024 || (compressedSize > 0 && uncompressedSize / compressedSize > 100)) codes.add('delivery-archive-expansion-risk');
      offset = end + extraLength + commentLength - 1;
    }
    if (!entries.length) throw new Error('missing-central-directory');
    assessArchiveEntries(entries, options).codes.forEach((code) => codes.add(code));
    return {
      safe: codes.size === 0,
      quarantine: codes.size > 0,
      codes: [...codes].sort(),
      entries,
      messageAr: codes.size ? 'بنية ZIP تحتوي مسارًا أو خاصية غير آمنة؛ لم تُستخرج الملفات.' : 'بنية ZIP صالحة للجرد المحلي دون استخراج تلقائي.'
    };
  } catch {
    return { safe: false, quarantine: true, codes: ['delivery-archive-structure-invalid'], entries: [], messageAr: 'تعذر قراءة بنية ZIP بأمان؛ نُقلت الحزمة إلى الحجر دون استخراج.' };
  }
}

export function safeDisplayFilename(filename: string): string {
  const basename = filename.replaceAll('\\', '/').split('/').at(-1) ?? 'unnamed-source';
  const withoutControls = [...basename].filter((character) => {
    const code = character.charCodeAt(0);
    return code > 31 && code !== 127;
  }).join('');
  const sanitized = withoutControls.replace(/[^\p{L}\p{N}._()\- ]/gu, '_').trim();
  return sanitized && !sanitized.startsWith('.') ? sanitized.slice(0, 180) : 'source-file';
}

export function redactPrivateSourcePath(absoluteOrRelativePath: string, sourceFingerprint: string): {
  safeDisplayName: string;
  safeOpaquePathId: string;
  pathDisclosure: 'redacted';
} {
  return {
    safeDisplayName: safeDisplayFilename(absoluteOrRelativePath),
    safeOpaquePathId: `LOCAL-PATH-${sourceFingerprint.slice(0, 16)}`,
    pathDisclosure: 'redacted'
  };
}

export function detectCredentialLikeContent(text: string): readonly string[] {
  const findings = new Set<string>();
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u.test(text)) findings.add('private-key');
  if (/\bAKIA[0-9A-Z]{16}\b/u.test(text)) findings.add('aws-access-key');
  if (/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/iu.test(text)) findings.add('bearer-token');
  if (/(?:api[_-]?key|client[_-]?secret|password)\s*[:=]\s*["']?[^\s"']{12,}/iu.test(text)) findings.add('credential-assignment');
  return [...findings].sort();
}

export function findUnexpectedExternalUris(text: string): readonly string[] {
  return [...new Set(text.match(/https?:\/\/[^\s"'<>]+/giu) ?? [])].sort();
}

export function classifyDeliverySourceType(filename: string, channel: 'operational' | 'studio-3d'): DeliverySourceType {
  if (channel === 'studio-3d') return 'studio-asset';
  return sourceTypes.get(extensionOf(filename)) ?? 'unknown';
}

export function classifyStudioDeliveryFormat(filename: string): StudioDeliveryFormat | null {
  return studioFormats.get(extensionOf(filename)) ?? null;
}

export function classifyStudioCapability(format: StudioDeliveryFormat | null): StudioAssetCapability {
  if (!format) return 'unsupported';
  if (format === 'glb' || format === 'gltf') return 'structurally-validatable';
  if (nativeStudioFormats.has(format)) return 'requires-native-software';
  if (exchangeFormats.has(format)) return 'requires-export';
  if (['jpeg-equirectangular', 'tiff-equirectangular', 'png-equirectangular', 'webp-equirectangular', 'png-flat-render', 'jpeg-flat-render', 'video', 'environment-map'].includes(format)) return 'metadata-readable';
  if (['stl', '3mf', 'projection-uv', 'projection-mask', 'calibration-reference'].includes(format)) return 'inventory-only';
  return 'unsupported';
}

export function mimeTypeForFilename(filename: string): string | null {
  const extension = extensionOf(filename);
  const types: Record<string, string> = {
    pdf: 'application/pdf', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv: 'text/csv',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    json: 'application/json', zip: 'application/zip', glb: 'model/gltf-binary', gltf: 'model/gltf+json', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', webp: 'image/webp', tif: 'image/tiff', tiff: 'image/tiff', mp4: 'video/mp4', mov: 'video/quicktime'
  };
  return types[extension] ?? null;
}

export function classifyInventoryDuplicate(
  existing: Pick<DeliverySourceInventoryRecord, 'sourceRecordId' | 'safeDisplayFilename' | 'sha256' | 'byteSize'>,
  incoming: Pick<DeliverySourceInventoryRecord, 'sourceRecordId' | 'safeDisplayFilename' | 'sha256' | 'byteSize'>
): 'distinct' | 'duplicate' | 'conflict' {
  if (existing.sha256 === incoming.sha256 && existing.byteSize === incoming.byteSize) return 'duplicate';
  if (existing.sourceRecordId === incoming.sourceRecordId || existing.safeDisplayFilename === incoming.safeDisplayFilename) return 'conflict';
  return 'distinct';
}

export function classifyGpsMetadata(bytes: Uint8Array): 'present' | 'absent' | 'unknown' {
  if (bytes.length < 12) return 'unknown';
  const hasExif = bytes.some((byte, index) => byte === 0x45 && bytes[index + 1] === 0x78 && bytes[index + 2] === 0x69 && bytes[index + 3] === 0x66);
  if (!hasExif) return 'absent';
  for (let index = 0; index < bytes.length - 1; index += 1) {
    if ((bytes[index] === 0x88 && bytes[index + 1] === 0x25) || (bytes[index] === 0x25 && bytes[index + 1] === 0x88)) return 'present';
  }
  return 'unknown';
}
