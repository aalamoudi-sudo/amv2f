import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { assetById } from '../../data/assets';
import { eventDays } from '../../data/eventDays';
import { experiences } from '../../data/experiences';
import { gardenById } from '../../knowledge';
import { RegisteredMasterplan } from '../../v2/RegisteredMasterplan';
import { registeredJourneyById } from '../../spatial/registeredJourneys';
import {
  experiencesForStop,
  knowledgeForPlace,
  placeForExperience,
  relationForStop,
  visualsForPlace,
} from '../legendaryCrossIndex';
import { useLegendaryDirector } from '../legendaryDirector';
import { princeReceptionXrayAnnotations } from '../legendarySignaturePresentation';
import { journeyProgressForLegendaryBeat, mapFocusPercent } from '../legendarySpatialStoryEngine';
import { legendaryBeatById, legendaryBeatIndex } from '../legendaryStoryGraph';
import { useLegendaryStore } from '../legendaryStore';
import { sourceTimingLabel } from '../legendaryTemporalEngine';
import { princeJourneyWindow, princeLegendaryStory } from './princeStory';
import '../legendary.css';

interface PrinceLegendaryExperienceProps {
  evidenceMode?: boolean;
  onExit: () => void;
}

export function PrinceLegendaryExperience({ evidenceMode = false, onExit }: PrinceLegendaryExperienceProps) {
  const reduceMotion = useReducedMotion();
  const session = useLegendaryStore();
  const journey = registeredJourneyById.prince;
  const beat = legendaryBeatById(princeLegendaryStory, session.activeBeatId);
  const beatIndex = legendaryBeatIndex(princeLegendaryStory, beat.id);
  const inspectedStopId = session.inspectedStopId ?? session.activeStopId;
  const selectedStopIndex = Math.max(0, journey.stops.findIndex((stop) => stop.stopId === inspectedStopId));
  const routeProgress = session.completed
    ? 1
    : journeyProgressForLegendaryBeat(princeLegendaryStory, beat.id, session.cinematicProgress);
  const focus = mapFocusPercent(beat);
  const activeExperience = experiences.find((item) => item.id === session.activeExperienceId);
  const activeKnowledge = session.activeKnowledgeId ? gardenById[session.activeKnowledgeId] : undefined;
  const placeRelation = relationForStop(inspectedStopId);
  const sourceAsset = beat.visualAssetId ? assetById.get(beat.visualAssetId) : undefined;
  const [whereReturnExperienceId, setWhereReturnExperienceId] = useState<string>();

  useLegendaryDirector();

  useEffect(() => {
    session.reset();
    return () => useLegendaryStore.getState().reset();
    // The proof session intentionally starts clean on every entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const relationshipSummary = useMemo(() => {
    if (!placeRelation) return undefined;
    return {
      days: eventDays.filter((day) => placeRelation.dayIds.includes(day.id)),
      experiences: experiencesForStop(placeRelation.stopId),
      knowledge: knowledgeForPlace(placeRelation.stopId),
      visuals: visualsForPlace(placeRelation.stopId),
    };
  }, [placeRelation]);

  const openWhereQuery = () => {
    if (!activeExperience) return;
    const mappedPlace = placeForExperience(activeExperience.id);
    if (!mappedPlace) return;
    setWhereReturnExperienceId(activeExperience.id);
    session.inspectStop(mappedPlace.stopId);
    session.showQuery('where-does-this-happen');
  };

  const returnToExperience = () => {
    if (!whereReturnExperienceId) return;
    session.openExperience(whereReturnExperienceId);
  };

  const timeDisplay = beat.actualTime ? (
    <span className="kaga-legendary-clock" dir="ltr"><bdi>{beat.actualTime.replace(' م', '')}</bdi><i>م</i></span>
  ) : sourceTimingLabel(beat);

  if (!session.started) {
    return (
      <section className="kaga-legendary-entry" data-testid="legendary-entry" aria-labelledby="legendary-entry-title">
        <div className="kaga-legendary-entry__visual">
          <img src="/kaga/assets/core/prince-day-p023.webp" alt="زيارة سمو أمير منطقة الرياض" />
        </div>
        <article>
          <p className="kaga-v2-kicker">اليوم الثالث · رحلة حية</p>
          <h1 id="legendary-entry-title">رحلة سمو أمير المنطقة وسمو نائبه وسمو الأمين</h1>
          <p>تمثيل حي يربط وقت الزيارة ومكانها ومحطاتها وتجاربها في سياق واحد متصل، وفق المصدر المعتمد.</p>
          <dl>
            <div><dt>وقت الرحلة</dt><dd>{princeJourneyWindow}</dd></div>
            <div><dt>الموقع</dt><dd>حدائق الملك عبدالله</dd></div>
            <div><dt>المصدر</dt><dd>مخطط الرحلة · صفحة 25</dd></div>
          </dl>
          <button type="button" className="kaga-v2-action kaga-v2-action--primary" onClick={session.startDirector}>شاهد قصة الرحلة</button>
          <button type="button" className="kaga-legendary-text-action" onClick={onExit}>العودة إلى المشروع</button>
        </article>
      </section>
    );
  }

  return (
    <section
      className="kaga-legendary"
      data-testid="legendary-prince-experience"
      data-mode={session.mode}
      data-overlay={Boolean(activeExperience || activeKnowledge)}
      style={{ '--legendary-focus-x': `${focus.x}%`, '--legendary-focus-y': `${focus.y}%` } as React.CSSProperties}
    >
      <header className="kaga-legendary__header">
        <div>
          <span>رحلة حية</span>
          <strong>رحلة سمو أمير المنطقة وسمو نائبه وسمو الأمين</strong>
        </div>
        <div className="kaga-legendary__lens" aria-label="عدسة العرض الحالية"><small>العدسة</small><b>الضيف</b></div>
      </header>

      <nav className="kaga-legendary__chapters" aria-label="فصول الرحلة">
        {princeLegendaryStory.map((item, index) => (
          <span key={item.id} data-current={item.id === beat.id} data-complete={index < beatIndex || session.completed}>
            <i aria-hidden="true" />{item.chapterAr}
          </span>
        ))}
      </nav>

      <div className="kaga-legendary__stage">
        <div className="kaga-legendary-map-stage">
          <div className="kaga-legendary-map-stage__canvas">
            <RegisteredMasterplan
              mode="event"
              journeyId="prince"
              progress={routeProgress}
              playing={session.mode === 'directed'}
              selectedStopIndex={selectedStopIndex}
              onGardenSelect={() => undefined}
              onStopSelect={(index) => {
                if (session.mode !== 'explore') session.interrupt();
                session.inspectStop(journey.stops[index]!.stopId);
              }}
            />
          </div>
          <div className="kaga-legendary-map-stage__time" aria-live="polite">
            <small>الوقت في المصدر</small>
            <strong>{timeDisplay}</strong>
          </div>
          {session.mode === 'explore' ? (
            <button type="button" className="kaga-legendary-map-query" onClick={() => session.showQuery('what-happens')}>ماذا يحدث هنا؟</button>
          ) : null}
          {session.activeQuery === 'where-does-this-happen' && placeRelation ? (
            <aside
              className="kaga-legendary-where-answer"
              data-testid="legendary-spatial-query"
              style={{ '--where-x': `${focus.x}%`, '--where-y': `${focus.y}%` } as React.CSSProperties}
            >
              <div className="kaga-legendary-where-answer__pulse" aria-hidden="true" />
              <article>
                <p className="kaga-v2-kicker">هنا يحدث هذا</p>
                <h2>{placeRelation.titleAr}</h2>
                <button type="button" onClick={returnToExperience}>العودة إلى التجربة</button>
              </article>
            </aside>
          ) : null}
        </div>

        <article className="kaga-legendary-narrative" data-testid="legendary-temporal-panel">
          <p className="kaga-v2-kicker">{beat.chapterAr}</p>
          <h1>{beat.titleAr}</h1>
          <p>{beat.narrativeAr}</p>
          <div className="kaga-legendary-narrative__facts">
            <span><small>المحطة</small><b>{journey.stops[selectedStopIndex]?.code ?? '—'}</b></span>
            <span><small>التوقيت</small><b>{timeDisplay}</b></span>
          </div>
          {sourceAsset ? <figure><img src={sourceAsset.path} alt={sourceAsset.alt} /><figcaption>مشهد مرتبط بالمحطة من المصدر</figcaption></figure> : null}
          <div className="kaga-legendary-narrative__actions">
            {session.mode === 'directed' ? <button type="button" onClick={session.interrupt}>استكشف</button> : null}
            {session.mode === 'paused' && !session.completed ? <button type="button" onClick={session.resume}>متابعة القصة</button> : null}
            {session.mode === 'explore' ? <button type="button" className="is-primary" onClick={session.resume}>متابعة القصة</button> : null}
            {beat.experienceId && !activeExperience ? <button type="button" onClick={() => session.openExperience(beat.experienceId!)}>دخول التجربة</button> : null}
            {beat.knowledgeId && !activeKnowledge ? <button type="button" onClick={() => session.openKnowledge(beat.knowledgeId!)}>اكتشف الموقع</button> : null}
          </div>
          {!session.completed ? (
            <div className="kaga-legendary-narrative__sequence">
              <button type="button" onClick={session.previousBeat} disabled={beatIndex === 0}>السابق</button>
              <span dir="ltr">{beatIndex + 1} / {princeLegendaryStory.length}</span>
              <button type="button" onClick={session.advanceBeat}>التالي</button>
            </div>
          ) : null}
          {evidenceMode ? (
            <details className="kaga-legendary-evidence" data-testid="legendary-evidence">
              <summary>إظهار الدليل</summary>
              {beat.source.map((source, index) => (
                <p key={`${source.sourceLabel}-${index}`}><b>{source.sourceLabel}</b><span>الصفحات {source.pdfPages.join('، ')}</span></p>
              ))}
              <p><b>المخطط المكاني</b><span>KAGA-SOURCE-2D-V1 · {beat.mapFocus?.anchorConfidence ?? 'غير مستخدم'}</span></p>
            </details>
          ) : null}
        </article>
      </div>

      <AnimatePresence>
        {activeExperience ? (
          <motion.aside
            className="kaga-legendary-experience"
            data-testid="legendary-experience-reveal"
            data-xray={session.xrayEnabled}
            initial={reduceMotion ? { opacity: 0 } : { clipPath: `circle(2.5rem at ${focus.x}% ${focus.y}%)`, opacity: 0.86 }}
            animate={{ clipPath: `circle(145% at ${focus.x}% ${focus.y}%)`, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { clipPath: `circle(2.5rem at ${focus.x}% ${focus.y}%)`, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.82, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="kaga-legendary-experience__visual">
              <img src={activeExperience.image} alt={activeExperience.title} />
              <AnimatePresence>
                {session.xrayEnabled ? (
                  <motion.div
                    className="kaga-legendary-xray-scene"
                    data-testid="legendary-xray"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                      {princeReceptionXrayAnnotations.map((annotation) => (
                        <g key={annotation.id}>
                          <line x1={annotation.anchor[0]} y1={annotation.anchor[1]} x2={annotation.labelPosition[0]} y2={annotation.labelPosition[1]} />
                          <circle cx={annotation.anchor[0]} cy={annotation.anchor[1]} r="0.55" />
                        </g>
                      ))}
                    </svg>
                    {princeReceptionXrayAnnotations.map((annotation, index) => (
                      <motion.article
                        key={annotation.id}
                        className="kaga-legendary-xray-callout"
                        data-category={annotation.category}
                        style={{ '--xray-x': `${annotation.labelPosition[0]}%`, '--xray-y': `${annotation.labelPosition[1]}%` } as React.CSSProperties}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: reduceMotion ? 0 : index * 0.08 }}
                      >
                        <small>{String(index + 1).padStart(2, '0')} · {annotation.labelAr}</small>
                        <strong>{annotation.valueAr}</strong>
                      </motion.article>
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
            <article>
              <p className="kaga-v2-kicker">المكان أصبح التجربة</p>
              <h2>{activeExperience.title}</h2>
              <p>{activeExperience.description}</p>
              <div className="kaga-legendary-experience__actions">
                <button type="button" onClick={session.toggleXray} aria-pressed={session.xrayEnabled}>كشف التجربة</button>
                {placeForExperience(activeExperience.id) ? <button type="button" onClick={openWhereQuery}>أين يحدث هذا؟</button> : null}
                <button type="button" className="is-primary" onClick={session.returnToJourney}>العودة إلى الرحلة</button>
              </div>
            </article>
          </motion.aside>
        ) : null}

        {activeKnowledge ? (
          <motion.aside className="kaga-legendary-knowledge" data-testid="legendary-knowledge" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
            <p className="kaga-v2-kicker">معرفة المكان</p>
            <h2>{activeKnowledge.titleAr}</h2>
            {activeKnowledge.areaSqm ? <strong>{activeKnowledge.areaSqm.toLocaleString('ar-SA')} م²</strong> : null}
            <p>{activeKnowledge.descriptionAr}</p>
            <button type="button" onClick={session.returnToJourney}>العودة إلى الرحلة</button>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      {session.activeQuery === 'what-happens' && relationshipSummary && placeRelation ? (
        <aside className="kaga-legendary-relationships" data-testid="legendary-spatial-query">
          <button type="button" onClick={() => session.showQuery(undefined)} aria-label="إغلاق">×</button>
          <p className="kaga-v2-kicker">المكان الحالي</p>
          <h2>{placeRelation.titleAr}</h2>
          <div className="kaga-legendary-relationships__line" aria-hidden="true" />
          <ul>
            <li><small>اليوم</small><strong>{relationshipSummary.days.map((day) => day.ordinalLabel).join('، ')}</strong></li>
            <li><small>الرحلة</small><strong>رحلة سمو أمير المنطقة وسمو نائبه وسمو الأمين</strong></li>
            {relationshipSummary.experiences.length ? <li><small>التجربة</small><strong>{relationshipSummary.experiences.map((item) => item.title).join('، ')}</strong></li> : null}
            {relationshipSummary.visuals.length ? <li><small>المشهد / المرئيات</small><strong>{relationshipSummary.visuals.map((item) => item.alt).join('، ')}</strong></li> : null}
            {relationshipSummary.knowledge.length ? <li><small>المعرفة</small><strong>{relationshipSummary.knowledge.map((item) => item.titleAr).join('، ')}</strong></li> : null}
          </ul>
          <p className="kaga-legendary-relationships__truth">علاقات مصدرية متصلة بهذا المكان.</p>
          <button type="button" className="kaga-legendary-relationships__return" onClick={() => session.showQuery(undefined)}>العودة إلى الرحلة</button>
        </aside>
      ) : null}

      {session.completed ? (
        <aside className="kaga-legendary-finale" data-testid="legendary-finale">
          <p className="kaga-v2-kicker">اكتمال المسار</p>
          <h2>اكتملت رحلة الزيارة الخاصة</h2>
          <p>يعرض المخطط الآن المسار كاملاً، مع بقاء بيانات الزيارة وتوقيتها كما وردت في المصدر.</p>
          <div><button type="button" onClick={session.restart}>إعادة الرحلة</button><button type="button" onClick={onExit}>العودة إلى المشروع</button></div>
        </aside>
      ) : null}
    </section>
  );
}
