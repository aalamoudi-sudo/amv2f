import type { ExperienceMapMode, SceneAssetManifest as LegacySceneAssetManifest, SceneAssetMedium } from '../types/experienceTwin';
import type {
  ExperienceSceneAsset,
  SceneAssetRegistry,
  SceneAssetVariant,
  SceneComparisonPair,
  SceneGatewayContext,
  SceneHotspot,
  SceneLoadState,
  SceneMediaKind,
  SceneTransition,
  SceneValidationContext,
  SceneValidationResult
} from '../types/experienceScene';
import { validateExperienceSceneAsset, validateSceneComparisonPair } from './experienceSceneValidation';

export type ExperienceSceneAdapterId = 'flat-render' | 'panorama' | 'web3d' | 'missing';

export interface SceneAdapterLoadRequest {
  asset: ExperienceSceneAsset;
  variant: SceneAssetVariant;
  signal: AbortSignal;
  onProgress?: (progress: number) => void;
}

export interface ExperienceSceneAdapter {
  adapterId: ExperienceSceneAdapterId;
  labelAr: string;
  supportedMedia: SceneMediaKind[];
  load(request: SceneAdapterLoadRequest): Promise<SceneLoadState>;
  dispose(assetId: string): void;
}

async function sha256(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

const verifiedObjectUrls = new Map<string, string>();

function releaseVerifiedObjectUrl(assetId: string): void {
  const existing = verifiedObjectUrls.get(assetId);
  if (existing) URL.revokeObjectURL(existing);
  verifiedObjectUrls.delete(assetId);
}

async function responseBytes(response: Response, expectedBytes: number | null, signal: AbortSignal, onProgress?: (progress: number) => void): Promise<ArrayBuffer> {
  const declaredLength = Number(response.headers.get('content-length')) || expectedBytes || 0;
  if (!response.body) {
    const bytes = await response.arrayBuffer();
    onProgress?.(100);
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    received += value.byteLength;
    if (declaredLength > 0) onProgress?.(Math.min(99, Math.round((received / declaredLength) * 100)));
  }
  const combined = new Uint8Array(received);
  let offset = 0;
  chunks.forEach((chunk) => {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  });
  onProgress?.(100);
  return combined.buffer;
}

async function loadLocalVariant(adapterId: ExperienceSceneAdapterId, request: SceneAdapterLoadRequest): Promise<SceneLoadState> {
  const { asset, variant, signal } = request;
  if (!variant.uri) return missingState(asset.assetId, adapterId, 'لا يوجد ملف محلي صالح لهذه النسخة.');
  try {
    const response = await fetch(variant.uri, { signal, cache: 'no-store' });
    if (!response.ok) return missingState(asset.assetId, adapterId, 'ملف المشهد المحلي غير موجود.');
    const responseMime = response.headers.get('content-type')?.split(';', 1)[0]?.trim() ?? null;
    if (responseMime === 'text/html' && variant.mimeType !== 'text/html') {
      return missingState(asset.assetId, adapterId, 'ملف المشهد المحلي غير موجود.');
    }
    if (variant.mimeType && responseMime && responseMime !== variant.mimeType && responseMime !== 'application/octet-stream') {
      return failedState(asset.assetId, adapterId, 'نوع الملف المحمّل لا يطابق النوع المسجل.');
    }
    const bytes = await responseBytes(response, variant.byteSize, signal, request.onProgress);
    if (variant.byteSize !== null && bytes.byteLength !== variant.byteSize) {
      return failedState(asset.assetId, adapterId, 'حجم ملف المشهد لا يطابق النسخة المسجلة.');
    }
    if (variant.contentHash && await sha256(bytes) !== variant.contentHash) {
      return failedState(asset.assetId, adapterId, 'بصمة ملف المشهد لا تطابق السجل، لذلك تم حظره.');
    }
    releaseVerifiedObjectUrl(asset.assetId);
    const verifiedUri = URL.createObjectURL(new Blob([bytes], { type: variant.mimeType ?? responseMime ?? 'application/octet-stream' }));
    verifiedObjectUrls.set(asset.assetId, verifiedUri);
    return {
      assetId: asset.assetId,
      variantId: variant.variantId,
      status: 'ready',
      progress: 100,
      adapterId,
      uri: verifiedUri,
      messageAr: 'أصل المشهد جاهز للعرض المحلي.',
      retryable: false
    };
  } catch (error) {
    if (signal.aborted) {
      return { assetId: asset.assetId, variantId: variant.variantId, status: 'cancelled', progress: null, adapterId, uri: null, messageAr: 'أُلغي تحميل المشهد القديم بأمان.', retryable: false };
    }
    return failedState(asset.assetId, adapterId, error instanceof Error ? 'تعذر تحميل المشهد المحلي ويمكن إعادة المحاولة.' : 'تعذر تحميل المشهد المحلي.');
  }
}

function missingState(assetId: string, adapterId: ExperienceSceneAdapterId, messageAr: string): SceneLoadState {
  return { assetId, variantId: null, status: 'missing', progress: null, adapterId, uri: null, messageAr, retryable: false };
}

function failedState(assetId: string, adapterId: ExperienceSceneAdapterId, messageAr: string): SceneLoadState {
  return { assetId, variantId: null, status: 'failed', progress: null, adapterId, uri: null, messageAr, retryable: true };
}

export class FlatRenderSceneAdapter implements ExperienceSceneAdapter {
  readonly adapterId = 'flat-render' as const;
  readonly labelAr = 'معاينة تصميم مسطحة';
  readonly supportedMedia: SceneMediaKind[] = ['flat-render'];
  load(request: SceneAdapterLoadRequest): Promise<SceneLoadState> { return loadLocalVariant(this.adapterId, request); }
  dispose(assetId: string): void { releaseVerifiedObjectUrl(assetId); }
}

export class PanoramaSceneAdapter implements ExperienceSceneAdapter {
  readonly adapterId = 'panorama' as const;
  readonly labelAr = 'مشهد بانورامي حقيقي';
  readonly supportedMedia: SceneMediaKind[] = ['equirectangular-panorama', 'cubemap-panorama', 'actual-360-capture'];
  load(request: SceneAdapterLoadRequest): Promise<SceneLoadState> { return loadLocalVariant(this.adapterId, request); }
  dispose(assetId: string): void { releaseVerifiedObjectUrl(assetId); }
}

export class Web3DSceneAdapter implements ExperienceSceneAdapter {
  readonly adapterId = 'web3d' as const;
  readonly labelAr = 'نموذج Web3D للفحص المداري';
  readonly supportedMedia: SceneMediaKind[] = ['gltf-scene'];
  load(request: SceneAdapterLoadRequest): Promise<SceneLoadState> { return loadLocalVariant(this.adapterId, request); }
  dispose(assetId: string): void { releaseVerifiedObjectUrl(assetId); }
}

export class MissingSceneAdapter implements ExperienceSceneAdapter {
  readonly adapterId = 'missing' as const;
  readonly labelAr = 'مصدر المشهد مفقود';
  readonly supportedMedia: SceneMediaKind[] = [];
  load(request: SceneAdapterLoadRequest): Promise<SceneLoadState> {
    return Promise.resolve(missingState(request.asset.assetId, this.adapterId, 'مصدر المشهد المطلوب لم يُسلّم أو لم يجتز التحقق.'));
  }
  dispose(): void { /* No resource was allocated. */ }
}

export interface FutureSceneAdapterBoundary {
  readonly futureOnly: true;
  readonly adapterId: string;
  readonly labelAr: string;
}

export interface CesiumSceneAdapter extends FutureSceneAdapterBoundary { readonly adapterId: 'cesium'; }
export interface CloudSceneStorageAdapter extends FutureSceneAdapterBoundary { readonly adapterId: 'cloud-storage'; }
export interface FieldCapture360Adapter extends FutureSceneAdapterBoundary { readonly adapterId: 'field-capture-360'; }
export interface ProjectionOutputAdapter extends FutureSceneAdapterBoundary { readonly adapterId: 'projection-output'; }
export interface PhysicalTwinAdapter extends FutureSceneAdapterBoundary { readonly adapterId: 'physical-twin'; }

export const futureSceneAdapterBoundaries: readonly FutureSceneAdapterBoundary[] = [
  { adapterId: 'cesium', labelAr: 'Cesium / 3D Tiles غير مفعّل', futureOnly: true },
  { adapterId: 'cloud-storage', labelAr: 'تخزين سحابي غير مفعّل', futureOnly: true },
  { adapterId: 'field-capture-360', labelAr: 'التقاط ميداني 360 غير مفعّل', futureOnly: true },
  { adapterId: 'projection-output', labelAr: 'مخرج الإسقاط غير مفعّل', futureOnly: true },
  { adapterId: 'physical-twin', labelAr: 'التوأم المادي غير مفعّل', futureOnly: true }
];

export const futureExperienceSceneAdapters: readonly FutureSceneAdapterBoundary[] = [
  { adapterId: 'cesium', labelAr: 'Cesium / 3D Tiles غير مفعّل', futureOnly: true },
  { adapterId: 'projection', labelAr: 'الإسقاط المكاني غير مفعّل', futureOnly: true },
  { adapterId: 'physical-twin', labelAr: 'التوأم المادي غير مفعّل', futureOnly: true },
  { adapterId: 'live-camera', labelAr: 'كاميرا حية غير مفعّلة', futureOnly: true }
];

// Compatibility descriptors remain metadata-only; no vendor implementation is installed.
export const CesiumContextAdapter = futureExperienceSceneAdapters[0]!;
export const CloudSceneStorageAdapterBoundary = futureSceneAdapterBoundaries[1]!;
export const FieldCapture360AdapterBoundary = futureSceneAdapterBoundaries[2]!;
export const ProjectionOutputAdapterBoundary = futureSceneAdapterBoundaries[3]!;
export const PhysicalTwinAdapterBoundary = futureExperienceSceneAdapters[2]!;
export const LiveCameraMetadataAdapter = futureExperienceSceneAdapters[3]!;

export interface ExperienceSceneGateway {
  listAssets(context: SceneGatewayContext): ExperienceSceneAsset[];
  getAsset(assetId: string): ExperienceSceneAsset | null;
  resolveScene(context: SceneGatewayContext): ExperienceSceneAsset | null;
  resolveFallback(assetId: string): ExperienceSceneAsset | null;
  validateAssetManifest(manifest: ExperienceSceneAsset): SceneValidationResult;
  loadAssetVariant(assetId: string, quality: SceneAssetVariant['quality'], onProgress?: (progress: number) => void): Promise<SceneLoadState>;
  listHotspots(assetId: string): SceneHotspot[];
  resolveTransition(sourceAssetId: string, hotspotId: string): SceneTransition | null;
  compareAssets(leftAssetId: string, rightAssetId: string): SceneComparisonPair | null;
  disposeScene(assetId: string): void;
}

function mediaPriority(kind: SceneMediaKind): number {
  if (kind === 'actual-360-capture') return 5;
  if (kind === 'equirectangular-panorama' || kind === 'cubemap-panorama') return 4;
  if (kind === 'gltf-scene') return 3;
  if (kind === 'flat-render') return 2;
  return 1;
}

function truthPriority(asset: ExperienceSceneAsset): number {
  const truth = { 'actual-verified': 5, 'actual-reported': 4, 'design-approved': 3, 'design-candidate': 2, 'illustrative-only': 1 }[asset.truthClass];
  const availability = ['loadable', 'locally-available'].includes(asset.availabilityStatus) ? 2 : asset.availabilityStatus === 'manifest-only' ? 1 : 0;
  return truth * 100 + availability * 10 + mediaPriority(asset.mediaKind);
}

function matchesContext(asset: ExperienceSceneAsset, context: SceneGatewayContext): boolean {
  if (asset.projectId !== context.projectId || asset.eventId !== context.eventId || asset.venueId !== context.venueId) return false;
  const optionalMatch = (selected: string | null, values: readonly string[]) => !selected || values.length === 0 || values.includes(selected);
  return optionalMatch(context.scenarioId, asset.scenarioIds)
    && optionalMatch(context.eventDayId, asset.eventDayIds)
    && optionalMatch(context.personaId, asset.personaIds)
    && optionalMatch(context.journeyId, asset.journeyIds)
    && optionalMatch(context.journeyStepId, asset.journeyStepIds)
    && optionalMatch(context.touchpointId, asset.touchpointIds);
}

function defaultAdapterSet(): ExperienceSceneAdapter[] {
  return [new FlatRenderSceneAdapter(), new PanoramaSceneAdapter(), new Web3DSceneAdapter(), new MissingSceneAdapter()];
}

export class LocalExperienceSceneGateway implements ExperienceSceneGateway {
  private readonly adapters: ExperienceSceneAdapter[];
  private readonly controllers = new Map<string, AbortController>();
  private readonly loadStates = new Map<string, SceneLoadState>();

  constructor(
    private readonly registry: SceneAssetRegistry,
    private readonly validationContext: SceneValidationContext,
    adapters: ExperienceSceneAdapter[] = defaultAdapterSet()
  ) {
    this.adapters = adapters;
  }

  listAssets(context: SceneGatewayContext): ExperienceSceneAsset[] {
    return this.registry.assets.filter((asset) => matchesContext(asset, context)).map((asset) => structuredClone(asset));
  }

  getAsset(assetId: string): ExperienceSceneAsset | null {
    const asset = this.registry.assets.find((candidate) => candidate.assetId === assetId);
    return asset ? structuredClone(asset) : null;
  }

  resolveScene(context: SceneGatewayContext): ExperienceSceneAsset | null {
    const preferred = context.preferredMediaKinds?.length ? new Set(context.preferredMediaKinds) : null;
    const assets = this.listAssets(context)
      .filter((asset) => !preferred || preferred.has(asset.mediaKind))
      .filter((asset) => !['invalid', 'quarantined', 'superseded'].includes(asset.availabilityStatus))
      .sort((left, right) => truthPriority(right) - truthPriority(left) || left.assetId.localeCompare(right.assetId));
    return assets[0] ?? null;
  }

  resolveFallback(assetId: string): ExperienceSceneAsset | null {
    const asset = this.registry.assets.find((candidate) => candidate.assetId === assetId);
    if (!asset?.fallbackAssetId) return null;
    const fallback = this.registry.assets.find((candidate) => candidate.assetId === asset.fallbackAssetId);
    if (!fallback || fallback.projectId !== asset.projectId || fallback.eventId !== asset.eventId) return null;
    return structuredClone(fallback);
  }

  validateAssetManifest(manifest: ExperienceSceneAsset): SceneValidationResult {
    return validateExperienceSceneAsset(manifest, this.validationContext);
  }

  async loadAssetVariant(assetId: string, quality: SceneAssetVariant['quality'], onProgress?: (progress: number) => void): Promise<SceneLoadState> {
    this.disposeScene(assetId);
    const asset = this.registry.assets.find((candidate) => candidate.assetId === assetId);
    if (!asset) return missingState(assetId, 'missing', 'أصل المشهد غير مسجل في هذا المشروع.');
    const validation = this.validateAssetManifest(asset);
    if (!validation.valid || !validation.renderable) return failedState(assetId, 'missing', validation.issues.find((entry) => entry.severity === 'blocking')?.messageAr ?? 'أصل المشهد محجوب.');
    const variants = [...asset.variants].filter((variant) => Boolean(variant.uri));
    const variant = variants.find((candidate) => candidate.quality === quality)
      ?? variants.find((candidate) => candidate.quality === 'preview')
      ?? variants.find((candidate) => candidate.quality === 'standard')
      ?? variants[0];
    if (!variant) return missingState(assetId, 'missing', 'لا تتوفر نسخة قابلة للتحميل من أصل المشهد.');
    const adapter = this.adapters.find((candidate) => candidate.supportedMedia.includes(asset.mediaKind)) ?? this.adapters.find((candidate) => candidate.adapterId === 'missing')!;
    const controller = new AbortController();
    this.controllers.set(assetId, controller);
    this.loadStates.set(assetId, { assetId, variantId: variant.variantId, status: 'loading', progress: 0, adapterId: adapter.adapterId, uri: null, messageAr: 'جارٍ التحقق من أصل المشهد وتحميله.', retryable: false });
    const result = await adapter.load({ asset, variant, signal: controller.signal, onProgress: (progress) => {
      const state: SceneLoadState = { assetId, variantId: variant.variantId, status: 'loading', progress, adapterId: adapter.adapterId, uri: null, messageAr: `جارٍ التحقق من أصل المشهد · ${progress}%`, retryable: false };
      this.loadStates.set(assetId, state);
      onProgress?.(progress);
    } });
    if (this.controllers.get(assetId) === controller) {
      this.controllers.delete(assetId);
      this.loadStates.set(assetId, result);
    }
    return result;
  }

  listHotspots(assetId: string): SceneHotspot[] {
    return this.registry.assets.find((asset) => asset.assetId === assetId)?.hotspots.map((hotspot) => structuredClone(hotspot)) ?? [];
  }

  resolveTransition(sourceAssetId: string, hotspotId: string): SceneTransition | null {
    const source = this.registry.assets.find((asset) => asset.assetId === sourceAssetId);
    const hotspot = source?.hotspots.find((candidate) => candidate.hotspotId === hotspotId);
    if (!source || !hotspot || hotspot.status === 'blocked' || hotspot.status === 'missing-target') return null;
    const transition = source.transitions.find((candidate) => candidate.hotspotId === hotspotId);
    if (!transition || transition.sourceAssetId !== sourceAssetId || transition.routeAuthority !== 'none') return null;
    if (transition.targetAssetId) {
      const target = this.registry.assets.find((asset) => asset.assetId === transition.targetAssetId);
      if (!target || target.projectId !== source.projectId || target.eventId !== source.eventId) return null;
    }
    return structuredClone(transition);
  }

  compareAssets(leftAssetId: string, rightAssetId: string): SceneComparisonPair | null {
    const configured = this.registry.comparisonPairs.find((pair) => pair.leftAssetId === leftAssetId && pair.rightAssetId === rightAssetId)
      ?? this.registry.comparisonPairs.find((pair) => pair.leftAssetId === rightAssetId && pair.rightAssetId === leftAssetId);
    if (configured) return validateSceneComparisonPair(configured, this.registry).valid ? structuredClone(configured) : null;
    const left = this.registry.assets.find((asset) => asset.assetId === leftAssetId);
    const right = this.registry.assets.find((asset) => asset.assetId === rightAssetId);
    if (!left || !right || left.projectId !== right.projectId || left.eventId !== right.eventId) return null;
    const poseCompatibility = left.cameraPose && right.cameraPose && left.cameraPose.status !== 'unknown' && right.cameraPose.status !== 'unknown' && left.cameraPose.poseId === right.cameraPose.poseId ? 'compatible' : 'unknown';
    const pair: SceneComparisonPair = {
      comparisonPairId: `COMPARE-${left.assetId}-${right.assetId}`,
      projectId: left.projectId,
      eventId: left.eventId,
      leftAssetId: left.assetId,
      rightAssetId: right.assetId,
      mode: left.revision !== right.revision ? 'revision-vs-revision' : right.truthClass === 'actual-verified' ? 'design-vs-actual-verified' : right.truthClass === 'actual-reported' ? 'design-vs-actual-reported' : 'design-candidate-vs-approved',
      presentation: poseCompatibility === 'compatible' ? 'slider' : 'side-by-side',
      cameraPoseCompatibility: poseCompatibility,
      pixelComparisonAllowed: poseCompatibility === 'compatible',
      evidenceStatus: right.truthClass === 'actual-verified' ? 'verified' : right.truthClass === 'actual-reported' ? 'reported' : 'none',
      warningsAr: poseCompatibility === 'compatible' ? [] : ['وضع الكاميرا غير مثبت التوافق؛ لا توجد مطالبة بمقارنة بكسلية.']
    };
    return pair;
  }

  disposeScene(assetId: string): void {
    this.controllers.get(assetId)?.abort();
    this.controllers.delete(assetId);
    const asset = this.registry.assets.find((candidate) => candidate.assetId === assetId);
    const adapter = asset ? this.adapters.find((candidate) => candidate.supportedMedia.includes(asset.mediaKind)) : null;
    adapter?.dispose(assetId);
    if (this.loadStates.has(assetId)) this.loadStates.set(assetId, { assetId, variantId: null, status: 'disposed', progress: null, adapterId: adapter?.adapterId ?? 'missing', uri: null, messageAr: 'تم تحرير موارد المشهد.', retryable: false });
  }
}

export function createExperienceSceneGateway(registry: SceneAssetRegistry, validationContext: SceneValidationContext): ExperienceSceneGateway {
  return new LocalExperienceSceneGateway(registry, validationContext);
}

// EX.1A compatibility boundary. It validates the prior manifest while the new registry is adopted.
export interface SceneAssetValidationIssue {
  code: string;
  severity: 'blocking' | 'warning';
  messageAr: string;
}

export interface SceneAssetValidationResult {
  valid: boolean;
  renderable: boolean;
  adapterId: 'illustrated-map' | 'render-reference' | 'panorama' | 'web3d' | 'video' | 'missing';
  issues: SceneAssetValidationIssue[];
}

function legacyAdapterForMedium(medium: SceneAssetMedium): SceneAssetValidationResult['adapterId'] {
  if (medium === 'illustrated-map') return 'illustrated-map';
  if (medium === 'render-reference' || medium === 'image') return 'render-reference';
  if (medium === 'panorama-equirectangular' || medium === 'panorama-cubemap') return 'panorama';
  if (medium === 'gltf-model' || medium === 'glb-model') return 'web3d';
  if (medium === 'video') return 'video';
  return 'missing';
}

function legacyPreviewIsSafe(uri: string | null): boolean {
  if (uri === null) return true;
  return (uri.startsWith('/local-assets/experience/') || uri.startsWith('/local-assets/experience-scenes/')) && !uri.includes('..') && !/^https?:/i.test(uri) && !uri.includes('/Users/');
}

export function validateSceneAssetManifest(asset: LegacySceneAssetManifest): SceneAssetValidationResult {
  const issues: SceneAssetValidationIssue[] = [];
  const adapterId = legacyAdapterForMedium(asset.medium);
  const missing = asset.medium === 'missing-source';
  if (!legacyPreviewIsSafe(asset.localPreviewUri)) issues.push({ code: 'scene-preview-uri-unsafe', severity: 'blocking', messageAr: 'مسار المعاينة يجب أن يكون محليًا ومقيدًا بأصول تجربة الفعالية.' });
  if (!missing && (!asset.sourceId || !asset.sourceHash)) issues.push({ code: 'scene-source-identity-missing', severity: 'blocking', messageAr: 'هوية المصدر وبصمته مطلوبتان لأي أصل مشهد متاح.' });
  if (!missing && !asset.sourceRevision) issues.push({ code: 'scene-source-revision-missing', severity: 'blocking', messageAr: 'مراجعة المصدر مطلوبة قبل إتاحة أصل المشهد.' });
  if (!missing && (asset.rightsStatus === 'missing' || asset.rightsStatus === 'unknown')) issues.push({ code: 'scene-rights-unresolved', severity: 'blocking', messageAr: 'حقوق عرض أصل المشهد غير محسومة، لذلك يظل محجوبًا.' });
  if (!missing && asset.scenarioIds.length === 0) issues.push({ code: 'scene-scenario-binding-missing', severity: 'blocking', messageAr: 'يجب ربط أصل المشهد بسيناريو معروف داخل الحزمة.' });
  const requiresOperationalBinding = ['panorama-equirectangular', 'panorama-cubemap', 'gltf-model', 'glb-model'].includes(asset.medium);
  if (requiresOperationalBinding && asset.eventDayIds.length === 0 && asset.journeyStepIds.length === 0 && asset.relatedZoneIds.length === 0 && asset.relatedEntityIds.length === 0) issues.push({ code: 'scene-operational-binding-missing', severity: 'blocking', messageAr: 'يجب ربط أصل المشهد بيوم أو خطوة أو كيان قائم دون إنشاء حقيقة مكانية جديدة.' });
  if (asset.approvalStatus === 'approved' && asset.truthClass !== 'design-approved' && asset.truthClass !== 'actual-verified') issues.push({ code: 'scene-approval-truth-mismatch', severity: 'blocking', messageAr: 'لا يمكن عرض اعتماد الأصل مع تصنيف حقيقة لا يدعم هذا الاعتماد.' });
  if (missing && (asset.localPreviewUri || asset.hotspots.length > 0)) issues.push({ code: 'missing-scene-has-content', severity: 'blocking', messageAr: 'الأصل المفقود لا يجوز أن يحتوي معاينة أو نقاط تفاعل.' });
  if (missing && asset.unavailableMedium === null) issues.push({ code: 'missing-scene-target-unknown', severity: 'blocking', messageAr: 'يجب تحديد نوع أصل المشهد المفقود حتى يظهر البديل الآمن في الوضع الصحيح.' });
  if (!missing && asset.unavailableMedium !== null) issues.push({ code: 'available-scene-target-conflict', severity: 'blocking', messageAr: 'الأصل المتاح لا يجوز أن يحمل تصنيف أصل مفقود.' });
  if (asset.medium === 'panorama-equirectangular') {
    if (!asset.dimensions || asset.dimensions.unit !== 'pixel') issues.push({ code: 'panorama-dimensions-missing', severity: 'blocking', messageAr: 'أبعاد البانوراما بالبكسل مطلوبة للتحقق من الإسقاط.' });
    else {
      const ratio = asset.dimensions.width / asset.dimensions.height;
      if (Math.abs(ratio - 2) > 0.02) issues.push({ code: 'panorama-ratio-invalid', severity: 'blocking', messageAr: 'البانوراما الكروية يجب أن تكون بنسبة أبعاد 2:1.' });
      if (asset.dimensions.width < 4096 || asset.dimensions.height < 2048) issues.push({ code: 'panorama-resolution-low', severity: 'warning', messageAr: 'دقة البانوراما أقل من 4096x2048 وقد لا تكفي للمراجعة التنفيذية.' });
    }
    if (asset.orientation?.projection !== 'equirectangular') issues.push({ code: 'panorama-projection-invalid', severity: 'blocking', messageAr: 'نوع الإسقاط لا يطابق أصل البانوراما الكروية.' });
  }
  if (asset.medium === 'panorama-cubemap') {
    const faces = asset.cubemapFaces ?? [];
    const faceNames = new Set(faces.map((face) => face.face));
    const dimensions = new Set(faces.map((face) => `${face.width}x${face.height}`));
    if (faces.length !== 6 || faceNames.size !== 6 || dimensions.size !== 1 || faces.some((face) => face.width !== face.height)) issues.push({ code: 'cubemap-faces-invalid', severity: 'blocking', messageAr: 'يجب توفير ستة أوجه مربعة ومتطابقة لخريطة المكعب.' });
  }
  if ((asset.medium === 'gltf-model' || asset.medium === 'glb-model') && asset.units?.value === 'unknown') issues.push({ code: 'web3d-units-unknown', severity: 'warning', messageAr: 'وحدات نموذج Web3D غير معروفة؛ العرض مرجعي فقط ولا يثبت مقياسًا هندسيًا.' });
  if ((asset.medium === 'gltf-model' || asset.medium === 'glb-model') && !asset.units) issues.push({ code: 'web3d-units-status-missing', severity: 'blocking', messageAr: 'حالة وحدات نموذج Web3D مطلوبة حتى عندما تكون الوحدات غير معروفة.' });
  const valid = !issues.some((entry) => entry.severity === 'blocking');
  return { valid, renderable: valid && !missing && Boolean(asset.localPreviewUri), adapterId, issues };
}

export function sceneMediumForMapMode(mode: ExperienceMapMode): SceneAssetMedium[] {
  if (mode === 'story') return ['illustrated-map', 'render-reference', 'image', 'missing-source'];
  if (mode === 'illustrated') return ['illustrated-map', 'render-reference', 'image'];
  if (mode === 'panorama') return ['panorama-equirectangular', 'panorama-cubemap'];
  if (mode === 'web3d') return ['gltf-model', 'glb-model'];
  return ['illustrated-map', 'render-reference', 'image', 'missing-source'];
}

export function selectSceneAssetForMode(assets: LegacySceneAssetManifest[], mode: ExperienceMapMode, stepId: string | null): LegacySceneAssetManifest | null {
  const media = sceneMediumForMapMode(mode);
  const compatible = assets.filter((asset) => media.includes(asset.medium));
  return compatible.find((asset) => stepId && asset.journeyStepIds.includes(stepId))
    ?? compatible.find((asset) => asset.journeyStepIds.length === 0)
    ?? compatible[0]
    ?? assets.find((asset) => asset.medium === 'missing-source' && asset.unavailableMedium !== null && media.includes(asset.unavailableMedium) && (!stepId || asset.journeyStepIds.includes(stepId)))
    ?? null;
}

// The old default is kept for EX.1A callers; EX.1C callers construct a scoped gateway.
export const experienceSceneAdapters = Object.freeze([
  { adapterId: 'illustrated-map', labelAr: 'خريطة توضيحية', supportedMedia: ['illustrated-map', 'image'], futureOnly: false },
  { adapterId: 'render-reference', labelAr: 'مرجع تصميم', supportedMedia: ['render-reference', 'image'], futureOnly: false },
  { adapterId: 'panorama', labelAr: 'مشهد 360', supportedMedia: ['panorama-equirectangular', 'panorama-cubemap'], futureOnly: false },
  { adapterId: 'web3d', labelAr: 'مشهد Web3D', supportedMedia: ['gltf-model', 'glb-model'], futureOnly: false },
  { adapterId: 'video', labelAr: 'مرجع فيديو', supportedMedia: ['video'], futureOnly: false },
  { adapterId: 'missing', labelAr: 'المصدر غير متاح', supportedMedia: ['missing-source'], futureOnly: false }
] as const);

export const IllustratedMapAdapter = experienceSceneAdapters[0];
export const RenderReferenceAdapter = experienceSceneAdapters[1];
export const PanoramaAdapter = experienceSceneAdapters[2];
export const Web3DAdapter = experienceSceneAdapters[3];
export const VideoSceneAdapter = experienceSceneAdapters[4];
export const SafeMissingAssetAdapter = experienceSceneAdapters[5];

export const experienceSceneGateway = {
  adapters: experienceSceneAdapters,
  futureAdapters: futureExperienceSceneAdapters,
  validate: validateSceneAssetManifest,
  select: selectSceneAssetForMode
};
