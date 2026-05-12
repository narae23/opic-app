"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserProfile, getTopicProfiles, getScripts, TopicProfile } from "@/lib/storage";

const QUESTION_TYPES = ["묘사", "설명", "비교", "경험 말하기", "롤플레잉"];

export default function HomePage() {
  const router = useRouter();
  const [targetLevel, setTargetLevel] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Record<string, TopicProfile>>({});
  const [scriptCounts, setScriptCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const profile = getUserProfile();
    if (!profile) { router.replace("/"); return; }
    setTargetLevel(profile.target_level);
    setTopics(profile.selected_topics);
    const tp = getTopicProfiles();
    setProfiles(tp);
    const scripts = getScripts();
    const counts: Record<string, number> = {};
    profile.selected_topics.forEach((t) => {
      const ids = tp[t]?.generated_scripts ?? [];
      counts[t] = ids.filter((id) => scripts[id]).length;
    });
    setScriptCounts(counts);
  }, [router]);

  const goToScripts = (topic: string, questionType: string) => {
    router.push(`/scripts?topic=${encodeURIComponent(topic)}&type=${encodeURIComponent(questionType)}`);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">OPIc Script Builder</h1>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-blue-900 text-blue-300 text-xs font-semibold">
              목표: {targetLevel}
            </span>
            <button
              onClick={() => router.push("/setup")}
              className="text-gray-400 hover:text-gray-200 text-xs"
              title="설정"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4 pb-8">
        <div className="flex items-center justify-between mt-2">
          <p className="text-gray-400 text-sm">주제를 선택하고 스크립트를 생성하세요.</p>
          <button
            onClick={() => router.push("/add-topic")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium border border-gray-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            주제 추가
          </button>
        </div>

        {topics.map((topic) => {
          const profile = profiles[topic];
          const count = scriptCounts[topic] ?? 0;
          return (
            <div key={topic} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-bold text-lg">{topic}</h2>
                    {profile?.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {profile.keywords.slice(0, 4).map((kw) => (
                          <span key={kw} className="px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 text-xs">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 mt-1">{count}개 스크립트</span>
                </div>
              </div>
              <div className="border-t border-gray-800 px-4 py-3">
                <p className="text-xs text-gray-500 mb-2">문제 유형 선택:</p>
                <div className="flex flex-wrap gap-2">
                  {QUESTION_TYPES.map((qt) => (
                    <button
                      key={qt}
                      onClick={() => goToScripts(topic, qt)}
                      className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-blue-900 hover:text-blue-300 text-gray-300 text-xs font-medium transition-colors border border-gray-700 hover:border-blue-700"
                    >
                      {qt}
                    </button>
                  ))}
                </div>
              </div>
              {count > 0 && (
                <div className="border-t border-gray-800 px-4 py-2">
                  <button
                    onClick={() => {
                      const ids = profile?.generated_scripts ?? [];
                      if (ids.length > 0) router.push(`/memorize?id=${ids[ids.length - 1]}`);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    최근 스크립트 암기 모드 →
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {topics.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p>주제가 없습니다.</p>
            <button onClick={() => router.push("/onboarding")} className="mt-3 text-blue-400 text-sm hover:underline">
              온보딩 다시 하기
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
