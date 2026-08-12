import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import {
  deriveOperationalSourceFingerprint,
  deriveOperationalSourceTraceFingerprint,
  freezeOperationalReadinessSourceExtractionManifest,
  operationalSourceRevisionId
} from '../src/services/operationalReadinessPack';
import type {
  OperationalReadinessSource,
  OperationalSourceTrace
} from '../src/types/operationalReadinessPack';
import {
  assertNoPrivateContactData,
  normalizeExtractedOfficeText,
  parsePptxSlideXml,
  parseSharedStringsXml,
  parseWorkbookSheetRows,
  selectApprovedWorkbookFields,
  type ExtractedPptxSlide
} from './lib/officeSourceExtraction';

const projectId = 'PROJECT-KAP-OPENING-2026';
const createdAt = '2026-07-29T16:06:13+03:00';
const outputPath = resolve('pilot-input/manifests/kap-readiness-source-extraction-v1.json');

const sourcePaths = {
  governance: '/Users/mayadeen/Downloads/حوكمة_مشروع_حدائق_الملك_عبدالله_  05-07-2026 (3).pptx',
  cad: '/Users/mayadeen/Downloads/Kaig-master 2.dwg',
  employee: '/Users/mayadeen/Downloads/اسماء موظفين ميادين .xlsx',
  founder: '/Users/mayadeen/.codex/attachments/777fc698-0cec-4828-8eec-1bdeef4ce651/pasted-text.txt'
} as const;

const sourceIds = {
  governance: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001',
  cad: 'SOURCE-ASSET-KAP-DWG-LOCAL-001',
  employee: 'SOURCE-ASSET-KAP-EMPLOYEE-XLSX-001',
  founder: 'SOURCE-ASSET-STAGE3G1-FOUNDER-DIRECTION-001'
} as const;

const expectedSources = {
  governance: {
    byteSize: 6_403_790,
    sha256: '8b45cff4b505d5e1b08088c84426d46895d4cb127580e2c388a655cc44bf63fb'
  },
  cad: {
    byteSize: 99_452_545,
    sha256: 'a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d'
  },
  employee: {
    byteSize: 15_661,
    sha256: 'fac606e4517e8d6e2f070dab4582d980b932c8eca2d9f5a0f3ea0fb18a746aec'
  },
  founder: {
    byteSize: 29_659,
    sha256: 'b74fcd1eee9d5c38044ee0bae3ea8868b79a5018924dcb9e6b41296788a49bd5'
  }
} as const;

async function sha256File(path: string): Promise<string> {
  return new Promise((resolveHash, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(path);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolveHash(hash.digest('hex')));
  });
}

async function verifyFile(
  key: keyof typeof sourcePaths
): Promise<{ byteSize: number; sha256: string }> {
  const [metadata, sha256] = await Promise.all([
    stat(sourcePaths[key]),
    sha256File(sourcePaths[key])
  ]);
  const expected = expectedSources[key];
  if (metadata.size !== expected.byteSize || sha256 !== expected.sha256) {
    throw new Error(`SOURCE_FINGERPRINT_MISMATCH:${key}:${metadata.size}:${sha256}`);
  }
  return { byteSize: metadata.size, sha256 };
}

function source(input: Omit<
  OperationalReadinessSource,
  | 'sourceRevisionId'
  | 'sourceRevision'
  | 'supersedesSourceRevisionId'
  | 'previousSourceHash'
  | 'committedBinary'
>): OperationalReadinessSource {
  const draft = {
    ...input,
    sourceRevision: 1,
    supersedesSourceRevisionId: null,
    previousSourceHash: null,
    committedBinary: false as const
  };
  return {
    ...draft,
    sourceRevisionId: operationalSourceRevisionId(draft)
  };
}

function unzipEntry(path: string, entry: string): string {
  return execFileSync('unzip', ['-p', path, entry], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });
}

function unzipEntries(path: string): string[] {
  return execFileSync('unzip', ['-Z1', path], {
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024
  })
    .split(/\r?\n/)
    .filter(Boolean);
}

function readPptxSlides(path: string): ExtractedPptxSlide[] {
  return unzipEntries(path)
    .flatMap((entry) => {
      const match = entry.match(/^ppt\/slides\/slide(\d+)\.xml$/);
      return match ? [{ entry, slideNumber: Number.parseInt(match[1] ?? '0', 10) }] : [];
    })
    .sort((left, right) => left.slideNumber - right.slideNumber)
    .map(({ entry, slideNumber }) => parsePptxSlideXml(unzipEntry(path, entry), slideNumber));
}

interface TraceRuleBase {
  traceId: string;
  sourceKey: keyof typeof sourceIds;
  sanitizedSourceLabel: string;
  extractedMeaning: string;
  extractionConfidence: OperationalSourceTrace['extractionConfidence'];
  reviewStatus: OperationalSourceTrace['reviewStatus'];
  sectionReference: string;
}

