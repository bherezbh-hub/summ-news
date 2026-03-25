import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) return NextResponse.json({ error: "missing url" });
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "he-IL,he;q=0.9",
      "Cache-Control": "no-cache",
    },
  });
  const html = await res.text();
  const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ?? "not found";
  const jsonLdMatches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  const blocks = jsonLdMatches.map((m, i) => {
    try {
      const data = JSON.parse(m[1]);
      return { i, type: data["@type"], articleBodyPreview: data.articleBody?.substring(0, 200) ?? null };
    } catch (e) {
      return { i, error: String(e).substring(0, 100) };
    }
  });
  return NextResponse.json({ ogTitle, jsonLdBlocks: blocks, htmlSize: html.length });
}
