import type { IdentityApplication } from '../types';
import { sourceRef } from './sourceReferences';

export const identityApplications: IdentityApplication[] = [
  { id: 'vests', title: 'السترات', category: 'الزي', proposals: [
    { label: 'المقترح الأول', image: '/kaga/assets/identity/vests-proposal-1-p064.webp', source: sourceRef([64]) },
    { label: 'المقترح الثاني', image: '/kaga/assets/identity/vests-proposal-2-p065.webp', source: sourceRef([65]) },
  ], source: sourceRef([64, 65]) },
  { id: 'badges', title: 'البطاقات التعريفية', category: 'التعريف', proposals: [
    { label: 'التطبيق', image: '/kaga/assets/identity/badges-p066.webp', source: sourceRef([66]) },
  ], source: sourceRef([66]) },
  { id: 'flags', title: 'الأعلام', category: 'الموقع', proposals: [
    { label: 'المقترح الأول', image: '/kaga/assets/identity/flags-proposal-1-p067.webp', source: sourceRef([67]) },
    { label: 'المقترح الثاني', image: '/kaga/assets/identity/flags-proposal-2-p068.webp', source: sourceRef([68]) },
  ], source: sourceRef([67, 68]) },
  { id: 'signage', title: 'اللوحات التعريفية', category: 'الإرشاد', proposals: [
    { label: 'المقترح الأول', image: '/kaga/assets/identity/signage-proposal-1-p069.webp', source: sourceRef([69]) },
    { label: 'المقترح الثاني', image: '/kaga/assets/identity/signage-proposal-2-p070.webp', source: sourceRef([70]) },
  ], source: sourceRef([69, 70]) },
  { id: 'cubes', title: 'المكعبات', category: 'العناصر المكانية', proposals: [
    { label: 'المقترح الأول', image: '/kaga/assets/identity/cubes-proposal-1-p071.webp', source: sourceRef([71]) },
    { label: 'المقترح الثاني', image: '/kaga/assets/identity/cubes-proposal-2-p072.webp', source: sourceRef([72]) },
  ], source: sourceRef([71, 72]) },
  { id: 'buses', title: 'الحافلات', category: 'النقل', proposals: [
    { label: 'التطبيق', image: '/kaga/assets/identity/buses-p073.webp', source: sourceRef([73]) },
  ], source: sourceRef([73]) },
  { id: 'golf-carts', title: 'عربات الجولف', category: 'النقل الداخلي', proposals: [
    { label: 'المقترح الأول', image: '/kaga/assets/identity/golf-carts-proposal-1-p074.webp', source: sourceRef([74]) },
    { label: 'المقترح الثاني', image: '/kaga/assets/identity/golf-cart-proposal-2-p075.webp', source: sourceRef([75]) },
  ], source: sourceRef([74, 75]) },
  { id: 'cleaning-uniform', title: 'زي عمال النظافة', category: 'الزي', proposals: [
    { label: 'التطبيق', image: '/kaga/assets/identity/cleaning-uniform-p076.webp', source: sourceRef([76]) },
  ], source: sourceRef([76]) },
];
