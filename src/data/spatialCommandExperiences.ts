import { kapCandidateSpatialIntake } from './kapCandidateSpatialIntake';
import { kapExperienceIntelligencePack } from './experienceIntelligencePacks';
import { kapFounderSpatialTruthPack } from './kapSpatialTruth';
import { kapSpatialCommandConfigurationId } from './spatialCommandExperienceIds';
import { kapDesignAssetId } from './kapDesignIds';
import { validateSpatialCommandConfiguration } from '../services/spatialCommand';
import type {
  NarrativeConnection,
  NarrativeJourneyStep,
  SpatialCommandExperienceConfiguration,
  SpatialCommandExperienceObject,
  SpatialCommandSourceLayer,
  SpatialExecutiveBlocker,
  SpatialUnresolvedItem
} from '../types/spatialCommand';

const experienceObjectLabels: Record<string, { labelAr: string; legacyAliasEn: string | null }> = {
  'ZONE-ARRIVAL-001': { labelAr: 'الوصول والاستقبال', legacyAliasEn: null },
  'ZONE-AGES-TUNNEL-001': { labelAr: 'ممر العصور', legacyAliasEn: 'Ages Tunnel' },
  'ZONE-SHOW-001': { labelAr: 'المسرح ومنطقة العرض', legacyAliasEn: null },
  'ZONE-PHOTO-MEDIA-001': { labelAr: 'التصوير والإعلام', legacyAliasEn: null },
  'ZONE-DINNER-VIP-001': { labelAr: 'العشاء وكبار الشخصيات', legacyAliasEn: null }
};

const experienceObjects: SpatialCommandExperienceObject[] = kapExperienceIntelligencePack.experiencePoints.map((point, index) => {
  const label = experienceObjectLabels[point.relatedEntityId];
  return {
    experienceObjectId: point.relatedEntityId,
    labelAr: label?.labelAr ?? point.nameAr,
    legacyAliasEn: label?.legacyAliasEn ?? null,
    sequence: index + 1
  };
});

const narrativeSteps: NarrativeJourneyStep[] = [
  {
    stepId: 'arrival',
    sequence: 1,
    labelAr: 'الوصول والاستقبال',
    descriptionAr: 'تبدأ القصة عند البوابات والاستقبال وفق موضعين مرشحين من المخطط.',
    experienceObjectId: 'ZONE-ARRIVAL-001',
    candidateEntityIds: ['ENTITY-KAP-OP-001', 'ENTITY-KAP-OP-002'],
    status: 'candidate',
    narrativeOnly: true,
    operatorNoticeAr: null
  },
  {
    stepId: 'ages',
    sequence: 2,
    labelAr: 'ممر العصور',
    descriptionAr: 'الموضع مرشح، وتبقى تسمية Tunnel القديمة متعارضة مع ممر العصور في المصدر.',
    experienceObjectId: 'ZONE-AGES-TUNNEL-001',
    candidateEntityIds: ['ENTITY-KAP-OP-006'],
    status: 'conflicted',
    narrativeOnly: true,
    operatorNoticeAr: 'الاسم العربي مجمّد: ممر العصور. يبقى الموضع البصري متعارضًا وغير متحقق هندسيًا.'
  },
  {
    stepId: 'show',
    sequence: 3,
    labelAr: 'المسرح ومنطقة العرض',
    descriptionAr: 'كائن التجربة موجود منطقيًا، لكن المصدر الحالي لا يحدد له وجهة مكانية.',
    experienceObjectId: 'ZONE-SHOW-001',
    candidateEntityIds: [],
    status: 'unresolved',
    narrativeOnly: true,
    operatorNoticeAr: 'موقع محطة العرض لم يُحسم؛ لم تُنشأ نقطة بديلة ولم تُربط بالمجسم.'
  },
  {
    stepId: 'media',
    sequence: 4,
    labelAr: 'التصوير والإعلام',
    descriptionAr: 'تربط القصة بصورة مرشحة بين المركز الإعلامي ولحظة المؤتمر والصورة التذكارية.',
    experienceObjectId: 'ZONE-PHOTO-MEDIA-001',
    candidateEntityIds: ['ENTITY-KAP-OP-003', 'ENTITY-KAP-OP-009'],
    status: 'candidate',
    narrativeOnly: true,
    operatorNoticeAr: null
  },
  {
    stepId: 'dinner',
    sequence: 5,
    labelAr: 'العشاء وكبار الشخصيات',
    descriptionAr: 'تجمع المرحلة سرديًا العشاء والضيافة ومنطقة كبار الشخصيات من دون اعتماد مسار أو سعة.',
    experienceObjectId: 'ZONE-DINNER-VIP-001',
    candidateEntityIds: ['ENTITY-KAP-OP-007', 'ENTITY-KAP-OP-008', 'ENTITY-KAP-OP-010'],
    status: 'candidate',
    narrativeOnly: true,
    operatorNoticeAr: null
  }
];

