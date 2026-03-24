import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/analysisPrompt";

export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your-anthropic-api-key-here") {
      return NextResponse.json({ error: "מפתח ANTHROPIC_API_KEY לא מוגדר ב-.env" }, { status: 500 });
    }

    const body = await req.json();
    const { url, text } = body as { url?: string; text?: string };

    if (!url && !text) {
      return NextResponse.json({ error: "Missing url or text" }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let userContent = "";
    if (url) {
      userContent = `נתח את הידיעה בקישור הבא:\n${url}`;
    } else if (text) {
      userContent = `נתח את הטקסט הבא:\n${text}`;
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text;

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse analysis", raw }, { status: 500 });
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ analysis, sourceUrl: url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
