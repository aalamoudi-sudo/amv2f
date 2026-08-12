import { FileText } from 'lucide-react';
import type { SourceReference } from '../types';

export function SourceChip({ source }: { source: SourceReference }) {
  const pages = source.pdfPages.join('، ');
  return (
    <span className="kaga-source-chip" title={source.notes}>
      <FileText aria-hidden="true" size={13} />
      المصدر: ص {pages}
    </span>
  );
}

