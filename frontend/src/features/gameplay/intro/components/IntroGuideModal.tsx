import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { GameConfig } from "@/shared/config/game-config";
import {
  getCanvasTopCenterModalPosition,
  HISTORY_PANEL_WIDTH,
  RIGHT_PANEL_ACTIONS_EXPOSED_HEIGHT,
} from "@/pages/canvas/model/modal-position";
import { useSwipeDownDismiss } from "@/shared/hooks/use-swipe-down-dismiss";
import { useI18n } from "@/shared/i18n";
import IntroCanvasPreview from "./IntroCanvasPreview";

interface Props {
  open: boolean;
  playBackgroundImageUrl: string | null;
  resultTemplateImageUrl: string | null;
  gridX: number;
  gridY: number;
  previewMaxSize?: number;
  mobileLayout?: boolean;
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
  previewMaxSize = 500,
  mobileLayout = false,
  gameConfig,
  formattedGameEndTime,
  onClose,
}: Props) {
  const { locale, t } = useI18n();
  const [position, setPosition] = useState(getDefaultPosition);
  const [mobilePageIndex, setMobilePageIndex] = useState(0);

  const modalRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const touchStartXRef = useRef<number | null>(null);
  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    dragOffsetY,
    isDragging,
    isClosing,
    backdropOpacity,
    transitionDurationMs,
  } = useSwipeDownDismiss({
    onDismiss: onClose,
    active: open,
  });

  const description = useMemo(() => buildDescription(gameConfig), [gameConfig]);
  const effectivePreviewMaxSize = mobileLayout
    ? Math.min(previewMaxSize, 200)
    : previewMaxSize;
  const interactionGuides = useMemo(
    () =>
      [
        {
          key: "intro.vote.selectCell",
          highlightPhrases: [
            "마우스로 클릭",
            "키보드 방향키로 이동",
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
  const resolvedInteractionGuides = useMemo(
    () =>
      mobileLayout
        ? [
            {
              key: "mobile-palette",
              order: "01",
              title: locale === "ko" ? "색상 바꾸기" : "Change color",
              bodyLines:
                locale === "ko"
                  ? [
                      "우상단 팔레트 버튼을 눌러 현재 투표 색상을 바꿉니다.",
                      "버튼 아래에는 최근에 고른 색상이 최신순으로 최대 6개까지 쌓입니다.",
                    ]
                  : [
                      "Tap the top-right palette button to change your current vote color.",
                      "Up to six recent colors stack below it with the newest color first.",
                    ],
              highlightPhrases:
                locale === "ko"
                  ? ["우상단 팔레트 버튼", "최근에 고른 색상"]
                  : ["top-right palette button", "recent colors"],
            },
            {
              key: "mobile-vote",
              order: "02",
              title: locale === "ko" ? "바로 투표하기" : "Vote instantly",
              bodyLines:
                locale === "ko"
                  ? [
                      "모바일에서는 타일을 누르면 현재 선택한 색상으로 바로 투표합니다.",
                    ]
                  : [
                      "On mobile, tapping a tile votes immediately with the color you currently selected.",
                    ],
              highlightPhrases:
                locale === "ko"
                  ? ["현재 선택한 색상"]
                  : ["votes immediately"],
            },
            {
              key: "mobile-move",
              order: "03",
              title: locale === "ko" ? "이동과 확대" : "Move and zoom",
              bodyLines:
                locale === "ko"
                  ? [
                      "드래그로 화면을 이동하고, 두 손가락으로 확대하거나 축소할 수 있습니다.",
                    ]
                  : [
                      "Drag to move the canvas, and use two fingers to zoom in or out.",
                    ],
              highlightPhrases:
                locale === "ko"
                  ? ["드래그", "두 손가락"]
                  : ["Drag", "two fingers"],
            },
          ]
        : interactionGuides,
    [interactionGuides, locale, mobileLayout],
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

  const previewSection = (
    <section
      className={`rounded-3xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] ${mobileLayout ? "p-3" : "p-4 xl:w-fit xl:justify-self-start"}`}
    >
      <div className={`mx-auto flex w-fit flex-col items-center ${mobileLayout ? "gap-3" : "gap-4"}`}>
        <div className="w-fit">
          <IntroCanvasPreview
            playBackgroundImageUrl={playBackgroundImageUrl}
            resultTemplateImageUrl={resultTemplateImageUrl}
            gridX={gridX}
            gridY={gridY}
            maxSize={effectivePreviewMaxSize}
          />
        </div>

        <div
          className={`w-full rounded-2xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] font-bold text-[color:var(--page-theme-text-primary)] ${mobileLayout ? "px-3 py-2 text-[13px]" : "px-4 py-3 text-sm"}`}
        >
          <div className="mx-auto w-fit text-left">
            {introStats.map((stat) => (
              <p key={stat.label} className={mobileLayout ? "py-0.5 leading-6" : "py-0.5"}>
                {stat.label} : {stat.value}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  const gameDescriptionSection = (
    <section className="rounded-3xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] p-4 text-sm leading-6 text-[color:var(--page-theme-text-secondary)]">
      <h3 className="text-center font-semibold text-[color:var(--page-theme-primary-action)]">
        {t("intro.section.gameDescription")}
      </h3>
      <div className="mt-3 rounded-2xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] px-4 py-3">
        <ul className="list-disc space-y-1.5 pl-8 text-left marker:text-[color:var(--page-theme-text-secondary)]">
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

        <div className="mt-3 rounded-2xl border border-[#DE5548]/30 bg-[#FFF5F3] px-3 py-2.5 text-left">
          <p className="font-bold text-[#DE5548]">{warningGuide.title}</p>
          {warningGuide.bodyLines.map((line, index) => (
            <p
              key={`${warningGuide.title}-${index}`}
              className="mt-1.5 text-sm leading-6 text-[color:var(--page-theme-text-secondary)]"
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </section>
  );

  const voteGuideSection = (
    <section className="rounded-3xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] p-4">
      <h3 className="text-center font-semibold text-[color:var(--page-theme-primary-action)]">
        {t("intro.section.voteGuide")}
      </h3>

      <div className="mt-3 space-y-3">
        {resolvedInteractionGuides.map((guide) => (
          <article
            key={guide.key}
            className="rounded-2xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] text-sm font-bold text-[color:var(--page-theme-primary-action)]">
                {guide.order}
              </span>

              <div className="min-w-0 space-y-1.5">
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
  );

  const mobilePages = [previewSection, gameDescriptionSection, voteGuideSection];

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50"
      style={
        mobileLayout
          ? {
              paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
              paddingRight: "calc(env(safe-area-inset-right, 0px) + 12px)",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
              paddingLeft: "calc(env(safe-area-inset-left, 0px) + 12px)",
            }
          : undefined
      }
    >
      <div
        className={
          mobileLayout
            ? "pointer-events-auto fixed inset-0"
            : "pointer-events-auto fixed bottom-0 right-0"
        }
        style={
          mobileLayout
            ? {
                opacity: backdropOpacity,
                transition: isDragging
                  ? "none"
                  : `opacity ${transitionDurationMs}ms ease-out`,
              }
            : {
                top: `${RIGHT_PANEL_ACTIONS_EXPOSED_HEIGHT}px`,
                left: `${HISTORY_PANEL_WIDTH}px`,
                opacity: backdropOpacity,
                transition: isDragging
                  ? "none"
                  : `opacity ${transitionDurationMs}ms ease-out`,
              }
        }
        onMouseDown={(event) => event.stopPropagation()}
        onClick={mobileLayout ? onClose : (event) => event.stopPropagation()}
      />

      <div
        ref={modalRef}
        className={`pointer-events-auto fixed flex max-h-[calc(100dvh-16px)] flex-col overflow-hidden rounded-3xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] shadow-2xl ${
          mobileLayout
            ? "left-1/2 top-1/2 w-[min(92vw,380px)]"
            : "w-[1400px] max-w-[calc(100vw-24px)]"
        }`}
        style={
          mobileLayout
            ? {
                transform: isClosing
                  ? "translate(-50%, calc(-50% + 100dvh))"
                  : `translate(-50%, calc(-50% + ${Math.max(0, dragOffsetY)}px))`,
                transition: isDragging
                  ? "none"
                  : `transform ${transitionDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                willChange: "transform",
              }
            : { top: position.y, left: position.x }
        }
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="relative flex cursor-move items-center justify-center border-b border-[color:var(--page-theme-border-secondary)] px-4 py-3"
          onMouseDown={
            mobileLayout
              ? undefined
              : (event) => {
                  isDraggingRef.current = true;
                  dragOffsetRef.current = {
                    x: event.clientX - position.x,
                    y: event.clientY - position.y,
                  };
                }
          }
          onTouchStart={mobileLayout ? handleTouchStart : undefined}
          onTouchMove={mobileLayout ? handleTouchMove : undefined}
          onTouchEnd={mobileLayout ? handleTouchEnd : undefined}
          onTouchCancel={mobileLayout ? handleTouchCancel : undefined}
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

        <div
          className={
            mobileLayout
              ? "min-h-0 flex flex-1 flex-col px-3 py-3"
              : "min-h-0 flex-1 overflow-y-auto px-5 py-4"
          }
        >
          {mobileLayout ? (
            <>
              <div
                className="min-h-0 flex-1 overflow-hidden"
                onTouchStart={(event) => {
                  touchStartXRef.current = event.touches[0]?.clientX ?? null;
                }}
                onTouchEnd={(event) => {
                  const startX = touchStartXRef.current;
                  const endX = event.changedTouches[0]?.clientX ?? null;

                  touchStartXRef.current = null;

                  if (startX === null || endX === null) {
                    return;
                  }

                  const deltaX = endX - startX;

                  if (Math.abs(deltaX) < 40) {
                    return;
                  }

                  setMobilePageIndex((current) => {
                    if (deltaX < 0) {
                      return Math.min(current + 1, mobilePages.length - 1);
                    }

                    return Math.max(current - 1, 0);
                  });
                }}
              >
                <div
                  className="flex h-full transition-transform duration-300 ease-out"
                  style={{
                    width: `${mobilePages.length * 100}%`,
                    transform: `translateX(-${mobilePageIndex * (100 / mobilePages.length)}%)`,
                  }}
                >
                  {mobilePages.map((page, index) => (
                    <div
                      key={index}
                      className="h-full shrink-0 overflow-y-auto px-0.5"
                      style={{ width: `${100 / mobilePages.length}%` }}
                    >
                      {page}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 pt-3">
                {mobilePages.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setMobilePageIndex(index)}
                    aria-label={`${index + 1} page`}
                    className={`h-2.5 w-2.5 rounded-full transition ${
                      index === mobilePageIndex
                        ? "bg-[color:var(--page-theme-primary-action)]"
                        : "bg-[color:var(--page-theme-border-primary)]"
                    }`}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[max-content_minmax(0,1fr)]">
              {previewSection}
              <div className="space-y-4">
                {gameDescriptionSection}
                {voteGuideSection}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
