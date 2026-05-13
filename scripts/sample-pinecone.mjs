import { Pinecone } from "@pinecone-database/pinecone";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index("opic");

// 랜덤 벡터로 쿼리해서 샘플 추출
const randomVec = Array.from({ length: 768 }, () => Math.random() * 2 - 1);

console.log("=== SCRIPTS 네임스페이스 샘플 ===");
const scripts = await index.namespace("scripts").query({
  vector: randomVec,
  topK: 3,
  includeMetadata: true,
});
scripts.matches.forEach((m, i) => {
  console.log(`\n[${i + 1}] topic: ${m.metadata?.topic_ko} / level: ${m.metadata?.level}`);
  console.log(m.metadata?.text);
});

console.log("\n=== QUESTIONS 네임스페이스 샘플 ===");
const questions = await index.namespace("questions").query({
  vector: randomVec,
  topK: 3,
  includeMetadata: true,
});
questions.matches.forEach((m, i) => {
  console.log(`\n[${i + 1}] topic: ${m.metadata?.topic_ko} / level: ${m.metadata?.level}`);
  console.log(m.metadata?.text);
});
