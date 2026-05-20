import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { dbService } from "../services/db.service.js";
import { isValidUuid, normalizeDateOnly, normalizeOptionalText, normalizeText } from "../utils/validation.js";

const router = express.Router();

const TASK_TYPES = new Set(["marketing", "follow_up", "booking", "admin"]);
const TASK_STATUSES = new Set(["todo", "in_progress", "done"]);

router.get("/", requireAuth, async (req, res) => {
  try {
    const tasks = await dbService.listTasksByOwner(req.user.id);
    return res.json({ tasks });
  } catch (error) {
    console.error("[tasks] list failed", error);
    return res.status(500).json({ message: "Không thể lấy danh sách công việc." });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const title = normalizeText(req.body?.title, { min: 1, max: 120 });
    const description = normalizeOptionalText(req.body?.description, { max: 1000 });
    const type = req.body?.type ? String(req.body.type) : "marketing";
    const status = req.body?.status ? String(req.body.status) : "todo";
    const dueAt = req.body?.dueAt ? normalizeDateOnly(req.body.dueAt) : null;

    if (!title || description === null || !TASK_TYPES.has(type) || !TASK_STATUSES.has(status)) {
      return res.status(400).json({ message: "Thông tin công việc không hợp lệ." });
    }

    if (req.body?.dueAt && !dueAt) {
      return res.status(400).json({ message: "Định dạng hạn hoàn thành không hợp lệ." });
    }

    const task = await dbService.createTask({
      ownerUserId: req.user.id,
      title,
      description,
      type,
      status,
      dueAt
    });

    return res.status(201).json({ task });
  } catch (error) {
    console.error("[tasks] create failed", error);
    return res.status(500).json({ message: "Không thể tạo công việc." });
  }
});

router.patch("/:taskId", requireAuth, async (req, res) => {
  try {
    const taskId = req.params.taskId;
    if (!isValidUuid(taskId)) {
      return res.status(400).json({ message: "Task ID không hợp lệ." });
    }

    const patch = {};

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

    if (req.body.type !== undefined) {
      const type = String(req.body.type);
      if (!TASK_TYPES.has(type)) return res.status(400).json({ message: "Loại task không hợp lệ." });
      patch.type = type;
    }

    if (req.body.status !== undefined) {
      const status = String(req.body.status);
      if (!TASK_STATUSES.has(status)) return res.status(400).json({ message: "Trạng thái task không hợp lệ." });
      patch.status = status;
    }

    if (req.body.dueAt !== undefined) {
      const dueAt = req.body.dueAt ? normalizeDateOnly(req.body.dueAt) : null;
      if (req.body.dueAt && !dueAt) {
        return res.status(400).json({ message: "Hạn hoàn thành không hợp lệ." });
      }
      patch.dueAt = dueAt;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: "Không có dữ liệu hợp lệ để cập nhật task." });
    }

    const task = await dbService.updateTaskByOwner(taskId, req.user.id, patch);
    if (!task) {
      return res.status(404).json({ message: "Không tìm thấy công việc." });
    }

    return res.json({ task });
  } catch (error) {
    console.error("[tasks] update failed", error);
    return res.status(500).json({ message: "Không thể cập nhật công việc." });
  }
});

router.delete("/:taskId", requireAuth, async (req, res) => {
  try {
    const taskId = req.params.taskId;
    if (!isValidUuid(taskId)) {
      return res.status(400).json({ message: "Task ID không hợp lệ." });
    }

    const deleted = await dbService.deleteTaskByOwner(taskId, req.user.id);
    if (!deleted) {
      return res.status(404).json({ message: "Không tìm thấy công việc để xóa." });
    }

    return res.json({ message: "Đã xóa công việc." });
  } catch (error) {
    console.error("[tasks] delete failed", error);
    return res.status(500).json({ message: "Không thể xóa công việc." });
  }
});

export { router as taskRouter };
