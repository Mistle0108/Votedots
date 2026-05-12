import { useCallback } from "react";

interface UseGameplaySessionCleanupParams {
  clearActiveRoundTimer: () => void;
  clearTickets: () => void;
  clearParticipants: () => void;
  resetRoundState: () => void;
  resetRoundTimer: () => void;
  resetVoteState: () => void;
  resetSummaries: () => void;
  markGameEnded: () => void;
  onGameEndedCleanup: () => void;
  onSessionEnded: () => void;
}

export default function useGameplaySessionCleanup({
  clearActiveRoundTimer,
  clearTickets,
  clearParticipants,
  resetRoundState,
  resetRoundTimer,
  resetVoteState,
  resetSummaries,
  markGameEnded,
  onGameEndedCleanup,
  onSessionEnded,
}: UseGameplaySessionCleanupParams) {
  const handleSessionEnded = useCallback(() => {
    clearActiveRoundTimer();
    clearTickets();
    clearParticipants();
    resetRoundState();
    resetRoundTimer();
    resetVoteState();
    resetSummaries();
    onSessionEnded();
  }, [
    clearActiveRoundTimer,
    clearParticipants,
    clearTickets,
    onSessionEnded,
    resetRoundState,
    resetRoundTimer,
    resetSummaries,
    resetVoteState,
  ]);

  const handleGameEnded = useCallback(() => {
    clearActiveRoundTimer();
    markGameEnded();
    clearTickets();
    clearParticipants();
    onGameEndedCleanup();
    resetRoundState();
    resetRoundTimer();
    resetVoteState();
    resetSummaries();
  }, [
    clearActiveRoundTimer,
    clearParticipants,
    clearTickets,
    markGameEnded,
    onGameEndedCleanup,
    resetRoundState,
    resetRoundTimer,
    resetSummaries,
    resetVoteState,
  ]);

  return {
    handleSessionEnded,
    handleGameEnded,
  };
}
