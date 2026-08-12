import {
  AlertOctagon,
  ArrowLeft,
  Camera,
  CircleDashed,
  FileCheck2,
  FileImage,
  FileWarning,
  Fingerprint,
  Images,
  Map as MapIcon,
  MapPinned,
  Route,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Video
} from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type {
  CandidateExperienceRelationship,
  CandidateSourceLayer,
  CandidateSpatialEntity,
  CandidateSpatialIntakePackage,
  SourceAssetManifest
} from '../../types/sourceIntake';
import type { CommandWorkspace } from '../../ux/commandExperience';
import { OptionalLocalSourceImage } from '../shared/OptionalLocalSourceImage';
import './candidateSpatialIntake.css';
import './candidateSpatialMarkerDeclutter.css';

interface CandidateSpatialIntakeWorkspaceProps {
  spatialPackage: CandidateSpatialIntakePackage;
  projectNameAr: string;
  experienceLabels: Record<string, string>;
  onNavigate: (workspace: CommandWorkspace) => void;
  onExportReview: () => void;
}

const authorityLabels: Record<SourceAssetManifest['authorityStatus'], string> = {
  'founder-approved-project-governance-source': 'مصدر حوكمة اعتمده المؤسس',
  'founder-approved-cad-source': 'مصدر CAD اعتمده المؤسس',
  'founder-approved-working-source': 'مصدر عمل اعتمده المؤسس',
  'founder-selected-working-candidate': 'مرشح عمل اختاره المؤسس',
  'concept-reference-only': 'مرجع مفاهيمي فقط',
  'field-reference-and-evidence-candidate': 'مرجع ميداني ودليل مرشح',
  missing: 'مفقود',
  rejected: 'مرفوض',
  superseded: 'مستبدل'
};

const truthLabels: Record<CandidateSourceLayer['truthStatus'], string> = {
  working: 'عامل',
  candidate: 'مرشح',
  conceptual: 'مفاهيمي',
  evidence: 'دليل مرشح',
  missing: 'مفقود'
};

const relationshipLabels: Record<CandidateExperienceRelationship['state'], string> = {
  proposed: 'مقترح',
  probable: 'مرجح',
  conflicted: 'متعارض',
  unresolved: 'غير محسوم',
  'founder-confirmed': 'مؤكد من المؤسس',
  'authority-confirmed': 'مؤكد من السلطة',
  rejected: 'مرفوض'
};

const relationshipClassNames: Record<CandidateExperienceRelationship['state'], string> = {
  proposed: 'is-proposed',
  probable: 'is-probable',
  conflicted: 'is-conflicted',
  unresolved: 'is-unresolved',
  'founder-confirmed': 'is-confirmed',
  'authority-confirmed': 'is-confirmed',
  rejected: 'is-rejected'
};

const sourceDriveRules: Record<SourceAssetManifest['sourceRole'], { mayDriveAr: string; mayNotDriveAr: string }> = {
  'working-cad': {
    mayDriveAr: 'مراجعة CAD العاملة والاستعداد للتحويل المحلي.',
    mayNotDriveAr: 'هندسة نهائية أو إحداثيات مساحية أو مسارات معتمدة.'
  },
  'project-governance': {
    mayDriveAr: 'هيكل المشروع والأدوار ومسار المراجعة والاعتماد والتصعيد.',
    mayNotDriveAr: 'جاهزية تشغيلية أو اعتماد سلامة أو قبول عميل منفذ تلقائيًا.'
  },
  'candidate-operational-zoning': {
    mayDriveAr: 'مراسي صورة مرشحة ومراجعة العلاقات.',
    mayNotDriveAr: 'مضلعات أو مسافات أو سعات أو مسارات أو سلامة.'
  },
  'concept-reference': {
    mayDriveAr: 'وصف التجربة والمراجع البصرية المفاهيمية.',
    mayNotDriveAr: 'حقيقة تقنية أو تشغيلية أو مساحات معتمدة.'
  },
  'field-evidence': {
    mayDriveAr: 'سياق بصري ومراجعة أدلة منفصلة.',
    mayNotDriveAr: 'تغيير الجاهزية أو اعتماد قرار تلقائيًا.'
  },
  'visitor-map': {
    mayDriveAr: 'لا شيء حتى تسليم مصدر قابل للتحرير ومعتمد الحقوق.',
    mayNotDriveAr: 'إنتاج خريطة زائر نهائية من مراجع مفاهيمية.'
  }
};

