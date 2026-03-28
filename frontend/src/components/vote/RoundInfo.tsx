interface Props {
  roundNumber: number | null;
  totalRounds: number;
  formattedGameEndTime: string | null;
  formattedRemainingTime: string | null;
}

export default function RoundInfo({
  roundNumber,
  totalRounds,
  formattedGameEndTime,
  formattedRemainingTime,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">라운드</p>
        <p className="text-sm text-gray-500">
          {roundNumber ? `${roundNumber}/${totalRounds}` : "-"}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">게임 종료</p>
        <p className="text-sm text-gray-500">
          {formattedGameEndTime ?? "-"}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">타이머</p>
        <p className="text-base font-bold text-red-500">
          {formattedRemainingTime ?? "-"}
        </p>
      </div>
    </div>
  );
}
