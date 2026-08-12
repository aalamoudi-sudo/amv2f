import { EVENT_THEME_CORE_COMPATIBILITY_VERSION, mayadeenShellBrandTokens } from '../services/eventThemePackage';
import type { EventThemePackage, ReadableColorToken } from '../types/eventThemePackage';

const arabicDisplayStack = "'IBM Plex Sans Arabic', 'Noto Kufi Arabic', 'Geeza Pro', 'Tahoma', sans-serif";
const technicalStack = "'SFMono-Regular', 'Cascadia Code', 'Roboto Mono', monospace";

function token(background: string, foreground: string, usageAr: string): ReadableColorToken {
  return { background, foreground, usageAr };
}

const stableBrandTokens: EventThemePackage['brandTokens'] = {
  shell: { ...mayadeenShellBrandTokens.shell },
  primaryAction: { ...mayadeenShellBrandTokens.primaryAction },
  accent: { ...mayadeenShellBrandTokens.accent },
  focus: { ...mayadeenShellBrandTokens.focus }
};

export const mayadeenShellAssets = Object.freeze({
  brandmark: Object.freeze({
    assetId: 'ASSET-MAYADEEN-BRANDMARK-REVIEW',
    uri: '/visual-direction/mayadeen-brandmark-review.png',
    altAr: 'شعار ميادين',
    sourceReference: 'SOURCE-MAYADEEN-BRANDMARK-2026',
    rightsStatus: 'approved-internal' as const
  }),
  arabicLogo: Object.freeze({
    assetId: 'ASSET-MAYADEEN-ARABIC-LOGO-REVIEW',
    uri: '/visual-direction/mayadeen-arabic-logo-review.png',
    altAr: 'شعار ميادين العربي',
    sourceReference: 'SOURCE-MAYADEEN-ARABIC-LOGO-2024',
    rightsStatus: 'approved-internal' as const
  })
});

export const neutralFallbackEventTheme: EventThemePackage = {
  themeId: 'THEME-MAYADEEN-NEUTRAL-FALLBACK',
  version: '1.0.0',
  eventId: 'EVENT-THEME-FALLBACK',
  status: 'temporary-demo',
  sourceReferences: [{
    sourceId: 'SOURCE-MAYADEEN-GUIDE-2026',
    fileName: 'الدليل الارشادي لـ ميادين.pdf',
    pageReferences: [1, 7, 9, 40, 44, 61],
    classification: 'authoritative',
    rightsStatus: 'approved-internal',
    noteAr: 'مرجع داخلي للغلاف والهوية فقط؛ عينات الألوان ليست أكوادًا رسمية منشورة.'
  }],
  owner: 'Mayadeen Events',
  approvedBy: null,
  approvedAt: null,
  coreCompatibilityVersion: EVENT_THEME_CORE_COMPATIBILITY_VERSION,
  brandTokens: stableBrandTokens,
  eventTokens: {
    page: token('#F7F5F1', '#23212A', 'سطح فعالية محايد'),
    primary: token('#334155', '#FFFFFF', 'هوية فعالية fallback محايدة'),
    secondary: token('#E8ECF1', '#243043', 'سطح ثانوي محايد'),
    accent: token('#DDE7F2', '#1E3A5F', 'تأكيد محايد غير تشغيلي'),
    soft: token('#FFFFFF', '#374151', 'مساحة محتوى محايدة')
  },
  spatialTokens: {
    canvas: token('#17212B', '#F8FAFC', 'لوحة مكان مركزة'),
    logicalNode: token('#DCE6F1', '#26394D', 'عقدة منطقية غير مكانية'),
    relationship: token('#234E70', '#FFFFFF', 'علاقة منطقية'),
    geometryAbsent: token('#2E3742', '#F1F5F9', 'غياب هندسة صريح')
  },
  imagery: [],
  patterns: [{
    patternId: 'PATTERN-MAYADEEN-NEUTRAL-001',
    eventId: 'EVENT-THEME-FALLBACK',
    kind: 'css-organic',
    token: 'neutral-grid',
    sourceReference: 'SOURCE-MAYADEEN-GUIDE-2026',
    provenanceStatus: 'source-linked',
    rightsStatus: 'approved-internal'
  }],
  typography: {
    headingFamily: arabicDisplayStack,
    bodyFamily: arabicDisplayStack,
    technicalFamily: technicalStack,
    sourceReference: 'SOURCE-MAYADEEN-GUIDE-2026',
    remoteFontUrl: null,
    approvalStatus: 'core-compatible'
  },
  assetRightsStatus: 'approved-internal',
  fallbackTheme: { themeId: 'THEME-MAYADEEN-NEUTRAL-FALLBACK', version: '1.0.0' },
  contentHash: 'sha256:0e9c71547a756192cad308460f41619e13369992e31a9cbbf373547480b94d0d',
  rollbackTarget: 'THEME-MAYADEEN-NEUTRAL-FALLBACK@1.0.0'
};

