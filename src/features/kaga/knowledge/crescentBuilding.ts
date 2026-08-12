import type { CrescentStoryStep, KnowledgeEntity } from './knowledgeTypes';
import { knowledgeGuideRef } from './knowledgeSourceMap';

export interface CrescentBuildingKnowledge extends KnowledgeEntity {
  titleAr: string;
  roleAr: string;
  summaryAr: string;
  architectureAr: string;
}

export const crescentBuilding: CrescentBuildingKnowledge = {
  id: 'crescentBuilding',
  titleAr: 'مبنى الهلالين',
  roleAr: 'المتحف النباتي الحي',
  summaryAr: 'فضاء مغلق بيئياً ومفتوح معرفياً، صُمم ليأخذ الزائر في رحلة زمنية متدرجة عبر تاريخ تطور النباتات على كوكب الأرض.',
  architectureAr: 'يتكون المبنى من هلالين متقابلين؛ يبدأ الشكل حاداً ومضغوطاً عند الأطراف ثم يتسع تدريجياً قبل أن يتقلص مجدداً، في تكوين يعكس الحركة والنمو والتوسع والتحول.',
  source: [knowledgeGuideRef([15])],
};

export const crescentStorySteps: CrescentStoryStep[] = [
  {
    id: 'crescent-story-deep-time',
    eyebrowAr: 'البداية',
    titleAr: 'أكثر من 400 مليون سنة',
    descriptionAr: 'تبدأ الرحلة من ظهور النباتات الأولى قبل أكثر من 400 مليون سنة.',
    source: [knowledgeGuideRef([15])],
  },
  {
    id: 'crescent-story-evolution',
    eyebrowAr: 'الرحلة',
    titleAr: 'تطور الحياة النباتية',
    descriptionAr: 'تتدرج التجربة عبر الفترات الجيولوجية والعصور السحيقة وصولاً إلى النظم البيئية الحديثة.',
    source: [knowledgeGuideRef([15])],
  },
  {
    id: 'crescent-story-living-museum',
    eyebrowAr: 'المكان',
    titleAr: 'المتحف النباتي الحي',
    descriptionAr: 'يعيد مبنى الهلالين بناء بيئات مناخية متكاملة، ولا يقتصر دوره على العرض الساكن للنباتات.',
    source: [knowledgeGuideRef([15])],
  },
];
