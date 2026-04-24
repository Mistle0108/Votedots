import { useEffect, useMemo, useRef, useState } from "react";
import type { GameConfig } from "@/shared/config/game-config";
import IntroCanvasPreview from "./IntroCanvasPreview";

interface Props {
  open: boolean;
  playBackgroundImageUrl: string | null;
  resultTemplateImageUrl: string | null;
  gridX: number;
  gridY: number;
  gameConfig: GameConfig;
  formattedGameEndTime: string | null;
  onClose: () => void;
}

function buildDescription(config: GameConfig) {
  return {
    totalRounds: config.rules.totalRounds,
    votesPerRound: config.rules.votesPerRound,
    roundDurationSec: config.phases.roundDurationSec,
  };
}

function getDefaultPosition() {
  const modalWidth = Math.min(720, window.innerWidth - 24);
  const modalHeight = Math.min(window.innerHeight - 80, 680);

  return {
    x: Math.max(12, Math.round((window.innerWidth - modalWidth) / 2)),
    y: Math.max(12, Math.round((window.innerHeight - modalHeight) / 2)),
  };
}

export default function IntroGuideModal({
  open,
  playBackgroundImageUrl,
  resultTemplateImageUrl,
  gridX,
  gridY,
  gameConfig,
  formattedGameEndTime,
  onClose,
}: Props) {
  const [position, setPosition] = useState(getDefaultPosition);

  const modalRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const description = useMemo(() => buildDescription(gameConfig), [gameConfig]);

  useEffect(() => {
    if (!open) {
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
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current) {
        return;
      }

      setPosition({
        x: event.clientX - dragOffsetRef.current.x,
        y: event.clientY - dragOffsetRef.current.y,
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        ref={modalRef}
        className="pointer-events-auto fixed flex max-h-[min(calc(100vh-80px),680px)] w-[720px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur"
        style={{ top: position.y, left: position.x }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {" "}
        <div
          className="relative flex cursor-move items-center justify-center border-b border-gray-100 px-5 py-4"
          onMouseDown={(event) => {
            isDraggingRef.current = true;
            dragOffsetRef.current = {
              x: event.clientX - position.x,
              y: event.clientY - position.y,
            };
          }}
        >
          <p className="text-center text-base font-semibold text-gray-900">
            게임 안내
          </p>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="게임 안내 닫기"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
          <div className="flex flex-col gap-6">
            <section className="space-y-1 text-center">
              <p className="text-sm text-gray-700">
                도트를 색칠해 하나의 캔버스를 완성하세요.
              </p>
            </section>

            <div className="mx-auto w-fit space-y-3">
              <IntroCanvasPreview
                playBackgroundImageUrl={playBackgroundImageUrl}
                resultTemplateImageUrl={resultTemplateImageUrl}
                gridX={gridX}
                gridY={gridY}
              />
              <div className="space-y-1 text-left text-sm font-bold text-gray-700">
                <p>
                  전체 라운드 수 :{" "}
                  <span className="text-[19px]">{description.totalRounds}</span>
                </p>
                <p>
                  라운드 소요 시간 :{" "}
                  <span className="text-[19px]">
                    {description.roundDurationSec}초
                  </span>
                </p>
                <p>
                  라운드당 투표권 수 :{" "}
                  <span className="text-[19px]">
                    {description.votesPerRound}개
                  </span>
                </p>
                <p>
                  캔버스 종료 시간 :{" "}
                  <span className="text-[19px]">
                    {formattedGameEndTime ?? "-"}
                  </span>
                </p>
              </div>
            </div>

            <div className="space-y-5 text-sm leading-6 text-gray-700">
              <section className="space-y-2">
                <h3 className="text-center font-semibold text-gray-900">
                  게임 설명
                </h3>
                <ul className="space-y-1 text-left">
                  <li>
                    - 게임은 총{" "}
                    <span className="text-[19px] font-bold text-red-500">
                      {description.totalRounds}
                    </span>
                    개의 라운드로 진행됩니다.
                  </li>
                  <li>
                    - 각 라운드는{" "}
                    <span className="text-[19px] font-bold text-red-500">
                      {description.roundDurationSec}
                    </span>
                    초 동안 진행되며, 매 라운드마다{" "}
                    <span className="text-[19px] font-bold text-red-500">
                      {description.votesPerRound}
                    </span>
                    개의 투표권이 주어집니다.
                  </li>
                  <li>
                    - 서로 다른 칸에 투표하거나, 같은 칸에 여러 번 투표할 수
                    있습니다.
                  </li>
                  <li>- 라운드가 끝나면 투표된 모든 칸이 반영됩니다.</li>
                  <li>
                    - 각 칸은 가장 많은 표를 받은 색으로 칠해지며, 동점이면
                    무작위로 결정됩니다.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-center font-semibold text-gray-900">
                  투표 방법
                </h3>
                <ul className="space-y-1 text-left">
                  <li>- 원하는 칸을 선택합니다.</li>
                  <li>
                    - 칠하고 싶은 색을 고른 뒤 ‘투표하기’ 버튼 또는 스페이스바로
                    투표합니다.
                  </li>
                  <li>
                    - 팔레트 칸을 선택한 뒤 ‘+’ 버튼을 누르면 색을 즐겨찾기에
                    추가할 수 있습니다.
                  </li>
                  <li>- 주의: 한 번 투표한 내용은 변경할 수 없습니다.</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
