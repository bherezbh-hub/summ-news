import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun,
  PageSize, convertMillimetersToTwip,
} from "docx";
import ExcelJS from "exceljs";
import type { NewsItem } from "@prisma/client";

function parseJsonField(val: string): string[] {
  try { return JSON.parse(val); } catch { return [val]; }
}

function formatHebrewDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

// ────────────────────────────────────────
// Word Report
// ────────────────────────────────────────

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch { return null; }
}

function getImageDimensions(buf: Buffer): { width: number; height: number } {
  // PNG: signature (8 bytes) + IHDR chunk (4+4+4+4 = 16 bytes), width at 16, height at 20
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG: scan for SOF0/SOF2 markers
  if (buf[0] === 0xFF && buf[1] === 0xD8) {
    let i = 2;
    while (i < buf.length - 8) {
      if (buf[i] === 0xFF && (buf[i + 1] === 0xC0 || buf[i + 1] === 0xC2)) {
        return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return { width: 1080, height: 1920 }; // fallback: mobile screenshot ratio
}

function getImageType(buf: Buffer): "png" | "jpg" | "gif" | "bmp" {
  if (buf[0] === 0x89 && buf[1] === 0x50) return "png";
  if (buf[0] === 0xFF && buf[1] === 0xD8) return "jpg";
  if (buf[0] === 0x47 && buf[1] === 0x49) return "gif";
  return "png";
}

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

function makeTableRow(rowNum: number, content: string): TableRow {
  return new TableRow({
    children: [
      // Left cell — row number
      new TableCell({
        width: { size: 511, type: WidthType.DXA },
        borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          children: [new TextRun({ text: String(rowNum), bold: true, rightToLeft: true })],
        })],
      }),
      // Right cell — content
      new TableCell({
        width: { size: 9955, type: WidthType.DXA },
        borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          children: [new TextRun({ text: content, rightToLeft: true })],
        })],
      }),
    ],
  });
}

export async function generateWordReport(items: NewsItem[]): Promise<Buffer> {
  const screenshotItems = items.filter(i => i.screenshotPath);
  const targetItems = screenshotItems.length > 0 ? screenshotItems : items;
  const today = new Date();

  const children: (Paragraph | Table)[] = [
    // Main title
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 240 },
      children: [new TextRun({
        text: `צילומי מסך – ${formatHebrewDate(today)}`,
        bold: true,
        size: 28,
        rightToLeft: true,
      })],
    }),
  ];

  for (let i = 0; i < targetItems.length; i++) {
    const item = targetItems[i];

    // Heading — item title
    children.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 240, after: 0 },
      children: [new TextRun({
        text: item.title,
        bold: true,
        size: 32,
        color: "2E74B5",
        rightToLeft: true,
      })],
    }));

    // Data table
    const activities = parseJsonField(item.activities).join(" | ");
    const medicalFields = parseJsonField(item.medicalFields).join(" | ");
    const competition = parseJsonField(item.competition).join(" | ");
    const sectors = parseJsonField(item.sectors).join(" | ");
    const lastRow = [
      item.city ? `ישוב: ${item.city}` : "",
      item.source ? `מקור: ${item.source}` : "",
      item.publishedDate ? `תאריך: ${item.publishedDate}` : "",
    ].filter(Boolean).join("   |   ");

    children.push(new Table({
      width: { size: 10466, type: WidthType.DXA },
      borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideH: NO_BORDER, insideV: NO_BORDER },
      rows: [
        makeTableRow(1, item.content),
        makeTableRow(2, `פעילויות ושירותים: ${activities}`),
        makeTableRow(3, `תחום רפואי: ${medicalFields}`),
        makeTableRow(4, `סביבת תחרות: ${competition}`),
        makeTableRow(5, `מגזרים: ${sectors}`),
        makeTableRow(6, lastRow),
      ],
    }));

    // Screenshot image
    if (item.screenshotPath) {
      const imgBuf = await fetchImageBuffer(item.screenshotPath);
      if (imgBuf) {
        const dims = getImageDimensions(imgBuf);
        const imgType = getImageType(imgBuf);
        const targetWidthPx = 576; // 6 inches at 96dpi
        const targetHeightPx = Math.round((dims.height / dims.width) * targetWidthPx);
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 120 },
          children: [new ImageRun({
            data: imgBuf,
            transformation: { width: targetWidthPx, height: targetHeightPx },
            type: imgType,
          })],
        }));
      }
    }

    // Separator (not after last item)
    if (i < targetItems.length - 1) {
      children.push(new Paragraph({
        spacing: { before: 120, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2E74B5", space: 1 } },
        children: [],
      }));
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
          margin: { top: 720, bottom: 720, left: 720, right: 720 },
        },
      },
      children,
    }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

