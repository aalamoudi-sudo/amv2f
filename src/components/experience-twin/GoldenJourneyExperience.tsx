import {
  ArrowLeft,
  ArrowRight,
  Box,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  MapPinned,
  Pause,
  Play,
  Radar,
  Route,
  ShieldCheck,
  UserRound,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DeclutteredExperienceMarker, ExperienceTwinConfiguration } from '../../data/experienceTwinConfigurations';
import type { RouteDesignConvergenceProjection } from '../../services/experienceRouteDesignConvergence';
import type { ExperiencePack, ExperienceProjection, ExperienceSelectionContext, GoldenJourneyScreen } from '../../types/experienceTwin';
import './goldenJourneyExperience.css';

interface GoldenJourneyExperienceProps {
  configuration: ExperienceTwinConfiguration;
  pack: ExperiencePack;
  selection: ExperienceSelectionContext;
  routeProjection: RouteDesignConvergenceProjection;
  operationalProjection: ExperienceProjection | null;
  markers: DeclutteredExperienceMarker[];
  scene: ReactNode;
  onSelectDay: (dayId: string) => void;
  onSelectPersona: (personaId: string) => void;
  onSelectWaypoint: (waypointId: string) => void;
  onScreenChange: (screen: GoldenJourneyScreen) => void;
  onOpenDesignScene: () => void;
  onOpenTruth: () => void;
  onExit?: () => void;
}

function formatDay(date: string): { day: string; month: string } {
  const parsed = new Date(`${date}T12:00:00+03:00`);
  return {
    day: new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { day: 'numeric' }).format(parsed),
    month: new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { month: 'short' }).format(parsed)
  };
}

function GoldenHeader({ title, subtitle, truth, onExit }: { title: string; subtitle: string; truth: string; onExit?: () => void }) {
  return (
    <header className="golden-header">
      <div className="golden-brand"><i aria-hidden="true">M</i><span><small>EXPERIENCE TWIN</small><strong>{title}</strong></span></div>
      <div className="golden-header-context"><span>{subtitle}</span><b><ShieldCheck aria-hidden="true" />{truth}</b></div>
      {onExit ? <button type="button" onClick={onExit} aria-label="الخروج إلى محفظة المشاريع"><ArrowLeft aria-hidden="true" /><span>خروج</span></button> : null}
    </header>
  );
}

