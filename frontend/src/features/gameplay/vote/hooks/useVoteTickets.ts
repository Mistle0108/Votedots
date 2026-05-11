import { useCallback, useRef, useState } from "react";
import { voteApi } from "../api/vote.api";

export default function useVoteTickets() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const latestTicketRequestKeyRef = useRef<string | null>(null);
  const inFlightTicketRequestRef = useRef<{
    key: string;
    promise: Promise<number | null>;
  } | null>(null);

  const applyRemainingSnapshot = useCallback(
    (roundId: number | null, nextRemaining: number | null) => {
      latestTicketRequestKeyRef.current =
        roundId === null ? null : `round:${roundId}`;
      setRemaining(nextRemaining);
    },
    [],
  );

  const fetchTickets = useCallback(async (roundId: number) => {
    const requestKey = `round:${roundId}`;
    latestTicketRequestKeyRef.current = requestKey;

    if (inFlightTicketRequestRef.current?.key === requestKey) {
      return inFlightTicketRequestRef.current.promise;
    }

    const promise = (async () => {
      try {
        const { data } = await voteApi.getTickets(roundId);

        if (latestTicketRequestKeyRef.current === requestKey) {
          setRemaining(data.remaining);
        }

        return data.remaining;
      } catch {
        if (latestTicketRequestKeyRef.current === requestKey) {
          setRemaining(null);
        }

        return null;
      } finally {
        if (inFlightTicketRequestRef.current?.key === requestKey) {
          inFlightTicketRequestRef.current = null;
        }
      }
    })();

    inFlightTicketRequestRef.current = {
      key: requestKey,
      promise,
    };

    return promise;
  }, []);

  const clearTickets = useCallback(() => {
    latestTicketRequestKeyRef.current = null;
    setRemaining(null);
  }, []);

  return {
    remaining,
    applyRemainingSnapshot,
    fetchTickets,
    clearTickets,
  };
}