type GovernanceTraceRule = TraceRuleBase & (
  | {
    locatorType: 'slide-shape';
    slideNumber: number;
    shapeIndexes: number[];
    expectedFragments: string[];
  }
  | {
    locatorType: 'slide-table-row';
    slideNumber: number;
    tableIndex: number;
    rowNumbers: number[];
    expectedFragments: string[];
  }
);

const governanceRules: GovernanceTraceRule[] = [
  {
    traceId: 'TRACE-KAP-GOV-OBJECTIVE-S2-S6',
    sourceKey: 'governance',
    locatorType: 'slide-shape',
    slideNumber: 2,
    shapeIndexes: [6],
    expectedFragments: ['افتتاح احترافي وآمن', 'الجوانب الإبداعية والتشغيلية والإعلامية واللوجستية'],
    sectionReference: 'ppt/slides/slide2.xml',
    sanitizedSourceLabel: 'الهدف الاستراتيجي',
    extractedMeaning: 'تقديم افتتاح منظم وآمن يدمج المسارات الإبداعية والتشغيلية والإعلامية واللوجستية.',
    extractionConfidence: 'high',
    reviewStatus: 'reviewed'
  },
  ...([
    ['TRACE-KAP-GOV-SCOPE-CREATIVE-S2-S8', 'scope-item-creative', 'المفهوم الإبداعي', 'يشمل النطاق تطوير الفكرة الإبداعية ومخرجاتها.'],
    ['TRACE-KAP-GOV-SCOPE-PATH-S2-S8', 'scope-item-official-opening-path', 'مسار التدشين الرسمي', 'يشمل النطاق مسار الافتتاح الرسمي، دون تحديد هندسة أو اعتماد مسار ميداني.'],
    ['TRACE-KAP-GOV-SCOPE-SHOWS-S2-S8', 'scope-item-technical-artistic-shows', 'العروض التقنية والفنية', 'يشمل النطاق عروضًا تقنية وفنية، دون موضع تشغيلي معتمد.'],
    ['TRACE-KAP-GOV-SCOPE-TRANSPORT-MEDIA-S2-S8', 'scope-item-transport-tours-media', 'التغطية الإعلامية', 'يشمل النطاق النقل والجولات والإعلام.'],
    ['TRACE-KAP-GOV-SCOPE-SAFETY-S2-S8', 'scope-item-permits-risk-safety', 'المخاطر والسلامة', 'يشمل النطاق التصاريح والمخاطر والسلامة، دون إثبات جهة HSE أو اعتماد.'],
    ['TRACE-KAP-GOV-SCOPE-CLOSURE-S2-S8', 'scope-item-site-delivery-closure', 'تسليم الموقع', 'يشمل النطاق تسليم الموقع والإغلاق.']
  ] as const).map(([traceId, sectionReference, expected, extractedMeaning]) => ({
    traceId,
    sourceKey: 'governance' as const,
    locatorType: 'slide-shape' as const,
    slideNumber: 2,
    shapeIndexes: [8],
    expectedFragments: [expected],
    sectionReference,
    sanitizedSourceLabel: 'نطاق المشروع',
    extractedMeaning,
    extractionConfidence: 'high' as const,
    reviewStatus: 'reviewed' as const
  })),
  {
    traceId: 'TRACE-KAP-GOV-PMO-S3-S7',
    sourceKey: 'governance',
    locatorType: 'slide-shape',
    slideNumber: 3,
    shapeIndexes: [7],
    expectedFragments: ['مدير مكتب المشروع PMO', 'أحمد العامودي'],
    sectionReference: 'organization-pmo',
    sanitizedSourceLabel: 'المخطط التنظيمي',
    extractedMeaning: 'يعرض المصدر مكتب إدارة المشروع ضمن هيكل الحوكمة.',
    extractionConfidence: 'high',
    reviewStatus: 'reviewed'
  },
  {
    traceId: 'TRACE-KAP-GOV-OPERATIONS-S3-S15',
    sourceKey: 'governance',
    locatorType: 'slide-shape',
    slideNumber: 3,
    shapeIndexes: [15],
    expectedFragments: ['مسار التشغيل', 'ماجد قاسم'],
    sectionReference: 'organization-operations',
    sanitizedSourceLabel: 'المخطط التنظيمي',
    extractedMeaning: 'يعرض المصدر ماجد قاسم لمسار التشغيل.',
    extractionConfidence: 'high',
    reviewStatus: 'reviewed'
  },
  {
    traceId: 'TRACE-KAP-GOV-CONTENT-S3-S17',
    sourceKey: 'governance',
    locatorType: 'slide-shape',
    slideNumber: 3,
    shapeIndexes: [17],
    expectedFragments: ['مسار المحتوى', 'إبراهيم الغمري'],
    sectionReference: 'organization-content',
    sanitizedSourceLabel: 'المخطط التنظيمي',
    extractedMeaning: 'يعرض المصدر إبراهيم الغمري لمسار المحتوى.',
    extractionConfidence: 'high',
    reviewStatus: 'reviewed'
  },
  {
    traceId: 'TRACE-KAP-GOV-EXECUTION-S3-S19',
    sourceKey: 'governance',
    locatorType: 'slide-shape',
    slideNumber: 3,
    shapeIndexes: [19],
    expectedFragments: ['مسار التنفيذ', 'محمد إبراهيم'],
    sectionReference: 'organization-execution',
    sanitizedSourceLabel: 'المخطط التنظيمي',
    extractedMeaning: 'يعرض المخطط التنظيمي محمد إبراهيم كمرشح لمسار التنفيذ.',
    extractionConfidence: 'high',
    reviewStatus: 'conflicted'
  },
  {
    traceId: 'TRACE-KAP-GOV-PROJECT-MANAGER-AMBIGUITY-S3-S6-12',
    sourceKey: 'governance',
    locatorType: 'slide-shape',
    slideNumber: 3,
    shapeIndexes: [6, 12],
    expectedFragments: ['مدير المشروع | أحمد المحيسن', 'مدير المشروع من قبل العميل | عمرو الشدي'],
    sectionReference: 'organization-project-manager-identities',
    sanitizedSourceLabel: 'هويات مديري المشروع',
    extractedMeaning: 'يسجل المصدر مدير مشروع لميادين ومدير مشروع من قبل العميل كدورين منفصلين.',
    extractionConfidence: 'high',
    reviewStatus: 'conflicted'
  },
  {
    traceId: 'TRACE-KAP-GOV-ORG-ROSTER-S3-S5-23',
    sourceKey: 'governance',
    locatorType: 'slide-shape',
    slideNumber: 3,
    shapeIndexes: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23],
    expectedFragments: ['مسار التشغيل', 'مسار التنفيذ', 'مالك المشروع'],
    sectionReference: 'organization-role-roster',
    sanitizedSourceLabel: 'سجل الهيكل التنظيمي',
    extractedMeaning: 'يسجل الهيكل أدوار المشروع والمسارات الظاهرة دون تعيين مستقل للسلامة أو الإعلام أو تسليم الموقع.',
    extractionConfidence: 'high',
    reviewStatus: 'needs-review'
  },
  {
    traceId: 'TRACE-KAP-GOV-APPROVAL-S4-S3-7',
    sourceKey: 'governance',
    locatorType: 'slide-shape',
    slideNumber: 4,
    shapeIndexes: [3, 4, 5, 6, 7],
    expectedFragments: ['اعتماد نهائي', 'اعتماد | داخلي', 'مراجعة | أولية', 'إرسال المُخرج'],
    sectionReference: 'five-stage-deliverable-approval',
    sanitizedSourceLabel: 'مسار اعتماد التسليمات',
    extractedMeaning: 'يمر التسليم بالتقديم والمراجعة والاعتماد الداخلي واعتماد العميل ثم الإغلاق والتوثيق.',
    extractionConfidence: 'high',
    reviewStatus: 'conflicted'
  },
  {
    traceId: 'TRACE-KAP-GOV-CHANGE-S4-S9',
    sourceKey: 'governance',
    locatorType: 'slide-shape',
    slideNumber: 4,
    shapeIndexes: [9],
    expectedFragments: ['24 | ساعة', '24 | إلى | 48'],
    sectionReference: 'change-communication-window',
    sanitizedSourceLabel: 'ضبط التغيير',
    extractedMeaning: 'يسجل المصدر إرسالًا فوريًا ونافذة لا تتجاوز 24 ساعة، كما يسجل اعتمادًا خلال 24 إلى 48 ساعة.',
    extractionConfidence: 'high',
    reviewStatus: 'conflicted'
  },
  {
    traceId: 'TRACE-KAP-GOV-ESCALATION-S4-S9-12',
    sourceKey: 'governance',
    locatorType: 'slide-shape',
    slideNumber: 4,
    shapeIndexes: [9, 12],
    expectedFragments: ['فوري', '24 | ساعة', 'طلب تغيير تجاري مستقل'],
    sectionReference: 'change-and-escalation-timing',
    sanitizedSourceLabel: 'توقيت التغيير والتصعيد',
    extractedMeaning: 'يربط المصدر أثر النطاق أو الزمن أو التكلفة بمسار فوري وحد أقصى 24 ساعة.',
    extractionConfidence: 'high',
    reviewStatus: 'conflicted'
  },
  {
    traceId: 'TRACE-KAP-GOV-DECISIONS-S4-S11',
    sourceKey: 'governance',
    locatorType: 'slide-shape',
    slideNumber: 4,
    shapeIndexes: [11],
    expectedFragments: ['رقم مرجعي', 'سجل القرارات والنسخ', 'الموافقة الشفهية'],
    sectionReference: 'decision-version-register',
    sanitizedSourceLabel: 'سجل القرارات والإصدارات',
    extractedMeaning: 'يتطلب المصدر رقمًا مرجعيًا ومالك متابعة وسجل قرارات وإصدارات، ولا يعد الاعتماد الشفهي نهائيًا.',
    extractionConfidence: 'high',
    reviewStatus: 'reviewed'
  },
  {
    traceId: 'TRACE-KAP-GOV-APPROVAL-S5-T1-R4-6',
    sourceKey: 'governance',
    locatorType: 'slide-table-row',
    slideNumber: 5,
    tableIndex: 1,
    rowNumbers: [4, 5, 6],
    expectedFragments: ['اعتماد التوجهات', 'اعتمادات', 'قيادة التنفيذ'],
    sectionReference: 'leadership-approval-scopes',
    sanitizedSourceLabel: 'أدوار القيادة والاعتماد',
    extractedMeaning: 'تتوزع أوصاف الإشراف والاعتمادات وقيادة التنفيذ بين المشرف العام وPMO ومدير المشروع.',
    extractionConfidence: 'high',
    reviewStatus: 'conflicted'
  },
  {
    traceId: 'TRACE-KAP-GOV-RACI-RULE-S6-S3',
    sourceKey: 'governance',
    locatorType: 'slide-shape',
    slideNumber: 6,
    shapeIndexes: [3],
    expectedFragments: ['مسؤول تنفيذ واحد', 'مُعتمِد واحد'],
    sectionReference: 'raci-single-r-single-a-rule',
    sanitizedSourceLabel: 'قاعدة RACI',
    extractedMeaning: 'تنص القاعدة على مسؤول تنفيذ واحد R ومعتمد واحد A لكل قرار.',
    extractionConfidence: 'high',
    reviewStatus: 'conflicted'
  },
  {
    traceId: 'TRACE-KAP-GOV-RACI-CREATIVE-S6-T1-R2',
    sourceKey: 'governance',
    locatorType: 'slide-table-row',
    slideNumber: 6,
    tableIndex: 1,
    rowNumbers: [2],
    expectedFragments: ['قائد مسار التصميم / المحتوى', 'مدير المشروع من الأمانة'],
    sectionReference: 'raci-creative-deliverables',
    sanitizedSourceLabel: 'مصفوفة RACI',
    extractedMeaning: 'تسند خانة R للمخرجات الإبداعية إلى التصميم أو المحتوى رغم قاعدة المسؤول الواحد.',
    extractionConfidence: 'high',
    reviewStatus: 'conflicted'
  },
  {
    traceId: 'TRACE-KAP-GOV-RACI-OPERATIONS-S6-T1-R3',
    sourceKey: 'governance',
    locatorType: 'slide-table-row',
    slideNumber: 6,
    tableIndex: 1,
    rowNumbers: [3],
    expectedFragments: ['المخرجات التقنية والتشغيلية', 'مدير الحدث'],
    sectionReference: 'raci-technical-operational',
    sanitizedSourceLabel: 'مصفوفة RACI',
    extractedMeaning: 'مدير الفعالية مسؤول عن التسليمات التقنية والتشغيلية مع مساءلة مدير مشروع العميل واستشارة PMO والجودة.',
    extractionConfidence: 'high',
    reviewStatus: 'reviewed'
  },
  {
    traceId: 'TRACE-KAP-GOV-RACI-CHANGE-S6-T1-R4',
    sourceKey: 'governance',
    locatorType: 'slide-table-row',
    slideNumber: 6,
    tableIndex: 1,
    rowNumbers: [4],
    expectedFragments: ['مالك المشروع + مدير المشروع', 'طلبات التغيير'],
    sectionReference: 'raci-change-request-multiple-responsible',
    sanitizedSourceLabel: 'مصفوفة RACI',
    extractedMeaning: 'تسند خانة R لطلبات التغيير إلى مالك المشروع ومدير المشروع معًا.',
    extractionConfidence: 'high',
    reviewStatus: 'conflicted'
  },
  {
    traceId: 'TRACE-KAP-GOV-APPROVAL-S6-T1-R2-9',
    sourceKey: 'governance',
    locatorType: 'slide-table-row',
    slideNumber: 6,
    tableIndex: 1,
    rowNumbers: [2, 3, 4, 5, 6, 7, 8, 9],
    expectedFragments: ['مدير المشروع من الأمانة', 'التصعيد الحرج'],
    sectionReference: 'raci-approval-authority-scopes',
    sanitizedSourceLabel: 'سلطات الاعتماد في RACI',
    extractedMeaning: 'تستخدم المصفوفة سلطة A لمدير مشروع العميل مع ظهور مدير المشروع في أدوار أخرى دون تمييز دائم.',
    extractionConfidence: 'high',
    reviewStatus: 'conflicted'
  },
  {
    traceId: 'TRACE-KAP-GOV-WORKSTREAMS-S7-T1-R3-10',
    sourceKey: 'governance',
    locatorType: 'slide-table-row',
    slideNumber: 7,
    tableIndex: 1,
    rowNumbers: [3, 4, 5, 6, 7, 8, 9, 10],
    expectedFragments: ['مسار الضيافة', 'مسار التشغيل', 'مسار التنفيذ', 'مسار البروتوكول والحشود'],
    sectionReference: 'workstream-roles-rows-3-through-10',
    sanitizedSourceLabel: 'جدول مسارات العمل',
    extractedMeaning: 'يسجل المصدر مسارات الضيافة والتشغيل وتجربة الضيف والمحتوى والنقل والتنفيذ والتصميم والبروتوكول والحشود.',
    extractionConfidence: 'high',
    reviewStatus: 'reviewed'
  },
  {
    traceId: 'TRACE-KAP-GOV-EXECUTION-S7-T1-R8',
    sourceKey: 'governance',
    locatorType: 'slide-table-row',
    slideNumber: 7,
    tableIndex: 1,
    rowNumbers: [8],
    expectedFragments: ['مسار التنفيذ', 'جوزيف حداد'],
    sectionReference: 'workstream-execution',
    sanitizedSourceLabel: 'جدول مسؤوليات المسارات',
    extractedMeaning: 'يعرض جدول مسؤوليات المسارات جوزيف حداد كمرشح لمسار التنفيذ.',
    extractionConfidence: 'high',
    reviewStatus: 'conflicted'
  },
  {
    traceId: 'TRACE-KAP-GOV-ESCALATION-S8-S3-19',
    sourceKey: 'governance',
    locatorType: 'slide-shape',
    slideNumber: 8,
    shapeIndexes: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    expectedFragments: ['خلال 48 ساعة', 'فوري / نفس اليوم', 'تغيير نطاق أو تكلفة'],
    sectionReference: 'escalation-levels-1-through-4',
    sanitizedSourceLabel: 'مسار التصعيد',
    extractedMeaning: 'يعرض المصدر مسارات 24 و48 ساعة وفورية لنطاقات متداخلة تشمل التغيير والتأخير والنطاق والتكلفة.',
    extractionConfidence: 'high',
    reviewStatus: 'conflicted'
  },
  {
    traceId: 'TRACE-KAP-GOV-COMMS-S9',
    sourceKey: 'governance',
    locatorType: 'slide-table-row',
    slideNumber: 9,
    tableIndex: 1,
    rowNumbers: [2, 3, 4, 5, 6, 7],
    expectedFragments: ['اعتماد / تصعيد', 'المخاطر والاعتمادات', 'المخاطبات الرسمية'],
    sectionReference: 'communications-and-reporting',
    sanitizedSourceLabel: 'الاتصال والتقارير',
    extractedMeaning: 'يسجل المصدر نقاط اتصال وتقارير واعتمادات ومخاطبات دون تحديد مالك قانوني شامل لسجل الاتصال.',
    extractionConfidence: 'high',
    reviewStatus: 'conflicted'
  }
];

