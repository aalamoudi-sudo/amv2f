import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { launchLayers, royalMomentSource } from '../data/ceremonial';
import { eventDays } from '../data/eventDays';
import { experiences } from '../data/experiences';
import { journeyById, journeys } from '../data/journeys';
import type { JourneyId } from '../data/spatialTypes';
import { LaunchShow } from '../experience/LaunchShow';
import { RoyalMoment } from '../experience/RoyalMoment';
import { gardenById } from '../knowledge';
import { registeredJourneyById } from '../spatial/registeredJourneys';
import { choreographyState } from './legendaryChoreographyEngine';
import { contextForExperience, daysForPlace, experiencesForPlace, journeysForPlace, knowledgeForPlace, visualsForPlace, whenPlaceUsed } from './legendaryCrossIndex';
import { evidenceForBeat } from './legendaryEvidenceEngine';
import { inaugurationLegendaryStory } from './globalDirectorStory';
import { legendaryStories } from './journeys';
import { legendaryLensLabels } from './legendaryLensEngine';
import { journeyProgressForLegendaryBeat, mapFocusPercent } from './legendarySpatialStoryEngine';
import { useLegendarySystemDirector } from './legendarySystemDirector';
import { useLegendarySystemStore } from './legendarySystemStore';
import type { LegendaryDayId, LegendaryLens } from './legendaryTypes';
import { xrayExperienceIds, xrayForExperience } from './legendaryXRayEngine';
import { LegendaryLivingMasterplan } from './LegendaryLivingMasterplan';
import './legendaryL2.css';
import './legendarySourceTheme.css';

interface LegendarySystemExperienceProps {
  onExit: () => void;
  evidenceModeAvailable?: boolean;
  initialJourneyId?: JourneyId;
  autoStartJourney?: boolean;
}

const dayIds = eventDays.map((day) => day.id as LegendaryDayId);

