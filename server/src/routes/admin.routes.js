import express from "express";
import { PLAN, getPlanLimit } from "../constants/plan.js";
import { requireAdmin } from "../middleware/admin.js";
import { cacheAuthUser, requireAuth } from "../middleware/auth.js";
import { getSupabaseClient } from "../config/supabase.js";
import { dbService } from "../services/db.service.js";
import { isValidPlan, serializeUser } from "../services/user.service.js";
import { isValidUuid, normalizeEmail, normalizeOptionalText, normalizeText } from "../utils/validation.js";

const router = express.Router();

const TASK_TYPES = new Set(["marketing", "follow_up", "booking", "admin"]);
const TASK_STATUSES = new Set(["todo", "in_progress", "done"]);

function parseLimit(rawValue, fallback = 200) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), 1), 500);
}

router.use(requireAuth, requireAdmin);

router.get("/overview", async (_req, res) => {
  try {
    const [users, leads, tasks] = await Promise.all([dbService.countUsers(), dbService.countLeads(), dbService.countTasks()]);
    return res.json({ users, leads, tasks });
  } catch (error) {
    console.error("[admin] overview failed", error);
    return res.status(500).json({ message: "Không thể lấy tổng quan admin." });
  }
});

router.get("/users", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 250);
    const users = await dbService.listUsers(limit);

    return res.json({
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        planLimit: getPlanLimit(user.plan)
      }))
    });
  } catch (error) {
    console.error("[admin] users failed", error);
    return res.status(500).json({ message: "Không thể lấy danh sách người dùng." });
  }
});

router.patch("/users/:userId/plan", async (req, res) => {
  try {
    const userId = req.params.userId;
    const plan = String(req.body?.plan ?? "");
    if (!isValidUuid(userId) || !isValidPlan(plan)) {
      return res.status(400).json({ message: "Dữ liệu gói dịch vụ không hợp lệ." });
    }

    const user = await dbService.updateUserById(userId, { plan });
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }
    cacheAuthUser(user);
    return res.json({ user: serializeUser(user) });
  } catch (error) {
    console.error("[admin] update plan failed", error);
    return res.status(500).json({ message: "Không thể cập nhật gói dịch vụ." });
  }
});

router.patch("/users/:userId/role", async (req, res) => {
  try {
    const userId = req.params.userId;
    const role = String(req.body?.role ?? "");

    if (!isValidUuid(userId) || !["customer", "admin"].includes(role)) {
      return res.status(400).json({ message: "Vai trò không hợp lệ." });
    }

    if (req.user.id === userId && role !== "admin") {
      return res.status(400).json({ message: "Không thể tự gỡ quyền admin của chính bạn." });
    }

    const user = await dbService.updateUserById(userId, { role });
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }
    cacheAuthUser(user);
    return res.json({ user: serializeUser(user) });
  } catch (error) {
    console.error("[admin] update role failed", error);
    return res.status(500).json({ message: "Không thể cập nhật vai trò." });
  }
});

router.post("/promote-admin", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ message: "Thiếu email cần cấp quyền admin." });
    }

    const user = await dbService.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "Email chưa có tài khoản trong hệ thống." });
    }

    const updated = await dbService.updateUserById(user.id, { role: "admin" });
    if (!updated) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }
    cacheAuthUser(updated);

    return res.json({
      message: "Đã cấp quyền admin.",
      user: serializeUser(updated)
    });
  } catch (error) {
    console.error("[admin] promote admin failed", error);
    return res.status(500).json({ message: "Không thể cấp quyền admin." });
  }
});

router.get("/tasks", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 300);
    const tasks = await dbService.listTasks(limit);
    const ownerUserIds = Array.from(new Set(tasks.map((task) => task.ownerUserId).filter(Boolean)));
    const users = await dbService.listUsersByIds(ownerUserIds);
    const userMap = new Map(users.map((user) => [user.id, user]));

    return res.json({
      tasks: tasks.map((task) => ({
        ...task,
        ownerName: userMap.get(task.ownerUserId)?.name || "N/A",
        ownerEmail: userMap.get(task.ownerUserId)?.email || "N/A"
      }))
    });
  } catch (error) {
    console.error("[admin] tasks failed", error);
    return res.status(500).json({ message: "Không thể lấy toàn bộ công việc." });
  }
});

router.patch("/tasks/:taskId", async (req, res) => {
  try {
    const taskId = req.params.taskId;
    if (!isValidUuid(taskId)) {
      return res.status(400).json({ message: "Task ID không hợp lệ." });
    }

    const patch = {};

    if (req.body.status !== undefined) {
      const status = String(req.body.status);
      if (!TASK_STATUSES.has(status)) return res.status(400).json({ message: "Trạng thái task không hợp lệ." });
      patch.status = status;
    }

    if (req.body.type !== undefined) {
      const type = String(req.body.type);
      if (!TASK_TYPES.has(type)) return res.status(400).json({ message: "Loại task không hợp lệ." });
      patch.type = type;
    }

    if (req.body.title !== undefined) {
      const title = normalizeText(req.body.title, { min: 1, max: 120 });
      if (!title) return res.status(400).json({ message: "Tiêu đề task không hợp lệ." });
      patch.title = title;
    }

    if (req.body.description !== undefined) {
      const description = normalizeOptionalText(req.body.description, { max: 1000 });
      if (description === null) return res.status(400).json({ message: "Mô tả task quá dài." });
      patch.description = description;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: "Không có dữ liệu hợp lệ để cập nhật task." });
    }

    const task = await dbService.updateTask(taskId, patch);
    if (!task) {
      return res.status(404).json({ message: "Không tìm thấy công việc." });
    }

    return res.json({ task });
  } catch (error) {
    console.error("[admin] update task failed", error);
    return res.status(500).json({ message: "Không thể cập nhật công việc." });
  }
});

router.get("/plans", async (_req, res) => {
  try {
    return res.json({
      plans: [
        { id: PLAN.MIEN_PHI, ...getPlanLimit(PLAN.MIEN_PHI) },
        { id: PLAN.TIET_KIEM, ...getPlanLimit(PLAN.TIET_KIEM) },
        { id: PLAN.CAO_CAP, ...getPlanLimit(PLAN.CAO_CAP) }
      ]
    });
  } catch (error) {
    console.error("[admin] plans failed", error);
    return res.status(500).json({ message: "Không thể lấy gói dịch vụ." });
  }
});

router.get("/integrations/webhooks", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 50);
    const providerRaw = normalizeOptionalText(req.query.provider, { max: 40 });
    if (providerRaw === null) {
      return res.status(400).json({ message: "Provider filter không hợp lệ." });
    }
    const provider = providerRaw ? providerRaw.toLowerCase() : "";

    const items = await dbService.listIntegrationWebhookEvents(provider, limit);
    return res.json({ items });
  } catch (error) {
    console.error("[admin] list webhook events failed", error);
    return res.status(500).json({ message: "Không thể lấy lịch sử webhook." });
  }
});

router.get("/debug-check", async (_req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("users").select("id").limit(1);
    if (error) {
      throw error;
    }
    return res.json({ ok: true });
  } catch (error) {
    console.error("[admin] debug-check failed", error);
    return res.status(500).json({ ok: false, message: "Supabase check failed." });
  }
});

export { router as adminRouter };
