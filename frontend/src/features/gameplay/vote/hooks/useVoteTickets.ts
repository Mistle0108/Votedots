import { useCallback, useState } from "react";
import { voteApi } from "../api/vote.api";

export default function useVoteTickets() {
  const [remaining, setRemaining] = useState<number | null>(null);

  const fetchTickets = useCallback(async (roundId: number) => {
    try {
      const { data } = await voteApi.getTickets(roundId);
      setRemaining(data.remaining);
      return data.remaining;
    } catch {
      setRemaining(null);
      return null;
    }
  }, []);

  const clearTickets = useCallback(() => {
    setRemaining(null);
  }, []);

  return {
    remaining,
    setRemaining,
    fetchTickets,
    clearTickets,
  };
}
