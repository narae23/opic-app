"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getScripts, updateSentenceMemorized, Script } from "@/lib/storage";
import SentenceCard from "@/components/SentenceCard";
import TTSPlayer from "@/components/TTSPlayer";

function MemorizeContent() {
  const router = useRouter();
  const params = useSearchParams();
  const scriptId = params.get("id") ?? "";

  const [script, setScript] = useState<Script | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [mode, setMode] = useState<"overview" | "step">("overview");

  useEffect(() => {
    if (!scriptId) { router.replace("/home"); return; }
    const scripts = getScripts();
    const found = scripts[scriptId];
    if (!found) { router.replace("/home"); return; }
    setScript(found);
  }, [scriptId, router]);

  const handleMemorized = (sentenceId: number, memorized: boolean) => {
    updateSentenceMemorized(scriptId, sentenceId, memorized);
    setScript((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sentences: prev.sentences.map((s) =>
          s.id === sentenceId ? { ...s, memorized } : s
        ),
      };
    });
    if (memorized && activeIdx < (script?.sentences.length ?? 0) - 1) {
      setActiveIdx((i) => i + 1);
    }
  };

  if (!script) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const memorizedCount = script.sentences.filter((s) => s.memorized).length;
  const progress = Math.round((memorizedCount / script.sentences.length) * 100);
  const fullText = script.sentences.map((s) => s.text).join(" ");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold truncate">{script.topic}</h1>
              <p className="text-xs text-gray-400">{script.question_type} · {script.target_level}</p>
            </div>
            <TTSPlayer text={fullText} size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-gray-800">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{memorizedCount}/{script.sentences.length}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 pb-8 space-y-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1">Q.</p>
              <p className="text-white font-medium">{script.question}</p>
            </div>
            <TTSPlayer text={script.question} size="sm" />
          </div>
          {script.pivot_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {script.pivot_tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400 text-xs border border-yellow-800/50">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setMode("overview"); }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              mode === "overview" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            전체 보기
          </button>
          <button
            onClick={() => { setMode("step"); setActiveIdx(0); }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              mode === "step" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            단계별 암기
          </button>
        </div>

        {mode === "overview" && (
          <div className="space-y-2">
            {script.sentences.map((s, i) => (
              <div key={s.id} className={`flex gap-3 p-3 rounded-xl border transition-colors ${
                s.memorized ? "border-green-800 bg-green-950/20" : "border-gray-800 bg-gray-900"
              }`}>
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300">
                  {i + 1}
                </span>
                <p className="flex-1 text-sm text-gray-200 leading-relaxed">{s.text}</p>
                <div className="flex flex-col gap-1.5 items-center">
                  <TTSPlayer text={s.text} size="sm" />
                  <button
                    onClick={() => handleMemorized(s.id, !s.memorized)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      s.memorized ? "bg-green-600 border-green-600" : "border-gray-600 hover:border-green-500"
                    }`}
                  >
                    {s.memorized && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {mode === "step" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                {activeIdx + 1} / {script.sentences.length} 번째 문장
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
                  disabled={activeIdx === 0}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-xs transition-colors"
                >
                  이전
                </button>
                <button
                  onClick={() => setActiveIdx((i) => Math.min(script.sentences.length - 1, i + 1))}
                  disabled={activeIdx === script.sentences.length - 1}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-xs transition-colors"
                >
                  다음
                </button>
              </div>
            </div>
            {script.sentences.map((s, i) => (
              <SentenceCard
                key={s.id}
                sentence={s}
                index={i}
                isActive={i === activeIdx}
                onMemorized={handleMemorized}
              />
            ))}
          </div>
        )}

        {progress === 100 && (
          <div className="text-center py-6">
            <p className="text-2xl mb-2">모든 문장 암기 완료!</p>
            <p className="text-gray-400 text-sm">다른 주제도 연습해 보세요.</p>
            <button
              onClick={() => router.push("/home")}
              className="mt-4 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold transition-colors"
            >
              홈으로 돌아가기
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function MemorizePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <MemorizeContent />
    </Suspense>
  );
}
