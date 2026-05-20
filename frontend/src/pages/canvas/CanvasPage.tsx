import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useTrackVisitEvent } from "@/features/analytics/hooks/use-track-visit-event";
import { authApi } from "@/features/auth";
import type { GameplaySessionSourceApi } from "@/features/gameplay/session/api/session-source.api";
import type { RoomExpiredPayload } from "@/features/gameplay/session/model/socket.types";
import {
  roomApi,
  type RoomCurrentManageResponse,
} from "@/features/room/api/room.api";
import { setStoredRoomLifecycleNotice } from "@/features/room/model/room-lifecycle-notice";
import { clearStoredRoomSessionContext } from "@/features/room/model/room-session-context";
import {
  CanvasStage,
  CanvasSurface,
  PANEL_WIDTH,
} from "@/features/gameplay/canvas";
import type { Cell } from "@/features/gameplay/canvas";
import { GameHistoryPanel } from "@/features/gameplay/history";
import type { GameHistoryItem } from "@/features/gameplay/history/model/history.types";
import { IntroGuideModal } from "@/features/gameplay/intro";
import RoundSummaryModal from "@/features/gameplay/round/components/RoundSummaryModal";
import {
  GAME_PHASE,
  type GamePhase,
} from "@/features/gameplay/session/model/game-phase.types";
import GameSummaryModal from "@/features/gameplay/session/components/GameSummaryModal";
import {
  TutorialOverlay,
  type TutorialStep,
} from "@/features/gameplay/tutorial";
import {
  ErrorScreen,
  GameEndedScreen,
  LoadingScreen,
} from "@/features/gameplay/session";
import {
  ColorPalette,
  VotePanel,
  VotePopup,
  voteApi,
} from "@/features/gameplay/vote";
import pinIcon from "@/assets/pin-icon.png";
import {
  CHECKER_PATTERN,
  INITIAL_SLOTS,
  STORAGE_KEYS,
} from "@/features/gameplay/vote/model/vote.constants";
import {
  buildVotePopupEntries,
  loadLastPaletteColor,
  loadSlotColors,
} from "@/features/gameplay/vote/model/vote.utils";
import { useI18n } from "@/shared/i18n";
import { translateServerMessage } from "@/shared/i18n/server-messages";
import { usePageRootClass } from "@/shared/hooks/use-page-root-class";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { DropdownSelect } from "@/shared/ui/dropdown-select";
import MobileBottomSheet from "./components/MobileBottomSheet";
import useCanvasPage from "./model/useCanvasPage";
import { PLAY_THEME_STYLE } from "./model/play-theme";

const INTRO_GUIDE_SEEN_STORAGE_KEY = "votedots:intro-guide-seen";
const ROUND_SELECTION_GUIDE_DURATION_MS = 2500;
const SELECTION_PULSE_DURATION_MS = 1000;
const MOBILE_VOTE_ERROR_DURATION_MS = 3000;
const MOBILE_BREAKPOINT_MEDIA_QUERY = "(max-width: 1023px)";
const MOBILE_SLOT_COUNT = 8;

type MobileSheetType = "menu" | "participants" | "history" | "palette" | null;
type MobileVoteMode = "select" | "instant";

function MenuGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function PersonGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.25" />
      <path d="M6.5 18.5c1.25-3 3.2-4.5 5.5-4.5s4.25 1.5 5.5 4.5" />
    </svg>
  );
}

function PaletteGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3.5c-4.97 0-9 3.58-9 8 0 2.68 2.2 4.5 4.8 4.5H9a1.5 1.5 0 0 1 1.5 1.5c0 1.66 1.34 3 3 3 4.42 0 7.5-3.8 7.5-8.5 0-4.76-4.03-8.5-9-8.5Z" />
      <circle cx="7.75" cy="10.25" r="1" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="7.75" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.75" cy="9.25" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MinusGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function PlusGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function getReadableTextColor(hexColor: string): "#111827" | "#ffffff" {
  const normalized = hexColor.replace("#", "");

  if (normalized.length !== 6) {
    return "#111827";
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance >= 160 ? "#111827" : "#ffffff";
}

function getPhaseLabelKey(phase: GamePhase): string {
  switch (phase) {
    case GAME_PHASE.INTRO:
      return "round.phase.intro";
    case GAME_PHASE.ROUND_START_WAIT:
      return "round.phase.startWait";
    case GAME_PHASE.ROUND_ACTIVE:
      return "round.phase.active";
    case GAME_PHASE.ROUND_RESULT:
      return "round.phase.result";
    case GAME_PHASE.GAME_END:
      return "round.phase.gameEnd";
  }

  return "round.phase.active";
}

function getVoteBlockedMessage(
  phase: GamePhase,
  translate: (key: string) => string,
): string {
  switch (phase) {
    case GAME_PHASE.INTRO:
      return translate("vote.popup.blockedIntro");
    case GAME_PHASE.ROUND_START_WAIT:
      return translate("vote.popup.blockedStartWait");
    case GAME_PHASE.ROUND_RESULT:
      return translate("vote.popup.blockedResult");
    case GAME_PHASE.GAME_END:
      return translate("vote.popup.blockedGameEnd");
    case GAME_PHASE.ROUND_ACTIVE:
      return "";
  }

  return "";
}

interface CanvasPageProps {
  sessionSourceApi: GameplaySessionSourceApi;
}

interface SelectionGuideState {
  roundSelectionGuideVisible: boolean;
  pulsingSelectionCellKeys: Set<string>;
}

type SelectionGuideAction =
  | { type: "reset" }
  | { type: "announceRound" }
  | { type: "hideGuide" }
  | { type: "setPulsing"; cellKeys: string[] }
  | { type: "clearPulsing" };

const INITIAL_SELECTION_GUIDE_STATE: SelectionGuideState = {
  roundSelectionGuideVisible: false,
  pulsingSelectionCellKeys: new Set(),
};

function selectionGuideReducer(
  state: SelectionGuideState,
  action: SelectionGuideAction,
): SelectionGuideState {
  switch (action.type) {
    case "reset":
      return INITIAL_SELECTION_GUIDE_STATE;
    case "announceRound":
      return {
        roundSelectionGuideVisible: true,
        pulsingSelectionCellKeys: new Set(),
      };
    case "hideGuide":
      return {
        ...state,
        roundSelectionGuideVisible: false,
      };
    case "setPulsing":
      return {
        ...state,
        pulsingSelectionCellKeys: new Set(action.cellKeys),
      };
    case "clearPulsing":
      return {
        ...state,
        pulsingSelectionCellKeys: new Set(),
      };
  }
}

function buildIntroGuideSeenStorageKey(canvasId: number): string {
  return `${INTRO_GUIDE_SEEN_STORAGE_KEY}:${canvasId}`;
}