const narrativeConnections: NarrativeConnection[] = narrativeSteps.slice(0, -1).map((step, index) => ({
  narrativeConnectionId: `NARRATIVE-KAP-${String(index + 1).padStart(3, '0')}`,
  fromStepId: step.stepId,
  toStepId: narrativeSteps[index + 1]!.stepId,
  connectionKind: 'storytelling-only',
  physicalRouteAuthority: 'none',
  disclosureAr: 'تسلسل قصصي — ليس مسارًا ميدانيًا معتمدًا'
}));

const executiveBlockers: SpatialExecutiveBlocker[] = [
  {
    blockerId: 'DRIVE-PERMISSION-ANONYMOUS-WRITER',
    labelAr: 'صلاحية مصدر غير آمنة',
    category: 'source-integrity',
    affectedCandidateEntityIds: kapCandidateSpatialIntake.candidateEntities.map((entity) => entity.candidateId),
    affectedExperienceObjectIds: experienceObjects.map((object) => object.experienceObjectId),
    whyItMattersAr: 'أي شخص يملك الرابط يستطيع تعديل المجلد البعيد؛ التوفر ووقت التعديل لا يثبتان السلطة.',
    requiredDecisionAr: 'تثبيت مصدر إصدار مضبوط الصلاحيات مع إبقاء البصمات الحالية للمراجعة.',
    decisionAuthority: 'independent-authority',
    decisionAuthorityAr: 'مالك مستودع المصدر أو مسؤول الأمن',
    nextAcceptedEvidenceAr: 'سجل صلاحيات جديد ومستودع إصدار قانوني ذو وصول مقيد.'
  },
  {
    blockerId: 'TERMINOLOGY-TUNNEL-VS-WALKWAY',
    labelAr: 'تسمية ممر العصور مجمّدة',
    category: 'terminology',
    affectedCandidateEntityIds: ['ENTITY-KAP-OP-006'],
    affectedExperienceObjectIds: ['ZONE-AGES-TUNNEL-001'],
    whyItMattersAr: 'المعرّف القديم يصف Tunnel بينما المصدر المرشح يصف ممر العصور.',
    requiredDecisionAr: 'لا قرار دلالي متبقٍ؛ يلزم فقط توثيق المواءمة المكانية المستقلة مع المصدر الهندسي لاحقًا.',
    decisionAuthority: 'founder',
    decisionAuthorityAr: 'أحمد',
    nextAcceptedEvidenceAr: 'مرجع هندسي معتمد يثبت علاقة المرساة المرشحة بالموضع، دون تغيير الاسم العربي المجمد.',
    decisionState: 'founder-frozen'
  },
  {
    blockerId: 'NO-SOURCE-MATCH',
    labelAr: 'موقع منطقة العرض غير محدد',
    category: 'mapping',
    affectedCandidateEntityIds: [],
    affectedExperienceObjectIds: ['ZONE-SHOW-001'],
    whyItMattersAr: 'كائن العرض موجود في حزمة التجربة ولا يملك وجهة مقابلة في المخطط المرشح.',
    requiredDecisionAr: 'تحديد مرجع مكاني موثوق أو إبقاء الكائن منفصلًا منطقيًا.',
    decisionAuthority: 'founder',
    decisionAuthorityAr: 'أحمد بالتنسيق مع سلطة المخطط',
    nextAcceptedEvidenceAr: 'مصدر مرقم أو مخطط معتمد يحدد موضع منطقة العرض.'
  },
  {
    blockerId: 'UNASSIGNED-CANDIDATE-ENTITIES',
    labelAr: 'تصنيف المعالم المستقلة مجمّد',
    category: 'classification',
    affectedCandidateEntityIds: ['ENTITY-KAP-OP-004', 'ENTITY-KAP-OP-005', 'ENTITY-KAP-OP-011'],
    affectedExperienceObjectIds: [],
    whyItMattersAr: 'المجسم والنصب التذكاري وركن الذكريات مستلمة مكانيًا ولم تُدمج في كائنات التجربة.',
    requiredDecisionAr: 'لا قرار تصنيف متبقٍ؛ تبقى المعالم خارج الرحلة ولا تُدمج إلا في مراجعة مستقبلية جديدة.',
    decisionAuthority: 'founder',
    decisionAuthorityAr: 'أحمد',
    nextAcceptedEvidenceAr: 'مراجعة مستقبلية صريحة إذا طُلب إدخال أحد المعالم في رحلة أو كائن تجربة.',
    decisionState: 'founder-frozen'
  },
  {
    blockerId: 'CANDIDATE-ZONING-SCALE-UNKNOWN',
    labelAr: 'مقياس الرسم غير مثبت',
    category: 'geometry-control',
    affectedCandidateEntityIds: kapCandidateSpatialIntake.candidateEntities.map((entity) => entity.candidateId),
    affectedExperienceObjectIds: experienceObjects.map((object) => object.experienceObjectId),
    whyItMattersAr: 'لا يمكن استنتاج مسافات أو أبعاد أو سعات من صورة غير معايرة.',
    requiredDecisionAr: 'توفير رسم هندسي موثق المقياس أو نقاط ضبط مستقلة.',
    decisionAuthority: 'independent-authority',
    decisionAuthorityAr: 'الجهة الهندسية المخولة',
    nextAcceptedEvidenceAr: 'رسم صادر بوضوح المقياس أو تحويل مضبوط إلى CAD/DXF/GeoJSON.'
  },
  {
    blockerId: 'CANDIDATE-ZONING-CRS-UNKNOWN',
    labelAr: 'المرجع المكاني غير مثبت',
    category: 'geometry-control',
    affectedCandidateEntityIds: kapCandidateSpatialIntake.candidateEntities.map((entity) => entity.candidateId),
    affectedExperienceObjectIds: experienceObjects.map((object) => object.experienceObjectId),
    whyItMattersAr: 'لا يوجد CRS أو نقاط تحكم لربط الصورة بالموقع الحقيقي.',
    requiredDecisionAr: 'تحديد نظام الإحداثيات ونقاط التحكم بواسطة سلطة مستقلة.',
    decisionAuthority: 'independent-authority',
    decisionAuthorityAr: 'المساح أو الجهة الهندسية المخولة',
    nextAcceptedEvidenceAr: 'CRS معلن ونقاط ضبط مساحية موثقة.'
  },
  {
    blockerId: 'CANDIDATE-ZONING-APPROVAL-MISSING',
    labelAr: 'اعتماد المخطط مفقود',
    category: 'geometry-control',
    affectedCandidateEntityIds: kapCandidateSpatialIntake.candidateEntities.map((entity) => entity.candidateId),
    affectedExperienceObjectIds: experienceObjects.map((object) => object.experienceObjectId),
    whyItMattersAr: 'الصفحة بلا توقيع أو كتلة اعتماد أو جدول مراجعات أو جهة إصدار مثبتة.',
    requiredDecisionAr: 'الحصول على إصدار صادر ومعتمد قبل أي ترقية هندسية.',
    decisionAuthority: 'independent-authority',
    decisionAuthorityAr: 'الجهة المالكة للمخطط',
    nextAcceptedEvidenceAr: 'إصدار موقع يحمل رقم مراجعة وجهة إصدار واعتمادًا صالحًا.'
  },
  {
    blockerId: 'VISITOR-MAP-EDITABLE-SOURCE-MISSING',
    labelAr: 'خريطة الزائر القابلة للتحرير مفقودة',
    category: 'missing-source',
    affectedCandidateEntityIds: [],
    affectedExperienceObjectIds: experienceObjects.map((object) => object.experienceObjectId),
    whyItMattersAr: 'المراجع الحالية ليست خريطة زائر مصورة قابلة للتحرير أو مسجلة على نقاط CAD.',
    requiredDecisionAr: 'تكليف وتسليم أصل زائر قابل للتحرير مع الحقوق والمراجعة.',
    decisionAuthority: 'founder',
    decisionAuthorityAr: 'أحمد للتكليف، ثم جهة تصميم مخولة للتسليم',
    nextAcceptedEvidenceAr: 'AI أو SVG أو PSD أو PDF طبقي مسجل على نقاط تحكم CAD مع إثبات الحقوق.'
  }
];

