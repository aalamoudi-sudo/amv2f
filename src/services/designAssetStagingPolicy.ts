export function isSafeDesignAssetRelativePath(value: string): boolean {
  if (!value || value.startsWith('/') || value.includes('\\') || value.includes('\0')) return false;
  const segments = value.split('/');
  return segments.every((segment) => Boolean(segment) && segment !== '.' && segment !== '..');
}

export function isSafeDesignRuntimeUri(value: string | null): boolean {
  return value === null || (
    value.startsWith('/local-assets/experience-scenes/')
    && !value.includes('..')
    && !value.includes('\\')
    && !value.includes('/Users/')
    && !/^https?:/i.test(value)
  );
}

export function sameDesignAssetFingerprint(
  left: { sha256: string; byteSize: number },
  right: { sha256: string; byteSize: number }
): boolean {
  return left.sha256 === right.sha256 && left.byteSize === right.byteSize;
}
