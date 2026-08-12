import type { OperationalStatus, OperationalStatusConfig } from '../types/status';

export const statusConfig: Record<OperationalStatus, OperationalStatusConfig> = {
  inactive: {
    value: 'inactive',
    labelAr: 'غير مفعلة',
    colorToken: 'neutral',
    hexColor: '#7f8c86',
    sceneColor: '#52625d',
    emissiveColor: '#0a0f0d',
    borderClass: 'border-slate-500/50',
    surfaceClass: 'bg-slate-500/15',
    textClass: 'text-slate-200',
    legendDescriptionAr: 'العنصر موجود لكنه خارج التشغيل الحالي.'
  },
  preparing: {
    value: 'preparing',
    labelAr: 'قيد التجهيز',
    colorToken: 'blue',
    hexColor: '#72a8ff',
    sceneColor: '#3d83d6',
    emissiveColor: '#0c1b2d',
    borderClass: 'border-blue-300/60',
    surfaceClass: 'bg-blue-400/15',
    textClass: 'text-blue-100',
    legendDescriptionAr: 'الأعمال التشغيلية جارية ولم تصل إلى الجاهزية الكاملة.'
  },
  ready: {
    value: 'ready',
    labelAr: 'جاهزة',
    colorToken: 'green',
    hexColor: '#47d6b5',
    sceneColor: '#21ad90',
    emissiveColor: '#06241d',
    borderClass: 'border-emerald-300/60',
    surfaceClass: 'bg-emerald-400/15',
    textClass: 'text-emerald-100',
    legendDescriptionAr: 'العنصر جاهز للتشغيل وفق المؤشرات الحالية.'
  },
  needsAttention: {
    value: 'needsAttention',
    labelAr: 'تحتاج متابعة',
    colorToken: 'amber',
    hexColor: '#e4b363',
    sceneColor: '#ce8f22',
    emissiveColor: '#2c1c05',
    borderClass: 'border-amber-300/70',
    surfaceClass: 'bg-amber-400/15',
    textClass: 'text-amber-100',
    legendDescriptionAr: 'يوجد مؤشر يحتاج متابعة من الفريق المسؤول.'
  },
  delayed: {
    value: 'delayed',
    labelAr: 'متأخرة',
    colorToken: 'orange',
    hexColor: '#f59f54',
    sceneColor: '#dc6f25',
    emissiveColor: '#321104',
    borderClass: 'border-orange-300/70',
    surfaceClass: 'bg-orange-400/15',
    textClass: 'text-orange-100',
    legendDescriptionAr: 'التقدم أقل من المخطط ويتطلب معالجة.'
  },
  highRisk: {
    value: 'highRisk',
    labelAr: 'عالية الخطورة',
    colorToken: 'red',
    hexColor: '#ef6f6c',
    sceneColor: '#d73f44',
    emissiveColor: '#340809',
    borderClass: 'border-red-300/70',
    surfaceClass: 'bg-red-400/15',
    textClass: 'text-red-100',
    legendDescriptionAr: 'مؤشرات الخطر مرتفعة وتحتاج قراراً سريعاً.'
  },
  closed: {
    value: 'closed',
    labelAr: 'مغلقة',
    colorToken: 'gray',
    hexColor: '#a5afa9',
    sceneColor: '#5d6661',
    emissiveColor: '#101513',
    borderClass: 'border-zinc-300/60',
    surfaceClass: 'bg-zinc-400/15',
    textClass: 'text-zinc-100',
    legendDescriptionAr: 'العنصر مغلق مؤقتاً أو خارج نطاق الوصول.'
  },
  emergency: {
    value: 'emergency',
    labelAr: 'طوارئ',
    colorToken: 'crimson',
    hexColor: '#ff3b58',
    sceneColor: '#e31b3f',
    emissiveColor: '#49010b',
    borderClass: 'border-rose-300/80',
    surfaceClass: 'bg-rose-500/20',
    textClass: 'text-rose-100',
    legendDescriptionAr: 'حالة طارئة تستدعي الاستجابة الفورية.'
  }
};

export function getStatusConfig(status: OperationalStatus): OperationalStatusConfig {
  return statusConfig[status];
}
