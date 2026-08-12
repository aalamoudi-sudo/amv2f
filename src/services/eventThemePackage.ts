import { eventThemeStatusValues, type EventThemePackage, type EventThemeValidationIssue, type EventThemeValidationResult, type ResolvedEventTheme } from '../types/eventThemePackage';

export const EVENT_THEME_CORE_COMPATIBILITY_VERSION = '1.0.0';

export const immutableOperationalSemantics = Object.freeze({
  reported: Object.freeze({ labelAr: 'مُبلّغ', shape: 'circle', icon: 'radio', color: '#2563EB' }),
  unverified: Object.freeze({ labelAr: 'غير متحقق', shape: 'ring', icon: 'help-circle', color: '#52606D' }),
  verified: Object.freeze({ labelAr: 'متحقق', shape: 'check', icon: 'badge-check', color: '#087A55' }),
  provisional: Object.freeze({ labelAr: 'مبدئي', shape: 'dash', icon: 'file-clock', color: '#7C3AED' }),
  scenario: Object.freeze({ labelAr: 'سيناريو', shape: 'diamond', icon: 'split', color: '#A85D00' }),
  quarantined: Object.freeze({ labelAr: 'محجور', shape: 'octagon', icon: 'shield-alert', color: '#9F3A46' }),
  warning: Object.freeze({ labelAr: 'تحذير', shape: 'triangle', icon: 'triangle-alert', color: '#9A5B00' }),
  critical: Object.freeze({ labelAr: 'حرج', shape: 'square', icon: 'siren', color: '#B42318' }),
  disconnected: Object.freeze({ labelAr: 'غير متصل', shape: 'broken-line', icon: 'unplug', color: '#475467' }),
  rejected: Object.freeze({ labelAr: 'مرفوض', shape: 'cross', icon: 'circle-x', color: '#8E2635' })
} as const);

export const mayadeenShellBrandTokens = Object.freeze({
  shell: Object.freeze({ background: '#FFFFFF', foreground: '#241D33', usageAr: 'غلاف ميادين الفاتح' }),
  primaryAction: Object.freeze({ background: '#503399', foreground: '#FFFFFF', usageAr: 'الإجراء الأساسي لهوية ميادين' }),
  accent: Object.freeze({ background: '#DDF4F2', foreground: '#163D3A', usageAr: 'لمسة فيروزية مقيدة' }),
  focus: Object.freeze({ background: '#005FCC', foreground: '#FFFFFF', usageAr: 'مؤشر تركيز ثابت عبر الفعاليات' })
} as const);

const requiredTopLevelFields = [
  'themeId',
  'version',
  'eventId',
  'status',
  'sourceReferences',
  'owner',
  'approvedBy',
  'approvedAt',
  'coreCompatibilityVersion',
  'brandTokens',
  'eventTokens',
  'spatialTokens',
  'imagery',
  'patterns',
  'typography',
  'assetRightsStatus',
  'fallbackTheme',
  'contentHash',
  'rollbackTarget'
] as const;

const protectedSemanticNames = [
  'reported',
  'unverified',
  'verified',
  'provisional',
  'scenario',
  'quarantined',
  'warning',
  'critical',
  'disconnected',
  'rejected',
  'truth',
  'severity',
  'readiness'
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function issue(code: string, path: string, messageAr: string): EventThemeValidationIssue {
  return { code, path, messageAr, blocking: true };
}

function normalizeTokenName(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, '');
}

function isProtectedSemanticName(value: string): boolean {
  const normalized = normalizeTokenName(value);
  return protectedSemanticNames.some((name) => normalized.includes(name));
}

function collectProtectedKeys(value: unknown, path: string, issues: EventThemeValidationIssue[]): void {
  if (!isRecord(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    if (isProtectedSemanticName(key)) {
      issues.push(issue('THEME_SEMANTIC_OVERRIDE', `${path}.${key}`, 'لا يجوز لسمة فعالية تعريف أو تجاوز دلالات الحقيقة أو الشدة أو الجاهزية.'));
    }
    collectProtectedKeys(nested, `${path}.${key}`, issues);
  }
}

function parseHex(value: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match?.[1]) return null;
  return [
    Number.parseInt(match[1].slice(0, 2), 16),
    Number.parseInt(match[1].slice(2, 4), 16),
    Number.parseInt(match[1].slice(4, 6), 16)
  ];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const channels = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return (channels[0] ?? 0) * 0.2126 + (channels[1] ?? 0) * 0.7152 + (channels[2] ?? 0) * 0.0722;
}

