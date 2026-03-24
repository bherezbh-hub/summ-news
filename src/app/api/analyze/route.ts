import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/analysisPrompt";

export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your-anthropic-api-key-here") {
      return NextResponse.json({ error: "מפתח ANTHROPIC_API_KEY לא מוגדר ב-.env" }, { status: 500 });
    }

    const body = await req.json();
    const { url, imageUrl } = body as { url?: string; imageUrl?: string };

    if (!url && !imageUrl) {
      return NextResponse.json({ error: "Missing url or imageUrl" }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // --- צילום מסך: ניתוח ויזואלי ---
    if (imageUrl) {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url: imageUrl },
            },
            {
              type: "text",
              text: "נתח את הידיעה בצילום המסך לפי הפורמט המבוקש. החזר JSON בלבד.",
            },
          ],
        }],
      });

      const raw = (message.content[0] as { type: string; text: string }).text;
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return NextResponse.json({ error: "Failed to parse analysis", raw }, { status: 500 });
      const analysis = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ analysis });
    }

    // --- קישור: שליפת תוכן האתר ---
    let pageText = "";
    if (url) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        const pageRes = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const html = await pageRes.text();
        pageText = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 25000);
      } catch {
        pageText = "";
      }
    }

    const userContent = pageText
      ? `נתח את הידיעה הבאה (מקור: ${url}):\n\n${pageText}`
      : `נתח את הידיעה בקישור הבא:\n${url}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Failed to parse analysis", raw }, { status: 500 });

    const analysis = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ analysis, sourceUrl: url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