// ────────────────────────────────────────
// Excel Report
// ────────────────────────────────────────

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top:    { style: "thin", color: { argb: "FFAAAAAA" } },
  bottom: { style: "thin", color: { argb: "FFAAAAAA" } },
  left:   { style: "thin", color: { argb: "FFAAAAAA" } },
  right:  { style: "thin", color: { argb: "FFAAAAAA" } },
};

export async function generateExcelReport(items: NewsItem[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("ידיעות יומיות");

  // RTL + freeze header row
  ws.views = [{ state: "frozen", ySplit: 1, rightToLeft: true }];

  // Column definitions
  const columns = [
    { header: "מזהה",             key: "A", width: 8 },
    { header: "נושא הידיעה",      key: "B", width: 38 },
    { header: "תוכן הידיעה",      key: "C", width: 80 },
    { header: "פעילויות ושירותים", key: "D", width: 32 },
    { header: "התחום הרפואי",      key: "E", width: 22 },
    { header: "סביבת התחרות",     key: "F", width: 28 },
    { header: "מגזרים",           key: "G", width: 18 },
    { header: "ישוב",             key: "H", width: 14 },
    { header: "מחוז",             key: "I", width: 12 },
    { header: "הערות",            key: "J", width: 22 },
    { header: "מקור מידע",        key: "K", width: 18 },
    { header: "סנטימנט",          key: "L", width: 12 },
    { header: "תאריך פרסום",      key: "M", width: 16 },
    { header: "קישור פנימי",       key: "N", width: 45 },
    { header: "קישור חיצוני",      key: "O", width: 45 },
  ];

  ws.columns = columns.map(c => ({ key: c.key, width: c.width }));

  // Header row
  const headerValues = columns.map(c => c.header);
  const headerRow = ws.addRow(headerValues);
  headerRow.height = 32;
  headerRow.eachCell(cell => {
    cell.font      = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3864" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border    = THIN_BORDER;
  });

  // Data rows
  items.forEach((item, idx) => {
    const rowIdx = idx + 2; // 1=header, data starts at 2
    const bgColor = rowIdx % 2 === 0 ? "FFEEF2F7" : "FFFFFFFF";
    const link = item.sourceUrl ?? "";

    const rowData = [
      String(idx + 1),
      item.title,
      item.content,
      parseJsonField(item.activities).join(" | "),
      parseJsonField(item.medicalFields).join(" | "),
      parseJsonField(item.competition).join(" | "),
      parseJsonField(item.sectors).join(" | "),
      item.city ?? "ארצי",
      item.district ?? "",
      "",           // הערות — ריק
      item.source ?? "",
      item.sentiment ?? "",
      item.publishedDate ?? "",
      link,         // קישור פנימי
      link,         // קישור חיצוני
    ];

    const row = ws.addRow(rowData);
    row.height = 110;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const isLink = colNumber === 14 || colNumber === 15;
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
      cell.border = THIN_BORDER;

      if (isLink) {
        cell.font      = { name: "Arial", size: 10, color: { argb: "FF1155CC" }, underline: true };
        cell.alignment = { horizontal: "left", vertical: "top", wrapText: false };
        if (link) {
          cell.value = { text: link, hyperlink: link } as ExcelJS.CellHyperlinkValue;
        }
      } else {
        cell.font      = { name: "Arial", size: 10 };
        cell.alignment = { horizontal: "right", vertical: "top", wrapText: true };
      }
    });
  });

  return Buffer.from(await wb.xlsx.writeBuffer()) as Buffer;
}
