import { createServer } from "node:http";
import { app } from "./src/app.js";
import { connectDatabase } from "./src/config/database.js";
import { env } from "./src/config/env.js";

async function bootstrap() {
  try {
    await connectDatabase();
    const server = createServer(app);
    server.requestTimeout = 15 * 1000;
    server.headersTimeout = 16 * 1000;
    server.keepAliveTimeout = 5 * 1000;

    server.listen(env.PORT, () => {
      console.log(`[server] Running on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("[server] Startup failed", error);
    process.exit(1);
  }
}

bootstrap();