function selectedGovernanceText(rule: GovernanceTraceRule, slides: ExtractedPptxSlide[]): string {
  const slide = slides.find((candidate) => candidate.slideNumber === rule.slideNumber);
  if (!slide) throw new Error(`PPTX_SLIDE_MISSING:${rule.slideNumber}`);
  if (rule.locatorType === 'slide-shape') {
    const selected = rule.shapeIndexes.map((shapeIndex) => {
      const shape = slide.shapes.find((candidate) => candidate.shapeIndex === shapeIndex);
      if (!shape) throw new Error(`PPTX_SHAPE_MISSING:${rule.slideNumber}:${shapeIndex}`);
      return shape.text;
    });
    return normalizeExtractedOfficeText(selected.join(' | '));
  }
  const table = slide.tables.find((candidate) => candidate.tableIndex === rule.tableIndex);
  if (!table) throw new Error(`PPTX_TABLE_MISSING:${rule.slideNumber}:${rule.tableIndex}`);
  return normalizeExtractedOfficeText(
    rule.rowNumbers.map((rowNumber) => {
      const row = table.rows.find((candidate) => candidate.rowNumber === rowNumber);
      if (!row) throw new Error(`PPTX_TABLE_ROW_MISSING:${rule.slideNumber}:${rule.tableIndex}:${rowNumber}`);
      return row.cells.join(' | ');
    }).join(' | ')
  );
}