export function GoldenJourneyExperience(props: GoldenJourneyExperienceProps) {
  const { configuration, pack, selection, routeProjection, onSelectWaypoint } = props;
  const golden = configuration.goldenJourney;
  const [mapImageAvailable, setMapImageAvailable] = useState(true);
  const [routePlaying, setRoutePlaying] = useState(false);
  const [operationsOpen, setOperationsOpen] = useState(false);
  const currentDay = pack.eventDays.find((day) => day.eventDayId === selection.eventDayId) ?? null;
  const currentPersona = pack.personas.find((persona) => persona.personaId === selection.personaId) ?? null;
  const authoredJourney = pack.journeys.find((journey) => journey.journeyId === selection.journeyId) ?? null;
  const activeJourney = routeProjection.journey;
  const activeWaypoint = routeProjection.waypoint;
  const activeWaypointIndex = activeJourney?.waypoints.findIndex((waypoint) => waypoint.waypointId === activeWaypoint?.waypointId) ?? -1;
  const screen = selection.goldenJourneyScreen ?? 'entry';
  const personas = pack.personas.filter((persona) => currentDay?.personaIds.includes(persona.personaId));
  const markerByEntity = useMemo(() => new Map(props.markers.map((marker) => [marker.entityId, marker])), [props.markers]);
  const journeyMarkers = useMemo(() => {
    if (!activeJourney) return [];
    const seen = new Set<string>();
    return activeJourney.waypoints.flatMap((waypoint, index) => waypoint.destinationIds.flatMap((entityId) => {
      const marker = markerByEntity.get(entityId);
      if (!marker || seen.has(entityId)) return [];
      seen.add(entityId);
      return [{ marker, waypoint, index }];
    }));
  }, [activeJourney, markerByEntity]);

  useEffect(() => {
    if (!routePlaying || screen !== 'map' || !activeJourney) return;
    const timeout = window.setTimeout(() => {
      const next = activeJourney.waypoints[activeWaypointIndex + 1] ?? null;
      if (!next) {
        setRoutePlaying(false);
        return;
      }
      onSelectWaypoint(next.waypointId);
    }, 2_800);
    return () => window.clearTimeout(timeout);
  }, [activeJourney, activeWaypointIndex, onSelectWaypoint, routePlaying, screen]);

  if (!golden) return null;

  const selectRelativeWaypoint = (delta: -1 | 1) => {
    if (!activeJourney) return;
    const nextIndex = Math.max(0, Math.min(activeJourney.waypoints.length - 1, (activeWaypointIndex < 0 ? 0 : activeWaypointIndex) + delta));
    const next = activeJourney.waypoints[nextIndex];
    if (next) onSelectWaypoint(next.waypointId);
  };

  if (screen === 'scene') {
    return <section className="kap-golden-journey golden-scene-screen" data-testid="golden-journey-scene" lang="ar" dir="rtl">{props.scene}</section>;
  }

  if (screen === 'entry') {
    return (
      <section className="kap-golden-journey golden-entry-screen" data-testid="golden-journey-entry" lang="ar" dir="rtl">
        <GoldenHeader title={configuration.projectLabelAr} subtitle={`${configuration.eventWindowAr} · ${configuration.dayCountLabelAr}`} truth={golden.truthBadgeAr} onExit={props.onExit} />
        <main className="golden-entry-world">
          <div className="golden-entry-artwork" aria-label={golden.spatialArtworkAltAr}>
            {mapImageAvailable ? <img src={golden.spatialArtworkUri} alt={golden.spatialArtworkAltAr} onError={() => setMapImageAvailable(false)} /> : <div className="golden-source-missing"><MapPinned /><strong>تعذّر تحميل المرجع المكاني المحلي</strong><span>لن تستخدم المنصة خريطة بديلة أو بيانات تجريبية.</span></div>}
            <div className="golden-entry-shade" aria-hidden="true" />
            <div className="golden-entry-orbit" aria-hidden="true"><i /><i /><i /></div>
          </div>
          <section className="golden-entry-copy">
            <span className="golden-kicker">KAP · FOUR-DAY EXPERIENCE</span>
            <h1>أربعة أيام.<br /><em>عالم تجربة واحد.</em></h1>
            <p>رحلة مترابطة من لحظة الوصول إلى ممر العصور، مع الحقيقة التشغيلية خلف المشهد عند الطلب.</p>
            <dl>
              <div><dt>اليوم المختار</dt><dd>{currentDay?.labelAr ?? 'غير محدد'}</dd></div>
              <div><dt>الشخصية</dt><dd>{currentPersona?.labelAr ?? 'غير محددة'}</dd></div>
              <div><dt>التجربة الحالية</dt><dd>{activeJourney?.labelAr ?? authoredJourney?.labelAr ?? 'لا رحلة منطبقة'}</dd></div>
            </dl>
            <button className="golden-primary-cta" data-testid="golden-start-journey" type="button" onClick={() => { setRoutePlaying(false); props.onScreenChange('map'); }}><span>ابدأ الرحلة</span><ArrowLeft aria-hidden="true" /></button>
            <small className="golden-reference-note"><CircleDot aria-hidden="true" />{golden.spatialArtworkTruthAr}</small>
          </section>
        </main>
        <footer className="golden-entry-controls">
          <nav className="golden-day-timeline" aria-label="الأيام الأربعة">
            {pack.eventDays.map((day) => {
              const date = formatDay(day.date);
              return <button key={day.eventDayId} data-testid={`golden-day-${day.eventDayId}`} type="button" aria-pressed={selection.eventDayId === day.eventDayId} onClick={() => props.onSelectDay(day.eventDayId)}><i>{day.order}</i><span><b>{date.day} {date.month}</b><small>{day.labelAr}</small></span></button>;
            })}
          </nav>
          <div className="golden-personas"><span><UserRound aria-hidden="true" />اختر الشخصية</span><div>{personas.map((persona) => <button key={persona.personaId} data-testid={`golden-persona-${persona.personaId}`} type="button" aria-pressed={selection.personaId === persona.personaId} onClick={() => props.onSelectPersona(persona.personaId)}>{persona.labelAr}</button>)}</div></div>
        </footer>
      </section>
    );
  }

  const routeNotApplicable = routeProjection.status === 'journey-not-applicable';
  return (
    <section className="kap-golden-journey golden-map-screen" data-testid="golden-journey-map" data-route-geometry="none" lang="ar" dir="rtl">
      <GoldenHeader title={configuration.projectLabelAr} subtitle={`${currentDay?.labelAr ?? 'اليوم غير محدد'} · ${currentPersona?.labelAr ?? 'الشخصية غير محددة'}`} truth={golden.truthBadgeAr} onExit={() => { setRoutePlaying(false); props.onScreenChange('entry'); }} />
      <main className="golden-map-world">
        <div className="golden-map-canvas" data-testid="golden-map-canvas">
          {mapImageAvailable ? <img src={golden.spatialArtworkUri} alt={golden.spatialArtworkAltAr} onError={() => setMapImageAvailable(false)} /> : <div className="golden-source-missing"><MapPinned /><strong>المرجع المكاني غير متاح</strong><span>لم يُستخدم أي أصل بديل.</span></div>}
          <div className="golden-map-toning" aria-hidden="true" />
          {!routeNotApplicable ? journeyMarkers.map(({ marker, waypoint, index }) => {
            const selected = activeWaypoint?.waypointId === waypoint.waypointId;
            return <button key={waypoint.waypointId} data-testid={`golden-map-marker-${marker.entityId}`} className={`golden-destination ${selected ? 'is-active' : ''} ${marker.entityId === golden.featuredEntityId ? 'is-featured' : ''}`} type="button" aria-pressed={selected} onClick={() => onSelectWaypoint(waypoint.waypointId)} style={{ insetInlineStart: `${marker.displayX * 100}%`, top: `${marker.displayY * 100}%` }}><i>{index + 1}</i><span>{marker.labelAr}</span></button>;
          }) : null}
          <div className="golden-map-title">
            <span>مسار التجربة</span>
            <h1>{routeNotApplicable ? 'لا تنطبق رحلة تشغيلية مشتركة' : activeJourney?.labelAr ?? 'رحلة مرشحة غير محددة'}</h1>
            <p>{routeNotApplicable ? 'يبقى اليوم ظاهرًا كسياق احتفالي منفصل. لا خط سفر ولا مدة انتقال ولا بوابة مستلمة مفترضة.' : `${activeJourney?.reportedTotalMinutes ?? '—'} دقيقة · محاسبة شاملة للحركة · ليست مسارًا تشغيليًا معتمدًا`}</p>
          </div>
          {routeNotApplicable ? <div className="golden-not-applicable" data-testid="golden-route-not-applicable"><CalendarDays /><strong>1 نوفمبر حاضر ضمن الأيام الأربعة</strong><span>رحلة الزائر والمسار والانتقال المشترك غير منطبقة.</span></div> : null}
          {!routeNotApplicable && activeWaypoint ? <aside className="golden-current-moment" data-testid="golden-current-moment">
            <div><span>اللحظة الحالية · {activeWaypoint.sourceLetter}</span><strong>{activeWaypoint.sourceLabelAr}</strong><small>{activeWaypoint.dwellMinutes === null ? 'مدة الوقوف غير مذكورة' : `${activeWaypoint.dwellMinutes} دقيقة ضمن إجمالي الرحلة`}</small></div>
            {routeProjection.mayOpenDesignScene ? <button data-testid="golden-enter-web3d" type="button" onClick={() => { setRoutePlaying(false); props.onOpenDesignScene(); }}><Box /><span>ادخل إلى التجربة ثلاثية الأبعاد</span><small>علاقة {routeProjection.designRelation?.status} / {routeProjection.designRelation?.confidence}</small><ChevronLeft /></button> : <span className="golden-current-safe-state">لا يوجد مشهد صريح لهذه اللحظة</span>}
          </aside> : null}
        </div>

        {!routeNotApplicable && activeJourney ? <ol className="golden-story-rail" aria-label="التسلسل القصصي المرشح">
          {activeJourney.waypoints.map((waypoint, index) => {
            const selected = waypoint.waypointId === activeWaypoint?.waypointId;
            const known = waypoint.destinationIds.some((id) => markerByEntity.has(id));
            const next = activeJourney.waypoints[index + 1];
            const nextKnown = next?.destinationIds.some((id) => markerByEntity.has(id)) ?? false;
            return <li key={waypoint.waypointId} className={`${selected ? 'is-active' : ''} ${known ? 'is-known' : 'is-unresolved'}`}>
              <button type="button" aria-current={selected ? 'step' : undefined} onClick={() => onSelectWaypoint(waypoint.waypointId)}><i>{waypoint.sourceLetter}</i><span>{waypoint.sourceLabelAr}</span></button>
              {next ? <b className={known && nextKnown ? 'is-story-known' : 'is-story-unknown'} aria-label={known && nextKnown ? 'تتابع قصصي بين وجهتين معلومتين' : 'الربط المكاني غير محسوم'}>{known && nextKnown ? null : <em>الربط المكاني غير محسوم</em>}</b> : null}
            </li>;
          })}
          <small>تسلسل قصصي — ليس SpatialRoute</small>
        </ol> : null}
      </main>

      <nav className="golden-map-controls" aria-label="التحكم في الرحلة">
        <button type="button" onClick={() => { setRoutePlaying(false); props.onScreenChange('entry'); }}><ArrowRight /><span>البوابة</span></button>
        <button type="button" disabled={routeNotApplicable || activeWaypointIndex <= 0} onClick={() => selectRelativeWaypoint(-1)}><ChevronRight /><span>السابق</span></button>
        <button className="is-play" data-testid="golden-route-play" type="button" disabled={routeNotApplicable || !activeJourney} aria-pressed={routePlaying} onClick={() => setRoutePlaying((playing) => !playing)}>{routePlaying ? <Pause /> : <Play />}<span>{routePlaying ? 'إيقاف' : 'تشغيل'}</span></button>
        <button type="button" disabled={routeNotApplicable || !activeJourney || activeWaypointIndex >= activeJourney.waypoints.length - 1} onClick={() => selectRelativeWaypoint(1)}><ChevronLeft /><span>التالي</span></button>
        <button type="button" aria-pressed={operationsOpen} onClick={() => setOperationsOpen((open) => !open)}><Radar /><span>ما وراء التجربة</span></button>
      </nav>

      {operationsOpen ? <aside className="golden-operations-drawer" data-testid="golden-operational-context">
        <header><div><span>مركز التشغيل · سياق اختياري</span><strong>{activeWaypoint?.sourceLabelAr ?? currentDay?.labelAr ?? 'السياق الحالي'}</strong></div><button type="button" aria-label="إغلاق السياق التشغيلي" onClick={() => setOperationsOpen(false)}><X /></button></header>
        <section><ShieldCheck /><div><span>الجاهزية</span><strong>لا يمكن تحديدها</strong><small>{configuration.readinessExplanationAr}</small></div></section>
        <section><Route /><div><span>المسار والاعتمادات</span><strong>{routeProjection.truthLabelAr}</strong><small>{routeProjection.missingApprovalLabelsAr.join(' · ') || 'لا توجد موافقات تشغيلية مثبتة.'}</small></div></section>
        <section><UserRound /><div><span>المالك والمسؤول</span><strong>غير معيّنين من مصدر مؤهل</strong><small>لا تنشئ رحلة V.11 تعيينًا أو سلطة تشغيلية.</small></div></section>
        <section><ShieldCheck /><div><span>الدليل</span><strong>{props.operationalProjection?.evidenceStateAr ?? 'لا يوجد دليل قانوني مرتبط'}</strong><small>إرفاق المرجع لا يعني تحقق التنفيذ.</small></div></section>
        <section><Radar /><div><span>القرار وIoT</span><strong>{props.operationalProjection?.decisionStateAr ?? 'لا يوجد قرار قانوني مرتبط'}</strong><small>لا توجد ملاحظة IoT مؤهلة لهذا السياق؛ أي رصد مستقبلي يبقى reported-only حتى التحقق.</small></div></section>
        <footer><button type="button" onClick={props.onOpenTruth}><ShieldCheck />حقيقة المصدر والتفاصيل</button></footer>
      </aside> : null}
    </section>
  );
}

export default GoldenJourneyExperience;
