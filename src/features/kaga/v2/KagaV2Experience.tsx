import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BookOpen, ChevronLeft, ChevronRight, Maximize, Minimize } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  eventDays,
  exhibitionQuestions,
  experiences,
  galleryEnvironments,
  identityApplications,
  invitationSource,
  launchLayers,
  royalMomentSource,
} from '../data';
import type { JourneyId } from '../data/spatialTypes';
import { FourDayExperience, LaunchShow, RoyalMoment } from '../experience';
import { crescentBuilding, crescentStorySteps, faqById, gardenById, projectFactById } from '../knowledge';
import { MetricValue } from '../shared/MetricValue';
import { useRegisteredSpatialStore } from '../spatial/registeredSpatialStore';
import {
  OrganicPresentationFrame,
  kagaThemeCssVariables,
  presentationArchetypeBySurface,
  presentationFidelityCssVariables,
  presentationSurfaceAttributes,
  sourceThemeCssVariables,
  type PresentationSurfaceId,
} from '../theme';
import { KagaV2Intro } from './KagaV2Intro';
import { KagaV2Masterplan } from './KagaV2Masterplan';
import { ReadOnlyDaySpatialPreview } from './ReadOnlyDaySpatialPreview';
import { kagaV2Assets } from './v2Assets';
import '../kaga.css';
import './kagaV2Gate1.css';
import './presentationFidelityScreens.css';
import './presentationFidelityGate2.css';
import '../theme/sourceTheme.css';
import './visualRebirth.css';

const ExperiencesHub = lazy(() => import('../interactive/ExperiencesHub').then((module) => ({ default: module.ExperiencesHub })));
const MobileExhibition = lazy(() => import('../interactive/MobileExhibition').then((module) => ({ default: module.MobileExhibition })));
const InvitationExperience = lazy(() => import('../interactive/InvitationExperience').then((module) => ({ default: module.InvitationExperience })));
const IdentityApplications = lazy(() => import('../interactive/IdentityApplications').then((module) => ({ default: module.IdentityApplications })));
const VisualMuseum = lazy(() => import('../interactive/VisualMuseum').then((module) => ({ default: module.VisualMuseum })));
const PrinceLegendaryExperience = lazy(() => import('../legendary/prince/PrinceLegendaryExperience').then((module) => ({ default: module.PrinceLegendaryExperience })));
const LegendarySystemExperience = lazy(() => import('../legendary/LegendarySystemExperience').then((module) => ({ default: module.LegendarySystemExperience })));
const ExecutiveDelight90s = lazy(() => import('../delight/ExecutiveDelight90s').then((module) => ({ default: module.ExecutiveDelight90s })));

type V2Section =
  | 'intro'
  | 'scale'
  | 'days'
  | 'map'
  | 'experiences'
  | 'mobile'
  | 'invitations'
  | 'identity'
  | 'crescent'
  | 'royal'
  | 'launch'
  | 'legendary'
  | 'legendary-system'
  | 'delight'
  | 'museum';

const executiveNavigation: Array<{ id: V2Section; label: string }> = [
  { id: 'intro', label: 'الرئيسية' },
  { id: 'days', label: 'الأيام' },
  { id: 'map', label: 'الخريطة' },
  { id: 'legendary-system', label: 'قصة التدشين' },
  { id: 'experiences', label: 'التجارب' },
  { id: 'museum', label: 'التصاميم' },
];

const presenterOrder: Array<{ id: V2Section; label: string }> = [
  { id: 'days', label: 'الأيام الأربعة' },
  { id: 'map', label: 'المخطط التفاعلي' },
  { id: 'royal', label: 'لحظة التدشين' },
  { id: 'launch', label: 'عرض التدشين' },
  { id: 'mobile', label: 'المعرض المتنقل' },
  { id: 'museum', label: 'معرض التصاميم' },
];

const dayPresentationVisuals: Record<string, { path: string; altAr: string }> = {
  'day-01': { path: '/kaga/assets/v2/site-aerial-p001.jpg', altAr: 'المشهد الجوي لحدائق الملك عبدالله' },
  'day-02': { path: '/kaga/assets/v2/royal-model-clean-p015.jpg', altAr: 'مجسم لحظة التدشين الملكية' },
  'day-03': { path: '/kaga/assets/gallery/vip/angle-01-p079.webp', altAr: 'مشهد منطقة كبار الشخصيات' },
  'day-04': { path: '/kaga/assets/gallery/press/angle-01-p127.webp', altAr: 'مشهد المؤتمر الصحفي' },
};

