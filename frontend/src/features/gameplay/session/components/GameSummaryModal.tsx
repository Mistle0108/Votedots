import { useEffect, type ReactNode } from "react";
import type {
  GameSummaryData,
  GameSummaryParticipant,
  GameSummaryTopVoter,
} from "@/features/gameplay/session/api/session.api";
import { useSnapshotDownload } from "@/shared/hooks/useSnapshotDownload";

interface GameSummaryModalProps {
  summary: GameSummaryData;
  snapshotUrl?: string | null;
  onClose: () => void;
}

function formatNumber(value: number | null | undefined) {
  return (value ?? 0).toLocaleString("ko-KR");
}

function formatPercentText(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "0%";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return `${value}%`;
  }

  return `${numericValue.toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
  })}%`;
}

function HighlightNumber({ children }: { children: ReactNode }) {
  return <span className="text-[19px] font-bold text-red-500">{children}</span>;
}

function NumberText({ value }: { value: number | null | undefined }) {
  return <HighlightNumber>{formatNumber(value)}</HighlightNumber>;
}

function PercentText({ value }: { value: string | number | null | undefined }) {
  return <HighlightNumber>{formatPercentText(value)}</HighlightNumber>;
}

function CellCoordinate({ summary }: { summary: GameSummaryData }) {
  if (
    typeof summary.mostVotedCellX !== "number" ||
    typeof summary.mostVotedCellY !== "number"
  ) {
    return <span>-</span>;
  }

  return (
    <>
      (<NumberText value={summary.mostVotedCellX} />,{" "}
      <NumberText value={summary.mostVotedCellY} />)
    </>
  );
}

function VoterName({
  voter,
}: {
  voter: GameSummaryTopVoter | GameSummaryParticipant;
}) {
  return `${voter.name} #${formatNumber(voter.voterId)}`;
}

function VoterList({
  voters,
  limit = 6,
}: {
  voters: Array<GameSummaryTopVoter | GameSummaryParticipant> | null;
  limit?: number;
}) {
  if (!voters || voters.length === 0) {
    return <span>-</span>;
  }

  const visibleVoters = voters.slice(0, limit);

  return (
    <>
      {visibleVoters.map((voter, index) => (
        <span key={voter.voterId}>
          {index > 0 ? ", " : ""}
          <VoterName voter={voter} />
        </span>
      ))}
      {voters.length > limit ? ", ..." : ""}
    </>
  );
}

function ColorStat({
  color,
  count,
  suffix,
}: {
  color: string | null;
  count: number;
  suffix: string;
}) {
  if (!color) {
    return <span>-</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <span
        className="h-3 w-3 rounded-full border border-gray-300"
        style={{ backgroundColor: color }}
      />
      <span>
        {color} <NumberText value={count} />
        {suffix}
      </span>
    </span>
  );
}

function StatLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p>
      <span className="font-bold text-gray-900">{label}: </span>
      {children}
    </p>
  );
}

