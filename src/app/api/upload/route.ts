import { NextResponse } from "next/server";
import { supabase, SCREENSHOTS_BUCKET } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `screenshot_${Date.now()}.${file.name.split(".").pop()}`;

    const { error } = await supabase.storage
      .from(SCREENSHOTS_BUCKET)
      .upload(fileName, buffer, { contentType: file.type });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: urlData } = supabase.storage
      .from(SCREENSHOTS_BUCKET)
      .getPublicUrl(fileName);

    return NextResponse.json({ fileName, url: urlData.publicUrl });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
