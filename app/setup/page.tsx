"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setApiKeys, getUserProfile } from "@/lib/storage";

export default function SetupPage() {
  const router = useRouter();
  const [googleKey, setGoogleKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setApiKeys({ google: googleKey });
    const profile = getUserProfile();
    if (!profile?.target_level) {
      router.replace("/onboarding");
    } else {
      router.replace("/home");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">OPIc Script Builder</h1>
          <p className="text-gray-400 text-sm">키 없이도 바로 시작할 수 있어요. 본인 키가 있으면 입력하세요.</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-5 border border-gray-800">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Google API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={googleKey}
                onChange={(e) => setGoogleKey(e.target.value)}
                placeholder="AIza..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                {showKey ? (
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
            <p className="mt-1 text-xs text-gray-500">선택 사항 — 비워두면 기본 키로 이용됩니다. 본인 키를 쓰면 사용량이 분리돼요.</p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold transition-colors mt-2"
          >
            {saving ? "저장 중..." : "시작하기"}
          </button>
        </div>

        <div className="mt-5 bg-gray-900/50 rounded-xl p-4 border border-gray-800 text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-400">본인 키 발급 방법</p>
          <p>• Google API Key — aistudio.google.com → Get API key → Create API key</p>
        </div>

        <p className="text-center text-xs text-gray-600 mt-3">
          API 키는 서버에 전송되지 않으며 브라우저 localStorage에만 저장됩니다.
        </p>
      </div>
    </div>
  );
}