export default function CanvasPage({ sessionSourceApi }: CanvasPageProps) {
  const navigate = useNavigate();
  const { locale, setLocale, t } = useI18n();
  const gameplayEntryEventType =
    sessionSourceApi.key === "plaza" ? "plaza_visit" : "room_visit";
  const [isMobileLayout, setIsMobileLayout] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia(MOBILE_BREAKPOINT_MEDIA_QUERY).matches;
  });
  const [mobileSheet, setMobileSheet] = useState<MobileSheetType>(null);
  const [mobileVoteMode, setMobileVoteMode] =
    useState<MobileVoteMode>("select");
  const [desktopVoteMode, setDesktopVoteMode] =
    useState<MobileVoteMode>("select");
  const [desktopPaletteColor, setDesktopPaletteColor] = useState(() =>
    loadLastPaletteColor(),
  );
  const [desktopVoteLoading, setDesktopVoteLoading] = useState(false);
  const [mobilePalettePinned, setMobilePalettePinned] = useState(false);
  const [mobilePaletteColor, setMobilePaletteColor] = useState(() =>
    loadLastPaletteColor(),
  );
  const [mobileSlotColors, setMobileSlotColors] = useState(() =>
    loadSlotColors().slice(0, MOBILE_SLOT_COUNT),
  );
  const [mobileSlotCursor, setMobileSlotCursor] = useState(0);
  const [mobileVoteError, setMobileVoteError] = useState("");
  const [mobileVoteLoading, setMobileVoteLoading] = useState(false);

  usePageRootClass("page-shell-root");
  useTrackVisitEvent(gameplayEntryEventType);
  const [currentVoterUuid, setCurrentVoterUuid] = useState<string | null>(null);
  const [selectionGuideState, dispatchSelectionGuide] = useReducer(
    selectionGuideReducer,
    INITIAL_SELECTION_GUIDE_STATE,
  );
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialVotePopupPosition, setTutorialVotePopupPosition] = useState({
    x: 120,
    y: 120,
  });
  const [currentRoomManage, setCurrentRoomManage] = useState<
    RoomCurrentManageResponse["room"] | null
  >(null);
  const [roomEndGameLoading, setRoomEndGameLoading] = useState(false);
  const [roomEndGameRequested, setRoomEndGameRequested] = useState(false);
  const [roomTerminateLoading, setRoomTerminateLoading] = useState(false);
  const [roomExpiredReason, setRoomExpiredReason] = useState<
    "expired" | "terminated_by_owner" | null
  >(null);
  const guideTimerRef = useRef<number | null>(null);
  const pulseTimerRef = useRef<number | null>(null);
  const mobileVoteErrorTimerRef = useRef<number | null>(null);
  const lastAnnouncedRoundIdRef = useRef<number | null>(null);
  const hasPulsedSelectionThisRoundRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_MEDIA_QUERY);
    const handleMediaQueryChange = (event: MediaQueryListEvent) => {
      setIsMobileLayout(event.matches);

      if (!event.matches) {
        setMobileSheet(null);
        setMobileVoteError("");
      }
    };

    mediaQuery.addEventListener("change", handleMediaQueryChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaQueryChange);
    };
  }, []);

  useEffect(() => {
    if (mobileVoteErrorTimerRef.current !== null) {
      window.clearTimeout(mobileVoteErrorTimerRef.current);
      mobileVoteErrorTimerRef.current = null;
    }

    if (!mobileVoteError) {
      return undefined;
    }

    mobileVoteErrorTimerRef.current = window.setTimeout(() => {
      setMobileVoteError("");
      mobileVoteErrorTimerRef.current = null;
    }, MOBILE_VOTE_ERROR_DURATION_MS);

    return () => {
      if (mobileVoteErrorTimerRef.current !== null) {
        window.clearTimeout(mobileVoteErrorTimerRef.current);
        mobileVoteErrorTimerRef.current = null;
      }
    };
  }, [mobileVoteError]);

  const handleSessionEnded = useCallback(() => {
    if (
      (
        window as Window & {
          __votedotsWithdrawPending?: boolean;
        }
      ).__votedotsWithdrawPending
    ) {
      (
        window as Window & {
          __votedotsWithdrawPending?: boolean;
        }
      ).__votedotsWithdrawPending = false;
      navigate("/login", { replace: true });
      return;
    }

    clearStoredRoomSessionContext();
    window.alert(t("canvas.sessionEnded"));
    navigate("/lobby", { replace: true });
  }, [navigate, t]);

  const handleUnauthorized = useCallback(
    (message: string) => {
      window.alert(message);
      navigate("/login", { replace: true });
    },
    [navigate],
  );

  const handleContextMissing = useCallback(() => {
    clearStoredRoomSessionContext();
    navigate("/lobby", { replace: true });
  }, [navigate]);

  const handleRoomExpired = useCallback(
    ({ reason }: RoomExpiredPayload) => {
      if (sessionSourceApi.key !== "room") {
        return;
      }

      setRoomExpiredReason(reason);
    },
    [sessionSourceApi.key],
  );
  const cellActivatedHandlerRef = useRef<(cell: Cell) => void>(() => {});

  const {
    paintCanvasRef,
    canvasRef,
    containerRef,
    loading,
    error,
    gameEnded,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    isDraggingCanvas,
    handleWheel,
    popupOpen,
    popupPos,
    canvasId,
    phase,
    roundId,
    isRoundExpired,
    selectedCell,
    displaySelectedCell,
    votes,
    cells,
    handleVoteSuccess,
    handleColorChange,
    handlePopupClose,
    roundNumber,
    totalRounds,
    formattedGameEndTime,
    formattedRemainingTime,
    remainingSeconds,
    roundDurationSec,
    remaining,
    participantCount,
    votingParticipantCount,
    participants,
    participantLoading,
    participantError,
    gameConfig,
    roundSummaryModal,
    gameSummaryModal,
    handleCloseRoundSummaryModal,
    handleCloseGameSummaryModal,
    handleOpenRoundSummaryModal,
    handleOpenGameSummaryModal,
    gridX,
    gridY,
    playBackgroundImageUrl,
    resultTemplateImageUrl,
    viewport,
    surfaceSize,
    cameraX,
    cameraY,
    zoom,
    worldOffset,
    navigateToCoordinate,
    resetCanvasZoom,
    stepCanvasZoom,
    introGuideOpen,
    handleOpenIntroGuide,
    handleCloseIntroGuide,
    roundSummaryOpen,
    roundSummaryPosition,
    handleRoundSummaryDragStart,
    latestRoundSnapshot,
    openVotePopupForCell,
    backgroundMode,
    setBackgroundMode,
    historyItems,
    historyLoading,
    historyError,
  } = useCanvasPage({
    sessionSourceApi,
    onSessionEnded: handleSessionEnded,
    onRoomExpired: handleRoomExpired,
    onContextMissing:
      sessionSourceApi.key === "room" ? handleContextMissing : undefined,
    onUnauthorized: handleUnauthorized,
    openPopupOnActivate: isMobileLayout ? false : desktopVoteMode === "select",
    resetPreviewOnActivate:
      isMobileLayout ? false : desktopVoteMode === "select",
    onCellActivated: (cell) => {
      cellActivatedHandlerRef.current(cell);
    },
  });

  useEffect(() => {
    if (!roomExpiredReason) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      clearStoredRoomSessionContext();
      setStoredRoomLifecycleNotice(roomExpiredReason);
      navigate("/lobby", { replace: true });
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [navigate, roomExpiredReason]);

  useEffect(() => {
    if (sessionSourceApi.key !== "room") {
      return;
    }

    if (roomExpiredReason) {
      return;
    }

    if (phase !== GAME_PHASE.GAME_END) {
      return;
    }

    if (remainingSeconds !== 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRoomExpiredReason("expired");
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [phase, remainingSeconds, roomExpiredReason, sessionSourceApi.key]);

  useEffect(() => {
    if (sessionSourceApi.key !== "room") {
      return;
    }

    let cancelled = false;

    const fetchCurrentRoomManage = async () => {
      try {
        const { data } = await roomApi.getCurrentManage();

        if (!cancelled) {
          setCurrentRoomManage(data.room);
        }
      } catch {
        if (!cancelled) {
          setCurrentRoomManage(null);
        }
      }
    };

    void fetchCurrentRoomManage();

    return () => {
      cancelled = true;
    };
  }, [sessionSourceApi.key]);

  const handleTerminateRoom = useCallback(async () => {
    if (sessionSourceApi.key !== "room" || !currentRoomManage) {
      return;
    }

    const confirmed = window.confirm(
      locale === "ko"
        ? '현재 방을 강제 종료하시겠습니까?\n강제 종료시 완료된 캔버스를 다운로드 받을 수 없고, 접속 중인 사용자 모두 로비로 이동합니다. 캔버스 다운로드를 원하시면 "게임 종료" 버튼을 클릭해 주시기 바랍니다.'
        : 'Do you want to force-close this room?\nIf you force-close it, the completed canvas cannot be downloaded and everyone in the room will be moved to the lobby. If you want the canvas download, please click "End Game" instead.',
    );

    if (!confirmed) {
      return;
    }

    setRoomTerminateLoading(true);

    try {
      await roomApi.terminateCurrent();
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
      ) {
        window.alert(error.response.data.message);
      } else {
        window.alert(
          locale === "ko"
            ? "방 강제 종료에 실패했습니다."
            : "Failed to close the room.",
        );
      }
    } finally {
      setRoomTerminateLoading(false);
    }
  }, [currentRoomManage, locale, sessionSourceApi.key]);

  const handleEndGame = useCallback(async () => {
    if (sessionSourceApi.key !== "room" || !currentRoomManage) {
      return;
    }

    const confirmed = window.confirm(
      locale === "ko"
        ? "현재 게임을 종료하시겠습니까?\n게임 종료 시 완료된 캔버스를 다운로드할 수 있으며, 게임 종료 대기 시간이 끝나면 로비로 이동합니다."
        : "Do you want to end the current game?\nYou will be able to download the completed canvas, and everyone will move to the lobby after the game-end wait finishes.",
    );

    if (!confirmed) {
      return;
    }

    setRoomEndGameRequested(true);
    setRoomEndGameLoading(true);

    try {
      await roomApi.endGameCurrent();
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
      ) {
        window.alert(error.response.data.message);
      } else {
        window.alert(
          locale === "ko"
            ? "게임 종료에 실패했습니다."
            : "Failed to end the game.",
        );
      }
      setRoomEndGameRequested(false);
    } finally {
      setRoomEndGameLoading(false);
    }
  }, [currentRoomManage, locale, sessionSourceApi.key]);

  const canvasPageThemeStyle = PLAY_THEME_STYLE;
  const tutorialSteps = useMemo<TutorialStep[]>(
    () =>
      isMobileLayout
        ? [
            {
              id: "canvas",
              targetIds: ["tutorial-canvas-stage"],
              title: t("tutorial.step.canvas.title"),
              description: t("tutorial.step.canvas.description"),
              padding: 8,
              panelPosition: "center",
            },
            {
              id: "mobile-controls",
              targetIds: [
                "tutorial-mobile-vote-controls",
                "tutorial-mobile-palette-button",
              ],
              title:
                locale === "ko"
                  ? "투표 모드와 팔레트"
                  : "Vote mode and palette",
              description:
                locale === "ko"
                  ? "좌하단에서 투표 모드를 바꾸고, 우하단 팔레트 버튼으로 색상 패널을 열 수 있습니다.\n색상 선택 모드는 표 하나마다 색상을 선택하고 투표합니다.\n바로 투표 모드는 처음 지정한 색상으로 선택함과 동시에 투표합니다."
                  : "Switch vote modes at the bottom left and open the color palette from the bottom right button.\nSelect color vote lets you choose a color for each tile before voting.\nInstant vote submits immediately with the color you set first.",
              padding: 8,
              panelPosition: "center",
            },
            {
              id: "vote-modal",
              targetIds: ["tutorial-vote-modal"],
              title:
                locale === "ko" ? "팔레트" : "Palette",
              description:
                locale === "ko"
                  ? "팔레트에서 색을 고르고, 실시간 현황과 즐겨찾기를 확인할 수 있습니다."
                  : "Pick colors from the palette and review live status and favorites.",
              padding: 8,
            },
            {
              id: "mobile-header",
              targetIds: ["tutorial-mobile-header"],
              title:
                locale === "ko" ? "상단 영역" : "Top area",
              description:
                locale === "ko"
                  ? "상단 두 줄에서 메뉴, 참여자, 현재 라운드, 남은 시간, 투표권 정보를 확인할 수 있습니다."
                  : "Use the two top rows to check menu access, participants, current round, time, and tickets.",
              padding: 8,
            },
            {
              id: "top-actions",
              targetIds: ["tutorial-mobile-menu-button", "tutorial-settings-panel"],
              title: t("tutorial.step.topActions.title"),
              description:
                locale === "ko"
                  ? "좌상단 메뉴에서 캔버스 나가기, 튜토리얼, 언어와 배경 설정을 열 수 있습니다."
                  : "Open the top-left menu to leave the canvas, open the tutorial, and adjust language and background settings.",
              padding: 8,
            },
            {
              id: "participants",
              targetIds: [
                "tutorial-mobile-participants-button",
                "tutorial-participants",
              ],
              title: t("tutorial.step.participants.title"),
              description: t("tutorial.step.participants.description"),
              padding: 8,
            },
            {
              id: "history",
              targetIds: ["tutorial-mobile-round-info", "tutorial-history-panel"],
              title: t("tutorial.step.history.title"),
              description: t("tutorial.step.history.description"),
              padding: 4,
            },
          ]
        : [
            {
              id: "canvas",
              targetIds: ["tutorial-canvas-stage"],
              title: t("tutorial.step.canvas.title"),
              description: t("tutorial.step.canvas.description"),
              padding: 8,
            },
            {
              id: "vote-modal",
              targetIds: ["tutorial-vote-modal"],
              title: t("tutorial.step.voteModal.title"),
              description: t("tutorial.step.voteModal.description"),
              padding: 8,
            },
            {
              id: "top-actions",
              targetIds: ["tutorial-top-actions", "tutorial-settings-panel"],
              title: t("tutorial.step.topActions.title"),
              description: t("tutorial.step.topActions.description"),
              padding: 8,
            },
            {
              id: "round-info",
              targetIds: ["tutorial-round-info"],
              title:
                locale === "ko"
                  ? "좌측 정보 패널"
                  : "Left info panel",
              description:
                locale === "ko"
                  ? "현재 라운드 상태, 남은시간, 종료 예정 시각을 이 영역에서 확인합니다.\n두 가지 투표 모드를 지원하며 색상 선택 모드는 하나의 칸마다 색상을 선택하고 투표할 수 있습니다.\n바로 투표 모드는 처음에 색상을 선택하고 칸을 클릭하여 바로 투표할 수 있습니다.\n이번 라운드에서 사용할 수 있는 남은 투표권 수를 확인할 수 있습니다."
                  : "Check the current round state, remaining time, and expected end time in this area.\nTwo voting modes are supported. In color select mode, you can choose a color and vote for each individual cell.\nIn instant vote mode, you choose a color first and then click cells to vote immediately.\nYou can also check how many vote tickets remain for this round here.",
              padding: 8,
            },
            {
              id: "minimap",
              targetIds: ["tutorial-minimap"],
              title: t("tutorial.step.minimap.title"),
              description: t("tutorial.step.minimap.description"),
              padding: 8,
            },
            {
              id: "live-status",
              targetIds: ["tutorial-live-status"],
              title: t("tutorial.step.liveStatus.title"),
              description: t("tutorial.step.liveStatus.description"),
              padding: 8,
            },
            {
              id: "participants",
              targetIds: ["tutorial-participants"],
              title: t("tutorial.step.participants.title"),
              description: t("tutorial.step.participants.description"),
              padding: 8,
              scrollTargetIntoView: true,
            },
            {
              id: "history",
              targetIds: ["tutorial-history-panel"],
              title: t("tutorial.step.history.title"),
              description: t("tutorial.step.history.description"),
              padding: 4,
            },
          ],
    [isMobileLayout, locale, t],
  );
  const tutorialCurrentStepId = tutorialSteps[tutorialStepIndex]?.id ?? null;
  const tutorialNeedsSettingsPanel =
    tutorialOpen &&
    tutorialSteps[tutorialStepIndex]?.targetIds.includes(
      "tutorial-settings-panel",
    );
  const tutorialNeedsParticipantPanel =
    tutorialOpen && tutorialSteps[tutorialStepIndex]?.id === "participants";
  const tutorialMobileManagedSheet = useMemo<MobileSheetType>(() => {
    if (!tutorialOpen || !isMobileLayout) {
      return null;
    }

    switch (tutorialCurrentStepId) {
      case "vote-modal":
        return "palette";
      case "top-actions":
        return "menu";
      case "participants":
        return "participants";
      case "history":
        return "history";
      default:
        return null;
    }
  }, [isMobileLayout, tutorialCurrentStepId, tutorialOpen]);
  const tutorialVoteSelectedCell = useMemo(() => {
    if (selectedCell) {
      return selectedCell;
    }

    const fallbackX = Math.max(0, Math.floor(gridX / 2));
    const fallbackY = Math.max(0, Math.floor(gridY / 2));
    const fallbackCell = cells.find(
      (cell) => cell.x === fallbackX && cell.y === fallbackY,
    );

    return (
      fallbackCell ?? {
        x: fallbackX,
        y: fallbackY,
        color: null,
        status: "idle" as const,
      }
    );
  }, [cells, gridX, gridY, selectedCell]);
  const tutorialVotePopupVotes = useMemo(
    () => ({
      [`${tutorialVoteSelectedCell.x}:${tutorialVoteSelectedCell.y}:#DE5548`]: 5,
      [`${tutorialVoteSelectedCell.x}:${tutorialVoteSelectedCell.y}:#4F83CC`]: 3,
      [`${tutorialVoteSelectedCell.x}:${tutorialVoteSelectedCell.y}:#FACC15`]: 2,
    }),
    [tutorialVoteSelectedCell.x, tutorialVoteSelectedCell.y],
  );
  const shouldShowTutorialVotePopup = Boolean(
    tutorialOpen &&
    tutorialCurrentStepId === "vote-modal" &&
    !isMobileLayout &&
    !(popupOpen && selectedCell && canvasId),
  );
  const shouldDecorateLiveVotePopup = Boolean(
    tutorialOpen &&
    tutorialCurrentStepId === "vote-modal" &&
    !isMobileLayout &&
    popupOpen &&
    selectedCell &&
    canvasId,
  );
  const shouldDisableSettingsButton =
    (introGuideOpen || roundSummaryOpen || Boolean(gameSummaryModal)) &&
    !tutorialNeedsSettingsPanel;
  const desktopInstantVoteTargetCell = useMemo(() => {
    if (selectedCell) {
      return selectedCell;
    }

    const fallbackX = Math.max(0, Math.floor(gridX / 2));
    const fallbackY = Math.max(0, Math.floor(gridY / 2));

    return (
      cells.find((cell) => cell.x === fallbackX && cell.y === fallbackY) ?? {
        x: fallbackX,
        y: fallbackY,
        color: null,
        status: "idle" as const,
      }
    );
  }, [cells, gridX, gridY, selectedCell]);
  const openDesktopInstantVotePalette = useCallback((anchorRect: DOMRect) => {
    if (isMobileLayout) {
      return;
    }

    const popupWidth = 256;
    const popupHeight = 356;
    const viewportPadding = 12;
    const horizontalGap = anchorRect.width / 2;
    const desiredX = Math.min(
      window.innerWidth - popupWidth - viewportPadding,
      Math.max(
        viewportPadding,
        anchorRect.left - popupWidth - horizontalGap,
      ),
    );
    const desiredY = Math.min(
      window.innerHeight - popupHeight - viewportPadding,
      Math.max(
        viewportPadding,
        anchorRect.top + anchorRect.height / 2 - popupHeight / 2,
      ),
    );
    const popupPosition = {
      // VotePopup desktop positioning interprets `position` like a pointer
      // anchor and applies its own internal offset (+190, -120). Feed the
      // inverse so the final modal lands at the desired absolute position.
      x: desiredX - 190,
      y: desiredY + 120,
    };

    openVotePopupForCell(desktopInstantVoteTargetCell, popupPosition);
  }, [desktopInstantVoteTargetCell, isMobileLayout, openVotePopupForCell]);

  const handleCloseVotePopup = handlePopupClose;
  const selectionLabels = useMemo(() => {
    if (!currentVoterUuid) {
      return [];
    }

    const stackCountByCell = new Map<string, number>();

    return participants
      .filter(
        (participant) =>
          participant.selectedCell &&
          participant.voterUuid !== currentVoterUuid,
      )
      .map((participant) => {
        const selectedCell = participant.selectedCell!;
        const cellKey = `${selectedCell.x}:${selectedCell.y}`;
        const stackIndex = stackCountByCell.get(cellKey) ?? 0;

        stackCountByCell.set(cellKey, stackIndex + 1);

        return {
          key: `${participant.sessionId}:${cellKey}`,
          nickname: participant.nickname,
          x: selectedCell.x,
          y: selectedCell.y,
          stackIndex,
        };
      });
  }, [currentVoterUuid, participants]);
  const uniqueSelectionCellKeys = useMemo(
    () =>
      Array.from(
        new Set(selectionLabels.map((label) => `${label.x}:${label.y}`)),
      ),
    [selectionLabels],
  );

  useEffect(() => {
    let cancelled = false;

    const fetchCurrentVoter = async () => {
      try {
        const { data } = await authApi.me();

        if (cancelled) {
          return;
        }

        setCurrentVoterUuid(data.voter.uuid);
      } catch {
        if (!cancelled) {
          setCurrentVoterUuid(null);
        }
      }
    };

    void fetchCurrentVoter();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (guideTimerRef.current !== null) {
        window.clearTimeout(guideTimerRef.current);
      }

      if (pulseTimerRef.current !== null) {
        window.clearTimeout(pulseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (phase !== GAME_PHASE.ROUND_ACTIVE || roundId === null) {
      dispatchSelectionGuide({ type: "reset" });
      hasPulsedSelectionThisRoundRef.current = false;

      if (guideTimerRef.current !== null) {
        window.clearTimeout(guideTimerRef.current);
        guideTimerRef.current = null;
      }

      if (pulseTimerRef.current !== null) {
        window.clearTimeout(pulseTimerRef.current);
        pulseTimerRef.current = null;
      }

      return;
    }

    if (lastAnnouncedRoundIdRef.current === roundId) {
      return;
    }

    lastAnnouncedRoundIdRef.current = roundId;
    hasPulsedSelectionThisRoundRef.current = false;
    dispatchSelectionGuide({ type: "announceRound" });

    if (guideTimerRef.current !== null) {
      window.clearTimeout(guideTimerRef.current);
    }

    guideTimerRef.current = window.setTimeout(() => {
      guideTimerRef.current = null;
      dispatchSelectionGuide({ type: "hideGuide" });
    }, ROUND_SELECTION_GUIDE_DURATION_MS);
  }, [phase, roundId]);

  useEffect(() => {
    if (
      phase !== GAME_PHASE.ROUND_ACTIVE ||
      hasPulsedSelectionThisRoundRef.current
    ) {
      return;
    }

    if (uniqueSelectionCellKeys.length === 0) {
      return;
    }

    hasPulsedSelectionThisRoundRef.current = true;
    dispatchSelectionGuide({
      type: "setPulsing",
      cellKeys: uniqueSelectionCellKeys,
    });

    if (pulseTimerRef.current !== null) {
      window.clearTimeout(pulseTimerRef.current);
    }

    pulseTimerRef.current = window.setTimeout(() => {
      pulseTimerRef.current = null;
      dispatchSelectionGuide({ type: "clearPulsing" });
    }, SELECTION_PULSE_DURATION_MS);
  }, [phase, uniqueSelectionCellKeys]);

  const handleOpenTutorial = useCallback(() => {
    setTutorialStepIndex(0);
    setMobilePalettePinned(false);
    setTutorialOpen(true);
  }, []);

  const handleCloseTutorial = useCallback(() => {
    setTutorialOpen(false);
    setMobileSheet(null);
  }, []);

  useEffect(() => {
    if (!canvasId || loading || error || gameEnded) {
      return;
    }

    const storageKey = buildIntroGuideSeenStorageKey(canvasId);

    if (window.sessionStorage.getItem(storageKey) === "true") {
      return;
    }

    window.sessionStorage.setItem(storageKey, "true");
    handleOpenIntroGuide();
  }, [canvasId, error, gameEnded, handleOpenIntroGuide, loading]);

  useLayoutEffect(() => {
    if (!shouldShowTutorialVotePopup) {
      return;
    }

    const popupWidth = 256;
    const popupHeight = 344;
    const updatePosition = () => {
      const containerRect = containerRef.current?.getBoundingClientRect();

      if (containerRect) {
        const nextX = Math.min(
          window.innerWidth - popupWidth - 12,
          Math.max(
            12,
            containerRect.left + containerRect.width * 0.66 - popupWidth / 2,
          ),
        );
        const nextY = Math.min(
          window.innerHeight - popupHeight - 12,
          Math.max(12, containerRect.top + 56),
        );

        setTutorialVotePopupPosition({
          x: Math.round(nextX),
          y: Math.round(nextY),
        });
        return;
      }

      setTutorialVotePopupPosition({
        x: Math.round(window.innerWidth - popupWidth - 24),
        y: 24,
      });
    };

    const frameId = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updatePosition);
    };
  }, [
    containerRef,
    shouldShowTutorialVotePopup,
    surfaceSize.height,
    surfaceSize.width,
  ]);

  useEffect(() => {
    if (!isMobileLayout) {
      return;
    }

    handleColorChange(mobilePaletteColor);
  }, [handleColorChange, isMobileLayout, mobilePaletteColor]);

  const persistMobileSlotColors = useCallback((nextSlotColors: string[]) => {
    if (typeof window === "undefined") {
      return;
    }

    const normalized = nextSlotColors.slice(0, MOBILE_SLOT_COUNT);

    while (normalized.length < MOBILE_SLOT_COUNT) {
      normalized.push("");
    }

    window.localStorage.setItem(
      STORAGE_KEYS.slotColors,
      JSON.stringify([
        ...normalized,
        ...INITIAL_SLOTS.slice(MOBILE_SLOT_COUNT),
      ]),
    );
  }, []);

  const handleMobilePaletteColorChange = useCallback((nextColor: string) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEYS.lastPaletteColor, nextColor);
    }

    setMobilePaletteColor(nextColor);
    setMobileVoteError("");
  }, []);

  const handleMobileSlotAdd = useCallback(() => {
    setMobileSlotColors((prev) => {
      const next = [...prev];
      next[mobileSlotCursor] = mobilePaletteColor;
      persistMobileSlotColors(next);
      return next;
    });
    setMobileSlotCursor((prev) => (prev + 1) % MOBILE_SLOT_COUNT);
  }, [mobilePaletteColor, mobileSlotCursor, persistMobileSlotColors]);

  const handleMobileSlotReset = useCallback(() => {
    const next = INITIAL_SLOTS.slice(0, MOBILE_SLOT_COUNT);
    setMobileSlotColors(next);
    setMobileSlotCursor(0);
    persistMobileSlotColors(next);
  }, [persistMobileSlotColors]);

  const handleMobileSlotSelect = useCallback(
    (slotColor: string, slotIndex: number) => {
      setMobileSlotCursor(slotIndex);

      if (!slotColor) {
        return;
      }

      handleMobilePaletteColorChange(slotColor);
    },
    [handleMobilePaletteColorChange],
  );
  const openMobilePaletteSheet = useCallback(() => {
    if (typeof window === "undefined") {
      setMobileSheet("palette");
      return;
    }

    window.requestAnimationFrame(() => {
      setMobileSheet("palette");
    });
  }, []);

  const handleSubmitMobileVote = useCallback(
    async (targetCell?: Cell | null) => {
      if (mobileVoteLoading) {
        return;
      }

      if (phase !== GAME_PHASE.ROUND_ACTIVE) {
        setMobileVoteError(getVoteBlockedMessage(phase, t));
        return;
      }

      const resolvedCell = targetCell ?? selectedCell;

      if (!canvasId || !roundId || !resolvedCell) {
        setMobileVoteError(
          locale === "ko" ? "먼저 셀을 선택해 주세요." : "Select a cell first.",
        );
        return;
      }

      if (isRoundExpired) {
        setMobileVoteError(t("vote.popup.roundClosed"));
        return;
      }

      if (remaining !== null && remaining <= 0) {
        setMobileVoteError(t("server.vote.noTickets"));
        return;
      }

      setMobileVoteError("");
      setMobileVoteLoading(true);

      try {
        await voteApi.submit({
          canvasId,
          roundId,
          x: resolvedCell.x,
          y: resolvedCell.y,
          color: mobilePaletteColor,
        });

        handleVoteSuccess(mobilePaletteColor);

        if (mobileVoteMode === "select" && !mobilePalettePinned) {
          setMobileSheet(null);
        }
      } catch (err: unknown) {
        if (err && typeof err === "object" && "response" in err) {
          const axiosErr = err as {
            response?: { data?: { message?: string } };
          };
          setMobileVoteError(
            translateServerMessage(
              axiosErr.response?.data?.message ?? t("vote.popup.submitError"),
              t,
              locale,
            ),
          );
        } else if (err instanceof Error) {
          setMobileVoteError(translateServerMessage(err.message, t, locale));
        } else {
          setMobileVoteError(t("vote.popup.submitError"));
        }
      } finally {
        setMobileVoteLoading(false);
      }
    },
    [
      canvasId,
      handleVoteSuccess,
      isRoundExpired,
      locale,
      mobilePaletteColor,
      mobilePalettePinned,
      mobileVoteLoading,
      mobileVoteMode,
      phase,
      remaining,
      roundId,
      selectedCell,
      t,
    ],
  );

  const handleSubmitDesktopInstantVote = useCallback(
    async (targetCell: Cell) => {
      if (desktopVoteLoading || !canvasId || !roundId) {
        return;
      }

      if (phase !== GAME_PHASE.ROUND_ACTIVE) {
        return;
      }

      if (isRoundExpired) {
        return;
      }

      if (remaining !== null && remaining <= 0) {
        return;
      }

      setDesktopVoteLoading(true);

      try {
        await voteApi.submit({
          canvasId,
          roundId,
          x: targetCell.x,
          y: targetCell.y,
          color: desktopPaletteColor,
        });

        handleVoteSuccess(desktopPaletteColor);
      } catch (err: unknown) {
        if (err && typeof err === "object" && "response" in err) {
          return;
        }
      } finally {
        setDesktopVoteLoading(false);
      }
    },
    [
      canvasId,
      desktopPaletteColor,
      desktopVoteLoading,
      handleVoteSuccess,
      isRoundExpired,
      phase,
      remaining,
      roundId,
    ],
  );

  useEffect(() => {
    cellActivatedHandlerRef.current = (cell) => {
      if (isMobileLayout) {
        setMobileVoteError("");

        if (mobileVoteMode === "instant") {
          void handleSubmitMobileVote(cell);
          return;
        }

        openMobilePaletteSheet();
        return;
      }

      if (desktopVoteMode === "instant") {
        void handleSubmitDesktopInstantVote(cell);
      }
    };
  }, [
    desktopVoteMode,
    handleSubmitDesktopInstantVote,
    handleSubmitMobileVote,
    isMobileLayout,
    mobileVoteMode,
    openMobilePaletteSheet,
  ]);

  const mobileMenuLabels =
    locale === "ko"
      ? {
          background: "배경",
          back: "캔버스 나가기",
          black: "검정",
          gray: "회색",
          intro: "튜토리얼",
          language: "언어",
          room: "입장 코드",
          settings: "메뉴",
          title: "메뉴",
          white: "흰색",
        }
      : {
          background: "Background",
          back: "Leave canvas",
          black: "Black",
          gray: "Gray",
          intro: "Tutorial",
          language: "Language",
          room: "Access code",
          settings: "Menu",
          title: "Menu",
          white: "White",
        };

  const participantDisplayCount = participantCount ?? participants.length;
  const phaseLabel = t(getPhaseLabelKey(phase));
  const phaseTimeValue = formattedRemainingTime ?? "0:00";
  const roundValue =
    roundNumber !== null ? `${roundNumber}/${totalRounds}` : `-/${totalRounds}`;
  const remainingVotesValue =
    remaining !== null && gameConfig
      ? `${remaining}/${gameConfig.rules.votesPerRound}`
      : "-/-";
  const activeMobileSheet =
    tutorialOpen && isMobileLayout ? tutorialMobileManagedSheet : mobileSheet;
  const roomGameEndControlsDisabled = phase === GAME_PHASE.GAME_END;
  const selectedCellLabel = selectedCell
    ? `(${selectedCell.x}, ${selectedCell.y})`
    : locale === "ko"
      ? "선택 없음"
      : "None";
  const mobileVoteEntries = useMemo(
    () =>
      selectedCell
        ? buildVotePopupEntries(votes, selectedCell.x, selectedCell.y).slice(
            0,
            3,
          )
        : [],
    [selectedCell, votes],
  );
  const isPaletteSheetOpen = activeMobileSheet === "palette";
  const mobilePaletteButtonTextColor = getReadableTextColor(mobilePaletteColor);
  const canSubmitMobileVote =
    Boolean(canvasId) &&
    Boolean(roundId) &&
    Boolean(selectedCell) &&
    phase === GAME_PHASE.ROUND_ACTIVE &&
    !isRoundExpired &&
    !mobileVoteLoading &&
    (remaining === null || remaining > 0);

  const handleOpenMobileBack = useCallback(() => {
    navigate("/lobby");
  }, [navigate]);

  if (loading) {
    return (
      <div
        className="flex h-screen w-full overflow-hidden bg-[color:var(--page-theme-page-background)] text-[color:var(--page-theme-text-primary)]"
        style={canvasPageThemeStyle}
      >
        <LoadingScreen />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex h-screen w-full overflow-hidden bg-[color:var(--page-theme-page-background)] text-[color:var(--page-theme-text-primary)]"
        style={canvasPageThemeStyle}
      >
        <ErrorScreen message={error} />
      </div>
    );
  }

  if (gameEnded) {
    return (
      <div
        className="flex h-screen w-full overflow-hidden bg-[color:var(--page-theme-page-background)] text-[color:var(--page-theme-text-primary)]"
        style={canvasPageThemeStyle}
      >
        <GameEndedScreen />
      </div>
    );
  }

  if (roomExpiredReason) {
    return (
      <div
        className="flex h-screen w-full items-center justify-center overflow-hidden bg-[color:var(--page-theme-page-background)] px-6 text-center text-lg font-medium text-[color:var(--page-theme-text-primary)]"
        style={canvasPageThemeStyle}
      >
        {roomExpiredReason === "terminated_by_owner"
          ? t("room.terminatedRedirect")
          : t("room.expiredRedirect")}
      </div>
    );
  }

  if (isMobileLayout) {
    return (
      <div
        className="flex h-screen w-full flex-col overflow-hidden bg-[color:var(--page-theme-page-background)] text-[color:var(--page-theme-text-primary)]"
        style={canvasPageThemeStyle}
      >
        <div
          className="shrink-0 px-3 pb-2 pt-3"
          style={{
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
          }}
          data-tutorial-id="tutorial-mobile-header"
        >
          <div className="flex h-[58px] items-center rounded-[24px] border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] px-4 shadow-sm">
            <button
              type="button"
              onClick={() => setMobileSheet("menu")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--page-theme-text-secondary)]"
              aria-label={mobileMenuLabels.title}
              data-tutorial-id="tutorial-mobile-menu-button"
            >
              <MenuGlyph />
            </button>

            <div className="flex min-w-0 flex-1 items-center justify-center">
              <BrandLogo variant="wordmark" className="h-6 w-auto" />
            </div>

            <button
              type="button"
              onClick={() => setMobileSheet("participants")}
              className="inline-flex min-w-[92px] items-center justify-end gap-1 text-[color:var(--page-theme-text-secondary)]"
              aria-label={t("session.participantList")}
              data-tutorial-id="tutorial-mobile-participants-button"
            >
              <PersonGlyph />
              <span className="text-xs font-semibold text-[color:var(--page-theme-text-primary)]">
                {locale === "ko"
                  ? `참여자 ${participantDisplayCount}명`
                  : `${participantDisplayCount} players`}
              </span>
            </button>
          </div>

          <div className="mt-2 grid h-[54px] grid-cols-3 overflow-hidden rounded-[20px] border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)]">
            <div className="flex items-center justify-between gap-2 border-r border-[color:var(--page-theme-border-primary)] px-3">
              <span className="truncate text-[11px] font-medium text-[color:var(--page-theme-text-secondary)]">
                {phaseLabel}
              </span>
              <span className="text-sm font-semibold text-[color:var(--page-theme-alert)]">
                {phaseTimeValue}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setMobileSheet("history")}
              className="flex items-center justify-between gap-2 border-r border-[color:var(--page-theme-border-primary)] px-3 text-left"
              data-tutorial-id="tutorial-mobile-round-info"
            >
              <span className="truncate text-[11px] font-medium text-[color:var(--page-theme-text-secondary)]">
                {t("round.round")}
              </span>
              <span className="text-sm font-semibold text-[color:var(--page-theme-text-primary)]">
                {roundValue}
              </span>
            </button>

            <div
              className="flex items-center justify-between gap-2 px-3"
              data-tutorial-id="tutorial-mobile-vote-remaining"
            >
              <span className="truncate text-[11px] font-medium text-[color:var(--page-theme-text-secondary)]">
                {locale === "ko" ? "투표권" : "Votes"}
              </span>
              <span className="text-sm font-semibold text-[color:var(--page-theme-text-primary)]">
                {remainingVotesValue}
              </span>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <CanvasStage
            containerRef={containerRef}
            tutorialId="tutorial-canvas-stage"
            topCenterOverlay={
              selectionGuideState.roundSelectionGuideVisible ? (
                <div className="rounded-[1.25rem] border border-[rgba(0,0,0,0.18)] bg-[#FACC15] px-6 py-3 text-lg font-semibold leading-none text-black shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
                  {t("canvas.roundStartedGuide", { round: roundNumber ?? "" })}
                </div>
              ) : null
            }
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            isDragging={isDraggingCanvas}
            onWheel={handleWheel}
          >
            <>
              <CanvasSurface
                paintCanvasRef={paintCanvasRef}
                canvasRef={canvasRef}
                playBackgroundImageUrl={playBackgroundImageUrl}
                resultTemplateImageUrl={resultTemplateImageUrl}
                gridX={gridX}
                gridY={gridY}
                cameraX={cameraX}
                cameraY={cameraY}
                zoom={zoom}
                worldOffset={worldOffset}
                surfaceSize={surfaceSize}
                selectionLabels={selectionLabels}
                pulsingCellKeys={selectionGuideState.pulsingSelectionCellKeys}
              />

              <div className="pointer-events-none absolute inset-0 z-10">
                <div
                  className="pointer-events-auto absolute left-3 top-3 flex flex-col gap-2"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => stepCanvasZoom(true)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--page-theme-border-primary)] bg-[color:rgba(255,255,255,0.94)] text-[color:var(--page-theme-text-primary)] shadow-sm backdrop-blur"
                    aria-label={locale === "ko" ? "확대" : "Zoom in"}
                  >
                    <PlusGlyph />
                  </button>
                  <button
                    type="button"
                    onClick={() => stepCanvasZoom(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--page-theme-border-primary)] bg-[color:rgba(255,255,255,0.94)] text-[color:var(--page-theme-text-primary)] shadow-sm backdrop-blur"
                    aria-label={locale === "ko" ? "축소" : "Zoom out"}
                  >
                    <MinusGlyph />
                  </button>
                  <button
                    type="button"
                    onClick={resetCanvasZoom}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--page-theme-border-primary)] bg-[color:rgba(255,255,255,0.94)] text-[color:var(--page-theme-text-primary)] shadow-sm backdrop-blur"
                    aria-label={t("canvas.resetZoom")}
                  >
                    ↺
                  </button>
                </div>

                <div
                  className="pointer-events-auto absolute bottom-3 right-3"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  data-tutorial-id="tutorial-mobile-palette-button"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (isPaletteSheetOpen && !mobilePalettePinned) {
                        setMobileSheet(null);
                        return;
                      }

                      openMobilePaletteSheet();
                    }}
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm backdrop-blur ${
                      isPaletteSheetOpen
                        ? "border-[color:var(--page-theme-primary-action)]"
                        : "border-[color:var(--page-theme-border-primary)]"
                    }`}
                    style={{
                      backgroundColor: mobilePaletteColor,
                      color: mobilePaletteButtonTextColor,
                    }}
                    aria-label={
                      locale === "ko" ? "팔레트 열기" : "Open palette"
                    }
                  >
                    <PaletteGlyph />
                  </button>
                </div>

                {mobileVoteError ? (
                  <div className="absolute left-1/2 top-3 w-[min(88vw,340px)] -translate-x-1/2 rounded-2xl border border-[color:var(--page-theme-alert)] bg-[color:var(--page-theme-alert-soft)] px-4 py-2 text-center text-sm font-medium text-[color:var(--page-theme-alert)] shadow-sm">
                    {mobileVoteError}
                  </div>
                ) : null}

                <div
                  className="pointer-events-auto absolute bottom-3 left-3 flex rounded-full border border-[color:var(--page-theme-border-primary)] bg-[color:rgba(255,255,255,0.94)] p-1 shadow-sm backdrop-blur"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  data-tutorial-id="tutorial-mobile-vote-controls"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMobileVoteMode("select");
                      setMobileVoteError("");
                    }}
                    className={`rounded-full px-3 py-2 text-xs font-semibold ${
                      mobileVoteMode === "select"
                        ? "bg-[color:var(--page-theme-primary-action)] text-[color:var(--page-theme-primary-action-text)]"
                        : "text-[color:var(--page-theme-text-secondary)]"
                    }`}
                  >
                    {locale === "ko" ? "색상 선택 투표" : "Select color vote"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileVoteMode("instant");
                      setMobileVoteError("");
                      openMobilePaletteSheet();
                    }}
                    className={`rounded-full px-3 py-2 text-xs font-semibold ${
                      mobileVoteMode === "instant"
                        ? "bg-[color:var(--page-theme-primary-action)] text-[color:var(--page-theme-primary-action-text)]"
                        : "text-[color:var(--page-theme-text-secondary)]"
                    }`}
                  >
                    {locale === "ko" ? "바로 투표" : "Instant vote"}
                  </button>
                </div>
              </div>

              {shouldShowTutorialVotePopup ? (
                <VotePopup
                  canvasId={canvasId ?? 0}
                  roundId={roundId ?? 1}
                  phase={GAME_PHASE.ROUND_ACTIVE}
                  isRoundExpired={false}
                  remaining={remaining ?? 3}
                  selectedCell={tutorialVoteSelectedCell}
                  votes={tutorialVotePopupVotes}
                  position={tutorialVotePopupPosition}
                  onVoteSuccess={() => {}}
                  onColorChange={() => {}}
                  onClose={() => {}}
                  tutorialMode={true}
                  tutorialId="tutorial-vote-modal"
                  fixedPosition={tutorialVotePopupPosition}
                  layerClassName="z-[81]"
                />
              ) : null}
            </>
          </CanvasStage>
        </div>

        {introGuideOpen && gameConfig && (
          <IntroGuideModal
            open={true}
            playBackgroundImageUrl={playBackgroundImageUrl}
            resultTemplateImageUrl={resultTemplateImageUrl}
            gridX={gridX}
            gridY={gridY}
            previewMaxSize={256}
            mobileLayout={true}
            gameConfig={gameConfig}
            formattedGameEndTime={formattedGameEndTime}
            onClose={handleCloseIntroGuide}
          />
        )}

        <MobileBottomSheet
          open={activeMobileSheet === "menu"}
          title={
            <div className="flex h-9 items-center">
              <h2 className="text-xl font-semibold text-black">
                {mobileMenuLabels.title}
              </h2>
            </div>
          }
          onClose={() => setMobileSheet(null)}
          maxHeightClassName="max-h-[78vh]"
          tutorialId="tutorial-settings-panel"
        >
          <div className="space-y-3 pb-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleOpenMobileBack}
                className="rounded-2xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] px-4 py-3 text-sm font-semibold text-[color:var(--page-theme-text-primary)]"
              >
                {mobileMenuLabels.back}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileSheet(null);
                  handleOpenTutorial();
                }}
                className="rounded-2xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] px-4 py-3 text-sm font-semibold text-[color:var(--page-theme-text-primary)]"
              >
                {mobileMenuLabels.intro}
              </button>
            </div>

            <div className="rounded-2xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[color:var(--page-theme-text-secondary)]">
                  {mobileMenuLabels.language}
                </span>
                <DropdownSelect
                  value={locale}
                  onChange={setLocale}
                  options={[
                    { value: "ko", label: "KO" },
                    { value: "en", label: "EN" },
                  ]}
                  variant="play"
                  triggerClassName="rounded-xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] px-3 py-2 text-sm text-[color:var(--page-theme-text-primary)]"
                  menuClassName="rounded-xl"
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[color:var(--page-theme-text-secondary)]">
                  {mobileMenuLabels.background}
                </span>
                <DropdownSelect
                  value={backgroundMode}
                  onChange={setBackgroundMode}
                  options={[
                    { value: "w", label: mobileMenuLabels.white },
                    { value: "g", label: mobileMenuLabels.gray },
                    { value: "b", label: mobileMenuLabels.black },
                  ]}
                  variant="play"
                  triggerClassName="rounded-xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] px-3 py-2 text-sm text-[color:var(--page-theme-text-primary)]"
                  menuClassName="rounded-xl"
                />
              </div>
            </div>

            {sessionSourceApi.key === "room" && currentRoomManage ? (
              <div className="rounded-2xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] p-4">
                <h3 className="text-sm font-semibold text-[color:var(--page-theme-text-primary)]">
                  {mobileMenuLabels.room}
                </h3>
                <div className="mt-2 rounded-xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] px-3 py-2 text-xs font-semibold tracking-[0.08em] text-[color:var(--page-theme-text-primary)]">
                  {currentRoomManage.accessCode ?? "-"}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={
                      roomEndGameLoading ||
                      roomEndGameRequested ||
                      roomGameEndControlsDisabled
                    }
                    onClick={handleEndGame}
                    className="rounded-xl bg-[#272E37] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {roomEndGameLoading
                      ? locale === "ko"
                        ? "종료 중..."
                        : "Ending..."
                      : locale === "ko"
                        ? "게임 종료"
                        : "End game"}
                  </button>
                  <button
                    type="button"
                    disabled={roomTerminateLoading}
                    onClick={handleTerminateRoom}
                    className="rounded-xl bg-[#d14d28] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {roomTerminateLoading
                      ? locale === "ko"
                        ? "종료 중..."
                        : "Ending..."
                      : locale === "ko"
                        ? "방 강제 종료"
                        : "End room"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </MobileBottomSheet>

        <MobileBottomSheet
          open={activeMobileSheet === "participants"}
          title={
            <div className="flex h-9 items-center">
              <h2 className="text-xl font-semibold text-black">
                {locale === "ko" ? "참여자 현황" : "Participants"}
              </h2>
            </div>
          }
          onClose={() => setMobileSheet(null)}
          tutorialId="tutorial-participants"
        >
          {participantLoading ? (
            <div className="py-8 text-sm text-[color:var(--page-theme-text-tertiary)]">
              {t("session.loadingParticipants")}
            </div>
          ) : participantError ? (
            <div className="py-8 text-sm text-[color:var(--page-theme-alert)]">
              {participantError}
            </div>
          ) : participants.length === 0 ? (
            <div className="py-8 text-sm text-[color:var(--page-theme-text-tertiary)]">
              {t("session.noParticipants")}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)]">
              <ul className="divide-y divide-[color:var(--page-theme-border-secondary)]">
                {participants.map((participant) => (
                  <li
                    key={participant.sessionId}
                    className="px-4 py-3 text-sm text-[color:var(--page-theme-text-primary)]"
                  >
                    {participant.nickname}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </MobileBottomSheet>

        <MobileBottomSheet
          open={activeMobileSheet === "history"}
          title={
            <div>
              <h2 className="text-lg font-semibold text-black">
                {locale === "ko" ? "라운드 결과 정보" : "Round results"}
              </h2>
              <p className="text-sm text-[color:var(--page-theme-text-secondary)]">
                {locale === "ko"
                  ? "최근 라운드 결과를 확인할 수 있습니다."
                  : "Open recent round results."}
              </p>
            </div>
          }
          onClose={() => setMobileSheet(null)}
          tutorialId="tutorial-history-panel"
        >
          <div className="space-y-2 pb-4">
            <button
              type="button"
              onClick={() => {
                setMobileSheet(null);
                handleOpenIntroGuide();
              }}
              className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[color:var(--page-theme-primary-action)] px-4 text-sm font-semibold text-[color:var(--page-theme-primary-action-text)]"
            >
              {t("history.introButton")}
            </button>

            {historyLoading ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] px-4 py-5 text-center text-sm text-[color:var(--page-theme-text-tertiary)]">
                {t("history.loadingShort")}
              </div>
            ) : historyError ? (
              <div className="rounded-2xl border border-[color:var(--page-theme-alert)] bg-[color:var(--page-theme-alert-soft)] px-4 py-5 text-center text-sm text-[color:var(--page-theme-alert)]">
                {t("history.errorShort")}
              </div>
            ) : historyItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] px-4 py-5 text-center text-sm text-[color:var(--page-theme-text-tertiary)]">
                {t("history.emptyShort")}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {historyItems.map((item: GameHistoryItem) =>
                  item.type === "game" ? (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setMobileSheet(null);
                        handleOpenGameSummaryModal(item.data);
                      }}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-[color:var(--page-theme-accent-warm)] bg-[color:var(--page-theme-accent-warm-soft)] px-3 text-sm font-bold text-[color:var(--page-theme-accent-warm)]"
                    >
                      {t("history.resultButton")}
                    </button>
                  ) : (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setMobileSheet(null);
                        handleOpenRoundSummaryModal(item.data);
                      }}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] px-3 text-sm font-bold text-[color:var(--page-theme-text-primary)]"
                    >
                      {item.roundNumber}R
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        </MobileBottomSheet>

        <MobileBottomSheet
          open={activeMobileSheet === "palette"}
          title={
            <div className="flex w-full flex-col items-start justify-start gap-1 text-left">
              <h2 className="text-lg font-semibold text-black">
                {locale === "ko" ? "팔레트" : "Palette"}
              </h2>
              <div className="flex h-8 shrink-0 items-center justify-start gap-3 text-left text-base font-semibold leading-none text-black">
                <button
                  type="button"
                  className="h-8 w-8 shrink-0 rounded border border-[color:var(--page-theme-border-secondary)] p-0"
                  style={
                    selectedCell?.color
                      ? { backgroundColor: selectedCell.color }
                      : {
                          backgroundColor: "#f9fafb",
                          backgroundImage: CHECKER_PATTERN,
                          backgroundPosition: "0 0, 4px 4px",
                          backgroundSize: "8px 8px",
                        }
                  }
                  onClick={() => {
                    if (selectedCell?.color) {
                      handleMobilePaletteColorChange(selectedCell.color);
                    }
                  }}
                />
                <span className="inline-flex h-8 translate-y-px items-center leading-none">
                  {selectedCellLabel}
                </span>
              </div>
            </div>
          }
          headerActions={
            <>
              <button
                type="button"
                onClick={() => setMobilePalettePinned((prev) => !prev)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${
                  mobilePalettePinned
                    ? "border-[color:var(--page-theme-primary-action)] bg-[color:var(--page-theme-primary-action)] text-[color:var(--page-theme-primary-action-text)]"
                    : "border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] text-[color:var(--page-theme-text-secondary)]"
                }`}
                aria-label={locale === "ko" ? "팔레트 고정" : "Pin palette"}
              >
                <img
                  src={pinIcon}
                  alt=""
                  aria-hidden="true"
                  className="h-8 w-8 object-contain"
                  draggable={false}
                />
              </button>
            </>
          }
          onClose={() => setMobileSheet(null)}
          maxHeightClassName="max-h-[52vh]"
          showBackdrop={!mobilePalettePinned}
          headerActionsOffsetClassName="translate-y-4"
          tutorialId="tutorial-vote-modal"
        >
          <div className="pb-1">
            {mobileVoteError ? (
              <div className="mb-3 rounded-2xl border border-[color:var(--page-theme-alert)] bg-[color:var(--page-theme-alert-soft)] px-4 py-2 text-sm text-[color:var(--page-theme-alert)]">
                {mobileVoteError}
              </div>
            ) : null}

            <ColorPalette
              layout="mobile-compact"
              selected={mobilePaletteColor}
              onChange={handleMobilePaletteColorChange}
              slotColors={mobileSlotColors}
              slotCursor={mobileSlotCursor}
              onSlotAdd={handleMobileSlotAdd}
              onSlotReset={handleMobileSlotReset}
              onSlotSelect={handleMobileSlotSelect}
              voteEntries={mobileVoteEntries}
            />

            <button
              type="button"
              onClick={() => void handleSubmitMobileVote()}
              disabled={!canSubmitMobileVote}
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-[20px] bg-[color:var(--page-theme-primary-action)] px-4 text-sm font-semibold text-[color:var(--page-theme-primary-action-text)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {mobileVoteLoading
                ? t("vote.popup.loading")
                : t("vote.popup.submit")}
            </button>
          </div>
        </MobileBottomSheet>

        {!introGuideOpen && (
          <RoundSummaryModal
            open={roundSummaryOpen}
            summary={roundSummaryModal}
            snapshot={latestRoundSnapshot}
            playBackgroundImageUrl={playBackgroundImageUrl}
            snapshotMaxLongestSide={256}
            centerOnScreen={true}
            position={roundSummaryPosition}
            onClose={handleCloseRoundSummaryModal}
            onDragStart={handleRoundSummaryDragStart}
          />
        )}

        {!introGuideOpen && !roundSummaryOpen && gameSummaryModal && (
          <GameSummaryModal
            summary={gameSummaryModal}
            snapshotUrl={latestRoundSnapshot}
            playBackgroundImageUrl={playBackgroundImageUrl}
            snapshotMaxLongestSide={256}
            mobileLayout={true}
            position={roundSummaryPosition}
            onDragStart={handleRoundSummaryDragStart}
            onClose={handleCloseGameSummaryModal}
          />
        )}

        <TutorialOverlay
          open={tutorialOpen}
          steps={tutorialSteps}
          currentStepIndex={tutorialStepIndex}
          onStepChange={setTutorialStepIndex}
          onClose={handleCloseTutorial}
          previousLabel={t("tutorial.control.previous")}
          nextLabel={t("tutorial.control.next")}
          finishLabel={t("tutorial.control.finish")}
          closeLabel={t("tutorial.control.close")}
          panelPosition="upper"
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-screen w-full overflow-hidden bg-[color:var(--page-theme-page-background)] text-[color:var(--page-theme-text-primary)]"
      style={canvasPageThemeStyle}
    >
      <GameHistoryPanel
        onOpenIntroGuide={handleOpenIntroGuide}
        historyItems={historyItems}
        historyLoading={historyLoading}
        historyError={historyError}
        onOpenRoundSummary={handleOpenRoundSummaryModal}
        onOpenGameSummary={handleOpenGameSummaryModal}
      />

      <CanvasStage
        containerRef={containerRef}
        tutorialId="tutorial-canvas-stage"
        overlay={
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] text-[color:var(--page-theme-primary-action)] shadow-sm hover:bg-[color:var(--page-theme-surface-secondary)]"
            aria-label={t("canvas.resetZoom")}
            title={t("canvas.resetZoom")}
            onMouseDown={(event) => event.stopPropagation()}
            onMouseUp={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              resetCanvasZoom();
            }}
          >
            ↺
          </button>
        }
        topCenterOverlay={
          selectionGuideState.roundSelectionGuideVisible ? (
            <div className="rounded-[1.5rem] border border-[rgba(0,0,0,0.18)] bg-[#FACC15] px-9 py-[18px] text-[1.6875rem] font-semibold leading-none text-black shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
              {t("canvas.roundStartedGuide", { round: roundNumber ?? "" })}
            </div>
          ) : null
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        isDragging={isDraggingCanvas}
        onWheel={handleWheel}
      >
        <>
          <CanvasSurface
            paintCanvasRef={paintCanvasRef}
            canvasRef={canvasRef}
            playBackgroundImageUrl={playBackgroundImageUrl}
            resultTemplateImageUrl={resultTemplateImageUrl}
            gridX={gridX}
            gridY={gridY}
            cameraX={cameraX}
            cameraY={cameraY}
            zoom={zoom}
            worldOffset={worldOffset}
            surfaceSize={surfaceSize}
            selectionLabels={selectionLabels}
            pulsingCellKeys={selectionGuideState.pulsingSelectionCellKeys}
          />

          {shouldShowTutorialVotePopup ? (
            <VotePopup
              canvasId={canvasId ?? 0}
              roundId={roundId ?? 1}
              phase={GAME_PHASE.ROUND_ACTIVE}
              isRoundExpired={false}
              remaining={remaining ?? 3}
              selectedCell={tutorialVoteSelectedCell}
              votes={tutorialVotePopupVotes}
              position={tutorialVotePopupPosition}
              onVoteSuccess={() => {}}
              onColorChange={() => {}}
              onClose={() => {}}
              tutorialMode={true}
              tutorialId="tutorial-vote-modal"
              fixedPosition={tutorialVotePopupPosition}
              layerClassName="z-[81]"
            />
          ) : null}
        </>
      </CanvasStage>

      <div
        className="shrink-0 border-l border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-panel-background)]"
        style={{ width: `${PANEL_WIDTH}px` }}
      >
        {canvasId && (
          <VotePanel
            phase={phase}
            roundNumber={roundNumber}
            totalRounds={totalRounds}
            formattedGameEndTime={formattedGameEndTime}
            formattedRemainingTime={formattedRemainingTime}
            remainingSeconds={remainingSeconds}
            roundDurationSec={roundDurationSec}
            votingParticipantCount={votingParticipantCount}
            votes={votes}
            remaining={remaining}
            cells={cells}
            latestRoundSnapshot={latestRoundSnapshot}
            playBackgroundImageUrl={playBackgroundImageUrl}
            resultTemplateImageUrl={resultTemplateImageUrl}
            backgroundMode={backgroundMode}
            onBackgroundModeChange={setBackgroundMode}
            participants={participants}
            participantLoading={participantLoading}
            participantError={participantError}
            gridX={gridX}
            gridY={gridY}
            selectedCell={displaySelectedCell}
            viewport={viewport}
            forceSettingsOpen={tutorialNeedsSettingsPanel}
            forceParticipantPanelOpen={tutorialNeedsParticipantPanel}
            settingsDisabled={shouldDisableSettingsButton}
            onOpenTutorial={handleOpenTutorial}
            onNavigateToCoordinate={navigateToCoordinate}
            currentRoomManage={
              sessionSourceApi.key === "room" ? currentRoomManage : null
            }
            roomEndGameLoading={roomEndGameLoading}
            roomEndGameDisabled={
              roomEndGameRequested || roomGameEndControlsDisabled
            }
            onEndGame={handleEndGame}
            roomTerminateLoading={roomTerminateLoading}
            roomTerminateDisabled={false}
            onTerminateRoom={handleTerminateRoom}
            voteMode={desktopVoteMode}
            onVoteModeChange={(nextMode) => {
              setDesktopVoteMode(nextMode);
            }}
            onOpenInstantVotePalette={openDesktopInstantVotePalette}
          />
        )}
      </div>

      {introGuideOpen && gameConfig && (
        <IntroGuideModal
          open={true}
          playBackgroundImageUrl={playBackgroundImageUrl}
          resultTemplateImageUrl={resultTemplateImageUrl}
          gridX={gridX}
          gridY={gridY}
          previewMaxSize={512}
          gameConfig={gameConfig}
          formattedGameEndTime={formattedGameEndTime}
          onClose={handleCloseIntroGuide}
        />
      )}

      {popupOpen && selectedCell && canvasId && (
        <VotePopup
          canvasId={canvasId}
          roundId={roundId}
          phase={phase}
          isRoundExpired={isRoundExpired}
          remaining={remaining}
          selectedCell={selectedCell}
          votes={votes}
          position={popupPos}
          onVoteSuccess={handleVoteSuccess}
          onColorChange={(nextColor) => {
            handleColorChange(nextColor);

            if (nextColor) {
              setDesktopPaletteColor(nextColor);
            }
          }}
          onClose={handleCloseVotePopup}
          tutorialMode={shouldDecorateLiveVotePopup}
          tutorialId={
            shouldDecorateLiveVotePopup ? "tutorial-vote-modal" : undefined
          }
          hideSubmitButton={!isMobileLayout && desktopVoteMode === "instant"}
          layerClassName={shouldDecorateLiveVotePopup ? "z-[81]" : undefined}
        />
      )}

      {!introGuideOpen && (
        <RoundSummaryModal
          open={roundSummaryOpen}
          summary={roundSummaryModal}
          snapshot={latestRoundSnapshot}
          playBackgroundImageUrl={playBackgroundImageUrl}
          snapshotMaxLongestSide={512}
          position={roundSummaryPosition}
          onClose={handleCloseRoundSummaryModal}
          onDragStart={handleRoundSummaryDragStart}
        />
      )}

      {!introGuideOpen && !roundSummaryOpen && gameSummaryModal && (
        <GameSummaryModal
          summary={gameSummaryModal}
          snapshotUrl={latestRoundSnapshot}
          playBackgroundImageUrl={playBackgroundImageUrl}
          snapshotMaxLongestSide={512}
          position={roundSummaryPosition}
          onDragStart={handleRoundSummaryDragStart}
          onClose={handleCloseGameSummaryModal}
        />
      )}

      <TutorialOverlay
        open={tutorialOpen}
        steps={tutorialSteps}
        currentStepIndex={tutorialStepIndex}
        onStepChange={setTutorialStepIndex}
        onClose={handleCloseTutorial}
        previousLabel={t("tutorial.control.previous")}
        nextLabel={t("tutorial.control.next")}
        finishLabel={t("tutorial.control.finish")}
        closeLabel={t("tutorial.control.close")}
      />
    </div>
  );
}
