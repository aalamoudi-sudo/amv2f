import type { EntityType, SpatialEntity, SpatialEntityRecord } from '../types/spatial';

const typeOrder: EntityType[] = [
  'site',
  'zone',
  'hall',
  'gate',
  'stage',
  'service',
  'parking',
  'assembly',
  'route',
  'asset'
];

export function toEntityList(entities: SpatialEntityRecord): SpatialEntity[] {
  return Object.values(entities).sort((a, b) => {
    const typeDelta = typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
    return typeDelta === 0 ? a.id.localeCompare(b.id) : typeDelta;
  });
}

export function getSelectableSceneEntities(entities: SpatialEntityRecord): SpatialEntity[] {
  return toEntityList(entities).filter((entity) => entity.type !== 'route');
}

export function getOperationalEntities(entities: SpatialEntityRecord): SpatialEntity[] {
  return toEntityList(entities).filter((entity) => entity.type !== 'site');
}
