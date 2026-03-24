import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWordReport, generateExcelReport } from "@/lib/reportGenerator";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "word";
  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const items = await prisma.newsItem.findMany({
    where: { createdAt: { gte: start, lte: end } },
    orderBy: { createdAt: "asc" },
  });

  if (items.length === 0) {
    return NextResponse.json({ error: "No items for this date" }, { status: 404 });
  }

  const dateStr = date.replace(/-/g, "");

  if (format === "excel") {
    const buffer = await generateExcelReport(items);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="health-news-${dateStr}.xlsx"`,
      },
    });
  }

  const buffer = await generateWordReport(items);
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="health-news-${dateStr}.docx"`,
    },
  });
}
