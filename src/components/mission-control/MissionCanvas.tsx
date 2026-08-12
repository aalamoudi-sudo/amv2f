import {
  AlertTriangle,
  ArrowLeft,
  Box,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Cpu,
  Eye,
  FileQuestion,
  Gauge,
  Layers3,
  MapPinned,
  MonitorUp,
  Pause,
  Play,
  Radio,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DeclutteredExperienceMarker, ExperienceTwinConfiguration } from '../../data/experienceTwinConfigurations';
import type { RouteDesignConvergenceProjection } from '../../services/experienceRouteDesignConvergence';
import type { ExperiencePack, ExperienceSelectionContext } from '../../types/experienceTwin';
import {
  missionLensValues,
  missionModeValues,
  missionPresentationValues,
  type MissionCanvasRouteState,
  type MissionContext,
  type MissionGraphProjection,
  type MissionLens,
  type MissionMode,
  type MissionPresentation
} from '../../types/missionControl';
import './missionCanvas.css';

interface MissionCanvasProps {
  configuration: ExperienceTwinConfiguration;
  pack: ExperiencePack;
  selection: ExperienceSelectionContext;
  projection: MissionGraphProjection;
  routeProjection: RouteDesignConvergenceProjection;
  markers: DeclutteredExperienceMarker[];
  routeState: MissionCanvasRouteState;
  scene: ReactNode;
  errorAr: string | null;
  onSelectDay: (dayId: string) => void;
  onSelectPersona: (personaId: string) => void;
  onSelectWaypoint: (waypointId: string) => void;
  onOpenDesignScene: () => void;
  onReturnToWorldMap: () => void;
  onMissionChange: (patch: Partial<Pick<MissionContext, 'missionMode' | 'missionLens'>> & Partial<MissionCanvasRouteState>) => void;
  onExit?: () => void;
}

const lensLabels: Record<MissionLens, { labelAr: string; icon: typeof Eye }> = {
  experience: { labelAr: 'التجربة', icon: Eye },
  spatial: { labelAr: 'المكان', icon: MapPinned },
  operations: { labelAr: 'التشغيل', icon: Gauge },
  decision: { labelAr: 'القرار', icon: BrainCircuit },
  future: { labelAr: 'المستقبل', icon: Sparkles }
};

const modeLabels: Record<MissionMode, string> = {
  plan: 'خطط',
  rehearse: 'تدرّب',
  live: 'شغّل',
  incident: 'حادث',
  learn: 'تعلّم'
};

const presentationLabels: Record<MissionPresentation, string> = {
  client: 'عرض العميل',
  command: 'مركز القيادة',
  technical: 'المختبر التقني'
};

function ContextBar({ props }: { props: MissionCanvasProps }) {
  const { projection, routeState } = props;
  return (
    <header className="mission-context-bar" data-testid="mission-context-bar">
      <div className="mission-wordmark">
        <i>M</i>
        <span><small>THE LIVING EVENT WORLD</small><strong>مركز قيادة العالم الحي للفعالية</strong></span>
      </div>
      <nav className="mission-breadcrumb" aria-label="سياق المهمة">
        <span title={projection.projectLabelAr}>{projection.projectLabelAr}</span><b>←</b>
        <span>{projection.dayLabelAr}</span><b>←</b>
        <span>{projection.personaLabelAr}</span><b>←</b>
        <strong>{projection.momentLabelAr}</strong>
      </nav>
      <label className="mission-compact-select">
        <span>الوضع</span>
        <select data-testid="mission-mode-select" value={projection.context.missionMode} onChange={(event) => props.onMissionChange({ missionMode: event.target.value as MissionMode })}>
          {missionModeValues.map((mode) => <option key={mode} value={mode}>{modeLabels[mode]}</option>)}
        </select>
      </label>
      <div className="mission-lenses" aria-label="عدسات المهمة">
        {missionLensValues.map((lens) => {
          const Icon = lensLabels[lens].icon;
          return (
            <button key={lens} data-testid={`mission-lens-${lens}`} type="button" aria-pressed={projection.context.missionLens === lens} onClick={() => props.onMissionChange({ missionLens: lens, view: 'world' })}>
              <Icon /><span>{lensLabels[lens].labelAr}</span>
            </button>
          );
        })}
      </div>
      <div className="mission-context-actions">
        <button data-testid="mission-truth-toggle" type="button" className="mission-truth-badge" aria-pressed={routeState.truthOpen} onClick={() => props.onMissionChange({ truthOpen: !routeState.truthOpen })}>
          <ShieldCheck /><span>{projection.context.truthContext.sourceStatus === 'candidate' ? 'مصدر مرشح' : projection.context.truthContext.sourceStatus === 'missing' ? 'المصدر مفقود' : 'حقيقة المصدر'}</span>
        </button>
        <label className="mission-presentation-select">
          <span className="sr-only">عمق العرض</span>
          <select
            data-testid="mission-presentation-select"
            value={routeState.presentation}
            onChange={(event) => {
              const presentation = event.target.value as MissionPresentation;
              props.onMissionChange({ presentation, truthOpen: presentation === 'technical' });
            }}
          >
            {missionPresentationValues.map((item) => <option key={item} value={item}>{presentationLabels[item]}</option>)}
          </select>
        </label>
        {props.onExit ? <button className="mission-exit" type="button" onClick={props.onExit} aria-label="العودة إلى المشاريع"><ArrowLeft /></button> : null}
      </div>
    </header>
  );
}

