import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import type { ExperienceItem } from '../types';
import { SourceChip } from '../shared/SourceChip';
import { presentationSurfaceAttributes } from '../theme';
import './interactiveV2.css';

interface ExperiencesHubProps {
  items: ExperienceItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onOpenMap: () => void;
}

export function ExperiencesHub({ items, selectedId, onSelect, onOpenMap }: ExperiencesHubProps) {
  const reduceMotion = useReducedMotion();
  const active = selectedId === undefined ? items[0] : items.find((item) => item.id === selectedId);
  const invalidSelection = selectedId !== undefined && active === undefined;
  return (
    <section className="kaga-section kaga-experiences" aria-labelledby="experiences-title" data-testid="experiences-hub" {...presentationSurfaceAttributes('experiences')}>
      <header className="kaga-section-heading">
        <div>
          <span className="kaga-kicker">محطات مترابطة مع المخطط</span>
          <h1 id="experiences-title">التجارب والتفعيلات</h1>
        </div>
        <button className="kaga-secondary-button" onClick={onOpenMap}>العودة إلى الخريطة <ArrowLeft size={16} /></button>
      </header>
      {invalidSelection ? (
        <div className="kaga-empty-state" role="alert" data-testid="invalid-experience-selection">
          <div>
            <h2>تعذر فتح التجربة المطلوبة</h2>
            <p>معرّف التجربة المحدد غير مرتبط بمحتوى معتمد.</p>
            <button className="kaga-secondary-button" type="button" onClick={onOpenMap}>العودة إلى الخريطة</button>
          </div>
        </div>
      ) : (
      <div className="kaga-experience-layout kaga-interactive-editorial-grid">
        <div className="kaga-experience-list">
          {items.map((item, index) => (
            <button key={item.id} className={item.id === active?.id ? 'is-active' : ''} onClick={() => onSelect(item.id)}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item.title}</strong>
              {item.location && <small>{item.location}</small>}
            </button>
          ))}
        </div>
        {active && (
          <motion.article
            className="kaga-experience-focus kaga-interactive-organic-sweep"
            key={active.id}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {active.image && <img src={active.image} alt={active.title} />}
            <div>
              <span className="kaga-kicker">محطة من تجربة الافتتاح</span>
              <h2>{active.title}</h2>
              <p>{active.description}</p>
              <SourceChip source={active.source} />
            </div>
          </motion.article>
        )}
      </div>
      )}
    </section>
  );
}
