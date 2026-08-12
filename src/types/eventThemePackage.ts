export const eventThemeStatusValues = [
  'temporary-demo',
  'candidate',
  'approved',
  'retired'
] as const;

export type EventThemeStatus = (typeof eventThemeStatusValues)[number];
export type ThemeSourceClassification = 'authoritative' | 'candidate' | 'review-only';
export type ThemeAssetRightsStatus = 'approved-internal' | 'review-only' | 'restricted' | 'unknown';
export type ThemeAssetProvenanceStatus = 'approved-internal' | 'source-linked' | 'unknown';

export interface EventThemeSourceReference {
  sourceId: string;
  fileName: string;
  pageReferences: number[];
  classification: ThemeSourceClassification;
  rightsStatus: ThemeAssetRightsStatus;
  noteAr: string;
}

export interface ReadableColorToken {
  background: string;
  foreground: string;
  usageAr: string;
}

export interface EventThemeBrandTokens {
  shell: ReadableColorToken;
  primaryAction: ReadableColorToken;
  accent: ReadableColorToken;
  focus: ReadableColorToken;
}

export interface EventThemeEventTokens {
  page: ReadableColorToken;
  primary: ReadableColorToken;
  secondary: ReadableColorToken;
  accent: ReadableColorToken;
  soft: ReadableColorToken;
}

export interface EventThemeSpatialTokens {
  canvas: ReadableColorToken;
  logicalNode: ReadableColorToken;
  relationship: ReadableColorToken;
  geometryAbsent: ReadableColorToken;
}

export interface EventThemeImageAsset {
  assetId: string;
  eventId: string;
  role: 'mayadeen-logo' | 'event-logo' | 'hero' | 'story';
  uri: string;
  altAr: string;
  sourceReference: string;
  provenanceStatus: ThemeAssetProvenanceStatus;
  rightsStatus: ThemeAssetRightsStatus;
  remoteApprovalStatus: 'not-applicable' | 'approved' | 'rejected';
}

export interface EventThemePattern {
  patternId: string;
  eventId: string;
  kind: 'css-organic' | 'local-raster';
  token: string;
  sourceReference: string;
  provenanceStatus: ThemeAssetProvenanceStatus;
  rightsStatus: ThemeAssetRightsStatus;
}

export interface EventThemeTypography {
  headingFamily: string;
  bodyFamily: string;
  technicalFamily: string;
  sourceReference: string;
  remoteFontUrl: string | null;
  approvalStatus: 'core-compatible' | 'candidate';
}

export interface EventThemeFallbackReference {
  themeId: string;
  version: string;
}

export interface EventThemePackage {
  themeId: string;
  version: string;
  eventId: string;
  status: EventThemeStatus;
  sourceReferences: EventThemeSourceReference[];
  owner: string;
  approvedBy: string | null;
  approvedAt: string | null;
  coreCompatibilityVersion: string;
  brandTokens: EventThemeBrandTokens;
  eventTokens: EventThemeEventTokens;
  spatialTokens: EventThemeSpatialTokens;
  imagery: EventThemeImageAsset[];
  patterns: EventThemePattern[];
  typography: EventThemeTypography;
  assetRightsStatus: ThemeAssetRightsStatus;
  fallbackTheme: EventThemeFallbackReference;
  contentHash: string;
  rollbackTarget: string;
}

export interface EventThemeValidationIssue {
  code: string;
  path: string;
  messageAr: string;
  blocking: true;
}

export interface EventThemeValidationResult {
  valid: boolean;
  issues: EventThemeValidationIssue[];
  theme: EventThemePackage | null;
}

export interface ResolvedEventTheme {
  theme: EventThemePackage;
  resolution: 'event-theme' | 'safe-fallback';
  issues: EventThemeValidationIssue[];
}
