import type { ApprovalStatus, RouteId, SpatialEntityId, Vector3Tuple } from './spatial';

export type RouteType = 'visitor' | 'evacuation' | 'service';

export interface RouteDefinition {
  id: RouteId;
  entityId: RouteId;
  nameAr: string;
  nameEn: string;
  type: RouteType;
  descriptionAr: string;
  points: Vector3Tuple[];
  color: string;
  secondaryColor: string;
  width: number;
  defaultVisible: boolean;
  relatedEntityIds: SpatialEntityId[];
  geometrySource: string;
  authority: string;
  approvalStatus: ApprovalStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  version: string;
}

export type RouteVisibility = Record<RouteId, boolean>;
