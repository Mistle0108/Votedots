import { useCallback, useEffect, useState } from "react";
import { RESTART_TIME } from "@/features/gameplay/canvas";
import { sessionApi } from "../api/session.api";
import { SessionBootstrapResult } from "../model/session.types";
import { useGameplayBootstrap } from "./useGameplayBootstrap";

interface UseGameSessionParams {
  onBootstrap: (result: SessionBootstrapResult) => void;
}

export function useGameSession({ onBootstrap }: UseGameSessionParams) {
  const { bootstrap } = useGameplayBootstrap();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameEnded, setGameEnded] = useState(false);

  const initializeSession = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await bootstrap();
      onBootstrap(result);
      return result;
    } catch {
      setError("진행중인 캔버스가 없어요");
      return null;
    } finally {
      setLoading(false);
    }
  }, [bootstrap, onBootstrap]);

  useEffect(() => {
    if (!gameEnded) return;

    const timer = setTimeout(async () => {
      try {
        await sessionApi.createCanvas();
      } catch (err) {
        console.error("캔버스 생성 실패:", err);
      }
      window.location.reload();
    }, RESTART_TIME * 1000);

    return () => clearTimeout(timer);
  }, [gameEnded]);

  const setSessionError = useCallback((message: string | null) => {
    setError(message);
  }, []);

  const clearSessionError = useCallback(() => {
    setError(null);
  }, []);

  const markGameEnded = useCallback(() => {
    setGameEnded(true);
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
