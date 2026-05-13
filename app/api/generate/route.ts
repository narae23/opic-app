import { NextRequest, NextResponse } from "next/server";
import { generateScript } from "@/lib/script_generator";
import { TopicProfile } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const googleKey = req.headers.get("x-google-key") || process.env.GOOGLE_DEFAULT_API_KEY || "";

  if (!googleKey) {
    return NextResponse.json({ error: "Google API 키가 필요합니다. /setup에서 키를 입력해주세요." }, { status: 400 });
  }

  const body = (await req.json()) as {
    topic: string;
    questionType: string;
    targetLevel: string;
    topicProfile: TopicProfile;
  };

  const { topic, questionType, targetLevel, topicProfile } = body;

  try {
    const script = await generateScript(
      topic,
      questionType,
      targetLevel,
      topicProfile,
      [],
      googleKey
    );

    return NextResponse.json({ script });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
