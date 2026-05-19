import bcrypt from "bcryptjs";
import express from "express";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { createTokenBucketLimiter } from "../middleware/rate-limit.js";
import { dbService } from "../services/db.service.js";
import { serializeUser } from "../services/user.service.js";
import { createRandomToken, hashToken, signAccessToken } from "../utils/token.js";
import { isStrongPassword, normalizeEmail, normalizeText } from "../utils/validation.js";

const router = express.Router();

const authLimiterOptions = {
  capacity: env.RATE_LIMIT_AUTH_CAPACITY,
  refillPerSecond: env.RATE_LIMIT_AUTH_REFILL_PER_SEC,
  blockDurationMs: env.RATE_LIMIT_AUTH_BLOCK_MS,
  message: "Bạn thao tác đăng nhập quá nhanh. Vui lòng thử lại sau."
};

const registerLimiter = createTokenBucketLimiter({
  ...authLimiterOptions,
  keyPrefix: "auth:register"
});

const loginLimiter = createTokenBucketLimiter({
  ...authLimiterOptions,
  keyPrefix: "auth:login",
  getKey(req) {
    const email = normalizeEmail(req.body?.email) || "unknown";
    return `${req.ip}:${email}`;
  }
});

const forgotPasswordLimiter = createTokenBucketLimiter({
  ...authLimiterOptions,
  keyPrefix: "auth:forgot-password",
  capacity: Math.max(4, Math.floor(env.RATE_LIMIT_AUTH_CAPACITY / 2))
});

const resetPasswordLimiter = createTokenBucketLimiter({
  ...authLimiterOptions,
  keyPrefix: "auth:reset-password"
});

router.post("/register", registerLimiter, async (req, res) => {
  try {
    const cleanName = normalizeText(req.body?.name, { min: 2, max: 80 });
    const normalizedEmail = normalizeEmail(req.body?.email);
    const password = String(req.body?.password ?? "");

    if (!cleanName || !normalizedEmail || !password) {
      return res.status(400).json({ message: "Thiếu hoặc sai thông tin đăng ký." });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message: "Mật khẩu cần từ 8-72 ký tự và có ít nhất 1 chữ cái + 1 số."
      });
    }

    const existing = await dbService.getUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ message: "Email đã tồn tại." });
    }

    const role = env.ADMIN_BOOTSTRAP_EMAILS.includes(normalizedEmail) ? "admin" : "customer";
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await dbService.createUser({
      name: cleanName,
      email: normalizedEmail,
      passwordHash,
      role,
      plan: "mien_phi",
      isEmailVerified: true,
      emailVerificationTokenHash: "",
      emailVerificationExpiresAt: null
    });

    return res.status(201).json({
      message: "Đăng ký thành công. Tài khoản đã sẵn sàng sử dụng.",
      user: serializeUser(user)
    });
  } catch (error) {
    console.error("[auth] register failed", error);
    const message = error instanceof Error ? error.message : "Không thể đăng ký tài khoản.";
    return res.status(500).json({ message });
  }
});

router.post("/verify-email", async (_req, res) => {
  return res.json({ message: "Tính năng xác thực email đã tắt để tối ưu chi phí." });
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);
    const password = String(req.body?.password ?? "");
    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Thiếu thông tin đăng nhập." });
    }

    const user = await dbService.getUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });
    }

    const token = signAccessToken({ userId: user.id });
    return res.json({
      token,
      user: serializeUser(user)
    });
  } catch (error) {
    console.error("[auth] login failed", error);
    return res.status(500).json({ message: "Không thể đăng nhập." });
  }
});