export function colorContrastRatio(background: string, foreground: string): number | null {
  const backgroundRgb = parseHex(background);
  const foregroundRgb = parseHex(foreground);
  if (!backgroundRgb || !foregroundRgb) return null;
  const backgroundLuminance = relativeLuminance(backgroundRgb);
  const foregroundLuminance = relativeLuminance(foregroundRgb);
  const lighter = Math.max(backgroundLuminance, foregroundLuminance);
  const darker = Math.min(backgroundLuminance, foregroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function validateReadableToken(value: unknown, path: string, issues: EventThemeValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push(issue('THEME_COLOR_PAIR_REQUIRED', path, 'يجب أن يعرّف كل لون خلفية لون نص مقروءًا.'));
    return;
  }
  const background = value.background;
  const foreground = value.foreground;
  if (typeof background !== 'string' || typeof foreground !== 'string') {
    issues.push(issue('THEME_FOREGROUND_REQUIRED', path, 'لون الخلفية ولون النص المقروء مطلوبان معًا.'));
    return;
  }
  const ratio = colorContrastRatio(background, foreground);
  if (ratio === null) {
    issues.push(issue('THEME_COLOR_FORMAT', path, 'يجب أن تستخدم أزواج الألوان صيغة HEX محلية قابلة للتحقق.'));
  } else if (ratio < 4.5) {
    issues.push(issue('THEME_COLOR_CONTRAST', path, `نسبة التباين ${ratio.toFixed(2)} أقل من 4.5:1 للنص العادي.`));
  }
}

function validateColorGroup(value: unknown, path: string, issues: EventThemeValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push(issue('THEME_TOKEN_GROUP_REQUIRED', path, 'مجموعة ألوان السمة مطلوبة.'));
    return;
  }
  for (const [key, token] of Object.entries(value)) {
    validateReadableToken(token, `${path}.${key}`, issues);
  }
}

function sameBrandTokens(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return JSON.stringify(value) === JSON.stringify(mayadeenShellBrandTokens);
}

