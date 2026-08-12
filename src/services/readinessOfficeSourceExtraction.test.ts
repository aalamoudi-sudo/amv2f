import { describe, expect, it } from 'vitest';
import {
  assertNoPrivateContactData,
  parsePptxSlideXml,
  parseSharedStringsXml,
  parseWorkbookSheetRows,
  selectApprovedWorkbookFields
} from '../../scripts/lib/officeSourceExtraction';
import { sha256PayloadSync } from './integrationHash';

const slideXml = `
  <p:sld xmlns:p="p" xmlns:a="a">
    <p:sp><p:nvSpPr><p:cNvPr id="1" name="Title"/></p:nvSpPr><p:txBody><a:p><a:r><a:t>عنوان الحوكمة</a:t></a:r></a:p></p:txBody></p:sp>
    <p:sp><p:nvSpPr><p:cNvPr id="2" name="Role"/></p:nvSpPr><p:txBody><a:p><a:r><a:t>مدير المشروع</a:t></a:r><a:r><a:t>اختبار</a:t></a:r></a:p></p:txBody></p:sp>
    <p:graphicFrame><a:graphic><a:graphicData><a:tbl>
      <a:tr><a:tc><a:txBody><a:p><a:r><a:t>الدور</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:p><a:r><a:t>الاسم</a:t></a:r></a:p></a:txBody></a:tc></a:tr>
      <a:tr><a:tc><a:txBody><a:p><a:r><a:t>مسؤول</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:p><a:r><a:t>هوية اختبار</a:t></a:r></a:p></a:txBody></a:tc></a:tr>
    </a:tbl></a:graphicData></a:graphic></p:graphicFrame>
  </p:sld>
`;

const sharedStringsXml = `
  <sst>
    <si><t>اسم الموظف</t></si>
    <si><t>هوية اختبار محلية</t></si>
    <si><t>الدور</t></si>
    <si><t>مدقق اختبار</t></si>
  </sst>
`;

const sheetXml = `
  <worksheet><sheetData>
    <row r="1"><c r="B1" t="s"><v>0</v></c><c r="D1" t="s"><v>2</v></c></row>
    <row r="2"><c r="B2" t="s"><v>1</v></c><c r="D2" t="s"><v>3</v></c></row>
  </sheetData></worksheet>
`;

describe('Stage 3G.1A deterministic Office source extraction', () => {
  it('extracts identical PPTX structure and fingerprint from identical XML', () => {
    const first = parsePptxSlideXml(slideXml, 1);
    const second = parsePptxSlideXml(slideXml, 1);
    expect(first).toEqual(second);
    expect(sha256PayloadSync(first)).toBe(sha256PayloadSync(second));
    expect(first.shapes).toEqual([
      expect.objectContaining({ shapeIndex: 1, text: 'عنوان الحوكمة' }),
      expect.objectContaining({ shapeIndex: 2, text: 'مدير المشروع | اختبار' })
    ]);
    expect(first.tables[0]?.rows[1]?.cells).toEqual(['مسؤول', 'هوية اختبار']);
  });

  it('extracts only the explicitly approved workbook columns and row', () => {
    const strings = parseSharedStringsXml(sharedStringsXml);
    const rows = parseWorkbookSheetRows(sheetXml, strings);
    expect(selectApprovedWorkbookFields(rows, 2, ['B', 'D'])).toEqual({
      B: 'هوية اختبار محلية',
      D: 'مدقق اختبار'
    });
    expect(selectApprovedWorkbookFields(rows, 2, ['B', 'D'])).toEqual(
      selectApprovedWorkbookFields(parseWorkbookSheetRows(sheetXml, strings), 2, ['B', 'D'])
    );
  });

  it('fails closed if a sanitized derivative contains contact data', () => {
    expect(() => assertNoPrivateContactData({ email: 'person@example.com' }))
      .toThrow('PRIVATE_CONTACT_DATA_DETECTED');
    expect(() => assertNoPrivateContactData({ phone: '+966 50 123 4567' }))
      .toThrow('PRIVATE_CONTACT_DATA_DETECTED');
    expect(() => assertNoPrivateContactData({ label: 'هوية اختبار محلية' }))
      .not.toThrow();
  });
});
