import {
  AlertTriangle,
  ArrowLeft,
  Box,
  CheckCircle2,
  CircleDashed,
  Download,
  FileClock,
  FileCog,
  FileWarning,
  GitBranch,
  Layers3,
  LockKeyhole,
  Map,
  MapPinned,
  RefreshCcw,
  Route,
  Ruler,
  ScanLine,
  ShieldCheck,
  Waypoints
} from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { kapCandidateSpatialIntake } from '../../data/kapCandidateSpatialIntake';
import { kapExperienceIntelligencePack } from '../../data/experienceIntelligencePacks';
import { kapWorkingCadIntake, kapStableZoneIds } from '../../data/kapWorkingCadIntake';
import { kapCandidateEventTheme } from '../../data/eventThemePackages';
import { kapProjectId } from '../../data/projectRegistry';
import type { CommandWorkspace } from '../../ux/commandExperience';
import { CandidateSpatialIntakeWorkspace } from './CandidateSpatialIntakeWorkspace';
import './kapSpatialAuthoring.css';

interface KapSpatialAuthoringWorkspaceProps {
  projectId: string;
  eventId: string;
  venueId: string;
  onNavigate: (workspace: CommandWorkspace) => void;
}

const zoneLabels: Record<(typeof kapStableZoneIds)[number], string> = {
  'ZONE-ARRIVAL-001': 'منطقة الوصول والاستقبال',
  'ZONE-AGES-TUNNEL-001': 'نفق العصور والأزمنة',
  'ZONE-SHOW-001': 'منطقة العرض',
  'ZONE-PHOTO-MEDIA-001': 'منطقة التصوير والإعلام',
  'ZONE-DINNER-VIP-001': 'منطقة العشاء وكبار الشخصيات'
};

const findingLabels: Record<string, string> = {
  detected: 'مكتشف',
  declared: 'مصرّح',
  inferred: 'مستنتج',
  unknown: 'غير معروف',
  'historical-unverified': 'تاريخي غير متحقق'
};

const permittedUseLabels: Record<string, string> = {
  'platform-spatial-development': 'التطوير المكاني للمنصة',
  '2d-visualization': 'التصور ثنائي الأبعاد',
  'candidate-zone-mapping': 'مواءمة مناطق مرشحة',
  'candidate-spatial-relationships': 'علاقات مكانية مرشحة',
  'flat-spatial-preview': 'معاينة مكانية مسطحة',
  'experience-map-development': 'تطوير Experience Map',
  'executive-command-map-development': 'تطوير Executive Command Map',
  'projection-mapping-preparation': 'التحضير للإسقاط',
  'technical-spatial-testing': 'اختبار مكاني تقني'
};

