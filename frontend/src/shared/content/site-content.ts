import type { Locale } from "@/shared/i18n/resources";

interface TutorialCardContent {
  id: string;
  label: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
}

interface InfoSectionContent {
  heading: string;
  paragraphs: string[];
}

interface InfoPageContent {
  title: string;
  lead: string;
  sections: InfoSectionContent[];
}

interface SiteContent {
  nav: {
    patchNotes: string;
    roadmap: string;
    home: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    cta: string;
  };
  currentGame: {
    title: string;
    emptyTitle: string;
    emptyDescription: string;
    snapshotLabel: string;
    stats: {
      grid: string;
      round: string;
      participants: string;
    };
  };
  featured: {
    title: string;
    description: string;
    emptyTitle: string;
    emptyDescription: string;
    stats: {
      participants: string;
      votes: string;
      completion: string;
      topVoter: string;
      participantList: string;
      endedAt: string;
    };
  };
  updates: {
    title: string;
    description: string;
    loading: string;
    loadError: string;
  };
  tutorial: {
    title: string;
    description: string;
    cards: TutorialCardContent[];
  };
  footer: {
    description: string;
    links: {
      terms: string;
      privacy: string;
      community: string;
      contact: string;
    };
  };
  infoPages: {
    terms: InfoPageContent;
    privacy: InfoPageContent;
    community: InfoPageContent;
    contact: InfoPageContent;
  };
}

