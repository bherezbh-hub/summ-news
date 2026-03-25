import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/analysisPrompt";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

function extractFirstJson(str: string): string | null {
  const start = str.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < str.length; i++) {
    const c = str[i];
    if (escape) { escape = false; continue; }
    if (c === "\\" && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return str.substring(start, i + 1); }
  }
  return null;
}

function parseAnalysis(raw: string): Record<string, unknown> {
  // ניסיון 1: קריאת JSON ישיר
  try { return JSON.parse(raw.trim()); } catch {}
  // ניסיון 2: חילוץ מתוך code block (```json ... ```)
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) try { return JSON.parse(codeBlock[1].trim()); } catch {}
  // ניסיון 3: חילוץ מדויק של אובייקט JSON הראשון לפי עומק סוגריים
  const extracted = extractFirstJson(raw);
  if (extracted) try { return JSON.parse(extracted); } catch {}
  throw new Error("Failed to parse analysis: " + raw.substring(0, 300));
}

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
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "url", url: imageUrl } },
              { type: "text", text: "נתח את הידיעה בצילום המסך לפי הפורמט המבוקש. החזר JSON בלבד." },
            ],
          },
          { role: "assistant", content: "{" },
        ],
      });

      const raw = "{" + (message.content[0] as { type: string; text: string }).text;
      try {
        const analysis = parseAnalysis(raw);
        return NextResponse.json({ analysis });
      } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
      }
    }

    // --- קישור: שליפת תוכן האתר ---
    let pageText = "";
    if (url) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const pageRes = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cache-Control": "no-cache",
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const html = await pageRes.text();

        // ניסיון 1: Mozilla Readability — מחלץ את גוף המאמר בלבד
        try {
          const dom = new JSDOM(html, { url });
          const reader = new Readability(dom.window.document);
          const article = reader.parse();
          if (article?.textContent) {
            pageText = article.textContent.replace(/\s+/g, " ").trim().substring(0, 30000);
          }
        } catch {
          pageText = "";
        }

        // ניסיון 2: strip HTML רגיל אם Readability נכשל
        if (!pageText) {
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
        }
      } catch {
        pageText = "";
      }
    }

    if (!pageText) {
      return NextResponse.json(
        { error: "לא הצלחתי לקרוא את תוכן הדף. נסה להדביק צילום מסך במקום." },
        { status: 422 }
      );
    }

    const userContent = `נתח את הידיעה הבאה (מקור: ${url}):\n\n${pageText}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: userContent },
        { role: "assistant", content: "{" },
      ],
    });

    const raw = "{" + (message.content[0] as { type: string; text: string }).text;
    try {
      const analysis = parseAnalysis(raw);
      return NextResponse.json({ analysis, sourceUrl: url, _debug_page: pageText.substring(0, 300) });
    } catch (e) {
      return NextResponse.json({ error: String(e), raw: raw.substring(0, 500), _debug_page: pageText.substring(0, 300) }, { status: 500 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