function isRemoteUri(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function validateSourceLinkedAssets(theme: Record<string, unknown>, eventId: string, issues: EventThemeValidationIssue[]): void {
  const sourceReferences = Array.isArray(theme.sourceReferences) ? theme.sourceReferences : [];
  const sourceIds = new Set(sourceReferences.flatMap((source) => isRecord(source) && typeof source.sourceId === 'string' ? [source.sourceId] : []));
  sourceReferences.forEach((source, index) => {
    if (!isRecord(source) || source.rightsStatus === 'unknown') {
      issues.push(issue('THEME_ASSET_RIGHTS_UNKNOWN', `sourceReferences[${index}].rightsStatus`, 'لا يجوز تفعيل مصدر أصول بحالة حقوق غير معروفة.'));
    }
  });

  const imagery = Array.isArray(theme.imagery) ? theme.imagery : [];
  imagery.forEach((asset, index) => {
    const path = `imagery[${index}]`;
    if (!isRecord(asset)) {
      issues.push(issue('THEME_ASSET_INVALID', path, 'أصل الصورة غير صالح.'));
      return;
    }
    if (asset.eventId !== eventId) {
      issues.push(issue('THEME_EVENT_LEAKAGE', `${path}.eventId`, 'أصل الصورة لا يطابق نطاق فعالية السمة.'));
    }
    if (asset.provenanceStatus === 'unknown' || typeof asset.sourceReference !== 'string' || !sourceIds.has(asset.sourceReference)) {
      issues.push(issue('THEME_ASSET_PROVENANCE', path, 'لا يجوز استخدام أصل مجهول المصدر أو غير مرتبط بسجل المصادر.'));
    }
    if (asset.rightsStatus === 'unknown') {
      issues.push(issue('THEME_ASSET_RIGHTS_UNKNOWN', `${path}.rightsStatus`, 'لا يجوز تفعيل أصل بحالة حقوق غير معروفة.'));
    }
    if (typeof asset.uri !== 'string' || !asset.uri) {
      issues.push(issue('THEME_ASSET_URI', `${path}.uri`, 'مسار الأصل المحلي مطلوب.'));
    } else if (isRemoteUri(asset.uri) && asset.remoteApprovalStatus !== 'approved') {
      issues.push(issue('THEME_REMOTE_ASSET', `${path}.uri`, 'رابط الصورة البعيد مرفوض ما لم يحمل اعتمادًا صريحًا.'));
    }
  });

  const patterns = Array.isArray(theme.patterns) ? theme.patterns : [];
  patterns.forEach((pattern, index) => {
    const path = `patterns[${index}]`;
    if (!isRecord(pattern)) {
      issues.push(issue('THEME_PATTERN_INVALID', path, 'نمط السمة غير صالح.'));
      return;
    }
    if (pattern.eventId !== eventId) {
      issues.push(issue('THEME_EVENT_LEAKAGE', `${path}.eventId`, 'نمط السمة لا يطابق نطاق الفعالية.'));
    }
    if (pattern.provenanceStatus === 'unknown' || typeof pattern.sourceReference !== 'string' || !sourceIds.has(pattern.sourceReference)) {
      issues.push(issue('THEME_ASSET_PROVENANCE', path, 'لا يجوز استخدام نمط مجهول المصدر أو غير مرتبط بسجل المصادر.'));
    }
    if (pattern.rightsStatus === 'unknown') {
      issues.push(issue('THEME_ASSET_RIGHTS_UNKNOWN', `${path}.rightsStatus`, 'لا يجوز تفعيل نمط بحالة حقوق غير معروفة.'));
    }
  });
}

function validateTypography(value: unknown, issues: EventThemeValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push(issue('THEME_TYPOGRAPHY_REQUIRED', 'typography', 'عقد الطباعة مطلوب.'));
    return;
  }
  for (const key of ['headingFamily', 'bodyFamily', 'technicalFamily'] as const) {
    if (typeof value[key] !== 'string' || value[key].trim().length === 0) {
      issues.push(issue('THEME_FONT_REQUIRED', `typography.${key}`, 'يجب تحديد خط محلي أو fallback مقروء.'));
    }
  }
  if (typeof value.remoteFontUrl === 'string' && isRemoteUri(value.remoteFontUrl)) {
    issues.push(issue('THEME_REMOTE_FONT', 'typography.remoteFontUrl', 'الخطوط البعيدة غير معتمدة في عقد السمة المحلي.'));
  }
}

