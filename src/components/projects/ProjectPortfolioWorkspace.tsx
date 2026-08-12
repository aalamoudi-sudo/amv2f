import { Archive, ArrowLeft, Boxes, CalendarDays, ClipboardCheck, Compass, FileCheck2, FilePlus2, FolderOpen, Map as MapIcon, MapPinned, Route, Search, ShieldAlert, Sparkles } from 'lucide-react';
import { useDeferredValue, useState, type CSSProperties, type ReactNode } from 'react';
import { mayadeenShellAssets } from '../../data/eventThemePackages';
import { localDemoProjectId } from '../../data/projectRegistry';
import type { ProjectPortfolioPreferences } from '../../services/projectPreferences';
import type { ProjectRegistry } from '../../services/projectRegistry';
import type { ProjectStatus, ProjectType, ProjectWorkspace } from '../../types/projectWorkspace';
import type { ProjectRouteUrlOptions } from '../../services/projectRouting';
import type { CommandWorkspace } from '../../ux/commandExperience';
import './projectPortfolio.css';

interface ProjectPortfolioWorkspaceProps {
  registry: ProjectRegistry;
  preferences: ProjectPortfolioPreferences;
  messageAr: string | null;
  contextSwitcher: ReactNode;
  onOpenProject: (projectId: string, workspace?: CommandWorkspace, options?: ProjectRouteUrlOptions) => void;
  onStartAuthoring: () => void;
}

const statusLabels: Record<ProjectStatus, string> = {
  draft: 'مسودة', candidate: 'مرشح', active: 'نشط', paused: 'متوقف مؤقتًا', completed: 'مكتمل', archived: 'مؤرشف'
};
const typeLabels: Record<ProjectType, string> = {
  'government-opening': 'افتتاح حكومي وثقافي', exhibition: 'معرض', conference: 'مؤتمر', festival: 'مهرجان', other: 'مشروع فعالية'
};
const sourceLabels = { 'candidate-real': 'مشروع حقيقي مرشح', demo: 'ديمو صريح', reference: 'مشروع مرجعي' } as const;
const spatialThumbnailMarkerLimit = 11;

function formatProjectDate(project: ProjectWorkspace): string {
  if (!project.dateRange.startAt) return 'التاريخ غير محدد';
  const date = new Date(project.dateRange.startAt);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
    : 'التاريخ غير محدد';
}

function formatLastOpened(value: string | undefined): string {
  if (!value) return 'لم يُفتح محليًا';
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? `فُتح ${new Intl.RelativeTimeFormat('ar', { numeric: 'auto' }).format(Math.max(-30, Math.round((date.getTime() - Date.now()) / 86_400_000)), 'day')}`
    : 'لم يُفتح محليًا';
}