export const kapCandidateEventTheme: EventThemePackage = {
  themeId: 'THEME-KAP-HYBRID-LIGHT-CANDIDATE',
  version: '0.1.0',
  eventId: 'EVENT-KAP-OPENING-2026',
  status: 'candidate',
  sourceReferences: [
    {
      sourceId: 'SOURCE-MAYADEEN-GUIDE-2026',
      fileName: 'الدليل الارشادي لـ ميادين.pdf',
      pageReferences: [1, 4, 7, 9, 12, 40, 44, 61],
      classification: 'authoritative',
      rightsStatus: 'approved-internal',
      noteAr: 'مرجع الغلاف البنفسجي والأسطح البيضاء واللمسة الفيروزية والتسلسل العربي.'
    },
    {
      sourceId: 'SOURCE-MAYADEEN-BRANDMARK-2026',
      fileName: 'MAYADEEN-BRANDMARK.pdf',
      pageReferences: [1],
      classification: 'authoritative',
      rightsStatus: 'approved-internal',
      noteAr: 'أصل علامة ميادين المورّد محليًا؛ اللون داخل الأصل لا يعاد تعريفه.'
    },
    {
      sourceId: 'SOURCE-MAYADEEN-ARABIC-LOGO-2024',
      fileName: 'شعار ميادين.pdf',
      pageReferences: [1],
      classification: 'authoritative',
      rightsStatus: 'approved-internal',
      noteAr: 'نسخة الشعار العربي المورّدة محليًا للاستخدام داخل مساحة المراجعة.'
    },
    {
      sourceId: 'SOURCE-KAP-PRESENTATION-V03-2026',
      fileName: 'حفل تدشين حدائق الملك عبدالله (كاقا)V03 copy.pdf',
      pageReferences: [1, 2, 3, 4, 5, 6, 14, 20, 30, 31, 32],
      classification: 'candidate',
      rightsStatus: 'review-only',
      noteAr: 'مرجع مرشح للغة النباتية والصور المعمارية؛ لا يثبت محتوى أو مسارًا أو حالة تشغيلية.'
    }
  ],
  owner: 'Mayadeen Events',
  approvedBy: null,
  approvedAt: null,
  coreCompatibilityVersion: EVENT_THEME_CORE_COMPATIBILITY_VERSION,
  brandTokens: stableBrandTokens,
  eventTokens: {
    page: token('#FCF8EF', '#243029', 'خلفية عاجية دافئة لعروض KAP'),
    primary: token('#46803F', '#FFFFFF', 'أخضر الحديقة المرشح'),
    secondary: token('#006E3F', '#FFFFFF', 'أخضر طبيعي عميق مرشح'),
    accent: token('#D19400', '#251B05', 'ذهبي دافئ للهوية لا للتحذير'),
    soft: token('#F2F8F5', '#16372D', 'سطح مينت فاتح للمحتوى')
  },
  spatialTokens: {
    canvas: token('#172821', '#F7FBF8', 'لوحة مكان داكنة مركزة داخل الغلاف الفاتح'),
    logicalNode: token('#E5F0EB', '#1B4032', 'نقطة تجربة منطقية غير مكانية'),
    relationship: token('#5CC3BE', '#153936', 'علاقة منطقية مرشحة'),
    geometryAbsent: token('#2B3933', '#F2F8F5', 'حالة هندسة غير متاحة')
  },
  imagery: [
    {
      assetId: 'ASSET-KAP-COVER-REVIEW',
      eventId: 'EVENT-KAP-OPENING-2026',
      role: 'hero',
      uri: '/visual-direction/kap-cover-review.png',
      altAr: 'صورة معمارية لحدائق الملك عبدالله من عرض الفعالية المرشح',
      sourceReference: 'SOURCE-KAP-PRESENTATION-V03-2026',
      provenanceStatus: 'source-linked',
      rightsStatus: 'review-only',
      remoteApprovalStatus: 'not-applicable'
    },
    {
      assetId: 'ASSET-KAP-BOTANICAL-REVIEW',
      eventId: 'EVENT-KAP-OPENING-2026',
      role: 'story',
      uri: '/visual-direction/kap-botanical-review.png',
      altAr: 'معالجة نباتية من عرض الفعالية المرشح',
      sourceReference: 'SOURCE-KAP-PRESENTATION-V03-2026',
      provenanceStatus: 'source-linked',
      rightsStatus: 'review-only',
      remoteApprovalStatus: 'not-applicable'
    }
  ],
  patterns: [{
    patternId: 'PATTERN-KAP-ORGANIC-001',
    eventId: 'EVENT-KAP-OPENING-2026',
    kind: 'css-organic',
    token: 'kap-organic-leaf',
    sourceReference: 'SOURCE-KAP-PRESENTATION-V03-2026',
    provenanceStatus: 'source-linked',
    rightsStatus: 'review-only'
  }],
  typography: {
    headingFamily: arabicDisplayStack,
    bodyFamily: arabicDisplayStack,
    technicalFamily: technicalStack,
    sourceReference: 'SOURCE-MAYADEEN-GUIDE-2026',
    remoteFontUrl: null,
    approvalStatus: 'candidate'
  },
  assetRightsStatus: 'review-only',
  fallbackTheme: { themeId: neutralFallbackEventTheme.themeId, version: neutralFallbackEventTheme.version },
  contentHash: 'sha256:46a6d96ed3d78f74c95ee6fdab3e5601b271ab521530f4cfb5f36a1a83a37eb9',
  rollbackTarget: 'THEME-MAYADEEN-NEUTRAL-FALLBACK@1.0.0'
};

