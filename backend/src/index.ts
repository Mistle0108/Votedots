import "reflect-metadata";
import { createApp } from "./app";
import { loadEnvironment } from "./config/load-env";
import { connectWithRetry } from "./database/db-connection.manager";
import { connectRedis } from "./config/redis";
import { ensureGameHistoryStorageRoot } from "./modules/history/history-storage.service";
import { createServer } from "./server";

loadEnvironment();

const app = createApp();
const { server, io } = createServer(app);

async function startServer() {
  try {
    await ensureGameHistoryStorageRoot();
    await connectRedis();
  } catch (error) {
    console.error("[startup] failed to initialize runtime dependencies:", error);
    process.exit(1);
    return;
  }

  void connectWithRetry(io, "server startup");

  const PORT = process.env.PORT ?? 4000;
  server.listen(PORT, () => {
    console.log(`server is running on http://localhost:${PORT}`);
  });
}

void startServer();
