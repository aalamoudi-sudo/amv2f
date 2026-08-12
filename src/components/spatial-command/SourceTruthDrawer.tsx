import { AlertOctagon, ArrowLeft, Boxes, Database, ExternalLink, FileCheck2, Fingerprint, LockKeyhole, Ruler, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { SourceAssetManifest } from '../../types/sourceIntake';
import type { SpatialCommandExperienceConfiguration, SpatialTechnicalRoute } from '../../types/spatialCommand';

export function SourceTruthDrawer({
  open,
  configuration,
  returnFocusElement,
  onClose,
  onOpenTechnicalRoute,
  onOpenDesignScene
}: {
  open: boolean;
  configuration: SpatialCommandExperienceConfiguration;
  returnFocusElement: HTMLElement | null;
  onClose: () => void;
  onOpenTechnicalRoute: (route: SpatialTechnicalRoute) => void;
  onOpenDesignScene?: (sceneAssetId: string) => void;
}) {
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const drawer = drawerRef.current;
    const workspace = drawer?.closest('.sc-workspace');
    const backgroundElements = Array.from(workspace?.children ?? [])
      .filter((element) => !element.classList.contains('sc-drawer-layer')) as HTMLElement[];
    backgroundElements.forEach((element) => {
      element.inert = true;
    });
    const focusable = drawer?.querySelectorAll<HTMLElement>('button, a[href], summary, [tabindex]:not([tabindex="-1"])');
    focusable?.[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !focusable?.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      backgroundElements.forEach((element) => {
        element.inert = false;
      });
      window.requestAnimationFrame(() => {
        if (returnFocusElement?.isConnected) {
          returnFocusElement.focus();
          return;
        }
        document.querySelector<HTMLElement>('[data-testid="source-truth-drawer-open"]')?.focus();
      });
    };
  }, [onClose, open, returnFocusElement]);

  if (!open) return null;
  return (
    <div className="sc-drawer-layer">
      <button type="button" className="sc-drawer-backdrop" aria-label="إغلاق تفاصيل المصدر" onClick={onClose} />
      <aside
        ref={drawerRef}
        data-testid="source-truth-drawer"
        className="sc-truth-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-truth-title"
      >
        <header>
          <span><Database aria-hidden="true" /></span>
          <div><small>العرض التقني</small><h2 id="source-truth-title">تفاصيل المصدر والاعتماد</h2></div>
          <button data-testid="source-truth-drawer-close" type="button" aria-label="إغلاق تفاصيل المصدر" onClick={onClose}><X aria-hidden="true" /></button>
        </header>
        {configuration.sourceTruth.risks.map((risk) => (
          <div key={risk.riskId} className="sc-drawer-risk" data-risk-severity={risk.severity}>
            <AlertOctagon aria-hidden="true" />
            <div>
              <strong>{risk.labelAr}</strong>
              <bdi dir="ltr">{risk.riskId}</bdi>
              <p>{risk.summaryAr}</p>
            </div>
          </div>
        ))}
        <section data-testid="founder-spatial-truth-register" className="sc-frozen-truth-register">
          <h3><LockKeyhole aria-hidden="true" />حقيقة المؤسس المجمدة</h3>
          <dl>
            <div><dt>Pack ID</dt><dd><bdi dir="ltr">{configuration.spatialTruthPack.packId}</bdi></dd></div>
            <div><dt>Revision</dt><dd><bdi dir="ltr">{configuration.spatialTruthPack.revision}</bdi></dd></div>
            <div><dt>Effective date</dt><dd><bdi dir="ltr">{configuration.spatialTruthPack.effectiveDate}</bdi></dd></div>
            <div><dt>Approved by</dt><dd><bdi dir="ltr">{configuration.spatialTruthPack.approvedBy}</bdi></dd></div>
            <div><dt>Content SHA-256</dt><dd><bdi dir="ltr">{configuration.spatialTruthPack.contentHash}</bdi></dd></div>
          </dl>
          <p>الاعتماد دلالي ومنتجي فقط؛ لا يرفع المكان إلى هندسة معتمدة ولا ينشئ جاهزية تشغيلية.</p>
        </section>
        <section className="sc-technical-controls">
          <h3><Ruler aria-hidden="true" />ضوابط الهندسة</h3>
          <div>
            <span><small>Scale</small><strong>{configuration.truthContext.scaleStatus}</strong></span>
            <span><small>CRS</small><strong>{configuration.truthContext.crsStatus}</strong></span>
            <span><small>Approval</small><strong>{configuration.truthContext.drawingApprovalStatus}</strong></span>
            <span><small>Calibration</small><strong>{configuration.truthContext.calibrationStatus}</strong></span>
          </div>
          <p>
            Operational baseline: <bdi dir="ltr">{configuration.truthContext.operationalBaselineStatus}</bdi>
            {' · '}Geometry authority: <bdi dir="ltr">{configuration.truthContext.geometryAuthority}</bdi>
            {' · '}Live data: <bdi dir="ltr">{configuration.truthContext.liveDataStatus}</bdi>
          </p>
        </section>
        <section className="sc-source-register">
          <h3><FileCheck2 aria-hidden="true" />مصفوفة سلطة المصدر</h3>
          {configuration.sourceTruth.sources.map((source) => <TechnicalSourceRecord key={source.sourceAssetId} source={source} />)}
        </section>
        <section className="sc-technical-mappings">
          <h3>حالات الربط الخام</h3>
          {configuration.entityRelationships.map((relationship) => (
            <details key={relationship.relationshipId}>
              <summary>
                <bdi dir="ltr">{relationship.relationshipId}</bdi>
                <span>{relationship.state}</span>
              </summary>
              <p>Experience object: <bdi dir="ltr">{relationship.experienceObjectId ?? 'null'}</bdi></p>
              <p>Candidate entities: <bdi dir="ltr">{relationship.candidateEntityIds.join(', ') || 'none'}</bdi></p>
              <p>Conflict codes: <bdi dir="ltr">{relationship.conflictCodes.join(', ') || 'none'}</bdi></p>
              <p>{relationship.requiredApproval}</p>
            </details>
          ))}
        </section>
        <section className="sc-technical-navigation">
          <h3>مساحة CAD والمواءمة</h3>
          <p>تحليل XREF والتحويل والمواءمة التفصيلية متاح في مساحة المصدر التقنية ولا يظهر أسفل الخريطة افتراضيًا.</p>
          {configuration.technicalRoutes.map((route) => (
            <button
              key={route.technicalRouteId}
              data-testid="open-technical-spatial-authoring"
              type="button"
              onClick={() => onOpenTechnicalRoute(route)}
            >
              <ExternalLink aria-hidden="true" />
              {route.labelAr}
              <ArrowLeft aria-hidden="true" />
            </button>
          ))}
        </section>
        {configuration.designSceneLinks?.length ? <section className="sc-technical-navigation" data-testid="spatial-design-scene-links">
          <h3><Boxes aria-hidden="true" />مشاهد التصميم المرتبطة</h3>
          <p>العلاقة دلالية مرشحة فقط ولا تثبت الموقع أو الهندسة أو مسار الزائر.</p>
          {configuration.designSceneLinks.map((link) => <button key={link.designSceneLinkId} data-testid="spatial-open-design-web3d" type="button" disabled={!onOpenDesignScene} onClick={() => onOpenDesignScene?.(link.sceneAssetId)}><Boxes aria-hidden="true" /><span>{link.labelAr}<small>{link.authorityStatusAr}</small></span><ArrowLeft aria-hidden="true" /></button>)}
        </section> : null}
        <footer>
          <LockKeyhole aria-hidden="true" />
          الملفات الأصلية والوسائط الخاصة وGPS الدقيق غير مضمنة في واجهة المتصفح أو حزمة Git.
        </footer>
      </aside>
    </div>
  );
}

