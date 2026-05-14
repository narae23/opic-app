/**
 * Standalone embed script — clears Pinecone namespaces, parses PDF, re-embeds.
 * Usage: PINECONE_API_KEY=... GOOGLE_API_KEY=... node scripts/embed-pdf.mjs
 */
import { PDFParse } from "pdf-parse";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";
import path from "path";

const PINECONE_KEY = process.env.PINECONE_API_KEY;
const GOOGLE_KEY = process.env.GOOGLE_API_KEY;
const INDEX_NAME = "opic";
const NAMESPACES = ["scripts", "vocabulary", "questions"];
const HANGUL_RE = /[가-힣]/;

if (!PINECONE_KEY || !GOOGLE_KEY) {
  console.error("Missing PINECONE_API_KEY or GOOGLE_API_KEY env vars");
  process.exit(1);
}

// ─── PDF Parser ──────────────────────────────────────────────────────────────

function detectTopicType(text) {
  if (text.includes("공통형")) return "common";
  if (text.includes("선택형")) return "selective";
  return null;
}

function detectLevel(text) {
  if (/\[Adv\]/i.test(text)) return "advanced";
  if (/\[Int\]/i.test(text)) return "intermediate";
  return null;
}

function extractTopicNames(lines) {
  for (const line of lines.slice(0, 10)) {
    const t = line.trim();
    if (!t) continue;
    const m1 = t.match(/^([A-Z][A-Za-z\s\/&\-]{1,40}?)\s+([가-힣][가-힣\s\/]{1,30})$/);
    if (m1) return { en: m1[1].trim(), ko: m1[2].trim() };
    const m2 = t.match(/^([가-힣][가-힣\s\/]{1,30})\s+([A-Z][A-Za-z\s\/&\-]{1,40})$/);
    if (m2) return { en: m2[2].trim(), ko: m2[1].trim() };
  }
  return null;
}