const SITE_CONTENT: Record<Locale, SiteContent> = {
  ko: {
    nav: {
      patchNotes: "패치노트",
      roadmap: "로드맵",
      home: "홈",
    },
    hero: {
      eyebrow: "같이 칠하는 실시간 픽셀 캔버스",
      title: "VoteDots는 한 라운드씩 모여 완성되는 투표형 캔버스 게임입니다.",
      description:
        "매 라운드마다 표를 모아 한 칸씩 색이 확정됩니다. 지금 진행 중인 게임과 최근 인기 게임을 먼저 보고, 준비되면 바로 참여하세요.",
      cta: "참여하기",
    },
    currentGame: {
      title: "현재 진행 중인 게임",
      emptyTitle: "현재 진행 중인 게임이 없습니다",
      emptyDescription:
        "다음 게임이 준비되면 이 영역에 최신 라운드 스냅샷과 진행 정보가 표시됩니다.",
      snapshotLabel: "마지막 완료 라운드 스냅샷",
      stats: {
        grid: "그리드",
        round: "라운드",
        participants: "현재 참여자 수",
      },
    },
    featured: {
      title: "그리드 크기별 대표 종료 게임",
      description:
        "현재 로테이션에 포함된 32, 64, 128, 256 보드에서 가장 많은 참여자를 모은 게임을 모아 봅니다.",
      emptyTitle: "아직 종료된 게임이 없습니다",
      emptyDescription:
        "이 그리드 크기의 첫 결과가 나오면 여기에서 최종 스냅샷과 통계를 확인할 수 있습니다.",
      stats: {
        participants: "참여자",
        votes: "총 투표 수",
        completion: "완성도",
        topVoter: "최다 투표자",
        participantList: "참여자 목록",
        endedAt: "종료 시각",
      },
    },
    updates: {
      title: "패치노트와 로드맵",
      description:
        "현재 서비스의 변경 사항과 앞으로의 계획을 같은 자리에서 바로 확인할 수 있습니다.",
      loading: "업데이트 보드를 불러오는 중입니다...",
      loadError: "업데이트 보드를 불러오지 못했습니다.",
    },
    tutorial: {
      title: "게임을 이해하는 가장 빠른 흐름",
      description:
        "처음 들어오는 사용자가 규칙과 리듬을 빠르게 파악할 수 있도록, 실제 플레이 흐름 기준으로 핵심만 정리했습니다.",
      cards: [
        {
          id: "intro",
          label: "Step 1",
          title: "게임은 한 장의 템플릿에서 시작합니다",
          description:
            "각 게임은 미리 정해진 그리드 크기와 템플릿을 가지고 시작합니다. 첫 라운드 결과가 나오기 전에는 기본 템플릿이 기준 화면이 됩니다.",
          imageUrl: "/result-templates/32x32/cat-face-32x32.png",
          imageAlt: "32x32 template preview",
        },
        {
          id: "vote",
          label: "Step 2",
          title: "라운드마다 칸과 색을 선택해 표를 씁니다",
          description:
            "참여자는 매 라운드마다 원하는 칸과 색에 표를 분배할 수 있습니다. 한 칸에 몰아주거나 여러 칸에 나눠 쓰는 것도 가능합니다.",
          imageUrl: "/play-backgrounds/64x64/grid-g-64x64.png",
          imageAlt: "Grid background preview",
        },
        {
          id: "result",
          label: "Step 3",
          title: "가장 많은 표를 받은 결과가 캔버스에 반영됩니다",
          description:
            "라운드가 끝나면 셀마다 가장 많은 표를 받은 색이 반영되고, 그 시점의 스냅샷이 누적됩니다. 이 기록이 게임 히스토리가 됩니다.",
          imageUrl: "/result-templates/256x256/cat-front-256x256.png",
          imageAlt: "Result template preview",
        },
        {
          id: "rotation",
          label: "Step 4",
          title: "게임은 로테이션되는 그리드 크기로 이어집니다",
          description:
            "VoteDots는 32, 64, 128, 256 크기를 중심으로 로테이션됩니다. 같은 규칙이더라도 보드 크기에 따라 전략과 체감 속도가 달라집니다.",
          imageUrl: "/play-backgrounds/128x128/grid-b-128x128.png",
          imageAlt: "128x128 grid preview",
        },
        {
          id: "summary",
          label: "Step 5",
          title: "종료 후에는 최종 스냅샷과 통계를 함께 봅니다",
          description:
            "게임이 끝나면 최종 이미지뿐 아니라 참여자 수, 최다 투표자, 전체 투표량 같은 요약 정보로 결과를 다시 해석할 수 있습니다.",
          imageUrl: "/result-templates/512x512/smile-512x512.png",
          imageAlt: "Summary preview",
        },
      ],
    },
    footer: {
      description:
        "VoteDots의 운영 기준, 개인정보 처리 기준, 커뮤니티 안내, 문의 정책을 한 곳에서 확인하세요.",
      links: {
        terms: "이용약관",
        privacy: "개인정보처리방침",
        community: "커뮤니티",
        contact: "문의",
      },
    },
    infoPages: {
      terms: {
        title: "이용약관",
        lead:
          "이 약관은 VoteDots 서비스의 이용 조건, 계정 운영 기준, 금지 행위, 서비스 변경 가능성에 대한 기본 원칙을 설명합니다.",
        sections: [
          {
            heading: "서비스 이용",
            paragraphs: [
              "VoteDots는 다수의 사용자가 같은 캔버스를 함께 완성하는 실시간 투표형 게임 서비스입니다.",
              "서비스 기능, 게임 규칙, 라운드 운영 방식은 서비스 개선과 안정화를 위해 변경될 수 있습니다.",
            ],
          },
          {
            heading: "계정과 접근",
            paragraphs: [
              "일부 기능은 회원가입과 로그인이 필요합니다. 사용자는 자신의 계정 정보를 안전하게 관리해야 하며, 계정 보안 문제로 발생한 손해에 대해 서비스가 항상 책임을 지는 것은 아닙니다.",
              "운영상 필요한 경우 중복 세션 정리, 계정 접근 제한, 인증 세션 종료가 발생할 수 있습니다.",
            ],
          },
          {
            heading: "금지 행위",
            paragraphs: [
              "서비스의 정상 동작을 방해하는 자동화, 비정상적인 요청, 타인의 계정 사용, 운영 방해, 악성 코드 배포는 허용되지 않습니다.",
              "다른 이용자에게 피해를 주거나 운영 정책에 반하는 행위가 확인되면 서비스 이용이 제한될 수 있습니다.",
            ],
          },
          {
            heading: "콘텐츠와 책임",
            paragraphs: [
              "게임 결과 스냅샷, 통계, 닉네임 등 서비스 내에서 생성된 일부 정보는 서비스 소개와 운영 기록 목적으로 노출될 수 있습니다.",
              "VoteDots는 서비스의 연속성, 특정 목적 적합성, 무중단 운영을 보장하지 않으며, 예기치 않은 장애나 데이터 손실 가능성을 완전히 배제하지 않습니다.",
            ],
          },
        ],
      },
      privacy: {
        title: "개인정보처리방침",
        lead:
          "VoteDots는 서비스 운영에 필요한 최소한의 계정 정보와 세션 정보를 처리합니다. 이 문서는 어떤 정보를 왜 처리하는지 설명합니다.",
        sections: [
          {
            heading: "수집하는 정보",
            paragraphs: [
              "회원가입 과정에서 사용자명, 닉네임, 비밀번호가 처리됩니다. 비밀번호는 원문 그대로 저장하지 않고 인증을 위한 보호 처리 후 저장합니다.",
              "로그인 상태 유지를 위해 세션 식별자와 세션 쿠키가 사용됩니다. 서비스 이용 과정에서 게임 참여 기록, 투표 결과, 닉네임 기반 통계가 생성될 수 있습니다.",
            ],
          },
          {
            heading: "이용 목적",
            paragraphs: [
              "계정 식별, 로그인 유지, 게임 참여 관리, 결과 집계, 부정 이용 방지, 운영상 장애 대응을 위해 정보를 처리합니다.",
              "공개 랜딩 페이지에는 게임 스냅샷, 참여자 수, 닉네임 기반 요약 통계 같은 운영 정보를 표시할 수 있습니다.",
            ],
          },
          {
            heading: "세션과 쿠키",
            paragraphs: [
              "로그인 유지와 보안 처리를 위해 세션 쿠키가 사용됩니다.",
              "향후 공개 페이지에 광고 기능이 활성화되는 경우 Google AdSense 같은 제3자 서비스가 쿠키를 사용할 수 있으며, 이 경우 관련 고지와 정책 반영 범위를 계속 업데이트합니다.",
            ],
          },
          {
            heading: "보관과 보호",
            paragraphs: [
              "서비스 운영에 필요한 기간 동안 정보가 보관될 수 있으며, 관련 법령 또는 운영상 필요가 사라지면 삭제 또는 비식별화를 검토합니다.",
              "세션 보안, 접근 제어, 저장소 보호를 위한 기술적 조치를 적용하지만 모든 위험을 완전히 제거할 수는 없습니다.",
            ],
          },
        ],
      },
      community: {
        title: "커뮤니티 안내",
        lead:
          "VoteDots의 공식 커뮤니티 운영 원칙과 공지 확인 경로를 정리한 안내 페이지입니다.",
        sections: [
          {
            heading: "공식 안내 기준",
            paragraphs: [
              "서비스 공지, 패치 내용, 로드맵 변화는 랜딩 페이지의 패치노트와 로드맵 영역을 우선 기준으로 안내합니다.",
              "새로운 공식 커뮤니티 채널이 열리면 이 페이지에 우선 반영합니다.",
            ],
          },
          {
            heading: "커뮤니티 운영 원칙",
            paragraphs: [
              "다른 사용자에 대한 괴롭힘, 혐오 표현, 스팸, 서비스 악용 공유는 허용되지 않습니다.",
              "커뮤니티는 게임 피드백과 운영 공지를 위한 공간으로 사용되며, 운영 정책에 따라 글이나 계정 접근이 제한될 수 있습니다.",
            ],
          },
          {
            heading: "현재 상태",
            paragraphs: [
              "공식 커뮤니티 채널은 단계적으로 정리 중입니다. 운영 채널이 확정되면 이 페이지와 푸터 링크를 통해 고정적으로 안내합니다.",
            ],
          },
        ],
      },
      contact: {
        title: "문의 안내",
        lead:
          "VoteDots 서비스 관련 문의 범위와 운영상 응답 원칙을 정리한 페이지입니다.",
        sections: [
          {
            heading: "문의 대상",
            paragraphs: [
              "계정 접근 문제, 서비스 장애, 정책 관련 요청, 공개 정보 정정 요청 같은 운영성 문의를 대상으로 합니다.",
            ],
          },
          {
            heading: "응답 원칙",
            paragraphs: [
              "문의는 확인 가능한 사실 기준으로 처리하며, 보안이나 운영 안정성과 충돌하는 경우 모든 요청에 즉시 응답하거나 그대로 수용하지 않을 수 있습니다.",
              "서비스 구조나 일정상 바로 해결할 수 없는 요청은 패치노트 또는 로드맵 반영 대상으로 분리될 수 있습니다.",
            ],
          },
          {
            heading: "현재 상태",
            paragraphs: [
              "공식 문의 채널은 정리 중입니다. 운영 채널이 확정되면 이 페이지에서 고정 안내하고, 관련 정책 문구도 함께 업데이트합니다.",
            ],
          },
        ],
      },
    },
  },
  en: {
    nav: {
      patchNotes: "Patch Notes",
      roadmap: "Roadmap",
      home: "Home",
    },
    hero: {
      eyebrow: "A real-time collaborative pixel canvas",
      title:
        "VoteDots is a round-based canvas game where each cell is decided by votes.",
      description:
        "Every round turns votes into visible progress on a shared canvas. Check the current game, browse standout finished boards, and jump in when you are ready.",
      cta: "Join the game",
    },
    currentGame: {
      title: "Current game",
      emptyTitle: "No game is running right now",
      emptyDescription:
        "Once the next game is ready, this panel will show the latest finished round snapshot and live progress details.",
      snapshotLabel: "Latest completed round snapshot",
      stats: {
        grid: "Grid",
        round: "Round",
        participants: "Current participants",
      },
    },
    featured: {
      title: "Featured finished games by grid size",
      description:
        "See the most crowded finished game from each rotating board size: 32, 64, 128, and 256.",
      emptyTitle: "No finished game yet",
      emptyDescription:
        "When the first finished result is available for this board size, the final snapshot and stats will appear here.",
      stats: {
        participants: "Participants",
        votes: "Total votes",
        completion: "Completion",
        topVoter: "Top voter",
        participantList: "Participant list",
        endedAt: "Ended at",
      },
    },
    updates: {
      title: "Patch notes and roadmap",
      description:
        "Follow what changed recently and what the team plans to build next without leaving the landing page.",
      loading: "Loading the update board...",
      loadError: "We could not load the update board.",
    },
    tutorial: {
      title: "The fastest way to understand the loop",
      description:
        "These cards summarize the game flow for first-time visitors, using the same rhythm players see inside the live canvas.",
      cards: [
        {
          id: "intro",
          label: "Step 1",
          title: "Each game starts from a fixed template",
          description:
            "Every session begins with a specific grid size and template image. Before the first round result is captured, the default template acts as the reference canvas.",
          imageUrl: "/result-templates/32x32/cat-face-32x32.png",
          imageAlt: "32x32 template preview",
        },
        {
          id: "vote",
          label: "Step 2",
          title: "Players spend votes on cells and colors",
          description:
            "During each round, players choose where to place their votes. You can focus all tickets on one cell or spread them across the board.",
          imageUrl: "/play-backgrounds/64x64/grid-g-64x64.png",
          imageAlt: "Grid background preview",
        },
        {
          id: "result",
          label: "Step 3",
          title: "The winning color becomes visible on the canvas",
          description:
            "When the round ends, the top-voted color for each contested cell is applied to the board, and a fresh snapshot is recorded for history.",
          imageUrl: "/result-templates/256x256/cat-front-256x256.png",
          imageAlt: "Result template preview",
        },
        {
          id: "rotation",
          label: "Step 4",
          title: "Board size rotation changes the pace",
          description:
            "VoteDots rotates through 32, 64, 128, and 256 boards. The same rules feel very different as the canvas gets larger and harder to complete.",
          imageUrl: "/play-backgrounds/128x128/grid-b-128x128.png",
          imageAlt: "128x128 grid preview",
        },
        {
          id: "summary",
          label: "Step 5",
          title: "Finished games come with snapshots and stats",
          description:
            "After a game ends, the final board is paired with activity stats such as participants, top voters, and overall vote volume.",
          imageUrl: "/result-templates/512x512/smile-512x512.png",
          imageAlt: "Summary preview",
        },
      ],
    },
    footer: {
      description:
        "Review the service rules, privacy handling, community notes, and contact policy in one place.",
      links: {
        terms: "Terms of Service",
        privacy: "Privacy Policy",
        community: "Community",
        contact: "Contact",
      },
    },
    infoPages: {
      terms: {
        title: "Terms of Service",
        lead:
          "These terms outline the basic rules for using VoteDots, including account access, prohibited behavior, and the service's ability to change over time.",
        sections: [
          {
            heading: "Using the service",
            paragraphs: [
              "VoteDots is a real-time collaborative game where multiple players complete a shared canvas through voting.",
              "Features, game rules, and round operations may change to improve the service or maintain stability.",
            ],
          },
          {
            heading: "Accounts and access",
            paragraphs: [
              "Some features require registration and sign-in. Users are responsible for keeping their credentials safe, and the service cannot guarantee recovery from every account security issue.",
              "For operational reasons, the service may clear duplicate sessions, restrict access, or end authentication sessions.",
            ],
          },
          {
            heading: "Prohibited behavior",
            paragraphs: [
              "Automation that disrupts the service, abnormal request patterns, use of someone else's account, operational interference, and malicious code distribution are not allowed.",
              "Access may be restricted if behavior harms other users or violates operational policy.",
            ],
          },
          {
            heading: "Content and liability",
            paragraphs: [
              "Snapshots, statistics, and nickname-based summaries generated in the game may be displayed for service history and public presentation purposes.",
              "VoteDots does not guarantee uninterrupted availability, fitness for a specific purpose, or complete protection from outages and data loss.",
            ],
          },
        ],
      },
      privacy: {
        title: "Privacy Policy",
        lead:
          "VoteDots processes a minimal set of account and session data required to operate the service. This page explains what is handled and why.",
        sections: [
          {
            heading: "Information we process",
            paragraphs: [
              "During registration, the service processes a username, nickname, and password. Passwords are not stored in raw form and are protected for authentication purposes.",
              "Session identifiers and session cookies are used to keep users signed in. Gameplay activity, vote results, and nickname-based statistics may be generated while the service is used.",
            ],
          },
          {
            heading: "Why we use it",
            paragraphs: [
              "We process data to identify accounts, maintain sign-in state, manage gameplay, calculate results, prevent abuse, and respond to operational issues.",
              "The public landing page may display snapshots, participant counts, and nickname-based summary statistics generated by the game.",
            ],
          },
          {
            heading: "Sessions and cookies",
            paragraphs: [
              "Session cookies are used for sign-in persistence and security handling.",
              "If public advertising features such as Google AdSense are enabled later, third-party cookies may also be used, and this policy will be updated to reflect that scope.",
            ],
          },
          {
            heading: "Retention and protection",
            paragraphs: [
              "Information may be kept for as long as it is needed to operate the service, comply with law, or maintain operational records, and may later be deleted or anonymized.",
              "Technical safeguards such as session security, access control, and protected storage are applied, but no system can remove all risk completely.",
            ],
          },
        ],
      },
      community: {
        title: "Community",
        lead:
          "This page explains the official community principles for VoteDots and where public notices should be checked first.",
        sections: [
          {
            heading: "Official notice source",
            paragraphs: [
              "Patch notes and roadmap updates on the landing page are treated as the primary public notice source for service changes.",
              "If additional official community channels are opened, they will be announced here first.",
            ],
          },
          {
            heading: "Community expectations",
            paragraphs: [
              "Harassment, hate speech, spam, and instructions for abusing the service are not allowed.",
              "Community spaces exist for feedback and announcements, and moderation actions may be taken when behavior conflicts with policy.",
            ],
          },
          {
            heading: "Current status",
            paragraphs: [
              "Official community channels are still being organized. When they are finalized, this page and the footer links will be updated.",
            ],
          },
        ],
      },
      contact: {
        title: "Contact",
        lead:
          "This page summarizes what kinds of operational questions can be handled and how response decisions are made.",
        sections: [
          {
            heading: "What this covers",
            paragraphs: [
              "This includes account access issues, service outages, policy-related questions, and requests to correct publicly displayed operational information.",
            ],
          },
          {
            heading: "Response policy",
            paragraphs: [
              "Requests are reviewed against verifiable facts. The team may decline or defer a request when it conflicts with security, operational stability, or development priorities.",
              "Issues that cannot be addressed immediately may be moved into future work and reflected later in patch notes or the roadmap.",
            ],
          },
          {
            heading: "Current status",
            paragraphs: [
              "The official contact channel is still being organized. Once it is finalized, this page will be updated with the stable point of contact and any related policy details.",
            ],
          },
        ],
      },
    },
  },
};

export type InfoPageKey = keyof SiteContent["infoPages"];

export function getSiteContent(locale: Locale): SiteContent {
  return SITE_CONTENT[locale];
}