function formatFindingValue(value: string | number | string[] | Record<string, number> | null): string {
  if (value === null) return 'غير معروف';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

function themeStyle(): CSSProperties {
  return {
    '--cad-kap-primary': kapCandidateEventTheme.eventTokens.primary.background,
    '--cad-kap-primary-ink': kapCandidateEventTheme.eventTokens.primary.foreground,
    '--cad-kap-accent': kapCandidateEventTheme.eventTokens.accent.background,
    '--cad-kap-soft': kapCandidateEventTheme.eventTokens.soft.background,
    '--cad-kap-page': kapCandidateEventTheme.eventTokens.page.background,
    '--cad-kap-ink': kapCandidateEventTheme.eventTokens.page.foreground
  } as CSSProperties;
}

function downloadReviewReport() {
  const report = {
    generatedFor: {
      projectId: kapWorkingCadIntake.source.projectId,
      eventId: kapWorkingCadIntake.source.eventId,
      venueId: kapWorkingCadIntake.source.venueId
    },
    source: kapWorkingCadIntake.source,
    locations: kapWorkingCadIntake.locations.map(({ locationId, sourceId, sourceHash, displayName, availability, observedAt }) => ({ locationId, sourceId, sourceHash, displayName, availability, observedAt })),
    authorityAssertions: kapWorkingCadIntake.authorityAssertions,
    effectiveAuthority: kapWorkingCadIntake.effectiveAuthority,
    inspection: kapWorkingCadIntake.inspection,
    conversion: kapWorkingCadIntake.conversion,
    transform: kapWorkingCadIntake.transform,
    mappings: kapWorkingCadIntake.mappings,
    derivedArtifacts: kapWorkingCadIntake.derivedArtifacts,
    projection: kapWorkingCadIntake.projection,
    freezeGates: kapWorkingCadIntake.freezeGates,
    candidateSpatialIntake: kapCandidateSpatialIntake
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'kap-cad-spatial-mapping-review.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

function AuthoritySummary() {
  return <section data-testid="cad-source-authority" className="cad-authority-card">
    <div className="cad-authority-mark"><ShieldCheck aria-hidden="true" /></div>
    <div>
      <p className="cad-overline">Current permitted-use authority</p>
      <h2>مصدر CAD معتمد ومتحقق البصمة</h2>
      <div className="cad-badge-row">
        <span className="cad-badge cad-badge-working">founder-approved-cad-source</span>
        <span className="cad-badge cad-badge-candidate">مشروع مرشح</span>
        <span className="cad-badge cad-badge-blocked">operational baseline: none</span>
      </div>
      <p>المحتوى نفسه لم يتغير ولم تُنشأ مراجعة CAD جديدة. اعتماد المصدر لا يثبت المقياس أو CRS أو التسجيل الهندسي، ولا ينشئ operational baseline.</p>
    </div>
    <dl>
      <div><dt>الإقرار</dt><dd><bdi dir="ltr">AUTH-KAP-DWG-FOUNDER-APPROVED-20260729</bdi></dd></div>
      <div><dt>السجل السابق</dt><dd><bdi dir="ltr">AUTH-KAP-DWG-WORKING-20260721</bdi></dd></div>
      <div><dt>السلطة</dt><dd>Ahmed · <bdi dir="ltr">local-byte-verified</bdi></dd></div>
      <div><dt>السريان</dt><dd>2026-07-29 حتى يحل محله إصدار معتمد لاحق</dd></div>
    </dl>
  </section>;
}

function SpatialAuthorityStrip() {
  const transform = kapWorkingCadIntake.transform;
  const items = [
    ['الوحدة', transform.sourceUnits, Ruler],
    ['الأصل', transform.originStatus, MapPinned],
    ['الشمال', transform.northStatus, Waypoints],
    ['CRS / EPSG', transform.crsStatus, ScanLine]
  ] as const;
  return <section data-testid="cad-spatial-authority-status" className="cad-spatial-authority-strip" aria-label="حالة المرجع المكاني">
    {items.map(([label, value, Icon]) => <article key={label}><Icon aria-hidden="true" /><div><small>{label}</small><strong>{value === 'unknown' ? 'غير معروف' : value}</strong></div><CircleDashed aria-hidden="true" /></article>)}
  </section>;
}

function ConversionCanvas() {
  return <section data-testid="cad-vector-preview" className="cad-canvas-shell">
    <header>
      <div><span className="cad-live-dot" /><strong>2D Vector Review</strong><small>لا توجد هندسة مشتقة</small></div>
      <div className="cad-canvas-tools"><button type="button" disabled><Layers3 aria-hidden="true" />الطبقات</button><button type="button" disabled><ScanLine aria-hidden="true" />تحديد هندسة</button></div>
    </header>
    <div className="cad-canvas">
      <span className="cad-canvas-ring" aria-hidden="true" />
      <FileCog aria-hidden="true" />
      <p className="cad-overline">LOCAL CONVERSION REQUIRED</p>
      <h2>المصدر موثّق، لكن الرسم لم يُحوّل</h2>
      <p>لا توجد أداة DWG محلية مثبتة بإصدار قابل للتتبع. لم نعرض طبقات أو خطوطًا أو حدودًا مختلقة.</p>
      <div data-testid="conversion-required-state" className="cad-input-options">
        <span>DXF export</span><span>DWG + XREF package</span><span>Approved PDF floor plan</span>
      </div>
    </div>
    <footer><span>إحداثيات المصدر محفوظة بلا recenter أو rotation</span><span>لا main-thread parsing</span><span>لا cloud upload</span></footer>
  </section>;
}

function LayerAndGeometryPanel() {
  return <aside className="cad-side-stack">
    <section data-testid="cad-layer-browser" className="cad-panel">
      <header><div><p className="cad-overline">Layer browser</p><h2>طبقات المخطط</h2></div><Layers3 aria-hidden="true" /></header>
      <div className="cad-empty-compact"><FileWarning aria-hidden="true" /><strong>الطبقات غير مقروءة</strong><p>أسماء الطبقات وحالاتها وXREF تبقى مجهولة حتى التحويل المحلي.</p></div>
    </section>
    <section data-testid="cad-selected-geometry" className="cad-panel">
      <header><div><p className="cad-overline">Selection</p><h2>تفاصيل الهندسة المحددة</h2></div><Map aria-hidden="true" /></header>
      <dl className="cad-technical-list"><div><dt>GeometryReference</dt><dd>غير محدد</dd></div><div><dt>النوع</dt><dd>غير معروف</dd></div><div><dt>الطبقة</dt><dd>غير معروفة</dd></div><div><dt>التعارض</dt><dd>لا يمكن الفحص قبل التحديد</dd></div></dl>
    </section>
  </aside>;
}

function MappingPanel() {
  const [selectedZoneId, setSelectedZoneId] = useState<string>(kapStableZoneIds[0]);
  return <section data-testid="cad-zone-mapping-panel" className="cad-mapping-section">
    <header className="cad-section-heading"><div><p className="cad-overline">Stable entity mapping</p><h2>مواءمة المناطق الخمس</h2><p>تبقى IDs كما هي، ولا ينشئ اسم طبقة أي اعتماد تلقائي.</p></div><span>0 / 5 مربوطة</span></header>
    <div className="cad-mapping-grid">
      <ol className="cad-zone-list">
        {kapWorkingCadIntake.mappings.map((mapping, index) => <li key={mapping.entityId} className={selectedZoneId === mapping.entityId ? 'is-selected' : undefined}>
          <button type="button" onClick={() => setSelectedZoneId(mapping.entityId)}>
            <span>{String(index + 1).padStart(2, '0')}</span><div><strong>{zoneLabels[mapping.entityId as (typeof kapStableZoneIds)[number]]}</strong><bdi dir="ltr">{mapping.entityId}</bdi></div><em>unmapped</em>
          </button>
        </li>)}
      </ol>
      <div className="cad-mapping-editor">
        <div className="cad-mapping-editor-title"><GitBranch aria-hidden="true" /><div><small>المنطقة الحالية</small><strong>{zoneLabels[selectedZoneId as (typeof kapStableZoneIds)[number]]}</strong><bdi dir="ltr">{selectedZoneId}</bdi></div></div>
        <label><span>الهندسة المختارة</span><input value="لا توجد هندسة محوّلة" readOnly /></label>
        <label><span>سبب المواءمة</span><textarea disabled placeholder="يتاح بعد اختيار هندسة فعلية" /></label>
        <div className="cad-editor-actions"><button type="button" disabled>حفظ candidate</button><button type="button" disabled><RefreshCcw aria-hidden="true" />إعادة الضبط</button></div>
        <p className="cad-conflict-note"><LockKeyhole aria-hidden="true" />سيُرفض إسناد GeometryReference نفسه إلى منطقتين قبل الحفظ.</p>
      </div>
    </div>
  </section>;
}

function InspectionAndHistory() {
  const findings = kapWorkingCadIntake.inspection.findings;
  const detected = findings.filter((entry) => entry.basis === 'detected');
  const unknown = findings.filter((entry) => entry.basis === 'unknown');
  return <section data-testid="cad-inspection-summary" className="cad-review-grid">
    <article className="cad-panel cad-inspection-panel">
      <header><div><p className="cad-overline">Reproducible inspection</p><h2>فحص CAD الحالي</h2></div><FileCog aria-hidden="true" /></header>
      <div className="cad-finding-grid">{detected.map((entry) => <div key={entry.findingId}><small>{entry.labelAr}</small><strong className={entry.findingId === 'CAD-FINDING-HASH' ? 'cad-hash-value' : undefined}>{formatFindingValue(entry.value)}</strong><span>{entry.tool} · {entry.toolVersion} · {findingLabels[entry.basis]} · {entry.confidence}</span></div>)}</div>
      <details><summary>{unknown.length} حقلاً بقي غير معروف</summary><div className="cad-unknown-list">{unknown.map((entry) => <span key={entry.findingId}>{entry.labelAr}</span>)}</div></details>
    </article>
    <article data-testid="cad-xref-status" className="cad-panel cad-history-panel">
      <header><div><p className="cad-overline">XREF & lineage</p><h2>التبعيات والسجل السابق</h2></div><FileClock aria-hidden="true" /></header>
      <div className="cad-warning-row"><AlertTriangle aria-hidden="true" /><div><strong>XREF غير قابل للفحص</strong><p>لا تُجلب أي مراجع خارجية تلقائيًا.</p></div></div>
      <div className="cad-timeline"><article><span /><small>13 يوليو 2026</small><strong>تسجيل الالتقاط التاريخي</strong><p>سُجل المحتوى والبصمة، وبقيت أداة الفحص التاريخية غير موثقة.</p></article><article><span /><small>29 يوليو 2026</small><strong>اعتماد مصدر CAD</strong><p>رُقيت سلطة الهوية نفسها بعد تحقق البايتات. لم تُنشأ مراجعة محتوى أو هندسة جديدة.</p></article></div>
    </article>
  </section>;
}

function SafePreviewAndGates() {
  const satisfied = kapWorkingCadIntake.freezeGates.filter((gate) => gate.status !== 'blocked');
  const blocked = kapWorkingCadIntake.freezeGates.filter((gate) => gate.status === 'blocked');
  return <section className="cad-output-grid">
    <article data-testid="cad-flat-preview" className="cad-flat-preview">
      <div className="cad-flat-stage"><Box aria-hidden="true" /><span /><span /><span /></div>
      <div><p className="cad-overline">Safe 3D / 2.5D boundary</p><h2>لا توجد معاينة مسطحة بعد</h2><p>لن تُبنى footprint extrusion أو ارتفاعات افتراضية. عند توفر خطوط صالحة بلا Z سيُسمى الناتج <bdi dir="ltr">flat spatial preview</bdi>.</p></div>
    </article>
    <article data-testid="cad-freeze-gates" className="cad-gates-panel">
      <header><div><p className="cad-overline">Freeze gates</p><h2>ما تغيّر وما بقي محجوبًا</h2></div><strong>{satisfied.length} مسموح للعمل · {blocked.length} محجوب</strong></header>
      <div className="cad-gate-list">{kapWorkingCadIntake.freezeGates.map((gate) => <article key={gate.gateId} className={gate.status === 'blocked' ? 'is-blocked' : 'is-working'}>{gate.status === 'blocked' ? <CircleDashed aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}<div><strong>{gate.titleAr}</strong><p>{gate.reasonAr}</p></div></article>)}</div>
    </article>
  </section>;
}

export function KapSpatialAuthoringWorkspace({ projectId, eventId, venueId, onNavigate }: KapSpatialAuthoringWorkspaceProps) {
  const validScope = projectId === kapProjectId && eventId === kapWorkingCadIntake.source.eventId && venueId === kapWorkingCadIntake.source.venueId;
  if (!validScope) return <section data-testid="cad-project-isolation-error" className="cad-isolation-error" lang="ar" dir="rtl"><LockKeyhole aria-hidden="true" /><h1>حُجب مصدر KAP</h1><p>لا ينتمي مصدر CAD إلى سياق المشروع والفعالية والموقع النشطين.</p></section>;

  return <div data-testid="kap-spatial-authoring-workspace" data-source-hash={kapWorkingCadIntake.source.contentHash} data-conversion-status={kapWorkingCadIntake.conversion.status} className="cad-authoring-workspace" style={themeStyle()} lang="ar" dir="rtl">
    <main>
    <CandidateSpatialIntakeWorkspace
      spatialPackage={kapCandidateSpatialIntake}
      projectNameAr="افتتاح وتدشين حدائق الملك عبدالله"
      experienceLabels={Object.fromEntries(kapExperienceIntelligencePack.experiencePoints.map((point) => [point.relatedEntityId, point.nameAr]))}
      onNavigate={onNavigate}
      onExportReview={downloadReviewReport}
    />

    <header className="cad-page-heading">
      <div><p className="cad-overline">Stage 3E.4 · KAP Spatial Intake</p><h1>مواءمة المخطط المكاني</h1><p>مراجعة مصدر العمل وربطه المرشح بالمناطق الثابتة، بلا هندسة أو مسارات أو إحداثيات مخمّنة.</p></div>
      <div className="cad-heading-actions"><button type="button" onClick={() => onNavigate('spatial')}><ArrowLeft aria-hidden="true" />مساحة المكان</button><button data-testid="cad-export-review" type="button" className="is-primary" onClick={downloadReviewReport}><Download aria-hidden="true" />تصدير تقرير المراجعة</button></div>
    </header>

      <AuthoritySummary />
      <section data-testid="cad-source-identity" className="cad-source-identity">
        <div><FileCog aria-hidden="true" /><span><small>هوية المحتوى</small><strong>{kapWorkingCadIntake.source.fileName}</strong></span></div>
        <dl><div><dt>Source ID</dt><dd><bdi dir="ltr">{kapWorkingCadIntake.source.sourceId}</bdi></dd></div><div><dt>SHA-256</dt><dd><bdi dir="ltr">{kapWorkingCadIntake.source.contentHash}</bdi></dd></div><div><dt>الحجم</dt><dd>99,452,545 bytes · 95 MB</dd></div><div><dt>التنسيق</dt><dd><bdi dir="ltr">AC1032 · DWG 2018/2019/2020</bdi></dd></div></dl>
      </section>
      <SpatialAuthorityStrip />

      <section className="cad-canvas-layout"><ConversionCanvas /><LayerAndGeometryPanel /></section>
      <MappingPanel />
      <InspectionAndHistory />
      <SafePreviewAndGates />

      <section data-testid="cad-permitted-use" className="cad-permitted-use" tabIndex={0}>
        <div><ShieldCheck aria-hidden="true" /><div><p className="cad-overline">Permitted now</p><h2>استخدامات العمل المنصي</h2></div></div>
        <div>{kapWorkingCadIntake.effectiveAuthority.permittedUses.map((use) => <span key={use}>{permittedUseLabels[use] ?? use}</span>)}</div>
        <p><Route aria-hidden="true" />لا مسارات زوار أو إخلاء أو طوارئ أو مركبات أو VIP. CAD linework وحده لا يمنح route authority.</p>
      </section>

      <footer className="cad-page-footer"><div><strong>لا derived artifacts</strong><span>لا mappingRevision</span><span>لا spatialProjectionVersion</span><span>لا transformVersion تشغيلي</span></div><nav><button type="button" onClick={() => onNavigate('executive')}>Executive Command</button><button type="button" onClick={() => onNavigate('experience')}>Experience Map</button><button type="button" onClick={() => onNavigate('spatial')}>2D / 3D</button></nav></footer>
    </main>
  </div>;
}
