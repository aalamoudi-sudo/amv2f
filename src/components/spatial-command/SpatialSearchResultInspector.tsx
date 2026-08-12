import { AlertTriangle, Compass, FileCheck2, Landmark, SearchCheck } from 'lucide-react';
import type { SpatialSearchResult } from '../../types/spatialMap';

export function SpatialSearchResultInspector({ result }: { result: SpatialSearchResult }) {
  return (
    <section data-testid="spatial-search-result-inspector" className="sc-mode-panel sc-search-result-inspector">
      <header>
        <span>{result.type === 'independent-landmark' ? <Landmark aria-hidden="true" /> : <SearchCheck aria-hidden="true" />}</span>
        <div><small>نتيجة البحث</small><h2>{result.nameAr}</h2><p>{result.relationshipAr}</p></div>
      </header>
      {!result.hasAnchor ? (
        <div className="sc-search-unanchored">
          <AlertTriangle aria-hidden="true" />
          <div><strong>لا يوجد موضع على الخريطة</strong><p>لا تُنشئ المنصة علامة أو نقطة بديلة لهذا السجل.</p></div>
        </div>
      ) : null}
      <dl>
        <div><dt><FileCheck2 aria-hidden="true" />حالة الحقيقة</dt><dd>{result.semanticStatus === 'founder-approved' ? 'دلالة مجمدة بقرار المؤسس' : 'معلومة مشتقة من المصدر'}</dd></div>
        <div><dt><Compass aria-hidden="true" />الحالة المكانية</dt><dd>{result.spatialStatus === 'unresolved' ? 'غير محسومة' : result.spatialStatus === 'independent-landmark' ? 'معلم مستقل' : result.spatialStatus === 'conflicted' ? 'متعارضة' : 'مرساة بصرية مرشحة'}</dd></div>
        <div><dt>المصدر</dt><dd>{result.sourceAr}</dd></div>
        <div><dt>الهندسة</dt><dd>غير متحققة هندسيًا</dd></div>
        <div><dt>التشغيل</dt><dd>غير متاح، ولا توجد جاهزية مستنتجة</dd></div>
      </dl>
    </section>
  );
}
