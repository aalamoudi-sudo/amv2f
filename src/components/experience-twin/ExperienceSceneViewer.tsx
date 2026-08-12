import {
  AlertTriangle,
  ArrowLeft,
  Box,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  FileSearch,
  GitCompareArrows,
  Image as ImageIcon,
  ImageOff,
  Info,
  Layers3,
  Maximize2,
  Pause,
  Play,
  Presentation,
  RotateCcw,
  Save,
  ShieldCheck,
  X
} from 'lucide-react';
import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ExperienceSceneGateway } from '../../services/experienceSceneGateway';
import { createSceneAssetCandidateRevision, LocalSceneRevisionRepository, quarantineSceneAsset } from '../../services/experienceSceneAuthoring';
import type { DesignExperienceConfiguration, DesignSceneLens } from '../../types/designExperience';
import type { ExperiencePack, ExperienceProjection, ExperienceSelectionContext } from '../../types/experienceTwin';
import type { ExperienceSceneAsset, SceneAssetRegistry, SceneLoadState, SceneValidationContext, SceneViewerProjection } from '../../types/experienceScene';
import type { StoryMapDefinition } from '../../types/storyMap';
import type { RouteDesignConvergenceProjection } from '../../services/experienceRouteDesignConvergence';
import './experienceSceneViewer.css';

const PanoramaSceneSurface = lazy(() => import('./PanoramaSceneSurface'));
const Web3DSceneSurface = lazy(() => import('./Web3DSceneSurface').then((module) => ({ default: module.Web3DSceneSurface })));

const truthLabels: Record<ExperienceSceneAsset['truthClass'], string> = {
  'illustrative-only': 'توضيحي فقط',
  'design-candidate': 'تصميم مرشح',
  'design-approved': 'تصميم معتمد',
  'actual-reported': 'واقع مبلّغ عنه',
  'actual-verified': 'واقع متحقق منه'
};

const rightsLabels: Record<ExperienceSceneAsset['rightsStatus'], string> = {
  unknown: 'الحقوق غير معروفة',
  'review-required': 'مراجعة الحقوق مطلوبة',
  'internal-preview-only': 'معاينة داخلية فقط',
  'approved-internal-use': 'استخدام داخلي معتمد',
  'approved-client-presentation': 'عرض العميل معتمد',
  'approved-distribution': 'التوزيع معتمد',
  expired: 'الحقوق منتهية',
  blocked: 'الاستخدام محجوب'
};

const approvalLabels: Record<ExperienceSceneAsset['approvalStatus'], string> = {
  candidate: 'مرشح',
  approved: 'معتمد ضمن نطاقه',
  missing: 'اعتماد غير متاح',
  unknown: 'الاعتماد غير معروف'
};

type ViewerMode = Exclude<SceneViewerProjection['mode'], 'source-missing'>;
type ContextPanel = 'operational' | 'readiness' | 'decisions' | 'evidence' | null;

interface ExperienceSceneViewerProps {
  registry: SceneAssetRegistry;
  gateway: ExperienceSceneGateway;
  validationContext: SceneValidationContext;
  pack: ExperiencePack;
  storyMapDefinition: StoryMapDefinition;
  selection: ExperienceSelectionContext;
  projection: ExperienceProjection | null;
  designExperience: DesignExperienceConfiguration | null;
  routeDesignProjection: RouteDesignConvergenceProjection;
  onRouteWaypointChange?: (waypointId: string) => void;
  onSelectionChange: (next: ExperienceSelectionContext, historyMode?: 'push' | 'replace') => void;
  onPrevious: () => void;
  onNext: () => void;
  onReturnToMap: () => void;
  onOpenTruth: () => void;
  onDirtyChange: (dirty: boolean) => void;
  readOnly?: boolean;
  clientPresentationVariant?: 'standard' | 'golden';
}

interface SceneErrorBoundaryProps { children: ReactNode; onRetry: () => void }

class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* The operator receives a safe state below. */ }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="scene-load-state is-error"><AlertTriangle /><strong>تعذر فك أصل المشهد بأمان</strong><p>أُوقفت المعاينة دون تغيير أي حقيقة تشغيلية.</p><button type="button" onClick={() => { this.setState({ failed: false }); this.props.onRetry(); }}>إعادة المحاولة</button></div>;
  }
}

function preferredKinds(mode: ViewerMode): ExperienceSceneAsset['mediaKind'][] {
  if (mode === 'panorama-360') return ['actual-360-capture', 'equirectangular-panorama', 'cubemap-panorama'];
  if (mode === 'model-3d') return ['gltf-scene'];
  return ['flat-render'];
}

function modeForAsset(asset: ExperienceSceneAsset | null): SceneViewerProjection['mode'] {
  if (!asset || asset.availabilityStatus === 'missing') return 'source-missing';
  if (asset.mediaKind === 'gltf-scene') return 'model-3d';
  if (['actual-360-capture', 'equirectangular-panorama', 'cubemap-panorama'].includes(asset.mediaKind)) return 'panorama-360';
  return 'design-preview';
}

function displayTruthLabel(asset: ExperienceSceneAsset | null, sourceAuthority: string | null): string {
  if (!asset) return 'المصدر غير متاح';
  if (asset.truthClass === 'design-candidate' && sourceAuthority === 'founder-provided-candidate-program-and-design-reference') {
    return 'تصميم مرشح من مصدر مقدم من المؤسس';
  }
  return truthLabels[asset.truthClass];
}

function safeParseAsset(value: string): ExperienceSceneAsset | null {
  try { return JSON.parse(value) as ExperienceSceneAsset; } catch { return null; }
}

function primaryVariantUri(asset: ExperienceSceneAsset | null): string | null {
  return asset?.variants.find((variant) => variant.quality === 'preview' && variant.uri)?.uri
    ?? asset?.variants.find((variant) => variant.quality === 'standard' && variant.uri)?.uri
    ?? asset?.variants.find((variant) => variant.uri)?.uri
    ?? null;
}

