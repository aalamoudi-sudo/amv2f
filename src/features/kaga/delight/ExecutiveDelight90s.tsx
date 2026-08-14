import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Car, Check, Flag, Pause, Play, Route } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { activeRegisteredStopIndex, pointAtRegisteredProgress } from '../spatial/registeredJourneys';
import { RegisteredMasterplan } from '../v2/RegisteredMasterplan';
import { guestStopPresentationByCode, guestTransportLabels } from '../v2/guestJourneyPresentation';
import {
  delightActAt,
  executiveDelightActs,
  guestDelightExperience,
  guestDelightJourney,
  guestDelightSignatureStop,
  guestDelightSourceJourney,
  guestProgressAtDelightTime,
  kineticStateAt,
  xrayAnnotations,
} from './executiveDelightStory';
import { kineticMotion } from './kineticMotion';
import './executiveDelight90s.css';
import './kineticDramaturgy.css';
import './finalCinematicPolish.css';

interface ExecutiveDelight90sProps {
  onExit: () => void;
  onTeaseRoyal: () => void;
}

const TOTAL_MS = 92_000;
const START_HOLD_MS = 13_000;
const CLEAN_ARDHA_VISUAL = '/kaga/assets/v2/saudi-ardah-clean-p027.jpg';
const ROYAL_TEASE_VISUAL = '/kaga/assets/v2/royal-model-clean-p015.jpg';

const experienceShots = {
  none: { scale: 1.03, x: '0%', y: '0%' },
  wide: { scale: 1.04, x: '0%', y: '0%' },
  performers: { scale: 1.22, x: '-7%', y: '2%' },
  flag: { scale: 1.31, x: '7%', y: '-3%' },
  protocol: { scale: 1.17, x: '3%', y: '2%' },
} as const;

const movementIcon = (transport: string) => {
  if (transport === 'car' || transport === 'golf-cart') return <Car aria-hidden="true" />;
  if (transport === 'exit') return <Flag aria-hidden="true" />;
  return <Route aria-hidden="true" />;
};

