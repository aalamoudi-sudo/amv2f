import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState, type ElementRef } from 'react';
import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  DoubleSide,
  SRGBColorSpace,
  Vector3,
  type Material,
  type Mesh,
  type Object3D,
  type PerspectiveCamera as ThreePerspectiveCamera
} from 'three';
import type { DesignCameraTour, DesignSceneLens, DesignSceneQualityProfile, DesignSceneViewpoint } from '../../types/designExperience';
import { mayAutoplayDesignCameraTour, normalizeDesignCameraTourSpeed, stepDesignCameraTour } from '../../services/designCameraTour';

interface VerifiedBounds {
  min: [number, number, number];
  max: [number, number, number];
}

interface Web3DSceneSurfaceProps {
  uri: string;
  onReady: () => void;
  onFailure?: (messageAr: string) => void;
  bounds?: VerifiedBounds;
  viewpoints?: DesignSceneViewpoint[];
  selectedViewpointId?: string | null;
  onViewpointChange?: (viewpointId: string, historyMode?: 'push' | 'replace') => void;
  lens?: DesignSceneLens;
  qualityProfile?: DesignSceneQualityProfile;
  onQualityProfileChange?: (profile: DesignSceneQualityProfile) => void;
  cameraTour?: DesignCameraTour | null;
  tourPlaying?: boolean;
  onTourPlayingChange?: (playing: boolean) => void;
  onRequestFullscreen?: () => void;
  presentationMode?: boolean;
}

const fallbackViewpoints: DesignSceneViewpoint[] = [
  { viewpointId: 'WEB3D-FALLBACK-ISOMETRIC', sceneId: 'unregistered', labelAr: 'منظور', labelEn: 'Isometric', kind: 'isometric', frame: 'verified-bounds-relative', positionFactor: [1, 0.65, 1], targetFactor: [0, 0, 0], fieldOfViewDegrees: 42, synthetic: true, truthLabelAr: 'كاميرا معاينة تصميمية مولدة' },
  { viewpointId: 'WEB3D-FALLBACK-FRONT', sceneId: 'unregistered', labelAr: 'واجهة', labelEn: 'Front', kind: 'front', frame: 'verified-bounds-relative', positionFactor: [0, 0.35, 1.3], targetFactor: [0, 0, 0], fieldOfViewDegrees: 42, synthetic: true, truthLabelAr: 'كاميرا معاينة تصميمية مولدة' },
  { viewpointId: 'WEB3D-FALLBACK-TOP', sceneId: 'unregistered', labelAr: 'علوي', labelEn: 'Top', kind: 'top', frame: 'verified-bounds-relative', positionFactor: [0.01, 1.5, 0.01], targetFactor: [0, 0, 0], fieldOfViewDegrees: 42, synthetic: true, truthLabelAr: 'كاميرا معاينة تصميمية مولدة' }
];

function isDisposable(value: unknown): value is { dispose: () => void } {
  return Boolean(value && typeof value === 'object' && 'dispose' in value && typeof (value as { dispose?: unknown }).dispose === 'function');
}

function disposeObject(root: Object3D): void {
  root.traverse((object) => {
    const mesh = object as Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    materials.forEach((material: Material) => {
      Object.values(material as unknown as Record<string, unknown>).forEach((value) => {
        if (isDisposable(value)) value.dispose();
      });
      material.dispose();
    });
  });
}

function cloneModel(root: Object3D): Object3D {
  const clone = root.clone(true);
  clone.traverse((object) => {
    const mesh = object as Mesh;
    if (mesh.geometry) {
      mesh.geometry = mesh.geometry.clone();
      if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals();
    }
    if (!mesh.material) return;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map((material) => material.clone()) : mesh.material.clone();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      material.userData.designOriginalOpacity = material.opacity;
      material.userData.designOriginalTransparent = material.transparent || material.opacity < 0.999;
      material.side = DoubleSide;
      material.transparent = Boolean(material.userData.designOriginalTransparent);
      material.depthWrite = !material.transparent;
      material.needsUpdate = true;
    });
  });
  return clone;
}

