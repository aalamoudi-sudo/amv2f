import type { LaunchLayerDefinition } from '../experience/types';
import { sourceRef } from './sourceReferences';

export const royalMomentSource = sourceRef([12, 15], 'التمثيل البصري مفهوم معتمد في العرض، وليس محاكاة فيزيائية.');

export const launchLayers: LaunchLayerDefinition[] = [
  {
    id: 'xr',
    label: 'الواقع الممتد XR',
    description: 'طبقة بصرية مقترحة لتحويل المباني إلى لوحات فنية ومنصات تفاعلية عبر أجهزة مدعومة بتقنية الواقع الممتد.',
    source: sourceRef([20, 21]),
  },
  {
    id: 'drones',
    label: 'الدرونز',
    description: 'تشكيلات متعددة حسب السيناريو، بمدة تحليق موصى بها تبلغ 10 دقائق.',
    source: sourceRef([20, 21]),
  },
  {
    id: 'fireworks',
    label: 'الألعاب النارية',
    description: 'ختام مقترح بمدة تتراوح بين 3 و5 دقائق وإطلاق 1000 طلقة حسب السيناريو.',
    source: sourceRef([20, 21, 22]),
  },
];
