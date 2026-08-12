import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileImage,
  Images,
  Layers3,
  MapPinned,
  Maximize2,
  RotateCcw,
  Scan,
  Target,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import type { SpatialDisplayLayer } from '../../types/spatialMap';
import type {
  SpatialCommandMode,
  SpatialCommandSourceLayer,
  SpatialCommandViewMode
} from '../../types/spatialCommand';

const layerIcons = {
  working: Layers3,
  candidate: MapPinned,
  conceptual: FileImage,
  evidence: Camera,
  missing: Images
} as const;

const truthLabels = {
  working: 'عامل',
  candidate: 'مرشح',
  conceptual: 'مفاهيمي',
  evidence: 'أدلة',
  missing: 'مفقود'
} as const;

function sourceLayerTestId(sourceLayerId: string) {
  return `spatial-source-layer-${sourceLayerId
    .replace(/^SOURCE-LAYER-/u, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')}`;
}

export function SpatialLayerControls({
  layers,
  displayLayers,
  mode,
  activeLayerId,
  visibleDisplayLayerIds,
  displayLayerOpacity,
  collapsed,
  viewMode,
  zoom,
  selectedEntityId,
  onToggleCollapsed,
  onLayerChange,
  onDisplayLayerToggle,
  onDisplayLayerOpacityChange,
  onViewModeChange,
  onZoomIn,
  onZoomOut,
  onReset,
  onFit,
  onFitSelected
}: {
  layers: SpatialCommandSourceLayer[];
  displayLayers: SpatialDisplayLayer[];
  mode: SpatialCommandMode;
  activeLayerId: string;
  visibleDisplayLayerIds: Set<string>;
  displayLayerOpacity: Record<string, number>;
  collapsed: boolean;
  viewMode: SpatialCommandViewMode;
  zoom: number;
  selectedEntityId: string | null;
  onToggleCollapsed: () => void;
  onLayerChange: (layerId: string) => void;
  onDisplayLayerToggle: (layerId: string) => void;
  onDisplayLayerOpacityChange: (layerId: string, opacity: number) => void;
  onViewModeChange: (viewMode: SpatialCommandViewMode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFit: () => void;
  onFitSelected: () => void;
}) {
  const compatibleDisplayLayers = displayLayers
    .filter((layer) => layer.compatibleModes.includes(mode)
      && !['base-working-source', 'future-external-spatial-adapter'].includes(layer.type))
    .sort((left, right) => left.renderOrder - right.renderOrder);
  return (
    <aside
      data-testid="spatial-layer-panel"
      data-collapsed={collapsed}
      className={`sc-layer-rail ${collapsed ? 'is-collapsed' : ''}`}
      aria-label="طبقات المصدر وأدوات الخريطة"
    >
      <div className="sc-rail-title">
        <span>طبقات المشهد</span>
        <small>{layers.length + compatibleDisplayLayers.length}</small>
        <button
          data-testid="collapse-source-layers"
          type="button"
          title={collapsed ? 'توسيع لوحة الطبقات' : 'طي لوحة الطبقات'}
          aria-label={collapsed ? 'توسيع لوحة الطبقات' : 'طي لوحة الطبقات'}
          onClick={onToggleCollapsed}
        >
          {collapsed ? <ChevronLeft aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
        </button>
      </div>
      <div className="sc-layer-scroll">
      <div className="sc-source-buttons">
        {layers.map((layer) => {
          const Icon = layerIcons[layer.truthStatus];
          const active = activeLayerId === layer.sourceLayerId;
          return (
            <button
              key={layer.sourceLayerId}
              data-testid={sourceLayerTestId(layer.sourceLayerId)}
              data-source-layer-id={layer.sourceLayerId}
              type="button"
              title={`${layer.labelAr}، ${truthLabels[layer.truthStatus]}`}
              aria-label={`${layer.labelAr}، ${truthLabels[layer.truthStatus]}`}
              aria-pressed={active}
              className={active ? 'is-active' : undefined}
              onClick={() => onLayerChange(layer.sourceLayerId)}
            >
              <Icon aria-hidden="true" />
              <span>{layer.labelAr}</span>
              <small>{truthLabels[layer.truthStatus]}</small>
            </button>
          );
        })}
      </div>
      <div className="sc-rail-divider" />
      <section data-testid="spatial-display-layers" className="sc-display-layers" aria-label="طبقات العرض المتوافقة">
        <header><span>العروض</span><small>{compatibleDisplayLayers.length}</small></header>
        {compatibleDisplayLayers.map((layer) => {
          const visible = visibleDisplayLayerIds.has(layer.layerId);
          const opacity = displayLayerOpacity[layer.layerId] ?? layer.opacity;
          return (
            <div key={layer.layerId} className="sc-display-layer-row">
              <button
                type="button"
                data-testid={`display-layer-${layer.type}`}
                aria-pressed={visible}
                aria-label={`${visible ? 'إخفاء' : 'إظهار'} ${layer.labelAr}`}
                title={`${visible ? 'إخفاء' : 'إظهار'} ${layer.labelAr}`}
                onClick={() => onDisplayLayerToggle(layer.layerId)}
              >
                {visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                <span>{layer.labelAr}</span>
              </button>
              {!collapsed && visible ? (
                <label>
                  <span>شفافية {layer.labelAr}</span>
                  <input
                    data-testid={`display-layer-opacity-${layer.type}`}
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={opacity}
                    aria-label={`شفافية ${layer.labelAr}`}
                    onChange={(event) => onDisplayLayerOpacityChange(layer.layerId, Number(event.target.value))}
                  />
                  <output>{Math.round(opacity * 100)}%</output>
                </label>
              ) : null}
            </div>
          );
        })}
      </section>
      <div className="sc-rail-divider" />
      <div className="sc-view-toggle" aria-label="منظور الخريطة">
        <button
          data-testid="spatial-view-top"
          type="button"
          title="عرض علوي"
          aria-label="عرض علوي"
          aria-pressed={viewMode === 'top'}
          className={viewMode === 'top' ? 'is-active' : undefined}
          onClick={() => onViewModeChange('top')}
        >
          <Scan aria-hidden="true" />
          <span>عرض علوي</span>
        </button>
        <button
          data-testid="spatial-view-presentation"
          type="button"
          title="منظور العرض البصري"
          aria-label="منظور العرض البصري"
          aria-pressed={viewMode === 'presentation'}
          className={viewMode === 'presentation' ? 'is-active' : undefined}
          onClick={() => onViewModeChange('presentation')}
        >
          <Maximize2 aria-hidden="true" />
          <span>منظور العرض</span>
        </button>
      </div>
      <div className="sc-map-tools" aria-label="أدوات عرض الخريطة">
        <button type="button" title="تكبير الخريطة" aria-label="تكبير الخريطة" onClick={onZoomIn}><ZoomIn aria-hidden="true" /></button>
        <output aria-label="مستوى التكبير">{Math.round(zoom * 100)}%</output>
        <button type="button" title="تصغير الخريطة" aria-label="تصغير الخريطة" onClick={onZoomOut}><ZoomOut aria-hidden="true" /></button>
        <button type="button" title="ملاءمة جميع العناصر" aria-label="ملاءمة جميع العناصر" onClick={onFit}><Scan aria-hidden="true" /></button>
        <button type="button" disabled={!selectedEntityId} title="ملاءمة العنصر المحدد" aria-label="ملاءمة العنصر المحدد" onClick={onFitSelected}><Target aria-hidden="true" /></button>
        <button type="button" title="إعادة ضبط الخريطة" aria-label="إعادة ضبط الخريطة" onClick={onReset}><RotateCcw aria-hidden="true" /></button>
      </div>
      </div>
    </aside>
  );
}
