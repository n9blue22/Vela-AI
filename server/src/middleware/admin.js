export function requireAdmin(req, res, next) {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Bạn không có quyền admin." });
    }
    return next();
  } catch (error) {
    console.error("[auth] requireAdmin failed", error);
    return res.status(403).json({ message: "Không thể xác thực quyền admin." });
  }
}
