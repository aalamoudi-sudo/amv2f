import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { RotateCcw, Sprout } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ExhibitionQuestion } from '../types';
import { SourceChip } from '../shared/SourceChip';
import { presentationSurfaceAttributes } from '../theme';
import './interactiveV2.css';

export interface ExhibitionKnowledgeItem {
  titleAr: string;
  summaryAr: string;
}

interface MobileExhibitionProps {
  questions: ExhibitionQuestion[];
  /** Official knowledge is injected by the knowledge layer; this module never invents it. */
  knowledgeByQuestionId?: Readonly<Record<string, ExhibitionKnowledgeItem>>;
  onOpenKnowledge?: (questionId: string) => void;
}

type ExhibitionPhase = 'idle' | 'questionSelected' | 'capsuleActivated' | 'responseRevealed';

const phaseLabels: Record<ExhibitionPhase, string> = {
  idle: 'اختر سؤالاً من النقاط السبع',
  questionSelected: 'تم اختيار السؤال — فعّل كبسولة البذرة',
  capsuleActivated: 'تنتقل الكبسولة وتتصل بالشاشة المقابلة',
  responseRevealed: 'تم كشف الاستجابة على الشاشة',
};

export function MobileExhibition({ questions, knowledgeByQuestionId, onOpenKnowledge }: MobileExhibitionProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<ExhibitionPhase>('idle');
  const reduceMotion = useReducedMotion();
  const active = activeIndex === null ? undefined : questions[activeIndex];
  const points = useMemo(
    () => questions.map((question, index) => ({ question, angle: (index / questions.length) * Math.PI * 2 - Math.PI / 2 })),
    [questions],
  );
  const activePoint = activeIndex === null ? undefined : points[activeIndex];
  const activeKnowledge = active ? knowledgeByQuestionId?.[active.id] : undefined;

  useEffect(() => {
    if (phase !== 'capsuleActivated') return;
    const timer = window.setTimeout(() => setPhase('responseRevealed'), reduceMotion ? 80 : 950);
    return () => window.clearTimeout(timer);
  }, [phase, reduceMotion]);

  const selectQuestion = (index: number) => {
    setActiveIndex(index);
    setPhase('questionSelected');
  };

  const reset = () => {
    setActiveIndex(null);
    setPhase('idle');
  };

  const capsuleStyle = activePoint && (phase === 'capsuleActivated' || phase === 'responseRevealed')
    ? {
        '--capsule-x': `${50 + Math.cos(activePoint.angle) * 38}%`,
        '--capsule-y': `${50 + Math.sin(activePoint.angle) * 38}%`,
        '--connection-angle': `${activePoint.angle + Math.PI / 2}rad`,
      } as React.CSSProperties
    : undefined;

  return (
    <section className="kaga-section kaga-mobile" aria-labelledby="mobile-title" data-testid="mobile-exhibition" data-phase={phase} {...presentationSurfaceAttributes('mobile-exhibition')}>
      <header className="kaga-section-heading">
        <div>
          <span className="kaga-kicker">تجربة تفاعلية من العرض</span>
          <h1 id="mobile-title">المعرض المتنقل</h1>
          <p>اختر سؤالاً، ثم فعّل كبسولة البذرة على نقطته لتتصل الطاولة بالشاشة وتكشف الاستجابة.</p>
        </div>
        <SourceChip source={{ pdfPages: [...new Set(questions.flatMap((item) => item.source.pdfPages))] }} />
      </header>

      <div className="kaga-exhibition-stage kaga-interactive-organic-portal">
        <div className="kaga-exhibition-orbit" aria-label="النقاط التفاعلية السبع">
          {points.map(({ question, angle }, index) => (
            <button
              className={`kaga-seed-point ${activeIndex === index ? 'is-active' : ''}`}
              key={question.id}
              style={{ '--seed-x': `${50 + Math.cos(angle) * 38}%`, '--seed-y': `${50 + Math.sin(angle) * 38}%` } as React.CSSProperties}
              onClick={() => selectQuestion(index)}
              aria-label={`النقطة ${index + 1}: ${question.question}`}
              aria-pressed={activeIndex === index}
            >
              <span>{index + 1}</span>
            </button>
          ))}
          <motion.button
            className="kaga-seed-capsule"
            data-travelling={phase === 'capsuleActivated'}
            style={capsuleStyle}
            onClick={() => setPhase('capsuleActivated')}
            disabled={phase !== 'questionSelected'}
            aria-label="تفعيل كبسولة البذرة"
          >
            <Sprout aria-hidden="true" size={34} />
            <span>كبسولة البذرة</span>
          </motion.button>
          <div className="kaga-exhibition-connection" style={capsuleStyle} data-visible={phase === 'capsuleActivated' || phase === 'responseRevealed'} aria-hidden="true" />
        </div>

        <div className="kaga-exhibition-response" aria-live="polite">
          <AnimatePresence mode="wait">
            {active && phase === 'responseRevealed' ? (
              <motion.div
                key={active.id}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              >
                <span className="kaga-step-number">{String((activeIndex ?? 0) + 1).padStart(2, '0')}</span>
                <h2>{active.question}</h2>
                <p>{active.response}</p>
                {activeKnowledge && onOpenKnowledge ? (
                  <button
                    className="kaga-secondary-button kaga-knowledge-affordance"
                    type="button"
                    onClick={() => onOpenKnowledge(active.id)}
                    aria-label={`اعرف أكثر: ${activeKnowledge.titleAr}`}
                  >
                    اعرف أكثر
                  </button>
                ) : null}
                <SourceChip source={active.source} />
              </motion.div>
            ) : active ? (
              <motion.div key={`${active.id}-${phase}`} className="kaga-exhibition-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Sprout aria-hidden="true" size={42} />
                <h2>{active.question}</h2>
                <p>{phaseLabels[phase]}</p>
              </motion.div>
            ) : (
              <motion.div key="idle" className="kaga-exhibition-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Sprout aria-hidden="true" size={42} />
                <h2>ابدأ من إحدى النقاط المضيئة</h2>
                <p>تعيد التجربة تمثيل الفكرة التفاعلية المقترحة، وليست نظاماً مرتبطاً بمعرض فعلي.</p>
              </motion.div>
            )}
          </AnimatePresence>
          {active && (
            <button className="kaga-text-button" onClick={reset}>
              <RotateCcw aria-hidden="true" size={16} /> إعادة التجربة
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