const unresolvedItems: SpatialUnresolvedItem[] = [
  {
    unresolvedItemId: 'TERMINOLOGY-TUNNEL-VS-WALKWAY',
    labelAr: 'تعارض تسمية ممر العصور',
    candidateEntityIds: ['ENTITY-KAP-OP-006'],
    experienceObjectIds: ['ZONE-AGES-TUNNEL-001'],
    recommendationAr: 'الاسم العربي ممر العصور مجمّد بقرار المؤسس، وتبقى المواءمة المكانية والهندسية متعارضة وغير متحققة.',
    authorityState: 'conflicted'
  },
  {
    unresolvedItemId: 'NO-SOURCE-MATCH',
    labelAr: 'منطقة العرض بلا موقع',
    candidateEntityIds: [],
    experienceObjectIds: ['ZONE-SHOW-001'],
    recommendationAr: 'إبقاء كائن العرض منفصلًا؛ لا يُربط بالمجسم ولا تُنشأ له مرساة.',
    authorityState: 'unresolved'
  },
  {
    unresolvedItemId: 'VISITOR-MAP-EDITABLE-SOURCE-MISSING',
    labelAr: 'أصل خريطة الزائر مفقود',
    candidateEntityIds: [],
    experienceObjectIds: experienceObjects.map((object) => object.experienceObjectId),
    recommendationAr: 'طلب أصل قابل للتحرير ومسجل على نقاط CAD المعتمدة بدل تصنيع خريطة بديلة.',
    authorityState: 'missing'
  }
];

