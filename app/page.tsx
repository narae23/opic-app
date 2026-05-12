"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getApiKeys, getUserProfile } from "@/lib/storage";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const keys = getApiKeys();
    if (!keys?.google || !keys?.pinecone) {
      router.replace("/setup");
      return;
    }
    const profile = getUserProfile();
    if (!profile?.target_level || !profile.selected_topics?.length) {
      router.replace("/onboarding");
      return;
    }
    router.replace("/home");
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
