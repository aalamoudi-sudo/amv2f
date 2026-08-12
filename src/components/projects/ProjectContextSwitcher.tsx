import { ArrowRight, Check, ChevronsUpDown, FolderKanban, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ProjectPortfolioPreferences } from '../../services/projectPreferences';
import type { ProjectRegistry } from '../../services/projectRegistry';
import type { ProjectEventRecord, ProjectWorkspace } from '../../types/projectWorkspace';

interface ProjectContextSwitcherProps {
  activeProject: ProjectWorkspace | null;
  activeEvent: ProjectEventRecord | null;
  registry: ProjectRegistry;
  preferences: ProjectPortfolioPreferences;
  onSelectProject: (projectId: string, eventId?: string) => void;
  onSelectEvent: (eventId: string) => void;
  onOpenPortfolio: () => void;
}

const lifecycleLabels = { draft: 'مسودة', candidate: 'مرشح', active: 'نشط', paused: 'متوقف', completed: 'مكتمل', archived: 'مؤرشف' } as const;
const truthLabels = { 'candidate-real': 'حقيقي مرشح', demo: 'ديمو', reference: 'مرجع' } as const;

export function ProjectContextSwitcher({ activeProject, activeEvent, registry, preferences, onSelectProject, onSelectEvent, onOpenPortfolio }: ProjectContextSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const projects = registry.list().filter((project) => project.projectStatus !== 'archived' && `${project.nameAr} ${project.nameEn}`.toLocaleLowerCase('ar').includes(query.trim().toLocaleLowerCase('ar')));
  const recentIds = new Set(preferences.recentProjectIds);
  const ordered = [...projects].sort((left, right) => Number(recentIds.has(right.projectId)) - Number(recentIds.has(left.projectId)));
  const events = activeProject ? registry.getEvents(activeProject.projectId) : [];

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => searchRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        window.setTimeout(() => triggerRef.current?.focus(), 0);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const select = (projectId: string) => {
    onSelectProject(projectId);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="project-switcher">
      <button ref={triggerRef} data-testid="project-switcher-trigger" type="button" className="project-switcher-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setActiveIndex(0); setOpen(true); }}>
        <span className="project-switcher-icon"><FolderKanban aria-hidden="true" /></span>
        <span className="project-switcher-copy"><small>المشروع النشط</small><strong>{activeProject?.nameAr ?? 'لا يوجد مشروع محدد'}</strong>{activeProject ? <em>{lifecycleLabels[activeProject.projectStatus]} · {truthLabels[activeProject.sourceClassification]}</em> : <em>سياق محايد وآمن</em>}</span>
        <ChevronsUpDown aria-hidden="true" />
      </button>

      {events.length > 1 ? <label className="project-event-selector"><span>الفعالية</span><select data-testid="project-event-selector" value={activeEvent?.eventId ?? ''} onChange={(event) => onSelectEvent(event.target.value)}>{events.map((event) => <option key={event.eventId} value={event.eventId}>{event.nameAr}</option>)}</select></label> : null}

      {open ? <div className="project-switcher-scrim" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
        <section data-testid="project-switcher-menu" className="project-switcher-menu" role="dialog" aria-modal="true" aria-labelledby="project-switcher-title">
          <header><div><p>Project Context</p><h2 id="project-switcher-title">تبديل المشروع</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="إغلاق"><X aria-hidden="true" /></button></header>
          <label className="project-switcher-search"><Search aria-hidden="true" /><span className="sr-only">بحث المشاريع</span><input ref={searchRef} data-testid="project-switcher-search" value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={(event) => {
            if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((value) => Math.min(ordered.length - 1, value + 1)); }
            if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((value) => Math.max(0, value - 1)); }
            if (event.key === 'Enter' && ordered[activeIndex]) { event.preventDefault(); select(ordered[activeIndex].projectId); }
          }} placeholder="ابحث في سجل المشاريع" /></label>
          <div className="project-switcher-list" role="listbox" aria-label="المشاريع المتاحة">{ordered.map((project, index) => <button key={project.projectId} data-testid={`project-switch-option-${project.projectId}`} type="button" role="option" aria-selected={project.projectId === activeProject?.projectId} className={index === activeIndex ? 'is-focused' : undefined} onMouseEnter={() => setActiveIndex(index)} onClick={() => select(project.projectId)}><span className={`switcher-project-mark switcher-project-mark-${project.projectType}`} /><span><strong>{project.nameAr}</strong><small>{lifecycleLabels[project.projectStatus]} · {truthLabels[project.sourceClassification]}{recentIds.has(project.projectId) ? ' · حديث' : ''}</small></span>{project.projectId === activeProject?.projectId ? <Check aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}</button>)}</div>
          <footer><button data-testid="switcher-open-portfolio" type="button" onClick={() => { setOpen(false); onOpenPortfolio(); }}><FolderKanban aria-hidden="true" />العودة إلى محفظة المشاريع</button><p>يُمسح اختيار المنطقة والقرار والمصدر قبل تفعيل المشروع التالي.</p></footer>
        </section>
      </div> : null}
    </div>
  );
}
