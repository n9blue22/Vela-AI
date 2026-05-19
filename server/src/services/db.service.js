import { getSupabaseClient } from "../config/supabase.js";

function handleError(scope, error) {
  if (error) {
    console.error(`[db] ${scope} failed`, error);
    if (error.code === "PGRST205") {
      throw new Error("Supabase chưa khởi tạo bảng dữ liệu. Hãy chạy file supabase/schema.sql trong SQL Editor.");
    }
    throw new Error("Database operation failed.");
  }
}

export function mapUserRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    plan: row.plan,
    isEmailVerified: row.is_email_verified,
    passwordHash: row.password_hash,
    emailVerificationTokenHash: row.email_verification_token_hash,
    emailVerificationExpiresAt: row.email_verification_expires_at ? new Date(row.email_verification_expires_at) : null,
    resetPasswordTokenHash: row.reset_password_token_hash,
    resetPasswordExpiresAt: row.reset_password_expires_at ? new Date(row.reset_password_expires_at) : null,
    dailyUsageDateKey: row.daily_usage_date_key || "",
    dailyContentCount: row.daily_content_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapLeadRow(row) {
  return {
    _id: row.id,
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    source: row.source || "",
    contact: row.contact || "",
    note: row.note || "",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapTaskRow(row) {
  return {
    _id: row.id,
    id: row.id,
    ownerUserId: row.owner_user_id,
    title: row.title,
    description: row.description || "",
    type: row.type,
    status: row.status,
    dueAt: row.due_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const dbService = {
  async getUserById(userId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
    handleError("getUserById", error);
    return data ? mapUserRow(data) : null;
  },

  async getUserByEmail(email) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
    handleError("getUserByEmail", error);
    return data ? mapUserRow(data) : null;
  },

  async createUser(payload) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("users")
      .insert({
        name: payload.name,
        email: payload.email,
        password_hash: payload.passwordHash,
        role: payload.role,
        plan: payload.plan,
        is_email_verified: payload.isEmailVerified ?? false,
        email_verification_token_hash: payload.emailVerificationTokenHash ?? "",
        email_verification_expires_at: payload.emailVerificationExpiresAt ?? null,
        reset_password_token_hash: payload.resetPasswordTokenHash ?? "",
        reset_password_expires_at: payload.resetPasswordExpiresAt ?? null,
        daily_usage_date_key: payload.dailyUsageDateKey ?? "",
        daily_content_count: payload.dailyContentCount ?? 0
      })
      .select("*")
      .single();

    handleError("createUser", error);
    return mapUserRow(data);
  },

  async updateUserById(userId, updates) {
    const supabase = getSupabaseClient();
    const patch = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.email !== undefined) patch.email = updates.email;
    if (updates.passwordHash !== undefined) patch.password_hash = updates.passwordHash;
    if (updates.role !== undefined) patch.role = updates.role;
    if (updates.plan !== undefined) patch.plan = updates.plan;
    if (updates.isEmailVerified !== undefined) patch.is_email_verified = updates.isEmailVerified;
    if (updates.emailVerificationTokenHash !== undefined) patch.email_verification_token_hash = updates.emailVerificationTokenHash;
    if (updates.emailVerificationExpiresAt !== undefined) patch.email_verification_expires_at = updates.emailVerificationExpiresAt;
    if (updates.resetPasswordTokenHash !== undefined) patch.reset_password_token_hash = updates.resetPasswordTokenHash;
    if (updates.resetPasswordExpiresAt !== undefined) patch.reset_password_expires_at = updates.resetPasswordExpiresAt;
    if (updates.dailyUsageDateKey !== undefined) patch.daily_usage_date_key = updates.dailyUsageDateKey;
    if (updates.dailyContentCount !== undefined) patch.daily_content_count = updates.dailyContentCount;

    const { data, error } = await supabase.from("users").update(patch).eq("id", userId).select("*").maybeSingle();
    handleError("updateUserById", error);
    return data ? mapUserRow(data) : null;
  },

  async countUsers() {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase.from("users").select("*", { count: "exact", head: true });
    handleError("countUsers", error);
    return count || 0;
  },

  async listUsers(limit) {
    const supabase = getSupabaseClient();
    let query = supabase.from("users").select("*").order("created_at", { ascending: false });
    if (Number.isFinite(limit) && limit > 0) {
      query = query.limit(Math.floor(limit));
    }
    const { data, error } = await query;
    handleError("listUsers", error);
    return (data || []).map(mapUserRow);
  },

  async listLeadsByOwner(ownerUserId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .order("created_at", { ascending: false });
    handleError("listLeadsByOwner", error);
    return (data || []).map(mapLeadRow);
  },

  async countLeadsByOwner(ownerUserId) {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("owner_user_id", ownerUserId);
    handleError("countLeadsByOwner", error);
    return count || 0;
  },

  async countLeads() {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase.from("leads").select("*", { count: "exact", head: true });
    handleError("countLeads", error);
    return count || 0;
  },

  async createLead(payload) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("leads")
      .insert({
        owner_user_id: payload.ownerUserId,
        name: payload.name,
        source: payload.source,
        contact: payload.contact,
        note: payload.note,
        status: payload.status || "new"
      })
      .select("*")
      .single();
    handleError("createLead", error);
    return mapLeadRow(data);
  },

  async updateLeadStatusByOwner(leadId, ownerUserId, status) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("leads")
      .update({ status })
      .eq("id", leadId)
      .eq("owner_user_id", ownerUserId)
      .select("*")
      .maybeSingle();
    handleError("updateLeadStatusByOwner", error);
    return data ? mapLeadRow(data) : null;
  },

  async deleteLeadByOwner(leadId, ownerUserId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("leads")
      .delete()
      .eq("id", leadId)
      .eq("owner_user_id", ownerUserId)
      .select("id")
      .maybeSingle();
    handleError("deleteLeadByOwner", error);
    return Boolean(data?.id);
  },

  async listTasksByOwner(ownerUserId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .order("created_at", { ascending: false });
    handleError("listTasksByOwner", error);
    return (data || []).map(mapTaskRow);
  },

  async countTasks() {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase.from("tasks").select("*", { count: "exact", head: true });
    handleError("countTasks", error);
    return count || 0;
  },

  async listTasks(limit) {
    const supabase = getSupabaseClient();
    let query = supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (Number.isFinite(limit) && limit > 0) {
      query = query.limit(Math.floor(limit));
    }
    const { data, error } = await query;
    handleError("listTasks", error);
    return (data || []).map(mapTaskRow);
  },

  async createTask(payload) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        owner_user_id: payload.ownerUserId,
        title: payload.title,
        description: payload.description,
        type: payload.type,
        status: payload.status,
        due_at: payload.dueAt
      })
      .select("*")
      .single();
    handleError("createTask", error);
    return mapTaskRow(data);
  },

  async updateTaskByOwner(taskId, ownerUserId, patch) {
    const supabase = getSupabaseClient();
    const nextPatch = {};
    if (patch.title !== undefined) nextPatch.title = patch.title;
    if (patch.description !== undefined) nextPatch.description = patch.description;
    if (patch.type !== undefined) nextPatch.type = patch.type;
    if (patch.status !== undefined) nextPatch.status = patch.status;
    if (patch.dueAt !== undefined) nextPatch.due_at = patch.dueAt;

    const { data, error } = await supabase
      .from("tasks")
      .update(nextPatch)
      .eq("id", taskId)
      .eq("owner_user_id", ownerUserId)
      .select("*")
      .maybeSingle();
    handleError("updateTaskByOwner", error);
    return data ? mapTaskRow(data) : null;
  },

  async deleteTaskByOwner(taskId, ownerUserId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("owner_user_id", ownerUserId)
      .select("id")
      .maybeSingle();
    handleError("deleteTaskByOwner", error);
    return Boolean(data?.id);
  },

  async updateTask(taskId, patch) {
    const supabase = getSupabaseClient();
    const nextPatch = {};
    if (patch.title !== undefined) nextPatch.title = patch.title;
    if (patch.description !== undefined) nextPatch.description = patch.description;
    if (patch.type !== undefined) nextPatch.type = patch.type;
    if (patch.status !== undefined) nextPatch.status = patch.status;
    if (patch.dueAt !== undefined) nextPatch.due_at = patch.dueAt;

    const { data, error } = await supabase.from("tasks").update(nextPatch).eq("id", taskId).select("*").maybeSingle();
    handleError("updateTask", error);
    return data ? mapTaskRow(data) : null;
  }
};
