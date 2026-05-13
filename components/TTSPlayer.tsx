"use client";

import { useState, useCallback, useEffect } from "react";

interface TTSPlayerProps {
  text: string;
  onEnd?: () => void;
  size?: "sm" | "md" | "lg";
}

export default function TTSPlayer({ text, onEnd, size = "md" }: TTSPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [supported, setSupported] = useState(true);
  const [voicesReady, setVoicesReady] = useState(false);

  useEffect(() => {
    if (!window.speechSynthesis) {
      setSupported(false);
      return;
    }
    const load = () => setVoicesReady(true);
    if (window.speechSynthesis.getVoices().length > 0) {
      setVoicesReady(true);
    } else {
      window.speechSynthesis.addEventListener("voiceschanged", load);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
    }
  }, []);

  // Cancel speech when component unmounts
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  const getBestEnglishVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => v.lang === "en-US" && /google/i.test(v.name)) ??
      voices.find((v) => v.lang === "en-US") ??
      voices.find((v) => v.lang.startsWith("en")) ??
      null
    );
  }, [voicesReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const play = useCallback(() => {
    if (!supported) {
      alert("이 브라우저는 TTS를 지원하지 않습니다. Chrome을 사용해주세요.");
      return;
    }

    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const voice = getBestEnglishVoice();

    // Chrome stops long utterances mid-way — split into sentences and play sequentially
    const chunks = text.match(/[^.!?]+[.!?]+\s*/g) ?? [text];
    let idx = 0;

    const speakNext = () => {
      if (idx >= chunks.length) { setPlaying(false); onEnd?.(); return; }
      const utterance = new SpeechSynthesisUtterance(chunks[idx++].trim());
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      utterance.pitch = 1;
      if (voice) utterance.voice = voice;
      utterance.onend = speakNext;
      utterance.onerror = () => setPlaying(false);
      window.speechSynthesis.speak(utterance);
    };

    speakNext();
    setPlaying(true);
  }, [text, playing, supported, getBestEnglishVoice, onEnd]);

  if (!supported) return null;

  const sizeClass = size === "sm" ? "p-1.5" : size === "lg" ? "p-3" : "p-2";
  const iconSize = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5";

  return (
    <button
      onClick={play}
      className={`${sizeClass} rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center flex-shrink-0`}
      title={playing ? "정지" : "재생"}
    >
      {playing ? (
        <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      ) : (
        <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
}
