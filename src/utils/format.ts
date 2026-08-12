import type { EntityType } from '../types/spatial';

export const entityTypeLabelsAr: Record<EntityType, string> = {
  site: 'موقع',
  zone: 'منطقة',
  hall: 'قاعة',
  gate: 'بوابة',
  route: 'مسار',
  stage: 'منصة',
  parking: 'مواقف',
  service: 'خدمات',
  assembly: 'تجمع',
  asset: 'أصل'
};

export function formatCapacity(capacity: number): string {
  return new Intl.NumberFormat('ar-SA').format(capacity);
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat('ar-SA').format(Math.round(value))}%`;
}

export function formatTime(timestamp: number | null): string {
  if (!timestamp) {
    return 'لم يتم الحفظ بعد';
  }

  return new Intl.DateTimeFormat('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(timestamp);
}