const sourceLayers: SpatialCommandSourceLayer[] = kapCandidateSpatialIntake.sourceLayers.map((layer) => {
  const governanceContext = {
    eyebrowAr: 'سياق سلطة المشروع',
    titleAr: 'حوكمة المشروع المعتمدة',
    summaryAr: 'مرجع سلطة وأدوار معتمد للمشروع، وليس طبقة هندسية أو دليل إنجاز تشغيلي.',
    canvasTitleAr: 'مرجع الحوكمة والسلطة',
    canvasSummaryAr: 'يعرض هيكل الحوكمة وحدود السلطة دون تحويل الأسماء أو الأدوار إلى إثبات جاهزية.',
    facts: [
      { labelAr: 'السلطة', valueAr: 'اعتماد مؤسس لنطاق حوكمة المشروع' },
      { labelAr: 'الاستخدام', valueAr: 'تعريف الأدوار ومسارات التصعيد والمسؤولية' },
      { labelAr: 'الحد', valueAr: 'لا يثبت الإنجاز أو التحقق أو الاعتماد التشغيلي' }
    ]
  } as const;
  const contexts = {
    working: {
      eyebrowAr: 'سياق مصدر CAD',
      titleAr: 'مصدر CAD معتمد',
      summaryAr: 'لا يوجد كيان تقسيم تشغيلي محدد في هذه الطبقة.',
      canvasTitleAr: 'مصدر معتمد ومتحقق البصمة',
      canvasSummaryAr: 'نسختا المصدر متطابقتان بايتًا. لم تُنشأ مراجعة CAD أو هندسة جديدة.',
      facts: [
        { labelAr: 'النسخة', valueAr: 'مطابقة موثقة، لا مراجعة جديدة' },
        { labelAr: 'التحويل', valueAr: 'معلّق حتى إعداد مشتق هندسي مضبوط' },
        { labelAr: 'السلطة', valueAr: 'المصدر معتمد؛ الهندسة والتسجيل غير معتمدين' }
      ]
    },
    candidate: {
      eyebrowAr: 'سياق المصدر المرشح',
      titleAr: 'مخطط التقسيم التشغيلي',
      summaryAr: 'مراسي بصرية مشتقة يدويًا للمراجعة، وليست هندسة أو مسارات معتمدة.',
      canvasTitleAr: 'مخطط تشغيلي مرشح وغير معاير',
      canvasSummaryAr: 'إحدى عشرة وجهة مرقمة مرتبطة ببصمة مشتق المراجعة المحلي.',
      facts: [
        { labelAr: 'المقياس', valueAr: 'غير معروف' },
        { labelAr: 'CRS', valueAr: 'غير معروف' },
        { labelAr: 'الاعتماد', valueAr: 'مفقود' },
        { labelAr: 'المعايرة', valueAr: 'غير مكتملة' }
      ]
    },
    conceptual: {
      eyebrowAr: 'سياق المرجع المفاهيمي',
      titleAr: 'المخطط المصور A–T',
      summaryAr: 'مرجع لفهم اللغة البصرية ووصف الحدائق، وليس حالة تقنية.',
      canvasTitleAr: 'مرجع مفاهيمي A–T',
      canvasSummaryAr: 'يساعد على فهم اللغة البصرية ولا يحدد حالة تقنية أو تشغيلية.',
      facts: [
        { labelAr: 'ما قد يقوده', valueAr: 'وصف مفاهيمي ومراجع بصرية' },
        { labelAr: 'ما لا يقوده', valueAr: 'موقع تشغيلي أو مساحة أو مسار أو جاهزية' },
        { labelAr: 'الحقوق', valueAr: 'مراجعة فقط؛ تظهر علامة مصدر خارجي في إحدى الشرائح' }
      ]
    },
    evidence: {
      eyebrowAr: 'سياق الأدلة الميدانية',
      titleAr: 'فهرس بيانات وصفية فقط',
      summaryAr: 'لقطة جرد Drive للمراجعة وليست أرشيف وسائط دائمًا.',
      canvasTitleAr: 'سياق ميداني بلا نشر للبيانات الحساسة',
      canvasSummaryAr: 'وجود الوسائط لا يثبت جاهزية منطقة ولا يغير قرارًا.',
      facts: [
        { labelAr: 'الصور', valueAr: '195 صورة مراجعة' },
        { labelAr: 'الفيديو', valueAr: '6 فيديوهات مراجعة' },
        { labelAr: 'GPS والخصوصية', valueAr: 'الإحداثيات الدقيقة والهوية غير منشورتين' },
        { labelAr: 'الجاهزية', valueAr: 'لا تتغير تلقائيًا بوجود الوسائط' }
      ]
    },
    missing: {
      eyebrowAr: 'سياق مصدر مفقود',
      titleAr: 'خريطة الزائر التوضيحية لم تُسلّم بعد',
      summaryAr: 'لا يعرض هذا السياق أي اختيار تقسيم تشغيلي معلّق.',
      canvasTitleAr: 'خريطة الزائر التوضيحية لم تُسلّم بعد',
      canvasSummaryAr: 'المخطط المفاهيمي وصور A–T ليست أصل خريطة زائر قابلًا للتحرير. لن تصنع المنصة خريطة بديلة.',
      facts: [
        { labelAr: 'الصيغة', valueAr: 'AI أو SVG أو PSD أو PDF طبقي' },
        { labelAr: 'الحقوق', valueAr: 'تأكيد الملكية والمراجعة مطلوب' },
        { labelAr: 'التسجيل', valueAr: 'مطلوب على نقاط تحكم CAD معتمدة' }
      ]
    }
  } as const;
  return {
    ...layer,
    operatorContext: layer.sourceLayerId === 'SOURCE-LAYER-KAP-GOVERNANCE'
      ? governanceContext
      : contexts[layer.truthStatus]
  };
});

