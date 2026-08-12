import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useRef, type ComponentRef } from 'react';
import type { PerspectiveCamera } from 'three';
import { getEntityCameraTarget, normalizeCameraTarget } from '../cameras/cameraPresets';
import type { ProjectionSettings, ViewMode } from '../../types/projection';
import type { SpatialEntity } from '../../types/spatial';
import type { SpatialBounds } from '../../services/spatialBounds';

interface CameraRigProps {
  selectedEntity: SpatialEntity | undefined;
  viewMode: ViewMode;
  isProjectionMode: boolean;
  projectionSettings: ProjectionSettings;
  spatialBounds: SpatialBounds;
  resetNonce: number;
  onTransitionStart: () => void;
  onTransitionComplete: () => void;
}

export function CameraRig({
  selectedEntity,
  viewMode,
  isProjectionMode,
  projectionSettings,
  spatialBounds,
  resetNonce,
  onTransitionStart,
  onTransitionComplete
}: CameraRigProps) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const cameraFromScene = useThree((state) => state.camera);
  const cameraRef = useRef<PerspectiveCamera | null>(null);

  useEffect(() => {
    cameraRef.current = cameraFromScene as PerspectiveCamera;
  }, [cameraFromScene]);

  useFrame(() => {
    const camera = cameraRef.current;
    if (!camera) {
      return;
    }

    const values = [camera.position.x, camera.position.y, camera.position.z, camera.near, camera.far];
    const cameraIsValid = values.every(Number.isFinite) && camera.near > 0 && camera.far > camera.near;

    if (!cameraIsValid) {
      const fallback = normalizeCameraTarget({ position: [23, 20, 23], target: [0, 0, 0] });
      camera.position.set(...fallback.position);
      camera.near = 0.1;
      camera.far = 240;
      camera.updateProjectionMatrix();
      controlsRef.current?.target.set(...fallback.target);
      controlsRef.current?.update();
    }

    document.documentElement.dataset.mayadeenCameraValid = cameraIsValid ? 'true' : 'false';
  });

  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) {
      return undefined;
    }

    const target = normalizeCameraTarget(getEntityCameraTarget(selectedEntity, viewMode, projectionSettings, spatialBounds));
    const controls = controlsRef.current;
    onTransitionStart();
    document.documentElement.dataset.mayadeenCameraSettled = 'false';

    camera.near = 0.1;
    camera.far = Math.max(240, Math.max(spatialBounds.width, spatialBounds.depth) * 8);
    camera.updateProjectionMatrix();

    gsap.killTweensOf(camera.position);
    if (controls) {
      gsap.killTweensOf(controls.target);
    }

    const transition = gsap.timeline({
      defaults: { duration: 0.75, ease: 'power3.out' },
      onComplete: () => {
        controls?.update();
        document.documentElement.dataset.mayadeenCameraSettled = 'true';
        onTransitionComplete();
      }
    });

    transition.to(camera.position, {
      x: target.position[0],
      y: target.position[1],
      z: target.position[2],
      onUpdate: () => controls?.update()
    });

    if (controls) {
      transition.to(controls.target, {
        x: target.target[0],
        y: target.target[1],
        z: target.target[2],
        onUpdate: () => controls.update()
      }, 0);
    }

    return () => {
      transition.kill();
      gsap.killTweensOf(camera.position);
      if (controls) {
        gsap.killTweensOf(controls.target);
      }
    };
  }, [onTransitionComplete, onTransitionStart, projectionSettings, resetNonce, selectedEntity, spatialBounds, viewMode]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={!isProjectionMode}
      enableDamping
      dampingFactor={0.08}
      minDistance={10}
      maxDistance={Math.max(72, Math.max(spatialBounds.width, spatialBounds.depth) * 2.4)}
      maxPolarAngle={viewMode === 'top' ? 0.08 : Math.PI / 2.15}
      minPolarAngle={viewMode === 'top' ? 0.02 : 0.22}
    />
  );
}
