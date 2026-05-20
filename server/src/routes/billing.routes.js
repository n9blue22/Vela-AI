import express from "express";
import { PLAN, getPlanLimit } from "../constants/plan.js";
import { requireAuth } from "../middleware/auth.js";
import { dbService } from "../services/db.service.js";
import { isValidPlan } from "../services/user.service.js";
import { normalizeOptionalText, normalizeText } from "../utils/validation.js";

const router = express.Router();
const PAID_PLANS = new Set([PLAN.TIET_KIEM, PLAN.CAO_CAP]);

function formatAmountVnd(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "N/A";
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(amount))} VND`;
}

function pickAdmin(admins) {
  return admins.find((admin) => admin.email) || admins[0] || null;
}

router.post("/upgrade-requests", requireAuth, async (req, res) => {
  try {
    const targetPlan = String(req.body?.plan || "").trim();
    const transferContent = normalizeText(req.body?.transferContent, { min: 4, max: 120 });
    const amountVnd = Number(req.body?.amountVnd);
    const note = normalizeOptionalText(req.body?.note, { max: 500 });

    if (!isValidPlan(targetPlan) || !PAID_PLANS.has(targetPlan)) {
      return res.status(400).json({ message: "Goi nang cap khong hop le." });
    }
    if (req.user.plan === targetPlan) {
      return res.status(400).json({ message: "Tai khoan dang dung goi nay roi." });
    }
    if (!transferContent || note === null || !Number.isFinite(amountVnd) || amountVnd <= 0) {
      return res.status(400).json({ message: "Thong tin thanh toan khong hop le." });
    }

    const admins = await dbService.listAdminUsers(10);
    const assignedAdmin = pickAdmin(admins);
    if (!assignedAdmin) {
      return res.status(500).json({ message: "He thong chua co admin de nhan yeu cau nang cap." });
    }

    const planLimit = getPlanLimit(targetPlan);
    const task = await dbService.createTask({
      ownerUserId: assignedAdmin.id,
      title: `Duyet thanh toan goi ${planLimit.label} - ${req.user.name}`,
      description: [
        `Khach hang: ${req.user.name} (${req.user.email})`,
        `User ID: ${req.user.id}`,
        `Goi hien tai: ${getPlanLimit(req.user.plan).label}`,
        `Goi muon nang cap: ${planLimit.label}`,
        `So tien can doi soat: ${formatAmountVnd(amountVnd)}`,
        `Noi dung chuyen khoan: ${transferContent}`,
        note ? `Ghi chu: ${note}` : "",
        "Khach da bam xac nhan chuyen tien trong dashboard. Admin can kiem tra tien vao truoc khi cap goi."
      ]
        .filter(Boolean)
        .join("\n"),
      type: "admin",
      status: "todo",
      dueAt: null
    });

    return res.status(201).json({
      message: "Da gui yeu cau nang cap den admin.",
      task,
      assignedAdmin: {
        id: assignedAdmin.id,
        name: assignedAdmin.name,
        email: assignedAdmin.email
      }
    });
  } catch (error) {
    console.error("[billing] upgrade request failed", error);
    const message = error instanceof Error ? error.message : "Khong the ghi nhan yeu cau nang cap.";
    return res.status(500).json({ message });
  }
});

export { router as billingRouter };