function TechnicalSourceRecord({ source }: { source: SourceAssetManifest }) {
  const size = source.observedByteSize === null ? 'not-recorded' : new Intl.NumberFormat('en-US').format(source.observedByteSize);
  return (
    <details>
      <summary>
        <span className={`is-${source.authorityStatus}`}>{source.sourceRole}</span>
        <strong>{source.sourceName}</strong>
      </summary>
      <dl>
        <div><dt>Source asset ID</dt><dd><bdi dir="ltr">{source.sourceAssetId}</bdi></dd></div>
        <div><dt>External file ID</dt><dd><bdi dir="ltr">{source.externalFileId ?? 'null'}</bdi></dd></div>
        <div><dt>Authority status</dt><dd><bdi dir="ltr">{source.authorityStatus}</bdi></dd></div>
        <div><dt>Ingestion status</dt><dd><bdi dir="ltr">{source.ingestionStatus}</bdi></dd></div>
        <div><dt>Observed bytes</dt><dd><bdi dir="ltr">{size}</bdi></dd></div>
        <div><dt><Fingerprint aria-hidden="true" />Expected SHA-256</dt><dd><bdi dir="ltr">{source.expectedSha256 ?? 'not-recorded'}</bdi></dd></div>
        <div><dt><Fingerprint aria-hidden="true" />Observed SHA-256</dt><dd><bdi dir="ltr">{source.observedSha256 ?? 'not-recorded'}</bdi></dd></div>
        <div><dt>Duplicate of</dt><dd><bdi dir="ltr">{source.duplicateOfSourceAssetId ?? 'null'}</bdi></dd></div>
      </dl>
    </details>
  );
}
