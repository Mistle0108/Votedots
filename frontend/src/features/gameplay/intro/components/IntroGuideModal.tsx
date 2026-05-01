import { useEffect, useMemo, useRef, useState } from "react";
import type { GameConfig } from "@/shared/config/game-config";
import { useI18n } from "@/shared/i18n";
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
  const { t } = useI18n();
  const [position, setPosition] = useState(getDefaultPosition);

  const modalRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const description = useMemo(() => buildDescription(gameConfig), [gameConfig]);
  const introStats = useMemo(
    () => [
      {
        label: t("intro.label.canvasSize"),
        value: `${gridX} x ${gridY}`,
      },
      {
        label: t("intro.label.totalRounds"),
        value: String(description.totalRounds),
      },
      {
        label: t("intro.label.roundDuration"),
        value: `${description.roundDurationSec}${t("intro.unit.seconds")}`,
      },
      {
        label: t("intro.label.votesPerRound"),
        value: `${description.votesPerRound}${t("intro.unit.votes")}`,
      },
      {
        label: t("intro.label.gameEndTime"),
        value: formattedGameEndTime ?? "-",
      },
    ],
    [description, formattedGameEndTime, gridX, gridY, t],
  );

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
        className="pointer-events-auto fixed flex max-h-[min(calc(100vh-80px),680px)] w-[720px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-3xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-elevated)] shadow-2xl backdrop-blur"
        style={{ top: position.y, left: position.x }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="relative flex cursor-move items-center justify-center border-b border-[color:var(--page-theme-border-secondary)] px-5 py-4"
          onMouseDown={(event) => {
            isDraggingRef.current = true;
            dragOffsetRef.current = {
              x: event.clientX - position.x,
              y: event.clientY - position.y,
            };
          }}
        >
          <p className="text-center text-base font-semibold text-[color:var(--page-theme-primary-action)]">
            {t("intro.modal.title")}
          </p>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[color:var(--page-theme-text-tertiary)] hover:bg-[color:var(--page-theme-surface-secondary)] hover:text-[color:var(--page-theme-text-primary)]"
            aria-label={t("intro.modal.close")}
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
          <div className="flex flex-col gap-6">
            <section className="space-y-1 text-center">
              <p className="text-sm text-[color:var(--page-theme-text-secondary)]">
                {t("intro.modal.subtitle")}
              </p>
            </section>

            <div className="mx-auto w-fit space-y-3">
              <IntroCanvasPreview
                playBackgroundImageUrl={playBackgroundImageUrl}
                resultTemplateImageUrl={resultTemplateImageUrl}
                gridX={gridX}
                gridY={gridY}
              />
              <div className="space-y-1 pl-6 text-left text-sm font-bold text-[color:var(--page-theme-text-primary)]">
                {introStats.map((stat, index) => (
                  <p key={stat.label}>
                    {stat.label} :{" "}
                    <span
                      className={`text-[19px] ${
                        index % 2 === 0
                          ? "text-[color:var(--page-theme-primary-action)]"
                          : "text-[color:var(--page-theme-accent-warm)]"
                      }`}
                    >
                      {stat.value}
                    </span>
                  </p>
                ))}
              </div>
            </div>

            <div className="space-y-5 text-sm leading-6 text-[color:var(--page-theme-text-secondary)]">
              <section className="space-y-2">
                <h3 className="text-center font-semibold text-[color:var(--page-theme-primary-action)]">
                  {t("intro.section.gameDescription")}
                </h3>
                <ul className="space-y-1 text-left">
                  <li>
                    {t("intro.rule.totalRoundsPrefix")}{" "}
                    <span className="text-[19px] font-bold text-[color:var(--page-theme-accent-warm)]">
                      {description.totalRounds}
                    </span>
                    {t("intro.rule.totalRoundsSuffix")}
                  </li>
                  <li>
                    {t("intro.rule.roundDurationPrefix")}{" "}
                    <span className="text-[19px] font-bold text-[color:var(--page-theme-accent-warm)]">
                      {description.roundDurationSec}
                    </span>
                    {t("intro.rule.roundDurationMiddle")}{" "}
                    <span className="text-[19px] font-bold text-[color:var(--page-theme-accent-warm)]">
                      {description.votesPerRound}
                    </span>
                    {t("intro.rule.roundDurationSuffix")}
                  </li>
                  <li>{t("intro.rule.voteFlexibility")}</li>
                  <li>{t("intro.rule.applyVotes")}</li>
                  <li>{t("intro.rule.tieBreaker")}</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-center font-semibold text-[color:var(--page-theme-primary-action)]">
                  {t("intro.section.voteGuide")}
                </h3>
                <ul className="space-y-1 text-left">
                  <li>{t("intro.vote.selectCell")}</li>
                  <li>{t("intro.vote.submit")}</li>
                  <li>{t("intro.vote.favorite")}</li>
                  <li>{t("intro.vote.warning")}</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
