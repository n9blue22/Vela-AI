import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { createTokenBucketLimiter } from "./middleware/rate-limit.js";
import { adminRouter } from "./routes/admin.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { billingRouter } from "./routes/billing.routes.js";
import { contentRouter } from "./routes/content.routes.js";
import { integrationRouter } from "./routes/integration.routes.js";
import { leadRouter } from "./routes/lead.routes.js";
import { taskRouter } from "./routes/task.routes.js";

export const app = express();
app.disable("x-powered-by");

function buildAllowedOrigins() {
  try {
    const configured = new URL(env.FRONTEND_URL);
    const port = configured.port || "5173";
    return new Set([env.FRONTEND_URL, `http://127.0.0.1:${port}`, `http://localhost:${port}`]);
  } catch (error) {
    console.error("[server] Failed to parse FRONTEND_URL", error);
    return new Set([env.FRONTEND_URL, "http://127.0.0.1:5173", "http://localhost:5173"]);
  }
}

const allowedOrigins = buildAllowedOrigins();
const localOriginPattern = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/;

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

app.use(
  cors({
    origin(origin, callback) {
      try {
        if (!origin || allowedOrigins.has(origin) || localOriginPattern.test(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked origin: ${origin}`));
      } catch (error) {
        return callback(error);
      }
    },
    credentials: false
  })
);

// Integration webhooks use raw body signature verification, so mount before express.json.
app.use("/api/integrations", integrationRouter);

app.use(express.json({ limit: "1mb" }));
app.use(
  createTokenBucketLimiter({
    keyPrefix: "api:global",
    capacity: 240,
    refillPerSecond: 8,
    blockDurationMs: 10 * 1000,
    message: "Bạn đang gửi quá nhiều yêu cầu. Vui lòng thử lại sau vài giây."
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/billing", billingRouter);
app.use("/api/content", contentRouter);
app.use("/api/leads", leadRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/admin", adminRouter);

app.use((req, res) => {
  res.status(404).json({ message: `Không tìm thấy API: ${req.method} ${req.path}` });
});

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ message: "Dữ liệu JSON không hợp lệ." });
  }
  console.error("[server] Unhandled error", error);
  return res.status(500).json({ message: "Lỗi hệ thống không xác định." });
});