const relationshipApprovalAr: Record<string, string> = {
  'REL-KAP-ARRIVAL-CANDIDATE-001': 'تأكيد المؤسس ثم مراجعة سلطة المواءمة المكانية المستقلة.',
  'REL-KAP-AGES-CANDIDATE-001': 'الاسم العربي مجمّد بقرار المؤسس؛ الموضع والعلاقة يحتاجان تحققًا هندسيًا مستقلًا.',
  'REL-KAP-PHOTO-MEDIA-CANDIDATE-001': 'تأكيد المؤسس ومراجعة سلطة المصدر.',
  'REL-KAP-DINNER-VIP-CANDIDATE-001': 'تأكيد المؤسس ثم مراجعة السلطة التشغيلية المستقلة.',
  'REL-KAP-SHOW-UNRESOLVED-001': 'تحديد وجهة مرشحة موثقة أو إبقاء كائن العرض منفصلًا منطقيًا.',
  'REL-KAP-UNASSIGNED-CANDIDATES-001': 'تصنيف المؤسس مجمّد: معالم مستقلة خارج الرحلة الحالية.'
};

const entityRelationships = kapCandidateSpatialIntake.relationships.map((relationship) => ({
  ...relationship,
  requiredApprovalAr: relationshipApprovalAr[relationship.relationshipId] ?? 'قرار موثق من السلطة المختصة.'
}));