function sourceHashPrefix(asset: SourceAssetManifest): string {
  return asset.observedSha256 ? `${asset.observedSha256.slice(0, 12)}…` : 'غير متوفر';
}

function getInitialLayerId(spatialPackage: CandidateSpatialIntakePackage): string {
  const requested = new URL(window.location.href).searchParams.get('sourceLayer');
  if (requested && spatialPackage.sourceLayers.some((layer) => layer.sourceLayerId === requested)) return requested;
  return spatialPackage.sourceLayers.find((layer) => layer.defaultVisible)?.sourceLayerId ?? spatialPackage.sourceLayers[0]!.sourceLayerId;
}

function getInitialCandidateId(spatialPackage: CandidateSpatialIntakePackage): string {
  const requested = new URL(window.location.href).searchParams.get('candidateEntity');
  if (requested && spatialPackage.candidateEntities.some((entity) => entity.candidateId === requested)) return requested;
  return spatialPackage.candidateEntities[0]!.candidateId;
}

function updateReviewUrl(sourceLayerId: string, candidateEntityId: string, replace = false) {
  const url = new URL(window.location.href);
  url.searchParams.set('sourceLayer', sourceLayerId);
  url.searchParams.set('candidateEntity', candidateEntityId);
  if (replace) window.history.replaceState({}, '', url);
  else window.history.pushState({}, '', url);
}