export function LegendarySystemExperience({
  onExit,
  evidenceModeAvailable = false,
  initialJourneyId,
  autoStartJourney = false,
}: LegendarySystemExperienceProps) {
  const reduceMotion = useReducedMotion();
  const session = useLegendarySystemStore();
  const [started, setStarted] = useState(Boolean(initialJourneyId));
  const [showXray, setShowXray] = useState(false);
  const [query, setQuery] = useState<'what' | 'who' | 'when'>('what');
  const story = legendaryStories[session.journeyId];
  const choreography = choreographyState(session.journeyId, story, session.activeBeatId);
  const selectedStop = registeredJourneyById[session.journeyId].stops.find((stop) => stop.stopId === session.activeStopId);
  const selectedGarden = session.activePlaceId ? gardenById[session.activePlaceId] : undefined;
  const placeId = session.activePlaceId ?? selectedStop?.physicalEntityId ?? `${session.journeyId}:${session.activeStopId}`;
  const routeProgress = journeyProgressForLegendaryBeat(story, session.activeBeatId, session.cinematicProgress, session.journeyId);
  const focus = mapFocusPercent(choreography.beat);
  const activeExperience = experiences.find((item) => item.id === session.activeExperienceId);
  const activeKnowledge = session.activeKnowledgeId ? gardenById[session.activeKnowledgeId] : undefined;
  const currentGlobal = inaugurationLegendaryStory.find((chapter) => chapter.id === session.globalChapterId);
  const xray = activeExperience && selectedStop ? xrayForExperience(session.journeyId, selectedStop.stopId, activeExperience.id) : [];
  useLegendarySystemDirector();

  useEffect(() => {
    if (!initialJourneyId) return;
    const state = useLegendarySystemStore.getState();
    state.selectJourney(initialJourneyId);
    state.setLens('guest');
    state.setMapReading('illustrated');
    if (autoStartJourney) useLegendarySystemStore.getState().startJourneyDirector();
  }, [autoStartJourney, initialJourneyId]);

  useEffect(() => () => useLegendarySystemStore.getState().reset(), []);

  const placeSummary = {
    days: daysForPlace(placeId).map((id) => eventDays.find((day) => day.id === id)!).filter(Boolean),
    journeys: journeysForPlace(placeId).map((id) => journeyById[id]),
    experiences: experiencesForPlace(placeId),
    knowledge: knowledgeForPlace(placeId),
    visuals: visualsForPlace(placeId),
    use: whenPlaceUsed(placeId),
  };

  const selectJourney = (journeyId: JourneyId) => {
    session.selectJourney(journeyId);
    setQuery('what');
  };

  const selectStop = (journeyId: JourneyId, stopId: string) => {
    if (journeyId !== session.journeyId) session.selectJourney(journeyId);
    const registered = registeredJourneyById[journeyId].stops.find((stop) => stop.stopId === stopId);
    const beat = legendaryStories[journeyId].find((item) => item.journeyStopId === stopId);
    useLegendarySystemStore.setState({
      activeStopId: stopId,
      activeBeatId: beat?.id ?? legendaryStories[journeyId][0]!.id,
      spatialFocus: registered ? { point: registered.mapPoint, entityId: registered.physicalEntityId, anchorConfidence: registered.anchorConfidence } : undefined,
      mode: 'explore',
      activePlaceId: undefined,
    });
  };

  if (!started) return (
    <section className="kaga-l2-entry" data-testid="legendary-l2-home">
      <div className="kaga-l2-entry__visual"><img src="/kaga/assets/v2/site-aerial-p001.jpg" alt="حدائق الملك عبدالله" /></div>
      <article>
        <p>التدشين · المكان · القصة</p>
        <h1>حدائق الملك عبدالله</h1>
        <h2>تجربة التدشين الحية</h2>
        <p>نظام واحد يربط الأيام والرحلات والأماكن والتجارب والمعرفة بمصادرها المعتمدة.</p>
        <button type="button" onClick={() => { setStarted(true); session.startGlobalDirector(); }}>شاهد قصة التدشين</button>
        <button type="button" onClick={() => { setStarted(true); session.setLens('place'); }}>استكشف الحدث</button>
        <button type="button" className="is-text" onClick={onExit}>العودة إلى المشروع</button>
      </article>
    </section>
  );

  const renderMap = () => (
    <LegendaryLivingMasterplan
      dayId={session.dayId}
      selectedJourneyId={session.journeyId}
      activeStopId={session.activeStopId}
      reading={session.mapReading}
      activePlaceId={session.activePlaceId}
      onJourneySelect={selectJourney}
      onStopSelect={selectStop}
      onReadingChange={session.setMapReading}
      onPlaceSelect={(placeId) => session.focusPlace(placeId)}
    />
  );

  const renderStoryLens = () => (
    <div className="kaga-l2-story-lens" data-testid="legendary-story-lens">
      <div className="kaga-l2-story-lens__days">
        {eventDays.map((day) => <button key={day.id} type="button" aria-pressed={session.dayId === day.id} onClick={() => session.selectDay(day.id as LegendaryDayId)}><small>{day.ordinalLabel}</small><b>{day.title}</b><span>{day.gregorianDate}</span></button>)}
      </div>
      <article><p>{eventDays.find((day) => day.id === session.dayId)?.summary}</p><button type="button" onClick={() => session.setLens('guest')}>استكشف رحلات اليوم</button></article>
    </div>
  );

  const renderGuestLens = () => (
    <div className="kaga-l2-guest-lens" data-testid="legendary-guest-lens">
      <nav aria-label="الرحلات الست">{journeys.map((journey) => <button key={journey.id} type="button" aria-pressed={session.journeyId === journey.id} onClick={() => selectJourney(journey.id)}>{journey.title}</button>)}</nav>
      <div className="kaga-l2-guest-lens__map">{renderMap()}</div>
      <article>
        <p>{choreography.beat.chapterAr}</p><h2>{journeyById[session.journeyId].title}</h2><h3>{choreography.beat.titleAr}</h3><p>{choreography.beat.narrativeAr}</p>
        <dl><div><dt>الوقت في المصدر</dt><dd>{journeyById[session.journeyId].window}</dd></div>{choreography.beat.actualDurationMinutes ? <div><dt>مدة المحطة</dt><dd>{choreography.beat.actualDurationMinutes} دقيقة</dd></div> : null}</dl>
        <div className="kaga-l2-actions">{session.mode === 'directed' ? <button type="button" onClick={session.pauseForExplore}>استكشف</button> : <button type="button" onClick={() => session.startJourneyDirector()}>شاهد قصة الرحلة</button>}{session.returnContext ? <button type="button" onClick={session.resume}>متابعة القصة</button> : null}{choreography.beat.experienceId ? <button type="button" onClick={() => session.openExperience(choreography.beat.experienceId!)}>دخول التجربة</button> : null}{choreography.beat.knowledgeId ? <button type="button" onClick={() => session.openKnowledge(choreography.beat.knowledgeId!)}>اكتشف الموقع</button> : null}</div>
        <div className="kaga-l2-sequence"><button type="button" onClick={session.previous} disabled={choreography.chapterIndex === 0}>السابق</button><span>{choreography.chapterIndex + 1} / {choreography.chapterCount}</span><button type="button" onClick={session.advance}>التالي</button></div>
      </article>
    </div>
  );

  const renderPlaceLens = () => (
    <div className="kaga-l2-place-lens" data-testid="legendary-place-lens">
      <div className="kaga-l2-place-lens__map">{renderMap()}</div>
      <aside>
        <p>المكان الحالي</p><h2>{selectedGarden?.titleAr ?? selectedStop?.eventLabel ?? 'حدائق الملك عبدالله'}</h2>
        <div className="kaga-l2-place-queries"><button type="button" aria-pressed={query === 'what'} onClick={() => setQuery('what')}>ماذا يحدث هنا؟</button><button type="button" aria-pressed={query === 'who'} onClick={() => setQuery('who')}>من يمر من هنا؟</button><button type="button" aria-pressed={query === 'when'} onClick={() => setQuery('when')}>متى يُستخدم هذا الموقع؟</button></div>
        {query === 'what' ? <div className="kaga-l2-relations">{placeSummary.days.length ? <section><small>الأيام</small>{placeSummary.days.map((day) => <b key={day.id}>{day.ordinalLabel}</b>)}</section> : null}{placeSummary.experiences.length ? <section><small>التجارب</small>{placeSummary.experiences.map((item) => <button type="button" key={item.id} onClick={() => session.openExperience(item.id)}>{item.title}</button>)}</section> : null}{placeSummary.knowledge.length ? <section><small>المعرفة</small>{placeSummary.knowledge.map((item) => <button type="button" key={item.id} onClick={() => session.openKnowledge(item.id)}>{item.titleAr}</button>)}</section> : null}{placeSummary.visuals.length ? <section><small>المرئيات</small><b>{placeSummary.visuals.length} مشاهد مرتبطة</b></section> : null}</div> : null}
        {query === 'who' ? <div className="kaga-l2-relations">{placeSummary.journeys.map((item) => <button type="button" key={item.id} onClick={() => selectJourney(item.id)}>{item.title}</button>)}</div> : null}
        {query === 'when' ? <div className="kaga-l2-relations">{placeSummary.use.map((item) => <section key={item.journeyId}><b>{item.journeyTitleAr}</b><span>{item.sourcedWindowAr}</span></section>)}</div> : null}
      </aside>
    </div>
  );

  const renderExperienceLens = () => (
    <div className="kaga-l2-experience-lens" data-testid="legendary-experience-lens">
      <header><p>ماذا سيعيش الحضور؟</p><h2>التجارب الرئيسية</h2></header>
      <div>{experiences.map((experience) => {
        const context = contextForExperience(experience.id);
        return <button type="button" key={experience.id} onClick={() => session.openExperience(experience.id)}><img src={experience.image} alt="" /><span><b>{experience.title}</b><small>{[context.who.length ? `${context.who.length} رحلة` : '', context.when.length ? `${context.when.length} يوم` : '', context.where.length ? 'موقع مسجل' : ''].filter(Boolean).join(' · ')}</small></span></button>;
      })}</div>
    </div>
  );

  const renderGlobalDirector = () => {
    if (!currentGlobal) return null;
    if (currentGlobal.surface === 'royal') return <div className="kaga-l2-global-module"><RoyalMoment source={royalMomentSource} /><button type="button" onClick={session.advance}>متابعة قصة التدشين</button></div>;
    if (currentGlobal.surface === 'launch') return <div className="kaga-l2-global-module"><LaunchShow layers={launchLayers} /><button type="button" onClick={session.advance}>متابعة قصة التدشين</button></div>;
    return <div className="kaga-l2-global-director" data-surface={currentGlobal.surface} data-testid="legendary-global-director"><div className="kaga-l2-global-director__visual">{currentGlobal.surface === 'journey' || currentGlobal.surface === 'place' || currentGlobal.surface === 'days' ? renderMap() : <img src={currentGlobal.surface === 'finale' ? '/kaga/assets/v2/site-aerial-p001.jpg' : '/kaga/assets/core/cover-p001.webp'} alt="حدائق الملك عبدالله" />}</div><article><p>قصة التدشين</p><h2>{currentGlobal.titleAr}</h2><p>{currentGlobal.narrativeAr}</p><div className="kaga-l2-global-progress"><i style={{ width: `${session.cinematicProgress * 100}%` }} /></div><button type="button" onClick={session.pauseForExplore}>استكشف</button>{currentGlobal.surface === 'finale' ? <button type="button" onClick={() => session.startGlobalDirector()}>إعادة القصة</button> : <button type="button" onClick={session.advance}>الفصل التالي</button>}</article></div>;
  };

  return (
    <section className="kaga-l2" data-testid="legendary-l2-system" data-lens={session.lens} data-mode={session.mode} style={{ '--focus-x': `${focus.x}%`, '--focus-y': `${focus.y}%` } as React.CSSProperties}>
      <header className="kaga-l2-header"><button type="button" onClick={onExit}>حدائق الملك عبدالله</button><nav aria-label="عدسات التجربة">{(Object.keys(legendaryLensLabels) as LegendaryLens[]).map((lens) => <button key={lens} type="button" aria-pressed={session.lens === lens} onClick={() => session.setLens(lens)}><b>{legendaryLensLabels[lens].titleAr}</b><small>{legendaryLensLabels[lens].questionAr}</small></button>)}</nav>{evidenceModeAvailable ? <button type="button" onClick={session.toggleEvidence} aria-pressed={session.evidenceMode}>الدليل</button> : <span aria-hidden="true" />}</header>
      <nav className="kaga-l2-days" aria-label="الأيام الأربعة">{dayIds.map((id, index) => <button key={id} type="button" aria-pressed={session.dayId === id} onClick={() => session.selectDay(id)}>اليوم {index + 1}</button>)}</nav>
      <main>
        {session.directorScope === 'inauguration' && session.mode !== 'explore' ? renderGlobalDirector() : session.lens === 'story' ? renderStoryLens() : session.lens === 'place' ? renderPlaceLens() : session.lens === 'guest' ? renderGuestLens() : renderExperienceLens()}
      </main>
      {session.returnContext ? <button type="button" className="kaga-l2-resume" onClick={session.resume}>متابعة {session.returnContext.directorScope === 'inauguration' ? 'قصة التدشين' : 'القصة'}</button> : null}
      <AnimatePresence>{activeExperience ? <motion.aside className="kaga-l2-experience-overlay" initial={reduceMotion ? { opacity: 0 } : { clipPath: `circle(4% at ${focus.x}% ${focus.y}%)` }} animate={{ clipPath: `circle(150% at ${focus.x}% ${focus.y}%)`, opacity: 1 }} exit={{ opacity: 0 }}><div><img src={activeExperience.image} alt={activeExperience.title} />{showXray ? <div className="kaga-l2-xray">{xray.map((item) => <article key={item.id}><small>{item.labelAr}</small><b>{item.valueAr}</b></article>)}{session.mapReading !== 'masterplan' && contextForExperience(activeExperience.id).where.length ? <figure className="kaga-l2-xray__illustrated-context" data-testid="xray-illustrated-context"><img src="/kaga/illustrated-map/illustrated-composite.webp" alt="" /><figcaption>الموقع ضمن الخريطة التصويرية — والمرجع الهندسي محفوظ في المخطط</figcaption></figure> : null}</div> : null}</div><article><p>التجربة</p><h2>{activeExperience.title}</h2><p>{activeExperience.description}</p><div className="kaga-l2-context-dimensions">{contextForExperience(activeExperience.id).who.length ? <span><small>من؟</small>{contextForExperience(activeExperience.id).who.map((item) => item.title).join('، ')}</span> : null}{contextForExperience(activeExperience.id).when.length ? <span><small>متى؟</small>{contextForExperience(activeExperience.id).when.map((item) => item.ordinalLabel).join('، ')}</span> : null}{contextForExperience(activeExperience.id).where.length ? <span><small>أين؟</small>{contextForExperience(activeExperience.id).where[0]!.titleAr}</span> : null}</div>{xrayExperienceIds.has(activeExperience.id) && xray.length ? <button type="button" onClick={() => setShowXray((value) => !value)}>كشف التجربة</button> : null}{contextForExperience(activeExperience.id).where.length ? <button type="button" onClick={() => { const place = contextForExperience(activeExperience.id).where[0]!; session.returnToContext(); selectStop(place.journeyId, place.stopId); session.setLens('place'); }}>أين يحدث هذا؟</button> : null}<button type="button" onClick={session.returnToContext}>العودة إلى السياق</button></article></motion.aside> : null}</AnimatePresence>
      {activeKnowledge ? <aside className="kaga-l2-knowledge"><p>المعرفة</p><h2>{activeKnowledge.titleAr}</h2><p>{activeKnowledge.descriptionAr}</p><button type="button" onClick={session.returnToContext}>العودة إلى السياق</button></aside> : null}
      {evidenceModeAvailable && session.evidenceMode ? <aside className="kaga-l2-evidence" data-testid="legendary-project-evidence"><h2>الدليل</h2><p><b>المخطط الهندسي</b><span>الحقيقة المكانية المعتمدة</span></p>{session.mapReading !== 'masterplan' ? <p data-testid="illustrated-evidence"><b>الخريطة التصويرية</b><span>مصدر بصري خرائطي — لا يستبدل هندسة الموقع</span></p> : null}{evidenceForBeat(choreography.beat).map((item, index) => <p key={index}><b>{item.documentAr}</b><span>{item.pagesAr}</span></p>)}</aside> : null}
      <footer><button type="button" onClick={() => session.startGlobalDirector()}>شاهد قصة التدشين</button><span>{session.directorScope === 'journey' ? `${Math.round(routeProgress * 100)}٪ من الرحلة` : currentGlobal?.titleAr}</span></footer>
    </section>
  );
}
