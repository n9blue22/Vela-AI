import { AuthUser, Lead, TaskItem } from "../types";
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
      };
      quota: {
        used: number;
        limit: number;
        remaining: number;
      };
      meta?: {
        provider: "gemini" | "fallback_template";
        fallback: boolean;
        reason?: string;
        notice?: string;
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
