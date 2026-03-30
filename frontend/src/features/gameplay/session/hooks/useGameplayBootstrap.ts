import { useCallback } from "react";
import { sessionApi } from "../api/session.api";
import { SessionBootstrapResult } from "../model/session.types";

export function useGameplayBootstrap() {
  const bootstrap = useCallback(async (): Promise<SessionBootstrapResult> => {
    const { data } = await sessionApi.getCurrentCanvas();
    const { canvas, cells } = data;

    const roundRes = await sessionApi.getActiveRound(canvas.id);
    const roundState = roundRes.data;

    let remaining: number | null = null;

    if (roundState?.status === "active" && roundState.round?.id) {
      const ticketsRes = await sessionApi.getTickets(roundState.round.id);
      remaining = ticketsRes.data.remaining;
    }

    return {
      canvasId: canvas.id,
      gridX: canvas.gridX,
      gridY: canvas.gridY,
      cells,
      round: roundState?.round ?? null,
      timer: roundState?.timer ?? null,
      remaining,
    };
  }, []);

  return {
    bootstrap,
  };
}