export function validateEventThemePackage(input: unknown, expectedEventId?: string): EventThemeValidationResult {
  const issues: EventThemeValidationIssue[] = [];
  if (!isRecord(input)) {
    return { valid: false, issues: [issue('THEME_PACKAGE_REQUIRED', '$', 'حزمة سمة الفعالية مطلوبة.')], theme: null };
  }

  for (const field of requiredTopLevelFields) {
    if (!(field in input)) {
      issues.push(issue('THEME_FIELD_REQUIRED', field, `الحقل ${field} مطلوب في عقد السمة.`));
    }
  }
  for (const field of Object.keys(input)) {
    if (!requiredTopLevelFields.includes(field as (typeof requiredTopLevelFields)[number])) {
      issues.push(issue('THEME_UNKNOWN_FIELD', field, 'الحقل غير معروف وقد يحاول تغيير دلالة تشغيلية خارج عقد السمة.'));
    }
  }

  const eventId = typeof input.eventId === 'string' ? input.eventId : '';
  if (!eventId) issues.push(issue('THEME_EVENT_REQUIRED', 'eventId', 'معرف الفعالية مطلوب.'));
  if (expectedEventId && eventId !== expectedEventId) {
    issues.push(issue('THEME_EVENT_LEAKAGE', 'eventId', 'حزمة السمة لا تطابق نطاق الفعالية المطلوبة.'));
  }
  if (typeof input.status !== 'string' || !eventThemeStatusValues.includes(input.status as (typeof eventThemeStatusValues)[number])) {
    issues.push(issue('THEME_STATUS_INVALID', 'status', 'حالة السمة يجب أن تكون temporary-demo أو candidate أو approved أو retired.'));
  }
  if (input.coreCompatibilityVersion !== EVENT_THEME_CORE_COMPATIBILITY_VERSION) {
    issues.push(issue('THEME_CORE_VERSION', 'coreCompatibilityVersion', 'إصدار توافق Core غير مدعوم.'));
  }
  if (!sameBrandTokens(input.brandTokens)) {
    issues.push(issue('THEME_CORE_BRAND_OVERRIDE', 'brandTokens', 'سمة الفعالية لا تملك تغيير هوية غلاف ميادين أو تركيز الوصول.'));
  }
  if (input.status === 'approved' && (typeof input.approvedBy !== 'string' || typeof input.approvedAt !== 'string')) {
    issues.push(issue('THEME_APPROVAL_REQUIRED', 'approvedBy', 'السمة المعتمدة تحتاج جهة اعتماد ووقت اعتماد صريحين.'));
  }

  collectProtectedKeys(input.eventTokens, 'eventTokens', issues);
  collectProtectedKeys(input.spatialTokens, 'spatialTokens', issues);
  validateColorGroup(input.brandTokens, 'brandTokens', issues);
  validateColorGroup(input.eventTokens, 'eventTokens', issues);
  validateColorGroup(input.spatialTokens, 'spatialTokens', issues);
  validateSourceLinkedAssets(input, eventId, issues);
  validateTypography(input.typography, issues);

  if (!Array.isArray(input.sourceReferences) || input.sourceReferences.length === 0) {
    issues.push(issue('THEME_SOURCES_REQUIRED', 'sourceReferences', 'يجب ربط السمة بمصدر واحد على الأقل.'));
  }
  if (input.assetRightsStatus === 'unknown') {
    issues.push(issue('THEME_ASSET_RIGHTS_UNKNOWN', 'assetRightsStatus', 'حالة حقوق الأصول الإجمالية لا يجوز أن تكون unknown.'));
  }
  if (!isRecord(input.fallbackTheme) || typeof input.fallbackTheme.themeId !== 'string' || typeof input.fallbackTheme.version !== 'string') {
    issues.push(issue('THEME_FALLBACK_REQUIRED', 'fallbackTheme', 'مرجع fallback آمن مطلوب.'));
  }
  if (typeof input.contentHash !== 'string' || input.contentHash.length < 16) {
    issues.push(issue('THEME_HASH_REQUIRED', 'contentHash', 'بصمة محتوى السمة مطلوبة.'));
  }
  if (typeof input.rollbackTarget !== 'string' || input.rollbackTarget.length === 0) {
    issues.push(issue('THEME_ROLLBACK_REQUIRED', 'rollbackTarget', 'هدف الرجوع مطلوب.'));
  }

  return {
    valid: issues.length === 0,
    issues,
    theme: issues.length === 0 ? input as unknown as EventThemePackage : null
  };
}

export function resolveEventThemePackage(
  eventId: string,
  themes: readonly EventThemePackage[],
  fallbackTheme: EventThemePackage
): ResolvedEventTheme {
  const candidate = themes.find((theme) => theme.eventId === eventId);
  if (candidate) {
    const validation = validateEventThemePackage(candidate, eventId);
    if (validation.valid && validation.theme) {
      return { theme: validation.theme, resolution: 'event-theme', issues: [] };
    }
    const fallbackValidation = validateEventThemePackage(fallbackTheme);
    if (!fallbackValidation.valid || !fallbackValidation.theme) {
      throw new Error('Safe fallback theme is invalid.');
    }
    return { theme: fallbackValidation.theme, resolution: 'safe-fallback', issues: validation.issues };
  }

  const fallbackValidation = validateEventThemePackage(fallbackTheme);
  if (!fallbackValidation.valid || !fallbackValidation.theme) {
    throw new Error('Safe fallback theme is invalid.');
  }
  return { theme: fallbackValidation.theme, resolution: 'safe-fallback', issues: [] };
}
