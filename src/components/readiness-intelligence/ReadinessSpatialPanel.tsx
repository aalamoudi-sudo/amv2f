import { Focus, Minus, Plus, RotateCcw, ScanSearch } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { findSpatialCommandExperience } from '../../data/spatialCommandExperiences';
import { resolveSpatialMapAdapter } from '../../services/spatialMap';
import type { ReadinessBlocker } from '../../types/readinessIntelligence';
import type { SpatialExecutiveBlocker } from '../../types/spatialCommand';
import {
  SpatialCommandCanvas,
  type SpatialCommandCanvasHandle
} from '../spatial-command/SpatialCommandCanvas';
import '../spatial-command/spatialCommand.css';
import './readinessCommand.css';

export function ReadinessSpatialPanel({
  configurationId,
  projectId,
  eventId,
  venueId,
  blocker,
  selectedEntityId,
  onSelectEntity
}: {
  configurationId: string | null;
  projectId: string;
  eventId: string;
  venueId: string;
  blocker: ReadinessBlocker | null;
  selectedEntityId: string | null;
  onSelectEntity: (entityId: string | null) => void;
}) {
  const canvasRef = useRef<SpatialCommandCanvasHandle>(null);
  const configuration = findSpatialCommandExperience(configurationId ?? undefined, {
    projectId,
    eventId,
    venueId
  });
  const mapAdapter = configuration
    ? resolveSpatialMapAdapter(configuration.visualConfiguration.mapAdapterId)
    : null;
  const activeLayer = configuration?.sourceLayers.find((layer) => layer.truthStatus === 'candidate') ?? null;
  const visibleLayerIds = useMemo(() => new Set(
    configuration?.displayLayers
      .filter((layer) => [
        'candidate-zoning',
        'candidate-entity-markers',
        'executive-blockers',
        'independent-landmarks',
        'unresolved-items'
      ].includes(layer.type))
      .map((layer) => layer.layerId) ?? []
  ), [configuration]);
  const opacity = useMemo(() => Object.fromEntries(
    configuration?.displayLayers.map((layer) => [layer.layerId, layer.opacity]) ?? []
  ), [configuration]);
  const spatialBlocker: SpatialExecutiveBlocker | null = blocker ? {
    blockerId: blocker.blockerId,
    labelAr: blocker.titleAr,
    category: 'mapping',
    affectedCandidateEntityIds: blocker.relatedEntityIds.filter((entityId) => entityId.startsWith('ENTITY-')),
    affectedExperienceObjectIds: blocker.relatedEntityIds.filter((entityId) => entityId.startsWith('ZONE-')),
    whyItMattersAr: blocker.descriptionAr,
    requiredDecisionAr: blocker.decisionRequiredAr,
    decisionAuthority: 'independent-authority',
    decisionAuthorityAr: blocker.requiredAuthorityId ?? 'جهة غير معيّنة',
    nextAcceptedEvidenceAr: blocker.nextAcceptedEvidenceAr
  } : null;

  if (!configuration || !mapAdapter || !activeLayer || !spatialBlocker) {
    return (
      <section data-testid="readiness-map-unavailable" className="ri-map-unavailable">
        <ScanSearch aria-hidden="true" />
        <div>
          <strong>الخريطة التشغيلية غير متاحة لهذا السياق</strong>
          <p>لم يُستخدم مشروع أو مخطط تجريبي بديل.</p>
        </div>
      </section>
    );
  }

  return (
    <section data-testid="readiness-spatial-map" className="ri-map-panel">
      <header>
        <div>
          <span>السياق المكاني المرتبط</span>
          <strong>{activeLayer.labelAr}</strong>
        </div>
        <div className="ri-map-controls" aria-label="أدوات خريطة الجاهزية">
          <button type="button" title="تكبير" aria-label="تكبير الخريطة" onClick={() => canvasRef.current?.zoomIn()}><Plus aria-hidden="true" /></button>
          <button type="button" title="تصغير" aria-label="تصغير الخريطة" onClick={() => canvasRef.current?.zoomOut()}><Minus aria-hidden="true" /></button>
          <button type="button" title="ملاءمة الكل" aria-label="ملاءمة جميع العناصر" onClick={() => canvasRef.current?.fit()}><Focus aria-hidden="true" /></button>
          <button type="button" title="ملاءمة المحدد" aria-label="ملاءمة العنصر المحدد" disabled={!selectedEntityId} onClick={() => canvasRef.current?.fitSelected()}><ScanSearch aria-hidden="true" /></button>
          <button type="button" title="إعادة الضبط" aria-label="إعادة ضبط عرض الخريطة" onClick={() => canvasRef.current?.reset()}><RotateCcw aria-hidden="true" /></button>
        </div>
      </header>
      <div className="ri-map-canvas">
        <SpatialCommandCanvas
          ref={canvasRef}
          mapAdapter={mapAdapter}
          configuration={configuration}
          activeLayer={activeLayer}
          mode="executive"
          selectedEntityId={selectedEntityId}
          activeJourneyStep={configuration.narrativeJourney.steps[0]!}
          activeBlocker={spatialBlocker}
          viewMode="top"
          presentationCue={null}
          visibleDisplayLayerIds={visibleLayerIds}
          displayLayerOpacity={opacity}
          filteredEntityIds={null}
          anchorOverrides={[]}
          editingCandidateAnchors={false}
          onSelectEntity={(entityId) => onSelectEntity(entityId)}
          onAnchorDragStart={() => undefined}
          onAnchorDragPreview={() => undefined}
          onAnchorDragCommit={() => undefined}
          onZoomChange={() => undefined}
          onOpenVisitorMapSpecification={() => undefined}
        />
      </div>
      <footer>
        <span>الموضع المرشح لا يثبت إنجازًا تشغيليًا</span>
        {selectedEntityId ? (
          <button type="button" onClick={() => onSelectEntity(null)}>مسح تحديد <bdi dir="ltr">{selectedEntityId}</bdi></button>
        ) : <span>اختر وجهة لكشف سياقها</span>}
      </footer>
    </section>
  );
}