function FramedPerspectiveCamera({
  placement,
  fieldOfViewDegrees,
  cameraKey
}: {
  placement: ReturnType<typeof cameraPlacement>;
  fieldOfViewDegrees: number;
  cameraKey: string;
}) {
  const cameraRef = useRef<ThreePerspectiveCamera>(null);
  const { invalidate } = useThree();
  useLayoutEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.position.copy(placement.position);
    camera.fov = fieldOfViewDegrees;
    camera.near = Math.max(0.01, placement.radius / 1_000);
    camera.far = Math.max(100, placement.radius * 50);
    camera.lookAt(placement.target);
    camera.updateProjectionMatrix();
    invalidate();
  }, [cameraKey, fieldOfViewDegrees, invalidate, placement]);
  return <PerspectiveCamera ref={cameraRef} makeDefault />;
}

function Model({ uri, lens, onReady, onBounds }: { uri: string; lens: DesignSceneLens; onReady: () => void; onBounds: (bounds: VerifiedBounds) => void }) {
  const gltf = useGLTF(uri);
  const scene = useMemo(() => cloneModel(gltf.scene), [gltf.scene]);
  const reportLoaded = useEffectEvent((measured: Box3) => {
    if (!measured.isEmpty()) onBounds({ min: measured.min.toArray(), max: measured.max.toArray() });
    onReady();
  });
  useEffect(() => {
    const measured = new Box3().setFromObject(scene);
    reportLoaded(measured);
    return () => {
      disposeObject(scene);
      useGLTF.clear(uri);
    };
  }, [scene, uri]);
  useEffect(() => {
    scene.traverse((object) => {
      const mesh = object as Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      materials.forEach((material) => {
        if ('wireframe' in material) (material as Material & { wireframe: boolean }).wireframe = lens === 'structure';
        const sourceOpacity = typeof material.userData.designOriginalOpacity === 'number' ? material.userData.designOriginalOpacity : 1;
        const sourceTransparent = Boolean(material.userData.designOriginalTransparent) || sourceOpacity < 0.999;
        material.transparent = lens === 'truth' || sourceTransparent;
        material.opacity = lens === 'truth' ? Math.min(sourceOpacity, 0.72) : sourceOpacity;
        material.depthWrite = !material.transparent;
        material.needsUpdate = true;
      });
    });
  }, [lens, scene]);
  return <primitive object={scene} />;
}

function cameraPlacement(bounds: VerifiedBounds, viewpoint: DesignSceneViewpoint, zoomFactor: number, pan: [number, number], presentationMode: boolean): { position: Vector3; target: Vector3; radius: number } {
  const min = new Vector3(...bounds.min);
  const max = new Vector3(...bounds.max);
  const center = min.clone().add(max).multiplyScalar(0.5);
  const dimensions = max.clone().sub(min);
  const radius = Math.max(dimensions.length() / 2, 1);
  const target = center.clone().add(new Vector3(
    viewpoint.targetFactor[0] * dimensions.x,
    viewpoint.targetFactor[1] * dimensions.y,
    viewpoint.targetFactor[2] * dimensions.z
  ));
  target.x += pan[0] * radius;
  target.z += pan[1] * radius;
  const direction = new Vector3(...viewpoint.positionFactor);
  const magnitude = Math.max(direction.length(), 0.1);
  direction.normalize();
  const fitDistance = (radius / Math.tan((viewpoint.fieldOfViewDegrees * Math.PI) / 360)) * (presentationMode ? 0.62 : 0.88);
  const framing = Math.min(1.05, Math.max(0.62, magnitude / 1.55));
  return { position: target.clone().add(direction.multiplyScalar(fitDistance * framing * zoomFactor)), target, radius };
}

function ContextGuard({ onFailure }: { onFailure?: (messageAr: string) => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onFailure?.('فُقد سياق WebGL. أُوقف المشهد دون تغيير أي حقيقة.');
    };
    const restored = () => onFailure?.('استعيد سياق WebGL؛ أعد تحميل المشهد للتحقق من موارده.');
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    return () => {
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
    };
  }, [gl, onFailure]);
  return null;
}

