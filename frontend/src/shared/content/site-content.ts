import type { Locale } from "@/shared/i18n/resources";

interface TutorialCardContent {
  id: string;
  label: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  iconUrl?: string;
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
    title: string;
    description: string;
    cta: string;
  };
  currentGame: {
    title: string;
    emptyTitle: string;
    emptyDescription: string;
    snapshotLabel: string;
    loadError: string;
    fallbackPreviewAlt: string;
    stats: {
      grid: string;
      round: string;
      participants: string;
    };
  };
  featured: {
    title: string;
    description: string;
    stats: {
      participants: string;
      votes: string;
      topVoter: string;
      participantList: string;
    };
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
      title: "직접 그리고\n함께 투표하는 픽셀 캔버스",
      description:
        "색을 고르고, 투표를 하고, 함께 완성하세요.",
      cta: "참여하기",
    },
    currentGame: {
      title: "현재 진행 중인 게임",
      emptyTitle: "현재 진행 중인 게임이 없습니다.",
      emptyDescription:
        "다음 게임이 준비되면 이 영역에 최신 라운드 스냅샷과 진행 정보가 표시됩니다.",
      snapshotLabel: "마지막 완료 라운드 스냅샷",
      loadError: "랜딩 데이터를 불러오지 못했습니다.",
      fallbackPreviewAlt: "기본 템플릿 미리보기",
      stats: {
        grid: "그리드",
        round: "라운드",
        participants: "현재 참여자 수",
      },
    },
    featured: {
      title: "완성된 캔버스",
      description:
        "현재 로테이션에 포함된 보드 크기별로 참여자가 가장 많았던 게임을 보여줍니다.",
      stats: {
        participants: "참여자",
        votes: "총 투표 수",
        topVoter: "최다 투표자",
        participantList: "참여자 목록",
      },
    },
    tutorial: {
      title: "게임 소개",
      description:
        "",
      cards: [
        {
          id: "place-dot",
          label: "Step 1",
          title: "원하는 색으로 투표할 수 있습니다.",
          description:
            "원하는 칸과 색을 골라 직접 표를 던질 수 있습니다.\n가장 많은 표를 받은 한 가지 색으로 결정됩니다.",
          imageUrl: "/landing/guide/place-dot-demo.webp",
          imageAlt: "도트 배치 데모",
        },
        {
          id: "live-presence",
          label: "Step 2",
          title: "다른 사람과 함께할 수 있습니다.",
          description:
            "다른 사람이 투표한 칸과 색을 실시간으로 확인할 수 있습니다.\n상대방이 고른 색이 마음에 들지 않으면 표를 더 사용하면 됩니다.",
          imageUrl: "/landing/guide/live-presence-demo.webp",
          imageAlt: "실시간 참여 데모",
        },
        {
          id: "template-rotation",
          label: "Step 3",
          title: "다양한 템플릿을 만나볼 수 있습니다.",
          description:
            "시간에 따라 다른 크기와 템플릿으로 교체됩니다.\n템플릿은 가이드라인일 뿐, 언제나 원하는 그림을 그릴 수 있습니다.",
          imageUrl: "/landing/guide/template-rotation.webp",
          imageAlt: "템플릿 순환 데모",
        },
        {
          id: "round-history",
          label: "Step 4",
          title: "라운드 결과를 다시 확인할 수 있습니다.",
          description:
            "각 라운드가 끝날 때마다 결과 스냅샷이 기록됩니다.\n이전 라운드의 진행 과정을 다시 보면서 어떤 선택이 반영됐는지 확인할 수 있습니다.",
          imageUrl: "/landing/guide/round-history-demo.webp",
          imageAlt: "라운드 결과 히스토리 데모",
        },
        {
          id: "download-result",
          label: "Step 5",
          title: "완성된 그림을 다운로드할 수 있습니다.",
          description:
            "게임이 종료되면 최종 결과 이미지를 저장할 수 있습니다.\n다운로드 파일은 배경 템플릿 도트가 제외된 투명 PNG로 제공됩니다.",
          imageUrl: "/landing/guide/download-result-demo.webp",
          imageAlt: "완성 이미지 다운로드 데모",
          iconUrl: "/landing/guide/download-result-fox.png",
        },
      ],
    },
    footer: {
      description:
        "서비스 규칙, 개인정보 처리 기준, 커뮤니티 안내, 문의 정책을 이곳에서 확인할 수 있습니다.",
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
      title:
        "VoteDots is a round-based canvas game where each cell is decided by votes.",
      description:
        "Every round turns votes into visible progress on a shared canvas. Check the current game, browse standout finished boards, and jump in when you are ready.",
      cta: "Join the game",
    },
    currentGame: {
      title: "Current game",
      emptyTitle: "There is no live game right now.",
      emptyDescription:
        "Once the next game is ready, this panel will show the latest finished round snapshot and live progress details.",
      snapshotLabel: "Latest completed round snapshot",
      loadError: "Failed to load landing data.",
      fallbackPreviewAlt: "Default template preview",
      stats: {
        grid: "Grid",
        round: "Round",
        participants: "Participants",
      },
    },
    featured: {
      title: "Completed canvases",
      description:
        "These are the finished boards with the highest participant counts for the active rotation sizes.",
      stats: {
        participants: "Participants",
        votes: "Total votes",
        topVoter: "Top voter",
        participantList: "Participant list",
      },
    },
    tutorial: {
      title: "Game introduction",
      description:
        "These cards explain the core features in the same order players usually discover them in the game.",
      cards: [
        {
          id: "place-dot",
          label: "Step 1",
          title: "You can place dots directly on the canvas",
          description:
            "Pick a cell and a color, then cast your vote directly onto the board. The picture is built one pixel at a time as everyone contributes together.",
          imageUrl: "/landing/guide/place-dot-demo.webp",
          imageAlt: "Dot placement demo",
        },
        {
          id: "live-presence",
          label: "Step 2",
          title: "You play alongside other people in real time",
          description:
            "You can see where other players are focusing and how votes are gathering on the board. The live canvas makes the group activity visible as it happens.",
          imageUrl: "/landing/guide/live-presence-demo.webp",
          imageAlt: "Live presence demo",
        },
        {
          id: "template-rotation",
          label: "Step 3",
          title: "A variety of templates keep rotating in",
          description:
            "The game rotates through different board sizes and templates over time. Even with the same rules, each board can feel different depending on the template and scale.",
          imageUrl: "/landing/guide/template-rotation.webp",
          imageAlt: "Template rotation demo",
        },
        {
          id: "round-history",
          label: "Step 4",
          title: "You can revisit round results later",
          description:
            "A snapshot is recorded whenever a round ends. You can look back through earlier rounds to see how the canvas changed over time.",
          imageUrl: "/landing/guide/round-history-demo.webp",
          imageAlt: "Round history demo",
        },
        {
          id: "download-result",
          label: "Step 5",
          title: "You can download the finished image",
          description:
            "When the game ends, the final result can be saved as an image. The download is provided as a transparent PNG without the background template dots.",
          imageUrl: "/landing/guide/download-result-demo.webp",
          imageAlt: "Download finished image demo",
          iconUrl: "/landing/guide/download-result-fox.png",
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
