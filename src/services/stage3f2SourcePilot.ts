import type { Stage3F2SourceManifest } from '../types/stage3f2';

export interface Stage3F2ValidationResult {
  readyForRealSource: boolean;
  blockers: string[];
}

export const stage3f2PilotTemplate: Stage3F2SourceManifest = {
  pilotId: null,
  eventId: null,
  venueId: null,
  entityId: null,
  zoneId: null,
  sourceId: null,
  deviceId: null,
  datastreamId: null,
  sourceOwner: null,
  technicalOwner: null,
  approvedBy: null,
  approvalDate: null,
  approvedScope: null,
  protocol: null,
  authenticationMethod: null,
  environmentVariableNames: [],
  observationFields: [],
  units: [],
  expectedFrequencySeconds: null,
  timePolicy: null,
  retentionPolicy: null,
  privacyClassification: null,
  networkBoundary: null,
  rollbackOwner: null,
  pilotStart: null,
  pilotEnd: null,
  successThresholds: [],
  status: 'READY_FOR_REAL_SOURCE',
  accessAvailable: false,
  realSourceApproved: false
};

export function validateStage3F2SourceManifest(manifest: Stage3F2SourceManifest): Stage3F2ValidationResult {
  const blockers: string[] = [];
  const requiredTextFields: Array<[keyof Stage3F2SourceManifest, string]> = [
    ['pilotId', 'حقل pilotId مطلوب.'],
    ['eventId', 'حقل eventId مطلوب.'],
    ['venueId', 'حقل venueId مطلوب.'],
    ['sourceId', 'حقل sourceId مطلوب.'],
    ['deviceId', 'حقل deviceId مطلوب.'],
    ['datastreamId', 'حقل datastreamId مطلوب.'],
    ['sourceOwner', 'حقل sourceOwner مطلوب.'],
    ['technicalOwner', 'حقل technicalOwner مطلوب.'],
    ['approvedScope', 'حقل approvedScope مطلوب.'],
    ['protocol', 'حقل protocol مطلوب.'],
    ['authenticationMethod', 'حقل authenticationMethod مطلوب.'],
    ['timePolicy', 'حقل timePolicy مطلوب.'],
    ['retentionPolicy', 'حقل retentionPolicy مطلوب.'],
    ['privacyClassification', 'حقل privacyClassification مطلوب.'],
    ['networkBoundary', 'حقل networkBoundary مطلوب.'],
    ['rollbackOwner', 'حقل rollbackOwner مطلوب.'],
    ['pilotStart', 'حقل pilotStart مطلوب.'],
    ['pilotEnd', 'حقل pilotEnd مطلوب.']
  ];
  for (const [field, message] of requiredTextFields) {
    if (!manifest[field]) blockers.push(message);
  }
  if (!manifest.entityId && !manifest.zoneId) blockers.push('حقل entityId أو zoneId مطلوب.');
  if (!manifest.realSourceApproved) blockers.push('لا توجد موافقة مكتوبة على مصدر خارجي حقيقي.');
  if (!manifest.accessAvailable) blockers.push('لا يوجد وصول فعلي إلى المصدر الخارجي.');
  if (manifest.approvedBy === null) blockers.push('حقل approvedBy مطلوب قبل الاتصال الحقيقي.');
  if (manifest.approvalDate === null) blockers.push('حقل approvalDate مطلوب قبل الاتصال الحقيقي.');
  if (!manifest.environmentVariableNames.length) blockers.push('أسماء متغيرات البيئة غير معرفة.');
  if (!manifest.observationFields.length) blockers.push('حقول الملاحظة المسموح بها غير معرفة.');
  if (!manifest.units.length) blockers.push('وحدات القياس غير معرفة.');
  if (!manifest.expectedFrequencySeconds || manifest.expectedFrequencySeconds <= 0) blockers.push('تردد المصدر المتوقع مطلوب.');
  if (!manifest.successThresholds.length) blockers.push('عتبات النجاح غير معرفة.');
  if (manifest.protocol && manifest.protocol !== 'http-json-polling' && manifest.protocol !== 'http-webhook' && manifest.protocol !== 'camera-analytics-api') {
    blockers.push('بروتوكول المصدر يحتاج تعريفًا صريحًا.');
  }
  return { readyForRealSource: blockers.length === 0, blockers };
}

export function stage3f2PilotStatusText(): 'READY_FOR_REAL_SOURCE' {
  return 'READY_FOR_REAL_SOURCE';
}