function ProjectCard({ project, registry, lastOpenedAt, onOpen }: { project: ProjectWorkspace; registry: ProjectRegistry; lastOpenedAt?: string; onOpen: (workspace?: CommandWorkspace, options?: ProjectRouteUrlOptions) => void }) {
  const event = registry.resolveEvent(project.projectId);
  const venue = registry.getVenues(project.projectId)[0];
  const archived = project.projectStatus === 'archived';
  const featured = project.portfolioPresentation?.featured ?? false;
  const coverUri = project.portfolioPresentation?.coverUri ?? null;
  const hasExperience = Boolean(event?.experiencePackId);
  const hasExperienceTwin = Boolean(event?.experienceTwinPackId);
  const hasSpatialCommand = Boolean(event?.spatialCommandPackId);
  const hasReadinessCommand = Boolean(event?.readinessPackId);
  const spatialSummary = project.portfolioPresentation?.spatialCommandSummary;
  const candidateEntityCount = project.sourceReadiness?.candidateOperationalEntityCount ?? 0;
  const spatialThumbnailMarkerCount = Math.min(candidateEntityCount, spatialThumbnailMarkerLimit);
  return (
    <article
      data-testid={`project-card-${project.projectId}`}
      data-project-kind={project.sourceClassification}
      className={`project-card project-card-${project.projectType} ${featured ? 'project-card-featured' : ''} ${archived ? 'project-card-archived' : ''}`}
    >
      <div className="project-card-visual" aria-hidden="true">
        {coverUri ? <img src={coverUri} alt="" /> : <span className="project-card-monogram">{project.nameAr.slice(0, 1)}</span>}
        <span className="project-theme-swatch"><i /><i /><i /></span>
      </div>
      <div className="project-card-content">
        <div className="project-card-badges">
          <span className={`project-lifecycle project-lifecycle-${project.projectStatus}`}>{statusLabels[project.projectStatus]}</span>
          <span className={`project-source project-source-${project.sourceClassification}`}>{sourceLabels[project.sourceClassification]}</span>
          <span className="project-truth">{project.truthContext === 'temporary-demo' ? 'سياق حقيقة مؤقت' : project.truthContext === 'baseline' ? 'حالة أساسية' : 'سيناريو'}</span>
        </div>
        <p className="project-type-label">{typeLabels[project.projectType]}</p>
        <h3>{project.nameAr}</h3>
        <p className="project-card-description">{project.description}</p>
        <dl className="project-card-facts">
          <div><dt>الفعالية الرئيسية</dt><dd>{event?.nameAr ?? 'غير متاحة'}</dd></div>
          <div><dt>الموقع</dt><dd>{venue?.nameAr ?? 'غير متاح'}</dd></div>
          <div><dt>التاريخ</dt><dd>{formatProjectDate(project)}{project.dateRange.assumption ? ' · مستنتج' : ''}</dd></div>
          <div><dt>حالة المصدر</dt><dd>{hasSpatialCommand ? 'مصادر عمل مرشحة موثقة · لا هندسة معتمدة' : project.sourceStateAr}</dd></div>
        </dl>
        {project.sourceReadiness && hasSpatialCommand ? (
          <section data-testid={`project-source-readiness-${project.projectId}`} className="project-source-readiness project-spatial-command-entry" tabIndex={0}>
            <header>
              <div><small>تجربة القيادة المكانية</small><strong>مركز القيادة المكاني متاح للمراجعة</strong></div>
              <span>حزمة مرشحة</span>
            </header>
            <div className="project-spatial-command-preview">
              <div className="project-spatial-command-map" aria-hidden="true">
                <img src={coverUri ?? '/visual-direction/kap-cover-review.png'} alt="" />
                {Array.from({ length: spatialThumbnailMarkerCount }, (_, index) => <i key={index} style={{ '--marker-index': index } as CSSProperties}>{index + 1}</i>)}
                <span><MapPinned />مشهد مكاني مرشح</span>
              </div>
              <div className="project-spatial-command-copy">
                <div className="project-capability-badges">
                  <span><Sparkles aria-hidden="true" />خريطة التجربة</span>
                  <span><Compass aria-hidden="true" />خريطة القيادة</span>
                  <span><Route aria-hidden="true" />قصة رحلة الزائر</span>
                </div>
                {spatialSummary ? <strong>{candidateEntityCount} وجهة · {spatialSummary.experienceObjectCount} مراحل · {spatialSummary.openBlockerCount} عوائق مفتوحة</strong> : null}
                <p>خريطة تفاعلية تربط الوجهات الحالية بالتجربة والقرارات دون ادعاء هندسة أو جاهزية.</p>
                <small className="project-spatial-command-facts">
                  {project.sourceReadiness.mappingConflictCount} تعارض · {spatialSummary?.fieldEvidenceStatusAr ?? project.sourceReadiness.fieldMediaStatusAr}
                </small>
              </div>
            </div>
            <p><ShieldAlert aria-hidden="true" />خريطة الزائر التوضيحية لم تُسلّم بعد · المصدر المكاني ما زال مرشحًا</p>
            <div className="project-source-readiness-actions">
              {hasExperienceTwin ? <button data-testid="experience-twin-open" type="button" onClick={() => onOpen('experience-twin')}><Sparkles aria-hidden="true" />ادخل إلى عالم الفعالية</button> : null}
              {hasExperienceTwin && project.portfolioPresentation?.designSceneEntry ? <button data-testid="project-design-web3d-open" type="button" onClick={() => onOpen('experience-twin', { experienceSceneId: project.portfolioPresentation?.designSceneEntry?.sceneAssetId, experienceReviewMode: 'scenes', experienceMapMode: 'web3d', experienceViewMode: 'scene-focus', designSceneLens: 'experience', designSceneQualityProfile: 'balanced' })}><Boxes aria-hidden="true" />{project.portfolioPresentation.designSceneEntry.labelAr}</button> : null}
              {hasExperienceTwin && project.sourceClassification === 'candidate-real' ? <button data-testid="experience-rehearsal-open" type="button" onClick={() => onOpen('experience-rehearsal')}><CalendarDays aria-hidden="true" />قيادة البروفة الرقمية</button> : null}
              {hasReadinessCommand ? (
                <>
                  <button data-testid="readiness-command-open" type="button" onClick={() => onOpen('readiness')}>
                    <ClipboardCheck aria-hidden="true" />فتح قيادة الجاهزية
                  </button>
                  <button data-testid="readiness-pack-open" type="button" onClick={() => onOpen('readiness-pack')}>
                    <Boxes aria-hidden="true" />إعداد الحزمة التشغيلية
                  </button>
                </>
              ) : null}
              <button data-testid="spatial-command-open" type="button" onClick={() => onOpen('spatial-command', { spatialMode: 'experience' })}><MapIcon aria-hidden="true" />فتح مركز القيادة المكاني</button>
              <button data-testid="visitor-journey-open" type="button" onClick={() => onOpen('spatial-command', { spatialMode: 'journey', journeyStepId: 'arrival' })}><Route aria-hidden="true" />فتح تجربة الزائر</button>
              <button data-testid="source-authority-open" type="button" onClick={() => onOpen('spatial-authoring', { sourceLayerId: project.sourceReadiness?.authoritySourceLayerId })}><FileCheck2 aria-hidden="true" />تفاصيل المصدر</button>
            </div>
          </section>
        ) : null}
        <div className="project-card-footer">
          <span>{formatLastOpened(lastOpenedAt)}</span>
          <div data-testid={project.projectId === localDemoProjectId ? 'command-open' : undefined}>
            {hasExperienceTwin && !archived && !hasSpatialCommand ? <button data-testid="experience-twin-entry-open" type="button" className="project-card-secondary" onClick={() => onOpen('experience-twin')}><Sparkles aria-hidden="true" />ادخل إلى عالم الفعالية</button> : null}
            {hasExperience && !hasExperienceTwin && !archived && !hasSpatialCommand ? <button data-testid="experience-entry-open" type="button" className="project-card-secondary" onClick={() => onOpen('experience')}><Sparkles aria-hidden="true" />التجربة</button> : null}
            <button
              data-testid={project.projectId === localDemoProjectId ? 'launcher-command-open' : undefined}
              type="button"
              className="project-card-open"
              disabled={archived}
              onClick={() => onOpen(project.projectId === localDemoProjectId ? 'command' : 'executive')}
            >
              {archived ? <Archive aria-hidden="true" /> : <FolderOpen aria-hidden="true" />}
              {archived ? 'مشروع مؤرشف' : project.projectId === localDemoProjectId ? 'فتح العمليات التجريبية' : 'فتح المشروع'}
              {!archived ? <ArrowLeft aria-hidden="true" /> : null}
            </button>
          </div>
        </div>
        <details className="project-card-details"><summary>تفاصيل الهوية</summary><bdi dir="ltr">{project.projectId}</bdi><bdi dir="ltr">{event?.eventId}</bdi><bdi dir="ltr">{venue?.venueId}</bdi></details>
      </div>
    </article>
  );
}

