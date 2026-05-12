"use client";

import { useState } from "react";
import TTSPlayer from "./TTSPlayer";
import { Sentence } from "@/lib/storage";

interface SentenceCardProps {
  sentence: Sentence;
  index: number;
  onMemorized: (id: number, memorized: boolean) => void;
  isActive: boolean;
}

export default function SentenceCard({ sentence, index, onMemorized, isActive }: SentenceCardProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div
      className={`rounded-xl border-2 p-5 transition-all ${
        isActive
          ? "border-blue-500 bg-blue-950/30"
          : sentence.memorized
          ? "border-green-600 bg-green-950/20"
          : "border-gray-700 bg-gray-900"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-300">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          {revealed || !isActive ? (
            <p className="text-white leading-relaxed">{sentence.text}</p>
          ) : (
            <button
              onClick={() => setRevealed(true)}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition-colors"
            >
              탭하여 확인
            </button>
          )}
        </div>
        <TTSPlayer text={sentence.text} size="sm" />
      </div>

      {isActive && revealed && (
        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={() => {
              setRevealed(false);
              onMemorized(sentence.id, false);
            }}
            className="px-4 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm text-gray-300 transition-colors"
          >
            다시 보기
          </button>
          <button
            onClick={() => onMemorized(sentence.id, true)}
            className="px-4 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-sm text-white transition-colors"
          >
            암기 완료
          </button>
        </div>
      )}

      {sentence.memorized && (
        <div className="mt-2 flex justify-end">
          <span className="text-xs text-green-400 font-medium">암기 완료</span>
        </div>
      )}
    </div>
  );
}
