import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { ParsedChunk } from "./pdf_parser";

const INDEX_NAME = "opic";
const DIMENSION = 768; // text-embedding-004

export const NAMESPACES = {
  SCRIPTS: "scripts",
  VOCABULARY: "vocabulary",
  QUESTIONS: "questions",
} as const;

type Namespace = (typeof NAMESPACES)[keyof typeof NAMESPACES];

const LEVEL_MAP: Record<string, string> = {
  IM1: "intermediate",
  IM2: "intermediate",
  IM3: "intermediate",
  IH: "advanced",
  AL: "advanced",
};

async function embedSingle(text: string, googleKey: string): Promise<number[]> {
  const MAX_RETRIES = 5;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${googleKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text }] },
          outputDimensionality: 768,
        }),
      }
    );
    if (res.ok) {
      const data = (await res.json()) as { embedding: { values: number[] } };
      return data.embedding.values;
    }
    if (res.status === 429) {
      const waitSec = 65 * (attempt + 1);
      console.log(`[embed] 429 rate limit – waiting ${waitSec}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      continue;
    }
    const err = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${err}`);
  }
  throw new Error("Embedding failed after max retries (rate limit)");
}

// Free tier: 100 req/min → sequential with 750ms gap
async function embedTexts(texts: string[], googleKey: string): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i++) {
    results.push(await embedSingle(texts[i], googleKey));
    if (i < texts.length - 1) await new Promise((r) => setTimeout(r, 750));
  }
  return results;
}

async function ensureIndex(pc: Pinecone) {
  const { indexes } = await pc.listIndexes();
  const exists = indexes?.some((idx) => idx.name === INDEX_NAME);
  if (!exists) {
    await pc.createIndex({
      name: INDEX_NAME,
      dimension: DIMENSION,
      metric: "cosine",
      spec: { serverless: { cloud: "aws", region: "us-east-1" } },
      waitUntilReady: true,
    });
  }
  return pc.index(INDEX_NAME);
}

export async function addParsedChunks(
  chunks: ParsedChunk[],
  namespace: Namespace,
  googleKey: string,
  pineconeKey: string
): Promise<void> {
  if (chunks.length === 0) return;

  const pc = new Pinecone({ apiKey: pineconeKey });
  const index = await ensureIndex(pc);
  const ns = index.namespace(namespace);

  const BATCH = 50;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const embeddings = await embedTexts(batch.map((c) => c.text), googleKey);
    const base = Date.now();
    await ns.upsert({
      records: batch.map((c, j) => ({
        id: `${namespace}_${base}_${i + j}`,
        values: embeddings[j],
        metadata: {
          text: c.text,
          topic: c.topic,
          topic_en: c.topic_en,
          topic_ko: c.topic_ko,
          topic_type: c.topic_type,
          level: c.level,
          page_num: c.page_num,
        },
      })),
    });
  }
}

export async function retrieveChunks(
  topic: string,
  questionType: string,
  targetLevel: string,
  googleKey: string,
  pineconeKey: string,
  topK = 4
): Promise<string[]> {
  try {
    const ns = new Pinecone({ apiKey: pineconeKey })
      .index(INDEX_NAME)
      .namespace(NAMESPACES.SCRIPTS);
    const chromaLevel = LEVEL_MAP[targetLevel] ?? "intermediate";

    const [qVec] = await embedTexts(
      [`${topic} ${questionType} OPIc ${targetLevel} English script`],
      googleKey
    );

    const toTexts = (matches: { metadata?: Record<string, unknown> }[]) =>
      matches.map((m) => m.metadata?.text as string).filter(Boolean);

    const r1 = await ns.query({
      vector: qVec,
      topK,
      filter: { topic_ko: { $eq: topic }, level: { $eq: chromaLevel } },
      includeMetadata: true,
    });
    if (r1.matches.length > 0) return toTexts(r1.matches);

    const r2 = await ns.query({
      vector: qVec,
      topK,
      filter: { level: { $eq: chromaLevel } },
      includeMetadata: true,
    });
    if (r2.matches.length > 0) return toTexts(r2.matches);

    const r3 = await ns.query({ vector: qVec, topK, includeMetadata: true });
    return toTexts(r3.matches);
  } catch {
    return [];
  }
}