export function ProjectPortfolioWorkspace({ registry, preferences, messageAr, contextSwitcher, onOpenProject, onStartAuthoring }: ProjectPortfolioWorkspaceProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ProjectType | 'all'>('all');
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase('ar'));
  const projects = registry.list();
  const visible = projects.filter((project) => {
    const matchesQuery = !deferredQuery || `${project.nameAr} ${project.nameEn} ${project.description}`.toLocaleLowerCase('ar').includes(deferredQuery);
    return matchesQuery && (statusFilter === 'all' || project.projectStatus === statusFilter) && (typeFilter === 'all' || project.projectType === typeFilter);
  });
  const recent = preferences.recentProjectIds.map((id) => registry.findById(id)).filter((project): project is ProjectWorkspace => Boolean(project));

  return (
    <div data-testid="neutral-launcher" className="project-portfolio" lang="ar" dir="rtl">
      <header className="portfolio-header">
        <div className="portfolio-brand"><img src={mayadeenShellAssets.brandmark.uri} alt={mayadeenShellAssets.brandmark.altAr} /><div><strong>Mayadeen Event Intelligence OS</strong><span>منصة واحدة لكل المشاريع والفعاليات</span></div></div>
        <div className="flex items-center gap-3">{contextSwitcher}<button data-testid="portfolio-start-authoring" type="button" className="portfolio-create" onClick={onStartAuthoring}><FilePlus2 aria-hidden="true" />بدء مشروع جديد</button></div>
      </header>

      <main className="portfolio-main">
        <section className="portfolio-hero" aria-labelledby="portfolio-title">
          <div><p className="portfolio-kicker">Universal Project Portfolio</p><h1 id="portfolio-title">المشاريع</h1><p>اختر حاوية المشروع أولًا، ثم الفعالية والموقع ومساحة العمل. لا يحتاج أي مشروع إلى نسخة منفصلة من المنصة.</p></div>
          <div className="portfolio-hierarchy" aria-label="تسلسل سياق المنصة"><span>المنظمة</span><i /><span>المشروع</span><i /><span>الفعالية</span><i /><span>الموقع</span><i /><span>العناصر التشغيلية</span></div>
        </section>

        {messageAr ? <section data-testid="portfolio-context-message" className="portfolio-message"><MapPinned aria-hidden="true" /><div><strong>لم يُفعّل أي مشروع</strong><p>{messageAr}</p></div></section> : null}

        <section className="portfolio-controls" aria-label="بحث وتصفية المشاريع">
          <label className="portfolio-search"><Search aria-hidden="true" /><span className="sr-only">البحث في المشاريع</span><input data-testid="project-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم المشروع أو وصفه" /></label>
          <label><span>الحالة</span><select data-testid="project-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ProjectStatus | 'all')}><option value="all">كل الحالات</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>النوع</span><select data-testid="project-type-filter" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as ProjectType | 'all')}><option value="all">كل الأنواع</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <span className="portfolio-result-count">{new Intl.NumberFormat('ar-SA').format(visible.length)} مشروع</span>
        </section>

        {recent.length ? <section data-testid="recent-projects" className="portfolio-recent"><div className="portfolio-section-title"><div><p>استئناف العمل</p><h2>المشاريع المفتوحة مؤخرًا</h2></div><CalendarDays aria-hidden="true" /></div><div>{recent.map((project) => <button key={project.projectId} type="button" onClick={() => onOpenProject(project.projectId, 'executive')}><span className={`recent-mark recent-mark-${project.projectType}`} /><strong>{project.nameAr}</strong><small>{formatLastOpened(preferences.lastOpenedAtByProject[project.projectId])}</small><ArrowLeft aria-hidden="true" /></button>)}</div></section> : (
          <section data-testid="portfolio-no-project-state" className="portfolio-no-project"><FolderOpen aria-hidden="true" /><div><strong>لا يوجد مشروع مفتوح بعد</strong><p>الاختيار محلي لهذه الواجهة فقط ولا ينشئ حقيقة تشغيلية.</p></div></section>
        )}

        <section className="portfolio-projects" aria-labelledby="all-projects-title">
          <div className="portfolio-section-title"><div><p>Project Registry</p><h2 id="all-projects-title">كل المشاريع</h2></div><span>الحقيقي المرشح منفصل عن الديمو والمرجع</span></div>
          {visible.length ? <div className="project-grid">{visible.map((project) => <ProjectCard key={project.projectId} project={project} registry={registry} lastOpenedAt={preferences.lastOpenedAtByProject[project.projectId]} onOpen={(workspace, options) => onOpenProject(project.projectId, workspace, options)} />)}</div> : <div data-testid="project-empty-state" className="portfolio-empty"><Search aria-hidden="true" /><h3>لا توجد مشاريع مطابقة</h3><p>غيّر البحث أو المرشحات. لم يُفتح مشروع بديل تلقائيًا.</p></div>}
        </section>
      </main>
    </div>
  );
}
