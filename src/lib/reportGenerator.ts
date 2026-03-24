import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun,
  ShadingType, convertInchesToTwip, PageOrientation,
} from "docx";
import ExcelJS from "exceljs";
import type { NewsItem } from "@prisma/client";

function parseJsonField(val: string): string[] {
  try { return JSON.parse(val); } catch { return [val]; }
}

function hebrewDate(): string {
  return new Date().toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" });
}

const RTL = { rightToLeft: true };
const GRAY = "E8E8E8";
const DAVID = "David";

function fieldRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        shading: { type: ShadingType.CLEAR, fill: GRAY },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, font: DAVID, size: 20 })], ...RTL })],
        width: { size: 30, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: value, font: DAVID, size: 20 })], ...RTL })],
        width: { size: 70, type: WidthType.PERCENTAGE },
      }),
    ],
  });
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch { return null; }
}

export async function generateWordReport(items: NewsItem[]): Promise<Buffer> {
  const screenshotItems = items.filter(i => i.screenshotPath);
  const targetItems = screenshotItems.length > 0 ? screenshotItems : items;

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      children: [new TextRun({ text: `דוח יומי – ${hebrewDate()}`, bold: true, font: DAVID, size: 36 })],
      alignment: AlignmentType.CENTER,
      ...RTL,
      spacing: { after: 400 },
    }),
  ];

  for (let i = 0; i < targetItems.length; i++) {
    const item = targetItems[i];
    const idx = String(i + 1).padStart(3, "0");

    // News title
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `#${idx} | ${item.title}`, bold: true, font: DAVID, size: 26 })],
        ...RTL,
        spacing: { before: 300, after: 120 },
      })
    );

    // Content
    children.push(
      new Paragraph({
        children: [new TextRun({ text: item.content, font: DAVID, size: 22 })],
        ...RTL,
        spacing: { after: 200, line: 276 },
      })
    );

    // Fields table
    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        fieldRow("פעילויות ושירותים", parseJsonField(item.activities).join(" | ")),
        fieldRow("תחום רפואי", parseJsonField(item.medicalFields).join(" | ")),
        fieldRow("סביבת תחרות", parseJsonField(item.competition).join(" | ")),
        fieldRow("מגזרים", parseJsonField(item.sectors).join(" | ")),
        fieldRow("ישוב", item.city ?? "ארצי"),
        fieldRow("מקור מידע", item.source ?? ""),
        fieldRow("סנטימנט", item.sentiment ?? ""),
        fieldRow("תאריך פרסום", item.publishedDate ?? ""),
        fieldRow("קישור", item.sourceUrl ?? ""),
      ],
    });
    children.push(table);

    // Screenshot
    if (item.screenshotPath) {
      const imgBuffer = await fetchImageBuffer(item.screenshotPath);
      if (imgBuffer) {
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imgBuffer,
                transformation: { width: convertInchesToTwip(6) / 914400 * 914400, height: 400 },
                type: "png",
              }),
            ],
            spacing: { before: 200, after: 200 },
          })
        );
      }
    }

    // Separator
    if (i < targetItems.length - 1) {
      children.push(
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "AAAAAA" } },
          spacing: { before: 200, after: 200 },
          children: [],
        })
      );
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

export async function generateExcelReport(items: NewsItem[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("ידיעות יומיות", { views: [{ rightToLeft: true }] });

  const headers = [
    "נושא הידיעה", "תוכן הידיעה", "פעילויות ושירותים", "התחום הרפואי",
    "סביבת התחרות", "מגזרים", "ישוב", "מחוז", "מקור מידע",
    "סנטימנט", "תאריך פרסום", "קישור",
  ];

  sheet.addRow(headers);
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  headerRow.height = 30;

  for (const item of items) {
    const row = sheet.addRow([
      item.title,
      item.content,
      parseJsonField(item.activities).join(" | "),
      parseJsonField(item.medicalFields).join(" | "),
      parseJsonField(item.competition).join(" | "),
      parseJsonField(item.sectors).join(" | "),
      item.city ?? "ארצי",
      item.district ?? "",
      item.source ?? "",
      item.sentiment ?? "",
      item.publishedDate ?? "",
      item.sourceUrl ?? "",
    ]);
    row.alignment = { wrapText: true, vertical: "top", horizontal: "right" };
    row.height = 60;
  }

  const colWidths = [40, 70, 35, 25, 30, 20, 20, 20, 20, 15, 20, 40];
  colWidths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

  return Buffer.from(await workbook.xlsx.writeBuffer()) as Buffer;
}