function ComparisonView({ registry, gateway, pairId }: { registry: SceneAssetRegistry; gateway: ExperienceSceneGateway; pairId: string }) {
  const pair = registry.comparisonPairs.find((item) => item.comparisonPairId === pairId) ?? null;
  const left = pair ? gateway.getAsset(pair.leftAssetId) : null;
  const right = pair ? gateway.getAsset(pair.rightAssetId) : null;
  const leftAssetId = left?.assetId ?? null;
  const rightAssetId = right?.assetId ?? null;
  const [slider, setSlider] = useState(50);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!leftAssetId || !rightAssetId) return;
    let active = true;
    void Promise.resolve().then(() => { if (active) setReady(false); });
    void Promise.all([gateway.loadAssetVariant(leftAssetId, 'preview'), gateway.loadAssetVariant(rightAssetId, 'preview')]).then((states) => {
      if (active) setReady(states.every((state) => state.status === 'ready'));
    });
    return () => {
      active = false;
      gateway.disposeScene(leftAssetId);
      gateway.disposeScene(rightAssetId);
    };
  }, [gateway, leftAssetId, rightAssetId]);
  if (!pair || !left || !right) return <div className="scene-load-state"><ImageOff /><strong>لا توجد مقارنة صالحة</strong><p>يلزم أصلان متوافقان ومسجلان في المشروع نفسه.</p></div>;
  if (!ready) return <div className="scene-load-state"><CircleDot /><strong>جارٍ التحقق من أصلي المقارنة</strong><p>لا تظهر المقارنة قبل مطابقة البصمة والنوع.</p></div>;
  const leftUri = primaryVariantUri(left);
  const rightUri = primaryVariantUri(right);
  const sliderAllowed = pair.presentation === 'slider' && pair.pixelComparisonAllowed && leftUri && rightUri;
  return (
    <section className="scene-comparison" data-testid="scene-comparison">
      <header><div><strong>{truthLabels[left.truthClass]}</strong><span>R{left.revision}</span></div><GitCompareArrows /><div><strong>{truthLabels[right.truthClass]}</strong><span>R{right.revision}</span></div></header>
      {sliderAllowed ? <>
        <div className="scene-comparison-slider" data-testid="scene-comparison-slider">
          <img src={leftUri} alt="النسخة المرشحة للمقارنة" />
          <div style={{ width: `${100 - slider}%` }}><img src={rightUri} alt="النسخة المقارنة" /></div>
          <i style={{ insetInlineStart: `${slider}%` }} aria-hidden="true" />
        </div>
        <label><span>فاصل المقارنة</span><input aria-label="فاصل المقارنة" type="range" min="10" max="90" value={slider} onChange={(event) => setSlider(Number(event.target.value))} /></label>
      </> : <div className="scene-comparison-pair"><img src={leftUri ?? ''} alt="الأصل الأول" /><img src={rightUri ?? ''} alt="الأصل الثاني" /></div>}
      {pair.cameraPoseCompatibility !== 'compatible' ? <p className="scene-pose-warning"><AlertTriangle />زاوية التصوير غير متوافقة؛ المقارنة البكسلية غير صالحة.</p> : null}
      {pair.warningsAr.map((warning) => <p key={warning}>{warning}</p>)}
    </section>
  );
}

