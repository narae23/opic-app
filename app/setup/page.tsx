"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setApiKeys, getUserProfile } from "@/lib/storage";

export default function SetupPage() {
  const router = useRouter();
  const [keys, setKeys] = useState({ google: "", pinecone: "" });
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState({ google: false, pinecone: false });

  const handleSave = () => {
    if (!keys.google || !keys.pinecone) {
      alert("모든 API 키를 입력해주세요.");
      return;
    }
    setSaving(true);
    setApiKeys(keys);
    const profile = getUserProfile();
    if (!profile?.target_level) {
      router.replace("/onboarding");
    } else {
      router.replace("/home");
    }
  };

  const fields = [
    {
      key: "google" as const,
      label: "Google API Key",
      placeholder: "AIza...",
      hint: "Gemini 2.5 Flash (스크립트 생성) + text-embedding-004 (RAG 임베딩) 에 사용",
    },
    {
      key: "pinecone" as const,
      label: "Pinecone API Key",
      placeholder: "pcsk_...",
      hint: "벡터 DB 저장 및 검색에 사용",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">OPIc Script Builder</h1>
          <p className="text-gray-400 text-sm">API 키 2개만 입력하면 시작할 수 있어요.</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-5 border border-gray-800">
          {fields.map(({ key, label, placeholder, hint }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {label}
              </label>
              <div className="relative">
                <input
                  type={showKeys[key] ? "text" : "password"}
                  value={keys[key]}
                  onChange={(e) => setKeys((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showKeys[key] ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">{hint}</p>
            </div>
          ))}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold transition-colors mt-2"
          >
            {saving ? "저장 중..." : "시작하기"}
          </button>
        </div>

        <div className="mt-5 bg-gray-900/50 rounded-xl p-4 border border-gray-800 text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-400">키 발급 방법</p>
          <p>• Google API Key — console.cloud.google.com → API 및 서비스 → 사용자 인증정보 → API 키 생성 후 Generative Language API 활성화</p>
          <p>• Pinecone Key — app.pinecone.io → API Keys</p>
        </div>

        <p className="text-center text-xs text-gray-600 mt-3">
          API 키는 서버에 전송되지 않으며 브라우저 localStorage에만 저장됩니다.
        </p>
      </div>
    </div>
  );
}