function governanceTrace(
  rule: GovernanceTraceRule,
  slides: ExtractedPptxSlide[],
  sourceRegistry: OperationalReadinessSource[]
): OperationalSourceTrace {
  const extracted = selectedGovernanceText(rule, slides);
  rule.expectedFragments.forEach((fragment) => {
    if (!extracted.includes(fragment)) {
      throw new Error(`PPTX_TRACE_ASSERTION_FAILED:${rule.traceId}:${fragment}`);
    }
  });
  const sourceRecord = sourceRegistry.find((candidate) => candidate.sourceId === sourceIds.governance)!;
  return {
    traceId: rule.traceId,
    sourceId: sourceRecord.sourceId,
    sourceRevision: sourceRecord.sourceRevision,
    sourceHash: sourceRecord.observedSha256,
    locatorType: rule.locatorType,
    slideNumber: rule.slideNumber,
    sheetName: null,
    rowNumber: rule.locatorType === 'slide-table-row'
      ? rule.rowNumbers[0] ?? null
      : null,
    tableIndex: rule.locatorType === 'slide-table-row' ? rule.tableIndex : null,
    shapeId: rule.locatorType === 'slide-shape' ? rule.shapeIndexes.join(',') : null,
    sectionReference: rule.sectionReference,
    sanitizedSourceLabel: rule.sanitizedSourceLabel,
    extractedMeaning: rule.extractedMeaning,
    extractionConfidence: rule.extractionConfidence,
    reviewStatus: rule.reviewStatus
  };
}

