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

function hasOwnKeys(value) {
  return Boolean(value && typeof value === "object" && Object.keys(value).length > 0);
}

function isMissingColumnError(error, columnName) {
  if (!error) return false;
  const message = String(error.message || error.details || "").toLowerCase();
  const code = String(error.code || "");
  return (
    code === "PGRST204" ||
    code === "42703" ||
    message.includes(`'${columnName}'`) ||
    message.includes(`column ${columnName}`) ||
    message.includes(`.${columnName}`)
  );
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

export function mapBasicUserRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    plan: row.plan,
    isEmailVerified: row.is_email_verified,
    createdAt: row.created_at
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

export function mapContentGenerationRow(row) {
  return {
    _id: row.id,
    id: row.id,
    ownerUserId: row.owner_user_id,
    channel: row.channel || "",
    goal: row.goal || "",
    audience: row.audience || "",
    productOrService: row.product_or_service || "",
    tone: row.tone || "",
    language: row.language || "",
    specialNote: row.special_note || "",
    headline: row.headline || "",
    body: row.body || "",
    cta: row.cta || "",
    replyTemplate: row.reply_template || "",
    hashtags: Array.isArray(row.hashtags) ? row.hashtags : [],
    provider: row.provider || "ai",
    model: row.model || "",
    isFallback: Boolean(row.is_fallback),
    fallbackReason: row.fallback_reason || "",
    createdAt: row.created_at
  };
}

export function mapIntegrationWebhookEventRow(row) {
  return {
    id: row.id,
    provider: row.provider,
    eventType: row.event_type || "unknown",
    signature: row.signature || "",
    payload: row.payload || {},
    receivedAt: row.received_at
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
    if (!hasOwnKeys(patch)) {
      return dbService.getUserById(userId);
    }

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
    let query = supabase
      .from("users")
      .select("id,name,email,role,plan,is_email_verified,created_at")
      .order("created_at", { ascending: false });
    if (Number.isFinite(limit) && limit > 0) {
      query = query.limit(Math.floor(limit));
    }
    const { data, error } = await query;
    handleError("listUsers", error);
    return (data || []).map(mapBasicUserRow);
  },

  async listUsersByIds(userIds) {
    const supabase = getSupabaseClient();
    const uniqueIds = Array.from(new Set((Array.isArray(userIds) ? userIds : []).filter(Boolean)));
    if (!uniqueIds.length) return [];

    const { data, error } = await supabase
      .from("users")
      .select("id,name,email,role,plan,is_email_verified,created_at")
      .in("id", uniqueIds);
    handleError("listUsersByIds", error);
    return (data || []).map(mapBasicUserRow);
  },

  async listAdminUsers(limit = 10) {
    const supabase = getSupabaseClient();
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(50, Math.floor(limit))) : 10;
    const { data, error } = await supabase
      .from("users")
      .select("id,name,email,role,plan,is_email_verified,created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: true })
      .limit(safeLimit);
    handleError("listAdminUsers", error);
    return (data || []).map(mapBasicUserRow);
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

  async listContentGenerationsByOwner(ownerUserId, limit = 20) {
    const supabase = getSupabaseClient();
    const cappedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.floor(limit))) : 20;
    const baseSelect =
      "id,owner_user_id,channel,goal,audience,product_or_service,tone,language,special_note,headline,body,cta,reply_template,provider,model,is_fallback,fallback_reason,created_at";
    let query = supabase
      .from("content_generations")
      .select(`${baseSelect},hashtags`)
      .eq("owner_user_id", ownerUserId)
      .order("created_at", { ascending: false })
      .limit(cappedLimit);
    let { data, error } = await query;
    if (isMissingColumnError(error, "hashtags")) {
      const fallback = await supabase
        .from("content_generations")
        .select(baseSelect)
        .eq("owner_user_id", ownerUserId)
        .order("created_at", { ascending: false })
        .limit(cappedLimit);
      data = fallback.data;
      error = fallback.error;
    }
    handleError("listContentGenerationsByOwner", error);
    return (data || []).map(mapContentGenerationRow);
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

  async createContentGeneration(payload) {
    const supabase = getSupabaseClient();
    const insertPayload = {
      owner_user_id: payload.ownerUserId,
      channel: payload.channel || "",
      goal: payload.goal || "",
      audience: payload.audience || "",
      product_or_service: payload.productOrService || "",
      tone: payload.tone || "",
      language: payload.language || "",
      special_note: payload.specialNote || "",
      headline: payload.headline || "",
      body: payload.body || "",
      cta: payload.cta || "",
      reply_template: payload.replyTemplate || "",
      hashtags: Array.isArray(payload.hashtags) ? payload.hashtags : [],
      provider: payload.provider || "ai",
      model: payload.model || "",
      is_fallback: Boolean(payload.isFallback),
      fallback_reason: payload.fallbackReason || ""
    };

    let { data, error } = await supabase.from("content_generations").insert(insertPayload).select("*").single();
    if (isMissingColumnError(error, "hashtags")) {
      const { hashtags: _hashtags, ...legacyPayload } = insertPayload;
      const fallback = await supabase.from("content_generations").insert(legacyPayload).select("*").single();
      data = fallback.data;
      error = fallback.error;
    }
    handleError("createContentGeneration", error);
    return mapContentGenerationRow(data);
  },

  async createIntegrationWebhookEvent(payload) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("integration_webhook_events")
      .insert({
        provider: payload.provider || "unknown",
        event_type: payload.eventType || "unknown",
        signature: payload.signature || "",
        payload: payload.payload || {}
      })
      .select("*")
      .single();
    handleError("createIntegrationWebhookEvent", error);
    return mapIntegrationWebhookEventRow(data);
  },

  async listIntegrationWebhookEvents(provider, limit = 50) {
    const supabase = getSupabaseClient();
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, Math.floor(limit))) : 50;
    let query = supabase
      .from("integration_webhook_events")
      .select("id,provider,event_type,signature,payload,received_at")
      .order("received_at", { ascending: false })
      .limit(safeLimit);

    if (provider) {
      query = query.eq("provider", provider);
    }

    const { data, error } = await query;
    handleError("listIntegrationWebhookEvents", error);
    return (data || []).map(mapIntegrationWebhookEventRow);
  },

  async pruneContentGenerationsByOwner(ownerUserId, keepLimit = 120) {
    const supabase = getSupabaseClient();
    const safeKeepLimit = Number.isFinite(keepLimit) ? Math.max(20, Math.min(1000, Math.floor(keepLimit))) : 120;
    const fetchUntil = safeKeepLimit + 200;

    const { data, error } = await supabase
      .from("content_generations")
      .select("id")
      .eq("owner_user_id", ownerUserId)
      .order("created_at", { ascending: false })
      .range(safeKeepLimit, fetchUntil);
    handleError("pruneContentGenerationsByOwner:select", error);

    const staleIds = (data || []).map((row) => row.id).filter(Boolean);
    if (!staleIds.length) return 0;

    const { error: deleteError } = await supabase.from("content_generations").delete().in("id", staleIds);
    handleError("pruneContentGenerationsByOwner:delete", deleteError);
    return staleIds.length;
  },

  async updateTaskByOwner(taskId, ownerUserId, patch) {
    const supabase = getSupabaseClient();
    const nextPatch = {};
    if (patch.title !== undefined) nextPatch.title = patch.title;
    if (patch.description !== undefined) nextPatch.description = patch.description;
    if (patch.type !== undefined) nextPatch.type = patch.type;
    if (patch.status !== undefined) nextPatch.status = patch.status;
    if (patch.dueAt !== undefined) nextPatch.due_at = patch.dueAt;
    if (!hasOwnKeys(nextPatch)) return null;

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
    if (!hasOwnKeys(nextPatch)) return null;

    const { data, error } = await supabase.from("tasks").update(nextPatch).eq("id", taskId).select("*").maybeSingle();
    handleError("updateTask", error);
    return data ? mapTaskRow(data) : null;
  }
};
