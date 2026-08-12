import type { LucideIcon } from 'lucide-react';
import { Compass, LayoutDashboard, Map, Wrench } from 'lucide-react';

/**
 * UI-only navigation vocabulary. Existing workspace URLs remain stable so
 * historic links can continue to resolve without coupling Core contracts to
 * a particular command-center layout.
 */
export type CommandWorkspace =
  | 'portfolio'
  | 'launcher'
  | 'executive'
  | 'command'
  | 'spatial'
  | 'spatial-command'
  | 'spatial-authoring'
  | 'readiness'
  | 'readiness-pack'
  | 'decisions'
  | 'validation'
  | 'integration'
  | 'iot'
  | 'configuration'
  | 'authoring'
  | 'visual-system'
  | 'visual-direction'
  | 'experience'
  | 'experience-twin'
  | 'experience-rehearsal';

export type ProductArea = 'leadership' | 'operations' | 'place' | 'experience' | 'technical';
export type PresentationPreset = 'executive' | 'operator' | 'technical';

export interface ProductAreaDefinition {
  id: ProductArea;
  labelAr: string;
  descriptionAr: string;
  icon: LucideIcon;
  defaultWorkspace: CommandWorkspace;
}

export const productAreas: ProductAreaDefinition[] = [
  {
    id: 'leadership',
    labelAr: 'القيادة',
    descriptionAr: 'الأثر والقرارات ومصدر الحقيقة',
    icon: LayoutDashboard,
    defaultWorkspace: 'executive'
  },
  {
    id: 'operations',
    labelAr: 'العمليات',
    descriptionAr: 'التدخل والجاهزية والقرار والتحقق',
    icon: Compass,
    defaultWorkspace: 'command'
  },
  {
    id: 'place',
    labelAr: 'المكان',
    descriptionAr: 'القائمة و2D و3D والسياق المكاني',
    icon: Map,
    defaultWorkspace: 'spatial'
  },
  {
    id: 'experience',
    labelAr: 'التجربة',
    descriptionAr: 'خرائط تجربة مرشحة ومعزولة',
    icon: Compass,
    defaultWorkspace: 'experience'
  },
  {
    id: 'technical',
    labelAr: 'الإدارة التقنية',
    descriptionAr: 'الحزم والمختبرات والتشخيص المحلي',
    icon: Wrench,
    defaultWorkspace: 'configuration'
  }
];

export const presentationPresetLabels: Record<PresentationPreset, string> = {
  executive: 'عرض تنفيذي',
  operator: 'عرض تشغيلي',
  technical: 'عرض تقني'
};

export function productAreaForWorkspace(workspace: CommandWorkspace): ProductArea | null {
  if (workspace === 'executive') return 'leadership';
  if (workspace === 'command' || workspace === 'readiness' || workspace === 'readiness-pack' || workspace === 'decisions' || workspace === 'validation') return 'operations';
  if (workspace === 'spatial' || workspace === 'spatial-authoring') return 'place';
  if (workspace === 'experience' || workspace === 'experience-twin' || workspace === 'experience-rehearsal' || workspace === 'spatial-command') return 'experience';
  if (workspace === 'integration' || workspace === 'iot' || workspace === 'configuration' || workspace === 'authoring' || workspace === 'visual-system') return 'technical';
  return null;
}

export function workspaceTitle(workspace: CommandWorkspace): string {
  switch (workspace) {
    case 'portfolio': return 'محفظة المشاريع';
    case 'executive': return 'القيادة التنفيذية';
    case 'command': return 'مساحة العمليات';
    case 'spatial': return 'المكان والسياق المكاني';
    case 'spatial-command': return 'تجربة القيادة المكانية';
    case 'spatial-authoring': return 'مواءمة المخطط المكاني';
    case 'readiness': return 'قيادة الجاهزية المبنية على الأدلة';
    case 'readiness-pack': return 'إعداد حزمة الجاهزية التشغيلية';
    case 'decisions': return 'مركز القرارات';
    case 'validation': return 'التحقق التشغيلي';
    case 'integration': return 'مختبر تدفق الحقيقة التشغيلية';
    case 'iot': return 'مختبر إنترنت الأشياء';
    case 'authoring': return 'تأليف الحزمة التجريبية';
    case 'configuration': return 'تهيئة الفعاليات والحزم التشغيلية';
    case 'visual-system': return 'مرجع النظام المرئي';
    case 'visual-direction': return 'مراجعة الاتجاه البصري';
    case 'experience': return 'ذكاء تجربة الفعالية';
    case 'experience-twin': return 'توأم تجربة الفعالية';
    case 'experience-rehearsal': return 'قيادة البروفة الرقمية';
    case 'launcher': return 'اختيار السياق';
  }
}

export function isTechnicalWorkspace(workspace: CommandWorkspace): boolean {
  return workspace === 'integration'
    || workspace === 'iot'
    || workspace === 'configuration'
    || workspace === 'authoring'
    || workspace === 'visual-system';
}
