import { useCallback, useState } from "react";
import { sessionApi } from "../api/session.api";

export default function useParticipantCount() {
  const [participantCount, setParticipantCount] = useState<number | null>(null);
  const [participantCountLoading, setParticipantCountLoading] = useState(false);
  const [participantCountError, setParticipantCountError] = useState<
    string | null
  >(null);

  const refreshParticipantCount = useCallback(async () => {
    setParticipantCountLoading(true);
    setParticipantCountError(null);

    try {
      const { data } = await sessionApi.getCurrentParticipantCount();
      setParticipantCount(data.count);
      return data.count;
    } catch {
      setParticipantCount(null);
      setParticipantCountError("참여자 수를 불러오지 못했습니다.");
      return null;
    } finally {
      setParticipantCountLoading(false);
    }
  }, []);

  const applyParticipantCount = useCallback((count: number) => {
    setParticipantCount(count);
    setParticipantCountError(null);
    setParticipantCountLoading(false);
  }, []);

  const clearParticipantCount = useCallback(() => {
    setParticipantCount(null);
    setParticipantCountError(null);
    setParticipantCountLoading(false);
  }, []);

  return {
    participantCount,
    participantCountLoading,
    participantCountError,
    refreshParticipantCount,
    applyParticipantCount,
    clearParticipantCount,
  };
}