function directTrace(
  sourceRegistry: OperationalReadinessSource[],
  input: Omit<OperationalSourceTrace, 'sourceId' | 'sourceRevision' | 'sourceHash'> & {
    sourceKey: keyof typeof sourceIds;
  }
): OperationalSourceTrace {
  const { sourceKey, ...trace } = input;
  const sourceRecord = sourceRegistry.find((candidate) => candidate.sourceId === sourceIds[sourceKey]);
  if (!sourceRecord) throw new Error(`SOURCE_RECORD_MISSING:${sourceKey}`);
  return {
    ...trace,
    sourceId: sourceRecord.sourceId,
    sourceRevision: sourceRecord.sourceRevision,
    sourceHash: sourceRecord.observedSha256
  };
}

const verified = Object.fromEntries(
  await Promise.all(
    (Object.keys(sourcePaths) as Array<keyof typeof sourcePaths>)
      .map(async (key) => [key, await verifyFile(key)])
  )
) as Record<keyof typeof sourcePaths, { byteSize: number; sha256: string }>;

const sourceRegistry: OperationalReadinessSource[] = [
  source({
    sourceId: sourceIds.governance,
    originalFilename: 'حوكمة_مشروع_حدائق_الملك_عبدالله_  05-07-2026 (3).pptx',
    absoluteLocalPath: `local-review://${sourceIds.governance}/R1`,
    expectedByteSize: expectedSources.governance.byteSize,
    observedByteSize: verified.governance.byteSize,
    expectedSha256: expectedSources.governance.sha256,
    observedSha256: verified.governance.sha256,
    fingerprintStatus: 'verified',
    sourceClassification: 'founder-approved-project-governance-source',
    approvalScope: 'مرجع حوكمة مشروع مؤسس لمسارات العمل والأدوار والتسليمات والتصعيد.',
    approvalLimitations: [
      'لا يثبت إنجازًا ميدانيًا أو جاهزية تشغيلية.',
      'اعتماد التسليمات لا يساوي اعتماد HSE أو قرار افتتاح.',
      'لا تُستنتج سلطة إنتاج من ظهور اسم فقط.'
    ],
    extractedAt: createdAt,
    extractionTool: 'deterministic-pptx-zip-xml-extractor',
    extractionToolVersion: 'stage3g1a-v1',
    supersedesSourceId: null
  }),
  source({
    sourceId: sourceIds.cad,
    originalFilename: 'Kaig-master 2.dwg',
    absoluteLocalPath: `local-review://${sourceIds.cad}/R1`,
    expectedByteSize: expectedSources.cad.byteSize,
    observedByteSize: verified.cad.byteSize,
    expectedSha256: expectedSources.cad.sha256,
    observedSha256: verified.cad.sha256,
    fingerprintStatus: 'verified',
    sourceClassification: 'founder-approved-cad-source',
    approvalScope: 'مصدر CAD عامل معتمد من المؤسس للمراجعة والتحويل المستقبلي.',
    approvalLimitations: [
      'ليس هندسة مساحية أو خط أساس هندسيًا معتمدًا.',
      'لا يثبت المقياس أو CRS أو الشمال أو نقطة الأصل أو نقاط الضبط.',
      'لا يثبت مسارًا أو سعة أو حالة تشغيل.'
    ],
    extractedAt: createdAt,
    extractionTool: 'sha256-and-file-signature-verifier',
    extractionToolVersion: 'stage3g1a-v1',
    supersedesSourceId: 'SOURCE-ASSET-KAP-DWG-DRIVE-001'
  }),
  source({
    sourceId: sourceIds.employee,
    originalFilename: 'اسماء موظفين ميادين .xlsx',
    absoluteLocalPath: `local-review://${sourceIds.employee}/R1`,
    expectedByteSize: expectedSources.employee.byteSize,
    observedByteSize: verified.employee.byteSize,
    expectedSha256: expectedSources.employee.sha256,
    observedSha256: verified.employee.sha256,
    fingerprintStatus: 'verified',
    sourceClassification: 'employee-name-reference-limited',
    approvalScope: 'مطابقة الاسم والمسمى الوظيفي العربيين في الصف المصرح فقط.',
    approvalLimitations: [
      'لا يثبت تعيينًا في المشروع.',
      'لا يثبت ملكية متطلب أو سلطة تحقق أو اعتماد.',
      'لا تُستخرج بيانات اتصال أو صفوف موظفين أخرى.'
    ],
    extractedAt: createdAt,
    extractionTool: 'deterministic-xlsx-approved-field-extractor',
    extractionToolVersion: 'stage3g1a-v1',
    supersedesSourceId: null
  }),
  source({
    sourceId: sourceIds.founder,
    originalFilename: 'pasted-text.txt',
    absoluteLocalPath: `local-review://${sourceIds.founder}/R1`,
    expectedByteSize: expectedSources.founder.byteSize,
    observedByteSize: verified.founder.byteSize,
    expectedSha256: expectedSources.founder.sha256,
    observedSha256: verified.founder.sha256,
    fingerprintStatus: 'verified',
    sourceClassification: 'founder-direction',
    approvalScope: 'توجيه مؤسس صريح لنطاق Stage 3G.1 وللممثلين المذكورين وحدود السلطة.',
    approvalLimitations: [
      'لا يمنح اعتماد عميل أو هندسة أو HSE أو مسارات أو افتتاح.',
      'لا يثبت جاهزية KAP أو اكتمال أي متطلب ميداني.'
    ],
    extractedAt: createdAt,
    extractionTool: 'plain-text-directive-verifier',
    extractionToolVersion: 'stage3g1a-v1',
    supersedesSourceId: null
  })
];

