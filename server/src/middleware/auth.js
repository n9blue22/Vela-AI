import { dbService } from "../services/db.service.js";
import { verifyAccessToken } from "../utils/token.js";

const AUTH_USER_CACHE_TTL_MS = 15 * 1000;
const authUserCache = new Map();

export function getCachedAuthUser(userId) {
  const cached = authUserCache.get(userId);
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    authUserCache.delete(userId);
    return null;
  }
  return cached.user;
}

export function cacheAuthUser(user) {
  if (!user?.id) return;
  authUserCache.set(user.id, {
    user,
    expiresAt: Date.now() + AUTH_USER_CACHE_TTL_MS
  });
}

export function invalidateAuthUserCache(userId) {
  if (!userId) return;
  authUserCache.delete(userId);
}

setInterval(() => {
  const now = Date.now();
  for (const [userId, entry] of authUserCache) {
    if (entry.expiresAt < now) {
      authUserCache.delete(userId);
    }
  }
}, 60 * 1000).unref();

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) {
      return res.status(401).json({ message: "Chưa đăng nhập." });
    }

    const payload = verifyAccessToken(token);
    let user = getCachedAuthUser(payload.userId);

    if (!user) {
      user = await dbService.getUserById(payload.userId);
      if (user) {
        cacheAuthUser(user);
      }
    }

    if (!user) {
      return res.status(401).json({ message: "Tài khoản không tồn tại." });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error("[auth] requireAuth failed", error);
    return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ." });
  }
}
