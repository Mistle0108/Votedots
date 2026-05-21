import type { Request } from "express";
import { redisClient } from "../../config/redis";
import { AUTH_ERROR_MESSAGES } from "./auth.validation";

export interface GuestEntryScope {
  kind: "plaza" | "room";
  scopeId: number;
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function isSameScope(
  left: GuestEntryScope | null | undefined,
  right: GuestEntryScope,
): boolean {
  return !!left && left.kind === right.kind && left.scopeId === right.scopeId;
}

class GuestEntryService {
  private buildBrowserScopeKey(
    browserKey: string,
    scope: GuestEntryScope,
  ): string {
    return `auth:guest:browser:${browserKey}:scope:${scope.kind}:${scope.scopeId}`;
  }

  private async lockBrowserScope(params: {
    browserKey: string;
    sessionId: string;
    scope: GuestEntryScope;
  }): Promise<void> {
    const { browserKey, sessionId, scope } = params;
    const key = this.buildBrowserScopeKey(browserKey, scope);
    const wasSet = await redisClient.set(key, sessionId, {
      NX: true,
    });

    if (wasSet === "OK") {
      return;
    }

    const existingSessionId = await redisClient.get(key);

    if (!existingSessionId || existingSessionId === sessionId) {
      return;
    }

    throw new Error(AUTH_ERROR_MESSAGES.GUEST_REENTRY_BLOCKED);
  }

  async authorizeScope(req: Request, scope: GuestEntryScope): Promise<void> {
    if (!req.session.voter?.isGuest) {
      return;
    }

    const guestContext = req.session.guest;

    if (!guestContext?.browserKey) {
      throw new Error(AUTH_ERROR_MESSAGES.INVALID_BROWSER_KEY);
    }

    if (guestContext.scope && !isSameScope(guestContext.scope, scope)) {
      throw new Error(AUTH_ERROR_MESSAGES.GUEST_SCOPE_MISMATCH);
    }

    await this.lockBrowserScope({
      browserKey: guestContext.browserKey,
      sessionId: req.sessionID,
      scope,
    });

    if (isSameScope(guestContext.scope, scope)) {
      return;
    }

    req.session.guest = {
      ...guestContext,
      scope,
    };

    await saveSession(req);
  }

  isAccessError(message: string): boolean {
    return (
      message === AUTH_ERROR_MESSAGES.INVALID_BROWSER_KEY ||
      message === AUTH_ERROR_MESSAGES.GUEST_REENTRY_BLOCKED ||
      message === AUTH_ERROR_MESSAGES.GUEST_SCOPE_MISMATCH
    );
  }
}

export const guestEntryService = new GuestEntryService();
