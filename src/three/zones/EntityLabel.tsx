import { Html } from '@react-three/drei';
import type { SpatialEntity } from '../../types/spatial';

interface EntityLabelProps {
  entity: SpatialEntity;
  selected: boolean;
  visible: boolean;
}

export function EntityLabel({ entity, selected, visible }: EntityLabelProps) {
  if (!visible) {
    return null;
  }

  const labelOffset =
    typeof entity.metadata.labelOffset === 'number' ? entity.metadata.labelOffset : Math.max(1, entity.scale[1] + 0.8);

  return (
    <Html
      center
      distanceFactor={26}
      position={[entity.position[0], entity.position[1] + labelOffset, entity.position[2]]}
      transform
      zIndexRange={[20, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div
        className={`whitespace-nowrap rounded border px-2 py-1 text-[11px] font-semibold shadow-command ${
          selected
            ? 'border-command-accent bg-command-accent text-[#06120f]'
            : 'border-command-line bg-command-panel/95 text-command-text'
        }`}
      >
        {entity.nameAr}
      </div>
    </Html>
  );
}
