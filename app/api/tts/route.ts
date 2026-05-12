import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/tts";

export async function POST(req: NextRequest) {
  const googleKey = req.headers.get("x-google-key") ?? "";

  if (!googleKey) {
    return NextResponse.json({ error: "Missing Google API key" }, { status: 400 });
  }

  const { text } = (await req.json()) as { text: string };

  if (!text?.trim()) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const audioContent = await synthesizeSpeech(text, googleKey);
  return NextResponse.json({ audioContent });
}