const slides = readPptxSlides(sourcePaths.governance);
if (slides.length !== 10) throw new Error(`PPTX_SLIDE_COUNT_MISMATCH:${slides.length}`);

const sharedStrings = parseSharedStringsXml(unzipEntry(sourcePaths.employee, 'xl/sharedStrings.xml'));
const workbookRows = parseWorkbookSheetRows(
  unzipEntry(sourcePaths.employee, 'xl/worksheets/sheet1.xml'),
  sharedStrings
);
const approvedEmployeeFields = selectApprovedWorkbookFields(workbookRows, 28, ['B', 'D']);
if (
  approvedEmployeeFields.B !== 'محمد إبراهيم'
  || approvedEmployeeFields.D !== 'عامل مكتب'
) {
  throw new Error('XLSX_APPROVED_FIELDS_MISMATCH');
}
const founderText = normalizeExtractedOfficeText(await readFile(sourcePaths.founder, 'utf8'));
['محمد إبراهيم', 'ماجد قاسم', 'إبراهيم الغمري', 'Founder platform acceptance'].forEach((fragment) => {
  if (!founderText.includes(fragment)) throw new Error(`FOUNDER_SOURCE_ASSERTION_FAILED:${fragment}`);
});

const sourceTraces: OperationalSourceTrace[] = [
  directTrace(sourceRegistry, {
    traceId: 'TRACE-KAP-GOV-FINGERPRINT',
    sourceKey: 'governance',
    locatorType: 'file-fingerprint',
    slideNumber: null,
    sheetName: null,
    rowNumber: null,
    tableIndex: null,
    shapeId: null,
    sectionReference: 'ppt/presentation.xml; 10 slides',
    sanitizedSourceLabel: 'حزمة حوكمة المشروع',
    extractedMeaning: 'تطابقت البصمة والحجم وجرى تحليل عشر شرائح من البايتات المسجلة.',
    extractionConfidence: 'high',
    reviewStatus: 'founder-approved-source'
  }),
  ...governanceRules.map((rule) => governanceTrace(rule, slides, sourceRegistry)),
  directTrace(sourceRegistry, {
    traceId: 'TRACE-KAP-CAD-FINGERPRINT',
    sourceKey: 'cad',
    locatorType: 'file-fingerprint',
    slideNumber: null,
    sheetName: null,
    rowNumber: null,
    tableIndex: null,
    shapeId: null,
    sectionReference: 'AC1032 / AutoCAD 2018 DWG family',
    sanitizedSourceLabel: 'مصدر CAD العامل',
    extractedMeaning: 'تطابقت البصمة والحجم؛ المصدر عامل وغير مساحي ولا يمثل هندسة معتمدة.',
    extractionConfidence: 'high',
    reviewStatus: 'founder-approved-source'
  }),
  directTrace(sourceRegistry, {
    traceId: 'TRACE-KAP-EMPLOYEE-FINGERPRINT',
    sourceKey: 'employee',
    locatorType: 'file-fingerprint',
    slideNumber: null,
    sheetName: null,
    rowNumber: null,
    tableIndex: null,
    shapeId: null,
    sectionReference: 'A1:E67; approved extraction B28,D28 only',
    sanitizedSourceLabel: 'مرجع أسماء الموظفين',
    extractedMeaning: 'تطابقت البصمة واقتصر الاستخراج على حقلي الاسم والمسمى العربيين في الصف المصرح.',
    extractionConfidence: 'high',
    reviewStatus: 'reviewed'
  }),
  directTrace(sourceRegistry, {
    traceId: 'TRACE-KAP-EMPLOYEE-MUHAMMAD-R28',
    sourceKey: 'employee',
    locatorType: 'workbook-row',
    slideNumber: null,
    sheetName: 'موظفين ميادين',
    rowNumber: 28,
    tableIndex: null,
    shapeId: null,
    sectionReference: 'columns B,D only',
    sanitizedSourceLabel: 'مطابقة موظف محدد',
    extractedMeaning: `يطابق المصدر اسم ${approvedEmployeeFields.B} ويعرض المسمى الوظيفي ${approvedEmployeeFields.D}؛ لا يثبت دورًا أو سلطة في المشروع.`,
    extractionConfidence: 'high',
    reviewStatus: 'reviewed'
  }),
  ...([
    ['TRACE-KAP-FOUNDER-MAJED', 'explicit-founder-provided-project-actors/majed-qasim', 'وجّه أحمد بتسجيل ماجد قاسم لمسار التشغيل.'],
    ['TRACE-KAP-FOUNDER-IBRAHIM', 'explicit-founder-provided-project-actors/ibrahim-al-ghamri', 'وجّه أحمد بتسجيل إبراهيم الغمري للمحتوى الإبداعي.'],
    ['TRACE-KAP-FOUNDER-MUHAMMAD', 'explicit-founder-provided-project-actors/muhammad-ibrahim', 'وجّه أحمد بتسجيل محمد إبراهيم كممثل مشروع فقط ما لم يثبت المصدر دورًا واضحًا.'],
    ['TRACE-KAP-FOUNDER-AHMED-LIMITS', 'founder-authority-boundary', 'أحمد سلطة رؤية وقبول للمنصة فقط، وليس تلقائيًا سلطة عميل أو هندسة أو HSE أو مسارات أو افتتاح.']
  ] as const).map(([traceId, sectionReference, extractedMeaning]) => directTrace(sourceRegistry, {
    traceId,
    sourceKey: 'founder',
    locatorType: 'founder-direction',
    slideNumber: null,
    sheetName: null,
    rowNumber: null,
    tableIndex: null,
    shapeId: null,
    sectionReference,
    sanitizedSourceLabel: traceId === 'TRACE-KAP-FOUNDER-AHMED-LIMITS'
      ? 'حدود سلطة المؤسس'
      : 'توجيه المؤسس',
    extractedMeaning,
    extractionConfidence: 'high',
    reviewStatus: 'founder-approved-source'
  }))
].sort((left, right) => left.traceId.localeCompare(right.traceId));

assertNoPrivateContactData({ sourceTraces });

const manifest = freezeOperationalReadinessSourceExtractionManifest({
  schemaVersion: '1.0.0',
  manifestId: 'KAP-READINESS-SOURCE-EXTRACTION-v1',
  projectId,
  extractionProfileId: 'READINESS-SOURCE-EXTRACTION-PPTX-XLSX-v1',
  sourceRegistry,
  sourceTraces
});

if (
  manifest.sourceFingerprint !== deriveOperationalSourceFingerprint(sourceRegistry)
  || manifest.sourceTraceFingerprint !== deriveOperationalSourceTraceFingerprint(sourceTraces)
) {
  throw new Error('SOURCE_EXTRACTION_FINGERPRINT_INTERNAL_MISMATCH');
}

await mkdir(resolve('pilot-input/manifests'), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

process.stdout.write(`${JSON.stringify({
  outputPath,
  sourceCount: sourceRegistry.length,
  traceCount: sourceTraces.length,
  sourceFingerprint: manifest.sourceFingerprint,
  sourceTraceFingerprint: manifest.sourceTraceFingerprint,
  extractionFingerprint: manifest.extractionFingerprint
}, null, 2)}\n`);
