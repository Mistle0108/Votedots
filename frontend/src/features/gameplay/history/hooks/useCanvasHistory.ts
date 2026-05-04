import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  GameSummaryData,
  RoundSummaryData,
} from "@/features/gameplay/session/api/session.api";
import { useI18n } from "@/shared/i18n";
import { historyApi } from "../api/history.api";
import {
  getGameHistoryItemId,
  getRoundHistoryItemId,
  type GameHistoryItem,
} from "../model/history.types";

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }

  return {};
}

function getStringField(value: unknown, key: string): string | null {
  const fieldValue = toRecord(value)[key];

  return typeof fieldValue === "string" ? fieldValue : null;
}

function getObjectField(value: unknown, key: string): Record<string, unknown> {
  return toRecord(toRecord(value)[key]);
}

function getRoundCreatedAt(summary: RoundSummaryData) {
  const snapshot = getObjectField(summary, "snapshot");

  return (
    getStringField(snapshot, "createdAt") ??
    getStringField(summary, "phaseEndedAt") ??
    getStringField(summary, "endedAt") ??
    new Date().toISOString()
  );
}

function getGameCreatedAt(summary: GameSummaryData) {
  return (
    getStringField(summary, "endedAt") ??
    getStringField(summary, "createdAt") ??
    new Date().toISOString()
  );
}

function sortHistoryItems(items: GameHistoryItem[]) {
  return [...items].sort((a, b) => {
    const createdAtDiff =
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

    if (createdAtDiff !== 0) {
      return createdAtDiff;
    }

    if (a.type === "round" && b.type === "round") {
      return b.roundNumber - a.roundNumber;
    }

    if (a.type === "game" && b.type !== "game") {
      return -1;
    }

    if (a.type !== "game" && b.type === "game") {
      return 1;
    }

    return b.id.localeCompare(a.id);
  });
}

function toRoundHistoryItem(summary: RoundSummaryData): GameHistoryItem {
  return {
    type: "round",
    id: getRoundHistoryItemId(summary.roundId),
    createdAt: getRoundCreatedAt(summary),
    roundNumber: summary.roundNumber,
    data: summary,
  };
}

function toGameHistoryItem(
  canvasId: number,
  summary: GameSummaryData,
): GameHistoryItem {
  const createdAt = getGameCreatedAt(summary);

  return {
    type: "game",
    id: getGameHistoryItemId(canvasId),
    createdAt,
    data: summary,
  };
}

function upsertHistoryItem(
  items: GameHistoryItem[],
  nextItem: GameHistoryItem,
) {
  const filteredItems = items.filter((item) => item.id !== nextItem.id);
  return sortHistoryItems([nextItem, ...filteredItems]);
}

export function useCanvasHistory(canvasId: number | null) {
  const { t } = useI18n();
  const [historyItems, setHistoryItems] = useState<GameHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasId) {
      return;
    }

    const abortController = new AbortController();

    const loadHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);

      try {
        const response = await historyApi.getCanvasHistory(
          canvasId,
          abortController.signal,
        );

        const items = [
          ...response.data.rounds.map(toRoundHistoryItem),
          ...(response.data.gameSummary
            ? [toGameHistoryItem(canvasId, response.data.gameSummary)]
            : []),
        ];

        setHistoryItems(sortHistoryItems(items));
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setHistoryError(
          error instanceof Error
            ? error.message
            : t("history.loadFailed"),
        );
      } finally {
        if (!abortController.signal.aborted) {
          setHistoryLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      abortController.abort();
    };
  }, [canvasId, t]);

  const addRoundHistoryItem = useCallback((summary: RoundSummaryData) => {
    setHistoryItems((items) =>
      upsertHistoryItem(items, toRoundHistoryItem(summary)),
    );
  }, []);

  const addGameHistoryItem = useCallback(
    (summary: GameSummaryData) => {
      if (!canvasId) {
        return;
      }

      setHistoryItems((items) =>
        upsertHistoryItem(items, toGameHistoryItem(canvasId, summary)),
      );
    },
    [canvasId],
  );

  return useMemo(
    () => ({
      historyItems: canvasId ? historyItems : [],
      historyLoading: canvasId ? historyLoading : false,
      historyError: canvasId ? historyError : null,
      addRoundHistoryItem,
      addGameHistoryItem,
    }),
    [
      canvasId,
      historyError,
      historyItems,
      historyLoading,
      addGameHistoryItem,
      addRoundHistoryItem,
    ],
  );
}