function SceneAuthoringPanel({ asset, gateway, context, onClose, onDirtyChange }: { asset: ExperienceSceneAsset; gateway: ExperienceSceneGateway; context: SceneValidationContext; onClose: () => void; onDirtyChange: (dirty: boolean) => void }) {
  const rootRevision = context.registryRevisions.find((revision) => revision.revisionId === asset.revisionId)!;
  const [repository] = useState(() => new LocalSceneRevisionRepository(asset, rootRevision));
  const [draft, setDraft] = useState(() => JSON.stringify(asset, null, 2));
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('المراجعة المصدرية R1 نشطة.');
  const [history, setHistory] = useState(() => repository.history());

  const validate = () => {
    const parsed = safeParseAsset(draft);
    if (!parsed) return setMessage('صيغة JSON غير صالحة. لم يتغير الأصل.');
    const result = gateway.validateAssetManifest(parsed);
    setMessage(result.valid ? 'البيان صالح كمراجعة مرشحة ضمن حدود المصدر.' : `محجوب · ${result.issues[0]?.messageAr ?? 'فشل التحقق'}`);
  };

  const save = () => {
    const parsed = safeParseAsset(draft);
    if (!parsed) return setMessage('صيغة JSON غير صالحة.');
    try {
      const result = createSceneAssetCandidateRevision(repository.current(), parsed, reason, 'LOCAL-SCENE-CANDIDATE-AUTHOR', { ...context, registryRevisions: [...context.registryRevisions, ...repository.history().filter((revision) => !context.registryRevisions.some((known) => known.revisionId === revision.revisionId))] });
      repository.append(result);
      setDraft(JSON.stringify(result.asset, null, 2));
      setHistory(repository.history());
      setReason('');
      setMessage(`حُفظت R${result.asset.revision} كمراجعة محلية مرشحة · ${result.differences.length} فرق · لا تفعيل.`);
      onDirtyChange(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ المراجعة.');
    }
  };

  const quarantine = () => {
    const parsed = safeParseAsset(draft);
    if (!parsed) return setMessage('صيغة JSON غير صالحة.');
    const result = gateway.validateAssetManifest(parsed);
    const quarantined = quarantineSceneAsset(parsed, result.issues);
    setDraft(JSON.stringify(quarantined, null, 2));
    setMessage('عُزلت المعاينة محليًا؛ لم يتغير المصدر أو الخط الأساسي.');
    onDirtyChange(true);
  };

  const restoreRoot = () => {
    const root = repository.selectHistoricalRevision(asset.revisionId);
    setDraft(JSON.stringify(root, null, 2));
    setMessage('عادت المعاينة إلى R1 دون حذف سجل المراجعات.');
    onDirtyChange(false);
  };

  return (
    <aside className="scene-authoring" data-testid="scene-authoring-panel">
      <header><div><small>SCENE CANDIDATE AUTHORING</small><strong>تأليف أصل مشهد مرشح</strong></div><button type="button" aria-label="إغلاق تأليف المشهد" onClick={onClose}><X /></button></header>
      <p className="scene-authoring-warning"><AlertTriangle />محلي ومرشح فقط · لا يغيّر الخط الأساسي أو الجاهزية أو القرار أو تحقق الدليل</p>
      <div className="scene-authoring-fields"><label><span>فئة الحقيقة</span><select value={safeParseAsset(draft)?.truthClass ?? asset.truthClass} onChange={(event) => { const parsed = safeParseAsset(draft); if (!parsed) return; parsed.truthClass = event.target.value as ExperienceSceneAsset['truthClass']; setDraft(JSON.stringify(parsed, null, 2)); onDirtyChange(true); }}><option value="illustrative-only">توضيحي فقط</option><option value="design-candidate">تصميم مرشح</option><option value="design-approved">تصميم معتمد</option><option value="actual-reported">واقع مبلّغ</option><option value="actual-verified">واقع متحقق</option></select></label><label><span>الحقوق</span><select value={safeParseAsset(draft)?.rightsStatus ?? asset.rightsStatus} onChange={(event) => { const parsed = safeParseAsset(draft); if (!parsed) return; parsed.rightsStatus = event.target.value as ExperienceSceneAsset['rightsStatus']; parsed.rights.status = parsed.rightsStatus; setDraft(JSON.stringify(parsed, null, 2)); onDirtyChange(true); }}><option value="review-required">مراجعة مطلوبة</option><option value="internal-preview-only">معاينة داخلية</option><option value="approved-internal-use">استخدام داخلي معتمد</option><option value="blocked">محجوب</option></select></label></div>
      <textarea aria-label="بيان أصل المشهد" dir="ltr" value={draft} onChange={(event) => { setDraft(event.target.value); onDirtyChange(true); }} spellCheck={false} />
      <label><span>سبب التغيير الإلزامي</span><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="سبب المراجعة المرشحة" /></label>
      <div className="scene-authoring-actions"><button type="button" onClick={validate}><ShieldCheck />تحقق</button><button type="button" onClick={save}><Save />مراجعة جديدة</button><button type="button" onClick={quarantine}><AlertTriangle />عزل</button><button type="button" onClick={restoreRoot}><RotateCcw />استعادة R1</button></div>
      <output>{message}</output>
      <small>سجل غير قابل للاستبدال: {history.map((revision) => `R${revision.revision}`).join(' ← ')}</small>
    </aside>
  );
}

export function ExperienceSceneViewer(props: ExperienceSceneViewerProps) {
  const { registry, gateway, validationContext, pack, selection, projection } = props;
  const step = pack.journeySteps.find((item) => item.journeyStepId === selection.journeyStepId) ?? null;
  const day = pack.eventDays.find((item) => item.eventDayId === selection.eventDayId) ?? null;
  const persona = pack.personas.find((item) => item.personaId === selection.personaId) ?? null;
  const journey = pack.journeys.find((item) => item.journeyId === selection.journeyId) ?? null;
  const touchpoint = pack.touchpoints.find((item) => item.touchpointId === (selection.selectedTouchpointId ?? step?.touchpointId)) ?? null;
  const currentIndex = journey?.journeyStepIds.indexOf(step?.journeyStepId ?? '') ?? -1;
  const previousStep = currentIndex > 0 ? pack.journeySteps.find((item) => item.journeyStepId === journey?.journeyStepIds[currentIndex - 1]) ?? null : null;
  const nextStep = currentIndex >= 0 ? pack.journeySteps.find((item) => item.journeyStepId === journey?.journeyStepIds[currentIndex + 1]) ?? null : null;
  const selectedAsset = registry.assets.find((item) => item.assetId === selection.selectedSceneAssetId) ?? null;
  const selectedPackAsset = pack.sceneAssets.find((item) => item.assetId === selectedAsset?.assetId) ?? null;
  const designScene = props.designExperience?.scenes.find((item) => item.assetId === selectedAsset?.assetId) ?? null;
  const designDerivative = designScene ? props.designExperience?.derivatives.find((item) => item.derivativeId === designScene.derivativeId) ?? null : null;
  const designSource = designDerivative ? props.designExperience?.sources.find((item) => item.sourceId === designDerivative.sourceId) ?? null : null;
  const designRelations = designScene ? props.designExperience?.relations.filter((item) => designScene.relationshipIds.includes(item.relationId)) ?? [] : [];
  const designViewpoints = designScene ? props.designExperience?.viewpoints.filter((item) => designScene.viewpointIds.includes(item.viewpointId)) ?? [] : [];
  const designCameraTour = designScene ? props.designExperience?.cameraTours.find((item) => item.tourId === designScene.cameraTourId) ?? null : null;
  const [loadState, setLoadState] = useState<SceneLoadState | null>(null);
  const [loadNonce, setLoadNonce] = useState(0);
  const [modelConfirmedAssetId, setModelConfirmedAssetId] = useState<string | null>(null);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [contextPanel, setContextPanel] = useState<ContextPanel>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clientControlsActive, setClientControlsActive] = useState(true);
  const viewerRef = useRef<HTMLElement | null>(null);
  const clientControlsTimerRef = useRef<number | null>(null);
  const mode = modeForAsset(selectedAsset);
  const fallback = selectedAsset ? gateway.resolveFallback(selectedAsset.assetId) : null;
  const selectedAssetId = selectedAsset?.assetId ?? null;
  const selectedAssetAvailability = selectedAsset?.availabilityStatus ?? null;
  const fallbackAssetId = fallback?.assetId ?? null;
  const [fallbackState, setFallbackState] = useState<SceneLoadState | null>(null);
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches;
  const detailsOpen = selection.designTruthDrawerOpen;
  const setDetailsOpen = (next: boolean | ((current: boolean) => boolean)) => {
    const open = typeof next === 'function' ? next(selection.designTruthDrawerOpen) : next;
    props.onSelectionChange({ ...selection, designTruthDrawerOpen: open }, 'replace');
  };

  useEffect(() => {
    let active = true;
    const setSafe = (state: SceneLoadState | null) => { if (active) setLoadState(state); };
    if (!selectedAssetId || selectedAssetAvailability === 'missing') {
      void Promise.resolve().then(() => setSafe(selectedAssetId ? { assetId: selectedAssetId, variantId: null, status: 'missing', progress: null, adapterId: 'missing', uri: null, messageAr: 'مصدر المشهد المطلوب غير متاح.', retryable: false } : null));
      if (fallbackAssetId) void gateway.loadAssetVariant(fallbackAssetId, 'preview').then((state) => { if (active) setFallbackState(state); });
      return () => { active = false; if (fallbackAssetId) gateway.disposeScene(fallbackAssetId); };
    }
    if (mode === 'model-3d' && isMobile && modelConfirmedAssetId !== selectedAssetId) {
      void Promise.resolve().then(() => setSafe({ assetId: selectedAssetId, variantId: null, status: 'idle', progress: null, adapterId: 'web3d', uri: null, messageAr: 'تحميل النموذج متوقف على الشاشات الصغيرة حتى يطلبه المستخدم.', retryable: false }));
      return () => { active = false; };
    }
    void Promise.resolve().then(() => setSafe({ assetId: selectedAssetId, variantId: null, status: 'loading', progress: 0, adapterId: mode === 'model-3d' ? 'web3d' : mode === 'panorama-360' ? 'panorama' : 'flat-render', uri: null, messageAr: 'جارٍ التحقق من البصمة والنوع ثم تحميل المشهد.', retryable: false }));
    void gateway.loadAssetVariant(selectedAssetId, mode === 'model-3d' ? 'standard' : 'preview', (progress) => {
      setSafe({ assetId: selectedAssetId, variantId: null, status: 'loading', progress, adapterId: mode === 'model-3d' ? 'web3d' : mode === 'panorama-360' ? 'panorama' : 'flat-render', uri: null, messageAr: `جارٍ تحميل الأصل المتحقق · ${progress}%`, retryable: false });
    }).then((state) => { if (active) setLoadState(state); });
    return () => {
      active = false;
      gateway.disposeScene(selectedAssetId);
    };
  }, [fallbackAssetId, gateway, isMobile, loadNonce, mode, modelConfirmedAssetId, selectedAssetAvailability, selectedAssetId]);

  useEffect(() => {
    const listener = () => setIsFullscreen(document.fullscreenElement === viewerRef.current);
    document.addEventListener('fullscreenchange', listener);
    return () => document.removeEventListener('fullscreenchange', listener);
  }, []);

  useEffect(() => {
    if (!selection.designPresentationMode) return;
    const closePresentation = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (props.clientPresentationVariant === 'golden') props.onReturnToMap();
      else props.onSelectionChange({ ...selection, designPresentationMode: false, designCameraTourPlaying: false }, 'replace');
    };
    window.addEventListener('keydown', closePresentation);
    return () => window.removeEventListener('keydown', closePresentation);
  }, [props, selection]);

  const revealClientControls = () => {
    setClientControlsActive(true);
    if (clientControlsTimerRef.current !== null) window.clearTimeout(clientControlsTimerRef.current);
    clientControlsTimerRef.current = window.setTimeout(() => setClientControlsActive(false), 3600);
  };

  useEffect(() => {
    if (!selection.designPresentationMode) return;
    clientControlsTimerRef.current = window.setTimeout(() => setClientControlsActive(false), 3600);
    return () => {
      if (clientControlsTimerRef.current !== null) window.clearTimeout(clientControlsTimerRef.current);
      clientControlsTimerRef.current = null;
    };
  }, [selection.designPresentationMode]);

  const context = {
    projectId: pack.projectId,
    eventId: pack.eventId,
    venueId: pack.venueId,
    scenarioId: selection.scenarioId,
    eventDayId: selection.eventDayId,
    personaId: selection.personaId,
    journeyId: selection.journeyId,
    journeyStepId: selection.journeyStepId,
    touchpointId: selection.selectedTouchpointId
  };

  const chooseMode = (requestedMode: ViewerMode) => {
    const asset = gateway.resolveScene({ ...context, preferredMediaKinds: preferredKinds(requestedMode) });
    props.onSelectionChange({
      ...selection,
      selectedSceneAssetId: asset?.assetId ?? null,
      selectedSceneHotspotId: null,
      sceneViewerMode: modeForAsset(asset),
      sceneComparisonPairId: null,
      viewMode: 'scene-focus',
      mapMode: requestedMode === 'panorama-360' ? 'panorama' : requestedMode === 'model-3d' ? 'web3d' : selection.mapMode
    });
  };

  const activateHotspot = (hotspotId: string) => {
    if (!selectedAsset) return;
    const hotspot = selectedAsset.hotspots.find((item) => item.hotspotId === hotspotId);
    const transition = gateway.resolveTransition(selectedAsset.assetId, hotspotId);
    if (!hotspot || !transition) return;
    if (hotspot.targetType === 'exit-to-map') {
      props.onSelectionChange({ ...selection, selectedSceneHotspotId: hotspotId, mapMode: 'story', viewMode: 'map-focus' });
      return;
    }
    const targetStep = pack.journeySteps.find((item) => item.journeyStepId === transition.targetJourneyStepId) ?? step;
    const targetAsset = transition.targetAssetId ? gateway.getAsset(transition.targetAssetId) : selectedAsset;
    const targetLandmark = targetStep
      ? props.storyMapDefinition.landmarks.find((landmark) => landmark.relatedJourneyStepIds.includes(targetStep.journeyStepId) && (!selection.eventDayId || landmark.eventDayIds.length === 0 || landmark.eventDayIds.includes(selection.eventDayId)) && (!selection.personaId || landmark.personaIds.length === 0 || landmark.personaIds.includes(selection.personaId))) ?? null
      : null;
    props.onSelectionChange({
      ...selection,
      journeyStepId: targetStep?.journeyStepId ?? selection.journeyStepId,
      selectedTouchpointId: hotspot.targetTouchpointId ?? targetStep?.touchpointId ?? selection.selectedTouchpointId,
      selectedEntityId: hotspot.targetEntityId ?? targetStep?.relatedEntityIds[0] ?? selection.selectedEntityId,
      selectedZoneId: hotspot.targetZoneId ?? targetStep?.relatedZoneIds[0] ?? selection.selectedZoneId,
      selectedExperienceAreaId: targetStep?.experienceAreaCandidateIds[0] ?? selection.selectedExperienceAreaId,
      selectedSceneAssetId: targetAsset?.assetId ?? selection.selectedSceneAssetId,
      selectedSceneHotspotId: hotspotId,
      sceneViewerMode: modeForAsset(targetAsset),
      selectedLandmarkId: targetLandmark?.landmarkId ?? null,
      rehearsalState: { ...selection.rehearsalState, status: 'paused', currentJourneyStepId: targetStep?.journeyStepId ?? selection.journeyStepId }
    });
  };

  const comparisonPair = registry.comparisonPairs.find((pair) => pair.comparisonPairId === selection.sceneComparisonPairId) ?? null;
  const title = designScene?.labelAr ?? touchpoint?.labelAr ?? step?.labelAr ?? 'لا توجد لحظة محددة';
  const missingPanorama = selectedAsset && ['equirectangular-panorama', 'cubemap-panorama', 'actual-360-capture'].includes(selectedAsset.mediaKind);
  const designLensCopy: Record<DesignSceneLens, { titleAr: string; summaryAr: string }> = {
    experience: { titleAr: 'ما يراه الزائر', summaryAr: 'تكوين تصميمي متعرج قابل للفحص البصري؛ علاقته بممر العصور مرشحة وتحتاج تأكيد الهوية.' },
    structure: { titleAr: 'بنية المشتق', summaryAr: `${designDerivative?.meshCount ?? 0} شبكة · ${designDerivative?.triangleCount.toLocaleString('en-US') ?? 0} مثلث · لا خامات أو مراجع خارجية.` },
    truth: { titleAr: 'حقيقة التصميم', summaryAr: 'المصدر الأصلي معتمد من المؤسس لنية التصميم، والمشتق التشخيصي مرشح غير مسجل هندسيًا.' },
    command: { titleAr: 'ما وراء التجربة', summaryAr: 'التأكيد الدلالي والتسجيل الهندسي والاعتماد التشغيلي ما زالت مدخلات مطلوبة؛ الجاهزية لا يمكن تحديدها.' }
  };
  const selectedDesignLensCopy = designLensCopy[selection.designSceneLens];
  const currentDesignViewpointIndex = designViewpoints.findIndex((item) => item.viewpointId === selection.designSceneViewpointId);
  const currentDesignViewpoint = designViewpoints[currentDesignViewpointIndex] ?? designViewpoints[0] ?? null;
  const stepDesignViewpoint = (direction: -1 | 1) => {
    if (!designViewpoints.length) return;
    const currentIndex = currentDesignViewpointIndex < 0 ? 0 : currentDesignViewpointIndex;
    const nextIndex = Math.max(0, Math.min(designViewpoints.length - 1, currentIndex + direction));
    const next = designViewpoints[nextIndex];
    if (!next) return;
    props.onSelectionChange({ ...selection, designSceneViewpointId: next.viewpointId, designCameraTourPlaying: false });
  };
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const requestFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void viewerRef.current?.requestFullscreen();
  };

  return (
    <section ref={viewerRef} className={`experience-scene-viewer ${isFullscreen ? 'is-fullscreen' : ''} ${selection.designPresentationMode ? 'is-design-presentation' : ''} ${selection.designPresentationMode && props.clientPresentationVariant === 'golden' ? 'is-golden-client' : ''} ${selection.designPresentationMode && !clientControlsActive ? 'is-client-controls-dimmed' : ''}`} data-testid="experience-scene-viewer" data-scene-mode={mode} onPointerMove={selection.designPresentationMode ? revealClientControls : undefined} onFocusCapture={selection.designPresentationMode ? revealClientControls : undefined} onKeyDownCapture={selection.designPresentationMode ? revealClientControls : undefined}>
      {selection.designPresentationMode && designScene ? <>
        <button className="scene-design-client-truth-badge" data-testid="design-client-truth-badge" type="button" onClick={() => setDetailsOpen(true)}><ShieldCheck /><span>حقيقة المصدر</span><b>تصميم معتمد النية · مشتق غير مسجل</b></button>
        {props.routeDesignProjection.designRelation ? <div className="scene-design-client-context-badge" data-testid="design-client-route-context"><span>{props.routeDesignProjection.waypoint?.sourceLabelAr ?? designScene.labelAr}</span><small>علاقة {props.routeDesignProjection.designRelation.status} / {props.routeDesignProjection.designRelation.confidence} · ليست مسارًا</small></div> : null}
      </> : null}
      <header className="scene-viewer-header">
        <div><small>{day?.labelAr ?? 'اليوم غير محدد'} · {persona?.labelAr ?? 'الشخصية غير محددة'}</small><strong>{title}</strong><span>{journey?.labelAr ?? 'الرحلة غير مفصلة'}</span>{selectedAsset?.source?.captureClassification === 'technical-synthetic' ? <em data-testid="scene-technical-fixture-label">نموذج تقني خيالي للاختبار</em> : null}</div>
        <div className="scene-viewer-truth"><b>{displayTruthLabel(selectedAsset, selectedPackAsset?.sourceAuthority ?? null)}</b><span>{selectedAsset ? `${approvalLabels[selectedAsset.approvalStatus]} · ${rightsLabels[selectedAsset.rightsStatus]}` : 'لا يوجد أصل مرتبط'}</span></div>
      </header>

      <nav className="scene-mode-tabs" aria-label="نوع المشهد">
        <button type="button" data-testid="scene-mode-design" aria-pressed={mode === 'design-preview'} onClick={() => chooseMode('design-preview')}><ImageIcon />معاينة التصميم</button>
        <button type="button" data-testid="scene-mode-panorama" aria-pressed={mode === 'panorama-360' || (mode === 'source-missing' && Boolean(missingPanorama))} onClick={() => chooseMode('panorama-360')}><Layers3 />بانوراما 360</button>
        <button type="button" data-testid="scene-mode-web3d" aria-pressed={mode === 'model-3d' || (mode === 'source-missing' && selectedAsset?.mediaKind === 'gltf-scene')} onClick={() => chooseMode('model-3d')}><Box />نموذج 3D</button>
        <button type="button" aria-pressed={selection.sceneTruthLens === 'client-experience'} onClick={() => props.onSelectionChange({ ...selection, sceneTruthLens: 'client-experience' }, 'replace')}>عدسة تجربة العميل</button>
        <button type="button" aria-pressed={selection.sceneTruthLens === 'operational-truth'} onClick={() => props.onSelectionChange({ ...selection, sceneTruthLens: 'operational-truth' }, 'replace')}>عدسة الحقيقة التشغيلية</button>
        {designScene ? <div className="scene-design-lens-tabs" aria-label="عدسات قراءة التصميم">{(['experience', 'structure', 'truth', 'command'] as const).map((lens) => <button key={lens} type="button" data-testid={`design-lens-${lens}`} aria-pressed={selection.designSceneLens === lens} onClick={() => props.onSelectionChange({ ...selection, designSceneLens: lens }, 'replace')}>{lens === 'experience' ? 'التجربة' : lens === 'structure' ? 'البنية' : lens === 'truth' ? 'الحقيقة' : 'القيادة'}</button>)}</div> : null}
        {registry.comparisonPairs.length ? <label className="scene-comparison-select"><span>المقارنة</span><select data-testid="scene-comparison-select" value={selection.sceneComparisonPairId ?? ''} onChange={(event) => props.onSelectionChange({ ...selection, sceneComparisonPairId: event.target.value || null }, 'replace')}><option value="">لا مقارنة</option>{registry.comparisonPairs.map((pair) => <option key={pair.comparisonPairId} value={pair.comparisonPairId}>{pair.mode === 'design-candidate-vs-approved' ? 'تصميم مرشح مقابل تصميم معتمد' : 'مراجعتان بزوايا غير متوافقة'}</option>)}</select></label> : <span className="scene-no-comparison">لا توجد مقارنة صالحة لهذا المشروع.</span>}
      </nav>

      <div className="scene-viewer-surface">
        {comparisonPair ? <ComparisonView registry={registry} gateway={gateway} pairId={comparisonPair.comparisonPairId} /> : mode === 'source-missing' ? (
          <div className="scene-missing" data-testid={missingPanorama ? 'scene-missing-panorama' : selectedAsset?.mediaKind === 'gltf-scene' ? 'scene-missing-web3d' : 'scene-missing-source'}>
            <ImageOff /><strong>{missingPanorama ? 'مشاهد 360° قيد التسليم من استوديو التصميم' : selectedAsset?.mediaKind === 'gltf-scene' ? 'المشهد ثلاثي الأبعاد قيد التسليم من استوديو التصميم' : 'مصدر المشهد غير متاح.'}</strong>
            <p>{missingPanorama ? 'بانوراما 360 غير متوفرة لهذا المشهد. يمكن ترقية هذا الموضع لاحقًا دون تغيير هوية المشهد عند وصول بانوراما 2:1 أو كاميرا استوديو معتمدة.' : selectedAsset?.mediaKind === 'gltf-scene' ? 'المطلوب: GLB/GLTF محقق، بوحدات وحالة إحداثيات وحقوق معلنة.' : 'يلزم أصل مسجل ومتحقق قبل العرض.'}</p>
            <button type="button" onClick={() => setIntakeOpen(true)}><FileSearch />متطلبات إدخال المشهد</button>
            {fallback && fallbackState?.assetId === fallback.assetId && fallbackState.status === 'ready' && fallbackState.uri ? <figure><img src={fallbackState.uri} alt="معاينة تصميم مرشحة بديلة" /><figcaption>بديل مسطح مرشح فقط · لا يمثل 360 أو نموذجًا ثلاثيًا</figcaption></figure> : null}
          </div>
        ) : loadState && loadState.assetId === selectedAsset?.assetId && loadState.status === 'ready' && loadState.uri ? (
          mode === 'panorama-360' ? <SceneErrorBoundary onRetry={() => setLoadNonce((value) => value + 1)}><Suspense fallback={<div className="scene-load-state"><CircleDot /><strong>جارٍ فك البانوراما</strong></div>}><PanoramaSceneSurface uri={loadState.uri} onReady={() => undefined} /></Suspense></SceneErrorBoundary>
            : mode === 'model-3d' ? <><SceneErrorBoundary onRetry={() => setLoadNonce((value) => value + 1)}><Suspense fallback={<div className="scene-load-state"><CircleDot /><strong>جارٍ فك النموذج</strong></div>}><Web3DSceneSurface
              uri={loadState.uri}
              onReady={() => undefined}
              onFailure={(messageAr) => setLoadState({ assetId: selectedAsset.assetId, variantId: loadState.variantId, status: 'failed', progress: null, adapterId: 'web3d', uri: null, messageAr, retryable: true })}
              bounds={designDerivative ? { min: designDerivative.boundsMin, max: designDerivative.boundsMax } : undefined}
              viewpoints={designViewpoints}
              selectedViewpointId={selection.designSceneViewpointId}
              onViewpointChange={(designSceneViewpointId, historyMode) => props.onSelectionChange({ ...selection, designSceneViewpointId }, historyMode)}
              lens={selection.designSceneLens}
              qualityProfile={selection.designSceneQualityProfile}
              onQualityProfileChange={(designSceneQualityProfile) => props.onSelectionChange({ ...selection, designSceneQualityProfile }, 'replace')}
              cameraTour={designCameraTour}
              tourPlaying={selection.designCameraTourPlaying}
              onTourPlayingChange={(designCameraTourPlaying) => props.onSelectionChange({ ...selection, designCameraTourPlaying }, 'replace')}
              onRequestFullscreen={requestFullscreen}
              presentationMode={selection.designPresentationMode}
            /></Suspense></SceneErrorBoundary>{designScene ? <aside className="scene-design-lens-context" data-testid="design-scene-lens-context"><span>{selectedDesignLensCopy.titleAr}</span><strong>{selectedDesignLensCopy.summaryAr}</strong><small>{designScene.authorityStatus === 'derived-diagnostic-candidate' ? 'مشتق تشخيصي مرشح · لا يغيّر الجاهزية أو المسار أو خط الأساس' : designScene.authorityStatus}</small></aside> : null}</>
              : <div className="scene-flat" data-testid="scene-flat-preview"><img src={loadState.uri} alt={`معاينة تصميم مرشحة: ${title}`} /><span>معاينة مرجعية مسطحة — ليست تجربة 360°</span>{selectedAsset?.hotspots.map((hotspot) => hotspot.normalizedPosition ? <button key={hotspot.hotspotId} type="button" style={{ insetInlineStart: `${hotspot.normalizedPosition.x * 100}%`, top: `${hotspot.normalizedPosition.y * 100}%` }} onClick={() => activateHotspot(hotspot.hotspotId)}>{hotspot.labelAr}</button> : null)}</div>
        ) : mode === 'model-3d' && isMobile && modelConfirmedAssetId !== selectedAsset?.assetId ? <div className="scene-load-state"><Box /><strong>النموذج لا يُحمّل تلقائيًا على الهاتف</strong><p>{designDerivative ? `${(designDerivative.byteSize / 1_048_576).toFixed(1)} MB · يلزم طلب المستخدم لتقليل استهلاك البيانات.` : 'يلزم طلب المستخدم قبل تحميل أصل Web3D.'}</p><button type="button" onClick={() => setModelConfirmedAssetId(selectedAsset?.assetId ?? null)}>تحميل النموذج الآن</button></div>
          : <div className={`scene-load-state ${loadState?.status === 'failed' ? 'is-error' : ''}`} data-testid="scene-load-state"><CircleDot /><strong>{loadState?.messageAr ?? 'جارٍ تحديد أفضل أصل صادق'}</strong>{loadState?.status === 'loading' && loadState.progress !== null ? <progress data-testid="scene-load-progress" max="100" value={loadState.progress}>{loadState.progress}%</progress> : null}<p>يُحمّل الأصل المختار فقط بعد التحقق من البصمة والنوع والحقوق.</p>{loadState?.retryable ? <button type="button" onClick={() => setLoadNonce((value) => value + 1)}>إعادة المحاولة</button> : null}</div>}
      </div>

      {selection.designPresentationMode && designScene ? <footer className="scene-design-client-dock" data-testid="design-client-presentation">
        {props.clientPresentationVariant !== 'golden' ? <details className="scene-design-client-journey" data-testid="design-client-journey-drawer">
          <summary><span>{props.routeDesignProjection.journey?.labelAr ?? 'استكشاف التصميم مستقل عن المسار'}</span><small>{props.routeDesignProjection.waypoint?.sourceLabelAr ?? 'لا محطة تشغيلية مرتبطة'}</small></summary>
          <div>{props.routeDesignProjection.journey?.waypoints.map((item) => <button key={item.waypointId} type="button" disabled={!props.onRouteWaypointChange} aria-current={item.waypointId === props.routeDesignProjection.waypoint?.waypointId ? 'step' : undefined} onClick={() => props.onRouteWaypointChange?.(item.waypointId)}><i>{item.sourceLetter}</i><span>{item.sourceLabelAr}</span></button>) ?? <p>{props.routeDesignProjection.messageAr}</p>}</div>
        </details> : null}
        <div className="scene-design-client-transport">
          <button data-testid="design-client-tour-toggle" type="button" disabled={!designCameraTour || reducedMotion} aria-pressed={selection.designCameraTourPlaying} aria-label={selection.designCameraTourPlaying ? 'إيقاف جولة التصميم' : 'تشغيل جولة التصميم'} onClick={() => props.onSelectionChange({ ...selection, designCameraTourPlaying: !selection.designCameraTourPlaying }, 'replace')}>{selection.designCameraTourPlaying ? <Pause /> : <Play />}</button>
          <button data-testid="design-client-previous-viewpoint" type="button" disabled={currentDesignViewpointIndex <= 0} onClick={() => stepDesignViewpoint(-1)} aria-label="منظور التصميم السابق"><ChevronRight /></button>
          <div><span>المنظور الحالي</span><strong>{currentDesignViewpoint?.labelAr ?? 'غير محدد'}</strong></div>
          <button data-testid="design-client-next-viewpoint" type="button" disabled={currentDesignViewpointIndex < 0 || currentDesignViewpointIndex >= designViewpoints.length - 1} onClick={() => stepDesignViewpoint(1)} aria-label="منظور التصميم التالي"><ChevronLeft /></button>
          <button data-testid="design-client-fullscreen" type="button" onClick={requestFullscreen} aria-label={isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}><Maximize2 /></button>
          <button data-testid="design-client-exit" type="button" onClick={() => props.clientPresentationVariant === 'golden' ? props.onReturnToMap() : props.onSelectionChange({ ...selection, designPresentationMode: false, designCameraTourPlaying: false }, 'replace')}><X /><span>{props.clientPresentationVariant === 'golden' ? 'العودة إلى الخريطة' : 'إنهاء العرض'}</span></button>
        </div>
      </footer> : null}

      {selectedAsset?.hotspots.length ? <section className="scene-hotspot-list" data-testid="scene-hotspot-list"><strong>نقاط التفاعل النصية</strong>{selectedAsset.hotspots.map((hotspot) => <button key={hotspot.hotspotId} type="button" disabled={!gateway.resolveTransition(selectedAsset.assetId, hotspot.hotspotId)} aria-pressed={selection.selectedSceneHotspotId === hotspot.hotspotId} onClick={() => activateHotspot(hotspot.hotspotId)}><span>{hotspot.labelAr}</span><small>{hotspot.status === 'candidate' ? 'مرشح' : hotspot.status}</small><ArrowLeft /></button>)}</section> : null}

      <div className="scene-context-actions">
        <button type="button" onClick={props.onReturnToMap}><ArrowLeft />العودة إلى Story Map</button>
        <button type="button" onClick={() => setContextPanel(contextPanel === 'operational' ? null : 'operational')}>السياق التشغيلي</button>
        <button type="button" onClick={() => setContextPanel(contextPanel === 'readiness' ? null : 'readiness')}>الجاهزية</button>
        <button type="button" onClick={() => setContextPanel(contextPanel === 'decisions' ? null : 'decisions')}>القرارات</button>
        <button type="button" onClick={() => setContextPanel(contextPanel === 'evidence' ? null : 'evidence')}>الأدلة</button>
      </div>
      {contextPanel ? <aside className="scene-context-panel" data-testid={`scene-context-${contextPanel}`}>
        <Info /><div><strong>{contextPanel === 'operational' ? 'السياق التشغيلي المرتبط' : contextPanel === 'readiness' ? 'حقيقة الجاهزية' : contextPanel === 'decisions' ? 'القرارات المرتبطة' : 'حالة الأدلة'}</strong><p>{contextPanel === 'operational' ? `${projection?.spatialStatusAr ?? 'لا توجد حقيقة مكانية'} · ${step?.experienceIntent.operationalOwner ?? 'المالك غير معروف'}` : contextPanel === 'readiness' ? `${projection?.readinessDisposition === 'cannot-determine' ? 'لا يمكن تحديد الجاهزية' : 'غير منطبق'} · ${projection?.readinessExplanationAr ?? ''}` : contextPanel === 'decisions' ? projection?.decisionStateAr ?? 'لا توجد قرارات مرتبطة' : projection?.evidenceStateAr ?? 'لا توجد أدلة مرتبطة'}</p></div>
      </aside> : null}

      <footer className="scene-viewer-footer">
        <button type="button" onClick={props.onPrevious} disabled={!previousStep}><ChevronRight /><span><small>السابق</small>{previousStep?.labelAr ?? 'بداية الرحلة'}</span></button>
        <div><button type="button" onClick={() => setDetailsOpen((value) => !value)}><ShieldCheck />{designScene ? 'حقيقة التصميم' : 'الحقيقة والتفاصيل'}</button>{props.readOnly || designScene ? <button type="button" onClick={() => setIntakeOpen(true)}><FileSearch />متطلبات المصدر</button> : <button type="button" onClick={() => setIntakeOpen(true)}><FileSearch />إدخال وتأليف</button>}{designScene ? <button data-testid="design-client-mode-toggle" type="button" onClick={() => { const presentationViewpoint = designViewpoints.find((item) => item.kind === 'presentation') ?? designViewpoints[0] ?? null; setClientControlsActive(true); setIntakeOpen(false); props.onSelectionChange({ ...selection, designPresentationMode: true, designTruthDrawerOpen: false, designSceneViewpointId: presentationViewpoint?.viewpointId ?? selection.designSceneViewpointId }, 'replace'); }}><Presentation />وضع عرض العميل</button> : null}<button type="button" onClick={requestFullscreen}><Maximize2 />{isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}</button></div>
        <button type="button" onClick={props.onNext} disabled={!nextStep}><span><small>التالي</small>{nextStep?.labelAr ?? 'نهاية الرحلة'}</span><ChevronLeft /></button>
      </footer>

      {detailsOpen ? <aside className="scene-details" data-testid="scene-truth-details"><header><strong>{designScene ? 'حقيقة التصميم' : 'تفاصيل أصل المشهد'}</strong><button type="button" aria-label="إغلاق تفاصيل المشهد" onClick={() => setDetailsOpen(false)}><X /></button></header>{designScene && designDerivative && designSource ? <><section className="scene-design-truth-summary"><ShieldCheck /><div><strong>نية التصميم معتمدة من المؤسس</strong><span>المشتق المعروض تشخيصي مرشح وغير مسجل هندسيًا.</span></div></section><dl><div><dt>المصدر</dt><dd>{designSource.authorityStatus}</dd></div><div><dt>المشتق</dt><dd>{designDerivative.authorityStatus}</dd></div><div><dt>Scene ID</dt><dd dir="ltr">{designScene.sceneId}</dd></div><div><dt>Asset ID</dt><dd dir="ltr">{designScene.assetId}</dd></div><div><dt>Source SHA</dt><dd dir="ltr">{designSource.observedSha256}</dd></div><div><dt>GLB SHA</dt><dd dir="ltr">{designDerivative.sha256}</dd></div><div><dt>بنية المشتق</dt><dd>{designDerivative.sourceMeshCount} شبكة مصدر · {designDerivative.vertexCount.toLocaleString('en-US')} رأس · {designDerivative.triangleCount.toLocaleString('en-US')} مثلث · {designDerivative.materialCount} مجموعة مواد</dd></div><div><dt>الأبعاد المحلية</dt><dd dir="ltr">{designDerivative.dimensions.map((value) => value.toFixed(2)).join(' × ')} m</dd></div><div><dt>الهندسة</dt><dd>غير مسجلة · لا CRS أو نقاط ضبط</dd></div><div><dt>العلاقة</dt><dd>{designRelations.map((relation) => relation.authorityAr).join(' · ')}</dd></div><div><dt>الكاميرات</dt><dd>كاميرات معاينة مولدة · لا Named Views إنتاجية</dd></div><div><dt>360°</dt><dd>بانوراما 360 غير متوفرة لهذا المشهد</dd></div><div><dt>تصدير الاستوديو</dt><dd>غير متوفر؛ المعروض مشتق تشخيصي مباشر</dd></div><div><dt>الجاهزية</dt><dd>لا يمكن تحديدها</dd></div></dl><h3 className="scene-design-truth-heading">المحتوى المضمن</h3><ul className="scene-design-truth-list">{designDerivative.includedContentAr.map((item) => <li key={item}>{item}</li>)}</ul><h3 className="scene-design-truth-heading">المحتوى المستبعد</h3><ul className="scene-design-truth-list">{designDerivative.excludedContentAr.map((item) => <li key={item}>{item}</li>)}</ul><h3 className="scene-design-truth-heading">الدليل التالي المطلوب</h3><ul className="scene-design-truth-list"><li>تأكيد المؤسس أو الاستوديو لهوية الربط الدلالي.</li><li>تصدير استوديو بحزم الخامات والكاميرات المسماة.</li><li>أصل 2:1 حقيقي لأي ترقية بانورامية.</li><li>أصل الشمال ونقاط الضبط والتسجيل الهندسي من السلطة المختصة.</li>{designScene.technicalTruthAr.map((item) => <li key={item}>{item}</li>)}</ul></> : selectedAsset ? <dl><div><dt>Asset ID</dt><dd dir="ltr">{selectedAsset.assetId}</dd></div><div><dt>Revision</dt><dd>R{selectedAsset.revision} · {selectedAsset.revisionId}</dd></div><div><dt>Content SHA-256</dt><dd dir="ltr">{selectedAsset.contentHash ?? 'missing'}</dd></div><div><dt>Source revision</dt><dd>{selectedAsset.source?.sourceRevision ?? 'missing'}</dd></div><div><dt>Source fingerprint</dt><dd dir="ltr">{selectedAsset.sourceFingerprint ?? 'missing'}</dd></div><div><dt>آخر تحقق</dt><dd>{selectedAsset.lastVerifiedAt ?? 'لا يوجد تحقق زمني موثوق'}</dd></div><div><dt>الإحداثيات</dt><dd>{selectedAsset.coordinateStatus}</dd></div><div><dt>الحقيقة</dt><dd>{truthLabels[selectedAsset.truthClass]}</dd></div></dl> : <p>لا يوجد أصل مسجل.</p>}<button type="button" onClick={props.onOpenTruth}>افتح سجل مصدر الحزمة</button></aside> : null}
      {intakeOpen && selectedAsset && !props.readOnly && !designScene ? <SceneAuthoringPanel asset={selectedAsset} gateway={gateway} context={validationContext} onClose={() => setIntakeOpen(false)} onDirtyChange={props.onDirtyChange} /> : intakeOpen ? <aside className="scene-authoring"><header><strong>متطلبات الإدخال</strong><button type="button" aria-label="إغلاق متطلبات الإدخال" onClick={() => setIntakeOpen(false)}><X /></button></header><p>{designScene ? 'المصدر الأصلي محمي وخارج Git. أي مشتق جديد يحتاج بصمة ومراجعة مستقلة ولا يعدّل هذا السجل أو يرفعه إلى هندسة معتمدة.' : 'يجب تسجيل المصدر والبصمة والحقوق والنوع والنطاق قبل إنشاء معاينة. وضع البروفة للقراءة فقط ولا ينشئ أصلًا أو مراجعة.'}</p></aside> : null}
    </section>
  );
}

export default ExperienceSceneViewer;
