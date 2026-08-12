import type { JourneyId } from '../data/spatialTypes';
import { registeredSpatialAssets } from '../spatial/gardenRegistration';
import { registeredJourneyById } from '../spatial/registeredJourneys';

interface ReadOnlyDaySpatialPreviewProps {
  journeyIds?: string[];
  titleAr: string;
  sourceVisualPath?: string;
  sourceVisualAltAr?: string;
}

const isJourneyId = (id: string): id is JourneyId => id in registeredJourneyById;

export function ReadOnlyDaySpatialPreview({
  journeyIds = [],
  titleAr,
  sourceVisualPath,
  sourceVisualAltAr,
}: ReadOnlyDaySpatialPreviewProps) {
  const journeys = journeyIds.filter(isJourneyId).map((id) => registeredJourneyById[id]);

  return (
    <div className="kaga-v2-day-map-preview" data-testid="v2-day-spatial-preview">
      <div className="kaga-v2-day-map-preview__map">
      <svg viewBox="0 0 1703.16 1371.235" role="img" aria-labelledby="v2-day-map-title v2-day-map-desc">
        <title id="v2-day-map-title">المخطط المكاني ل{titleAr}</title>
        <desc id="v2-day-map-desc">معاينة مصدرية غير تفاعلية للمخطط ومسارات اليوم المرتبطة به.</desc>
        <image
          data-testid="v2-day-masterplan-base"
          href={registeredSpatialAssets.executiveMasterplanSvg}
          width="1703.16"
          height="1371.235"
          preserveAspectRatio="xMidYMid meet"
        />
        <g className="kaga-v2-day-map-preview__routes">
          {journeys.map((journey, journeyIndex) => (
            <g key={journey.journeyId} data-journey-id={journey.journeyId}>
              <path className="kaga-v2-day-map-preview__route-halo" d={journey.pathD} />
              <path
                className="kaga-v2-day-map-preview__route"
                d={journey.pathD}
                style={{ '--day-route-color': journeyIndex === 0 ? '#b18a47' : journey.color } as React.CSSProperties}
              />
              {journey.stops.map((stop) => (
                <g key={stop.stopId} className="kaga-v2-day-map-preview__stop" transform={`translate(${stop.mapPoint[0]} ${stop.mapPoint[1]})`}>
                  <circle r="10" />
                  <text textAnchor="middle" dominantBaseline="central">{stop.code}</text>
                </g>
              ))}
            </g>
          ))}
        </g>
      </svg>
      </div>
      {sourceVisualPath ? (
        <div className="kaga-v2-day-map-preview__source">
          <img src={sourceVisualPath} alt={sourceVisualAltAr ?? `مشهد من المصدر مرتبط بـ${titleAr}`} />
          <svg viewBox="0 0 360 620" preserveAspectRatio="none" aria-hidden="true">
            <path d="M352 0 C244 134 329 298 266 430 C226 515 132 574 0 620 H360 V0 Z" />
          </svg>
        </div>
      ) : null}
      <span className="kaga-v2-day-map-preview__label">المخطط والمسارات المرتبطة باليوم</span>
    </div>
  );
}
