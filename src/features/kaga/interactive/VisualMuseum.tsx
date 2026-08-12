import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { GalleryEnvironment } from '../types';
import { SourceChip } from '../shared/SourceChip';
import { presentationSurfaceAttributes } from '../theme';
import './interactiveV2.css';

export function VisualMuseum({ environments }: { environments: GalleryEnvironment[] }) {
  const [environmentId, setEnvironmentId] = useState(environments[0]?.id ?? '');
  const [imageIndex, setImageIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [anglesVisible, setAnglesVisible] = useState(false);
  const reduceMotion = useReducedMotion();
  const active = useMemo(() => environments.find((item) => item.id === environmentId) ?? environments[0], [environmentId, environments]);
  const image = active?.images[imageIndex] ?? active?.images[0];

  const move = (delta: number) => {
    if (!active?.images.length) return;
    setImageIndex((current) => (current + delta + active.images.length) % active.images.length);
  };

  if (!active || !image) {
    return <section className="kaga-empty-state kaga-interactive-empty"><h1>معرض التصاميم</h1><p>لا توجد صور قابلة للعرض في الحزمة.</p></section>;
  }

  return (
    <section className={`kaga-section kaga-museum kaga-rebirth-museum ${fullscreen ? 'is-fullscreen' : ''}`} aria-labelledby="museum-title" data-testid="visual-museum" data-visual-rebirth="museum" data-chrome-visible={anglesVisible} {...presentationSurfaceAttributes('visual-museum')}>
      <header className="kaga-section-heading kaga-rebirth-museum__header">
        <div><span className="kaga-kicker">المشهد {String(environments.findIndex((item) => item.id === active.id) + 1).padStart(2, '0')}</span><h1 id="museum-title">معرض التصاميم</h1></div>
        <button className="kaga-icon-button" onClick={() => setFullscreen((value) => !value)} aria-label={fullscreen ? 'إنهاء ملء الشاشة' : 'عرض بملء الشاشة'}>
          {fullscreen ? <Minimize2 /> : <Maximize2 />}
        </button>
      </header>
      <nav className="kaga-museum-tabs" aria-label="بيئات معرض التصاميم">
        {environments.map((environment) => (
          <button key={environment.id} className={environment.id === active.id ? 'is-active' : ''} onClick={() => { setEnvironmentId(environment.id); setImageIndex(0); }}>{environment.title}</button>
        ))}
      </nav>
      <div className="kaga-museum-stage kaga-interactive-organic-crescent" data-testid="visual-museum-world">
        <AnimatePresence mode="wait">
          <motion.img
            key={image.src}
            src={image.src}
            alt={image.alt}
            initial={reduceMotion ? false : { opacity: 0, scale: 1.018 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
          />
        </AnimatePresence>
        <div className="kaga-museum-caption">
          <div><span>{String(imageIndex + 1).padStart(2, '0')} / {String(active.images.length).padStart(2, '0')}</span><h2>{active.title}</h2><p>{active.description}</p></div>
          <div className="kaga-rebirth-museum__utilities">
            <button type="button" aria-expanded={anglesVisible} onClick={() => setAnglesVisible((value) => !value)}>زوايا المشهد</button>
            <SourceChip source={image.source} />
          </div>
        </div>
        <button className="kaga-museum-next" onClick={() => move(1)} aria-label="الصورة التالية"><ChevronLeft /></button>
        <button className="kaga-museum-prev" onClick={() => move(-1)} aria-label="الصورة السابقة"><ChevronRight /></button>
      </div>
      <div className="kaga-museum-strip" data-visible={anglesVisible} aria-hidden={!anglesVisible}>
        {active.images.map((item, index) => (
          <button key={`${item.src}-${index}`} className={index === imageIndex ? 'is-active' : ''} onClick={() => setImageIndex(index)} aria-label={`عرض الزاوية ${index + 1}`}>
            <img src={item.src} alt="" />
          </button>
        ))}
      </div>
    </section>
  );
}
