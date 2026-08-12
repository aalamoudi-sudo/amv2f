import type { ProjectFact } from './knowledgeTypes';
import { knowledgeGuideRef } from './knowledgeSourceMap';

export const projectFacts: ProjectFact[] = [
  {
    id: 'garden-area',
    labelAr: 'مساحة الحديقة',
    value: 2_000_000,
    unitAr: 'متر مربع',
    displayValueAr: '+2M م²',
    metricValue: '+2M',
    metricUnitAr: 'م',
    metricExponent: 2,
    qualifier: 'atLeast',
    source: [knowledgeGuideRef([17])],
  },
  {
    id: 'plant-count',
    labelAr: 'عدد النباتات',
    value: 1_000_000,
    unitAr: 'نبات',
    displayValueAr: '+1M',
    metricValue: '+1M',
    qualifier: 'atLeast',
    source: [knowledgeGuideRef([17])],
  },
  {
    id: 'botanical-garden-count',
    labelAr: 'الحدائق النباتية',
    value: 15,
    unitAr: 'حديقة نباتية',
    displayValueAr: '15',
    metricValue: '15',
    qualifier: 'exact',
    source: [knowledgeGuideRef([17, 19])],
  },
  {
    id: 'internal-garden-count',
    labelAr: 'الحدائق الداخلية',
    value: 7,
    unitAr: 'حدائق داخلية',
    displayValueAr: '7',
    metricValue: '7',
    qualifier: 'exact',
    source: [knowledgeGuideRef([17, 19])],
  },
  {
    id: 'external-garden-count',
    labelAr: 'الحدائق الخارجية',
    value: 8,
    unitAr: 'حدائق خارجية',
    displayValueAr: '8',
    metricValue: '8',
    qualifier: 'exact',
    source: [knowledgeGuideRef([17, 19], 'exact', 'يسمي الدليل ست حدائق خارجية فقط؛ راجع سجل التعارض external-garden-naming-gap.')],
  },
];

export const projectFactById = Object.fromEntries(projectFacts.map((fact) => [fact.id, fact])) as Record<string, ProjectFact>;
