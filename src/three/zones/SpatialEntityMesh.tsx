import { Edges } from '@react-three/drei';
import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { SpatialEntity } from '../../types/spatial';
import { getStatusConfig } from '../../data/statuses';
import { EntityLabel } from './EntityLabel';

interface SpatialEntityMeshProps {
  entity: SpatialEntity;
  selected: boolean;
  highlighted: boolean;
  labelsVisible: boolean;
  statusColorsVisible: boolean;
  onSelect: (entity: SpatialEntity) => void;
}

const baseColors: Record<SpatialEntity['type'], string> = {
  site: '#1a2a25',
  zone: '#2b6258',
  hall: '#355f75',
  gate: '#7a6b36',
  route: '#47d6b5',
  stage: '#7d4d5a',
  parking: '#4a6f59',
  service: '#705437',
  assembly: '#3c7565',
  asset: '#60716b'
};

export function SpatialEntityMesh({
  entity,
  selected,
  highlighted,
  labelsVisible,
  statusColorsVisible,
  onSelect
}: SpatialEntityMeshProps) {
  const status = getStatusConfig(entity.status);
  const color = statusColorsVisible ? status.sceneColor : baseColors[entity.type];
  const emissive = selected || highlighted ? status.emissiveColor : '#020403';
  const outlineColor = selected ? '#effffb' : highlighted ? '#f7dfab' : status.hexColor;
  const opacity = entity.type === 'site' ? 0.26 : 0.92;

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(entity);
  };

  const materialProps = useMemo(
    () => ({
      color,
      emissive,
      roughness: 0.58,
      metalness: entity.type === 'gate' || entity.type === 'stage' ? 0.28 : 0.12,
      transparent: entity.type === 'site',
      opacity
    }),
    [color, emissive, entity.type, opacity]
  );

  if (entity.type === 'assembly') {
    return (
      <group>
        <mesh
          position={entity.position}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[entity.scale[0], entity.scale[2], 1]}
          onClick={handleClick}
          castShadow
          receiveShadow
          userData={{ entityId: entity.id }}
        >
          <cylinderGeometry args={[0.5, 0.5, entity.scale[1], 48]} />
          <meshStandardMaterial {...materialProps} />
          <Edges color={outlineColor} />
        </mesh>
        <SelectionMarker entity={entity} selected={selected} />
        <EntityLabel entity={entity} selected={selected} visible={labelsVisible} />
      </group>
    );
  }

  if (entity.type === 'gate') {
    return (
      <group
        position={entity.position}
        rotation={entity.rotation}
        scale={entity.scale}
        onClick={handleClick}
        userData={{ entityId: entity.id }}
      >
        <mesh position={[0, 0, -0.38]} castShadow receiveShadow>
          <boxGeometry args={[0.35, 1, 0.24]} />
          <meshStandardMaterial {...materialProps} />
          <Edges color={outlineColor} />
        </mesh>
        <mesh position={[0, 0, 0.38]} castShadow receiveShadow>
          <boxGeometry args={[0.35, 1, 0.24]} />
          <meshStandardMaterial {...materialProps} />
          <Edges color={outlineColor} />
        </mesh>
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.38, 0.18, 1]} />
          <meshStandardMaterial {...materialProps} />
          <Edges color={outlineColor} />
        </mesh>
        <SelectionMarker entity={entity} selected={selected} local />
        <EntityLabel entity={entity} selected={selected} visible={labelsVisible} />
      </group>
    );
  }

  if (entity.type === 'parking') {
    return (
      <group>
        <mesh
          position={entity.position}
          rotation={entity.rotation}
          scale={entity.scale}
          onClick={handleClick}
          receiveShadow
          userData={{ entityId: entity.id }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial {...materialProps} />
          <Edges color={outlineColor} />
        </mesh>
        {[-0.28, 0, 0.28].map((offset) => (
          <mesh
            key={offset}
            position={[entity.position[0], entity.position[1] + 0.24, entity.position[2] + entity.scale[2] * offset]}
            scale={[entity.scale[0] * 0.82, 0.03, 0.03]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#d9e7df" transparent opacity={0.7} />
          </mesh>
        ))}
        <SelectionMarker entity={entity} selected={selected} />
        <EntityLabel entity={entity} selected={selected} visible={labelsVisible} />
      </group>
    );
  }

  return (
    <group>
      <mesh
        position={entity.position}
        rotation={entity.rotation}
        scale={entity.scale}
        onClick={handleClick}
        castShadow={entity.type !== 'site'}
        receiveShadow
        userData={{ entityId: entity.id }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial {...materialProps} />
        <Edges color={outlineColor} />
      </mesh>
      {entity.type === 'hall' ? (
        <mesh
          position={[entity.position[0], entity.position[1] + entity.scale[1] * 0.55, entity.position[2]]}
          scale={[entity.scale[0] * 0.95, 0.16, entity.scale[2] * 0.95]}
          rotation={entity.rotation}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#9bb2aa" metalness={0.2} roughness={0.5} />
        </mesh>
      ) : null}
      <SelectionMarker entity={entity} selected={selected} />
      <EntityLabel entity={entity} selected={selected} visible={labelsVisible} />
    </group>
  );
}

function SelectionMarker({ entity, selected, local = false }: { entity: SpatialEntity; selected: boolean; local?: boolean }) {
  if (!selected) {
    return null;
  }

  const radius = Math.max(0.72, Math.min(2.2, Math.max(entity.scale[0], entity.scale[2]) * 0.62));
  const position: [number, number, number] = local
    ? [0, 0.16 - entity.position[1], 0]
    : [entity.position[0], 0.16, entity.position[2]];

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} renderOrder={20}>
      <ringGeometry args={[radius * 0.72, radius, 48]} />
      <meshBasicMaterial color="#effffb" transparent opacity={0.96} depthTest={false} />
    </mesh>
  );
}