const displayLayers = [
  {
    layerId: 'DISPLAY-LAYER-KAP-BASE-WORKING-SOURCE',
    labelAr: 'مصدر CAD المعتمد',
    type: 'base-working-source',
    sourceId: 'SOURCE-ASSET-KAP-DWG-DRIVE-001',
    authority: 'founder-approved-cad-source',
    visibility: false,
    opacity: 1,
    compatibleModes: ['experience', 'executive', 'journey'],
    truthClassification: 'approved-source-not-engineering-baseline',
    renderOrder: 10,
    legend: { labelAr: 'مصدر معتمد دون هندسة أو baseline', symbol: 'source' },
    dependencies: []
  },
  {
    layerId: 'DISPLAY-LAYER-KAP-CANDIDATE-ZONING',
    labelAr: 'التقسيم التشغيلي المرشح',
    type: 'candidate-zoning',
    sourceId: 'SOURCE-ASSET-KAP-ZONING-CANDIDATE-001',
    authority: 'founder-selected-working-candidate',
    visibility: true,
    opacity: 1,
    compatibleModes: ['experience', 'executive', 'journey'],
    truthClassification: 'candidate-raster-uncalibrated',
    renderOrder: 20,
    legend: { labelAr: 'صورة مرشحة غير معايرة', symbol: 'source' },
    dependencies: []
  },
  {
    layerId: 'DISPLAY-LAYER-KAP-CANDIDATE-MARKERS',
    labelAr: 'المراسي المرشحة',
    type: 'candidate-entity-markers',
    sourceId: 'SOURCE-ASSET-KAP-ZONING-CANDIDATE-001',
    authority: 'candidate-visual-anchor',
    visibility: true,
    opacity: 1,
    compatibleModes: ['experience', 'executive', 'journey'],
    truthClassification: 'candidate-visual-anchor',
    renderOrder: 30,
    legend: { labelAr: 'مرساة بصرية مرشحة', symbol: 'marker' },
    dependencies: ['DISPLAY-LAYER-KAP-CANDIDATE-ZONING']
  },
  {
    layerId: 'DISPLAY-LAYER-KAP-EXPERIENCE-RELATIONSHIPS',
    labelAr: 'علاقات التجربة',
    type: 'experience-relationships',
    sourceId: 'SPATIAL-TRUTH-PACK-v1-b63207f0b3f0d61a228c15b937fb72911cc546312e2ff19f0929797484ce56bf',
    authority: 'candidate-relationship',
    visibility: true,
    opacity: 0.82,
    compatibleModes: ['experience'],
    truthClassification: 'candidate-relationship',
    renderOrder: 40,
    legend: { labelAr: 'علاقة تجربة مرشحة', symbol: 'relationship' },
    dependencies: ['DISPLAY-LAYER-KAP-CANDIDATE-MARKERS']
  },
  {
    layerId: 'DISPLAY-LAYER-KAP-NARRATIVE-SEQUENCE',
    labelAr: 'التسلسل القصصي',
    type: 'narrative-sequence',
    sourceId: 'NARRATIVE-JOURNEY-KAP-001',
    authority: 'storytelling-only',
    visibility: true,
    opacity: 0.9,
    compatibleModes: ['journey'],
    truthClassification: 'narrative-not-route',
    renderOrder: 50,
    legend: { labelAr: 'تسلسل قصصي لا يمثل مسارًا', symbol: 'narrative' },
    dependencies: ['DISPLAY-LAYER-KAP-CANDIDATE-MARKERS']
  },
  {
    layerId: 'DISPLAY-LAYER-KAP-EXECUTIVE-BLOCKERS',
    labelAr: 'عوائق القرار',
    type: 'executive-blockers',
    sourceId: 'SPATIAL-TRUTH-PACK-v1-b63207f0b3f0d61a228c15b937fb72911cc546312e2ff19f0929797484ce56bf',
    authority: 'decision-register',
    visibility: true,
    opacity: 1,
    compatibleModes: ['executive'],
    truthClassification: 'decision-record-not-live-alarm',
    renderOrder: 60,
    legend: { labelAr: 'سجل قرار وليس إنذارًا حيًا', symbol: 'blocker' },
    dependencies: ['DISPLAY-LAYER-KAP-CANDIDATE-ZONING']
  },
  {
    layerId: 'DISPLAY-LAYER-KAP-INDEPENDENT-LANDMARKS',
    labelAr: 'المعالم المستقلة',
    type: 'independent-landmarks',
    sourceId: 'SPATIAL-TRUTH-PACK-v1-b63207f0b3f0d61a228c15b937fb72911cc546312e2ff19f0929797484ce56bf',
    authority: 'founder-product-authority',
    visibility: true,
    opacity: 1,
    compatibleModes: ['experience', 'executive', 'journey'],
    truthClassification: 'independent-landmark',
    renderOrder: 70,
    legend: { labelAr: 'معلم مستقل خارج الرحلة', symbol: 'landmark' },
    dependencies: ['DISPLAY-LAYER-KAP-CANDIDATE-MARKERS']
  },
  {
    layerId: 'DISPLAY-LAYER-KAP-EVIDENCE-METADATA',
    labelAr: 'توفر الأدلة',
    type: 'evidence-availability-metadata',
    sourceId: 'SOURCE-ASSET-KAP-FIELD-MEDIA-INVENTORY-001',
    authority: 'metadata-only',
    visibility: false,
    opacity: 1,
    compatibleModes: ['experience', 'executive'],
    truthClassification: 'evidence-metadata-no-readiness',
    renderOrder: 80,
    legend: { labelAr: 'توفر أدلة بلا تغيير جاهزية', symbol: 'evidence' },
    dependencies: []
  },
  {
    layerId: 'DISPLAY-LAYER-KAP-UNRESOLVED',
    labelAr: 'العناصر غير المحسومة',
    type: 'unresolved-items',
    sourceId: 'SPATIAL-TRUTH-PACK-v1-b63207f0b3f0d61a228c15b937fb72911cc546312e2ff19f0929797484ce56bf',
    authority: 'founder-product-authority',
    visibility: true,
    opacity: 1,
    compatibleModes: ['experience', 'executive', 'journey'],
    truthClassification: 'unresolved-no-anchor',
    renderOrder: 90,
    legend: { labelAr: 'سجل غير محسوم بلا موضع', symbol: 'unresolved' },
    dependencies: []
  },
  {
    layerId: 'DISPLAY-LAYER-FUTURE-EXTERNAL-ADAPTER',
    labelAr: 'محوّل مكاني خارجي مستقبلي',
    type: 'future-external-spatial-adapter',
    sourceId: null,
    authority: 'unavailable',
    visibility: false,
    opacity: 1,
    compatibleModes: ['experience', 'executive', 'journey'],
    truthClassification: 'future-adapter-unavailable',
    renderOrder: 100,
    legend: { labelAr: 'غير متصل في هذه المرحلة', symbol: 'adapter' },
    dependencies: []
  }
] satisfies SpatialCommandExperienceConfiguration['displayLayers'];