const lensLabels: Record<DesignSceneLens, string> = {
  experience: 'التجربة',
  structure: 'البنية',
  truth: 'الحقيقة',
  command: 'القيادة'
};

const qualityLabels: Record<DesignSceneQualityProfile, string> = {
  balanced: 'متوازن',
  high: 'جودة عالية',
  'low-power': 'طاقة منخفضة'
};

export function Web3DSceneSurface({
  uri,
  onReady,
  onFailure,
  bounds: registeredBounds,
  viewpoints: configuredViewpoints,
  selectedViewpointId,
  onViewpointChange,
  lens = 'experience',
  qualityProfile = 'balanced',
  onQualityProfileChange,
  cameraTour = null,
  tourPlaying = false,
  onTourPlayingChange,
  onRequestFullscreen,
  presentationMode = false
}: Web3DSceneSurfaceProps) {
  const viewpoints = configuredViewpoints?.length ? configuredViewpoints : fallbackViewpoints;
  const selectedViewpoint = viewpoints.find((item) => item.viewpointId === selectedViewpointId) ?? viewpoints[0]!;
  const [measuredBounds, setMeasuredBounds] = useState<VerifiedBounds | null>(null);
  const bounds = registeredBounds ?? measuredBounds ?? { min: [-1, 0, -1], max: [1, 2, 1] };
  const [zoomFactor, setZoomFactor] = useState(1);
  const [pan, setPan] = useState<[number, number]>([0, 0]);
  const [resetNonce, setResetNonce] = useState(0);
  const [tourSpeed, setTourSpeed] = useState(1);
  const [modelStatus, setModelStatus] = useState({ uri, ready: false });
  const [visible, setVisible] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(() => document.visibilityState !== 'hidden');
  const surfaceRef = useRef<HTMLElement>(null);
  const controlsRef = useRef<ElementRef<typeof OrbitControls>>(null);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const active = visible && documentVisible;
  const dpr: number | [number, number] = qualityProfile === 'high' ? [1, 2] : qualityProfile === 'low-power' ? 1 : [1, 1.5];

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { threshold: 0.05 });
    if (surfaceRef.current) observer.observe(surfaceRef.current);
    const onVisibility = () => setDocumentVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!tourPlaying || !cameraTour || !mayAutoplayDesignCameraTour(reducedMotion, active)) return;
    const currentIndex = cameraTour.viewpointIds.indexOf(selectedViewpoint.viewpointId);
    const nextIndex = currentIndex < 0 ? 0 : currentIndex + 1;
    if (nextIndex >= cameraTour.viewpointIds.length) {
      onTourPlayingChange?.(false);
      return;
    }
    const timer = window.setTimeout(() => onViewpointChange?.(cameraTour.viewpointIds[nextIndex]!, 'replace'), cameraTour.intervalMs / tourSpeed);
    return () => window.clearTimeout(timer);
  }, [active, cameraTour, onTourPlayingChange, onViewpointChange, reducedMotion, selectedViewpoint.viewpointId, tourPlaying, tourSpeed]);

  const chooseViewpoint = (viewpointId: string, historyMode: 'push' | 'replace' = 'push') => {
    setZoomFactor(1);
    setPan([0, 0]);
    setResetNonce((value) => value + 1);
    onViewpointChange?.(viewpointId, historyMode);
  };

  const resetView = () => chooseViewpoint(viewpoints.find((item) => item.kind === 'overview' || item.kind === 'isometric')?.viewpointId ?? viewpoints[0]!.viewpointId);
  const stepTour = (direction: -1 | 1) => {
    if (!cameraTour?.viewpointIds.length) return;
    const nextViewpointId = stepDesignCameraTour(cameraTour, selectedViewpoint.viewpointId, direction);
    if (!nextViewpointId) return;
    onTourPlayingChange?.(false);
    chooseViewpoint(nextViewpointId);
  };
  const restartTour = () => {
    if (!cameraTour?.viewpointIds.length) return;
    chooseViewpoint(cameraTour.viewpointIds[0]!);
    onTourPlayingChange?.(!reducedMotion);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === '+' || event.key === '=') { event.preventDefault(); setZoomFactor((value) => Math.max(0.45, value * 0.82)); }
    else if (event.key === '-') { event.preventDefault(); setZoomFactor((value) => Math.min(2.4, value * 1.2)); }
    else if (event.key === '0') { event.preventDefault(); resetView(); }
    else if (event.key.toLowerCase() === 'f') { event.preventDefault(); resetView(); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); setPan(([x, y]) => [Math.max(-0.45, x - 0.04), y]); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); setPan(([x, y]) => [Math.min(0.45, x + 0.04), y]); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setPan(([x, y]) => [x, Math.max(-0.45, y - 0.04)]); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); setPan(([x, y]) => [x, Math.min(0.45, y + 0.04)]); }
    else return;
    onTourPlayingChange?.(false);
  };

  const placement = cameraPlacement(bounds, selectedViewpoint, zoomFactor, pan, presentationMode);
  const cameraStateKey = `${selectedViewpoint.viewpointId}:${resetNonce}:${zoomFactor}:${pan[0]}:${pan[1]}`;
  return (
    <section ref={surfaceRef} className={`scene-web3d lens-${lens} quality-${qualityProfile} ${presentationMode ? 'is-client-presentation' : ''}`} data-testid="scene-web3d-surface" data-design-lens={lens} data-quality-profile={qualityProfile} data-viewpoint-id={selectedViewpoint.viewpointId} data-tour-playing={tourPlaying ? 'true' : 'false'} data-model-ready={modelStatus.uri === uri && modelStatus.ready ? 'true' : 'false'} data-zoom-factor={zoomFactor.toFixed(3)} data-pan-x={pan[0].toFixed(3)} data-pan-y={pan[1].toFixed(3)} aria-label="معاينة التصميم ثلاثية الأبعاد">
      {!presentationMode ? <div className="scene-web3d-toolbar" aria-label="أدوات فحص النموذج">
        <button data-testid="design-scene-zoom-in" type="button" onClick={() => setZoomFactor((value) => Math.max(0.45, value * 0.82))} title="تكبير" aria-label="تكبير المشهد">+</button>
        <button data-testid="design-scene-zoom-out" type="button" onClick={() => setZoomFactor((value) => Math.min(2.4, value * 1.2))} title="تصغير" aria-label="تصغير المشهد">−</button>
        <button data-testid="design-scene-fit" type="button" onClick={resetView}>ملاءمة الكل</button>
        {viewpoints.filter((item) => ['front', 'isometric', 'top', 'midpoint', 'presentation'].includes(item.kind)).map((viewpoint) => <button key={viewpoint.viewpointId} data-testid={`design-viewpoint-${viewpoint.kind}`} type="button" aria-pressed={selectedViewpoint.viewpointId === viewpoint.viewpointId} onClick={() => chooseViewpoint(viewpoint.viewpointId)}>{viewpoint.labelAr}</button>)}
        {onRequestFullscreen ? <button type="button" onClick={onRequestFullscreen}>ملء الشاشة</button> : null}
      </div> : null}
      {!presentationMode ? <div className="scene-web3d-lenses" aria-label="عدسات قراءة التصميم">{(Object.keys(lensLabels) as DesignSceneLens[]).map((item) => <span key={item} className={item === lens ? 'is-active' : ''}>{lensLabels[item]}</span>)}</div> : null}
      <div className="scene-web3d-canvas" data-testid="design-scene-canvas" tabIndex={0} role="application" aria-label="اسحب لتدوير النموذج، واستخدم العجلة أو علامتي الجمع والطرح للتقريب" onKeyDown={onKeyDown}>
        <Canvas
          dpr={dpr}
          frameloop={active ? 'demand' : 'never'}
          gl={{ antialias: qualityProfile !== 'low-power', powerPreference: qualityProfile === 'low-power' ? 'low-power' : 'high-performance' }}
          onCreated={({ gl }) => {
            gl.outputColorSpace = SRGBColorSpace;
            gl.toneMapping = ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
            gl.setClearColor(new Color('#0b211a'));
          }}
        >
          <color attach="background" args={['#0b211a']} />
          <FramedPerspectiveCamera
            placement={placement}
            fieldOfViewDegrees={selectedViewpoint.fieldOfViewDegrees}
            cameraKey={cameraStateKey}
          />
          <hemisphereLight args={['#e9f3ec', '#18372c', 1.7]} />
          <directionalLight position={[35, 55, 28]} intensity={2.5} />
          <directionalLight position={[-25, 18, -35]} intensity={0.8} color="#d7a95d" />
          <gridHelper visible={!presentationMode} args={[Math.max(placement.radius * 2.2, 10), 12, '#365d4d', '#17382e']} position={[placement.target.x, bounds.min[1] - 0.08, placement.target.z]} />
          <Suspense fallback={null}><Model uri={uri} lens={lens} onReady={() => { setModelStatus({ uri, ready: true }); onReady(); }} onBounds={setMeasuredBounds} /></Suspense>
          <OrbitControls key={cameraStateKey} ref={controlsRef} makeDefault enableDamping dampingFactor={0.08} target={placement.target.toArray()} minDistance={Math.max(1, placement.radius * 0.3)} maxDistance={placement.radius * 8} maxPolarAngle={Math.PI / 2.005} screenSpacePanning onStart={() => onTourPlayingChange?.(false)} />
          <ContextGuard onFailure={onFailure} />
        </Canvas>
      </div>
      {!presentationMode ? <div className="scene-web3d-tour" aria-label="جولة كاميرا التصميم">
        <button data-testid="design-tour-toggle" type="button" disabled={!cameraTour || reducedMotion} aria-pressed={tourPlaying} onClick={() => { if (!tourPlaying && cameraTour?.viewpointIds.at(-1) === selectedViewpoint.viewpointId) restartTour(); else onTourPlayingChange?.(!tourPlaying); }}>{tourPlaying ? 'إيقاف الجولة' : 'تشغيل الجولة'}</button>
        <button type="button" disabled={!cameraTour} onClick={() => stepTour(-1)}>السابق</button>
        <button type="button" disabled={!cameraTour} onClick={() => stepTour(1)}>التالي</button>
        <button type="button" disabled={!cameraTour} onClick={restartTour}>إعادة</button>
        {cameraTour?.viewpointIds.map((viewpointId, index) => {
          const viewpoint = viewpoints.find((item) => item.viewpointId === viewpointId);
          return viewpoint ? <button key={viewpointId} data-testid={`design-tour-stop-${index + 1}`} type="button" aria-current={selectedViewpoint.viewpointId === viewpointId ? 'step' : undefined} onClick={() => { onTourPlayingChange?.(false); chooseViewpoint(viewpointId); }}><i>{index + 1}</i>{viewpoint.labelAr}</button> : null;
        })}
        <label><span>سرعة الجولة</span><select aria-label="سرعة جولة التصميم" value={tourSpeed} onChange={(event) => setTourSpeed(normalizeDesignCameraTourSpeed(Number(event.target.value)))}><option value={0.75}>هادئة</option><option value={1}>عادية</option><option value={1.5}>سريعة</option></select></label>
      </div> : null}
      {!presentationMode ? <div className="scene-web3d-status">
        <span>كاميرا معاينة تصميمية مولدة</span>
        <label><span>جودة العرض</span><select value={qualityProfile} onChange={(event) => onQualityProfileChange?.(event.target.value as DesignSceneQualityProfile)}>{(Object.keys(qualityLabels) as DesignSceneQualityProfile[]).map((profile) => <option key={profile} value={profile}>{qualityLabels[profile]}</option>)}</select></label>
        <strong>{active ? 'العرض نشط عند الطلب' : 'العرض متوقف خارج الشاشة'}</strong>
      </div> : null}
      {!presentationMode ? <p>مشتق تصميمي تشخيصي فقط · ليس تجولًا ميدانيًا أو نموذجًا هندسيًا مسجلًا أو مشهد 360°.</p> : null}
    </section>
  );
}

export default Web3DSceneSurface;
