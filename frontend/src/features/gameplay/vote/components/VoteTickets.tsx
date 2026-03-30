const VOTES_PER_ROUND = parseInt(import.meta.env.VITE_VOTES_PER_ROUND ?? "3");

interface VoteTicketsProps {
  remaining: number | null;
}

export default function VoteTickets({ remaining }: VoteTicketsProps) {
  const usedCount = remaining !== null ? VOTES_PER_ROUND - remaining : 0;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium">남은 투표권</p>
      <div className="flex gap-1">
        {remaining !== null ? (
          Array.from({ length: VOTES_PER_ROUND }).map((_, index) => (
            <span
              key={index}
              className={`text-lg ${
                index < usedCount ? "text-gray-300" : "text-blue-500"
              }`}
            >
              ●
            </span>
          ))
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )}
      </div>
    </div>
  );
}
