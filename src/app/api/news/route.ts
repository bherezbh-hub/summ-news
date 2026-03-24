import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  let where = {};
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where = { createdAt: { gte: start, lte: end } };
  }

  const items = await prisma.newsItem.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const body = await req.json();
  const item = await prisma.newsItem.create({
    data: {
      title: body.title,
      content: body.content,
      activities: JSON.stringify(body.activities ?? []),
      medicalFields: JSON.stringify(body.medicalFields ?? []),
      competition: JSON.stringify(body.competition ?? []),
      sectors: JSON.stringify(body.sectors ?? ["כללי"]),
      city: body.city,
      district: body.district,
      source: body.source,
      sentiment: body.sentiment,
      publishedDate: body.publishedDate,
      sourceUrl: body.sourceUrl,
      screenshotPath: body.screenshotPath,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.newsItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
