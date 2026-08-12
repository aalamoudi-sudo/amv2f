import {
  KNOWLEDGE_GUIDE_DOCUMENT,
  KNOWLEDGE_SITE_DIRECTORY_DOCUMENT,
  type KnowledgeConflict,
  type KnowledgeSourceReference,
  type SiteDirectoryEntry,
  type SourceConfidence,
} from './knowledgeTypes';

export const knowledgeGuideRef = (
  sourcePages: number[],
  sourceConfidence: SourceConfidence = 'exact',
  notes?: string,
): KnowledgeSourceReference => ({
  sourceDocument: KNOWLEDGE_GUIDE_DOCUMENT,
  sourcePages,
  sourceConfidence,
  sourceLabel: 'الدليل المعرفي - يوليو 2026',
  ...(notes ? { notes } : {}),
});

export const siteDirectoryRef = (
  sourcePages: number[] = [13],
  sourceConfidence: SourceConfidence = 'exact',
  notes?: string,
): KnowledgeSourceReference => ({
  sourceDocument: KNOWLEDGE_SITE_DIRECTORY_DOCUMENT,
  sourcePages,
  sourceConfidence,
  sourceLabel: 'KAGA SITE MAP DIRECTORY',
  ...(notes ? { notes } : {}),
});

export const siteDirectoryEntries: SiteDirectoryEntry[] = [
  ...[
    ['directory-devonian', 'Devonian Garden', 'devonianGarden'],
    ['directory-carboniferous', 'Carboniferous Garden', 'carboniferousGarden'],
    ['directory-jurassic', 'Jurassic Garden', 'jurassicGarden'],
    ['directory-cretaceous', 'Cretaceous Garden', 'cretaceousGarden'],
    ['directory-cenozoic', 'Cenozoic Garden', undefined],
    ['directory-pliocene', 'Pliocene Garden', 'plioceneGarden'],
    ['directory-options', 'Garden of Choices', 'optionsGarden'],
    ['directory-family', 'Family Garden', undefined],
  ].map(([id, labelEn, resolvedGardenId]) => ({
    id: id!,
    labelEn: labelEn!,
    directoryGroup: 'crescentHouse' as const,
    ...(resolvedGardenId ? { resolvedGardenId } : {}),
    ...(id === 'directory-cenozoic'
      ? { resolutionNotes: 'لم يُربط تلقائياً بحديقة الحياة الحديثة لأن الدليل لا يصرّح بتكافؤ الاسمين.' }
      : id === 'directory-family'
        ? { resolutionNotes: 'اسم إضافي في دليل الموقع لا يظهر في جدول الحدائق الداخلية ذي الأسماء السبعة.' }
      : {}),
    source: [siteDirectoryRef()],
  })),
  ...[
    ['directory-water-play', 'Water Play Garden'],
    ['directory-mist', 'Mist Garden'],
    ['directory-geyser', 'Geyser Garden'],
    ['directory-boats', 'Boats Garden'],
    ['directory-aviary', 'Aviary Garden'],
    ['directory-discovery', 'Discovery Garden'],
    ['directory-butterfly', 'Butterfly Garden'],
    ['directory-physic', 'Physic Garden'],
    ['directory-maze', 'Maze Garden'],
    ['directory-sound-light', 'Garden of Sound and Light'],
  ].map(([id, labelEn]) => ({
    id: id!,
    labelEn: labelEn!,
    directoryGroup: 'exteriorGardens' as const,
    resolutionNotes: 'اسم دليل موقع إنجليزي محفوظ كما هو؛ لم يُدمج آلياً مع قائمة الحدائق الخارجية العربية.',
    source: [siteDirectoryRef()],
  })),
];

