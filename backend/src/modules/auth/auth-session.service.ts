import { redisClient } from "../../config/redis";
import { SESSION_COOKIE_MAX_AGE_MS, sessionStore } from "../../config/session";

function getActiveSessionKey(voterId: number): string {
  return `auth:voter:${voterId}:session`;
}

function destroyStoreSession(sessionId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    sessionStore.destroy(sessionId, (err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}

export const authSessionService = {
  async replaceActiveSession(
    voterId: number,
    sessionId: string,
  ): Promise<string | null> {
    const activeSessionKey = getActiveSessionKey(voterId);
    const previousSessionId = await redisClient.get(activeSessionKey);

    await redisClient.set(activeSessionKey, sessionId, {
      PX: SESSION_COOKIE_MAX_AGE_MS,
    });

    if (!previousSessionId || previousSessionId === sessionId) {
      return null;
    }

    return previousSessionId;
  },

  async clearActiveSession(voterId: number, sessionId: string): Promise<void> {
    const activeSessionKey = getActiveSessionKey(voterId);
    const activeSessionId = await redisClient.get(activeSessionKey);

    if (activeSessionId !== sessionId) {
      return;
    }

    await redisClient.del(activeSessionKey);
  },

  async destroySession(sessionId: string): Promise<void> {
    await destroyStoreSession(sessionId);
  },
};