export default function GameSummaryModal({
  summary,
  snapshotUrl,
  onClose,
}: GameSummaryModalProps) {
  const finalSnapshotUrl = summary.snapshotUrl ?? snapshotUrl ?? null;
  const {
    canDownload: canDownloadDefaultSnapshot,
    isDownloading: isDownloadingDefaultSnapshot,
    downloadError: defaultDownloadError,
    download: downloadDefaultSnapshot,
    retry: retryDefaultSnapshot,
  } = useSnapshotDownload({
    snapshotUrl: summary.downloadSnapshotUrl,
    canvasId: summary.canvasId,
    endedAt: summary.endedAt,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  });
  const {
    canDownload: canDownloadHighResolutionSnapshot,
    isDownloading: isDownloadingHighResolutionSnapshot,
    downloadError: highResolutionDownloadError,
    download: downloadHighResolutionSnapshot,
    retry: retryHighResolutionSnapshot,
  } = useSnapshotDownload({
    snapshotUrl: summary.highResolutionDownloadSnapshotUrl,
    canvasId: summary.canvasId,
    endedAt: summary.endedAt,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
    fileNameSuffix: "-hd",
  });

  useEffect(() => {
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
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-3 py-6"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className="pointer-events-auto flex max-h-[min(calc(100vh-80px),680px)] w-[720px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative flex items-center justify-center border-b border-gray-100 px-5 py-4">
          <p className="text-center text-lg font-bold text-gray-900">
            게임 종료
          </p>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="게임 종료 통계 닫기"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
          <div className="space-y-5">
            {finalSnapshotUrl ? (
              <div
                className="mx-auto w-1/2 min-w-[180px] rounded-2xl border border-gray-200 p-3 shadow-sm"
                style={{ backgroundColor: "#F1F3F5" }}
              >
                <img
                  src={finalSnapshotUrl}
                  alt="최종 캔버스 스냅샷"
                  className="block w-full rounded border border-gray-100 bg-transparent"
                  style={{ imageRendering: "pixelated" }}
                  draggable={false}
                  onDragStart={(event) => {
                    event.preventDefault();
                  }}
                />
              </div>
            ) : (
              <div className="mx-auto flex aspect-square w-1/2 min-w-[180px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 text-center text-sm font-medium text-gray-400">
                최종 스냅샷이 없어요
              </div>
            )}

            {(canDownloadDefaultSnapshot || canDownloadHighResolutionSnapshot) && (
              <div className="flex flex-col items-center gap-3">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {canDownloadDefaultSnapshot && (
                    <button
                      type="button"
                      onClick={
                        defaultDownloadError
                          ? retryDefaultSnapshot
                          : downloadDefaultSnapshot
                      }
                      disabled={isDownloadingDefaultSnapshot}
                      className="inline-flex min-w-[180px] items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      {isDownloadingDefaultSnapshot
                        ? "다운로드 중..."
                        : defaultDownloadError
                          ? "이미지 다시 시도"
                          : "이미지 다운로드"}
                    </button>
                  )}

                  {canDownloadHighResolutionSnapshot && (
                    <button
                      type="button"
                      onClick={
                        highResolutionDownloadError
                          ? retryHighResolutionSnapshot
                          : downloadHighResolutionSnapshot
                      }
                      disabled={isDownloadingHighResolutionSnapshot}
                      className="inline-flex min-w-[180px] items-center justify-center rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {isDownloadingHighResolutionSnapshot
                        ? "고화질 다운로드 중..."
                        : highResolutionDownloadError
                          ? "고화질 다시 시도"
                          : "고화질 다운로드"}
                    </button>
                  )}
                </div>

                {defaultDownloadError && (
                  <p className="text-sm font-medium text-red-500">
                    {defaultDownloadError}
                  </p>
                )}

                {highResolutionDownloadError && (
                  <p className="text-sm font-medium text-red-500">
                    {highResolutionDownloadError}
                  </p>
                )}
              </div>
            )}

            <section className="space-y-4 text-[15px] leading-7 text-gray-700">
              <div className="space-y-1 text-left">
                <StatLine label="총 라운드 수">
                  총 <NumberText value={summary.totalRounds} />
                  라운드 진행
                </StatLine>
                <StatLine label="투표 인원 수">
                  총 <NumberText value={summary.participantCount} />
                  명이 참여했어요
                </StatLine>
              </div>

              <div className="space-y-1 text-left">
                <StatLine label="투표권 사용률">
                  <PercentText value={summary.ticketUsageRate} />
                </StatLine>
                <StatLine label="총 지급 투표권 수">
                  총 <NumberText value={summary.issuedTicketCount} />개 투표권이
                  발급됐어요
                </StatLine>
                <StatLine label="총 투표 수">
                  총 <NumberText value={summary.totalVotes} />
                  표가 제출됐어요
                </StatLine>
              </div>

              <div className="space-y-1 text-left">
                <StatLine label="완성도">
                  캔버스 완성도{" "}
                  <PercentText value={summary.canvasCompletionPercent} />
                </StatLine>
                <StatLine label="색칠된 칸 수">
                  총 <NumberText value={summary.totalCellCount} />칸 중{" "}
                  <NumberText value={summary.paintedCellCount} />칸 색칠
                  되었어요
                </StatLine>
                <StatLine label="남은 빈 칸 수">
                  아직 <NumberText value={summary.emptyCellCount} />
                  칸이 비어 있어요
                </StatLine>
              </div>

              <div className="space-y-1 text-left">
                <StatLine label="가장 인기 있었던 칸">
                  <CellCoordinate summary={summary} />
                  {summary.mostVotedCellVoteCount > 0 ? (
                    <>
                      , <NumberText value={summary.mostVotedCellVoteCount} />표
                    </>
                  ) : null}
                </StatLine>
                <StatLine label="랜덤 당선 칸 수">
                  동점 추첨으로 결정된 칸은{" "}
                  <NumberText value={summary.randomResolvedCellCount} />
                  개였어요
                </StatLine>
              </div>

              <div className="space-y-1 text-left">
                <StatLine label="사용 색상 수">
                  총 <NumberText value={summary.usedColorCount} />
                  가지 색이 사용됐어요
                </StatLine>
                <StatLine label="가장 많이 선택된 색">
                  <ColorStat
                    color={summary.mostSelectedColor}
                    count={summary.mostSelectedColorVoteCount}
                    suffix="표"
                  />
                </StatLine>
                <StatLine label="캔버스에서 가장 많이 쓰인 색">
                  <ColorStat
                    color={summary.mostPaintedColor}
                    count={summary.mostPaintedColorCellCount}
                    suffix="칸"
                  />
                </StatLine>
              </div>

              <div className="space-y-1 text-left">
                <StatLine label="가장 뜨거웠던 라운드">
                  {summary.hottestRoundNumber ? (
                    <>
                      <NumberText value={summary.hottestRoundNumber} />
                      라운드,{" "}
                      <NumberText value={summary.hottestRoundVoteCount} />표
                    </>
                  ) : (
                    "-"
                  )}
                </StatLine>
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 text-sm leading-6 text-gray-700">
              <div>
                <p className="mb-1 font-bold text-gray-900">최다 투표자</p>
                <p>
                  <VoterList voters={summary.topVoters} />
                </p>
              </div>
              <div>
                <p className="mb-1 font-bold text-gray-900">함께한 투표자</p>
                <p>
                  <VoterList voters={summary.participants} limit={8} />
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
