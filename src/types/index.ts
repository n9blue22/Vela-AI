export type AppView = "dashboard" | "content" | "leads" | "settings";
export type ThemeMode = "light" | "dark";
export type Role = "customer" | "admin";
export type Plan = "mien_phi" | "tiet_kiem" | "cao_cap";

export type Channel = "facebook" | "tiktok" | "zalo" | "google";
export type Tone = "friendly" | "premium" | "storytelling" | "playful" | "expert";
export type Language = "vi" | "en" | "bilingual";
export type LeadStatus = "new" | "contacted" | "negotiating" | "won" | "lost";

export interface BusinessProfile {
  businessName: string;
  industry: string;
  targetAudience: string;
  offer: string;
  languages: Language;
  brandTone: Tone;
  keyMessage: string;
}

export interface ContentInput {
  channel: Channel;
  goal: string;
  audience: string;
  productOrService: string;
  tone: Tone;
  language: Language;
  specialNote: string;
}

export interface ContentResult {
  headline: string;
  body: string;
  cta: string;
  replyTemplate: string;
  hashtags?: string[];
}

export interface ContentHistoryItem {
  _id: string;
  id: string;
  ownerUserId: string;
  channel: string;
  goal: string;
  audience: string;
  productOrService: string;
  tone: string;
  language: string;
  specialNote: string;
  headline: string;
  body: string;
  cta: string;
  replyTemplate: string;
  hashtags?: string[];
  provider: string;
  model: string;
  isFallback: boolean;
  fallbackReason: string;
  createdAt: string;
}

export interface Lead {
  id?: string;
  _id?: string;
  name: string;
  source: string;
  contact: string;
  status: LeadStatus;
  note: string;
  createdAt: string;
}

export interface AppSettings {
  useLiveAi: boolean;
  apiKey: string;
  model: string;
  theme: ThemeMode;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  plan: Plan;
  isEmailVerified: boolean;
  createdAt?: string;
}

export interface TaskItem {
  _id: string;
  ownerUserId: string;
  title: string;
  description: string;
  type: "marketing" | "follow_up" | "booking" | "admin";
  status: "todo" | "in_progress" | "done";
  dueAt?: string | null;
  createdAt: string;
  updatedAt: string;
  ownerName?: string;
  ownerEmail?: string;
}
