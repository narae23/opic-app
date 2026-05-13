"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import {
  getApiKeys,
  getUserProfile,
  getTopicProfiles,
  getScripts,
  saveScript,
  Script,
  TopicProfile,
} from "@/lib/storage";
import TTSPlayer from "@/components/TTSPlayer";

function ScriptsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const topic = params.get("topic") ?? "";
  const questionType = params.get("type") ?? "";

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [script, setScript] = useState<Script | null>(null);
  const [existingScripts, setExistingScripts] = useState<Script[]>([]);
  const [topicProfile, setTopicProfile] = useState<TopicProfile | null>(null);
  const [targetLevel, setTargetLevel] = useState("");

  useEffect(() => {
    const profile = getUserProfile();
    if (!profile) { router.replace("/"); return; }
    setTargetLevel(profile.target_level);

    const tp = getTopicProfiles();
    setTopicProfile(tp[topic] ?? null);

    const scripts = getScripts();
    const ids = tp[topic]?.generated_scripts ?? [];
    const filtered = ids
      .map((id) => scripts[id])
      .filter((s) => s && s.question_type === questionType);
    setExistingScripts(filtered);
  }, [topic, questionType, router]);

  const handleGenerate = async () => {
    const keys = getApiKeys();
    if (!keys?.google) {
      setError("API 키가 설정되지 않았습니다. /setup으로 이동하세요.");
      return;
    }
    if (!topicProfile) {
      setError("주제 프로필을 찾을 수 없습니다.");
      return;
    }

    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-google-key": keys.google,
        },
        body: JSON.stringify({ topic, questionType, targetLevel, topicProfile }),
      });

      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error ?? "생성 실패");
      }

      const { script: generated } = (await res.json()) as {
        script: { question: string; sentences: { id: number; text: string }[]; pivot_tags: string[] };
      };

      const newScript: Script = {
        id: uuidv4(),
        topic,
        question_type: questionType,
        target_level: targetLevel,
        question: generated.question,
        sentences: generated.sentences.map((s) => ({ ...s, memorized: false })),
        pivot_tags: generated.pivot_tags,
        created_at: new Date().toISOString().split("T")[0],
      };

      saveScript(newScript);
      setScript(newScript);
      setExistingScripts((prev) => [...prev, newScript]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setGenerating(false);
    }
  };

  const fullText = script?.sentences.map((s) => s.text).join(" ") ?? "";

  const handleShare = async (s: Script) => {
    const text = [
      `📝 ${s.topic} (${s.question_type}) · ${s.target_level}`,
      ``,
      `Q. ${s.question}`,
      ``,
      s.sentences.map((sen, i) => `${i + 1}. ${sen.text}`).join("\n"),
      s.pivot_tags.length > 0 ? `\n${s.pivot_tags.map((t) => `#${t}`).join(" ")}` : "",
    ].join("\n");

    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      alert("클립보드에 복사됐습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold truncate">{topic}</h1>
            <p className="text-xs text-gray-400">{questionType} · {targetLevel}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 pb-8 space-y-5">
        {topicProfile && topicProfile.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topicProfile.keywords.map((kw) => (
              <span key={kw} className="px-2.5 py-1 rounded-full bg-gray-800 text-gray-300 text-xs">
                {kw}
              </span>
            ))}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-semibold text-white transition-colors flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              스크립트 생성 중...
            </>
          ) : (
            "새 스크립트 생성"
          )}
        </button>

        {script && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1">Q.</p>
                  <p className="font-medium text-white">{script.question}</p>
                </div>
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <TTSPlayer text={script.question} size="sm" />
                  <span className="text-xs text-gray-600">질문</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <TTSPlayer text={fullText} size="md" />
                  <span className="text-xs text-gray-600">전체</span>
                </div>
              </div>
              {script.pivot_tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {script.pivot_tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400 text-xs border border-yellow-800/50">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 space-y-2">
              {script.sentences.map((s, i) => (
                <div key={s.id} className="flex gap-3 items-start">
                  <span className="mt-0.5 flex-shrink-0 text-xs text-gray-500 w-5 text-right">{i + 1}</span>
                  <p className="text-gray-200 text-sm leading-relaxed">{s.text}</p>
                  <TTSPlayer text={s.text} size="sm" />
                </div>
              ))}
            </div>
            <div className="px-4 pb-4 flex gap-2">
              <button
                onClick={() => router.push(`/memorize?id=${script.id}`)}
                className="flex-1 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 text-sm font-semibold transition-colors"
              >
                암기 모드로 이동
              </button>
              <button
                onClick={() => handleShare(script)}
                className="px-4 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-semibold transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                공유
              </button>
            </div>
          </div>
        )}

        {existingScripts.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 mb-3">이전 스크립트</h2>
            <div className="space-y-2">
              {existingScripts
                .filter((s) => s.id !== script?.id)
                .slice(-5)
                .reverse()
                .map((s) => (
                  <div key={s.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                    <p className="text-sm text-gray-300 line-clamp-2">{s.question}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">{s.created_at} · {s.sentences.length}문장</span>
                      <button
                        onClick={() => router.push(`/memorize?id=${s.id}`)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        암기 모드 →
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ScriptsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ScriptsContent />
    </Suspense>
  );
}
