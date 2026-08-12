import type { SourceReference } from '../types';

export const PDF_SOURCE_LABEL = 'Rev06 Inauguration of King Abdullah Gardens - 6 August 2026';

export const sourceRef = (pdfPages: number[], notes?: string): SourceReference => ({
  pdfPages,
  sourceLabel: PDF_SOURCE_LABEL,
  ...(notes ? { notes } : {}),
});

export interface SourceTraceabilityEntry {
  entityId: string;
  label: string;
  source: SourceReference;
}

export const sourceTraceability: SourceTraceabilityEntry[] = [
  { entityId: 'event-days', label: 'بطاقة أيام التدشين', source: sourceRef([4, 5, 11, 19, 23, 32]) },
  { entityId: 'royal-moment', label: 'لحظة التدشين الملكي', source: sourceRef([12, 15, 16]) },
  { entityId: 'launch-show', label: 'عرض التدشين', source: sourceRef([19, 20, 21, 22]) },
  { entityId: 'hospitality', label: 'الاستقبال والضيافة', source: sourceRef([41, 42, 43]) },
  { entityId: 'activations', label: 'الأركان والتفعيلات', source: sourceRef([44, 45, 46, 47, 48, 49]) },
  { entityId: 'mobile-exhibition', label: 'المعرض المتنقل', source: sourceRef([50, 51, 52, 53, 54, 55, 56, 57, 58]) },
  { entityId: 'invitations', label: 'منصة إدارة الدعوات', source: sourceRef([59, 60, 61, 62]) },
  { entityId: 'identity', label: 'تطبيقات الهوية البصرية', source: sourceRef([63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76]) },
  { entityId: 'visual-museum', label: 'التصاميم ثلاثية الأبعاد', source: sourceRef([77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131]) },
];
