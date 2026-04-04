import { useCallback, useMemo, useState } from "react";
import { sessionApi, type ParticipantItem } from "../api/session.api";

export default function useParticipantsState() {
  const [participantCount, setParticipantCount] = useState<number | null>(null);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [participantLoading, setParticipantLoading] = useState(false);
  const [participantError, setParticipantError] = useState<string | null>(null);

  const refreshParticipantCount = useCallback(async () => {
    try {
      const { data } = await sessionApi.getCurrentParticipantCount();
      setParticipantCount(data.count);
      return data.count;
    } catch {
      setParticipantCount(null);
      return null;
    }
  }, []);

  const refreshParticipants = useCallback(async () => {
    setParticipantLoading(true);
    setParticipantError(null);

    try {
      const [{ data: countData }, { data: listData }] = await Promise.all([
        sessionApi.getCurrentParticipantCount(),
        sessionApi.getCurrentParticipantList(),
      ]);

      setParticipantCount(countData.count);
      setParticipants(listData.participants);
      return {
        count: countData.count,
        participants: listData.participants,
      };
    } catch {
      setParticipantError("참여자 정보를 불러오지 못했습니다.");
      setParticipantCount(null);
      setParticipants([]);
      return null;
    } finally {
      setParticipantLoading(false);
    }
  }, []);

  const applyParticipantCount = useCallback((count: number) => {
    setParticipantCount(count);
  }, []);

  const clearParticipants = useCallback(() => {
    setParticipantCount(null);
    setParticipants([]);
    setParticipantError(null);
    setParticipantLoading(false);
  }, []);

  const participantSummary = useMemo(() => {
    const votingCount = participants.filter(
      (participant) => participant.status === "voting",
    ).length;

    const waitingCount = participants.filter(
      (participant) => participant.status === "waiting",
    ).length;

    return {
      totalCount: participantCount ?? participants.length,
      votingCount,
      waitingCount,
    };
  }, [participantCount, participants]);

  return {
    participantCount,
    participants,
    participantLoading,
    participantError,
    participantSummary,
    refreshParticipantCount,
    refreshParticipants,
    applyParticipantCount,
    clearParticipants,
  };
}
