import { GoogleGenerativeAI } from "@google/generative-ai";
import { TopicProfile } from "./storage";

export interface GeneratedScript {
  question: string;
  sentences: { id: number; text: string }[];
  pivot_tags: string[];
}

const LEVEL_WORD_TARGETS: Record<string, number> = {
  IM1: 1450,
  IM2: 1850,
  IM3: 1950,
  IH: 2150,
  AL: 3100,
};

function extractJson(raw: string): string {
  const stripped = raw.trim();
  // Strip markdown code fences if present
  const fenced = stripped.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Extract first {...} block
  const braceMatch = stripped.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];
  return stripped;
}

export async function generateScript(
  topic: string,
  questionType: string,
  targetLevel: string,
  topicProfile: TopicProfile,
  ragChunks: string[],
  googleKey: string
): Promise<GeneratedScript> {
  const genAI = new GoogleGenerativeAI(googleKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction:
      "You are an OPIc exam expert. Generate natural, personalized English speaking scripts. Always respond with valid JSON only.",
  });

  const targetWords = LEVEL_WORD_TARGETS[targetLevel] ?? 2000;
  const sentenceCount = Math.round(targetWords / 20);

  const ragContext =
    ragChunks.length > 0
      ? `\n\nReference scripts for style and vocabulary:\n${ragChunks.map((c, i) => `[${i + 1}] ${c}`).join("\n\n")}`
      : "";

  const prompt = `Generate a personalized OPIc speaking script with the following details:

Target Level: ${targetLevel} (aim for ~${targetWords} total words, approximately ${sentenceCount} sentences)
Topic: ${topic}
Question Type: ${questionType}
Personal Keywords: ${topicProfile.keywords.join(", ") || "N/A"}
Personal Experience: ${topicProfile.personal_experience || "N/A"}
Motivation/Reason: ${topicProfile.reason || "N/A"}
${ragContext}

Respond with ONLY this JSON structure, no other text:
{
  "question": "the OPIc question in English",
  "sentences": [
    {"id": 1, "text": "First sentence."},
    {"id": 2, "text": "Second sentence."}
  ],
  "pivot_tags": ["Korean tag 1", "Korean tag 2"]
}

Requirements:
- Natural and conversational (not essay-like)
- Incorporate the personal keywords and experience
- pivot_tags: 2-4 key memory anchors in Korean
- Vary sentence length`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();

  if (!raw || raw.trim() === "") {
    throw new Error("Gemini returned empty response. Check your API key or try again.");
  }

  const jsonText = extractJson(raw);

  try {
    return JSON.parse(jsonText) as GeneratedScript;
  } catch {
    throw new Error(`JSON parse failed. Model response: ${raw.slice(0, 300)}`);
  }
}