const experienceFamily = new Set<V2Section>(['experiences', 'mobile', 'invitations', 'identity']);

const surfaceBySection: Record<V2Section, PresentationSurfaceId> = {
  intro: 'intro',
  scale: 'project-scale',
  days: 'four-days',
  map: 'masterplan',
  experiences: 'experiences',
  mobile: 'mobile-exhibition',
  invitations: 'invitation-experience',
  identity: 'visual-identity',
  crescent: 'crescent-story',
  royal: 'royal-moment',
  launch: 'launch-show',
  legendary: 'masterplan',
  'legendary-system': 'masterplan',
  delight: 'intro',
  museum: 'visual-museum',
};

const scaleFacts = [
  projectFactById['garden-area'],
  projectFactById['plant-count'],
  projectFactById['botanical-garden-count'],
].filter((fact) => fact !== undefined);

const jurassicKnowledge = gardenById.jurassicGarden!;
const butterflyKnowledge = gardenById.butterflyGarden!;
const mazeKnowledge = gardenById.mazeGarden!;
const externalGardensFaq = faqById['faq-external-gardens']!;
const projectFaq = faqById['faq-what-is-kaga']!;

const mobileKnowledgeByQuestionId = {
  jurassic: { titleAr: jurassicKnowledge.titleAr, summaryAr: jurassicKnowledge.descriptionAr ?? '' },
  butterflies: { titleAr: butterflyKnowledge.titleAr, summaryAr: butterflyKnowledge.descriptionAr ?? '' },
  crescents: { titleAr: crescentBuilding.titleAr, summaryAr: crescentBuilding.summaryAr },
  diversity: { titleAr: externalGardensFaq.questionAr, summaryAr: externalGardensFaq.answerAr },
  maze: { titleAr: mazeKnowledge.titleAr, summaryAr: mazeKnowledge.descriptionAr ?? '' },
  'final-form': { titleAr: projectFaq.questionAr, summaryAr: projectFaq.answerAr },
} as const;

