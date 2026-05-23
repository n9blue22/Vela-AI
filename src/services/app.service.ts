import { AuthUser, ContentHistoryItem, Lead, TaskItem } from "../types";
import { apiRequest } from "./http.service";

interface GenerateContentPayload {
  profile: {
    businessName: string;
    industry: string;
    keyMessage: string;
  };
  input: {
    channel: string;
    goal: string;
    audience: string;
    productOrService: string;
    tone: string;
    language: string;
    specialNote: string;
  };
}

export interface AutoPostPresignFile {
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface AutoPostPresignItem {
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadUrl: string;
  publicUrl: string;
  mediaType: "image" | "video" | "gif" | "document";
  key: string;
}

export interface AutoPostPublishResult {
  platform: string;
  ok: boolean;
  message?: string;
  status?: string;
  postId?: string;
  platformPostId?: string;
  platformPostUrl?: string;
  publishedAt?: string | null;
  scheduledFor?: string | null;
  accountId?: string;
  accountName?: string;
  code?: string;
}

export interface AutoPostPublishResponse {
  status: "published" | "scheduled" | "partial";
  mode: "now" | "schedule";
  message: string;
  publishedCount: number;
  failedCount: number;
  results: AutoPostPublishResult[];
}

export interface SocialAccount {
  id: string;
  platform: "facebook" | "instagram";
  displayName: string;
  username: string;
  status: "connected" | "disconnected" | "expired";
  connectedAt: string;
  updatedAt: string;
}

export const appService = {
  async getLeads(token: string) {
    return apiRequest<{ leads: Lead[] }>("/leads", { token });
  },
  async createLead(token: string, payload: Partial<Lead>) {
    return apiRequest<{ lead: Lead }>("/leads", {
      method: "POST",
      token,
      body: payload
    });
  },
  async updateLeadStatus(token: string, leadId: string, status: string) {
    return apiRequest<{ lead: Lead }>(`/leads/${leadId}/status`, {
      method: "PATCH",
      token,
      body: { status }
    });
  },
  async deleteLead(token: string, leadId: string) {
    return apiRequest<{ message: string }>(`/leads/${leadId}`, {
      method: "DELETE",
      token
    });
  },
  async getTasks(token: string) {
    return apiRequest<{ tasks: TaskItem[] }>("/tasks", { token });
  },
  async createTask(
    token: string,
    payload: { title: string; description?: string; type?: string; status?: string; dueAt?: string | null }
  ) {
    return apiRequest<{ task: TaskItem }>("/tasks", {
      method: "POST",
      token,
      body: payload
    });
  },
  async updateTask(
    token: string,
    taskId: string,
    payload: { title?: string; description?: string; type?: string; status?: string; dueAt?: string | null }
  ) {
    return apiRequest<{ task: TaskItem }>(`/tasks/${taskId}`, {
      method: "PATCH",
      token,
      body: payload
    });
  },
  async deleteTask(token: string, taskId: string) {
    return apiRequest<{ message: string }>(`/tasks/${taskId}`, {
      method: "DELETE",
      token
    });
  },
  async generateContent(token: string, payload: GenerateContentPayload) {
    return apiRequest<{
      content: {
        headline: string;
        body: string;
        cta: string;
        replyTemplate: string;
        hashtags?: string[];
      };
      quota: {
        used: number;
        limit: number;
        remaining: number;
      };
      meta?: {
        provider: "groq" | "cloudflare" | "openrouter" | "gemini" | "fallback_template" | "ai";
        model?: string;
        fallback: boolean;
        reason?: string;
        notice?: string;
        providersTried?: string[];
      };
    }>("/content/generate", {
      method: "POST",
      token,
      body: payload
    });
  },
  async getQuota(token: string) {
    return apiRequest<{
      plan: string;
      limit: number;
      used: number;
      remaining: number;
    }>("/content/quota", {
      token
    });
  },
  async getContentHistory(token: string, limit = 20) {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.floor(limit))) : 20;
    return apiRequest<{ items: ContentHistoryItem[] }>(`/content/history?limit=${safeLimit}`, {
      token
    });
  },
  async submitUpgradeRequest(
    token: string,
    payload: { plan: string; amountVnd: number; transferContent: string; note?: string }
  ) {
    return apiRequest<{ message: string; task: TaskItem; assignedAdmin: { id: string; name: string; email: string } }>(
      "/billing/upgrade-requests",
      {
        method: "POST",
        token,
        body: payload
      }
    );
  },
  async createAutoPostPresign(token: string, files: AutoPostPresignFile[]) {
    return apiRequest<{ items: AutoPostPresignItem[] }>("/integrations/zernio/media/presign", {
      method: "POST",
      token,
      body: { files },
      timeoutMs: 30000
    });
  },
  async publishAutoPost(
    token: string,
    payload: {
      caption: string;
      platforms: Array<"facebook" | "instagram">;
      mediaItems: Array<{ type: "image" | "video" | "gif" | "document"; url: string }>;
      mode: "now" | "schedule";
      scheduleAt?: string;
      timezone?: string;
      antiSpamJitter?: boolean;
    }
  ) {
    return apiRequest<AutoPostPublishResponse>("/integrations/zernio/publish", {
      method: "POST",
      token,
      body: payload,
      timeoutMs: 40000
    });
  },
  async getSocialAccounts(token: string) {
    return apiRequest<{ accounts: SocialAccount[] }>("/integrations/zernio/accounts", {
      token
    });
  },
  async createSocialConnectUrl(token: string, platform: "facebook" | "instagram") {
    return apiRequest<{ authUrl: string; platform: "facebook" | "instagram"; profileId: string }>(
      "/integrations/zernio/connect-url",
      {
        method: "POST",
        token,
        body: { platform },
        timeoutMs: 30000
      }
    );
  },
  async completeSocialConnect(
    token: string,
    payload: {
      platform: "facebook" | "instagram";
      profileId: string;
      accountId: string;
      username?: string;
      displayName?: string;
    }
  ) {
    return apiRequest<{ message: string; account: SocialAccount }>("/integrations/zernio/connect/complete", {
      method: "POST",
      token,
      body: payload,
      timeoutMs: 30000
    });
  },
  async disconnectSocialAccount(token: string, platform: "facebook" | "instagram") {
    return apiRequest<{ message: string }>(`/integrations/zernio/accounts/${platform}`, {
      method: "DELETE",
      token
    });
  },
  async getAdminOverview(token: string) {
    return apiRequest<{ users: number; leads: number; tasks: number }>("/admin/overview", { token });
  },
  async getAdminUsers(token: string) {
    return apiRequest<{
      users: Array<
        AuthUser & {
          planLimit: {
            label: string;
            maxLeads: number;
            dailyContentGenerations: number;
          };
        }
      >;
    }>("/admin/users", { token });
  },
  async updateUserPlan(token: string, userId: string, plan: string) {
    return apiRequest<{ user: AuthUser }>(`/admin/users/${userId}/plan`, {
      method: "PATCH",
      token,
      body: { plan }
    });
  },
  async updateUserRole(token: string, userId: string, role: string) {
    return apiRequest<{ user: AuthUser }>(`/admin/users/${userId}/role`, {
      method: "PATCH",
      token,
      body: { role }
    });
  },
  async promoteAdmin(token: string, email: string) {
    return apiRequest<{ message: string; user: AuthUser }>("/admin/promote-admin", {
      method: "POST",
      token,
      body: { email }
    });
  },
  async getAdminTasks(token: string) {
    return apiRequest<{ tasks: TaskItem[] }>("/admin/tasks", { token });
  },
  async updateAdminTask(token: string, taskId: string, payload: Partial<TaskItem>) {
    return apiRequest<{ task: TaskItem }>(`/admin/tasks/${taskId}`, {
      method: "PATCH",
      token,
      body: payload
    });
  },
  async updateMyProfile(
    token: string,
    payload: { name?: string; currentPassword?: string; newPassword?: string }
  ) {
    return apiRequest<{ message: string; user: AuthUser }>("/auth/me", {
      method: "PATCH",
      token,
      body: payload
    });
  }
};
