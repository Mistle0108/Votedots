import { redisClient } from "../../config/redis";
import { sessionStore } from "../../config/session";

class AuthSessionService {
  private buildActiveSessionKey(voterId: number): string {
    return `auth:voter:${voterId}:session`;
  }

  async getActiveSession(voterId: number): Promise<string | null> {
    return redisClient.get(this.buildActiveSessionKey(voterId));
  }

  async replaceActiveSession(
    voterId: number,
    sessionId: string,
  ): Promise<string | null> {
    const key = this.buildActiveSessionKey(voterId);
    const previousSessionId = await redisClient.get(key);

    await redisClient.set(key, sessionId);

    return previousSessionId;
  }

  async clearActiveSession(
    voterId: number,
    sessionId: string,
  ): Promise<boolean> {
    const key = this.buildActiveSessionKey(voterId);
    const activeSessionId = await redisClient.get(key);

    if (activeSessionId !== sessionId) {
      return false;
    }

    await redisClient.del(key);
    return true;
  }

  async destroySession(sessionId: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      sessionStore.destroy(sessionId, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

export const authSessionService = new AuthSessionService();
