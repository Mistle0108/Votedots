import { useCallback, useState } from "react";
import { gameplayVoteApi } from "../api/vote.api";
import { getVotingCellState } from "../model/vote.selectors";

export function useVoteState() {
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [remaining, setRemaining] = useState<number | null>(null);
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const [votingCellIds, setVotingCellIds] = useState<Set<number>>(new Set());
  const [topColorMap, setTopColorMap] = useState<Map<number, string>>(
    new Map(),
  );

  const resetVoteVisualState = useCallback(() => {
    setVotingCellIds(new Set());
    setTopColorMap(new Map());
  }, []);

  const resetVotes = useCallback(() => {
    setVotes({});
    resetVoteVisualState();
  }, [resetVoteVisualState]);

  const loadRemainingTickets = useCallback(async (roundId: number) => {
    try {
      const { data } = await gameplayVoteApi.getTickets(roundId);
      setRemaining(data.remaining);
    } catch {
      setRemaining(null);
    }
  }, []);

  const handleVoteUpdate = useCallback(
    ({ votes }: { votes: Record<string, number> }) => {
      setVotes(votes);

      const { votingCellIds, topColorMap } = getVotingCellState(votes);
      setVotingCellIds(votingCellIds);
      setTopColorMap(topColorMap);
    },
    [],
  );

  const handleRoundStarted = useCallback(
    async (roundId: number) => {
      resetVotes();
      await loadRemainingTickets(roundId);
    },
    [loadRemainingTickets, resetVotes],
  );

  const handleRoundEnded = useCallback(() => {
    resetVotes();
    setRemaining(null);
  }, [resetVotes]);

  const handleVoteSuccess = useCallback(
    async (roundId: number | null) => {
      if (!roundId) return;
      await loadRemainingTickets(roundId);
    },
    [loadRemainingTickets],
  );

  const handleColorChange = useCallback((color: string | null) => {
    setPreviewColor(color);
  }, []);

  const resetPreviewColor = useCallback(() => {
    setPreviewColor(null);
  }, []);

  return {
    votes,
    remaining,
    previewColor,
    votingCellIds,
    topColorMap,
    setRemaining,
    setVotes,
    handleVoteUpdate,
    handleRoundStarted,
    handleRoundEnded,
    handleVoteSuccess,
    handleColorChange,
    resetPreviewColor,
    resetVoteVisualState,
    resetVotes,
  };
}
