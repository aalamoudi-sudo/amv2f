export interface ExtractedPptxShape {
  shapeIndex: number;
  shapeName: string;
  text: string;
}

export interface ExtractedPptxTableRow {
  rowNumber: number;
  cells: string[];
}

export interface ExtractedPptxTable {
  tableIndex: number;
  rows: ExtractedPptxTableRow[];
}

export interface ExtractedPptxSlide {
  slideNumber: number;
  shapes: ExtractedPptxShape[];
  tables: ExtractedPptxTable[];
}

export interface ExtractedWorkbookRow {
  rowNumber: number;
  valuesByColumn: Record<string, string>;
}

const xmlEntities: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  quot: '"'
};

function decodeXml(value: string): string {
  return value.replaceAll(/&(#x[0-9a-f]+|#\d+|amp|apos|gt|lt|quot);/gi, (_match, entity: string) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return xmlEntities[entity.toLowerCase()] ?? '';
  });
}

export function normalizeExtractedOfficeText(value: string): string {
  return decodeXml(value)
    .replaceAll(/\s+/g, ' ')
    .replaceAll(/\s*\|\s*/g, ' | ')
    .trim();
}

function textRuns(xml: string): string[] {
  return [...xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)]
    .map((match) => normalizeExtractedOfficeText(match[1] ?? ''))
    .filter(Boolean);
}

export function parsePptxSlideXml(xml: string, slideNumber: number): ExtractedPptxSlide {
  const shapes = [...xml.matchAll(/<p:sp(?:\s[^>]*)?>[\s\S]*?<\/p:sp>/g)]
    .map((match, index) => {
      const shapeXml = match[0];
      const name = shapeXml.match(/<p:cNvPr\b[^>]*\bname="([^"]*)"/)?.[1] ?? `shape-${index + 1}`;
      return {
        shapeIndex: index + 1,
        shapeName: normalizeExtractedOfficeText(name),
        text: normalizeExtractedOfficeText(textRuns(shapeXml).join(' | '))
      };
    })
    .filter((shape) => shape.text);
  const tables = [...xml.matchAll(/<a:tbl(?:\s[^>]*)?>[\s\S]*?<\/a:tbl>/g)]
    .map((tableMatch, tableIndex) => ({
      tableIndex: tableIndex + 1,
      rows: [...tableMatch[0].matchAll(/<a:tr(?:\s[^>]*)?>[\s\S]*?<\/a:tr>/g)]
        .map((rowMatch, rowIndex) => ({
          rowNumber: rowIndex + 1,
          cells: [...rowMatch[0].matchAll(/<a:tc(?:\s[^>]*)?>[\s\S]*?<\/a:tc>/g)]
            .map((cellMatch) => normalizeExtractedOfficeText(textRuns(cellMatch[0]).join(' | ')))
        }))
    }));
  return { slideNumber, shapes, tables };
}

export function parseSharedStringsXml(xml: string): string[] {
  return [...xml.matchAll(/<si(?:\s[^>]*)?>[\s\S]*?<\/si>/g)]
    .map((match) => normalizeExtractedOfficeText(
      [...match[0].matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)]
        .map((textMatch) => normalizeExtractedOfficeText(textMatch[1] ?? ''))
        .join(' ')
    ));
}

function columnFromCellReference(reference: string): string {
  return reference.match(/^[A-Z]+/)?.[0] ?? '';
}

export function parseWorkbookSheetRows(
  xml: string,
  sharedStrings: string[]
): ExtractedWorkbookRow[] {
  return [...xml.matchAll(/<row\b[^>]*\br="(\d+)"[^>]*>[\s\S]*?<\/row>/g)]
    .map((rowMatch) => {
      const valuesByColumn: Record<string, string> = {};
      [...rowMatch[0].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)].forEach((cellMatch) => {
        const attributes = cellMatch[1] ?? '';
        const body = cellMatch[2] ?? '';
        const reference = attributes.match(/\br="([A-Z]+\d+)"/)?.[1] ?? '';
        const column = columnFromCellReference(reference);
        if (!column) return;
        const type = attributes.match(/\bt="([^"]+)"/)?.[1] ?? '';
        if (type === 'inlineStr') {
          valuesByColumn[column] = normalizeExtractedOfficeText(textRuns(body).join(' '));
          return;
        }
        const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '';
        const value = type === 's'
          ? sharedStrings[Number.parseInt(raw, 10)] ?? ''
          : normalizeExtractedOfficeText(raw);
        valuesByColumn[column] = normalizeExtractedOfficeText(value);
      });
      return {
        rowNumber: Number.parseInt(rowMatch[1] ?? '0', 10),
        valuesByColumn
      };
    });
}

export function selectApprovedWorkbookFields(
  rows: ExtractedWorkbookRow[],
  rowNumber: number,
  approvedColumns: string[]
): Record<string, string> {
  const row = rows.find((candidate) => candidate.rowNumber === rowNumber);
  if (!row) throw new Error(`APPROVED_WORKBOOK_ROW_MISSING:${rowNumber}`);
  return Object.fromEntries(
    approvedColumns.map((column) => {
      const value = row.valuesByColumn[column];
      if (!value) throw new Error(`APPROVED_WORKBOOK_FIELD_MISSING:${column}${rowNumber}`);
      return [column, value];
    })
  );
}

export function assertNoPrivateContactData(value: unknown): void {
  const serialized = JSON.stringify(value);
  if (
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized)
    || /(?:\+?966|00966|05)\s*[- ]?\d(?:[- ]?\d){7,}/.test(serialized)
  ) {
    throw new Error('PRIVATE_CONTACT_DATA_DETECTED');
  }
}
