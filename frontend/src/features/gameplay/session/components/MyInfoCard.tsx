import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, type Voter } from "@/features/auth";
import { Button } from "@/shared/ui/button";
import type { ParticipantItem } from "../api/session.api";

interface MyInfoCardProps {
  participants: ParticipantItem[];
}

export default function MyInfoCard({ participants }: MyInfoCardProps) {
  const navigate = useNavigate();

  const [voter, setVoter] = useState<Voter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchMe = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data } = await authApi.me();

        if (cancelled) {
          return;
        }

        setVoter(data.voter);
      } catch {
        if (cancelled) {
          return;
        }

        setError("내 정보를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchMe();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    setLogoutLoading(true);
    setError(null);

    try {
      await authApi.logout();
      navigate("/login", { replace: true });
    } catch {
      setError("로그아웃 중 오류가 발생했습니다.");
    } finally {
      setLogoutLoading(false);
    }
  };

  const myParticipant = voter
    ? participants.find((participant) => participant.voterUuid === voter.uuid)
    : null;

  return (
    <section className="w-full">
      {loading ? (
        <p className="text-sm text-gray-400">내 정보를 불러오는 중...</p>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : voter ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 pl-3 text-left">
            <p
              className="truncate text-xs font-medium text-gray-900"
              title={voter.nickname}
            >
              {myParticipant?.nickname ?? voter.nickname}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="xs"
            className="shrink-0 px-2 text-xs text-gray-600"
            onClick={handleLogout}
            disabled={logoutLoading}
          >
            {logoutLoading ? "로그아웃 중..." : "로그아웃"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-gray-400">표시할 사용자 정보가 없습니다.</p>
      )}
    </section>
  );
}
