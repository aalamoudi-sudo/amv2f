import { Grid } from '@react-three/drei';
import type { SpatialBounds } from '../../services/spatialBounds';

export function GroundPlane({ bounds }: { bounds: SpatialBounds }) {
  const width = Math.max(20, bounds.width);
  const depth = Math.max(20, bounds.depth);
  const center: [number, number, number] = [bounds.centerX, -0.02, bounds.centerZ];
  return (
    <group position={[bounds.centerX, 0, bounds.centerZ]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, center[1], 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#0c1814" roughness={0.88} metalness={0.02} />
      </mesh>
      <Grid
        position={[0, 0.01, 0]}
        args={[width, depth]}
        cellSize={2}
        cellThickness={0.35}
        cellColor="#29423b"
        sectionSize={10}
        sectionThickness={0.7}
        sectionColor="#42675d"
        fadeDistance={Math.max(width, depth) * 0.9}
        fadeStrength={1}
        infiniteGrid={false}
      />
      <mesh position={[0, 0.03, 0]} scale={[Math.max(1, width - bounds.padding), 0.04, Math.max(1, depth - bounds.padding)]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#47d6b5" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}
