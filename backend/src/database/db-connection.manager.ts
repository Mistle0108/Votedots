import { Server } from "socket.io";
import { canvasService } from "../modules/canvas/canvas.service";
import { AppDataSource } from "./data-source";
import { Canvas } from "../entities/canvas.entity";

export type DbConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting";

export interface DbConnectionStateSnapshot {
  status: DbConnectionStatus;
  attempt: number;
  lastError: string | null;
  lastConnectedAt: string | null;
  reconnectScheduled: boolean;
  isInitialized: boolean;
  retryDelayMs: number;
  maxRetries: number;
  healthcheckIntervalMs: number;
  startupRecoveryAttempted: boolean;
}

function readNonNegativeIntegerEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);

  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

const DB_RETRY_DELAY_MS = readNonNegativeIntegerEnv("DB_RETRY_DELAY_MS", 5000);
const DB_MAX_RETRIES = readNonNegativeIntegerEnv("DB_MAX_RETRIES", 0);
const DB_HEALTHCHECK_INTERVAL_MS = readNonNegativeIntegerEnv(
  "DB_HEALTHCHECK_INTERVAL_MS",
  10000,
);

const connectionState = {
  status: "idle" as DbConnectionStatus,
  attempt: 0,
  lastError: null as string | null,
  lastConnectedAt: null as string | null,
  startupRecoveryAttempted: false,
};

let reconnectTimer: NodeJS.Timeout | null = null;
let healthcheckTimer: NodeJS.Timeout | null = null;
let ongoingConnectionAttempt: Promise<void> | null = null;
let activePool: {
  on(event: "error", listener: (error: Error) => void): unknown;
  removeListener(event: "error", listener: (error: Error) => void): unknown;
} | null = null;
let activePoolErrorListener: ((error: Error) => void) | null = null;

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function clearReconnectTimer(): void {
  if (!reconnectTimer) {
    return;
  }

  clearTimeout(reconnectTimer);
  reconnectTimer = null;
}

function stopDbHealthMonitor(): void {
  if (!healthcheckTimer) {
    return;
  }

  clearInterval(healthcheckTimer);
  healthcheckTimer = null;
}

function detachPoolErrorHandler(): void {
  if (!activePool || !activePoolErrorListener) {
    return;
  }

  activePool.removeListener("error", activePoolErrorListener);
  activePool = null;
  activePoolErrorListener = null;
}

async function destroyDataSourceSafely(): Promise<void> {
  detachPoolErrorHandler();

  if (!AppDataSource.isInitialized) {
    return;
  }

  try {
    await AppDataSource.destroy();
  } catch (error) {
    console.error("[db] failed to close data source cleanly:", error);
  }
}

async function runStartupRecoveryOnce(io: Server): Promise<Canvas | null> {
  if (connectionState.startupRecoveryAttempted) {
    return null;
  }

  connectionState.startupRecoveryAttempted = true;

  try {
    const recoveredCanvas = await canvasService.recoverOnStartup(io);
    console.log("[db] startup canvas recovery completed");
    return recoveredCanvas;
  } catch (error) {
    console.error("[db] startup canvas recovery failed:", error);
    return null;
  }
}

function getRetryCount(attempt: number): number {
  return Math.max(0, attempt - 1);
}

function attachPoolErrorHandler(io: Server): void {
  detachPoolErrorHandler();

  const driver = AppDataSource.driver as {
    master?: {
      on(event: "error", listener: (error: Error) => void): unknown;
      removeListener(event: "error", listener: (error: Error) => void): unknown;
    };
  };

  const pool = driver.master;

  if (!pool) {
    console.warn("[db] postgres pool instance was not found");
    return;
  }

  const onPoolError = (error: Error) => {
    connectionState.lastError = formatError(error);

    console.error("[db] postgres pool error:", error);

    void (async () => {
      await destroyDataSourceSafely();
      scheduleReconnect(io, "postgres pool error");
    })();
  };

  pool.on("error", onPoolError);

  activePool = pool;
  activePoolErrorListener = onPoolError;
}