function PresentationSpatialArtwork({ props, variant }: { props: MissionCanvasProps; variant: 'entry' | 'living' }) {
  const goldenJourney = props.configuration.goldenJourney;
  if (!goldenJourney) return null;
  const source = goldenJourney.spatialArtworkSource;
  const derivative = goldenJourney.livingPresentationDerivative;
  const maskedNumbers = new Set(derivative.maskedSourceNumbers);
  const maskedMarkers = props.markers.filter((marker) => maskedNumbers.has(marker.sourceNumber));
  const clipId = `mission-source-marker-clip-${variant}`;
  const filterId = `mission-source-marker-filter-${variant}`;
  const legendGradientId = `mission-source-legend-gradient-${variant}`;
  return (
    <svg
      className={`mission-presentation-artwork is-${variant}`}
      data-testid={`mission-${variant}-presentation-artwork`}
      data-derivative-id={derivative.derivativeId}
      data-derivative-truth={derivative.truthStatus}
      data-source-asset-id={source.sourceAssetId}
      data-source-sha256={source.sha256}
      data-source-marker-mask-count={maskedMarkers.length}
      data-mask-coordinate-space={derivative.coordinateSpace}
      viewBox={`0 0 ${source.intrinsicWidth} ${source.intrinsicHeight}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${goldenJourney.spatialArtworkAltAr} · ${derivative.labelAr}`}
    >
      <title>{goldenJourney.spatialArtworkAltAr}</title>
      <desc>{derivative.labelAr}</desc>
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          {maskedMarkers.map((marker) => (
            <circle
              key={marker.entityId}
              data-source-number={marker.sourceNumber}
              cx={marker.x * source.intrinsicWidth}
              cy={marker.y * source.intrinsicHeight}
              r={derivative.markerMaskRadius}
            />
          ))}
        </clipPath>
        <filter id={filterId} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="13" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="0.36" intercept="0.64" />
            <feFuncG type="linear" slope="0.36" intercept="0.64" />
            <feFuncB type="linear" slope="0.36" intercept="0.64" />
          </feComponentTransfer>
        </filter>
        <linearGradient id={legendGradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#123f33" />
          <stop offset="1" stopColor="#0b3027" />
        </linearGradient>
      </defs>
      <image
        className="mission-presentation-source-image"
        href={goldenJourney.spatialArtworkUri}
        width={source.intrinsicWidth}
        height={source.intrinsicHeight}
        preserveAspectRatio="none"
      />
      <g clipPath={`url(#${clipId})`} aria-hidden="true">
        <image
          href={goldenJourney.spatialArtworkUri}
          width={source.intrinsicWidth}
          height={source.intrinsicHeight}
          preserveAspectRatio="none"
          filter={`url(#${filterId})`}
        />
        <rect width={source.intrinsicWidth} height={source.intrinsicHeight} fill="#f2ecdf" fillOpacity="0.68" />
      </g>
      <rect
        className="mission-presentation-source-legend-cover"
        x={derivative.legendMaskStartX}
        y="0"
        width={source.intrinsicWidth - derivative.legendMaskStartX}
        height={source.intrinsicHeight}
        fill={`url(#${legendGradientId})`}
        aria-hidden="true"
      />
    </svg>
  );
}

function EntryStage({ props }: { props: MissionCanvasProps }) {
  const { configuration, pack, selection, projection } = props;
  const currentDay = pack.eventDays.find((day) => day.eventDayId === selection.eventDayId) ?? null;
  const personas = pack.personas.filter((persona) => currentDay?.personaIds.includes(persona.personaId));
  return (
    <section className="mission-entry-stage" data-testid="mission-living-entry">
      <div className="mission-entry-artwork">
        <PresentationSpatialArtwork props={props} variant="entry" />
        <div className="mission-entry-source-mask" data-testid="mission-entry-source-mask" aria-hidden="true"><span>مشتق عرض بصري فقط</span></div>
      </div>
      <div className="mission-entry-shade" />
      <div className="mission-entry-orbit" aria-hidden="true"><i /><i /><i /></div>
      <div className="mission-entry-copy">
        <small>THE LIVING EVENT WORLD</small>
        <h1>{projection.projectLabelAr}</h1>
        <p>{configuration.eventWindowAr} · {configuration.dayCountLabelAr} · عالم واحد تتبدل فوقه عدسات التجربة والمكان والتشغيل والقرار والبروفة دون تغيير الحقيقة.</p>
        <dl>
          <div><dt>اليوم</dt><dd>{projection.dayLabelAr}</dd></div>
          <div><dt>الشخصية</dt><dd>{projection.personaLabelAr}</dd></div>
          <div><dt>الرحلة</dt><dd>{projection.journeyLabelAr}</dd></div>
        </dl>
        <button data-testid="mission-start-journey" type="button" onClick={() => props.onMissionChange({ view: 'world', missionLens: 'experience', presentation: 'client' })}><span>ابدأ الرحلة</span><ChevronLeft /></button>
      </div>
      <div className="mission-entry-selectors">
        <div className="mission-day-selector" aria-label="الأيام الأربعة">
          {pack.eventDays.map((day, index) => <button key={day.eventDayId} type="button" aria-pressed={selection.eventDayId === day.eventDayId} onClick={() => props.onSelectDay(day.eventDayId)}><i>{index + 1}</i><span>{day.labelAr}</span><small>{day.operationalJourneyStatus === 'not-applicable' ? 'لا رحلة تشغيلية' : 'سياق مرشح'}</small></button>)}
        </div>
        <div className="mission-persona-selector"><span><UsersRound />الشخصية</span>{personas.map((persona) => <button key={persona.personaId} type="button" aria-pressed={selection.personaId === persona.personaId} onClick={() => props.onSelectPersona(persona.personaId)}>{persona.labelAr}</button>)}</div>
      </div>
    </section>
  );
}

function JourneyRail({ props, expanded, onExpandedChange, playing, onPlayingChange, truthMap }: { props: MissionCanvasProps; expanded: boolean; onExpandedChange: (value: boolean) => void; playing: boolean; onPlayingChange: (value: boolean) => void; truthMap: boolean }) {
  const journey = props.routeProjection.journey;
  const activeWaypoint = props.routeProjection.waypoint;
  const activeIndex = journey?.waypoints.findIndex((item) => item.waypointId === activeWaypoint?.waypointId) ?? -1;
  const activeButtonRef = useRef<HTMLButtonElement | null>(null);
  const waypointButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const effectiveExpanded = expanded && !truthMap;
  const visibleWaypoints = effectiveExpanded
    ? journey?.waypoints ?? []
    : (journey?.waypoints ?? []).filter((_, index) => index >= Math.max(0, activeIndex - 1) && index <= Math.max(2, activeIndex + 1));
  const move = (delta: -1 | 1) => {
    if (!journey) return;
    const next = journey.waypoints[Math.max(0, Math.min(journey.waypoints.length - 1, Math.max(0, activeIndex) + delta))];
    if (next) props.onSelectWaypoint(next.waypointId);
  };
  useEffect(() => {
    if (!effectiveExpanded) return;
    activeButtonRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [activeWaypoint?.waypointId, effectiveExpanded]);
  const lastLetter = journey?.waypoints.at(-1)?.sourceLetter ?? null;
  return (
    <div
      className={`mission-journey-rail ${effectiveExpanded ? 'is-expanded' : ''} ${truthMap ? 'is-truth-map' : ''}`}
      data-testid="mission-journey-rail"
      onKeyDown={(event) => {
        if (!effectiveExpanded || !journey || !['ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowRight'].includes(event.key)) return;
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-journey-index]');
        if (!button) return;
        const currentIndex = Number(button.dataset.journeyIndex);
        const delta = event.key === 'ArrowDown' || event.key === 'ArrowLeft' ? 1 : -1;
        const nextIndex = Math.max(0, Math.min(journey.waypoints.length - 1, currentIndex + delta));
        const next = journey.waypoints[nextIndex];
        if (!next) return;
        event.preventDefault();
        const nextButton = waypointButtonRefs.current.get(next.waypointId);
        nextButton?.focus({ preventScroll: true });
        nextButton?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      }}
    >
      <div className="mission-journey-rail-controls">
        <button type="button" onClick={() => move(-1)} aria-label="اللحظة السابقة"><ChevronRight /></button>
        <button data-testid="mission-journey-play" type="button" className="is-primary" aria-pressed={playing} onClick={() => onPlayingChange(!playing)}>{playing ? <Pause /> : <Play />}{playing ? 'إيقاف' : 'تشغيل'}</button>
        <button type="button" onClick={() => move(1)} aria-label="اللحظة التالية"><ChevronLeft /></button>
      </div>
      <div className="mission-journey-rail-sequence" aria-label="تسلسل التجربة المرشح" tabIndex={-1}>
        {visibleWaypoints.map((waypoint) => {
          const index = journey?.waypoints.findIndex((item) => item.waypointId === waypoint.waypointId) ?? -1;
          const state = index < activeIndex ? 'previous' : index === activeIndex ? 'current' : 'next';
          const hasAnchor = waypoint.destinationIds.length > 0;
          return (
            <button
              ref={(node) => {
                if (node) waypointButtonRefs.current.set(waypoint.waypointId, node);
                else waypointButtonRefs.current.delete(waypoint.waypointId);
                if (state === 'current' && node) activeButtonRef.current = node;
              }}
              key={waypoint.waypointId}
              data-testid={`mission-rail-waypoint-${waypoint.sourceLetter}`}
              data-journey-index={index}
              type="button"
              data-state={state}
              aria-label={`${waypoint.sourceLetter} ${waypoint.sourceLabelAr}`}
              aria-current={state === 'current' ? 'step' : undefined}
              onClick={() => props.onSelectWaypoint(waypoint.waypointId)}
            >
              <i>{waypoint.sourceLetter}</i><span>{waypoint.sourceLabelAr}</span>{effectiveExpanded ? <small>{hasAnchor ? 'مرساة مرشحة معروفة' : 'الموقع أو المسار غير محسوم'}</small> : null}
            </button>
          );
        })}
      </div>
      {truthMap ? <button type="button" className="mission-journey-expand" onClick={() => props.onMissionChange({ worldSurface: 'living-map' })}>العودة للخريطة الحية</button> : <button data-testid="mission-journey-expand" type="button" className="mission-journey-expand" aria-expanded={effectiveExpanded} onClick={() => onExpandedChange(!effectiveExpanded)}>{effectiveExpanded ? 'اختصار الرحلة' : 'عرض الرحلة كاملة'}</button>}
      <span className="mission-narrative-truth">تسلسل تجربة مرشح — ليس مسارًا مكانيًا معتمدًا</span>
      {effectiveExpanded && lastLetter ? <span className="mission-journey-scroll-affordance" aria-hidden="true">المزيد بالأسفل · الرحلة ممتدة حتى {lastLetter}</span> : null}
    </div>
  );
}

function LivingMap({ props }: { props: MissionCanvasProps }) {
  const mapPresentation = props.routeState.worldSurface === 'truth-map' ? 'truth' : 'living';
  const markerByEntity = useMemo(() => new Map(props.markers.map((marker) => [marker.entityId, marker])), [props.markers]);
  const points = useMemo(() => props.routeProjection.journey?.waypoints.flatMap((waypoint, index) => {
    const marker = waypoint.destinationIds.map((entityId) => markerByEntity.get(entityId) ?? null).find(Boolean);
    return marker ? [{ marker, waypoint, index }] : [];
  }) ?? [], [markerByEntity, props.routeProjection.journey]);
  const activeWaypoint = props.routeProjection.waypoint;
  const activeIndex = props.routeProjection.journey?.waypoints.findIndex((item) => item.waypointId === activeWaypoint?.waypointId) ?? -1;
  const journeyNotApplicable = props.routeProjection.status === 'journey-not-applicable';
  return (
    <div className={`mission-map-world is-${mapPresentation}`} data-testid="mission-world-map" data-map-presentation={mapPresentation} data-source-legend={mapPresentation === 'truth' ? 'visible' : 'masked'}>
      {mapPresentation === 'living' ? (
        <PresentationSpatialArtwork props={props} variant="living" />
      ) : (
        <img
          data-testid="mission-truth-source-artwork"
          data-source-asset-id={props.configuration.goldenJourney?.spatialArtworkSource.sourceAssetId}
          data-source-sha256={props.configuration.goldenJourney?.spatialArtworkSource.sha256}
          src={props.configuration.goldenJourney?.spatialArtworkUri}
          alt={props.configuration.goldenJourney?.spatialArtworkAltAr ?? 'مرجع مكاني'}
        />
      )}
      <div className="mission-world-toning" />
      {mapPresentation === 'living' ? <div className="mission-source-legend-mask" data-testid="mission-source-legend-mask" aria-hidden="true"><span>الخريطة الحية</span><small>مشتق عرض فقط · المرجع الأصلي الكامل متاح في خريطة الحقيقة</small></div> : null}
      <div className="mission-map-heading">
        <small>{mapPresentation === 'living' ? 'الخريطة الحية للتجربة' : 'خريطة الحقيقة'}</small>
        <h2>{props.projection.momentLabelAr}</h2>
        <p>{props.projection.personaLabelAr} · {props.projection.dayLabelAr}</p>
      </div>
      <div className="mission-map-mode" aria-label="عرض الخريطة">
        <button type="button" aria-pressed={mapPresentation === 'living'} onClick={() => props.onMissionChange({ worldSurface: 'living-map' })}>الخريطة الحية</button>
        <button type="button" aria-pressed={mapPresentation === 'truth'} onClick={() => props.onMissionChange({ worldSurface: 'truth-map' })}>خريطة الحقيقة</button>
      </div>
      {journeyNotApplicable ? (
        <div className="mission-route-not-applicable" data-testid="mission-route-not-applicable"><CircleDot /><small>حقيقة اليوم</small><strong>لا تنطبق رحلة تشغيلية مشتركة</strong><p>يبقى اليوم ظاهرًا كسياق احتفالي ومحتوى سردي، بلا مسار أو خط انتقال أو مدة سفر مفترضة.</p></div>
      ) : null}
      {mapPresentation === 'living' && !journeyNotApplicable ? points.map(({ marker, waypoint, index }) => {
        const state = index < activeIndex ? 'previous' : index === activeIndex ? 'current' : 'next';
        return (
          <button key={waypoint.waypointId} data-testid={`mission-map-point-${waypoint.sourceLetter}`} data-state={state} className={`mission-map-point ${activeWaypoint?.waypointId === waypoint.waypointId ? 'is-active' : ''} ${marker.entityId === props.configuration.goldenJourney?.featuredEntityId ? 'is-featured' : ''}`} style={{ insetInlineStart: `${marker.displayX * 100}%`, top: `${marker.displayY * 100}%` }} type="button" onClick={() => props.onSelectWaypoint(waypoint.waypointId)}>
            <i>{waypoint.sourceLetter}</i><span>{waypoint.sourceLabelAr}</span>
          </button>
        );
      }) : null}
      {mapPresentation === 'truth' ? <div className="mission-truth-map-note"><ShieldCheck /><span>مرجع مكاني مسجل بمصادره الأصلية</span><small>أرقام الخطة الظاهرة تخص مفتاح المصدر وحده. لا توجد فوقها أرقام مولدة.</small></div> : null}
      {mapPresentation === 'living' && !journeyNotApplicable ? <div className="mission-map-truth-note"><AlertTriangle /><span>تُضاء المراسي المعروفة فقط</span><small>انتقال سردي مرشح — الموقع أو المسار غير محسوم</small></div> : null}
    </div>
  );
}

function ExperienceOverlay({ props }: { props: MissionCanvasProps }) {
  const experience = props.projection.experience;
  return (
    <section className="mission-lens-overlay mission-experience-overlay" data-testid="mission-experience-lens">
      <header><Eye /><div><small>عدسة التجربة</small><strong>{props.projection.entityLabelAr}</strong></div></header>
      <dl>
        <div><dt>ما يراه الضيف</dt><dd>{experience.seesAr}</dd></div>
        <div><dt>ما يفعله</dt><dd>{experience.doesAr}</dd></div>
        <div><dt>الشعور المقصود</dt><dd>{experience.intendedFeelingAr}</dd></div>
        <div><dt>الاحتكاك الأهم</dt><dd>{experience.frictionPointsAr[0] ?? 'غير موثق في المصدر'}</dd></div>
      </dl>
      <p><span>التالي</span>{experience.nextActionAr}</p>
      {props.routeProjection.mayOpenDesignScene ? <button data-testid="mission-enter-web3d" type="button" onClick={props.onOpenDesignScene}><Box />ادخل إلى معاينة التصميم ثلاثية الأبعاد</button> : null}
    </section>
  );
}

function SpatialOverlay({ props }: { props: MissionCanvasProps }) {
  return (
    <section className="mission-lens-overlay mission-spatial-overlay" data-testid="mission-spatial-lens">
      <header><MapPinned /><div><small>عدسة المكان</small><strong>معاينة التصميم ثلاثية الأبعاد</strong></div></header>
      <dl>
        <div><dt>المصدر</dt><dd>{props.projection.spatial.sourceAr}</dd></div>
        <div><dt>العلاقة</dt><dd>{props.projection.spatial.relationshipAr}</dd></div>
        <div><dt>التسجيل الهندسي</dt><dd>{props.projection.spatial.engineeringStatusAr}</dd></div>
      </dl>
      <span className="mission-scene-truth">مشتق تصميم متحقق · غير مسجل هندسيًا</span>
      <button className="mission-behind-experience" data-testid="mission-behind-experience" type="button" onClick={() => props.onMissionChange({ missionLens: 'operations', view: 'world', presentation: 'command' })}><Layers3 />عرض ما وراء التجربة<ChevronLeft /></button>
    </section>
  );
}

function OperationsOverlay({ projection }: { projection: MissionGraphProjection }) {
  const primaryBlocker = projection.operations.blockerLabelsAr[0] ?? 'لا يوجد عائق مؤهل في المصدر الحالي';
  return (
    <section className="mission-lens-overlay mission-operations-overlay" data-testid="mission-operations-lens">
      <header><Gauge /><div><small>عدسة التشغيل · على العنصر نفسه</small><strong>{projection.entityLabelAr}</strong></div></header>
      <div className="mission-object-tree">
        <p><span>الجاهزية</span><strong>لا يمكن تحديدها</strong></p>
        <p><span>المالك</span><strong>{projection.operations.ownerAr}</strong></p>
        <p><span>الدليل</span><strong>{projection.operations.evidenceStateAr}</strong></p>
        <p><span>الإشارة الحية</span><strong>{projection.operations.liveSourceMessageAr}</strong></p>
        <p><span>العائق الأهم</span><strong>{primaryBlocker}</strong></p>
        <p><span>الإجراء التالي</span><strong>تعيين السلطة والمالك وربط الدليل المؤهل</strong></p>
      </div>
    </section>
  );
}

function DecisionOverlay({ projection }: { projection: MissionGraphProjection }) {
  const primaryBlocker = projection.operations.blockerLabelsAr[0] ?? 'العائق غير محدد';
  const nodes = [
    { label: 'العنصر', value: projection.entityLabelAr, known: true },
    { label: 'العائق', value: primaryBlocker, known: Boolean(projection.operations.blockerLabelsAr.length) },
    { label: 'السلطة', value: projection.decision.authorityAr, known: false },
    { label: 'الدليل', value: projection.operations.evidenceStateAr, known: false },
    { label: 'حالة القرار', value: projection.decision.legalRecordAvailable ? 'سياق قرار قائم للقراءة' : 'لم يُنشأ قرار تشغيلي معتمد لهذه اللحظة', known: projection.decision.legalRecordAvailable },
    { label: 'الإجراء التالي', value: projection.decision.requiredActionAr, known: true }
  ];
  return (
    <section className="mission-lens-overlay mission-decision-overlay" data-testid="mission-decision-lens">
      <header><BrainCircuit /><div><small>عدسة القرار · نفس اللحظة والمكان</small><strong>{projection.decision.legalRecordAvailable ? 'سياق قرار مرتبط' : 'لم يُنشأ قرار تشغيلي معتمد لهذه اللحظة'}</strong></div></header>
      <div className="mission-decision-chain" aria-label="علاقة العنصر بالعائق والسلطة والدليل والقرار">
        {nodes.map((node, index) => <div key={node.label} data-known={node.known ? 'true' : 'false'}><i>{index + 1}</i><span>{node.label}</span><strong>{node.value}</strong></div>)}
      </div>
      <p className="mission-lawful-boundary"><ShieldCheck />لا اعتماد تلقائي · لا تعديل جاهزية · لا قرار افتتاح</p>
    </section>
  );
}

function FutureOverlay({ props }: { props: MissionCanvasProps }) {
  const { future } = props.projection;
  return (
    <section className="mission-lens-overlay mission-future-overlay" data-testid="mission-future-lens">
      <header><Sparkles /><div><small>عدسة المستقبل · بروفة مرشحة</small><strong>{props.projection.entityLabelAr}</strong></div></header>
      <div className="mission-rehearsal-sequence"><span>قبل</span><strong>اللحظة الحالية · {props.projection.momentLabelAr}</strong><span>التالي · {props.projection.nextMomentLabelAr ?? 'غير محدد'}</span></div>
      <p>{future.rehearsalStateAr}</p>
      <div className="mission-assumptions"><span>الافتراضات</span>{future.assumptionsAr.slice(0, 3).map((item) => <b key={item}>{item}</b>)}</div>
      <div className="mission-unavailable-engine"><Cpu /><span>المحرك المستقبلي</span><strong>{future.simulationMessageAr}</strong><small>لا توجد توقعات أو قيم محاكاة مصطنعة.</small></div>
      <button data-testid="mission-open-tangible" type="button" onClick={() => props.onMissionChange({ view: 'tangible', missionLens: 'future' })}><MonitorUp />معاينة الإخراج المادي</button>
    </section>
  );
}

function TangibleOverlay({ props }: { props: MissionCanvasProps }) {
  const output = props.projection.tangible;
  return (
    <section className="mission-lens-overlay mission-tangible-overlay" data-testid="mission-tangible-surface" data-projection-version={output.projectionVersion}>
      <header><MonitorUp /><div><small>TANGIBLE COMMAND SURFACE</small><strong>معاينة إخراج مادي — لا يوجد جهاز متصل</strong></div></header>
      <div className="mission-output-flow"><span>العالم الرقمي<small>{props.projection.entityLabelAr}</small></span><ChevronLeft /><span>موائم الإخراج المادي<small>غير متصل</small></span><ChevronLeft /><span>معاينة السطح المادي<small>{output.selectedEntityId ? 'الكيان نفسه محدد' : 'لا منطقة مضاءة'}</small></span></div>
      <ul>
        <li><CheckCircle2 />نفس اليوم والشخصية والرحلة والكيان</li>
        <li><CheckCircle2 />نسخة الإسقاط نفسها</li>
        <li><AlertTriangle />لا ملف نشر أو معايرة أو جهاز متصل</li>
        <li><AlertTriangle />لا تحكم أجهزة ولا ادعاء مطابقة</li>
      </ul>
      <div className="mission-output-targets">{output.targetSurfaces.map((target) => <span key={target}>{target === 'physical-model' ? 'المجسم' : target === 'projection-mapping' ? 'الإسقاط' : target === 'command-wall' ? 'جدار القيادة' : 'طاولة اللمس'}</span>)}</div>
      <button type="button" onClick={props.onReturnToWorldMap}><ArrowLeft />العودة إلى العالم الحي</button>
    </section>
  );
}

function LensOverlay({ props }: { props: MissionCanvasProps }) {
  if (props.routeState.view === 'tangible') return <TangibleOverlay props={props} />;
  if (props.projection.context.missionLens === 'experience') return <ExperienceOverlay props={props} />;
  if (props.projection.context.missionLens === 'spatial') return <SpatialOverlay props={props} />;
  if (props.projection.context.missionLens === 'operations') return <OperationsOverlay projection={props.projection} />;
  if (props.projection.context.missionLens === 'decision') return <DecisionOverlay projection={props.projection} />;
  return <FutureOverlay props={props} />;
}

function NowStrip({ projection }: { projection: MissionGraphProjection }) {
  return (
    <div className="mission-now-strip" data-testid="mission-now-rail">
      <header><Radio /><span>الآن · {projection.entityLabelAr}</span></header>
      {projection.nowItems.slice(0, 3).map((item) => <article key={item.itemId} data-kind={item.kind}><span>{item.labelAr}</span><strong>{item.valueAr}</strong></article>)}
    </div>
  );
}

function WorldStage({ props, playing, onPlayingChange, expandedJourney, onExpandedJourneyChange }: { props: MissionCanvasProps; playing: boolean; onPlayingChange: (value: boolean) => void; expandedJourney: boolean; onExpandedJourneyChange: (value: boolean) => void }) {
  const journeyNotApplicable = props.routeProjection.status === 'journey-not-applicable';
  const sceneActive = props.routeState.worldSurface === 'web3d' && props.projection.spatial.web3dAvailable;
  const truthMap = props.routeState.worldSurface === 'truth-map';
  return (
    <div className="mission-world-layout" data-presentation={props.routeState.presentation} data-view={props.routeState.view}>
      <main className={`mission-world-stage ${sceneActive ? 'is-scene' : 'is-map'}`} data-testid="mission-world-stage" data-world-instance="mission-world-stage" data-world-representation={sceneActive ? 'web3d' : 'map'} data-day-id={props.projection.context.dayId ?? 'none'} data-persona-id={props.projection.context.personaId ?? 'none'} data-journey-id={props.projection.context.journeyId ?? 'none'} data-waypoint-id={props.selection.operationalJourneyWaypointId ?? 'none'} data-entity-id={props.projection.context.entityId ?? 'none'} data-zone-id={props.projection.context.zoneId ?? 'none'}>
        <div className="mission-world-surface">
          {sceneActive ? (
            <div className="mission-scene-world" data-testid="mission-world-web3d">
              {props.scene}
            </div>
          ) : <LivingMap props={props} />}
        </div>
        {!sceneActive && !journeyNotApplicable && props.projection.context.missionLens === 'experience' ? <JourneyRail props={props} expanded={expandedJourney} onExpandedChange={onExpandedJourneyChange} playing={playing} onPlayingChange={onPlayingChange} truthMap={truthMap} /> : null}
        {props.routeState.view === 'tangible' ? <div className="mission-tangible-world-link" aria-hidden="true"><span>العالم الرقمي</span><i /><span>نسخة الإسقاط {props.projection.context.projectionVersion.slice(-8)}</span></div> : null}
      </main>
      <aside className="mission-insight-panel" data-testid="mission-lens-panel"><LensOverlay props={props} />{props.routeState.presentation === 'client' ? null : <NowStrip projection={props.projection} />}</aside>
    </div>
  );
}

function MissionTimeline({ props }: { props: MissionCanvasProps }) {
  const phases: Array<{ mode: MissionMode; label: string; statusAr: string; state: 'planned' | 'rehearsal-candidate' | 'source-unavailable' | 'unverified' }> = [
    { mode: 'plan', label: 'خطط', statusAr: 'مخطط', state: 'planned' },
    { mode: 'plan', label: 'جهّز', statusAr: 'غير متحقق', state: 'unverified' },
    { mode: 'rehearse', label: 'تدرّب', statusAr: props.projection.future.rehearsalAvailable ? 'بروفة مرشحة' : 'غير متاح', state: 'rehearsal-candidate' },
    { mode: 'live', label: 'شغّل', statusAr: 'لا مصدر حي', state: 'source-unavailable' },
    { mode: 'learn', label: 'تعلّم', statusAr: 'لا أثر فعلي', state: 'unverified' }
  ];
  const currentPhaseIndex = props.projection.context.missionMode === 'plan' ? 0 : props.projection.context.missionMode === 'rehearse' ? 2 : props.projection.context.missionMode === 'live' ? 3 : props.projection.context.missionMode === 'learn' ? 4 : -1;
  return (
    <footer className="mission-timeline" data-testid="mission-timeline">
      <div className="mission-phase-track">{phases.map((phase, index) => <button key={`${phase.mode}-${index}`} type="button" data-state={phase.state} aria-current={currentPhaseIndex === index ? 'step' : undefined} onClick={() => props.onMissionChange({ missionMode: phase.mode })}><i>{index + 1}</i><span>{phase.label}</span><small>{phase.statusAr}</small></button>)}</div>
      <div className="mission-four-days"><CalendarDays />{props.pack.eventDays.map((day) => <button key={day.eventDayId} type="button" aria-pressed={props.selection.eventDayId === day.eventDayId} onClick={() => props.onSelectDay(day.eventDayId)}>{day.labelAr}</button>)}</div>
    </footer>
  );
}

function TruthDrawer({ props }: { props: MissionCanvasProps }) {
  const truth = props.projection.context.truthContext;
  const relation = props.routeProjection.designRelation;
  return (
    <aside className="mission-truth-drawer" data-testid="mission-truth-drawer">
      <header><div><small>SOURCE TRUTH</small><h2>حقيقة المصدر والسياق</h2></div><button type="button" aria-label="إغلاق حقيقة المصدر" onClick={() => props.onMissionChange({ truthOpen: false })}><X /></button></header>
      <dl>
        <div><dt>المصدر</dt><dd>{truth.sourceLabelAr}</dd></div>
        <div><dt>الإصدار</dt><dd>{truth.sourceVersion ?? 'غير مسجل'}</dd></div>
        <div><dt>وقت المصدر</dt><dd>{truth.timestamp ?? 'غير مسجل · لا ساعة موثوقة'}</dd></div>
        <div><dt>سلطة المصدر</dt><dd>{truth.authority}</dd></div>
        <div><dt>ثقة المصدر</dt><dd>{truth.confidence}</dd></div>
        <div><dt>تصنيف الحقيقة</dt><dd>{truth.classification}</dd></div>
        <div><dt>حالة دورة الحياة</dt><dd>{truth.sourceStatus}</dd></div>
        <div><dt>حالة العلاقة</dt><dd>{relation?.status ?? 'unresolved'}</dd></div>
        <div><dt>ثقة العلاقة</dt><dd>{relation?.confidence ?? 'unknown'}</dd></div>
        <div><dt>حالة السلطة</dt><dd>{props.routeProjection.missingApprovalLabelsAr.length ? 'سلطات واعتمادات مفقودة' : 'غير مثبتة'}</dd></div>
      </dl>
      <section><strong>تبعيات مفقودة</strong>{truth.missingDependenciesAr.length ? truth.missingDependenciesAr.map((item) => <p key={item}><AlertTriangle />{item}</p>) : <p><CheckCircle2 />لا تبعية مفقودة مسجلة في هذا الإسقاط</p>}</section>
      {props.routeState.presentation === 'technical' ? <section className="mission-technical-identity"><strong>تفاصيل تقنية</strong><code>{props.projection.context.projectionVersion}</code><code>{props.projection.context.routeWaypointId ?? 'waypoint:none'}</code><code>{props.projection.context.stepId ?? 'step:none'}</code><code>{props.projection.context.entityId ?? 'entity:none'}</code><code>{props.projection.context.zoneId ?? 'zone:none'}</code><code>{props.projection.context.areaId ?? 'area:none'}</code><code>{props.projection.context.sceneId ?? 'scene:none'}</code></section> : null}
      <footer>المصدر المرشح لا يثبت الجاهزية أو التسجيل الهندسي أو اعتماد المسار.</footer>
    </aside>
  );
}

function revealAction(props: MissionCanvasProps): { labelAr: string; run: () => void } {
  const featuredWaypoint = props.routeProjection.journey?.waypoints.find((waypoint) => waypoint.destinationIds.includes(props.configuration.goldenJourney?.featuredEntityId ?? '')) ?? null;
  if (props.routeState.view === 'tangible') return { labelAr: 'العودة إلى العالم الحي', run: props.onReturnToWorldMap };
  if (props.projection.context.missionLens === 'experience' && featuredWaypoint && props.routeProjection.waypoint?.waypointId !== featuredWaypoint.waypointId) {
    return { labelAr: 'التالي · ركّز ممر العصور', run: () => props.onSelectWaypoint(featuredWaypoint.waypointId) };
  }
  if (props.projection.context.missionLens === 'experience') return { labelAr: 'التالي · ادخل التصميم', run: props.onOpenDesignScene };
  if (props.projection.context.missionLens === 'spatial') return { labelAr: 'التالي · ما وراء التجربة', run: () => props.onMissionChange({ missionLens: 'operations', view: 'world', presentation: 'command' }) };
  if (props.projection.context.missionLens === 'operations') return { labelAr: 'التالي · حالة القرار', run: () => props.onMissionChange({ missionLens: 'decision', view: 'world', presentation: 'command' }) };
  if (props.projection.context.missionLens === 'decision') return { labelAr: 'التالي · البروفة', run: () => props.onMissionChange({ missionLens: 'future', missionMode: 'rehearse', view: 'world', presentation: 'command' }) };
  return { labelAr: 'التالي · الإخراج المادي', run: () => props.onMissionChange({ view: 'tangible', missionLens: 'future', presentation: 'command' }) };
}

export function MissionCanvas(props: MissionCanvasProps) {
  const [journeyPlaying, setJourneyPlaying] = useState(false);
  const [expandedJourney, setExpandedJourney] = useState(() => typeof window !== 'undefined' && window.location.hash === '#journey-expanded');
  const activeIndex = props.routeProjection.journey?.waypoints.findIndex((waypoint) => waypoint.waypointId === props.routeProjection.waypoint?.waypointId) ?? -1;
  const nextWaypointId = props.routeProjection.journey?.waypoints[activeIndex + 1]?.waypointId ?? null;
  const stopAfterNextWaypoint = activeIndex + 1 === (props.routeProjection.journey?.waypoints.length ?? 0) - 1;
  const missionLens = props.projection.context.missionLens;
  const missionView = props.routeState.view;
  const onSelectWaypoint = props.onSelectWaypoint;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'مَيادين | مركز قيادة العالم الحي للفعالية';
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    if (!journeyPlaying || missionLens !== 'experience' || missionView !== 'world' || !nextWaypointId) return;
    const timeout = window.setTimeout(() => {
      onSelectWaypoint(nextWaypointId);
      if (stopAfterNextWaypoint) setJourneyPlaying(false);
    }, 1_900);
    return () => window.clearTimeout(timeout);
  }, [journeyPlaying, missionLens, missionView, nextWaypointId, onSelectWaypoint, stopAfterNextWaypoint]);

  if (props.errorAr) return <section className="mission-canvas mission-context-error" data-testid="mission-context-error" lang="ar" dir="rtl"><FileQuestion /><h1>تعذر فتح سياق المهمة</h1><p>{props.errorAr}</p><button type="button" onClick={props.onExit}>العودة إلى المشاريع</button></section>;

  const modeNotice = props.projection.context.missionMode === 'live' ? 'لا يوجد مصدر حي متصل' : props.projection.context.missionMode === 'incident' ? 'لم يتم إنشاء حادث' : props.projection.context.missionMode === 'learn' ? 'التعلم لا يغيّر الخطة تلقائيًا' : null;
  const nextReveal = revealAction(props);
  const showRevealAction = props.routeState.view !== 'entry'
    && props.routeState.worldSurface !== 'truth-map'
    && !expandedJourney;
  return (
    <section className={`mission-canvas mission-presentation-${props.routeState.presentation}`} data-testid="mission-canvas" data-mission-lens={props.projection.context.missionLens} data-world-surface={props.routeState.worldSurface} data-truth-open={props.routeState.truthOpen ? 'true' : 'false'} data-day-id={props.projection.context.dayId ?? 'none'} data-persona-id={props.projection.context.personaId ?? 'none'} data-journey-id={props.projection.context.journeyId ?? 'none'} data-route-journey-id={props.projection.context.routeJourneyId ?? 'none'} data-waypoint-id={props.projection.context.routeWaypointId ?? 'none'} data-entity-id={props.projection.context.entityId ?? 'none'} data-zone-id={props.projection.context.zoneId ?? 'none'} data-area-id={props.projection.context.areaId ?? 'none'} data-step-id={props.projection.context.stepId ?? 'none'} data-scene-id={props.projection.context.sceneId ?? 'none'} data-relationship-status={props.projection.context.spatialRelationshipStatus} data-relationship-confidence={props.projection.context.spatialRelationshipConfidence} data-projection-version={props.projection.context.projectionVersion} lang="ar" dir="rtl">
      <ContextBar props={props} />
      {modeNotice ? <div className="mission-mode-notice" role="status">{modeNotice}</div> : null}
      <div className="mission-central-stage">
        {props.routeState.view === 'entry' ? <EntryStage props={props} /> : <WorldStage props={props} playing={journeyPlaying} onPlayingChange={setJourneyPlaying} expandedJourney={expandedJourney} onExpandedJourneyChange={setExpandedJourney} />}
      </div>
      <MissionTimeline props={props} />
      {showRevealAction ? <button className="mission-reveal-next" data-testid="mission-reveal-next" type="button" onClick={nextReveal.run}>{nextReveal.labelAr}<ChevronLeft /></button> : null}
      {props.routeState.truthOpen ? <TruthDrawer props={props} /> : null}
    </section>
  );
}

export default MissionCanvas;
