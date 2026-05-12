"use client";

export interface ApiKeys {
  google: string;
  pinecone: string;
}

export interface UserProfile {
  target_level: string;
  selected_topics: string[];
  random_topics: string[];
}

export interface TopicProfile {
  topic_name: string;
  keywords: string[];
  personal_experience: string;
  reason: string;
  generated_scripts: string[];
}

export interface Sentence {
  id: number;
  text: string;
  memorized: boolean;
}

export interface Script {
  id: string;
  topic: string;
  question_type: string;
  target_level: string;
  question: string;
  sentences: Sentence[];
  pivot_tags: string[];
  created_at: string;
}

const KEYS = {
  API_KEYS: "api_keys",
  USER_PROFILE: "user_profile",
  TOPIC_PROFILES: "topic_profiles",
  SCRIPTS: "scripts",
} as const;

export function getApiKeys(): ApiKeys | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEYS.API_KEYS);
  return raw ? JSON.parse(raw) : null;
}

export function setApiKeys(keys: ApiKeys): void {
  localStorage.setItem(KEYS.API_KEYS, JSON.stringify(keys));
}

export function getUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEYS.USER_PROFILE);
  return raw ? JSON.parse(raw) : null;
}

export function setUserProfile(profile: UserProfile): void {
  localStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
}

export function getTopicProfiles(): Record<string, TopicProfile> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(KEYS.TOPIC_PROFILES);
  return raw ? JSON.parse(raw) : {};
}

export function setTopicProfile(topic: string, profile: TopicProfile): void {
  const profiles = getTopicProfiles();
  profiles[topic] = profile;
  localStorage.setItem(KEYS.TOPIC_PROFILES, JSON.stringify(profiles));
}

export function getScripts(): Record<string, Script> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(KEYS.SCRIPTS);
  return raw ? JSON.parse(raw) : {};
}

export function saveScript(script: Script): void {
  const scripts = getScripts();
  scripts[script.id] = script;
  localStorage.setItem(KEYS.SCRIPTS, JSON.stringify(scripts));
  const profiles = getTopicProfiles();
  if (profiles[script.topic]) {
    const existing = profiles[script.topic].generated_scripts;
    if (!existing.includes(script.id)) {
      profiles[script.topic].generated_scripts.push(script.id);
      localStorage.setItem(KEYS.TOPIC_PROFILES, JSON.stringify(profiles));
    }
  }
}

export function updateSentenceMemorized(
  scriptId: string,
  sentenceId: number,
  memorized: boolean
): void {
  const scripts = getScripts();
  if (scripts[scriptId]) {
    const sentence = scripts[scriptId].sentences.find((s) => s.id === sentenceId);
    if (sentence) {
      sentence.memorized = memorized;
      localStorage.setItem(KEYS.SCRIPTS, JSON.stringify(scripts));
    }
  }
}