function classifyPage(lines) {
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length < 3) return "skip";

  let questionLines = 0, koreanShortLines = 0, longEnglishLines = 0;
  const joined = nonEmpty.join(" ");

  for (const line of nonEmpty) {
    const t = line.trim();
    if (!t) continue;
    if (t.endsWith("?") && /^[A-Z]/.test(t) && t.length > 15) questionLines++;
    if (HANGUL_RE.test(t) && t.length < 50) koreanShortLines++;
    if (t.length >= 50 && !HANGUL_RE.test(t) && /^[A-Z"(]/.test(t)) longEnglishLines++;
  }

  if (/I'?d like to give you a situation|I'?m sorry,? but there is a problem/i.test(joined)) return "skip";

  const commandQuestions = nonEmpty.filter(l =>
    /^\s*(Tell me|Describe|Talk about|Explain|Discuss|Compare|What\b|How\b|Who\b|Where\b|When\b)/i.test(l)
  ).length;

  if (questionLines >= 2 || commandQuestions >= 2) return "question";
  if (koreanShortLines >= 4 && longEnglishLines < 3) return "vocabulary";
  if (longEnglishLines >= 3 && questionLines === 0 && commandQuestions === 0) return "script";
  return "skip";
}

function extractScriptText(lines) {
  return lines.map(l => l.trim())
    .filter(t => t.length >= 50 && !HANGUL_RE.test(t) && /^[A-Z"(]/.test(t))
    .join(" ");
}

function extractVocabText(lines) {
  return lines.map(l => l.trim()).filter(t => t.length > 2).join("\n");
}

function extractQuestionText(lines) {
  return lines.map(l => l.trim())
    .filter(t => t.length > 10 && !HANGUL_RE.test(t) && /^[A-Z"(]/.test(t))
    .join("\n");
}

async function parsePdf(buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  const pageTexts = result.pages.sort((a, b) => a.num - b.num).map(p => p.text);

  const out = { scripts: [], vocabulary: [], questions: [], skipped: 0, total_pages: pageTexts.length };

  let curTopic = "Unknown", curTopicEn = "", curTopicKo = "";
  let curTopicType = "unknown", curLevel = "unknown";

  for (let i = 0; i < pageTexts.length; i++) {
    const raw = pageTexts[i];
    const lines = raw.split("\n");

    const tt = detectTopicType(raw);
    if (tt) curTopicType = tt;
    const lv = detectLevel(raw);
    if (lv) curLevel = lv;
    const names = extractTopicNames(lines);
    if (names) { curTopicEn = names.en; curTopicKo = names.ko; curTopic = names.ko || names.en; }

    const pageType = classifyPage(lines);
    if (pageType === "skip") { out.skipped++; continue; }

    const base = { topic: curTopic, topic_en: curTopicEn, topic_ko: curTopicKo, topic_type: curTopicType, level: curLevel, page_num: i + 1 };

    if (pageType === "script") {
      const text = extractScriptText(lines);
      if (text.length >= 50) out.scripts.push({ ...base, text }); else out.skipped++;
    } else if (pageType === "vocabulary") {
      const text = extractVocabText(lines);
      if (text.length >= 10) out.vocabulary.push({ ...base, text }); else out.skipped++;
    } else {
      const text = extractQuestionText(lines);
      if (text.length >= 10) out.questions.push({ ...base, text }); else out.skipped++;
    }
  }

  return out;
}

// ─── Embedding ────────────────────────────────────────────────────────────────

async function embedSingle(text, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GOOGLE_KEY}`,
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
      const data = await res.json();
      return data.embedding.values;
    }
    if (res.status === 429) {
      const wait = 65 * (attempt + 1);
      console.log(`  [rate limit] waiting ${wait}s...`);
      await new Promise(r => setTimeout(r, wait * 1000));
      continue;
    }
    throw new Error(`Embed API ${res.status}: ${await res.text()}`);
  }
  throw new Error("Embed failed after retries");
}

async function upsertBatch(nsIndex, chunks, namespace) {
  const BATCH = 50;
  let done = 0;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const embeddings = [];
    for (let j = 0; j < batch.length; j++) {
      embeddings.push(await embedSingle(batch[j].text));
      if (j < batch.length - 1) await new Promise(r => setTimeout(r, 750));
    }
    const base = Date.now();
    await nsIndex.upsert({
      records: batch.map((c, j) => ({
        id: `${namespace}_${base}_${i + j}`,
        values: embeddings[j],
        metadata: { text: c.text, topic: c.topic, topic_en: c.topic_en, topic_ko: c.topic_ko, topic_type: c.topic_type, level: c.level, page_num: c.page_num },
      })),
    });
    done += batch.length;
    console.log(`  [${namespace}] ${done}/${chunks.length} upserted`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const pc = new Pinecone({ apiKey: PINECONE_KEY });
const idx = pc.index(INDEX_NAME);

console.log("=== Clearing Pinecone namespaces ===");
for (const ns of NAMESPACES) {
  console.log(`  Deleting all vectors in "${ns}"...`);
  try {
    await idx.namespace(ns).deleteAll();
    console.log(`  Deleted "${ns}"`);
  } catch (e) {
    console.log(`  "${ns}" may already be empty: ${e.message}`);
  }
}

console.log("\n=== Parsing PDF ===");
const pdfDir = path.join(process.cwd(), "data", "raw_pdfs");
const files = (await fs.readdir(pdfDir)).filter(f => f.toLowerCase().endsWith(".pdf"));
console.log(`Found ${files.length} PDF(s): ${files.join(", ")}`);

for (const file of files) {
  console.log(`\nParsing: ${file}`);
  const buffer = await fs.readFile(path.join(pdfDir, file));
  const parsed = await parsePdf(buffer);
  console.log(`  pages: ${parsed.total_pages}, scripts: ${parsed.scripts.length}, vocab: ${parsed.vocabulary.length}, questions: ${parsed.questions.length}, skipped: ${parsed.skipped}`);

  console.log("\n=== Embedding scripts ===");
  await upsertBatch(idx.namespace("scripts"), parsed.scripts, "scripts");

  console.log("\n=== Embedding vocabulary ===");
  await upsertBatch(idx.namespace("vocabulary"), parsed.vocabulary, "vocabulary");

  console.log("\n=== Embedding questions ===");
  await upsertBatch(idx.namespace("questions"), parsed.questions, "questions");
}

console.log("\n=== Done ===");