export function getDbConnectionState(): DbConnectionStateSnapshot {
  return {
    status: connectionState.status,
    attempt: connectionState.attempt,
    lastError: connectionState.lastError,
    lastConnectedAt: connectionState.lastConnectedAt,
    reconnectScheduled: reconnectTimer !== null,
    isInitialized: AppDataSource.isInitialized,
    retryDelayMs: DB_RETRY_DELAY_MS,
    maxRetries: DB_MAX_RETRIES,
    healthcheckIntervalMs: DB_HEALTHCHECK_INTERVAL_MS,
    startupRecoveryAttempted: connectionState.startupRecoveryAttempted,
  };
}

export function scheduleReconnect(
  io: Server,
  reason: string,
  nextAttempt = Math.max(2, connectionState.attempt + 1),
): void {
  if (reconnectTimer) {
    return;
  }

  const retryCount = getRetryCount(nextAttempt);

  if (DB_MAX_RETRIES > 0 && retryCount > DB_MAX_RETRIES) {
    connectionState.status = "idle";
    connectionState.lastError =
      connectionState.lastError ??
      `Maximum reconnect retries exceeded (${DB_MAX_RETRIES})`;

    console.error(
      `[db] maximum reconnect retries exceeded (limit=${DB_MAX_RETRIES}, reason=${reason})`,
    );
    return;
  }

  stopDbHealthMonitor();

  connectionState.status = "reconnecting";
  connectionState.attempt = nextAttempt;

  const delayMs = DB_RETRY_DELAY_MS;

  console.warn(
    `[db] scheduling reconnect attempt ${retryCount} in ${delayMs}ms (${reason})`,
  );

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectWithRetry(io, reason, nextAttempt);
  }, delayMs);
}

export function startDbHealthMonitor(io: Server): void {
  stopDbHealthMonitor();

  healthcheckTimer = setInterval(() => {
    void (async () => {
      if (connectionState.status !== "connected") {
        return;
      }

      try {
        if (!AppDataSource.isInitialized) {
          throw new Error("AppDataSource is not initialized");
        }

        await AppDataSource.query("SELECT 1");
      } catch (error) {
        connectionState.lastError = formatError(error);

        console.error("[db] health check failed:", error);

        await destroyDataSourceSafely();
        scheduleReconnect(io, "health check failed");
      }
    })();
  }, DB_HEALTHCHECK_INTERVAL_MS);
}

export async function connectWithRetry(
  io: Server,
  reason = "server startup",
  attempt = 1,
): Promise<void> {
  if (ongoingConnectionAttempt) {
    return ongoingConnectionAttempt;
  }

  ongoingConnectionAttempt = (async () => {
    clearReconnectTimer();
    stopDbHealthMonitor();

    const retryCount = getRetryCount(attempt);

    connectionState.status =
      retryCount === 0 && connectionState.lastConnectedAt === null
        ? "connecting"
        : "reconnecting";
    connectionState.attempt = attempt;
    connectionState.lastError = null;

    if (retryCount === 0 && connectionState.lastConnectedAt === null) {
      console.log(`[db] initial connection attempt started (${reason})`);
    } else {
      console.log(`[db] reconnect attempt ${retryCount} started (${reason})`);
    }

    try {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }

      await AppDataSource.initialize();
      attachPoolErrorHandler(io);

      connectionState.status = "connected";
      connectionState.attempt = 0;
      connectionState.lastError = null;
      connectionState.lastConnectedAt = new Date().toISOString();

      console.log("[db] connected successfully");

      startDbHealthMonitor(io);

      const recoveredCanvas = await runStartupRecoveryOnce(io);

      if (recoveredCanvas) {
        console.log(
          `[db] startup recovery created canvasId=${recoveredCanvas.id}; skip duplicate timer resume`,
        );
      } else {
        const canvasToResume =
          await canvasService.getCanvasToResumeAfterReconnect();

        if (canvasToResume) {
          const { startGameTimer } = await import("../modules/game/game.timer");
          await startGameTimer(io, canvasToResume.id);
          console.log(
            `[db] resumed game timer for canvasId=${canvasToResume.id} after reconnection`,
          );
        }
      }
    } catch (error) {
      connectionState.status = "reconnecting";
      connectionState.lastError = formatError(error);

      console.error(
        `[db] connection attempt failed (attempt=${attempt}, reason=${reason}):`,
        error,
      );

      await destroyDataSourceSafely();
      scheduleReconnect(io, reason, attempt + 1);
    } finally {
      ongoingConnectionAttempt = null;
    }
  })();

  return ongoingConnectionAttempt;
}
