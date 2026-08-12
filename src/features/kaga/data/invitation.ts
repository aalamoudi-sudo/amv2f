import { sourceRef } from './sourceReferences';

export const invitationSource = sourceRef([59, 60, 61, 62]);

export const invitationWorkflow = [
  'إضافة الضيف',
  'التصنيف',
  'إرسال الدعوة',
  'تأكيد الحضور',
  'إصدار رمز الدخول',
  'دليل الضيف',
] as const;
