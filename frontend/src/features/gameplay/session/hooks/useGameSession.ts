import { useCallback, useEffect, useRef, useState } from "react";
import { authApi } from "@/features/auth";
import { useI18n } from "@/shared/i18n";
import { SessionBootstrapResult } from "../model/session.types";
import { useGameplayBootstrap } from "./useGameplayBootstrap";

interface UseGameSessionParams {
  onBootstrap: (result: SessionBootstrapResult) => void;
  onUnauthorized: (message: string) => void;
}

const BOOTSTRAP_RETRY_DELAY_MS = 2000;
const BOOTSTRAP_RETRY_MAX_MS = 30000;

const GAME_RESTART_PENDING_KEY = "game-restart-pending";
const GAME_RESTART_STARTED_AT_KEY = "game-restart-started-at";

let unauthorizedRedirectHandled = false;

function getErrorStatus(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "status" in error.response &&
    typeof error.response.status === "number"
  ) {
    return error.response.status;
  }

  return null;
}

function getErrorMessage(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response
  ) {
    const data = error.response.data;

    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }

    if (typeof data === "string") {
      return data;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return null;
}

function isRetryableBootstrapError(error: unknown): boolean {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error);

  if (status === 404 || status === 503 || (status !== null && status >= 500)) {
    return true;
  }

  if (!message) {
    return false;
  }

  return (
    message.includes("진행 중인 캔버스가 없습니다") ||
    message.includes("No canvas is currently in progress")
  );
}

function isRestartPending(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(GAME_RESTART_PENDING_KEY) === "true";
}

function markRestartPending(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(GAME_RESTART_PENDING_KEY, "true");

  if (!window.sessionStorage.getItem(GAME_RESTART_STARTED_AT_KEY)) {
    window.sessionStorage.setItem(
      GAME_RESTART_STARTED_AT_KEY,
      String(Date.now()),
    );
  }
}

function clearRestartPending(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(GAME_RESTART_PENDING_KEY);
  window.sessionStorage.removeItem(GAME_RESTART_STARTED_AT_KEY);
}

function getRestartElapsedMs(): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const startedAt = Number(
    window.sessionStorage.getItem(GAME_RESTART_STARTED_AT_KEY),
  );

  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    window.sessionStorage.setItem(
      GAME_RESTART_STARTED_AT_KEY,
      String(Date.now()),
    );
    return 0;
  }

  return Date.now() - startedAt;
}

export function useGameSession({
  onBootstrap,
  onUnauthorized,
}: UseGameSessionParams) {
  const { t } = useI18n();
  const { bootstrap } = useGameplayBootstrap();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  const serviceAlertShownRef = useRef(false);
  const restartDelaySecRef = useRef(3);

  const showServiceUnavailableAlert = useCallback(() => {
    if (serviceAlertShownRef.current) {
      return;
    }

    serviceAlertShownRef.current = true;
    clearRestartPending();
    window.alert(t("session.serviceUnavailable"));
    window.location.href = "/login";
  }, [t]);

  const initializeSession = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        try {
          await authApi.me();
          unauthorizedRedirectHandled = false;
        } catch (error) {
          const status = getErrorStatus(error);

          setRetryNonce(0);
          clearRestartPending();

          if (status === 401) {
            if (!unauthorizedRedirectHandled) {
              unauthorizedRedirectHandled = true;
              onUnauthorized(t("server.auth.requiredLogin"));
            }
            return null;
          }

          setError(t("session.authCheckFailed"));
          return null;
        }

        try {
          const result = await bootstrap();
          restartDelaySecRef.current = result.gameConfig.phases.restartDelaySec;
          onBootstrap(result);
          setError(null);
          setRetryNonce(0);
          serviceAlertShownRef.current = false;
          clearRestartPending();
          return result;
        } catch (error) {
          if (isRestartPending() && isRetryableBootstrapError(error)) {
            const elapsedMs = getRestartElapsedMs();

            if (elapsedMs < BOOTSTRAP_RETRY_MAX_MS) {
              setError(t("session.preparingGame"));
              setRetryNonce((prev) => prev + 1);
              return null;
            }

            setError(t("session.serviceUnavailable"));
            setRetryNonce(0);
            showServiceUnavailableAlert();
            return null;
          }

          setError(t("session.loadCanvasFailed"));
          setRetryNonce(0);
          clearRestartPending();
          return null;
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [bootstrap, onBootstrap, onUnauthorized, showServiceUnavailableAlert, t],
  );

  useEffect(() => {
    if (retryNonce === 0 || !isRestartPending()) {
      return;
    }

    const timer = window.setTimeout(() => {
      void initializeSession({ silent: true });
    }, BOOTSTRAP_RETRY_DELAY_MS);

    return () => clearTimeout(timer);
  }, [initializeSession, retryNonce]);

  useEffect(() => {
    if (!gameEnded) return;

    const timer = setTimeout(() => {
      window.location.reload();
    }, restartDelaySecRef.current * 1000);

    return () => clearTimeout(timer);
  }, [gameEnded]);

  const setSessionError = useCallback((message: string | null) => {
    setError(message);
  }, []);

  const clearSessionError = useCallback(() => {
    setError(null);
    setRetryNonce(0);
    serviceAlertShownRef.current = false;
    unauthorizedRedirectHandled = false;
    clearRestartPending();
  }, []);

  const markGameEnded = useCallback(() => {
    markRestartPending();
    setGameEnded(true);
    serviceAlertShownRef.current = false;
  }, []);

  return {
    loading,
    error,
    gameEnded,
    initializeSession,
    setSessionError,
    clearSessionError,
    markGameEnded,
  };
}
