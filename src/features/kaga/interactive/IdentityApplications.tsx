import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Columns2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SourceChip } from '../shared/SourceChip';
import { presentationSurfaceAttributes } from '../theme';
import type { IdentityApplication } from '../types';
import './interactiveV2.css';

export function IdentityApplications({ items }: { items: IdentityApplication[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? '');
  const [proposalIndex, setProposalIndex] = useState(0);
  const [compare, setCompare] = useState(false);
  const reduceMotion = useReducedMotion();
  const active = useMemo(() => items.find((item) => item.id === activeId) ?? items[0], [activeId, items]);

  if (!active) return <section className="kaga-empty-state kaga-interactive-empty"><h1>الهوية البصرية</h1><p>لا تتوفر تطبيقات في الحزمة.</p></section>;
  const selectedProposal = active.proposals[proposalIndex] ?? active.proposals[0];
  const visible = compare ? active.proposals : selectedProposal ? [selectedProposal] : [];

  return (
    <section className="kaga-section kaga-identity" aria-labelledby="identity-title" data-testid="identity-applications" {...presentationSurfaceAttributes('visual-identity')}>
      <header className="kaga-section-heading">
        <div><span className="kaga-kicker">تطبيقات الهوية من المصدر</span><h1 id="identity-title">الهوية البصرية</h1><p>تجميع تطبيقي للزي، البطاقات، الأعلام، اللوحات، الحافلات وعربات الجولف.</p></div>
      </header>
      <nav className="kaga-identity-nav" aria-label="تطبيقات الهوية">
        {items.map((item) => <button key={item.id} className={item.id === active.id ? 'is-active' : ''} onClick={() => { setActiveId(item.id); setProposalIndex(0); setCompare(false); }}>{item.title}</button>)}
      </nav>
      {active.proposals.length > 1 ? (
        <nav className="kaga-identity-proposal-index" aria-label="اختيار مقترح الهوية">
          {active.proposals.map((proposal, index) => (
            <button
              key={proposal.label}
              type="button"
              aria-pressed={!compare && proposalIndex === index}
              onClick={() => { setProposalIndex(index); setCompare(false); }}
            >
              {proposal.label}
            </button>
          ))}
          <button type="button" className="kaga-identity-compare" aria-pressed={compare} onClick={() => setCompare((value) => !value)}>
            <Columns2 size={14} /> {compare ? 'إنهاء المقارنة' : 'عرض المقترحين معًا'}
          </button>
        </nav>
      ) : null}
      <div className={`kaga-identity-stage kaga-interactive-organic-gallery ${visible.length > 1 ? 'is-comparing' : ''}`}>
        <AnimatePresence mode="popLayout">
          {visible.map((proposal) => (
            <motion.figure key={`${active.id}-${proposal.label}`} data-selected={proposal === selectedProposal} initial={reduceMotion ? false : { opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              <img src={proposal.image} alt={`${active.title} - ${proposal.label}`} />
              <figcaption><div><span>{active.category}</span><h2>{active.title}</h2><strong>{proposal.label}</strong></div><SourceChip source={proposal.source}/></figcaption>
            </motion.figure>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
