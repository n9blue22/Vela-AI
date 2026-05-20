import { createServer } from "node:http";
import { app } from "./src/app.js";
import { connectDatabase } from "./src/config/database.js";
import { env } from "./src/config/env.js";

function setupProcessSafety() {
  process.on("unhandledRejection", (error) => {
    console.error("[server] Unhandled rejection", error);
    process.exit(1);
  });

  process.on("uncaughtException", (error) => {
    console.error("[server] Uncaught exception", error);
    process.exit(1);
  });
}

async function bootstrap() {
  try {
    setupProcessSafety();
    await connectDatabase();
    const server = createServer(app);
    server.requestTimeout = 15 * 1000;
    server.headersTimeout = 16 * 1000;
    server.keepAliveTimeout = 5 * 1000;
    server.on("error", (error) => {
      if (error?.code === "EADDRINUSE") {
        console.error(`[server] Port ${env.PORT} dang bi chiem. Hay tat process cu hoac doi PORT trong .env.`);
        process.exit(1);
      }
      console.error("[server] HTTP server error", error);
      process.exit(1);
    });

    server.listen(env.PORT, () => {
      console.log(`[server] Running on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("[server] Startup failed", error);
    process.exit(1);
  }
}

bootstrap();
