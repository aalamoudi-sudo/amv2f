import {
  Eraser,
  Expand,
  Filter,
  Focus,
  PencilRuler,
  RotateCcw,
  Save,
  Search,
  Shrink,
  SlidersHorizontal,
  X
} from 'lucide-react';
import type { SpatialFilterId, SpatialSearchResult } from '../../types/spatialMap';

const filterLabels: Record<SpatialFilterId, string> = {
  'experience-linked': 'مرتبطة بالتجربة',
  'independent-landmarks': 'معالم مستقلة',
  conflicted: 'متعارضة',
  unresolved: 'غير محسومة',
  'founder-approved': 'معتمدة دلاليًا من المؤسس',
  'candidate-anchors': 'مراسي مكانية مرشحة',
  'missing-engineering-controls': 'ضوابط هندسية مفقودة'
};

export function SpatialMapToolbar({
  query,
  searchOpen,
  filterOpen,
  filters,
  results,
  focusMode,
  fullscreen,
  editing,
  hasSelection,
  hasSavedView,
  onQueryChange,
  onToggleSearch,
  onToggleFilters,
  onToggleFilter,
  onSelectResult,
  onClearSelection,
  onToggleFocus,
  onToggleFullscreen,
  onToggleEditing,
  onSaveView,
  onRestoreView,
  onResetViewPreferences
}: {
  query: string;
  searchOpen: boolean;
  filterOpen: boolean;
  filters: SpatialFilterId[];
  results: SpatialSearchResult[];
  focusMode: boolean;
  fullscreen: boolean;
  editing: boolean;
  hasSelection: boolean;
  hasSavedView: boolean;
  onQueryChange: (query: string) => void;
  onToggleSearch: () => void;
  onToggleFilters: () => void;
  onToggleFilter: (filter: SpatialFilterId) => void;
  onSelectResult: (result: SpatialSearchResult) => void;
  onClearSelection: () => void;
  onToggleFocus: () => void;
  onToggleFullscreen: () => void;
  onToggleEditing: () => void;
  onSaveView: () => void;
  onRestoreView: () => void;
  onResetViewPreferences: () => void;
}) {
  return (
    <div className="sc-map-toolbar" aria-label="أدوات التحكم المتقدمة بالخريطة">
      <div className="sc-map-toolbar-primary">
        <button
          data-testid="spatial-search-toggle"
          type="button"
          title="بحث عربي في الخريطة"
          aria-label="فتح البحث العربي في الخريطة"
          aria-expanded={searchOpen}
          onClick={onToggleSearch}
        >
          <Search aria-hidden="true" /><span>بحث</span>
        </button>
        <button
          data-testid="spatial-filter-toggle"
          type="button"
          title="فلاتر الحقيقة المكانية"
          aria-label="فتح فلاتر الحقيقة المكانية"
          aria-expanded={filterOpen}
          className={filters.length ? 'is-active' : undefined}
          onClick={onToggleFilters}
        >
          <Filter aria-hidden="true" /><span>فلترة</span>{filters.length ? <i>{filters.length}</i> : null}
        </button>
        <button
          data-testid="spatial-focus-mode"
          type="button"
          title={focusMode ? 'إنهاء التركيز على الخريطة' : 'تركيز على الخريطة'}
          aria-label={focusMode ? 'إنهاء التركيز على الخريطة' : 'تركيز على الخريطة'}
          aria-pressed={focusMode}
          onClick={onToggleFocus}
        >
          <Focus aria-hidden="true" /><span>{focusMode ? 'إنهاء التركيز' : 'تركيز'}</span>
        </button>
        <button
          data-testid="spatial-fullscreen"
          type="button"
          title={fullscreen ? 'الخروج من ملء الشاشة' : 'عرض الخريطة بملء الشاشة'}
          aria-label={fullscreen ? 'الخروج من ملء الشاشة' : 'عرض الخريطة بملء الشاشة'}
          aria-pressed={fullscreen}
          onClick={onToggleFullscreen}
        >
          {fullscreen ? <Shrink aria-hidden="true" /> : <Expand aria-hidden="true" />}
          <span>ملء الشاشة</span>
        </button>
        <button
          data-testid="candidate-anchor-edit-toggle"
          type="button"
          title="تحرير المراسي المرشحة"
          aria-label="تحرير المراسي المرشحة"
          aria-pressed={editing}
          className={editing ? 'is-editing' : undefined}
          onClick={onToggleEditing}
        >
          <PencilRuler aria-hidden="true" /><span>تحرير المراسي</span>
        </button>
      </div>
      <div className="sc-map-toolbar-secondary">
        <button type="button" disabled={!hasSelection} title="مسح التحديد" aria-label="مسح التحديد" onClick={onClearSelection}><Eraser aria-hidden="true" /></button>
        <button data-testid="save-spatial-view" type="button" title="حفظ العرض الحالي" aria-label="حفظ العرض الحالي" onClick={onSaveView}><Save aria-hidden="true" /></button>
        <button data-testid="restore-spatial-view" type="button" disabled={!hasSavedView} title="استعادة آخر عرض محفوظ" aria-label="استعادة آخر عرض محفوظ" onClick={onRestoreView}><SlidersHorizontal aria-hidden="true" /></button>
        <button data-testid="reset-spatial-view-preferences" type="button" title="إعادة ضبط تفضيلات العرض" aria-label="إعادة ضبط تفضيلات العرض" onClick={onResetViewPreferences}><RotateCcw aria-hidden="true" /></button>
      </div>
      {searchOpen ? (
        <section data-testid="spatial-search-panel" className="sc-search-popover" aria-label="البحث المكاني">
          <label>
            <Search aria-hidden="true" />
            <span>ابحث بالاسم العربي أو الإنجليزي أو المعرّف أو الاسم القديم</span>
            <input
              autoFocus
              value={query}
              placeholder="ممر العصور، Tunnel، كبار الشخصيات…"
              aria-label="بحث في الخريطة"
              onChange={(event) => onQueryChange(event.target.value)}
            />
            {query ? <button type="button" aria-label="مسح البحث" onClick={() => onQueryChange('')}><X aria-hidden="true" /></button> : null}
          </label>
          <div className="sc-search-results" role="listbox" aria-label="نتائج البحث المكاني">
            {results.length ? results.map((result) => (
              <button
                key={result.resultId}
                type="button"
                role="option"
                data-testid={`spatial-search-result-${result.targetId}`}
                onClick={() => onSelectResult(result)}
              >
                <span data-result-type={result.type}>{result.type === 'independent-landmark' ? 'معلم' : result.type === 'executive-blocker' ? 'قرار' : result.type === 'experience-object' ? 'تجربة' : 'وجهة'}</span>
                <div>
                  <strong>{result.nameAr}</strong>
                  <small>{result.relationshipAr} · {result.hasAnchor ? 'له مرساة مرشحة' : 'بلا مرساة'}</small>
                </div>
                <i>
                  {result.semanticStatus === 'founder-approved' ? 'دلاليًا مجمّد' : 'دلاليًا مشتق'}
                  {' · '}
                  {result.spatialStatus === 'unresolved'
                    ? 'مكانيًا غير محسوم'
                    : result.spatialStatus === 'conflicted'
                      ? 'مكانيًا متعارض'
                      : result.spatialStatus === 'independent-landmark'
                        ? 'معلم مستقل'
                        : 'مرساة مرشحة'}
                </i>
              </button>
            )) : <p>لا توجد نتيجة مطابقة داخل المشروع النشط.</p>}
          </div>
        </section>
      ) : null}
      {filterOpen ? (
        <section data-testid="spatial-filter-panel" className="sc-filter-popover" aria-label="فلاتر الحقيقة المكانية">
          <header><Filter aria-hidden="true" /><div><strong>فلترة المشهد</strong><small>الفلاتر تغيّر العرض فقط ولا تعدّل الحقيقة.</small></div></header>
          <div>
            {(Object.entries(filterLabels) as Array<[SpatialFilterId, string]>).map(([filter, label]) => (
              <button
                key={filter}
                data-testid={`spatial-filter-${filter}`}
                type="button"
                aria-pressed={filters.includes(filter)}
                className={filters.includes(filter) ? 'is-active' : undefined}
                onClick={() => onToggleFilter(filter)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
