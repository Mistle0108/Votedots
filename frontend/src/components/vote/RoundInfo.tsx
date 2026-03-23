import { useEffect, useState } from "react";

interface Props {
  roundNumber: number | null;
  startedAt: string | null;
  durationSec: number;
}

export default function RoundInfo({
  roundNumber,
  startedAt,
  durationSec,
}: Props) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!startedAt) {
      setRemaining(null);
      return;
    }

    const calc = () => {
      const elapsed = Math.floor(
        (Date.now() - new Date(startedAt).getTime()) / 1000,
      );
      const left = Math.max(0, durationSec - elapsed);
      setRemaining(left);
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [startedAt, durationSec]);

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium">라운드</p>
      <p className="text-sm text-gray-500">
        {roundNumber ? `#${roundNumber}` : "진행 중인 라운드 없음"}
      </p>
      {remaining !== null && (
        <p className="text-sm text-gray-500">남은 시간: {remaining}초</p>
      )}
    </div>
  );
}