export const kapSpatialCommandExperience: SpatialCommandExperienceConfiguration = {
  schemaVersion: '1.0.0',
  configurationId: kapSpatialCommandConfigurationId,
  version: '0.1.0-candidate',
  contentHash: 'SPATIAL-COMMAND-KAP-3E4B-CANDIDATE-001',
  projectId: kapCandidateSpatialIntake.projectId,
  eventId: kapCandidateSpatialIntake.eventId,
  venueId: kapCandidateSpatialIntake.venueId,
  experienceTitle: 'تجربة القيادة المكانية لمشروع حدائق الملك عبدالله',
  truthContext: {
    packageStatus: 'candidate',
    operationalBaselineStatus: 'absent',
    geometryAuthority: 'none',
    liveDataStatus: 'absent',
    routeAuthority: 'none',
    readinessInference: 'prohibited',
    scaleStatus: 'unknown',
    crsStatus: 'unknown',
    drawingApprovalStatus: 'missing',
    calibrationStatus: 'incomplete'
  },
  sourceLayers,
  displayLayers,
  candidateEntities: kapCandidateSpatialIntake.candidateEntities,
  experienceObjects,
  entityRelationships,
  narrativeJourney: {
    journeyId: 'NARRATIVE-JOURNEY-KAP-001',
    labelAr: 'قصة رحلة الزائر المرشحة',
    physicalRouteId: null,
    routeAuthority: 'none',
    playbackStepDurationMs: 12_000,
    steps: narrativeSteps,
    connections: narrativeConnections
  },
  spatialRoutes: [],
  executiveBlockers,
  evidenceSummary: {
    inventory: kapCandidateSpatialIntake.fieldEvidenceInventory,
    exactGpsExposed: false,
    personalIdentifiersExposed: false,
    readinessMutationAllowed: false,
    statusAr: 'لقطة جرد للمراجعة فقط؛ لا تُنشئ جاهزية أو قرارًا.'
  },
  presentation: {
    durationLabelAr: '77 ثانية',
    phaseDurationMs: 7_000,
    phases: [
      { phaseId: 'intro', labelAr: 'افتتاح المشروع وحالة الحقيقة المرشحة', mode: 'experience', viewMode: 'presentation' },
      { phaseId: 'map', labelAr: 'كشف مخطط التقسيم التشغيلي المرشح', mode: 'experience' },
      { phaseId: 'destinations', labelAr: 'إظهار الوجهات التشغيلية الإحدى عشرة', mode: 'experience' },
      { phaseId: 'groups', labelAr: 'تنظيم الوجهات داخل كائنات التجربة الخمسة', mode: 'experience' },
      { phaseId: 'journey-arrival', labelAr: 'الوصول والاستقبال', mode: 'journey', journeyStepId: 'arrival' },
      { phaseId: 'journey-ages', labelAr: 'ممر العصور مع بقاء تعارض التسمية', mode: 'journey', journeyStepId: 'ages' },
      { phaseId: 'journey-show', labelAr: 'توقف مقصود: موقع محطة العرض غير محسوم', mode: 'journey', journeyStepId: 'show' },
      { phaseId: 'journey-media', labelAr: 'التصوير والإعلام', mode: 'journey', journeyStepId: 'media' },
      { phaseId: 'journey-dinner', labelAr: 'العشاء وكبار الشخصيات', mode: 'journey', journeyStepId: 'dinner' },
      { phaseId: 'blockers', labelAr: 'كشف عوائق القرار والاعتماد', mode: 'executive' },
      { phaseId: 'finish', labelAr: 'المتاح الآن وما يلزم قبل التفعيل المكاني', mode: 'experience', viewMode: 'presentation' }
    ]
  },
  visualConfiguration: {
    mapAdapterId: 'SPATIAL-MAP-ADAPTER-CANDIDATE-RASTER-v1',
    projectLabelAr: 'افتتاح وتدشين حدائق الملك عبدالله',
    venueLabelAr: 'حدائق الملك عبدالله',
    mapAspectRatio: 2400 / 1872,
    initialZoom: 1,
    minimumZoom: 0.75,
    maximumZoom: 3,
    defaultViewMode: 'top',
    projectCoverUri: '/visual-direction/kap-cover-review.png',
    visitorMapInputSpecUri: '/specifications/kap-disney-style-map-input-spec.txt',
    accent: 'botanical'
  },
  sourceTruth: {
    sources: kapCandidateSpatialIntake.sourceAssets,
    compactTruthAr: 'مصدر مرشح موثق البصمة · لا هندسة أو مسارات معتمدة',
    riskIds: kapCandidateSpatialIntake.sourceIntegrityRiskIds,
    risks: [
      {
        riskId: 'DRIVE-PERMISSION-ANONYMOUS-WRITER',
        severity: 'critical',
        status: 'open',
        labelAr: 'خطر نزاهة المصدر ما زال مفتوحًا',
        summaryAr: 'مجلد Drive يسمح للكاتب المجهول. لم تتغير الصلاحيات، ولا يُعامل التوفر البعيد كسجل تدقيق قانوني.'
      }
    ]
  },
  technicalRoutes: [
    {
      technicalRouteId: 'TECHNICAL-KAP-SOURCE-AUTHORITY',
      labelAr: 'مساحة مواءمة المصدر والاعتماد',
      workspace: 'spatial-authoring',
      sourceLayerId: 'SOURCE-LAYER-KAP-WORKING-CAD',
      navigationKind: 'technical-workspace'
    }
  ],
  designSceneLinks: [{
    designSceneLinkId: 'SPATIAL-DESIGN-LINK-KAP-AGES-R1',
    sceneAssetId: kapDesignAssetId,
    labelAr: 'فحص التصميم Web3D المرشح',
    relatedEntityIds: ['ENTITY-KAP-OP-006'],
    relatedExperienceObjectIds: ['ZONE-AGES-TUNNEL-001'],
    relationshipStatus: 'proposed',
    authorityStatusAr: 'ربط مرشح بممر العصور — يحتاج تأكيد الهوية'
  }],
  unresolvedItems,
  spatialTruthPack: kapFounderSpatialTruthPack
};

const validation = validateSpatialCommandConfiguration(kapSpatialCommandExperience);
if (!validation.valid) {
  throw new Error(`Spatial command configuration invalid: ${validation.issues.map((entry) => entry.code).join(', ')}`);
}

export const spatialCommandExperienceCatalog: readonly SpatialCommandExperienceConfiguration[] = [
  kapSpatialCommandExperience
];

export function findSpatialCommandExperience(
  configurationId: string | undefined,
  scope: { projectId: string; eventId: string; venueId: string }
): SpatialCommandExperienceConfiguration | null {
  if (!configurationId) return null;
  return spatialCommandExperienceCatalog.find((configuration) => (
    configuration.configurationId === configurationId
    && configuration.projectId === scope.projectId
    && configuration.eventId === scope.eventId
    && configuration.venueId === scope.venueId
  )) ?? null;
}