router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);
    if (!normalizedEmail) {
      return res.status(400).json({ message: "Vui lòng nhập email hợp lệ." });
    }

    const user = await dbService.getUserByEmail(normalizedEmail);
    if (!user) {
      return res.json({ message: "Nếu email tồn tại, chúng tôi đã tạo liên kết đặt lại mật khẩu." });
    }

    const rawResetToken = createRandomToken();
    const updated = await dbService.updateUserById(user.id, {
      resetPasswordTokenHash: hashToken(rawResetToken),
      resetPasswordExpiresAt: new Date(Date.now() + 1000 * 60 * 15)
    });
    if (!updated) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản." });
    }

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${rawResetToken}&email=${encodeURIComponent(normalizedEmail)}`;
    const payload = {
      message: "Đã tạo liên kết đặt lại mật khẩu."
    };

    if (env.ALLOW_RESET_TOKEN_IN_RESPONSE) {
      return res.json({
        ...payload,
        resetToken: rawResetToken,
        resetUrl
      });
    }

    return res.json(payload);
  } catch (error) {
    console.error("[auth] forgot-password failed", error);
    return res.status(500).json({ message: "Không thể xử lý yêu cầu quên mật khẩu." });
  }
});

router.post("/reset-password", resetPasswordLimiter, async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);
    const token = normalizeText(req.body?.token, { min: 16, max: 256 });
    const password = String(req.body?.password ?? "");

    if (!normalizedEmail || !token || !password) {
      return res.status(400).json({ message: "Thiếu dữ liệu đặt lại mật khẩu." });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message: "Mật khẩu mới cần từ 8-72 ký tự và có ít nhất 1 chữ cái + 1 số."
      });
    }

    const user = await dbService.getUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản." });
    }

    const isTokenValid = user.resetPasswordTokenHash === hashToken(token);
    const isNotExpired = user.resetPasswordExpiresAt && user.resetPasswordExpiresAt.getTime() > Date.now();
    if (!isTokenValid || !isNotExpired) {
      return res.status(400).json({ message: "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const updated = await dbService.updateUserById(user.id, {
      passwordHash,
      resetPasswordTokenHash: "",
      resetPasswordExpiresAt: null
    });
    if (!updated) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản." });
    }

    return res.json({ message: "Đặt lại mật khẩu thành công." });
  } catch (error) {
    console.error("[auth] reset-password failed", error);
    return res.status(500).json({ message: "Không thể đặt lại mật khẩu." });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  return res.json({ user: serializeUser(req.user) });
});

router.patch("/me", requireAuth, async (req, res) => {
  try {
    const patch = {};
    const rawName = req.body?.name;
    const rawCurrentPassword = req.body?.currentPassword;
    const rawNewPassword = req.body?.newPassword;

    if (rawName === undefined && rawNewPassword === undefined) {
      return res.status(400).json({ message: "Không có dữ liệu cần cập nhật." });
    }

    if (rawName !== undefined) {
      const cleanName = normalizeText(rawName, { min: 2, max: 80 });
      if (!cleanName) {
        return res.status(400).json({ message: "Tên cần từ 2 đến 80 ký tự." });
      }
      patch.name = cleanName;
    }

    if (rawNewPassword !== undefined && String(rawNewPassword).trim().length > 0) {
      if (!rawCurrentPassword) {
        return res.status(400).json({ message: "Vui lòng nhập mật khẩu hiện tại." });
      }

      const passwordOk = await bcrypt.compare(String(rawCurrentPassword), req.user.passwordHash);
      if (!passwordOk) {
        return res.status(401).json({ message: "Mật khẩu hiện tại không đúng." });
      }

      if (!isStrongPassword(rawNewPassword)) {
        return res.status(400).json({
          message: "Mật khẩu mới cần từ 8-72 ký tự và có ít nhất 1 chữ cái + 1 số."
        });
      }

      patch.passwordHash = await bcrypt.hash(String(rawNewPassword), 12);
    }

    const updatedUser = await dbService.updateUserById(req.user.id, patch);
    if (!updatedUser) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản." });
    }

    return res.json({
      message: "Cập nhật tài khoản thành công.",
      user: serializeUser(updatedUser)
    });
  } catch (error) {
    console.error("[auth] update me failed", error);
    const message = error instanceof Error ? error.message : "Không thể cập nhật tài khoản.";
    return res.status(500).json({ message });
  }
});

export { router as authRouter };