export const knowledgeConflicts: KnowledgeConflict[] = [
  {
    id: 'external-garden-naming-gap',
    titleAr: 'فجوة أسماء الحدائق الخارجية',
    descriptionAr: 'يثبت ملخص الأرقام والأسئلة الشائعة وجود 8 حدائق خارجية، بينما تسمي قائمة الحدائق الخارجية والأسئلة الشائعة 6 حدائق فقط.',
    handlingAr: 'حُفظ إجمالي 8 كحقيقة رئيسية، وسُجلت الكيانات الستة المسماة فقط. لم تُخترع حديقتان لإكمال العدد.',
    status: 'unresolved',
    source: [knowledgeGuideRef([11, 17, 19], 'exact')],
  },
  {
    id: 'site-directory-internal-taxonomy',
    titleAr: 'اختلاف عدد الحدائق الداخلية في دليل الموقع',
    descriptionAr: 'يثبت ملخص الدليل وجود 7 حدائق داخلية ويسمي جدول الصفحة 10 سبعاً، بينما يسرد KAGA SITE MAP DIRECTORY ثمانية عناصر ضمن Crescent House بإضافة Family Garden.',
    handlingAr: 'حُفظ Family Garden كاسم دليل موقع غير مربوط، ولم يُضف إلى قائمة الحدائق الداخلية العربية المعتمدة.',
    status: 'unresolved',
    source: [siteDirectoryRef([13]), knowledgeGuideRef([10, 17, 19])],
  },
  {
    id: 'site-directory-exterior-taxonomy',
    titleAr: 'اختلاف تصنيف دليل الموقع',
    descriptionAr: 'يسرد KAGA SITE MAP DIRECTORY في الصفحة 13 عشرة أسماء إنجليزية ضمن Exterior Gardens، ولا تتطابق القائمة واحداً لواحد مع أسماء الجدول العربي الستة في الصفحة 11.',
    handlingAr: 'حُفظت أسماء الدليل المكاني منفصلة لأغراض التسجيل المكاني اللاحق، ومنع الربط الدلالي التلقائي حتى يتوافر دليل مباشر.',
    status: 'unresolved',
    source: [siteDirectoryRef([13]), knowledgeGuideRef([11, 19])],
  },
  {
    id: 'cenozoic-modern-life-name-equivalence',
    titleAr: 'تكافؤ اسم الحديقة الحديثة غير مثبت',
    descriptionAr: 'يسمي دليل الموقع Cenozoic Garden بينما تستخدم القائمة العربية اسم حديقة الحياة الحديثة.',
    handlingAr: 'لم يُعامل الاسمان ككيان واحد تلقائياً. يحتاج الربط إلى إثبات من طبقة 3DM أو مرجع مشروع معتمد.',
    status: 'unresolved',
    source: [siteDirectoryRef([13]), knowledgeGuideRef([10])],
  },
];

export interface KnowledgeSourceMapEntry {
  entityId: string;
  entityType: 'projectFact' | 'garden' | 'crescentStory' | 'faq' | 'siteDirectory' | 'conflict';
  source: KnowledgeSourceReference[];
}

export const knowledgeSourceMap: Record<string, KnowledgeSourceMapEntry> = {
  projectFacts: {
    entityId: 'project-facts',
    entityType: 'projectFact',
    source: [knowledgeGuideRef([17, 19])],
  },
  internalGardens: {
    entityId: 'internal-gardens',
    entityType: 'garden',
    source: [knowledgeGuideRef([10])],
  },
  namedExternalGardens: {
    entityId: 'named-external-gardens',
    entityType: 'garden',
    source: [knowledgeGuideRef([11])],
  },
  crescentBuilding: {
    entityId: 'crescent-building',
    entityType: 'crescentStory',
    source: [knowledgeGuideRef([15])],
  },
  faq: {
    entityId: 'official-faq',
    entityType: 'faq',
    source: [knowledgeGuideRef([18, 19, 20])],
  },
  siteDirectory: {
    entityId: 'site-directory',
    entityType: 'siteDirectory',
    source: [siteDirectoryRef([13])],
  },
  conflicts: {
    entityId: 'knowledge-source-conflicts',
    entityType: 'conflict',
    source: [knowledgeGuideRef([10, 11, 17, 19]), siteDirectoryRef([13])],
  },
};