export function KagaV2Experience() {
  const [section, setSection] = useState<V2Section>('intro');
  const [mapEntryMode, setMapEntryMode] = useState<'event' | 'gardens'>('event');
  const [selectedExperienceId, setSelectedExperienceId] = useState<string>();
  const [presenterMode, setPresenterMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileKnowledgeId, setMobileKnowledgeId] = useState<keyof typeof mobileKnowledgeByQuestionId>();
  const [legendaryJourneyId, setLegendaryJourneyId] = useState<JourneyId>();
  const reduceMotion = useReducedMotion();
  const selectJourney = useRegisteredSpatialStore((state) => state.selectJourney);
  const provenanceMode = useMemo(() => {
    const requested = new URLSearchParams(window.location.search).get('provenance') === '1';
    return requested && (import.meta.env.DEV || import.meta.env.VITE_KAGA_PROVENANCE === 'true');
  }, []);

  useEffect(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    document.title = 'KAGA FINAL EXPERIENCE — تدشين حدائق الملك عبدالله';
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!presenterMode) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      const currentIndex = Math.max(0, presenterOrder.findIndex((item) => item.id === section));
      if (event.key === 'ArrowLeft' || event.key === 'PageDown') {
        event.preventDefault();
        setSection(presenterOrder[Math.min(presenterOrder.length - 1, currentIndex + 1)]!.id);
      }
      if (event.key === 'ArrowRight' || event.key === 'PageUp') {
        event.preventDefault();
        setSection(presenterOrder[Math.max(0, currentIndex - 1)]!.id);
      }
      if (event.key === 'Escape') setPresenterMode(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [presenterMode, section]);

  const openMap = (mode: 'event' | 'gardens') => {
    setMapEntryMode(mode);
    setSection('map');
  };

  const openJourney = (id: string) => {
    if (['workers', 'mayor', 'prince', 'guests', 'mayorMedia', 'media'].includes(id)) {
      selectJourney(id as JourneyId);
    }
    openMap('event');
  };

  const openExperience = (id: string) => {
    if (id === 'royal') { setSection('crescent'); return; }
    if (id === 'launch') { setSection('launch'); return; }
    if (id === 'mobile-exhibition') { setSection('mobile'); return; }
    setSelectedExperienceId(id);
    setSection('experiences');
  };

  const openLegendaryJourney = (id: string) => {
    if (id === 'prince') {
      selectJourney('prince');
      setSection('legendary');
      return;
    }
    if (id === 'guests') {
      selectJourney('guests');
      setLegendaryJourneyId('guests');
      setSection('legendary-system');
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Presenter controls remain usable when browser fullscreen permission is denied.
    }
  };

  const currentPresenterIndex = Math.max(0, presenterOrder.findIndex((item) => item.id === section));
  const navigatePresenter = (offset: number) => {
    const nextIndex = Math.max(0, Math.min(presenterOrder.length - 1, currentPresenterIndex + offset));
    setSection(presenterOrder[nextIndex]!.id);
  };

  const renderScale = () => (
    <section className="kaga-v2-scale" data-testid="project-scale" aria-labelledby="project-scale-title" {...presentationSurfaceAttributes('project-scale')}>
      <OrganicPresentationFrame
        variant="folio"
        tone="ivory"
        visualPosition="end"
        visual={<img src={kagaV2Assets.siteAerial.path} alt={kagaV2Assets.siteAerial.altAr} />}
        content={(
          <div className="kaga-v2-scale__editorial">
            <p className="kaga-v2-kicker">حدائق الملك عبدالله</p>
            <h1 id="project-scale-title">مكانٌ بحجم قصة</h1>
            <div className="kaga-v2-scale__facts">
              {scaleFacts.map((fact) => (
                <div key={fact.id}>
                  <strong>
                    <MetricValue value={fact.metricValue} unitAr={fact.metricUnitAr} exponent={fact.metricExponent} />
                  </strong>
                  <span>{fact.labelAr}</span>
                </div>
              ))}
            </div>
            <p className="kaga-v2-scale__split"><bdi>٧ داخلية</bdi><i /> <bdi>٨ خارجية</bdi></p>
            <button type="button" className="kaga-v2-action kaga-v2-action--primary" onClick={() => setSection('days')}>اكتشف أيام التدشين</button>
          </div>
        )}
      />
    </section>
  );

  const renderCrescentStory = () => (
    <section className="kaga-v2-crescent-world" data-testid="crescent-story" aria-labelledby="crescent-story-title" {...presentationSurfaceAttributes('crescent-story')}>
      <OrganicPresentationFrame
        variant="crescent"
        tone="green"
        fullBleed
        visual={<img src={kagaV2Assets.royalModelClean.path} alt={kagaV2Assets.royalModelClean.altAr} />}
        content={(
          <article className="kaga-v2-crescent-editorial">
            <p className="kaga-v2-kicker">{crescentBuilding.roleAr}</p>
            <h1 id="crescent-story-title">{crescentBuilding.titleAr}</h1>
            <p>{crescentBuilding.summaryAr}</p>
            <ol>
              {crescentStorySteps.map((step) => (
                <li key={step.id}><small>{step.eyebrowAr}</small><strong>{step.titleAr}</strong></li>
              ))}
              <li><small>اللحظة</small><strong>لحظة التدشين</strong></li>
            </ol>
            <button type="button" className="kaga-v2-action kaga-v2-action--gold" onClick={() => setSection('royal')}>انتقل إلى لحظة التدشين</button>
          </article>
        )}
      />
    </section>
  );

  const renderExperienceFamily = () => (
    <section className="kaga-v2-experience-family" data-testid="experience-family" {...presentationSurfaceAttributes(surfaceBySection[section])}>
      <nav aria-label="التجارب التفاعلية">
        {[
          ['experiences', 'التجارب والتفعيلات'],
          ['mobile', 'المعرض المتنقل'],
          ['invitations', 'منصة الدعوات'],
          ['identity', 'الهوية البصرية'],
        ].map(([id, label]) => (
          <button key={id} type="button" aria-pressed={section === id} onClick={() => setSection(id as V2Section)}>{label}</button>
        ))}
      </nav>
      <Suspense fallback={<div className="kaga-v2-loading" role="status">جارٍ فتح التجربة…</div>}>
        {section === 'experiences' ? (
          <ExperiencesHub items={experiences} selectedId={selectedExperienceId} onSelect={setSelectedExperienceId} onOpenMap={() => openMap('event')} />
        ) : null}
        {section === 'mobile' ? (
          <MobileExhibition
            questions={exhibitionQuestions}
            knowledgeByQuestionId={mobileKnowledgeByQuestionId}
            onOpenKnowledge={(questionId) => setMobileKnowledgeId(questionId as keyof typeof mobileKnowledgeByQuestionId)}
          />
        ) : null}
        {section === 'invitations' ? <InvitationExperience source={invitationSource} /> : null}
        {section === 'identity' ? <IdentityApplications items={identityApplications} /> : null}
      </Suspense>
      {section === 'mobile' && mobileKnowledgeId ? (
        <aside className="kaga-v2-contextual-knowledge" data-testid="mobile-knowledge-extension" aria-live="polite">
          <button type="button" onClick={() => setMobileKnowledgeId(undefined)} aria-label="إغلاق المعرفة">×</button>
          <p className="kaga-v2-kicker">من الدليل المعرفي</p>
          <h2>{mobileKnowledgeByQuestionId[mobileKnowledgeId].titleAr}</h2>
          <p>{mobileKnowledgeByQuestionId[mobileKnowledgeId].summaryAr}</p>
        </aside>
      ) : null}
    </section>
  );

  const renderSection = () => {
    if (section === 'scale') return renderScale();
    if (section === 'days') return (
      <FourDayExperience
        days={eventDays}
        onOpenJourney={openJourney}
        onOpenLegendaryJourney={openLegendaryJourney}
        onOpenExperience={openExperience}
        presentationFidelity
        renderDayVisual={(day) => (
          <ReadOnlyDaySpatialPreview
            journeyIds={day.journeyIds}
            titleAr={day.title}
            sourceVisualPath={dayPresentationVisuals[day.id]?.path}
            sourceVisualAltAr={dayPresentationVisuals[day.id]?.altAr}
          />
        )}
      />
    );
    if (section === 'map') return (
      <KagaV2Masterplan
        key={mapEntryMode}
        initialMode={mapEntryMode}
        provenanceMode={provenanceMode}
        onOpenCrescentStory={() => setSection('crescent')}
        onOpenExperience={openExperience}
        onOpenLegendaryJourney={openLegendaryJourney}
        onReturnToProject={() => setSection('days')}
      />
    );
    if (experienceFamily.has(section)) return renderExperienceFamily();
    if (section === 'crescent') return renderCrescentStory();
    if (section === 'royal') return <RoyalMoment source={royalMomentSource} onContinue={() => setSection('launch')} />;
    if (section === 'launch') return <LaunchShow layers={launchLayers} />;
    if (section === 'legendary') return <Suspense fallback={<div className="kaga-v2-loading" role="status">جارٍ إعداد الرحلة الحية…</div>}><PrinceLegendaryExperience evidenceMode={provenanceMode} onExit={() => setSection('days')} /></Suspense>;
    if (section === 'legendary-system') return <Suspense fallback={<div className="kaga-v2-loading" role="status">جارٍ إعداد قصة التدشين…</div>}><LegendarySystemExperience evidenceModeAvailable={provenanceMode} initialJourneyId={legendaryJourneyId} autoStartJourney={legendaryJourneyId === 'guests'} onExit={() => { setLegendaryJourneyId(undefined); setSection('days'); }} /></Suspense>;
    if (section === 'delight') return <Suspense fallback={<div className="kaga-v2-loading" role="status">جارٍ فتح التجربة…</div>}><ExecutiveDelight90s onExit={() => setSection('intro')} onTeaseRoyal={() => setSection('crescent')} /></Suspense>;
    if (section === 'museum') return <Suspense fallback={<div className="kaga-v2-loading" role="status">جارٍ فتح معرض التصاميم…</div>}><VisualMuseum environments={galleryEnvironments} /></Suspense>;
    return null;
  };

  if (section === 'intro') {
    return (
      <main
        className="kaga-v2-app"
        lang="ar"
        dir="rtl"
        style={{ ...kagaThemeCssVariables, ...presentationFidelityCssVariables, ...sourceThemeCssVariables }}
        data-testid="kaga-v2-app"
        data-fidelity-surface="intro"
        {...presentationSurfaceAttributes('intro')}
      >
        <KagaV2Intro onEnterEvent={() => setSection('scale')} onExploreGardens={() => openMap('gardens')} onWatchDelight={() => setSection('delight')} />
      </main>
    );
  }

  if (section === 'delight') {
    return (
      <main
        className="kaga-v2-app"
        lang="ar"
        dir="rtl"
        style={{ ...kagaThemeCssVariables, ...presentationFidelityCssVariables, ...sourceThemeCssVariables }}
        data-testid="kaga-v2-app"
        data-fidelity-surface="delight"
        {...presentationSurfaceAttributes('intro')}
      >
        {renderSection()}
      </main>
    );
  }

  return (
    <main
      className="kaga-v2-app kaga-v2-executive"
      lang="ar"
      dir="rtl"
      style={{ ...kagaThemeCssVariables, ...presentationFidelityCssVariables, ...sourceThemeCssVariables }}
      data-testid="kaga-v2-app"
      data-presenter={presenterMode}
      data-provenance={provenanceMode}
      data-fidelity-surface={section === 'days' || section === 'map' ? section : undefined}
      data-visual-rebirth-section={section}
      {...presentationSurfaceAttributes(presenterMode ? 'presenter-shell' : surfaceBySection[section])}
    >
      <header className="kaga-v2-executive-header" data-testid="executive-header">
        <button type="button" className="kaga-v2-brand" onClick={() => setSection('intro')}>حدائق الملك عبدالله</button>
        {!presenterMode ? (
          <nav aria-label="التنقل التنفيذي">
            {executiveNavigation.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={item.id === section || (item.id === 'experiences' && experienceFamily.has(section)) ? 'page' : undefined}
                onClick={() => setSection(item.id)}
              >{item.label}</button>
            ))}
            <a href="/kaga/source/Rev06-King-Abdullah-Gardens-Inauguration.pdf" target="_blank" rel="noreferrer"><BookOpen size={15} />الوثيقة الأصلية</a>
          </nav>
        ) : (
          <div className="kaga-v2-presenter-controls" aria-label="تنقل وضع التقديم">
            <button type="button" onClick={() => navigatePresenter(-1)} disabled={currentPresenterIndex === 0} aria-label="القسم السابق"><ChevronRight /></button>
            <span>{presenterOrder[currentPresenterIndex]?.label}<small>{currentPresenterIndex + 1} / {presenterOrder.length}</small></span>
            <button type="button" onClick={() => navigatePresenter(1)} disabled={currentPresenterIndex === presenterOrder.length - 1} aria-label="القسم التالي"><ChevronLeft /></button>
          </div>
        )}
        <div className="kaga-v2-header-actions">
          <button type="button" onClick={toggleFullscreen} aria-label="تبديل ملء الشاشة">{isFullscreen ? <Minimize /> : <Maximize />}</button>
          <button type="button" aria-pressed={presenterMode} onClick={() => setPresenterMode((value) => !value)}>{presenterMode ? 'إنهاء العرض' : 'وضع التقديم'}</button>
        </div>
      </header>

      <div className="kaga-v2-world" data-section={section}>
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            className="kaga-v2-world__surface"
            data-world-archetype={presentationArchetypeBySurface[surfaceBySection[section]]}
            initial={reduceMotion ? false : presentationArchetypeBySurface[surfaceBySection[section]] === 'quiet-identity'
              ? { clipPath: 'inset(0 0 8% 0)', opacity: 0 }
              : presentationArchetypeBySurface[surfaceBySection[section]] === 'route-map'
                ? { clipPath: 'inset(0 2.5% 0 0)', opacity: 0.78 }
                : { clipPath: 'inset(0 0 0 100% round 42% 0 0 42%)', opacity: 0.72 }}
            animate={{ clipPath: 'inset(0 0 0 0 round 0%)', opacity: 1 }}
            exit={reduceMotion ? undefined : presentationArchetypeBySurface[surfaceBySection[section]] === 'quiet-identity'
              ? { clipPath: 'inset(8% 0 0 0)', opacity: 0 }
              : presentationArchetypeBySurface[surfaceBySection[section]] === 'route-map'
                ? { clipPath: 'inset(0 0 0 2.5%)', opacity: 0.78 }
                : { clipPath: 'inset(0 100% 0 0 round 0 42% 42% 0)', opacity: 0.72 }}
            transition={{ duration: reduceMotion ? 0 : 0.62, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderSection()}
          </motion.div>
        </AnimatePresence>
      </div>

      {provenanceMode ? (
        <aside className="kaga-v2-provenance-ribbon" data-testid="provenance-ribbon">
          Provenance / QA · {section}
        </aside>
      ) : null}
    </main>
  );
}
