import canvasInteractionContent from "@/content/login-board/patches/v2.4.1-canvas-interaction.md?raw";
import loginBoardContent from "@/content/login-board/patches/v2.4.1-login-board.md?raw";
import historyResultContent from "@/content/login-board/patches/v2.4.0-history-result.md?raw";
import q32025BoardOpsContent from "@/content/login-board/roadmap/2025-q3-board-ops.md?raw";
import q42025CanvasFlowContent from "@/content/login-board/roadmap/2025-q4-canvas-flow.md?raw";
import q12026LiveSummaryContent from "@/content/login-board/roadmap/2026-q1-live-summary.md?raw";
import type {
  PatchChangeType,
  PatchVersionGroup,
  RoadmapQuarterGroup,
} from "./board.types";

export const patchVersionGroups: PatchVersionGroup[] = [
  {
    id: "patch-v2-4-1",
    version: "v2.4.1",
    releaseDate: "2026.04.23",
    badge: "Latest",
    defaultOpen: true,
    items: [
      {
        id: "patch-v2-4-1-canvas-interaction",
        title: "캔버스 상호작용 안정화",
        date: "2026.04.23",
        type: "bugfix",
        content: canvasInteractionContent,
      },
      {
        id: "patch-v2-4-1-login-board",
        title: "로그인 전 안내 게시판 구조 추가",
        date: "2026.04.23",
        type: "feature",
        content: loginBoardContent,
      },
    ],
  },
  {
    id: "patch-v2-4-0",
    version: "v2.4.0",
    releaseDate: "2026.04.22",
    badge: "Stable",
    defaultOpen: false,
    items: [
      {
        id: "patch-v2-4-0-history-result",
        title: "히스토리 결과 중복 및 스냅샷 표시 수정",
        date: "2026.04.22",
        type: "bugfix",
        content: historyResultContent,
      },
    ],
  },
];

export const roadmapQuarterGroups: RoadmapQuarterGroup[] = [
  {
    id: "roadmap-2025-q3",
    quarter: "2025 Q3",
    dueDate: "2025.09.30",
    defaultOpen: true,
    items: [
      {
        id: "roadmap-2025-q3-board-ops",
        title: "로그인 전 게시판 운영 흐름 정리",
        summary: "게시글 추가 절차와 목록 관리 구조를 더 단순하게 맞춥니다.",
        date: "목표 기한 ~ 2025.09.30",
        updatedAt: "2025-09-30",
        content: q32025BoardOpsContent,
      },
    ],
  },
  {
    id: "roadmap-2025-q4",
    quarter: "2025 Q4",
    dueDate: "2025.12.31",
    defaultOpen: false,
    items: [
      {
        id: "roadmap-2025-q4-canvas-flow",
        title: "캔버스 조작 흐름 재정리",
        summary: "줌, 팬, 미니맵 이동이 더 자연스럽게 이어지도록 흐름을 다시 다듬습니다.",
        date: "목표 기한 ~ 2025.12.31",
        updatedAt: "2025-12-31",
        content: q42025CanvasFlowContent,
      },
    ],
  },
  {
    id: "roadmap-2026-q1",
    quarter: "2026 Q1",
    dueDate: "2026.03.31",
    defaultOpen: false,
    items: [
      {
        id: "roadmap-2026-q1-live-summary",
        title: "게임 결과 통계와 라이브 히스토리 확장",
        summary: "종료 통계와 히스토리 재조회 경험을 더 자세한 정보 중심으로 확장합니다.",
        date: "목표 기한 ~ 2026.03.31",
        updatedAt: "2026-03-31",
        content: q12026LiveSummaryContent,
      },
    ],
  },
];

export function getPatchTypeLabel(type: PatchChangeType) {
  switch (type) {
    case "feature":
      return "신기능";
    case "bugfix":
      return "버그픽스";
    case "breaking":
      return "Breaking";
    default:
      return type;
  }
}

export function getPatchBadgeTone(
  type: PatchChangeType,
): "blue" | "green" | "red" {
  switch (type) {
    case "feature":
      return "blue";
    case "bugfix":
      return "green";
    case "breaking":
      return "red";
  }
}
