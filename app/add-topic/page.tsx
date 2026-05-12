"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUserProfile, addTopics, TopicProfile } from "@/lib/storage";
import { COMMON_TOPICS, SELECTABLE_TOPICS } from "@/lib/topics";

interface KeywordState {
  [topic: string]: { keywords: string; personal_experience: string; reason: string };
}

type Step = "select" | "keywords";

export default function AddTopicPage() {
  const router = useRouter();
  const [availableCommon, setAvailableCommon] = useState<string[]>([]);
  const [availableSelectable, setAvailableSelectable] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [step, setStep] = useState<Step>("select");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [keywordState, setKeywordState] = useState<KeywordState>({});

  useEffect(() => {
    const profile = getUserProfile();
    if (!profile) { router.replace("/"); return; }
    const existing = new Set(profile.selected_topics);
    setAvailableCommon(COMMON_TOPICS.filter((t) => !existing.has(t)));
    setAvailableSelectable(SELECTABLE_TOPICS.filter((t) => !existing.has(t)));
  }, [router]);

  const toggle = (topic: string) => {
    setSelected((prev) => {
      if (prev.includes(topic)) return prev.filter((t) => t !== topic);
      if (prev.length >= 2) return prev;
      return [...prev, topic];
    });
  };

  const updateKeyword = (topic: string, field: string, value: string) => {
    setKeywordState((prev) => ({ ...prev, [topic]: { ...prev[topic], [field]: value } }));
  };

  const handleFinish = () => {
    const newProfiles: Record<string, Omit<TopicProfile, "generated_scripts">> = {};
    selected.forEach((topic) => {
      const kw = keywordState[topic];
      newProfiles[topic] = {
        topic_name: topic,
        keywords: kw?.keywords ? kw.keywords.split(",").map((k) => k.trim()).filter(Boolean) : [],
        personal_experience: kw?.personal_experience ?? "",
        reason: kw?.reason ?? "",
      };
    });
    addTopics(selected, newProfiles);
    router.replace("/home");
  };

  const hasAny = availableCommon.length > 0 || availableSelectable.length > 0;
  const disabled = selected.length >= 2;

  if (!hasAny && step === "select") {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>추가할 수 있는 주제가 없습니다.</p>
          <button onClick={() => router.back()} className="mt-4 text-blue-400 text-sm hover:underline">
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-lg mx-auto pt-8">
        <button
          onClick={() => (step === "keywords" ? setStep("select") : router.back())}
          className="text-gray-400 hover:text-gray-200 text-sm mb-6 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {step === "keywords" ? "주제 선택으로" : "홈으로"}
        </button>

        {step === "select" && (
          <div>
            <h2 className="text-2xl font-bold mb-1">주제 추가</h2>
            <p className="text-gray-400 text-sm mb-1">1~2개를 선택하세요.</p>
            <p className="text-gray-500 text-xs mb-6">선택됨: {selected.length} / 2</p>

            {availableCommon.length > 0 && (
              <TopicSection
                title="공통형"
                badge="시험 필수"
                badgeColor="bg-orange-900 text-orange-300"
                topics={availableCommon}
                selected={selected}
                onToggle={toggle}
                disabled={disabled}
              />
            )}

            {availableSelectable.length > 0 && (
              <div className={availableCommon.length > 0 ? "mt-6" : ""}>
                <TopicSection
                  title="선택형"
                  badge="선택 과목"
                  badgeColor="bg-purple-900 text-purple-300"
                  topics={availableSelectable}
                  selected={selected}
                  onToggle={toggle}
                  disabled={disabled}
                />
              </div>
            )}

            <button
              onClick={() => { setCurrentIdx(0); setStep("keywords"); }}
              disabled={selected.length < 1}
              className="w-full mt-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 font-semibold transition-colors"
            >
              다음
            </button>
          </div>
        )}

        {step === "keywords" && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold">키워드 입력</h2>
              <span className="text-sm text-gray-400">{currentIdx + 1} / {selected.length}</span>
            </div>
            <div className="mb-2">
              <span className="inline-block px-3 py-1 rounded-full bg-blue-900 text-blue-300 text-sm font-medium">
                {selected[currentIdx]}
              </span>
            </div>
            <p className="text-gray-500 text-xs mb-5">개인 정보를 입력하면 스크립트가 더 자연스러워집니다. (선택 사항)</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">핵심 키워드</label>
                <input
                  type="text"
                  placeholder="예: 카페, SF소설, 주말 아침 (쉼표로 구분)"
                  value={keywordState[selected[currentIdx]]?.keywords ?? ""}
                  onChange={(e) => updateKeyword(selected[currentIdx], "keywords", e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">개인 경험 (선택)</label>
                <textarea
                  placeholder="예: 작년에 읽은 삼체 시리즈..."
                  value={keywordState[selected[currentIdx]]?.personal_experience ?? ""}
                  onChange={(e) => updateKeyword(selected[currentIdx], "personal_experience", e.target.value)}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">이유/동기 (선택)</label>
                <input
                  type="text"
                  placeholder="예: 스트레스 해소, 친구들과 시간 보내기"
                  value={keywordState[selected[currentIdx]]?.reason ?? ""}
                  onChange={(e) => updateKeyword(selected[currentIdx], "reason", e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (currentIdx === 0) setStep("select");
                  else setCurrentIdx((i) => i - 1);
                }}
                className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 font-semibold transition-colors"
              >
                이전
              </button>
              {currentIdx < selected.length - 1 ? (
                <button
                  onClick={() => setCurrentIdx((i) => i + 1)}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold transition-colors"
                >
                  다음 주제
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold transition-colors"
                >
                  추가하기
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TopicSection({
  title,
  badge,
  badgeColor,
  topics,
  selected,
  onToggle,
  disabled,
}: {
  title: string;
  badge: string;
  badgeColor: string;
  topics: string[];
  selected: string[];
  onToggle: (t: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>{badge}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => {
          const isSelected = selected.includes(topic);
          return (
            <button
              key={topic}
              onClick={() => onToggle(topic)}
              disabled={disabled && !isSelected}
              className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-950/40 text-blue-300"
                  : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
            >
              {topic}
            </button>
          );
        })}
      </div>
    </div>
  );
}
