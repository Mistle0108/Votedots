import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import ColorPalette from "./ColorPalette";
import RoundInfo from "./RoundInfo";
import { voteApi } from "@/api/vote";
import { Cell } from "@/types/canvas";

const ROUND_DURATION_SEC = parseInt(
  import.meta.env.VITE_ROUND_DURATION_SEC ?? "60",
);

interface Props {
  canvasId: number;
  roundId: number | null;
  roundNumber: number | null;
  startedAt: string | null;
  selectedCell: Cell | null;
  onVoteSuccess: () => void;
}

export default function VotePanel({
  canvasId,
  roundId,
  roundNumber,
  startedAt,
  selectedCell,
  onVoteSuccess,
}: Props) {
  const [color, setColor] = useState("#000000");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!roundId) {
      setRemaining(null);
      return;
    }
    voteApi.getTickets(roundId).then(({ data }) => {
      setRemaining(data.remaining);
    });
  }, [roundId]);

  const handleSubmit = async () => {
    if (!selectedCell || !roundId) return;
    setError("");
    setLoading(true);
    try {
      await voteApi.submit({
        canvasId,
        roundId,
        cellId: selectedCell.id,
        color,
      });
      const { data } = await voteApi.getTickets(roundId);
      setRemaining(data.remaining);
      onVoteSuccess();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response: { data: { message: string } } };
        setError(axiosErr.response.data.message);
      } else {
        setError("투표 중 오류가 발생했어요");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full">
      <div>
        <h2 className="text-lg font-bold">VoteDots</h2>
      </div>

      {/* 라운드 정보 + 타이머 */}
      <RoundInfo
        roundNumber={roundNumber}
        startedAt={startedAt}
        durationSec={ROUND_DURATION_SEC}
      />

      {/* 남은 투표권 */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">남은 투표권</p>
        <p className="text-sm text-gray-500">
          {remaining !== null ? `${remaining}표` : "-"}
        </p>
      </div>

      {/* 선택된 셀 */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">선택된 셀</p>
        <p className="text-sm text-gray-500">
          {selectedCell
            ? `(${selectedCell.x}, ${selectedCell.y})`
            : "셀을 클릭해주세요"}
        </p>
      </div>

      {/* 색상 선택 */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">색상 선택</p>
        <ColorPalette selected={color} onChange={setColor} />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button
        onClick={handleSubmit}
        disabled={!selectedCell || !roundId || loading}
        className="w-full mt-auto"
      >
        {loading ? "투표 중..." : "투표하기"}
      </Button>
    </div>
  );
}
