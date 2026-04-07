import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { authApi } from "@/features/auth";
import { RESTART_TIME } from "@/features/gameplay/canvas";
import { sessionApi } from "../api/session.api";
import { SessionBootstrapResult } from "../model/session.types";
import { useGameplayBootstrap } from "./useGameplayBootstrap";

interface UseGameSessionParams {
  onBootstrap: (result: SessionBootstrapResult) => void;
  onUnauthorized: (message: string) => void;
}

export function useGameSession({
  onBootstrap,
  onUnauthorized,
}: UseGameSessionParams) {
  const { bootstrap } = useGameplayBootstrap();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameEnded, setGameEnded] = useState(false);

  const initializeSession = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      try {
        await authApi.me();
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          onUnauthorized("로그인이 필요합니다.");
          return null;
        }

        onUnauthorized("로그인 상태를 확인할 수 없어요.");
        return null;
      }

      try {
        const result = await bootstrap();
        onBootstrap(result);
        return result;
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status;

          if (status === 401) {
            onUnauthorized("로그인이 필요합니다.");
            return null;
          }

          if (status === 404) {
            setError("진행중인 캔버스가 없어요");
            return null;
          }
        }

        setError("캔버스 정보를 불러오는 중 오류가 발생했어요");
        return null;
      }
    } finally {
      setLoading(false);
    }
  }, [bootstrap, onBootstrap, onUnauthorized]);

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
