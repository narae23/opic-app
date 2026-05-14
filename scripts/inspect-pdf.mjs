import { PDFParse } from "pdf-parse";
import fs from "fs/promises";
import path from "path";

const pdfPath = path.join(process.cwd(), "data", "raw_pdfs", "오픽DB전체_이현석[보안유지파일].pdf");
const buffer = await fs.readFile(pdfPath);
const parser = new PDFParse({ data: new Uint8Array(buffer) });
const result = await parser.getText();
const pages = result.pages.sort((a, b) => a.num - b.num);

const HANGUL_RE = /[가-힣]/;

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

  // Skip role-play scenario pages
  if (/I'?d like to give you a situation|I'?m sorry,? but there is a problem/i.test(joined)) return "skip";

  // Command-form questions (Tell me, Describe, Explain...)
  const commandQuestions = nonEmpty.filter(l =>
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

const counts = { script: 0, question: 0, vocabulary: 0, skip: 0 };
for (const page of pages) {
  counts[classifyPage(page.text.split("\n"))]++;
}
console.log("=== 분류 통계 ===", counts);

console.log("\n=== SCRIPT 샘플 (처음 8개) ===");
let shown = 0;
for (const page of pages) {
  if (shown >= 8) break;
  const lines = page.text.split("\n");
  if (classifyPage(lines) === "script") {
    const longLines = lines.filter(l => l.trim().length >= 50 && !HANGUL_RE.test(l.trim()) && /^[A-Z"(]/.test(l.trim()));
    const koLines = lines.filter(l => HANGUL_RE.test(l.trim()) && l.trim().length < 50);
    console.log(`\nPage ${page.num} (topic hint: ${koLines[0]?.trim() ?? "?"})`);
    longLines.slice(0, 3).forEach(l => console.log("  ", l.trim().slice(0, 100)));
    shown++;
  }
}

console.log("\n=== QUESTION 샘플 (처음 5개) ===");
shown = 0;
for (const page of pages) {
  if (shown >= 5) break;
  const lines = page.text.split("\n");
  if (classifyPage(lines) === "question") {
    const nonEmpty = lines.filter(l => l.trim().length > 0);
    const qLines = nonEmpty.filter(l =>
      (l.trim().endsWith("?") && /^[A-Z]/.test(l.trim()) && l.trim().length > 15) ||
      /^\s*(Tell me|Describe|Talk about|Explain|Discuss|Compare|What|How|Who|Where|When)/i.test(l)
    );
    console.log(`\nPage ${page.num}:`);
    qLines.slice(0, 3).forEach(l => console.log("  Q:", l.trim().slice(0, 100)));
    shown++;
  }
}

console.log("\n=== VOCABULARY 샘플 (처음 3개) ===");
shown = 0;
for (const page of pages) {
  if (shown >= 3) break;
  const lines = page.text.split("\n");
  if (classifyPage(lines) === "vocabulary") {
    const koLines = lines.filter(l => HANGUL_RE.test(l.trim()) && l.trim().length < 50);
    console.log(`\nPage ${page.num}:`);
    koLines.slice(0, 4).forEach(l => console.log("  ", l.trim()));
    shown++;
  }
}
