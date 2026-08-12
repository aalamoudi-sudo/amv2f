import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { CatmullRomCurve3, Quaternion, Vector3 } from 'three';
import type { Group } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { RouteDefinition } from '../../types/routes';

interface RoutePathProps {
  route: RouteDefinition;
  visible: boolean;
  selected: boolean;
  highlighted: boolean;
  onSelect: (route: RouteDefinition) => void;
}

export function RoutePath({ route, visible, selected, highlighted, onSelect }: RoutePathProps) {
  const pulseGroupRef = useRef<Group>(null);
  const points = useMemo(() => route.points.map(([x, y, z]) => new Vector3(x, y + 0.08, z)), [route.points]);
  const curve = useMemo(() => new CatmullRomCurve3(points, false, 'catmullrom', 0.18), [points]);
  const curvePoints = useMemo(() => curve.getPoints(96), [curve]);
  const startPoint = points[0] ?? new Vector3();
  const endPoint = points[points.length - 1] ?? new Vector3();
  const directionMarkers = useMemo(
    () =>
      [0.2, 0.46, 0.72].map((offset) => {
        const point = curve.getPoint(offset);
        const tangent = curve.getTangent(offset).normalize();
        const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), tangent);
        return { point, quaternion };
      }),
    [curve]
  );

  useFrame(({ clock }) => {
    if (!pulseGroupRef.current || !visible) {
      return;
    }

    const elapsed = clock.getElapsedTime();
    pulseGroupRef.current.children.forEach((child, index) => {
      const point = curve.getPoint((elapsed * 0.08 + index * 0.22) % 1);
      child.position.set(point.x, point.y + 0.12, point.z);
    });
  });

  if (!visible) {
    return null;
  }

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(route);
  };

  return (
    <group onClick={handleClick} userData={{ entityId: route.entityId }} renderOrder={12}>
      <Line
        points={curvePoints}
        color="#06120f"
        lineWidth={route.width * 42}
        transparent
        opacity={0.92}
        polygonOffset
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
        renderOrder={4}
      />
      <Line
        points={curvePoints}
        color={selected || highlighted ? route.secondaryColor : route.color}
        lineWidth={selected ? route.width * 38 : route.width * 30}
        transparent
        opacity={selected || highlighted ? 1 : 0.94}
        polygonOffset
        polygonOffsetFactor={-6}
        polygonOffsetUnits={-6}
        renderOrder={5}
      />
      <mesh position={startPoint} rotation={[-Math.PI / 2, 0, 0]} renderOrder={14}>
        <circleGeometry args={[0.34, 24]} />
        <meshBasicMaterial color={route.secondaryColor} depthTest={false} depthWrite={false} />
      </mesh>
      <mesh position={endPoint} rotation={[-Math.PI / 2, 0, 0]} renderOrder={14}>
        <ringGeometry args={[0.18, 0.4, 24]} />
        <meshBasicMaterial color={route.color} depthTest={false} depthWrite={false} />
      </mesh>
      {directionMarkers.map(({ point, quaternion }, index) => (
        <mesh key={`${route.id}-direction-${index}`} position={point} quaternion={quaternion} renderOrder={14}>
          <coneGeometry args={[0.22, 0.58, 6]} />
          <meshBasicMaterial color={route.secondaryColor} depthTest={false} depthWrite={false} />
        </mesh>
      ))}
      <group ref={pulseGroupRef}>
        {[0, 1, 2].map((item) => (
          <mesh key={item} renderOrder={15}>
            <sphereGeometry args={[selected ? 0.28 : 0.22, 16, 16]} />
            <meshStandardMaterial
              color={route.secondaryColor}
              emissive={route.color}
              emissiveIntensity={selected || highlighted ? 1.2 : 0.65}
              roughness={0.35}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
