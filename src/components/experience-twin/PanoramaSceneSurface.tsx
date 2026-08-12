import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useState } from 'react';
import { BackSide } from 'three';
import { PerspectiveCamera, useTexture } from '@react-three/drei';

function PanoramaTexture({ uri, onReady }: { uri: string; onReady: () => void }) {
  const texture = useTexture(uri);
  useEffect(() => {
    onReady();
    return () => { useTexture.clear(uri); };
  }, [onReady, texture, uri]);
  return (
    <mesh>
      <sphereGeometry args={[12, 64, 40]} />
      <meshBasicMaterial map={texture} side={BackSide} />
    </mesh>
  );
}

export function PanoramaSceneSurface({ uri, onReady }: { uri: string; onReady: () => void }) {
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [fieldOfView, setFieldOfView] = useState(68);
  const drag = useRef<{ pointerId: number; x: number; y: number; yaw: number; pitch: number } | null>(null);

  const reset = () => {
    setYaw(0);
    setPitch(0);
    setFieldOfView(68);
  };

  return (
    <section className="scene-panorama" data-testid="scene-panorama-surface" aria-label="مشهد بانورامي 360 خيالي للاختبار">
      <div className="scene-panorama-toolbar">
        <button type="button" onClick={reset}>إعادة الاتجاه</button>
        <span>اسحب للنظر حولك · العجلة للتقريب</span>
      </div>
      <div
        className="scene-panorama-canvas"
        tabIndex={0}
        role="application"
        aria-label="مشهد 360؛ استخدم الأسهم لتغيير اتجاه النظر"
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') setYaw((value) => value - 0.12);
          else if (event.key === 'ArrowLeft') setYaw((value) => value + 0.12);
          else if (event.key === 'ArrowUp') setPitch((value) => Math.min(1.15, value + 0.08));
          else if (event.key === 'ArrowDown') setPitch((value) => Math.max(-1.15, value - 0.08));
          else if (event.key === '0') reset();
          else return;
          event.preventDefault();
        }}
        onWheel={(event) => {
          event.preventDefault();
          setFieldOfView((value) => Math.max(35, Math.min(90, value + Math.sign(event.deltaY) * 4)));
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, yaw, pitch };
        }}
        onPointerMove={(event) => {
          if (!drag.current || drag.current.pointerId !== event.pointerId) return;
          setYaw(drag.current.yaw - (event.clientX - drag.current.x) * 0.006);
          setPitch(Math.max(-1.15, Math.min(1.15, drag.current.pitch - (event.clientY - drag.current.y) * 0.004)));
        }}
        onPointerUp={(event) => {
          if (drag.current?.pointerId === event.pointerId) drag.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => { drag.current = null; }}
      >
        <Canvas dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'high-performance' }}>
          <PerspectiveCamera makeDefault position={[0, 0, 0.01]} rotation={[pitch, yaw, 0, 'YXZ']} fov={fieldOfView} near={0.01} far={30} />
          <Suspense fallback={null}><PanoramaTexture key={uri} uri={uri} onReady={onReady} /></Suspense>
        </Canvas>
      </div>
    </section>
  );
}

export default PanoramaSceneSurface;
