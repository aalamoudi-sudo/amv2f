import { Cpu, FileSearch, MapPin, Route, Search, SearchX, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createCommandSearchIndex, searchCommandIndex, type CommandSearchResult } from '../../services/commandSearch';
import { selectRuntimeRoutes, useEventStore } from '../../store/useEventStore';
import type { CommandWorkspace } from '../../ux/commandExperience';
import { TruthContextBadge } from './TruthContextBadge';

interface GlobalCommandSearchProps {
  onNavigate: (workspace: CommandWorkspace, experienceEventId?: string) => void;
}

function iconForKind(kind: CommandSearchResult['kind']) {
  if (kind === 'decision') return FileSearch;
  if (kind === 'route') return Route;
  if (kind === 'device' || kind === 'datastream') return Cpu;
  if (kind === 'experience-point') return Sparkles;
  return MapPin;
}

function ScopeIndicator({ scope }: { scope: CommandSearchResult['scope'] }) {
  if (scope === 'candidate-experience') return <TruthContextBadge label="candidate" />;
  if (scope === 'local-simulator') return <TruthContextBadge label="temporary-demo" />;
  return <span className="rounded border border-command-line px-2 py-1 text-[11px] font-semibold text-command-muted">نطاق تشغيلي محلي</span>;
}

export function GlobalCommandSearch({ onNavigate }: GlobalCommandSearchProps) {
  const entities = useEventStore((state) => state.entities);
  const decisions = useEventStore((state) => state.decisions);
  const readiness = useEventStore((state) => state.zoneReadiness);
  const routes = useEventStore(selectRuntimeRoutes);
  const activeRuntime = useEventStore((state) => state.activeRuntime);
  const selectEntity = useEventStore((state) => state.selectEntity);
  const selectDecision = useEventStore((state) => state.selectDecision);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const index = useMemo(() => createCommandSearchIndex({
    entities,
    routes,
    decisions,
    readiness,
    activeEventId: activeRuntime?.identity.eventInstanceId ?? null,
    activeVenueId: activeRuntime?.identity.venueId ?? null,
    activeEventNameAr: activeRuntime?.identity.eventNameAr ?? null,
    mappingVersion: activeRuntime?.spatialConfiguration.spatialMappingVersion ?? 'local-logical-mapping'
  }), [activeRuntime, decisions, entities, readiness, routes]);
  const results = useMemo(
    () => searchCommandIndex(index, query, activeRuntime?.identity.eventInstanceId ?? null),
    [activeRuntime?.identity.eventInstanceId, index, query]
  );
  const boundedActiveIndex = Math.min(activeIndex, Math.max(0, results.length - 1));
  const activeResult = results[boundedActiveIndex];

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setQuery('');
        setActiveIndex(0);
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timeoutId = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      window.setTimeout(() => triggerRef.current?.focus(), 0);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [open]);

  const openSearch = () => {
    setQuery('');
    setActiveIndex(0);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  const choose = (item: CommandSearchResult) => {
    if (item.entityId) selectEntity(item.entityId);
    if (item.decisionId) selectDecision(item.decisionId);
    onNavigate(item.workspace, item.experienceEventId);
    close();
  };

  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled])'
    );
    if (!focusable?.length) return;
    const ordered = Array.from(focusable);
    const first = ordered[0]!;
    const last = ordered.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, current - 1));
    } else if (event.key === 'Enter' && activeResult) {
      event.preventDefault();
      choose(activeResult);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        data-testid="global-search-open"
        type="button"
        onClick={openSearch}
        className="command-search-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span>بحث وأوامر</span>
        <kbd className="ltr command-key-hint">Ctrl K</kbd>
      </button>

      {open ? (
        <div data-testid="global-search-dialog" className="command-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <div
            ref={dialogRef}
            className="command-search-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-search-title"
            onKeyDown={trapFocus}
          >
            <div className="flex items-center justify-between gap-3 border-b border-command-line px-4 py-3">
              <div>
                <p className="command-eyebrow">وصول موحد</p>
                <h2 id="global-search-title" className="mt-1 text-base font-semibold text-command-text">البحث والأوامر</h2>
              </div>
              <button data-testid="global-search-close" type="button" onClick={close} className="command-icon-button" aria-label="إغلاق البحث">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="border-b border-command-line p-4">
              <label className="relative block">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-command-muted" aria-hidden="true" />
                <input
                  ref={inputRef}
                  data-testid="global-search-input"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={onInputKeyDown}
                  className="command-select py-3 pl-3 pr-10"
                  placeholder="ابحث بالاسم العربي أو الإنجليزي أو المعرّف"
                  aria-label="البحث العالمي"
                  aria-controls="global-search-results"
                  aria-activedescendant={activeResult ? 'global-search-result-' + activeResult.id : undefined}
                  autoComplete="off"
                />
              </label>
              <p className="mt-2 text-xs text-command-muted">النتائج محصورة في السياق النشط أو في حزمة تجربة صريحة؛ لا يوجد استعلام خارجي.</p>
            </div>
            <div id="global-search-results" data-testid="global-search-results" role="listbox" aria-label="نتائج البحث" className="max-h-[min(58vh,560px)] overflow-y-auto p-2 command-scrollbar">
              {results.length ? results.map((item, index) => {
                const Icon = iconForKind(item.kind);
                const active = index === boundedActiveIndex;
                return (
                  <button
                    id={'global-search-result-' + item.id}
                    key={item.id}
                    data-testid={'global-search-result-' + item.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(item)}
                    className={'command-search-result ' + (active ? 'command-search-result-active' : '')}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-command-accent" aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-right">
                      <span className="block truncate text-sm font-semibold text-command-text">{item.titleAr}</span>
                      <span className="ltr mt-1 block truncate text-left text-[11px] text-command-muted">{item.subtitleAr}</span>
                    </span>
                    <ScopeIndicator scope={item.scope} />
                  </button>
                );
              }) : (
                <div data-testid="global-search-empty" className="py-10 text-center">
                  <SearchX className="mx-auto mb-3 h-6 w-6 text-command-muted" aria-hidden="true" />
                  <p className="text-sm font-semibold text-command-text">لا توجد نتيجة ضمن السياق الحالي</p>
                  <p className="mt-1 text-xs leading-6 text-command-muted">جرّب الاسم أو المعرّف المستقر، أو بدّل السياق صراحةً من واجهة الإطلاق.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
