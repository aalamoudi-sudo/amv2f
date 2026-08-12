import { useState } from 'react';
import { journeyById } from '../data/journeys';
import type { JourneyId } from '../data/spatialTypes';
import {
  legacyPointToSourceSpatial,
  legacyRouteMigration,
  sourceSpatialModel,
} from '../spatial/sourceSpatialModel';

export type KagaV2MapMode = 'event' | 'gardens';

interface SourceMasterplanGate1Props {
  mode: KagaV2MapMode;
  journeyId: JourneyId;
}

export function SourceMasterplanGate1({ mode, journeyId }: SourceMasterplanGate1Props) {
  const [assetState, setAssetState] = useState<'loading' | 'ready' | 'error'>('loading');
  const journey = journeyById[journeyId];
  const { width, height } = sourceSpatialModel.viewBox;

  return (
    <div className="kaga-v2-source-map" data-mode={mode} data-asset-state={assetState}>
      {assetState === 'loading' ? <div className="kaga-v2-source-map__state" role="status">جارٍ تحميل طبقة Rhino المحسّنة…</div> : null}
      {assetState === 'error' ? <div className="kaga-v2-source-map__state is-error" role="alert">تعذر تحميل طبقة المخطط المصدرية.</div> : null}
      <svg
        viewBox={sourceSpatialModel.viewBoxString}
        role="img"
        aria-labelledby="kaga-v2-source-map-title kaga-v2-source-map-desc"
      >
        <title id="kaga-v2-source-map-title">المخطط المكاني المصدر لحدائق الملك عبدالله</title>
        <desc id="kaga-v2-source-map-desc">
          مخطط مستخرج من نموذج Rhino. {mode === 'event' ? `يعرض التسجيل الأولي لمسار ${journey.title}.` : 'يعرض بصمات حدائق مرشحة غير مسماة بعد.'}
        </desc>
        <image
          href={sourceSpatialModel.assets.masterplanSvg}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
          onLoad={() => setAssetState('ready')}
          onError={() => setAssetState('error')}
        />

        {mode === 'gardens' ? (
          <image
            className="kaga-v2-source-map__garden-layer"
            href={sourceSpatialModel.assets.gardenFootprintsSvg}
            width={width}
            height={height}
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          <g className="kaga-v2-source-map__route-layer" aria-label={`تسجيل مسار ${journey.title}`}>
            <g transform={legacyRouteMigration.svgTransform}>
              <path className="kaga-v2-source-map__route-halo" d={journey.playbackPath} />
              <path className="kaga-v2-source-map__route" d={journey.playbackPath} style={{ '--journey-color': journey.color } as React.CSSProperties} />
            </g>
            {journey.stops.map((stop) => {
              const point = legacyPointToSourceSpatial(stop.point);
              return (
                <g key={stop.id} className="kaga-v2-source-map__stop" transform={`translate(${point.x} ${point.y})`}>
                  <circle r="12" />
                  <text textAnchor="middle" dominantBaseline="central">{stop.code}</text>
                </g>
              );
            })}
          </g>
        )}
      </svg>
      <div className="kaga-v2-source-map__legend">
        <span><i className="is-linework" />هندسة Rhino المختارة</span>
        <span><i className={mode === 'event' ? 'is-route' : 'is-footprint'} />{mode === 'event' ? 'تسجيل مسار أولي' : 'بصمات مرشحة غير مسماة'}</span>
      </div>
      <p className="kaga-v2-source-map__confidence">
        {mode === 'event'
          ? 'ثقة التسجيل: تقريبية · لم يكتمل إسناد المقاطع إلى الممرات الفعلية.'
          : '٢٨ بصمة هندسية مرشحة · لا تحمل أسماء حدائق قبل اكتمال المطابقة المصدرية.'}
      </p>
    </div>
  );
}
