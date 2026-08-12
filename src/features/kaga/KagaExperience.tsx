import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BookOpen, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  FourDayExperience,
  IntroExperience,
  LaunchShow,
  PresenterNavigation,
  RoyalMoment,
} from './experience';
import type { ExperienceNavigationItem } from './experience';
import {
  eventDays,
  exhibitionQuestions,
  experiences,
  galleryEnvironments,
  identityApplications,
  invitationSource,
  launchLayers,
  royalMomentSource,
} from './data';
import { ExperiencesHub } from './interactive/ExperiencesHub';
import { IdentityApplications } from './interactive/IdentityApplications';
import { InvitationExperience } from './interactive/InvitationExperience';
import { MobileExhibition } from './interactive/MobileExhibition';
import { VisualMuseum } from './interactive/VisualMuseum';
import { SpatialEngine } from './spatial';
import { useKagaExperienceStore } from './store';
import type { KagaSection } from './types';
import type { JourneyId } from './data/spatialTypes';
import './kaga.css';

const navigation: Array<ExperienceNavigationItem & { id: KagaSection }> = [
  { id: 'days', label: 'الأيام الأربعة', shortLabel: 'الأيام' },
  { id: 'map', label: 'الخريطة والرحلات', shortLabel: 'الخريطة' },
  { id: 'royal', label: 'لحظة التدشين', shortLabel: 'اللحظة الملكية' },
  { id: 'launch', label: 'عرض التدشين', shortLabel: 'العرض' },
  { id: 'experiences', label: 'التجارب والتفعيلات', shortLabel: 'التجارب' },
  { id: 'mobile', label: 'المعرض المتنقل', shortLabel: 'المعرض المتنقل' },
  { id: 'invitations', label: 'منصة الدعوات', shortLabel: 'الدعوات' },
  { id: 'identity', label: 'الهوية البصرية', shortLabel: 'الهوية' },
  { id: 'museum', label: 'معرض التصاميم', shortLabel: 'التصاميم' },
];

const sectionAliases: Record<string, KagaSection> = {
  'royal-moment': 'royal',
  'launch-show': 'launch',
  'garden-model': 'experiences',
  'era-walk': 'experiences',
  'memory-corner': 'experiences',
  'press-conference': 'experiences',
  'vip-area': 'experiences',
  'mobile-exhibition': 'mobile',
  invitations: 'invitations',
  identity: 'identity',
  museum: 'museum',
};

export function KagaExperience() {
  const [entered, setEntered] = useState(false);
  const [journeyId, setJourneyId] = useState<JourneyId>('workers');
  const [isBooting, setIsBooting] = useState(true);
  const reduceMotion = useReducedMotion();
  const section = useKagaExperienceStore((state) => state.section);
  const setSection = useKagaExperienceStore((state) => state.setSection);
  const selectedExperienceId = useKagaExperienceStore((state) => state.selectedExperienceId);
  const openExperience = useKagaExperienceStore((state) => state.openExperience);

  useEffect(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    document.title = 'تجربة تدشين حدائق الملك عبدالله';
    const timer = window.setTimeout(() => setIsBooting(false), 220);
    return () => window.clearTimeout(timer);
  }, []);

  const openMappedExperience = (id: string) => {
    const alias = sectionAliases[id];
    if (alias === 'experiences') openExperience(id);
    else if (alias) setSection(alias);
    else openExperience(id);
  };

  const openJourney = (id: string) => {
    if (id === 'workers' || id === 'mayor' || id === 'prince' || id === 'guests' || id === 'mayorMedia' || id === 'media') setJourneyId(id);
    setSection('map');
  };

  if (isBooting) {
    return <div className="kaga-app kaga-boot" role="status"><LoaderCircle aria-hidden="true" /><span>جارٍ تجهيز تجربة التدشين…</span></div>;
  }

  if (!entered) {
    return (
      <div className="kaga-app" data-testid="kaga-app">
        <IntroExperience
          title="تدشين حدائق الملك عبدالله"
          subtitle="تجربة تنفيذية تفاعلية تدخل بك إلى الأيام والمسارات واللحظة الاحتفائية كما وردت في العرض المعتمد."
          eyebrow="حدائق الملك عبدالله • الرياض"
          backgroundImageUrl="/kaga/assets/core/cover-p001.webp"
          source={{ pdfPages: [1, 3] }}
          onEnter={() => setEntered(true)}
        />
      </div>
    );
  }

  return (
    <div className="kaga-app" data-testid="kaga-app">
      <PresenterNavigation
        items={navigation}
        activeId={section}
        onNavigate={(id) => setSection(id as KagaSection)}
      />
      <a
        className="kaga-pdf-link"
        href="/kaga/source/Rev06-King-Abdullah-Gardens-Inauguration.pdf"
        target="_blank"
        rel="noreferrer"
        aria-label="فتح وثيقة المشروع الأصلية PDF"
      >
        <BookOpen aria-hidden="true" size={15} />
        الوثيقة الأصلية
      </a>
      <div className="kaga-app-shell">
        <main className="kaga-app-main" id="kaga-main">
          <AnimatePresence mode="wait">
            <motion.div
              className="kaga-section-frame"
              key={section}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
              transition={{ duration: reduceMotion ? 0 : 0.28 }}
            >
              {section === 'days' && (
                <FourDayExperience days={eventDays} onOpenJourney={openJourney} onOpenExperience={openMappedExperience} />
              )}
              {section === 'map' && (
                <SpatialEngine initialJourneyId={journeyId} onOpenExperience={openMappedExperience} />
              )}
              {section === 'royal' && <RoyalMoment source={royalMomentSource} onContinue={() => setSection('launch')} />}
              {section === 'launch' && <LaunchShow layers={launchLayers} />}
              {section === 'experiences' && (
                <ExperiencesHub items={experiences} selectedId={selectedExperienceId} onSelect={openExperience} onOpenMap={() => setSection('map')} />
              )}
              {section === 'mobile' && <MobileExhibition questions={exhibitionQuestions} />}
              {section === 'invitations' && <InvitationExperience source={invitationSource} />}
              {section === 'identity' && <IdentityApplications items={identityApplications} />}
              {section === 'museum' && <VisualMuseum environments={galleryEnvironments} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