function CandidateMarker({
  entity,
  selected,
  onSelect
}: {
  entity: CandidateSpatialEntity;
  selected: boolean;
  onSelect: () => void;
}) {
  if (!entity.normalizedAnchor) return null;
  const declutterOffset = entity.sourceNumber === 4 ? -18 : entity.sourceNumber === 5 ? 18 : 0;
  return (
    <button
      data-testid={`candidate-marker-${entity.sourceNumber}`}
      type="button"
      className={`candidate-map-marker ${selected ? 'is-selected' : ''} is-${entity.mappingStatus}`}
      style={{
        insetInlineStart: `${entity.normalizedAnchor.x * 100}%`,
        top: `${entity.normalizedAnchor.y * 100}%`,
        '--candidate-marker-declutter-x': `${declutterOffset}px`
      } as CSSProperties}
      aria-label={`${entity.sourceNumber}. ${entity.labelAr}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span>{entity.sourceNumber}</span>
    </button>
  );
}

function CandidateZoningLayer({
  spatialPackage,
  layer,
  selectedCandidateId,
  onSelectCandidate
}: {
  spatialPackage: CandidateSpatialIntakePackage;
  layer: CandidateSourceLayer;
  selectedCandidateId: string;
  onSelectCandidate: (candidateId: string) => void;
}) {
  const source = spatialPackage.sourceAssets.find((asset) => asset.sourceAssetId === layer.sourceAssetId)!;
  if (!layer.previewUrl) return null;
  return (
    <section data-testid="candidate-zoning-overlay" className="candidate-zoning-layer">
      <div className="candidate-truth-banner">
        <AlertOctagon aria-hidden="true" />
        <strong>{spatialPackage.overlay.truthBannerAr}</strong>
      </div>
      <OptionalLocalSourceImage
        src={layer.previewUrl}
        alt="معاينة محلية للمخطط التشغيلي المرشح"
        missingTitleAr="المعاينة المحلية غير متاحة"
        missingMessageAr="البناء يعمل دون الأصل المحلي. لم نستخدم صورة بديلة أو هندسة تجريبية."
      >
        <div className="candidate-marker-layer" aria-label="الكيانات التشغيلية المرشحة">
          {spatialPackage.candidateEntities.map((entity) => (
            <CandidateMarker
              key={entity.candidateId}
              entity={entity}
              selected={entity.candidateId === selectedCandidateId}
              onSelect={() => onSelectCandidate(entity.candidateId)}
            />
          ))}
        </div>
      </OptionalLocalSourceImage>
      <footer className="candidate-source-disclosure">
        <span><FileCheck2 aria-hidden="true" />{source.sourceName}</span>
        <span><Fingerprint aria-hidden="true" /><bdi dir="ltr">{sourceHashPrefix(source)}</bdi></span>
        <span>الشمال: متوفر</span>
        <span>المقياس: غير معروف</span>
        <span>CRS: غير معروف</span>
        <span>الاعتماد: مفقود</span>
      </footer>
    </section>
  );
}

function WorkingCadLayer({ source }: { source: SourceAssetManifest }) {
  return (
    <section data-testid="working-cad-duplicate-confirmation" className="candidate-status-canvas candidate-cad-duplicate">
      <div className="candidate-status-icon"><Fingerprint aria-hidden="true" /></div>
      <p className="candidate-kicker">CONTENT-ADDRESSED DUPLICATE</p>
      <h2>المصدر العامل مطابق للمحتوى المسجل</h2>
      <p>الاسم والموقع في Drive جديدان، لكن البايتات والبصمة متطابقة. لم تُنشأ مراجعة CAD جديدة.</p>
      <div className="candidate-duplicate-flow" aria-label="نتيجة إزالة التكرار">
        <span><small>الملف الوارد</small><strong>{source.sourceName}</strong></span>
        <i aria-hidden="true" />
        <span><small>المصدر القانوني</small><strong><bdi dir="ltr">{source.duplicateOfSourceAssetId}</bdi></strong></span>
      </div>
      <dl>
        <div><dt>SHA-256 المتوقع</dt><dd><bdi dir="ltr">{source.expectedSha256}</bdi></dd></div>
        <div><dt>SHA-256 المرصود</dt><dd><bdi dir="ltr">{source.observedSha256}</bdi></dd></div>
        <div><dt>الحجم</dt><dd>{new Intl.NumberFormat('en-US').format(source.observedByteSize ?? 0)} bytes</dd></div>
        <div><dt>النتيجة</dt><dd>duplicate-confirmed · no false revision</dd></div>
        <div><dt>Operational baseline</dt><dd>{source.operationalBaselineStatus}</dd></div>
        <div><dt>اعتماد الهندسة</dt><dd>{source.geometryApprovalStatus}</dd></div>
      </dl>
    </section>
  );
}

function ConceptLayer({ layer, source }: { layer: CandidateSourceLayer; source: SourceAssetManifest }) {
  if (!layer.previewUrl) return null;
  return (
    <section data-testid="concept-masterplan-layer" className="candidate-concept-layer">
      <div className="candidate-concept-banner"><Sparkles aria-hidden="true" /><strong>مرجع مفاهيمي A–T فقط — لا يمثل مخططًا تشغيليًا أو هندسيًا</strong></div>
      <OptionalLocalSourceImage
        src={layer.previewUrl}
        alt="مرجع محلي للمخطط المفاهيمي A إلى T"
        missingTitleAr="مرجع العرض المفاهيمي غير متاح محليًا"
        missingMessageAr="لا يؤثر غياب مشتق المراجعة في صلاحية البناء أو حالة المصادر الأخرى."
      />
      <footer className="candidate-source-disclosure">
        <span><FileImage aria-hidden="true" />{source.sourceName}</span>
        <span>18 صفحة · rights: review-only</span>
        <span>لا route ولا scale ولا CRS</span>
      </footer>
    </section>
  );
}

function FieldEvidenceLayer({ spatialPackage }: { spatialPackage: CandidateSpatialIntakePackage }) {
  const inventory = spatialPackage.fieldEvidenceInventory;
  return (
    <section data-testid="field-evidence-catalog" className="candidate-field-layer">
      <div className="candidate-field-heading">
        <div>
          <p className="candidate-kicker">REVIEWED DRIVE INVENTORY SNAPSHOT</p>
          <h2>فهرس الأدلة الميدانية</h2>
          <p>هذه counts من لقطة المراجعة وليست أرشيف media دائمًا أو دليل جاهزية.</p>
        </div>
        <div className="candidate-media-totals">
          <span><Images aria-hidden="true" /><strong>{inventory.photographCount}</strong><small>صورة</small></span>
          <span><Video aria-hidden="true" /><strong>{inventory.videoCount}</strong><small>فيديوهات</small></span>
        </div>
      </div>
      <div className="candidate-field-categories">
        {inventory.categories.map((category) => (
          <article key={category.categoryId}>
            {category.mediaType === 'image' ? <Camera aria-hidden="true" /> : <Video aria-hidden="true" />}
            <strong>{category.labelAr}</strong>
            <span>{category.reviewedCount}</span>
          </article>
        ))}
      </div>
      <aside data-testid="gps-privacy-disclosure" className="candidate-privacy-callout" tabIndex={0}>
        <ShieldAlert aria-hidden="true" />
        <div>
          <strong>GPS وبيانات الأشخاص محجوبة عن المتصفح</strong>
          <p>نسجل فقط present / absent / stripped / quarantined / approved. لا إحداثيات دقيقة ولا استنتاج هوية موظف، ولا تغيّر الأدلة الجاهزية تلقائيًا.</p>
        </div>
      </aside>
    </section>
  );
}

function MissingVisitorMapLayer() {
  return (
    <section data-testid="missing-visitor-map" className="candidate-status-canvas candidate-missing-map">
      <div className="candidate-status-icon"><MapIcon aria-hidden="true" /></div>
      <p className="candidate-kicker">VISITOR-MAP-EDITABLE-SOURCE-MISSING</p>
      <h2>خريطة الزائر التوضيحية لم تُسلّم بعد</h2>
      <p>المخطط المفاهيمي A–T وصورته لا يستبدلان ملف AI أو SVG أو PSD أو PDF طبقيًا قابلًا للتسجيل مع CAD معتمد.</p>
      <span>البوابة محجوبة · لم تُفبرك خريطة Disney-style</span>
    </section>
  );
}

function LayerContent({
  spatialPackage,
  layer,
  selectedCandidateId,
  onSelectCandidate
}: {
  spatialPackage: CandidateSpatialIntakePackage;
  layer: CandidateSourceLayer;
  selectedCandidateId: string;
  onSelectCandidate: (candidateId: string) => void;
}) {
  const source = spatialPackage.sourceAssets.find((asset) => asset.sourceAssetId === layer.sourceAssetId)!;
  if (source.sourceRole === 'candidate-operational-zoning') {
    return <CandidateZoningLayer spatialPackage={spatialPackage} layer={layer} selectedCandidateId={selectedCandidateId} onSelectCandidate={onSelectCandidate} />;
  }
  if (source.sourceRole === 'working-cad') return <WorkingCadLayer source={source} />;
  if (source.sourceRole === 'concept-reference') return <ConceptLayer layer={layer} source={source} />;
  if (source.sourceRole === 'field-evidence') return <FieldEvidenceLayer spatialPackage={spatialPackage} />;
  return <MissingVisitorMapLayer />;
}

function CandidateInspector({
  spatialPackage,
  source,
  selected,
  experienceLabels
}: {
  spatialPackage: CandidateSpatialIntakePackage;
  source: SourceAssetManifest;
  selected: CandidateSpatialEntity;
  experienceLabels: Record<string, string>;
}) {
  const relationships = spatialPackage.relationships.filter((relationship) => relationship.candidateEntityIds.includes(selected.candidateId));
  return (
    <aside data-testid="candidate-entity-inspector" className="candidate-inspector">
      <div className="candidate-inspector-source">
        <span className={`candidate-truth-pill is-${source.authorityStatus}`}>{authorityLabels[source.authorityStatus]}</span>
        <small>{source.sourceName}</small>
      </div>
      <div className="candidate-inspector-index">{String(selected.sourceNumber).padStart(2, '0')}</div>
      <p className="candidate-kicker">CANDIDATE SPATIAL ENTITY</p>
      <h2>{selected.labelAr}</h2>
      <bdi dir="ltr">{selected.candidateId}</bdi>
      <dl>
        <div><dt>رقم المصدر</dt><dd>{selected.sourceNumber}</dd></div>
        <div><dt>السلطة</dt><dd>founder-selected-working-candidate</dd></div>
        <div><dt>الهندسة</dt><dd>{selected.geometryStatus}</dd></div>
        <div><dt>طريقة المرساة</dt><dd>{selected.anchorMethod}</dd></div>
        <div><dt>الثقة</dt><dd>{selected.anchorConfidence}</dd></div>
        <div><dt>حالة العلاقة</dt><dd>{relationshipLabels[selected.mappingStatus]}</dd></div>
      </dl>
      <section>
        <strong>كائنات الخبرة المرتبطة</strong>
        {relationships.length ? relationships.map((relationship) => (
          <article key={relationship.relationshipId} className={relationshipClassNames[relationship.state]}>
            <span>{relationship.experienceObjectId ? experienceLabels[relationship.experienceObjectId] ?? relationship.experienceObjectId : 'غير مسند'}</span>
            <small>{relationshipLabels[relationship.state]} · {relationship.confidence}</small>
          </article>
        )) : <p>لا توجد علاقة مسندة.</p>}
      </section>
      {relationships.flatMap((relationship) => relationship.conflictCodes).map((code) => (
        <div key={code} className="candidate-inspector-conflict"><AlertOctagon aria-hidden="true" /><span>{code}</span></div>
      ))}
      <div className="candidate-required-approval">
        <ShieldCheck aria-hidden="true" />
        <p><strong>الاعتماد المطلوب</strong>تأكيد المؤسس ثم سلطة مواءمة مستقلة. اختيار marker لا يغيّر baseline.</p>
      </div>
    </aside>
  );
}

function MappingRegister({
  spatialPackage,
  experienceLabels,
  onSelectCandidate
}: {
  spatialPackage: CandidateSpatialIntakePackage;
  experienceLabels: Record<string, string>;
  onSelectCandidate: (candidateId: string) => void;
}) {
  const entityById = new Map(spatialPackage.candidateEntities.map((entity) => [entity.candidateId, entity]));
  return (
    <section data-testid="candidate-mapping-register" className="candidate-mapping-register">
      <header>
        <div><p className="candidate-kicker">CANDIDATE MAPPING REGISTER</p><h2>11 وجهة مقابل 5 كائنات خبرة</h2></div>
        <div><span>1 تعارض مصطلحي</span><span>4 علاقات/كيانات غير محسومة</span></div>
      </header>
      <div className="candidate-mapping-cards">
        {spatialPackage.relationships.map((relationship) => (
          <article
            key={relationship.relationshipId}
            tabIndex={0}
            data-testid={relationship.experienceObjectId === 'ZONE-SHOW-001'
              ? 'mapping-unresolved-show'
              : relationship.state === 'conflicted'
                ? 'mapping-terminology-conflict'
                : relationship.experienceObjectId === null
                  ? 'mapping-unassigned-entities'
                  : `mapping-${relationship.experienceObjectId}`}
            className={relationshipClassNames[relationship.state]}
          >
            <div>
              <span>{relationshipLabels[relationship.state]}</span>
              <small>{relationship.confidence}</small>
            </div>
            <h3>{relationship.experienceObjectId ? experienceLabels[relationship.experienceObjectId] ?? relationship.experienceObjectId : 'كيانات تحتاج قرارًا مستقلًا'}</h3>
            {relationship.experienceObjectId ? <bdi dir="ltr">{relationship.experienceObjectId}</bdi> : null}
            <ul>
              {relationship.candidateEntityIds.length ? relationship.candidateEntityIds.map((candidateId) => {
                const entity = entityById.get(candidateId)!;
                return <li key={candidateId}><button type="button" onClick={() => onSelectCandidate(candidateId)}><span>{entity.sourceNumber}</span>{entity.labelAr}</button></li>;
              }) : <li className="is-empty"><CircleDashed aria-hidden="true" />لا يوجد تطابق مرشح — لم نخمن</li>}
            </ul>
            {relationship.conflictCodes.map((code) => <p key={code} className="candidate-mapping-conflict"><AlertOctagon aria-hidden="true" />{code}</p>)}
            <footer>{relationship.requiredApproval}</footer>
          </article>
        ))}
      </div>
    </section>
  );
}

function SourceAuthorityMatrix({ spatialPackage }: { spatialPackage: CandidateSpatialIntakePackage }) {
  return (
    <section id="source-authority" data-testid="source-authority-matrix" className="candidate-authority-matrix">
      <header><div><p className="candidate-kicker">SOURCE AUTHORITY MATRIX</p><h2>ما الذي يقوده كل مصدر وما الذي لا يقوده</h2></div><span>Drive ليس مستودع تدقيق قانونيًا</span></header>
      <div role="table" aria-label="مصفوفة سلطة المصادر">
        <div role="row" className="candidate-authority-head"><span role="columnheader">المصدر</span><span role="columnheader">السلطة</span><span role="columnheader">قد يقود</span><span role="columnheader">لا يقود</span></div>
        {spatialPackage.sourceAssets.map((asset) => {
          const rules = sourceDriveRules[asset.sourceRole];
          return (
            <article role="row" key={asset.sourceAssetId}>
              <span role="cell"><strong>{asset.sourceName}</strong><bdi dir="ltr">{asset.sourceAssetId}</bdi></span>
              <span role="cell">{authorityLabels[asset.authorityStatus]}</span>
              <span role="cell">{rules.mayDriveAr}</span>
              <span role="cell">{rules.mayNotDriveAr}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function CandidateSpatialIntakeWorkspace({
  spatialPackage,
  projectNameAr,
  experienceLabels,
  onNavigate,
  onExportReview
}: CandidateSpatialIntakeWorkspaceProps) {
  const [sourceLayerId, setSourceLayerId] = useState(() => getInitialLayerId(spatialPackage));
  const [selectedCandidateId, setSelectedCandidateId] = useState(() => getInitialCandidateId(spatialPackage));
  const selectedLayer = spatialPackage.sourceLayers.find((layer) => layer.sourceLayerId === sourceLayerId) ?? spatialPackage.sourceLayers[0]!;
  const selectedCandidate = spatialPackage.candidateEntities.find((entity) => entity.candidateId === selectedCandidateId) ?? spatialPackage.candidateEntities[0]!;
  const selectedCandidateSource = spatialPackage.sourceAssets.find((asset) => asset.sourceAssetId === selectedCandidate.sourceAssetId)!;
  const riskOpen = spatialPackage.blockedGateIds.includes('DRIVE-PERMISSION-ANONYMOUS-WRITER');
  const zoningLayerId = spatialPackage.sourceLayers.find((layer) => layer.truthStatus === 'candidate')!.sourceLayerId;

  useEffect(() => {
    const syncFromUrl = () => {
      setSourceLayerId(getInitialLayerId(spatialPackage));
      setSelectedCandidateId(getInitialCandidateId(spatialPackage));
    };
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [spatialPackage]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.get('sourceLayer') || !url.searchParams.get('candidateEntity')) {
      updateReviewUrl(sourceLayerId, selectedCandidateId, true);
    }
  }, [selectedCandidateId, sourceLayerId]);

  const selectLayer = (layerId: string) => {
    setSourceLayerId(layerId);
    updateReviewUrl(layerId, selectedCandidateId);
  };
  const selectCandidate = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setSourceLayerId(zoningLayerId);
    updateReviewUrl(zoningLayerId, candidateId);
  };
  const sourceSummary = spatialPackage.sourceReadiness;
  const geometryControls = useMemo(() => [
    ['المقياس', 'غير معروف', Scale],
    ['CRS', 'غير معروف', MapPinned],
    ['اعتماد الرسم', 'مفقود', ShieldAlert],
    ['المعايرة', 'غير مكتملة', Route]
  ] as const, []);

  return (
    <section data-testid="candidate-spatial-intake" className="candidate-intake">
      <header className="candidate-intake-heading">
        <div>
          <p className="candidate-kicker">Stage 3E.4A · Verified Source Intake</p>
          <h1>المصدر أولًا، ثم التفسير المرشح</h1>
          <p><strong>{projectNameAr}</strong> · {spatialPackage.eventId} · {spatialPackage.venueId}</p>
        </div>
        <div className="candidate-heading-actions">
          <button type="button" onClick={() => onNavigate('spatial')}><ArrowLeft aria-hidden="true" />مساحة المكان</button>
          <button data-testid="candidate-export-review" type="button" className="is-primary" onClick={onExportReview}><FileCheck2 aria-hidden="true" />تصدير سجل المراجعة</button>
        </div>
      </header>

      {riskOpen ? (
        <aside data-testid="drive-permission-risk" className="candidate-critical-risk">
          <ShieldAlert aria-hidden="true" />
          <div>
            <p className="candidate-kicker">CRITICAL SOURCE-INTEGRITY RISK</p>
            <strong><bdi dir="ltr">DRIVE-PERMISSION-ANONYMOUS-WRITER</bdi></strong>
            <p>أي شخص يملك الرابط يستطيع الكتابة. التوفر ووقت التعديل واسم الملف لا يثبتون السلطة؛ الخطر ما زال مفتوحًا.</p>
          </div>
          <span>غير محلول</span>
        </aside>
      ) : null}

      <section data-testid="source-readiness-summary" className="candidate-readiness-strip">
        <article><small>المشروع النشط</small><strong>{projectNameAr}</strong><span>مرشح حقيقي معزول</span></article>
        <article><small>CAD العامل</small><strong>Duplicate confirmed</strong><span>لا revision جديدة</span></article>
        <article><small>التقسيم المرشح</small><strong>{sourceSummary.candidateOperationalEntityCount} وجهة</strong><span>preview-ready محليًا</span></article>
        <article><small>العلاقات</small><strong>{sourceSummary.mappingConflictCount} تعارض</strong><span>{sourceSummary.unresolvedMappingCount} غير محسومة</span></article>
        <article><small>التفعيل المكاني</small><strong>محجوب</strong><span>scale · CRS · approval</span></article>
      </section>

      <nav data-testid="source-layer-switcher" className="candidate-source-tabs" aria-label="طبقات المصادر">
        {spatialPackage.sourceLayers.map((layer) => (
          <button
            key={layer.sourceLayerId}
            data-testid={`source-layer-${layer.sourceLayerId}`}
            type="button"
            className={sourceLayerId === layer.sourceLayerId ? 'is-active' : undefined}
            aria-pressed={sourceLayerId === layer.sourceLayerId}
            onClick={() => selectLayer(layer.sourceLayerId)}
          >
            <span className={`candidate-source-dot is-${layer.truthStatus}`} aria-hidden="true" />
            <strong>{layer.labelAr}</strong>
            <small>{truthLabels[layer.truthStatus]}</small>
          </button>
        ))}
      </nav>

      <section className="candidate-primary-grid">
        <div data-testid="candidate-active-source" data-source-layer-id={selectedLayer.sourceLayerId} className="candidate-active-layer">
          <LayerContent
            spatialPackage={spatialPackage}
            layer={selectedLayer}
            selectedCandidateId={selectedCandidate.candidateId}
            onSelectCandidate={selectCandidate}
          />
        </div>
        <CandidateInspector spatialPackage={spatialPackage} source={selectedCandidateSource} selected={selectedCandidate} experienceLabels={experienceLabels} />
      </section>

      <section data-testid="missing-geometry-controls" className="candidate-geometry-controls">
        {geometryControls.map(([label, value, Icon]) => (
          <article key={label}><Icon aria-hidden="true" /><div><small>{label}</small><strong>{value}</strong></div><CircleDashed aria-hidden="true" /></article>
        ))}
        <p><FileWarning aria-hidden="true" />وجود مؤشر شمال لا يثبت المقياس أو CRS أو survey control.</p>
      </section>

      <MappingRegister spatialPackage={spatialPackage} experienceLabels={experienceLabels} onSelectCandidate={selectCandidate} />
      <SourceAuthorityMatrix spatialPackage={spatialPackage} />
    </section>
  );
}
