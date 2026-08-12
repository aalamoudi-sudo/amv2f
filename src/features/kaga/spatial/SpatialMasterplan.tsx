import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { getJourneyPath, getJourneyTimeline } from "../data/journeys";
import { masterplanSource } from "../data/spatialMap";
import type { JourneyStop, SpatialJourney } from "../data/spatialTypes";

interface SpatialMasterplanProps {
  journey: SpatialJourney;
  activeBranchId: string | null;
  progress: number;
  activeStopIndex: number;
  selectedStopId: string | null;
  focusRequest: number;
  resetRequest: number;
  onSelectStop: (id: string, branchId?: string) => void;
}

interface ViewTransform { x: number; y: number; scale: number }
const initialView: ViewTransform = { x: 0, y: 0, scale: 1 };
const segmentColors = { entry: "#1c9a61", tour: "#68419a", exit: "#dc4b39", shuttle: "#2386af", optional: "#263b38" } as const;

export function SpatialMasterplan({ journey, activeBranchId, progress, activeStopIndex, selectedStopId, focusRequest, resetRequest, onSelectStop }: SpatialMasterplanProps) {
  const playbackPathRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragOrigin = useRef<{ pointerX: number; pointerY: number; viewX: number; viewY: number } | null>(null);
  const [view, setView] = useState<ViewTransform>(journey.focus);
  const [marker, setMarker] = useState({ x: journey.stops[0]?.point.x ?? 0, y: journey.stops[0]?.point.y ?? 0 });
  const [appliedRequest, setAppliedRequest] = useState({ journeyId: journey.id, focusRequest, resetRequest });
  const activeBranch = journey.optionalBranches?.find((branch) => branch.id === activeBranchId);
  const activePath = getJourneyPath(journey, activeBranchId);
  const timelineStops = getJourneyTimeline(journey, activeBranchId);
  const visibleStops = activeBranch ? [...journey.stops, ...activeBranch.stops] : journey.stops;

  if (appliedRequest.journeyId !== journey.id || appliedRequest.focusRequest !== focusRequest) {
    setAppliedRequest({ journeyId: journey.id, focusRequest, resetRequest });
    setView(journey.focus);
  } else if (appliedRequest.resetRequest !== resetRequest) {
    setAppliedRequest({ journeyId: journey.id, focusRequest, resetRequest });
    setView(initialView);
  }

  useEffect(() => {
    const path = playbackPathRef.current;
    if (!path) return;
    const location = path.getPointAtLength(path.getTotalLength() * progress);
    setMarker({ x: location.x, y: location.y });
  }, [activePath, journey.id, progress]);

  const highlightedStop = visibleStops.find((stop) => stop.id === selectedStopId) ?? timelineStops[activeStopIndex];

  const onWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -0.12 : 0.12;
    setView((current) => ({ ...current, scale: Math.max(0.72, Math.min(2.4, current.scale + direction)) }));
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.target instanceof Element && event.target.closest('.kaga-map-stop')) return;
    dragOrigin.current = { pointerX: event.clientX, pointerY: event.clientY, viewX: view.x, viewY: view.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragOrigin.current) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const factor = 1200 / rect.width;
    setView((current) => ({ ...current, x: dragOrigin.current!.viewX + (event.clientX - dragOrigin.current!.pointerX) * factor, y: dragOrigin.current!.viewY + (event.clientY - dragOrigin.current!.pointerY) * factor }));
  };
  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    dragOrigin.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const renderStop = (stop: JourneyStop) => {
    const selected = highlightedStop?.id === stop.id;
    const belongsToActiveTimeline = (stop.branchId ?? null) === activeBranchId;
    const visited = belongsToActiveTimeline && stop.pathProgress <= progress + 0.000_001;
    return (
      <g
        key={stop.id}
        className={`kaga-map-stop${selected ? " is-selected" : ""}${visited ? " is-visited" : ""}`}
        transform={`translate(${stop.point.x} ${stop.point.y})`}
        data-stop-x={stop.point.x.toFixed(3)}
        data-stop-y={stop.point.y.toFixed(3)}
        data-path-progress={stop.pathProgress}
        role="button"
        tabIndex={0}
        aria-label={`فتح محطة ${stop.title}`}
        onClick={(event) => { event.stopPropagation(); onSelectStop(stop.id, stop.branchId); }}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelectStop(stop.id, stop.branchId); }}
      >
        <circle r={selected ? 16 : 12} />
        <text textAnchor="middle" dominantBaseline="central">{stop.code}</text>
        {selected ? <text className="kaga-map-stop__label" x="20" y="4">{stop.title}</text> : null}
      </g>
    );
  };

  return (
    <div className="kaga-masterplan-frame" aria-label="الخريطة التفاعلية لمسارات الافتتاح">
      <svg
        ref={svgRef}
        className="kaga-masterplan"
        viewBox="0 0 1200 900"
        role="img"
        aria-labelledby="kaga-map-title kaga-map-desc"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <title id="kaga-map-title">المخطط التفاعلي لحدائق الملك عبدالله</title>
        <desc id="kaga-map-desc">إعادة بناء متجهية لمسار {journey.title} من صفحة {journey.source.pdfPages.join("، ")} في العرض المرجعي.</desc>
        <defs>
          <radialGradient id="kagaGardenFill" cx="50%" cy="45%" r="60%">
            <stop offset="0" stopColor="#d9e2c9" />
            <stop offset="1" stopColor="#8ea98e" />
          </radialGradient>
          <filter id="kagaMarkerGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <pattern id="kagaPaths" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M0 12 H24 M12 0 V24" stroke="#d7d2bf" strokeWidth="0.7" opacity="0.5" /></pattern>
        </defs>

        <g className="kaga-masterplan__viewport" transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
          <g className="kaga-masterplan__base" aria-label="طبقة المخطط الأساسي">
            <rect x="20" y="20" width="925" height="830" rx="42" fill="#e9e6da" />
            <rect x="20" y="20" width="925" height="830" rx="42" fill="url(#kagaPaths)" opacity="0.2" />
            <path d="M62 102 C175 62 320 74 444 132 C506 161 565 150 631 114 C718 68 844 79 914 139" className="kaga-road kaga-road--outer" />
            <path d="M70 716 C126 690 185 655 218 602 C250 550 235 490 221 438 C205 372 228 322 286 301 C337 281 384 286 443 309" className="kaga-road kaga-road--outer" />
            <path d="M241 302 C311 335 378 353 447 348" className="kaga-road kaga-road--minor" />
            <path d="M438 164 C515 113 663 104 790 145 C889 177 932 253 922 356 C910 474 823 548 703 568 C575 589 448 526 408 420 C372 325 382 222 438 164 Z" className="kaga-garden-footprint" />
            <path d="M488 208 C548 166 662 155 758 181 C838 203 873 261 867 344 C859 429 795 486 707 505 C610 526 512 482 477 406 C444 334 448 254 488 208 Z" className="kaga-garden-circulation" />
            <path d="M559 241 C610 209 697 207 759 241 C819 274 824 356 780 405 C738 453 655 462 593 431 C529 399 506 311 559 241 Z" className="kaga-garden-core" />
            <path d="M507 236 C574 274 593 345 567 423 M806 225 C748 270 720 330 734 421 M463 329 C535 320 601 288 646 228 M492 452 C574 415 657 420 739 472" className="kaga-internal-walk" />
            <path d="M642 189 C590 245 572 313 592 383 C609 444 654 480 711 499" className="kaga-crescent-boundary" />
            <path d="M779 203 C714 245 682 306 691 365 C699 418 738 453 793 467" className="kaga-crescent-boundary kaga-crescent-boundary--inner" />
            <path d="M276 142 L452 142 L474 252 L278 275 L241 218 Z" className="kaga-parking" />
            <path d="M111 178 L205 168 L226 312 L104 326 L85 270 Z" className="kaga-parking kaga-parking--staff" />
            <path d="M293 168 L433 155 M286 194 L441 181 M279 221 L449 208 M273 247 L456 235" className="kaga-parking-lines" />
            <path d="M127 661 C166 628 226 630 256 671 C287 714 270 783 216 811 C160 840 99 801 93 743 C89 708 101 683 127 661 Z" className="kaga-nature-footprint" />
            <path d="M156 782 Q184 689 218 781 M185 692 V806 M135 738 Q184 716 234 741" className="kaga-nature-symbol" />
            <text x="350" y="220" className="kaga-map-area-label">مواقف الجهات الحكومية</text>
            <text x="155" y="247" className="kaga-map-area-label">مواقف فريق العمل</text>
            <text x="686" y="356" className="kaga-map-area-label kaga-map-area-label--garden">حدائق الملك عبدالله</text>
            <text x="185" y="825" className="kaga-map-area-label">حديقة الطبيعة</text>
          </g>

          <g className="kaga-masterplan__routes" aria-label="طبقة مسار الرحلة">
            {journey.segments.map((segment) => (
              <path key={segment.id} d={segment.path} className={`kaga-route kaga-route--${segment.kind}${segment.kind === "optional" && activeBranch ? " is-active" : ""}`} style={{ "--route-color": segmentColors[segment.kind] } as React.CSSProperties} />
            ))}
            <path ref={playbackPathRef} d={activePath} fill="none" stroke="transparent" strokeWidth="1" aria-hidden="true" />
          </g>

          <g className="kaga-masterplan__stops" aria-label="طبقة محطات الرحلة">{visibleStops.map(renderStop)}</g>
          <g className="kaga-playback-marker" transform={`translate(${marker.x} ${marker.y})`} data-marker-x={marker.x.toFixed(3)} data-marker-y={marker.y.toFixed(3)} aria-label={`موضع العرض عند ${Math.round(progress * 100)} بالمئة`}>
            <circle className="kaga-playback-marker__halo" r="19" />
            <circle className="kaga-playback-marker__core" r="8" />
          </g>
        </g>

        <g className="kaga-map-caption" transform="translate(965 90)">
          <text className="kaga-map-caption__eyebrow">المسار المختار</text>
          <text className="kaga-map-caption__title" y="42">{activeBranch?.title ?? journey.title}</text>
          <text className="kaga-map-caption__meta" y="78">{journey.window}</text>
          <text className="kaga-map-caption__meta" y="108">المصدر: ص {journey.source.pdfPages.join("، ")}</text>
          <line y1="140" x2="205" y2="140" />
          {journey.segments.map((segment, index) => (
            <g key={segment.id} transform={`translate(0 ${178 + index * 70})`}>
              <line x1="0" y1="-8" x2="34" y2="-8" stroke={segmentColors[segment.kind]} strokeWidth="5" strokeDasharray={segment.kind === "tour" ? "8 7" : undefined} />
              <text className="kaga-map-caption__segment" x="44">{segment.label}</text>
              <text className="kaga-map-caption__detail" x="44" y="24">
                {segment.distanceMeters ? `${segment.distanceMeters} م` : "بلا طول مصدري"}
                {segment.realDurationMinutes ? ` · ${segment.realDurationMinutes} د` : ""}
              </text>
            </g>
          ))}
          <text className="kaga-map-caption__note" y="505">زمن العرض مختصر ولا يساوي زمن الرحلة الفعلي</text>
          <text className="kaga-map-caption__source" y="660">{masterplanSource.notes}</text>
        </g>
      </svg>
      <div className="kaga-map-gesture-hint" aria-hidden="true">اسحب للتحريك · مرّر للتقريب</div>
    </div>
  );
}
