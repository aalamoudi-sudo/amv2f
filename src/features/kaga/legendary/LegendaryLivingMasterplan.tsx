import { eventDays } from '../data/eventDays';
import { journeyById } from '../data/journeys';
import type { JourneyId } from '../data/spatialTypes';
import { IllustratedMapLayers, IllustratedMapSwitcher, type IllustratedMapReading } from '../illustratedMap';
import { registeredSpatialAssets } from '../spatial/gardenRegistration';
import { registeredJourneyById } from '../spatial/registeredJourneys';
import type { LegendaryDayId } from './legendaryTypes';

interface LegendaryLivingMasterplanProps {
  dayId: LegendaryDayId;
  selectedJourneyId: JourneyId;
  activeStopId?: string;
  onJourneySelect: (journeyId: JourneyId) => void;
  onStopSelect: (journeyId: JourneyId, stopId: string) => void;
  grayscale?: boolean;
  reading?: IllustratedMapReading;
  activePlaceId?: string;
  onReadingChange?: (reading: IllustratedMapReading) => void;
  onPlaceSelect?: (placeId: string) => void;
}

const routePatterns = ['0', '18 7', '4 7', '22 6 4 6', '12 5', '2 6'];
const routeSymbols = ['●', '◆', '■', '▲', '⬟', '✦'];

export function LegendaryLivingMasterplan({ dayId, selectedJourneyId, activeStopId, onJourneySelect, onStopSelect, grayscale = false, reading = 'masterplan', activePlaceId, onReadingChange, onPlaceSelect }: LegendaryLivingMasterplanProps) {
  const day = eventDays.find((item) => item.id === dayId)!;
  const journeyIds = (day.journeyIds ?? []) as JourneyId[];
  return (
    <div className="kaga-l2-living-map" data-day={dayId} data-grayscale={grayscale} data-reading={reading} data-testid="legendary-living-map">
      {onReadingChange ? <IllustratedMapSwitcher value={reading} onChange={onReadingChange} /> : null}
      <svg viewBox="0 0 1703.16 1371.235" role="img" aria-label={`المخطط الحي — ${day.ordinalLabel}`}>
        <image className="kaga-canonical-masterplan" href={registeredSpatialAssets.executiveMasterplanSvg} width="1703.16" height="1371.235" />
        <IllustratedMapLayers reading={reading} activePlaceId={activePlaceId} onPlaceSelect={onPlaceSelect} />
        <g className="kaga-l2-living-map__routes">
          {journeyIds.map((journeyId, index) => {
            const journey = registeredJourneyById[journeyId];
            const selected = selectedJourneyId === journeyId;
            return (
              <g key={journeyId} data-selected={selected} style={{ '--route-color': grayscale ? '#33554c' : journey.color } as React.CSSProperties}>
                <path className="route-halo" d={journey.pathD} />
                <path className="route-line" d={journey.pathD} strokeDasharray={routePatterns[index]} onClick={() => onJourneySelect(journeyId)} />
                {journey.stops.map((stop) => (
                  <g key={stop.stopId} className="route-stop" data-active={activeStopId === stop.stopId} transform={`translate(${stop.mapPoint[0]} ${stop.mapPoint[1]})`} onClick={() => onStopSelect(journeyId, stop.stopId)} role="button" tabIndex={0} aria-label={`${journey.titleAr}: ${stop.eventLabel}`}>
                    <circle r={activeStopId === stop.stopId ? 15 : 9} />
                    <text y="1" textAnchor="middle" dominantBaseline="middle">{routeSymbols[index]}</text>
                  </g>
                ))}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="kaga-l2-living-map__legend">
        {journeyIds.length ? journeyIds.map((journeyId, index) => (
          <button key={journeyId} type="button" aria-pressed={selectedJourneyId === journeyId} onClick={() => onJourneySelect(journeyId)}>
            <i style={{ '--route-color': grayscale ? '#33554c' : registeredJourneyById[journeyId].color } as React.CSSProperties}>{routeSymbols[index]}</i>
            <span>{journeyById[journeyId].title}</span>
          </button>
        )) : <span>لحظة التدشين وعرض التدشين — لا يحدد المصدر رحلة ميدانية لهذا اليوم.</span>}
      </div>
    </div>
  );
}
