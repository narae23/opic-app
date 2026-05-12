"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setUserProfile, setTopicProfile, getTopicProfiles } from "@/lib/storage";
import { COMMON_TOPICS, SELECTABLE_TOPICS } from "@/lib/topics";

const LEVELS = ["IM1", "IM2", "IM3", "IH", "AL"];

const LEVEL_DESCRIPTIONS: Record<string, string> = {
  IM1: "문장 단위 표현 가능, 약 1,450단어",
  IM2: "간단한 문단 구사, 약 1,850단어",
  IM3: "자연스러운 연결, 약 1,950단어",
  IH: "복잡한 주제 처리, 약 2,150단어",
  AL: "원어민 수준, 약 3,100단어",
};

type Step = "level" | "topics" | "keywords";

interface KeywordState {
  [topic: string]: {
    keywords: string;
    personal_experience: string;
    reason: string;
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("level");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [keywordState, setKeywordState] = useState<KeywordState>({});
  const [currentTopicIdx, setCurrentTopicIdx] = useState(0);

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) => {
      if (prev.includes(topic)) return prev.filter((t) => t !== topic);
      if (prev.length >= 2) return prev;
      return [...prev, topic];
    });
  };

  const updateKeyword = (topic: string, field: string, value: string) => {
    setKeywordState((prev) => ({
      ...prev,
      [topic]: { ...prev[topic], [field]: value },
    }));
  };

  const handleFinish = () => {
    setUserProfile({
      target_level: selectedLevel,
      selected_topics: selectedTopics,
      random_topics: [],
    });

    const existingProfiles = getTopicProfiles();
    selectedTopics.forEach((topic) => {
      const kw = keywordState[topic];
      if (!existingProfiles[topic]) {
        setTopicProfile(topic, {
          topic_name: topic,
          keywords: kw?.keywords ? kw.keywords.split(",").map((k) => k.trim()).filter(Boolean) : [],
          personal_experience: kw?.personal_experience ?? "",
          reason: kw?.reason ?? "",
          generated_scripts: [],
        });
      }
    });

    router.replace("/home");
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-lg mx-auto pt-8">
        <div className="flex gap-2 mb-8">
          {(["level", "topics", "keywords"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                step === s
                  ? "bg-blue-500"
                  : i < ["level", "topics", "keywords"].indexOf(step)
                  ? "bg-blue-800"
                  : "bg-gray-700"
              }`}
            />
          ))}
        </div>

        {step === "level" && (
          <div>
            <h2 className="text-2xl font-bold mb-2">목표 등급을 선택하세요</h2>
            <p className="text-gray-400 text-sm mb-6">현재 수준보다 한 단계 높은 등급을 목표로 설정하는 것을 권장합니다.</p>
            <div className="space-y-3">
              {LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    selectedLevel === level
                      ? "border-blue-500 bg-blue-950/30"
                      : "border-gray-700 bg-gray-900 hover:border-gray-600"
                  }`}
                >
                  <span className="font-bold text-lg">{level}</span>
                  <span className="ml-3 text-sm text-gray-400">{LEVEL_DESCRIPTIONS[level]}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep("topics")}
              disabled={!selectedLevel}
              className="w-full mt-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 font-semibold transition-colors"
            >
              다음
            </button>
          </div>
        )}

        {step === "topics" && (
          <div>
            <h2 className="text-2xl font-bold mb-1">주제를 선택하세요</h2>
            <p className="text-gray-400 text-sm mb-1">1~2개를 선택하세요. 나중에 추가할 수 있어요.</p>
            <p className="text-gray-500 text-xs mb-5">선택됨: {selectedTopics.length} / 2</p>

            <TopicSection
              title="공통형"
              badge="시험 필수"
              badgeColor="bg-orange-900 text-orange-300"
              topics={COMMON_TOPICS}
              selected={selectedTopics}
              onToggle={toggleTopic}
              disabled={selectedTopics.length >= 2}
            />

            <div className="mt-5">
              <TopicSection
                title="선택형"
                badge="선택 과목"
                badgeColor="bg-purple-900 text-purple-300"
                topics={SELECTABLE_TOPICS}
                selected={selectedTopics}
                onToggle={toggleTopic}
                disabled={selectedTopics.length >= 2}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep("level")}
                className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 font-semibold transition-colors"
              >
                이전
              </button>
              <button
                onClick={() => {
                  setCurrentTopicIdx(0);
                  setStep("keywords");
                }}
                disabled={selectedTopics.length < 1}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 font-semibold transition-colors"
              >
                다음
              </button>
            </div>
          </div>
        )}

        {step === "keywords" && selectedTopics.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold">주제별 키워드 입력</h2>
              <span className="text-sm text-gray-400">{currentTopicIdx + 1} / {selectedTopics.length}</span>
            </div>
            <div className="mb-2">
              <span className="inline-block px-3 py-1 rounded-full bg-blue-900 text-blue-300 text-sm font-medium">
                {selectedTopics[currentTopicIdx]}
              </span>
            </div>
            <p className="text-gray-500 text-xs mb-5">개인 정보를 입력하면 스크립트가 더욱 자연스럽고 기억하기 쉬워집니다. (선택 사항)</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">핵심 키워드</label>
                <input
                  type="text"
                  placeholder="예: 카페, SF소설, 주말 아침 (쉼표로 구분)"
                  value={keywordState[selectedTopics[currentTopicIdx]]?.keywords ?? ""}
                  onChange={(e) => updateKeyword(selectedTopics[currentTopicIdx], "keywords", e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">개인 경험 (선택)</label>
                <textarea
                  placeholder="예: 작년에 읽은 삼체 시리즈..."
                  value={keywordState[selectedTopics[currentTopicIdx]]?.personal_experience ?? ""}
                  onChange={(e) => updateKeyword(selectedTopics[currentTopicIdx], "personal_experience", e.target.value)}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">이유/동기 (선택)</label>
                <input
                  type="text"
                  placeholder="예: 스트레스 해소, 친구들과 시간 보내기"
                  value={keywordState[selectedTopics[currentTopicIdx]]?.reason ?? ""}
                  onChange={(e) => updateKeyword(selectedTopics[currentTopicIdx], "reason", e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (currentTopicIdx === 0) setStep("topics");
                  else setCurrentTopicIdx((i) => i - 1);
                }}
                className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 font-semibold transition-colors"
              >
                이전
              </button>
              {currentTopicIdx < selectedTopics.length - 1 ? (
                <button
                  onClick={() => setCurrentTopicIdx((i) => i + 1)}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold transition-colors"
                >
                  다음 주제
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold transition-colors"
                >
                  시작하기
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
