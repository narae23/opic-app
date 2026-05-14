import { PDFParse } from "pdf-parse";

export type TopicType = "common" | "selective" | "unknown";
export type Level = "intermediate" | "advanced" | "unknown";
export type PageType = "script" | "vocabulary" | "question" | "skip";

export interface ParsedChunk {
  text: string;
  topic: string;
  topic_en: string;
  topic_ko: string;
  topic_type: TopicType;
  level: Level;
  page_num: number;
}

export interface ParseResult {
  scripts: ParsedChunk[];
  vocabulary: ParsedChunk[];
  questions: ParsedChunk[];
  skipped: number;
  total_pages: number;
}

const HANGUL_RE = /[가-힣]/;

function detectTopicType(text: string): TopicType | null {
  if (text.includes("공통형")) return "common";
  if (text.includes("선택형")) return "selective";
  return null;
}

function detectLevel(text: string): Level | null {
  if (/\[Adv\]/i.test(text)) return "advanced";
  if (/\[Int\]/i.test(text)) return "intermediate";
  return null;
}

function extractTopicNames(lines: string[]): { en: string; ko: string } | null {
  for (const line of lines.slice(0, 10)) {
    const t = line.trim();
    if (!t) continue;
    // "Restaurant 음식점" or "Free Time 자유시간"
    const m1 = t.match(/^([A-Z][A-Za-z\s\/&\-]{1,40}?)\s+([가-힣][가-힣\s\/]{1,30})$/);
    if (m1) return { en: m1[1].trim(), ko: m1[2].trim() };
    // "음식점 Restaurant"
    const m2 = t.match(/^([가-힣][가-힣\s\/]{1,30})\s+([A-Z][A-Za-z\s\/&\-]{1,40})$/);
    if (m2) return { en: m2[2].trim(), ko: m2[1].trim() };
  }
  return null;
}

function classifyPage(lines: string[]): PageType {
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length < 3) return "skip";

  let questionLines = 0;
  let koreanShortLines = 0;
  let longEnglishLines = 0;

  for (const line of nonEmpty) {
    const t = line.trim();
    if (!t) continue;
    if (t.endsWith("?") && /^[A-Z]/.test(t) && t.length > 15) questionLines++;
    if (HANGUL_RE.test(t) && t.length < 50) koreanShortLines++;
    if (t.length >= 50 && !HANGUL_RE.test(t) && /^[A-Z"(]/.test(t)) longEnglishLines++;
  }

  const joined = nonEmpty.join(" ");

  // Skip role-play scenario setup pages and RP response dialogue pages
  if (/I'?d like to give you a situation|I'?m sorry,? but there is a problem/i.test(joined)) return "skip";
  if (nonEmpty.slice(0, 5).some((l) => /^\s*Hi,|^\s*Hello,/i.test(l))) return "skip";

  // Command-form questions (Tell me, Describe, Explain...)
  const commandQuestions = nonEmpty.filter((l) =>
    /^\s*(Tell me|Describe|Talk about|Explain|Discuss|Compare|What\b|How\b|Who\b|Where\b|When\b)/i.test(l)
  ).length;

  // Questions: "?" endings OR command-form question sentences
  if (questionLines >= 2 || commandQuestions >= 2) return "question";

  // Vocabulary: many short Korean lines, few long English lines
  if (koreanShortLines >= 4 && longEnglishLines < 3) return "vocabulary";

  // Script: substantial English paragraphs with NO question sentences
  if (longEnglishLines >= 3 && questionLines === 0 && commandQuestions === 0) return "script";

  return "skip";
}

function extractScriptText(lines: string[]): string {
  return lines
    .map((l) => l.trim())
    .filter((t) => t.length >= 50 && !HANGUL_RE.test(t) && /^[A-Z"(]/.test(t))
    .join(" ");
}

function extractVocabText(lines: string[]): string {
  return lines
    .map((l) => l.trim())
    .filter((t) => t.length > 2)
    .join("\n");
}

function extractQuestionText(lines: string[]): string {
  return lines
    .map((l) => l.trim())
    .filter((t) => t.length > 10 && !HANGUL_RE.test(t) && /^[A-Z"(]/.test(t))
    .join("\n");
}

/**
 * Extract per-page text using the new pdf-parse PDFParse class API.
 * Returns one string per PDF page, in order.
 */
async function extractPageTexts(buffer: Buffer): Promise<string[]> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  // result.pages is Array<{ num: number; text: string }>
  return result.pages
    .sort((a, b) => a.num - b.num)
    .map((p) => p.text);
}

export async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  const pageTexts = await extractPageTexts(buffer);

  const result: ParseResult = {
    scripts: [],
    vocabulary: [],
    questions: [],
    skipped: 0,
    total_pages: pageTexts.length,
  };

  // Carry-forward state — a topic/level block spans multiple slides
  let curTopic = "Unknown";
  let curTopicEn = "";
  let curTopicKo = "";
  let curTopicType: TopicType = "unknown";
  let curLevel: Level = "unknown";

  for (let i = 0; i < pageTexts.length; i++) {
    const raw = pageTexts[i];
    const lines = raw.split("\n");

    // Update carry-forward state from this page's header
    const tt = detectTopicType(raw);
    if (tt) curTopicType = tt;

    const lv = detectLevel(raw);
    if (lv) curLevel = lv;

    const names = extractTopicNames(lines);
    if (names) {
      curTopicEn = names.en;
      curTopicKo = names.ko;
      curTopic = names.ko || names.en;
    }

    const pageType = classifyPage(lines);
    if (pageType === "skip") {
      result.skipped++;
      continue;
    }

    const base: Omit<ParsedChunk, "text"> = {
      topic: curTopic,
      topic_en: curTopicEn,
      topic_ko: curTopicKo,
      topic_type: curTopicType,
      level: curLevel,
      page_num: i + 1,
    };

    if (pageType === "script") {
      const text = extractScriptText(lines);
      if (text.length >= 50) result.scripts.push({ ...base, text });
      else result.skipped++;
    } else if (pageType === "vocabulary") {
      const text = extractVocabText(lines);
      if (text.length >= 10) result.vocabulary.push({ ...base, text });
      else result.skipped++;
    } else {
      // question
      const text = extractQuestionText(lines);
      if (text.length >= 10) result.questions.push({ ...base, text });
      else result.skipped++;
    }
  }

  return result;
}
