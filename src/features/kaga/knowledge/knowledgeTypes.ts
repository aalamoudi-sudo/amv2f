export const KNOWLEDGE_GUIDE_DOCUMENT = 'الدليل المعرفي لحدائق الملك عبدالله V3' as const;
export const KNOWLEDGE_SITE_DIRECTORY_DOCUMENT = 'KAGA SITE MAP DIRECTORY - embedded in the Knowledge Guide' as const;

export const KNOWLEDGE_GUIDE_METADATA = {
  id: 'kaga-knowledge-guide-v3',
  titleAr: 'الدليل المعرفي لحدائق الملك عبدالله',
  version: 'V3',
  pageCount: 24,
  sha256: '213204327d095354c11ea02f14052b98bdcb319a5fec253f19a67c110a119738',
  role: 'supplemental-source',
  sourceFileName: '__الدليل المعرفي لحدائق الملك عبدالله  V3.pdf',
} as const;

export type KnowledgeSourceDocument =
  | typeof KNOWLEDGE_GUIDE_DOCUMENT
  | typeof KNOWLEDGE_SITE_DIRECTORY_DOCUMENT;

export type SourceConfidence = 'exact' | 'high' | 'approximate' | 'unresolved';

export interface KnowledgeSourceReference {
  sourceDocument: KnowledgeSourceDocument;
  sourcePages: number[];
  sourceConfidence: SourceConfidence;
  sourceLabel?: string;
  notes?: string;
}

export interface KnowledgeEntity {
  id: string;
  source: KnowledgeSourceReference[];
}

export type GardenCategory = 'internal' | 'external' | 'other' | 'unresolved';

export interface GardenKnowledge extends KnowledgeEntity {
  titleAr: string;
  titleEn?: string;
  category: GardenCategory;
  areaSqm?: number;
  descriptionAr?: string;
  geologicalEraAr?: string;
  footprintId?: string;
  visualAssetId?: string;
}

export interface ProjectFact extends KnowledgeEntity {
  labelAr: string;
  value: number;
  unitAr: string;
  displayValueAr: string;
  metricValue: string;
  metricUnitAr?: string;
  metricExponent?: number;
  qualifier: 'exact' | 'atLeast';
}

export interface KnowledgeFaqItem extends KnowledgeEntity {
  questionAr: string;
  answerAr: string;
  relatedEntityIds?: string[];
}

export interface CrescentStoryStep extends KnowledgeEntity {
  eyebrowAr: string;
  titleAr: string;
  descriptionAr: string;
}

export interface KnowledgeConflict {
  id: string;
  titleAr: string;
  descriptionAr: string;
  handlingAr: string;
  status: 'unresolved' | 'resolved';
  source: KnowledgeSourceReference[];
}

export interface SiteDirectoryEntry extends KnowledgeEntity {
  labelEn: string;
  directoryGroup: 'crescentHouse' | 'exteriorGardens';
  resolvedGardenId?: string;
  resolutionNotes?: string;
}
