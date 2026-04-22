import { useEffect, type MouseEvent } from "react";
import type { RoundSummaryData } from "@/features/gameplay/session/api/session.api";

interface RoundSummaryModalProps {
  open: boolean;
  summary: RoundSummaryData | null;
  snapshot: string | null;
  position: { x: number; y: number };
  onClose: () => void;
  onDragStart: (event: MouseEvent<HTMLDivElement>) => void;
}

function hasMostVotedCell(summary: RoundSummaryData) {
  return (
    typeof summary.mostVotedCellX === "number" &&
    typeof summary.mostVotedCellY === "number"
  );
}

function renderParticipantCopy(count: number) {
  if (count > 0) {
    return (
      <>
        <span className="text-[22px] text-red-500">{count}</span>
        명이 투표에 참여했어요
      </>
    );
  }

  return "참여자가 없어요.";
}

export default function RoundSummaryModal({
  open,
  summary,
  snapshot,
  position,
  onClose,
  onDragStart,
}: RoundSummaryModalProps) {
  useEffect(() => {
    if (!open || !summary) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open, summary]);

  if (!open || !summary) {
    return null;
  }

  const progressPercent =
    summary.totalCellCount > 0
      ? (
          (summary.currentPaintedCellCount / summary.totalCellCount) *
          100
        ).toFixed(1)
      : "0.0";
  const roundSnapshot = summary.snapshotUrl ?? snapshot;

  return (
    <div
      className="fixed inset-0 z-50"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className="pointer-events-auto fixed flex max-h-[calc(100vh-48px)] w-[560px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur"
        style={{ top: position.y, left: position.x }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="relative flex cursor-move items-center justify-center border-b border-gray-100 px-5 py-4"
          onMouseDown={onDragStart}
        >
          <p className="text-center text-lg font-bold text-gray-900">
            {summary.roundNumber} 라운드 결과
          </p>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="라운드 결과 닫기"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            {roundSnapshot && (
              <div className="mx-auto w-1/2 min-w-[180px] rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                <img
                  src={roundSnapshot}
                  alt={`${summary.roundNumber} 라운드 스냅샷`}
                  className="block w-full rounded border border-gray-100 bg-transparent"
                  style={{ imageRendering: "pixelated" }}
                  draggable={false}
                  onDragStart={(event) => {
                    event.preventDefault();
                  }}
                />
              </div>
            )}

            <section className="space-y-3 text-left text-[15px] font-bold leading-7 text-gray-700">
              <p>{renderParticipantCopy(summary.participantCount)}</p>
              <p>
                이번 라운드 총{" "}
                <span className="text-[22px] text-red-500">
                  {summary.totalVotes}
                </span>
                표가 모였어요
              </p>
              <p>
                이번 라운드에서{" "}
                <span className="text-[22px] text-red-500">
                  {summary.paintedCellCount}
                </span>
                개를 색칠했어요
              </p>
              <p>
                캔버스 진행도{" "}
                <span className="text-[22px] text-red-500">
                  {progressPercent}
                </span>
                %
              </p>
            </section>

            <section className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 text-sm leading-6 text-gray-700">
              {hasMostVotedCell(summary) ? (
                <p>
                  가장 인기 있었던 칸은 ({summary.mostVotedCellX},{" "}
                  {summary.mostVotedCellY}) 이었어요.
                </p>
              ) : (
                <p>가장 인기 있었던 칸은 없습니다.</p>
              )}
              <p>
                동점 추첨으로 결정된 칸은{" "}
                <span className="font-bold text-gray-900">
                  {summary.randomResolvedCellCount > 0
                    ? summary.randomResolvedCellCount
                    : "없어요."}
                </span>
                {summary.randomResolvedCellCount > 0 ? "개였어요." : ""}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
