import { useEffect, useMemo, useState } from 'react';
import type { JourneyId } from '../data/spatialTypes';
import { IllustratedMapLayers } from '../illustratedMap/IllustratedMapLayers';
import type { IllustratedMapReading } from '../illustratedMap/illustratedMapRegistration';
import { registeredSpatialAssets } from '../spatial/gardenRegistration';
import { eventProposalMappedExecutiveGardenIds } from '../data/eventProposalPlaceWhitelist';
import { pointAtRegisteredProgress, registeredJourneyById } from '../spatial/registeredJourneys';

interface GeoJsonFeature {
  properties: {
    canonicalGardenId?: string;
    titleAr?: string;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

interface RegisteredMasterplanProps {
  mode: 'event' | 'gardens';
  journeyId: JourneyId;
  progress: number;
  playing?: boolean;
  reading?: IllustratedMapReading;
  sourceFidelityMode?: boolean;
  selectedGardenId?: string;
  selectedStopIndex: number;
  provenanceMode?: boolean;
  onGardenSelect: (gardenId: string) => void;
  onStopSelect: (stopIndex: number) => void;
}

const polygonPath = (feature: GeoJsonFeature) => feature.geometry.coordinates
  .map((ring) => ring.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point[0]} ${point[1]}`).join(' ') + ' Z')
  .join(' ');

export function RegisteredMasterplan({
  mode,
  journeyId,
  progress,
  playing = false,
  reading = 'masterplan',
  sourceFidelityMode = false,
  selectedGardenId,
  selectedStopIndex,
  provenanceMode = false,
  onGardenSelect,
  onStopSelect,
}: RegisteredMasterplanProps) {
  const [gardens, setGardens] = useState<GeoJsonFeature[]>([]);
  const [crescentCandidate, setCrescentCandidate] = useState<GeoJsonFeature | null>(null);
  const [assetState, setAssetState] = useState<'loading' | 'ready' | 'error'>('loading');
  const journey = registeredJourneyById[journeyId];
  const marker = useMemo(() => pointAtRegisteredProgress(journey, progress), [journey, progress]);
  const movementForSegment = (fromCode: string) => {
    if (fromCode === 'A') return 'car';
    if (fromCode === 'B') return 'transfer';
    if (fromCode >= 'C' && fromCode < 'J') return 'tour';
    return 'exit';
  };
  const stateForSegment = (fromStopId: string, toStopId: string) => {
    const fromIndex = journey.stops.findIndex((stop) => stop.stopId === fromStopId);
    const toIndex = journey.stops.findIndex((stop) => stop.stopId === toStopId);
    const fromProgress = journey.stops[fromIndex]?.pathProgress;
    const toProgress = journey.stops[toIndex]?.pathProgress;
    if (fromProgress === undefined || toProgress === undefined) return 'future';
    if (progress >= toProgress) return 'complete';
    if (progress >= fromProgress) return 'current';
    if (fromIndex === selectedStopIndex + 1) return 'next';
    return 'future';
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(registeredSpatialAssets.registeredGardens).then((response) => {
        if (!response.ok) throw new Error('registered gardens');
        return response.json() as Promise<{ features: GeoJsonFeature[] }>;
      }),
      provenanceMode
        ? fetch(registeredSpatialAssets.registeredCrescent).then((response) => {
            if (!response.ok) throw new Error('crescent audit');
            return response.json() as Promise<{ features: GeoJsonFeature[] }>;
          })
        : Promise.resolve({ features: [] as GeoJsonFeature[] }),
    ])
      .then(([gardenCollection, crescentCollection]) => {
        if (!active) return;
        setGardens(provenanceMode
          ? gardenCollection.features
          : gardenCollection.features.filter((feature) => (
            feature.properties.canonicalGardenId
            && eventProposalMappedExecutiveGardenIds.has(feature.properties.canonicalGardenId)
          )));
        setCrescentCandidate(crescentCollection.features[0] ?? null);
      })
      .catch(() => {
        if (active) setAssetState('error');
      });
    return () => { active = false; };
  }, [provenanceMode]);

  return (
    <div className="kaga-v2-registered-map" data-mode={mode} data-playing={playing} data-reading={reading} data-source-fidelity={sourceFidelityMode} data-testid="registered-masterplan">
      {assetState === 'loading' ? <div className="kaga-v2-source-map__state" role="status">جارٍ تحميل المخطط…</div> : null}
      {assetState === 'error' ? <div className="kaga-v2-source-map__state is-error" role="alert">تعذر تحميل المخطط.</div> : null}
      <svg viewBox="0 0 1703.16 1371.235" role="img" aria-labelledby="registered-map-title registered-map-desc">
        <title id="registered-map-title">المخطط التفاعلي لحدائق الملك عبدالله</title>
        <desc id="registered-map-desc">
          {mode === 'event'
            ? `يعرض ${journey.titleAr} على المخطط التفاعلي لحدائق الملك عبدالله.`
            : `يعرض ${gardens.length} حدائق مسماة على المخطط التفاعلي.`}
        </desc>
        <image
          className="kaga-v2-registered-map__canonical"
          href={registeredSpatialAssets.executiveMasterplanSvg}
          width="1703.16"
          height="1371.235"
          onLoad={() => setAssetState('ready')}
          onError={() => setAssetState('error')}
        />
        <IllustratedMapLayers reading={reading} />

        {mode === 'gardens' ? (
          <g className="kaga-v2-registered-map__gardens" aria-label="مواقع الحدائق">
            {gardens.map((feature) => {
              const gardenId = feature.properties.canonicalGardenId!;
              return (
                <path
                  key={gardenId}
                  d={polygonPath(feature)}
                  tabIndex={0}
                  role="button"
                  aria-label={`استكشف ${feature.properties.titleAr}`}
                  aria-pressed={selectedGardenId === gardenId}
                  onClick={() => onGardenSelect(gardenId)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') onGardenSelect(gardenId);
                  }}
                />
              );
            })}
          </g>
        ) : (
          <g className="kaga-v2-registered-map__journey" style={{ '--journey-color': journey.color } as React.CSSProperties}>
            <path className="kaga-v2-registered-map__route-halo" d={journey.pathD} />
            <path className="kaga-v2-registered-map__route" d={journey.pathD} />
            {sourceFidelityMode ? (
              <g className="kaga-v2-registered-map__source-segments" aria-label="تقسيم المسار كما في ملف المصدر">
                {journey.segments.map((segment) => {
                  const fromCode = journey.stops.find((stop) => stop.stopId === segment.fromStopId)?.code ?? '';
                  return (
                    <polyline
                      key={segment.segmentId}
                      points={segment.geometry.map((point) => `${point[0]},${point[1]}`).join(' ')}
                      data-movement={movementForSegment(fromCode)}
                      data-state={stateForSegment(segment.fromStopId, segment.toStopId)}
                      data-from-stop={segment.fromStopId}
                      data-to-stop={segment.toStopId}
                    />
                  );
                })}
              </g>
            ) : null}
            {journey.stops.map((stop, index) => (
              <g
                key={stop.stopId}
                className="kaga-v2-registered-map__stop"
                data-active={selectedStopIndex === index}
                data-next={selectedStopIndex + 1 === index}
                transform={`translate(${stop.mapPoint[0]} ${stop.mapPoint[1]})`}
                tabIndex={0}
                role="button"
                aria-label={`${stop.code}، ${stop.eventLabel}`}
                onClick={() => onStopSelect(index)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onStopSelect(index);
                }}
              >
                <circle r="11" />
                <text textAnchor="middle" dominantBaseline="central">{stop.code}</text>
              </g>
            ))}
            <g className="kaga-v2-registered-map__marker" transform={`translate(${marker[0]} ${marker[1]})`} data-testid="registered-marker">
              <circle className="is-pulse" r="20" />
              <circle r="8" />
            </g>
          </g>
        )}

        {provenanceMode && crescentCandidate ? (
          <g className="kaga-v2-registered-map__crescent-audit" aria-label="نطاق Crescent غير المحسوم">
            <path d={polygonPath(crescentCandidate)} />
            <text x="1068" y="440" textAnchor="middle">نطاق Gate 1 غير معتمد كبصمة مبنى</text>
          </g>
        ) : null}
      </svg>
      <div className="kaga-v2-source-map__legend">
        <span><i className="is-linework" />المخطط</span>
        <span><i className={mode === 'event' ? 'is-route' : 'is-footprint'} />{mode === 'event' ? 'مسار الرحلة' : 'مواقع الحدائق'}</span>
      </div>
    </div>
  );
}
