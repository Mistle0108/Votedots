import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { GameConfig } from "@/shared/config/game-config";
import {
  getCanvasTopCenterModalPosition,
  HISTORY_PANEL_WIDTH,
} from "@/pages/canvas/model/modal-position";
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

const INTRO_MODAL_WIDTH = 1400;

function buildDescription(config: GameConfig) {
  return {
    totalRounds: config.rules.totalRounds,
    votesPerRound: config.rules.votesPerRound,
    roundDurationSec: config.phases.roundDurationSec,
  };
}

function getDefaultPosition() {
  return getCanvasTopCenterModalPosition(INTRO_MODAL_WIDTH);
}

function parseGuideText(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const [title = "", ...bodyLines] = lines;

  return {
    title,
    bodyLines: bodyLines.map((line) => line.replace(/^\s*-\s*/, "")),
  };
}

function renderHighlightedText(text: string, highlightPhrases: string[]) {
  const segments: Array<{ text: string; highlighted: boolean }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    let nextMatch: { index: number; phrase: string } | null = null;

    for (const phrase of highlightPhrases) {
      const index = text.indexOf(phrase, cursor);

      if (index === -1) {
        continue;
      }

      if (!nextMatch || index < nextMatch.index) {
        nextMatch = { index, phrase };
      }
    }

    if (!nextMatch) {
      segments.push({
        text: text.slice(cursor),
        highlighted: false,
      });
      break;
    }

    if (nextMatch.index > cursor) {
      segments.push({
        text: text.slice(cursor, nextMatch.index),
        highlighted: false,
      });
    }

    segments.push({
      text: nextMatch.phrase,
      highlighted: true,
    });

    cursor = nextMatch.index + nextMatch.phrase.length;
  }

  return segments.map((segment, index) =>
    segment.highlighted ? (
      <span
        key={`${segment.text}-${index}`}
        className="font-bold text-[#DE5548]"
      >
        {segment.text}
      </span>
    ) : (
      <Fragment key={`${segment.text}-${index}`}>{segment.text}</Fragment>
    ),
  );
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
  const interactionGuides = useMemo(
    () =>
      [
        {
          key: "intro.vote.selectCell",
          highlightPhrases: [
            "마우스로 클릭",
            "키보드 방향키로도 이동",
            "with your mouse",
            "with the arrow keys",
          ],
        },
        {
          key: "intro.vote.submit",
          highlightPhrases: [
            "버튼을 클릭",
            "스페이스바를 누르면",
            "click the Vote button",
            "press the space bar",
          ],
        },
        {
          key: "intro.vote.favorite",
          highlightPhrases: [],
        },
      ].map((guide, index) => {
        const parsed = parseGuideText(t(guide.key));

        return {
          key: guide.key,
          order: String(index + 1).padStart(2, "0"),
          title: parsed.title,
          bodyLines: parsed.bodyLines,
          highlightPhrases: guide.highlightPhrases,
        };
      }),
    [t],
  );
  const warningGuide = useMemo(
    () => parseGuideText(t("intro.vote.warning")),
    [t],
  );
  const introStats = useMemo(
    () => [
      {
        label: t("intro.label.canvasSize"),
        value: (
          <>
            <span className="text-[19px] text-[color:var(--page-theme-accent-warm)]">
              {gridX}
            </span>
            {" x "}
            <span className="text-[19px] text-[color:var(--page-theme-accent-warm)]">
              {gridY}
            </span>
          </>
        ),
      },
      {
        label: t("intro.label.totalRounds"),
        value: (
          <span className="text-[19px] text-[color:var(--page-theme-accent-warm)]">
            {description.totalRounds}
          </span>
        ),
      },
      {
        label: t("intro.label.roundDuration"),
        value: (
          <>
            <span className="text-[19px] text-[color:var(--page-theme-accent-warm)]">
              {description.roundDurationSec}
            </span>
            {t("intro.unit.seconds")}
          </>
        ),
      },
      {
        label: t("intro.label.votesPerRound"),
        value: (
          <>
            <span className="text-[19px] text-[color:var(--page-theme-accent-warm)]">
              {description.votesPerRound}
            </span>
            {t("intro.unit.votes")}
          </>
        ),
      },
      {
        label: t("intro.label.gameEndTime"),
        value: (
          <span className="text-[19px] text-[color:var(--page-theme-accent-warm)]">
            {formattedGameEndTime ?? "-"}
          </span>
        ),
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
    <div className="pointer-events-none fixed inset-0 z-50">
      <div
        className="pointer-events-auto fixed inset-y-0 right-0"
        style={{ left: `${HISTORY_PANEL_WIDTH}px` }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      />

      <div
        ref={modalRef}
        className="pointer-events-auto fixed flex max-h-[calc(100vh-48px)] w-[1400px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-3xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] shadow-2xl"
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
          <div className="grid gap-6 xl:grid-cols-[max-content_minmax(0,1fr)]">
            <section className="rounded-3xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] p-5 xl:w-fit xl:justify-self-start">
              <div className="mx-auto flex w-fit flex-col items-center gap-6">
                <div className="w-fit">
                  <IntroCanvasPreview
                    playBackgroundImageUrl={playBackgroundImageUrl}
                    resultTemplateImageUrl={resultTemplateImageUrl}
                    gridX={gridX}
                    gridY={gridY}
                    maxSize={560}
                  />
                </div>

                <div className="w-full rounded-2xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] px-5 py-4 text-sm font-bold text-[color:var(--page-theme-text-primary)]">
                  <div className="mx-auto w-fit text-left">
                    {introStats.map((stat) => (
                      <p key={stat.label} className="py-1">
                        {stat.label} : {stat.value}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <div className="space-y-6">
              <section className="rounded-3xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] p-6 text-sm leading-6 text-[color:var(--page-theme-text-secondary)]">
                <h3 className="text-center font-semibold text-[color:var(--page-theme-primary-action)]">
                  {t("intro.section.gameDescription")}
                </h3>
                <div className="mt-4 rounded-2xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] px-5 py-4">
                  <ul className="space-y-2 text-left">
                    <li>
                      {t("intro.rule.totalRoundsPrefix")}
                      <span className="text-[19px] font-bold text-[color:var(--page-theme-accent-warm)]">
                        {description.totalRounds}
                      </span>
                      {t("intro.rule.totalRoundsSuffix")}
                    </li>
                    <li>
                      {t("intro.rule.roundDurationPrefix")}
                      <span className="text-[19px] font-bold text-[color:var(--page-theme-accent-warm)]">
                        {description.roundDurationSec}
                      </span>
                      {t("intro.rule.roundDurationMiddle")}
                      <span className="text-[19px] font-bold text-[color:var(--page-theme-accent-warm)]">
                        {description.votesPerRound}
                      </span>
                      {t("intro.rule.roundDurationSuffix")}
                    </li>
                    <li>{t("intro.rule.voteFlexibility")}</li>
                    <li>{t("intro.rule.applyVotes")}</li>
                    <li>{t("intro.rule.tieBreaker")}</li>
                  </ul>

                  <div className="mt-4 rounded-2xl border border-[#DE5548]/30 bg-[#FFF5F3] px-4 py-3 text-left">
                    <p className="font-bold text-[#DE5548]">{warningGuide.title}</p>
                    {warningGuide.bodyLines.map((line, index) => (
                      <p
                        key={`${warningGuide.title}-${index}`}
                        className="mt-2 text-sm leading-6 text-[color:var(--page-theme-text-secondary)]"
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] p-6">
                <h3 className="text-center font-semibold text-[color:var(--page-theme-primary-action)]">
                  {t("intro.section.voteGuide")}
                </h3>

                <div className="mt-5 space-y-4">
                  {interactionGuides.map((guide) => (
                    <article
                      key={guide.key}
                      className="rounded-2xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] px-5 py-4"
                    >
                      <div className="flex items-start gap-4">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] text-sm font-bold text-[color:var(--page-theme-primary-action)]">
                          {guide.order}
                        </span>

                        <div className="min-w-0 space-y-2">
                          <h4 className="text-base font-semibold text-[color:var(--page-theme-text-primary)]">
                            {guide.title}
                          </h4>
                          {guide.bodyLines.map((line, index) => (
                            <p
                              key={`${guide.key}-${index}`}
                              className="text-sm leading-6 text-[color:var(--page-theme-text-secondary)]"
                            >
                              {renderHighlightedText(line, guide.highlightPhrases)}
                            </p>
                          ))}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