export const conferenceReferenceEventTheme: EventThemePackage = {
  themeId: 'THEME-CONFERENCE-REFERENCE-TEMPORARY',
  version: '0.1.0',
  eventId: 'EVENT-CONFERENCE-TEST-001',
  status: 'temporary-demo',
  sourceReferences: [{
    sourceId: 'SOURCE-CONF-PROGRAM-001',
    fileName: 'Synthetic conference reference fixture',
    pageReferences: [],
    classification: 'review-only',
    rightsStatus: 'approved-internal',
    noteAr: 'حزمة اختبار محلية لإثبات عزل السمات فقط، بلا صور أو بيانات تشغيلية.'
  }],
  owner: 'Mayadeen Platform',
  approvedBy: null,
  approvedAt: null,
  coreCompatibilityVersion: EVENT_THEME_CORE_COMPATIBILITY_VERSION,
  brandTokens: stableBrandTokens,
  eventTokens: {
    page: token('#F4F1EA', '#252A34', 'خلفية مرجعية محايدة للمؤتمر'),
    primary: token('#243B53', '#FFFFFF', 'أزرق داكن مرجعي للمؤتمر'),
    secondary: token('#486581', '#FFFFFF', 'أزرق ثانوي مرجعي'),
    accent: token('#E7C46A', '#30240A', 'ذهبي رملي مرجعي'),
    soft: token('#EAF0F5', '#25384A', 'سطح أزرق فاتح مرجعي')
  },
  spatialTokens: {
    canvas: token('#17202A', '#F8FAFC', 'لوحة مكان مرجعية'),
    logicalNode: token('#DCE6EF', '#26394D', 'نقطة برنامج منطقية'),
    relationship: token('#486581', '#FFFFFF', 'علاقة برنامج مرجعية'),
    geometryAbsent: token('#303B46', '#F8FAFC', 'غياب هندسة مرجعية')
  },
  imagery: [],
  patterns: [{
    patternId: 'PATTERN-CONFERENCE-REFERENCE-001',
    eventId: 'EVENT-CONFERENCE-TEST-001',
    kind: 'css-organic',
    token: 'conference-reference-lines',
    sourceReference: 'SOURCE-CONF-PROGRAM-001',
    provenanceStatus: 'approved-internal',
    rightsStatus: 'approved-internal'
  }],
  typography: {
    headingFamily: arabicDisplayStack,
    bodyFamily: arabicDisplayStack,
    technicalFamily: technicalStack,
    sourceReference: 'SOURCE-CONF-PROGRAM-001',
    remoteFontUrl: null,
    approvalStatus: 'core-compatible'
  },
  assetRightsStatus: 'approved-internal',
  fallbackTheme: { themeId: neutralFallbackEventTheme.themeId, version: neutralFallbackEventTheme.version },
  contentHash: 'sha256:77c13e44ec9e037708479407dced46069926193bcfcc623a1fd0c71aaacfcf62',
  rollbackTarget: 'THEME-MAYADEEN-NEUTRAL-FALLBACK@1.0.0'
};

export const eventThemePackages = [kapCandidateEventTheme, conferenceReferenceEventTheme] as const;