export function ExecutiveDelight90s({ onExit }: ExecutiveDelight90sProps) {
  const reduceMotion = useReducedMotion();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(true);
  const [journeyStarted, setJourneyStarted] = useState(false);
  const [exploring, setExploring] = useState(false);
  const [finished, setFinished] = useState(false);
  const elapsedRef = useRef(0);
  const lastFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!running || finished) return undefined;
    let frame = 0;
    const tick = (now: number) => {
      const last = lastFrameRef.current ?? now;
      lastFrameRef.current = now;
      const next = Math.min(TOTAL_MS, elapsedRef.current + Math.min(80, now - last));
      if (!journeyStarted && next >= START_HOLD_MS) {
        elapsedRef.current = START_HOLD_MS;
        setElapsedMs(START_HOLD_MS);
        setRunning(false);
        lastFrameRef.current = undefined;
        return;
      }
      elapsedRef.current = next;
      setElapsedMs(next);
      if (next >= TOTAL_MS) {
        setFinished(true);
        setRunning(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [finished, journeyStarted, running]);

  const act = delightActAt(elapsedMs);
  const kineticState = kineticStateAt(elapsedMs);
  const progress = guestProgressAtDelightTime(elapsedMs);
  const selectedStopIndex = activeRegisteredStopIndex(guestDelightJourney, progress);
  const activeStop = guestDelightJourney.stops[selectedStopIndex]!;
  const nextStop = guestDelightJourney.stops[selectedStopIndex + 1];
  const showMap = act.id !== 'majesty';
  const showExperience = act.id === 'experience' || act.id === 'depth' || (act.id === 'return' && elapsedMs < 71_000);
  const showXray = act.id === 'depth';
  const returning = act.id === 'return';
  const arrival = kineticState.id === 'arrival-approach' || kineticState.id === 'arrival-settle';
  const stopA = guestDelightJourney.stops.find((stop) => stop.code === 'A')!;
  const stopB = guestDelightJourney.stops.find((stop) => stop.code === 'B')!;
  const stopD = guestDelightJourney.stops.find((stop) => stop.code === 'D')!;
  const cameraPoint = useMemo(() => {
    if (kineticState.id === 'site-reveal') return [851.58, 685.62] as [number, number];
    if (kineticState.id === 'route-origin' || kineticState.id === 'route-awakening') return stopA.mapPoint;
    if (kineticState.id === 'approach-b') return stopB.mapPoint;
    if (kineticState.id === 'travel-ab' || kineticState.id === 'travel-bc') return pointAtRegisteredProgress(guestDelightJourney, progress);
    if (kineticState.id === 'garden-approach' || kineticState.id === 'garden-glimpse' || kineticState.id === 'royal-trace' || kineticState.id === 'royal-hold') return stopD.mapPoint;
    return guestDelightSignatureStop.mapPoint;
  }, [kineticState.id, progress, stopA.mapPoint, stopB.mapPoint, stopD.mapPoint]);
  const focusPercent = useMemo(() => ({
    x: (cameraPoint[0] / 1703.16) * 100,
    y: (cameraPoint[1] / 1371.235) * 100,
  }), [cameraPoint]);
  const activeXrayIndex = Math.max(0, Math.min(
    xrayAnnotations.length - 1,
    Math.floor((elapsedMs - 52_000) / 3_000),
  ));

  const beginJourney = () => {
    setJourneyStarted(true);
    elapsedRef.current = 13_000;
    setElapsedMs(13_000);
    setRunning(true);
  };

  const pauseForExplore = () => {
    setExploring(true);
    setRunning(false);
    lastFrameRef.current = undefined;
  };

  const resume = () => {
    setExploring(false);
    setRunning(true);
  };

  const jumpTo = (nextElapsedMs: number) => {
    elapsedRef.current = nextElapsedMs;
    setElapsedMs(nextElapsedMs);
    setRunning(true);
    setExploring(false);
    lastFrameRef.current = undefined;
  };

  return (
    <section
      className="kaga-delight"
      data-testid="executive-delight-90s"
      data-act={act.id}
      data-camera-state={kineticState.id}
      data-experience-shot={kineticState.shot}
      data-elapsed-second={Math.floor(elapsedMs / 1_000)}
      data-running={running}
      data-exploring={exploring}
      data-finished={finished}
      style={{ '--delight-focus-x': `${focusPercent.x}%`, '--delight-focus-y': `${focusPercent.y}%` } as React.CSSProperties}
    >
      <AnimatePresence>
        {act.id === 'majesty' ? (
          <motion.div
            key="majesty"
            className="kaga-delight-majesty"
            initial={reduceMotion ? false : { opacity: 0, scale: 1.025 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { clipPath: 'inset(0 58% 0 0)', opacity: .96 }}
            transition={{ ...kineticMotion.siteReveal, duration: reduceMotion ? 0 : kineticMotion.siteReveal.duration }}
          >
            <img src="/kaga/assets/v2/site-aerial-p001.jpg" alt="المشهد الجوي لحدائق الملك عبدالله" />
            <motion.img
              className="kaga-delight-majesty__depth"
              src="/kaga/assets/v2/site-aerial-p001.jpg"
              alt=""
              aria-hidden="true"
              initial={reduceMotion ? false : { scale: 1.075, x: '-.5%' }}
              animate={{ scale: 1.025, x: 0 }}
              transition={{ ...kineticMotion.cinematicDescent, duration: reduceMotion ? 0 : kineticMotion.cinematicDescent.duration }}
            />
            <div className="kaga-delight-majesty__shade" />
            <motion.div
              className="kaga-delight-majesty__identity"
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 28 }}
              transition={{ duration: .9, delay: .9 }}
            >
              <small>حدائق الملك عبدالله · الرياض</small>
              <h1><span>تدشين</span><strong>حدائق<br />الملك عبدالله</strong></h1>
              <i aria-hidden="true" />
            </motion.div>
            <div className="kaga-delight-majesty__site" aria-hidden="true"><i /><span /></div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {showMap ? (
        <div className="kaga-delight-map-world" data-arrival={arrival} data-act={act.id} data-camera={kineticState.id} data-testid="delight-map-world">
          <div className="kaga-delight-map-world__contour" aria-hidden="true"><i /><b /></div>
          <div className="kaga-delight-map-world__map">
            <RegisteredMasterplan
              mode="event"
              journeyId="guests"
              progress={progress}
              playing={(act.id === 'journey' || act.id === 'glimpse') && running}
              reading="illustrated"
              sourceFidelityMode
              selectedStopIndex={selectedStopIndex}
              onGardenSelect={() => undefined}
              onStopSelect={() => undefined}
            />
          </div>

          <aside className="kaga-delight-itinerary" data-testid="delight-journey-rail" data-continuous-sequence="A-L">
            <header>
              <p>صفحة 26 · الرحلة</p>
              <h2>{guestDelightSourceJourney.title}</h2>
              <span>{guestDelightSourceJourney.window}</span>
            </header>
            <nav aria-label="التسلسل المستمر A إلى L" data-continuous-sequence="A-L">
              {guestDelightJourney.stops.map((stop, index) => {
                const presentation = guestStopPresentationByCode[stop.code]!;
                const state = index < selectedStopIndex ? 'complete' : index === selectedStopIndex ? 'current' : index === selectedStopIndex + 1 ? 'next' : 'future';
                return (
                  <div key={stop.stopId} data-state={state}>
                    <b>{state === 'complete' ? <Check aria-label="تم" /> : stop.code}</b>
                    <span>{presentation.shortTitleAr}<small>{stop.durationMinutes ? `${stop.durationMinutes} د` : guestTransportLabels[presentation.transport]}</small></span>
                    <i title={guestTransportLabels[presentation.transport]}>{movementIcon(presentation.transport)}</i>
                  </div>
                );
              })}
            </nav>
          </aside>

          <section className="kaga-delight-now" data-testid="delight-current-stop">
            <strong>{activeStop.code}</strong>
            <div><small>{arrival ? 'وصلنا الآن' : 'المحطة الحالية'}</small><h3>{activeStop.eventLabel}</h3><p>{guestStopPresentationByCode[activeStop.code]!.descriptionAr}</p></div>
            {activeStop.durationMinutes ? <time>{activeStop.durationMinutes} دقيقة</time> : null}
            {nextStop ? <footer><span>التالي</span><b>{nextStop.code} · {guestStopPresentationByCode[nextStop.code]!.shortTitleAr}</b></footer> : null}
          </section>

          {!journeyStarted && elapsedMs >= START_HOLD_MS ? (
            <button type="button" className="kaga-delight-start" onClick={beginJourney}><Play />ابدأ الرحلة</button>
          ) : null}

          {act.id === 'experience' ? (
            <motion.div
              className="kaga-delight-spatial-aperture"
              aria-hidden="true"
              initial={reduceMotion ? false : { scale: .25, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: reduceMotion ? 0 : 3.4, ease: [0.16, 1, 0.3, 1] }}
            ><i /><span /></motion.div>
          ) : null}
        </div>
      ) : null}

      <AnimatePresence>
        {showExperience ? (
          <motion.aside
            key="experience"
            className="kaga-delight-experience"
            data-xray={showXray}
            data-returning={returning}
            data-testid="delight-experience"
            initial={reduceMotion ? { opacity: 0 } : { clipPath: `circle(2.5% at ${focusPercent.x}% ${focusPercent.y}%)`, opacity: .72 }}
            animate={returning
              ? { clipPath: `circle(3% at ${focusPercent.x}% ${focusPercent.y}%)`, opacity: .45 }
              : { clipPath: `circle(155% at ${focusPercent.x}% ${focusPercent.y}%)`, opacity: 1 }}
            exit={{ opacity: 0 }}
              transition={{
                ...(returning ? kineticMotion.spatialCollapse : kineticMotion.apertureExpand),
                duration: reduceMotion ? 0 : returning ? kineticMotion.spatialCollapse.duration : kineticMotion.apertureExpand.duration,
              }}
          >
            <div className="kaga-delight-experience__visual">
              <motion.img
                src={CLEAN_ARDHA_VISUAL}
                alt={guestDelightExperience.title}
                animate={experienceShots[kineticState.shot]}
                transition={{ ...kineticMotion.spatialApproach, duration: reduceMotion ? 0 : kineticMotion.spatialApproach.duration }}
              />
              <div />
            </div>
            <motion.article
              initial={reduceMotion ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : .9, delay: reduceMotion ? 0 : 4.15, ease: [0.16, 1, 0.3, 1] }}
            ><p>المحطة C</p><h2>{guestDelightExperience.title}</h2><span>60 دقيقة · رحلة الضيوف</span>{!showXray ? <button type="button" onClick={() => jumpTo(52_000)}>كشف التجربة</button> : <button type="button" onClick={() => jumpTo(67_000)}>العودة إلى الرحلة</button>}</motion.article>
            <svg className="kaga-delight-experience__edge" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M68 0 C58 18 74 36 61 52 C49 68 59 84 46 100" /></svg>
            {showXray ? (
              <div className="kaga-delight-xray" data-testid="delight-xray" data-active-index={activeXrayIndex + 1}>
                {xrayAnnotations.map((annotation, index) => (
                  <motion.div
                    key={annotation.id}
                    data-index={index + 1}
                    data-active={index === activeXrayIndex}
                    data-past={index < activeXrayIndex}
                    initial={reduceMotion ? false : { opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...kineticMotion.xrayFocus, delay: reduceMotion ? 0 : index * .42, duration: reduceMotion ? 0 : kineticMotion.xrayFocus.duration }}
                  >
                    <i aria-hidden="true" /><span><small>{annotation.labelAr}</small><b>{annotation.valueAr}</b></span>
                  </motion.div>
                ))}
              </div>
            ) : null}
          </motion.aside>
        ) : null}
      </AnimatePresence>

      {act.id === 'tease' ? (
        <motion.div
          className="kaga-delight-tease"
          data-illumination-state={kineticState.id}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 1.2 }}
          data-testid="delight-tease"
        >
          <motion.img src={ROYAL_TEASE_VISUAL} alt="مجسم لحظة التدشين" initial={reduceMotion ? false : { scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...kineticMotion.royalTease, duration: reduceMotion ? 0 : kineticMotion.royalTease.duration }} />
          <div className="kaga-delight-tease__illumination" aria-hidden="true"><i /><span /><b /></div>
          <motion.div
            className="kaga-delight-tease__title"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : .9, delay: reduceMotion ? 0 : 4.55, ease: [0.16, 1, 0.3, 1] }}
          ><h2>لحظة التدشين</h2></motion.div>
        </motion.div>
      ) : null}

      {act.id !== 'majesty' && journeyStarted ? (
        <div className="kaga-delight-director">
          <div className="kaga-delight-director__acts">{executiveDelightActs.slice(1).map((item) => <i key={item.id} data-active={item.id === act.id} />)}</div>
          {!exploring ? <button type="button" onClick={pauseForExplore}>{running ? <Pause /> : <Play />}استكشف</button> : <button type="button" onClick={resume}><Play />متابعة العرض</button>}
          <button type="button" onClick={onExit}>العودة إلى المشروع</button>
        </div>
      ) : null}
    </section>
  );
}
