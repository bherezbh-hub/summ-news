import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType } from "docx";
import ExcelJS from "exceljs";
import type { NewsItem } from "@prisma/client";

function parseJsonField(val: string): string[] {
  try { return JSON.parse(val); } catch { return [val]; }
}

export async function generateWordReport(items: NewsItem[]): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      text: `דוח ידיעות בריאות — ${new Date().toLocaleDateString("he-IL")}`,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  ];

  for (const item of items) {
    children.push(
      new Paragraph({
        text: item.title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2563EB" } },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "תוכן: ", bold: true }),
          new TextRun({ text: item.content }),
        ],
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "פעילויות: ", bold: true }),
          new TextRun({ text: parseJsonField(item.activities).join(" | ") }),
        ],
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "תחום רפואי: ", bold: true }),
          new TextRun({ text: parseJsonField(item.medicalFields).join(" | ") }),
        ],
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "סביבת תחרות: ", bold: true }),
          new TextRun({ text: parseJsonField(item.competition).join(" | ") }),
        ],
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "מגזרים: ", bold: true }),
          new TextRun({ text: parseJsonField(item.sectors).join(" | ") }),
        ],
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "ישוב: ", bold: true }),
          new TextRun({ text: item.city ?? "ארצי" }),
          new TextRun({ text: "   |   מחוז: ", bold: true }),
          new TextRun({ text: item.district ?? "" }),
        ],
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "מקור: ", bold: true }),
          new TextRun({ text: item.source ?? "" }),
          new TextRun({ text: "   |   סנטימנט: ", bold: true }),
          new TextRun({ text: item.sentiment ?? "" }),
          new TextRun({ text: "   |   תאריך פרסום: ", bold: true }),
          new TextRun({ text: item.publishedDate ?? "" }),
        ],
        spacing: { after: 80 },
      }),
      ...(item.sourceUrl
        ? [new Paragraph({
            children: [
              new TextRun({ text: "קישור: ", bold: true }),
              new TextRun({ text: item.sourceUrl, style: "Hyperlink" }),
            ],
            spacing: { after: 80 },
          })]
        : []),
    );
  }

  const doc = new Document({ sections: [{ properties: { page: { textDirection: "lr" } as never }, children }] });
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
  headerRow.font = { bold: true, size: 11 };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
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
