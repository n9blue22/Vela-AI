import express from "express";
import { getPlanLimit } from "../constants/plan.js";
import { requireAuth } from "../middleware/auth.js";
import { dbService } from "../services/db.service.js";
import { normalizeOptionalText, normalizeText, isValidUuid } from "../utils/validation.js";

const router = express.Router();

const LEAD_STATUSES = new Set(["new", "contacted", "negotiating", "won", "lost"]);

router.get("/", requireAuth, async (req, res) => {
  try {
    const leads = await dbService.listLeadsByOwner(req.user.id);
    return res.json({ leads });
  } catch (error) {
    console.error("[leads] list failed", error);
    return res.status(500).json({ message: "Không thể lấy danh sách lead." });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const cleanName = normalizeText(req.body?.name, { min: 1, max: 120 });
    const source = normalizeOptionalText(req.body?.source, { max: 80 });
    const contact = normalizeOptionalText(req.body?.contact, { max: 160 });
    const note = normalizeOptionalText(req.body?.note, { max: 500 });

    if (!cleanName || source === null || contact === null || note === null) {
      return res.status(400).json({ message: "Thông tin lead không hợp lệ." });
    }

    const planLimit = getPlanLimit(req.user.plan);
    const count = await dbService.countLeadsByOwner(req.user.id);
    if (count >= planLimit.maxLeads) {
      return res.status(403).json({
        message: `Gói ${planLimit.label} chỉ hỗ trợ tối đa ${planLimit.maxLeads} lead.`,
        plan: req.user.plan
      });
    }

    const lead = await dbService.createLead({
      ownerUserId: req.user.id,
      name: cleanName,
      source,
      contact,
      note,
      status: "new"
    });

    return res.status(201).json({ lead });
  } catch (error) {
    console.error("[leads] create failed", error);
    return res.status(500).json({ message: "Không thể thêm lead." });
  }
});

router.patch("/:leadId/status", requireAuth, async (req, res) => {
  try {
    const leadId = req.params.leadId;
    const status = String(req.body?.status ?? "");
    if (!isValidUuid(leadId) || !LEAD_STATUSES.has(status)) {
      return res.status(400).json({ message: "Dữ liệu cập nhật lead không hợp lệ." });
    }

    const lead = await dbService.updateLeadStatusByOwner(leadId, req.user.id, status);
    if (!lead) {
      return res.status(404).json({ message: "Không tìm thấy lead." });
    }

    return res.json({ lead });
  } catch (error) {
    console.error("[leads] update status failed", error);
    return res.status(500).json({ message: "Không thể cập nhật lead." });
  }
});

router.delete("/:leadId", requireAuth, async (req, res) => {
  try {
    const leadId = req.params.leadId;
    if (!isValidUuid(leadId)) {
      return res.status(400).json({ message: "Lead ID không hợp lệ." });
    }

    const deleted = await dbService.deleteLeadByOwner(leadId, req.user.id);
    if (!deleted) {
      return res.status(404).json({ message: "Không tìm thấy lead để xóa." });
    }

    return res.json({ message: "Đã xóa lead." });
  } catch (error) {
    console.error("[leads] delete failed", error);
    return res.status(500).json({ message: "Không thể xóa lead." });
  }
});

export { router as leadRouter };
