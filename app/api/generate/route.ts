import { NextRequest, NextResponse } from "next/server";
import { retrieveChunks } from "@/lib/rag_engine";
import { generateScript } from "@/lib/script_generator";
import { TopicProfile } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const googleKey = req.headers.get("x-google-key") ?? "";
  const pineconeKey = req.headers.get("x-pinecone-key") ?? "";

  if (!googleKey || !pineconeKey) {
    return NextResponse.json({ error: "Missing API keys" }, { status: 400 });
  }

  const body = (await req.json()) as {
    topic: string;
    questionType: string;
    targetLevel: string;
    topicProfile: TopicProfile;
  };

  const { topic, questionType, targetLevel, topicProfile } = body;

  try {
    const ragChunks = await retrieveChunks(topic, questionType, targetLevel, googleKey, pineconeKey);

    const script = await generateScript(
      topic,
      questionType,
      targetLevel,
      topicProfile,
      ragChunks,
      googleKey
    );

    return NextResponse.json({ script });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
