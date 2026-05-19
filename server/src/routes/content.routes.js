import express from "express";
import { env } from "../config/env.js";
import { getPlanLimit } from "../constants/plan.js";
import { requireAuth } from "../middleware/auth.js";
import { createTokenBucketLimiter } from "../middleware/rate-limit.js";
import { dbService } from "../services/db.service.js";
import { generateFallbackSpaContent } from "../services/fallback-content.service.js";
import { generateSpaContent } from "../services/gemini.service.js";
import { getDateKey } from "../utils/date.js";
import { normalizeOptionalText, normalizeText } from "../utils/validation.js";

const router = express.Router();

const contentLimiter = createTokenBucketLimiter({
  keyPrefix: "content:generate",
  capacity: env.RATE_LIMIT_CONTENT_CAPACITY,
  refillPerSecond: env.RATE_LIMIT_CONTENT_REFILL_PER_SEC,
  blockDurationMs: env.RATE_LIMIT_CONTENT_BLOCK_MS,
  message: "Bạn đang tạo nội dung quá nhanh. Vui lòng chờ một chút rồi thử lại."
});

function sanitizeGeneratePayload(rawBody) {
  const profile = rawBody?.profile ?? {};
  const input = rawBody?.input ?? {};

  const businessName = normalizeText(profile.businessName, { min: 2, max: 120 });
  const industry = normalizeText(profile.industry, { min: 2, max: 80 });
  const keyMessage = normalizeOptionalText(profile.keyMessage, { max: 200 });

  const channel = normalizeText(input.channel, { min: 2, max: 40 });
  const goal = normalizeText(input.goal, { min: 5, max: 220 });
  const audience = normalizeText(input.audience, { min: 5, max: 220 });
  const productOrService = normalizeText(input.productOrService, { min: 3, max: 220 });
  const tone = normalizeOptionalText(input.tone, { max: 40 });
  const language = normalizeOptionalText(input.language, { max: 20 });
  const specialNote = normalizeOptionalText(input.specialNote, { max: 300 });

  if (!businessName || !industry || keyMessage === null || !channel || !goal || !audience || !productOrService || tone === null || language === null || specialNote === null) {
    return null;
  }

  return {
    profile: {
      businessName,
      industry,
      keyMessage
    },
    input: {
      channel,
      goal,
      audience,
      productOrService,
      tone,
      language,
      specialNote
    }
  };
}

router.get("/quota", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const today = getDateKey();
    const planLimit = getPlanLimit(user.plan);
    const currentCount = user.dailyUsageDateKey === today ? user.dailyContentCount : 0;

    return res.json({
      plan: user.plan,
      limit: planLimit.dailyContentGenerations,
      used: currentCount,
      remaining: Math.max(planLimit.dailyContentGenerations - currentCount, 0)
    });
  } catch (error) {
    console.error("[content] quota failed", error);
    return res.status(500).json({ message: "Không thể lấy hạn mức AI." });
  }
});

router.post("/generate", requireAuth, contentLimiter, async (req, res) => {
  const userFromToken = req.user;
  const today = getDateKey();
  const planLimit = getPlanLimit(userFromToken.plan);
  let currentCount = userFromToken.dailyUsageDateKey === today ? userFromToken.dailyContentCount : 0;

  const sanitizedPayload = sanitizeGeneratePayload(req.body);
  if (!sanitizedPayload) {
    return res.status(400).json({ message: "Thiếu hoặc sai thông tin tạo nội dung." });
  }

  try {
    let user = userFromToken;
    if (currentCount >= planLimit.dailyContentGenerations) {
      return res.status(403).json({
        message: `Bạn đã dùng hết lượt tạo nội dung hôm nay cho gói ${planLimit.label}.`,
        plan: user.plan
      });
    }

    const content = await generateSpaContent(sanitizedPayload);

    currentCount += 1;
    user = await dbService.updateUserById(user.id, {
      dailyUsageDateKey: today,
      dailyContentCount: currentCount
    });
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản." });
    }

    return res.json({
      content,
      quota: {
        used: user.dailyContentCount,
        limit: planLimit.dailyContentGenerations,
        remaining: Math.max(planLimit.dailyContentGenerations - user.dailyContentCount, 0)
      },
      meta: {
        provider: "gemini",
        fallback: false
      }
    });
  } catch (error) {
    console.error("[content] generate failed", error);

    const fallbackContent = generateFallbackSpaContent(sanitizedPayload);
    const message = error instanceof Error ? error.message : "";

    let reason = "provider_error";
    let notice = "Đã chuyển sang chế độ dự phòng để tạo nội dung mẫu.";

    if (message.includes("RESOURCE_EXHAUSTED") || message.includes("Quota exceeded")) {
      reason = "quota";
      notice = "Gemini hết quota, hệ thống đã dùng chế độ dự phòng.";
    } else if (message.includes("API key not valid") || message.includes("invalid API key")) {
      reason = "invalid_key";
      notice = "GEMINI_API_KEY không hợp lệ, hệ thống đã dùng chế độ dự phòng.";
    } else if (message.includes("GEMINI_API_KEY")) {
      reason = "missing_key";
      notice = "Server thiếu GEMINI_API_KEY, hệ thống đã dùng chế độ dự phòng.";
    }

    return res.status(200).json({
      content: fallbackContent,
      quota: {
        used: currentCount,
        limit: planLimit.dailyContentGenerations,
        remaining: Math.max(planLimit.dailyContentGenerations - currentCount, 0)
      },
      meta: {
        provider: "fallback_template",
        fallback: true,
        reason,
        notice
      }
    });
  }
});

export { router as contentRouter };
