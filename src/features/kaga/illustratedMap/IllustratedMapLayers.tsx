import { useId } from 'react';
import {
  illustratedMapReadings,
  illustratedMapRegistration,
  illustratedRegisteredHotspots,
  type IllustratedMapReading,
} from './illustratedMapRegistration';

interface IllustratedMapLayersProps {
  reading: IllustratedMapReading;
  activePlaceId?: string;
  onPlaceSelect?: (placeId: string) => void;
  softEdge?: boolean;
}

export function IllustratedMapLayers({ reading, activePlaceId, onPlaceSelect, softEdge = false }: IllustratedMapLayersProps) {
  const softEdgeId = useId().replace(/:/g, '');
  if (reading === 'masterplan') return null;
  const { runtimeAssets, canonicalTransform, sourceImageSize } = illustratedMapRegistration;
  const layers = [
    { href: runtimeAssets.land, role: 'land', depthPlane: 'background' },
    { href: runtimeAssets.water, role: 'water', depthPlane: 'midground-base' },
    { href: runtimeAssets.paths, role: 'paths', depthPlane: 'midground-base' },
    { href: runtimeAssets.vegetation, role: 'vegetation', depthPlane: 'midground-raised' },
    { href: runtimeAssets.architecture, role: 'architecture', depthPlane: 'midground-raised' },
  ] as const;
  return (
    <g className="kaga-illustrated-layers" data-testid="illustrated-map-layers" data-reading={reading} aria-label="طبقة الخريطة التصويرية">
      {softEdge ? (
        <defs>
          <radialGradient id={`${softEdgeId}-gradient`} cx="50%" cy="48%" r="58%">
            <stop offset="0%" stopColor="white" />
            <stop offset="67%" stopColor="white" />
            <stop offset="88%" stopColor="white" stopOpacity=".62" />
            <stop offset="100%" stopColor="black" />
          </radialGradient>
          <mask id={`${softEdgeId}-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width={sourceImageSize[0]} height={sourceImageSize[1]}>
            <rect width={sourceImageSize[0]} height={sourceImageSize[1]} fill={`url(#${softEdgeId}-gradient)`} />
          </mask>
        </defs>
      ) : null}
      <g transform={canonicalTransform.svgMatrix} mask={softEdge ? `url(#${softEdgeId}-mask)` : undefined}>
          {layers.map((layer, index) => (
            <image
              key={layer.href}
              className={`kaga-illustrated-layer${index === 0 ? ' kaga-illustrated-layer--context' : ''}`}
              data-layer-index={index}
              data-layer-role={layer.role}
              data-depth-plane={layer.depthPlane}
              href={layer.href}
              width={sourceImageSize[0]}
              height={sourceImageSize[1]}
              preserveAspectRatio="none"
            />
          ))}
      </g>
      <g className="kaga-illustrated-hotspots" aria-label="المواقع المسجلة">
        {illustratedRegisteredHotspots.map((hotspot) => (
          <g
            key={hotspot.id}
            className="kaga-illustrated-hotspot"
            data-active={activePlaceId === hotspot.id}
            data-entity-id={hotspot.id}
            transform={`translate(${hotspot.point[0]} ${hotspot.point[1]})`}
            role="button"
            tabIndex={0}
            aria-label={hotspot.titleAr}
            onClick={() => onPlaceSelect?.(hotspot.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onPlaceSelect?.(hotspot.id);
            }}
          >
            <circle r={activePlaceId === hotspot.id ? 16 : 10} />
            <path d="M 0 -5 L 5 0 L 0 5 L -5 0 Z" />
            <text x="17" y="-13">{hotspot.titleAr}</text>
          </g>
        ))}
      </g>
    </g>
  );
}

interface IllustratedMapSwitcherProps {
  value: IllustratedMapReading;
  onChange: (reading: IllustratedMapReading) => void;
}

export function IllustratedMapSwitcher({ value, onChange }: IllustratedMapSwitcherProps) {
  return (
    <div className="kaga-map-reading-switcher" role="group" aria-label="قراءة الخريطة" data-testid="map-reading-switcher">
      {illustratedMapReadings.map((reading) => (
        <button
          key={reading.id}
          type="button"
          aria-pressed={value === reading.id}
          onClick={() => onChange(reading.id)}
        >
          {reading.labelAr}
        </button>
      ))}
    </div>
  );
}
