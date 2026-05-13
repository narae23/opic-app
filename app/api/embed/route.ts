import { NextRequest, NextResponse } from "next/server";
import { addParsedChunks, NAMESPACES } from "@/lib/rag_engine";
import { parsePdf, ParseResult } from "@/lib/pdf_parser";
import path from "path";
import fs from "fs/promises";

export const maxDuration = 300;

async function embedResult(result: ParseResult, googleKey: string, pineconeKey: string) {
  const BATCH = 50;
  const embedBatch = async (
    chunks: ParseResult["scripts"],
    ns: (typeof NAMESPACES)[keyof typeof NAMESPACES]
  ) => {
    for (let i = 0; i < chunks.length; i += BATCH) {
      await addParsedChunks(chunks.slice(i, i + BATCH), ns, googleKey, pineconeKey);
    }
  };
  await embedBatch(result.scripts, NAMESPACES.SCRIPTS);
  await embedBatch(result.vocabulary, NAMESPACES.VOCABULARY);
  await embedBatch(result.questions, NAMESPACES.QUESTIONS);
}

export async function POST(req: NextRequest) {
  const googleKey = req.headers.get("x-google-key") ?? "";
  const pineconeKey = process.env.PINECONE_API_KEY ?? "";

  if (!googleKey) {
    return NextResponse.json({ error: "Missing Google API key" }, { status: 400 });
  }
  if (!pineconeKey) {
    return NextResponse.json({ error: "Server misconfigured: PINECONE_API_KEY not set" }, { status: 500 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("pdf") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No PDF file in form field 'pdf'" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await parsePdf(buffer);
    await embedResult(result, googleKey, pineconeKey);
    return NextResponse.json({
      success: true,
      total_pages: result.total_pages,
      scripts: result.scripts.length,
      vocabulary: result.vocabulary.length,
      questions: result.questions.length,
      skipped: result.skipped,
    });
  }

  const pdfDir = path.join(process.cwd(), "data", "raw_pdfs");
  let pdfFiles: string[] = [];
  try {
    const entries = await fs.readdir(pdfDir);
    pdfFiles = entries.filter((f) => f.toLowerCase().endsWith(".pdf"));
  } catch {
    return NextResponse.json({ error: "data/raw_pdfs/ directory not found or empty" }, { status: 400 });
  }

  if (pdfFiles.length === 0) {
    return NextResponse.json({ error: "No PDF files found in data/raw_pdfs/" }, { status: 400 });
  }

  const totals = { total_pages: 0, scripts: 0, vocabulary: 0, questions: 0, skipped: 0 };
  for (const file of pdfFiles) {
    const buffer = await fs.readFile(path.join(pdfDir, file));
    const result = await parsePdf(buffer);
    await embedResult(result, googleKey, pineconeKey);
    totals.total_pages += result.total_pages;
    totals.scripts += result.scripts.length;
    totals.vocabulary += result.vocabulary.length;
    totals.questions += result.questions.length;
    totals.skipped += result.skipped;
  }

  return NextResponse.json({ success: true, files: pdfFiles.length, ...totals });
}
