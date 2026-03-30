interface RoundProgressProps {
  progressPercent: number;
  enableTransition?: boolean;
}

export default function RoundProgress({
  progressPercent,
  enableTransition = true,
}: RoundProgressProps) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
      <div
        className={`h-full rounded-full bg-red-500 ${
          enableTransition ? "transition-[width] duration-1000 ease-linear" : ""
        }`}
        style={{ width: `${progressPercent}%` }}
      />
    </div>
  );
}
