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
      title: "직접 그리고 투표하는\n픽셀 캔버스",
      description:
        "색을 고르고,\n투표를 하고,\n함께 완성하세요.",
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
          "이 약관은 VoteDots가 제공하는 실시간 협업형 캔버스 게임 서비스 및 이에 부수되는 제반 서비스의 이용과 관련하여 VoteDots와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정합니다.",
        sections: [
          {
            heading: "1. 목적",
            paragraphs: [
              "이 약관은 VoteDots가 제공하는 실시간 협업형 캔버스 게임 서비스 및 이에 부수되는 제반 서비스의 이용과 관련하여 VoteDots와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.",
            ],
          },
          {
            heading: "2. 용어의 정의",
            paragraphs: [
              "이 약관에서 `서비스`란 VoteDots가 온라인으로 제공하는 게임 및 이에 부수되는 제반 서비스를 말하며, `회원`이란 이 약관에 동의하고 VoteDots와 이용계약을 체결하여 서비스 이용자격을 부여받은 자를 말합니다.",
              "`계정`은 회원 식별과 서비스 이용을 위하여 회원이 설정하고 VoteDots가 승인한 아이디를 말합니다. `게임 결과`는 서비스 이용 과정에서 생성되는 캔버스 이미지, 라운드 진행 내역, 통계, 스냅샷 등 결과물을 말하며, `공개 정보`는 닉네임, 게임 결과, 통계 정보 등 서비스 내 또는 VoteDots가 정한 범위에서 공개될 수 있는 정보를 말합니다.",
            ],
          },
          {
            heading: "3. 약관의 게시와 개정",
            paragraphs: [
              "VoteDots는 이 약관의 내용을 회원이 쉽게 확인할 수 있도록 서비스 내 화면 또는 연결화면을 통하여 게시합니다.",
              "VoteDots는 관련 법령을 위반하지 않는 범위에서 이 약관을 개정할 수 있으며, 개정 시 적용일자, 개정 내용 및 개정 사유를 공지합니다. 회원은 개정약관에 동의하지 않을 경우 서비스 이용을 중단하고 회원 탈퇴를 요청할 수 있습니다.",
            ],
          },
          {
            heading: "4. 회원가입 및 계정 관리",
            paragraphs: [
              "회원가입을 희망하는 자는 VoteDots가 정한 절차에 따라 필요한 정보를 입력하고 이 약관에 동의한 후 가입을 신청할 수 있습니다. VoteDots는 허위 정보 사용, 만 14세 미만 가입 신청, 기술상 승인 곤란, 이용 자격 제한 이력 등 일정한 사유가 있는 경우 가입 신청을 승낙하지 않거나 사후에 이용계약을 해지할 수 있습니다.",
              "회원은 자신의 정보를 정확하게 입력하고 변경 시 적절한 방법으로 수정하거나 갱신하여야 합니다. 계정과 비밀번호는 회원이 스스로 관리하여야 하며, 제3자에게 양도, 대여 또는 공유할 수 없습니다. VoteDots는 계정 보호와 보안상 필요에 따라 로그인 세션 관리 또는 계정 이용 제한 조치를 할 수 있습니다.",
            ],
          },
          {
            heading: "5. VoteDots의 의무 및 회원의 의무",
            paragraphs: [
              "VoteDots는 관련 법령과 이 약관을 준수하며 지속적이고 안정적으로 서비스를 제공하기 위하여 노력합니다. 또한 개인정보 보호, 계정 보안, 서비스 안정성 확보를 위하여 합리적인 범위의 기술적·관리적 조치를 적용합니다.",
              "회원은 관련 법령, 이 약관, 서비스 내 안내 및 운영정책을 준수하여야 합니다. 허위 정보 사용, 타인의 계정 사용, 비정상적인 요청, 자동화 도구·매크로·봇 사용, 서비스 운영 방해, 악성 코드 배포, 음란물·폭력적 표현·혐오 표현·차별 표현·불법정보·타인의 권리를 침해하는 내용 기타 공서양속에 반하거나 서비스 운영상 부적절하다고 판단되는 이미지를 생성·표시·유도하는 행위는 허용되지 않습니다.",
            ],
          },
          {
            heading: "6. 서비스의 제공, 변경 및 중단",
            paragraphs: [
              "VoteDots는 회원에게 VoteDots 서비스 및 이에 부수되는 제반 서비스를 제공합니다.",
              "VoteDots는 운영상, 기술상 또는 서비스 개선이 필요한 경우 서비스의 전부 또는 일부를 변경할 수 있으며, 시스템 점검, 유지보수, 장애 대응, 외부 연계 서비스 장애, 천재지변 기타 이에 준하는 사유가 발생한 경우 서비스의 전부 또는 일부를 일시적으로 중단할 수 있습니다. 무료로 제공되는 서비스의 일부 또는 전부는 운영정책에 따라 수정, 중단 또는 변경될 수 있습니다.",
            ],
          },
          {
            heading: "7. 게임 결과, 캔버스 작업물의 저장 및 이용",
            paragraphs: [
              "VoteDots는 서비스 운영, 게임 진행, 게임 결과 제공, 기록 보관, 분쟁 대응, 서비스 개선 및 안내를 위하여 회원이 서비스 이용 과정에서 생성하거나 참여한 정보와 결과물을 서버에 저장할 수 있습니다. 여기에는 광장, 공개방, 비공개방을 포함한 모든 방의 정보와 게임 결과가 포함되며, 방 정보에는 방의 생성 및 설정 정보, 캔버스 이미지, 라운드 진행 내역, 참여 인원, 투표 기록 및 통계, 스냅샷, 닉네임 기반 요약 정보 및 이에 준하는 정보가 포함될 수 있습니다.",
              "비공개방은 외부에 공개되지 않을 수 있으나, 서비스 운영, 기록 보관, 장애 대응, 분쟁 대응 및 권리 보호를 위하여 서버에 저장될 수 있습니다. 회원은 서비스 이용 과정에서 자신의 닉네임, 게임 참여 결과 및 관련 공개 정보가 서비스 내 또는 VoteDots가 정한 범위에서 표시되거나 보관될 수 있음을 이해하고 이에 동의합니다.",
              "회원이 서비스 이용 과정에서 생성한 캔버스 작업물 또는 이에 포함된 개별 창작 요소에 대한 저작권은 원칙적으로 해당 회원 또는 정당한 권리자에게 귀속됩니다. 다만 VoteDots의 게임 결과는 다수 회원의 참여, 투표 및 시스템 처리에 의해 결합되어 형성되는 협업형 결과물일 수 있으며, 회원은 자신의 참여 결과가 다른 참여자의 결과와 함께 하나의 게임 결과로 저장, 표시, 보관될 수 있음을 이해하고 이에 동의합니다.",
              "회원은 VoteDots에 대하여 서비스 운영, 게임 결과 제공, 표시, 복제, 저장, 전송, 공개, 기록 보관, 백업, 서비스 소개, 비식별 통계 작성 및 서비스 개선에 필요한 범위 내에서 자신의 캔버스 작업물, 게임 결과, 스냅샷, 닉네임 및 관련 공개 정보를 이용할 수 있는 비독점적, 무상, 전 세계적 이용허락을 부여합니다. 이 이용허락에는 서비스 운영에 필요한 범위 내에서의 썸네일 생성, 스냅샷 생성, 포맷 변환, 크기 조정, 비식별화, 아카이빙 및 이에 준하는 수정 또는 편집이 포함될 수 있습니다.",
              "회원은 자신이 참여하여 생성된 게임 결과 및 캔버스 작업물을 상업적 이용이 아닌 범위에서는 자유롭게 열람, 저장, 공유 및 게시할 수 있습니다. 다만 관련 법령, 제3자의 권리, 개인정보, 서비스 운영정책 또는 본 약관을 위반하는 방식의 이용은 허용되지 않으며, 상업적 이용을 하고자 하는 경우에는 해당 결과물에 포함된 권리관계와 제3자 권리를 스스로 확인하여야 합니다.",
              "VoteDots는 관련 법령, 회원 탈퇴, 운영상 필요, 권리 보호 또는 유해성 판단에 따라 공개 정보, 게임 결과, 캔버스 작업물 또는 관련 기록의 전부 또는 일부를 수정, 비공개 처리, 삭제 또는 비식별 처리할 수 있으며, 유해하거나 부적절하다고 판단되는 이미지, 결과물 또는 관련 공개 정보를 숨김 또는 삭제할 수 있습니다.",
            ],
          },
          {
            heading: "8. 회원 탈퇴, 이용제한 및 계약 종료",
            paragraphs: [
              "회원은 언제든지 VoteDots가 정한 절차에 따라 회원 탈퇴를 요청할 수 있으며, VoteDots는 관련 법령 또는 별도의 보관 의무가 없는 범위에서 지체 없이 필요한 조치를 합니다. 탈퇴 후 개인정보는 개인정보처리방침에 따라 처리되며, 이미 생성된 게임 결과 및 공개 기록은 개인을 식별할 수 없도록 비식별 처리된 범위에서 남을 수 있습니다.",
              "VoteDots는 허위 정보 사용, 만 14세 미만 가입, 계정 도용, 서비스 운영 방해, 자동화 도구 또는 부정한 방법을 통한 이용, 관련 법령·약관·운영정책 위반, 유해하거나 위법한 이미지 또는 표현 생성 등 일정한 사유가 있는 경우 서비스 이용을 제한하거나 이용계약을 종료할 수 있습니다. 회원은 이용제한 조치에 이의가 있는 경우 VoteDots가 정한 방법에 따라 이의를 제기할 수 있습니다.",
            ],
          },
          {
            heading: "9. 면책 및 분쟁해결",
            paragraphs: [
              "VoteDots는 천재지변, 전쟁, 테러, 정전, 통신망 장애, 서버 장애, 제3자 서비스 장애 기타 이에 준하는 불가항력적 사유로 서비스를 제공할 수 없는 경우 책임을 지지 않습니다. 또한 회원의 귀책사유, 계정정보 관리 소홀, 단말기 또는 네트워크 환경 문제로 발생한 손해에 대하여 책임을 지지 않습니다.",
              "VoteDots는 무료로 제공되는 서비스와 관련하여 관련 법령에 특별한 규정이 없는 한 특별한 손해에 대하여 책임을 지지 않을 수 있습니다. 이 약관은 대한민국 법률에 따라 해석되고 적용되며, 서비스 이용과 관련하여 분쟁이 발생한 경우 관련 법령에 따른 관할 법원을 제1심 관할 법원으로 합니다.",
            ],
          },
        ],
      },
      privacy: {
        title: "개인정보처리방침",
        lead:
          "VoteDots는 서비스 운영 과정에서 이용자의 개인정보를 어떤 기준과 목적에 따라 처리하는지 안내하기 위하여 이 개인정보처리방침을 마련합니다. 이용자는 본 방침을 통해 처리 항목, 이용 목적, 보유 기간, 보호조치 및 권리 행사 방법을 확인할 수 있습니다.",
        sections: [
          {
            heading: "1. 개인정보처리방침의 의의",
            paragraphs: [
              "개인정보처리방침은 VoteDots가 서비스 운영 과정에서 어떤 개인정보를 어떤 기준으로 처리하는지 설명하는 문서입니다.",
              "VoteDots는 필요한 범위 내에서만 개인정보를 처리하고, 관련 법령에 따라 안전하게 관리하기 위하여 본 방침을 수립하고 공개합니다.",
            ],
          },
          {
            heading: "2. 개인정보의 처리 목적",
            paragraphs: [
              "VoteDots는 회원가입 및 계정 관리, 로그인 세션 유지 및 인증 처리, 서비스 접속 통계 분석 및 서비스 개선을 위하여 개인정보를 처리합니다.",
              "또한 서비스 이용약관 동의 이력 관리와 만 14세 이상 여부 확인을 위하여 필요한 범위의 정보를 처리합니다.",
            ],
          },
          {
            heading: "3. 처리하는 개인정보의 항목",
            paragraphs: [
              "회원가입 및 계정 관리 과정에서는 아이디, 닉네임, 비밀번호, 약관 동의 시각, 약관 동의 언어, 약관 버전, 만 14세 이상 여부 확인 정보를 처리합니다.",
              "로그인 세션 유지 및 인증 처리 과정에서는 세션 쿠키와 세션 식별 정보를 처리합니다. 서비스 접속 통계 분석 및 서비스 개선 과정에서는 브라우저 언어, 타임존, 기기 정보, 입장 시간을 처리합니다.",
            ],
          },
          {
            heading: "4. 개인정보의 처리 및 보유 기간",
            paragraphs: [
              "회원가입 및 계정 관리 정보와 서비스 이용약관 동의 이력은 회원 탈퇴 시까지 보유합니다. 만 14세 이상 여부 확인 정보도 회원 탈퇴 시까지 보유합니다.",
              "세션 쿠키와 세션 식별 정보는 로그아웃 시 또는 세션 만료 시까지 보유합니다. 서비스 접속 통계 원본 데이터는 수집일로부터 90일간 보관 후 파기하며, 특정 개인을 식별할 수 없도록 집계된 통계 정보는 서비스 운영 및 분석 목적으로 장기 보관할 수 있습니다. 법령상 보관 의무가 적용되는 인터넷 로그기록자료 및 접속지 추적자료는 관련 법령에 따라 3개월간 보관할 수 있습니다.",
            ],
          },
          {
            heading: "5. 개인정보의 파기절차 및 파기방법",
            paragraphs: [
              "VoteDots는 개인정보 보유기간이 경과하거나 처리 목적이 달성되어 개인정보가 불필요하게 되었을 때 지체 없이 해당 개인정보를 파기합니다.",
              "관계 법령에 따라 별도 보관이 필요한 정보는 법령에서 정한 기간 동안 별도로 보관한 후 파기하며, 전자적 파일 형태의 개인정보는 복구 또는 재생이 불가능한 방법으로 삭제합니다. 회원 탈퇴 시 관련 법령 또는 보관 의무가 없는 개인정보는 삭제되며, 이미 생성된 게임 결과 및 공개 정보는 개인을 식별할 수 없도록 비식별 처리될 수 있습니다.",
            ],
          },
          {
            heading: "6. 정보주체와 법정대리인의 권리·의무 및 행사방법",
            paragraphs: [
              "이용자는 언제든지 자신의 개인정보에 대한 열람, 정정, 삭제, 처리정지를 요구할 수 있으며, 법정대리인 또는 위임을 받은 대리인을 통하여 권리를 행사할 수 있습니다.",
              "권리 행사는 전자우편 등으로 요청할 수 있으며, VoteDots는 관련 법령에 따라 지체 없이 필요한 조치를 합니다. VoteDots는 만 14세 미만 아동을 대상으로 서비스를 제공하지 않으며, 만 14세 미만 아동의 개인정보가 수집된 사실을 인지한 경우 지체 없이 해당 정보를 삭제합니다.",
            ],
          },
          {
            heading: "7. 개인정보 보호책임자",
            paragraphs: [
              "VoteDots는 개인정보 처리에 관한 업무를 총괄하고 관련 문의를 처리하기 위하여 개인정보 보호책임자를 지정하고 있습니다.",
              "개인정보 보호책임자의 직책은 운영자이며, 문의 연락처는 privacy@votedots.space 입니다. 개인정보 보호 관련 문의, 불만처리, 피해구제 요청은 위 연락처로 할 수 있습니다.",
            ],
          },
          {
            heading: "8. 개인정보 자동 수집 장치의 설치·운영 및 거부에 관한 사항",
            paragraphs: [
              "VoteDots는 로그인 상태 유지, 이용자 인증, 세션 관리 및 보안상 필요한 접속 상태 확인을 위하여 세션 쿠키를 사용합니다.",
              "세션 쿠키는 로그아웃 시 또는 세션 만료 시까지 유지됩니다. 이용자는 웹 브라우저 설정을 통하여 쿠키 저장을 거부할 수 있으나, 쿠키 저장을 거부할 경우 로그인 유지 등 일부 서비스 이용에 어려움이 발생할 수 있습니다. VoteDots는 현재 광고, 마케팅, 맞춤형 광고를 위한 제3자 쿠키를 사용하지 않습니다.",
            ],
          },
          {
            heading: "9. 개인정보의 안전성 확보조치에 관한 사항",
            paragraphs: [
              "VoteDots는 비밀번호를 원문 그대로 저장하지 않고 보호된 형태로 저장합니다. 또한 세션 쿠키에 HttpOnly, Secure, SameSite 속성을 적용하고 로그인 시 세션을 재생성하며 로그아웃 시 세션을 종료합니다.",
              "로그인한 이용자만 접근할 수 있는 기능에는 인증 절차를 적용하고, 회원가입 및 로그인 요청에 대해서는 반복적인 비정상 요청을 제한하는 등 개인정보의 안전성 확보를 위한 기술적 조치를 적용합니다.",
            ],
          },
          {
            heading: "10. 개인정보 처리방침의 변경에 관한 사항",
            paragraphs: [
              "이 개인정보처리방침은 시행일로부터 적용됩니다. VoteDots는 법령, 서비스 내용 또는 개인정보 처리 방식의 변경이 있는 경우 본 방침을 수정할 수 있습니다.",
              "중요한 변경사항이 있는 경우에는 시행일자, 변경 사유 및 주요 변경 내용을 서비스 내 페이지를 통하여 안내합니다. 시행일자는 2026년 5월 12일입니다.",
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
        "Draw and vote together\non a shared pixel canvas.",
      description:
        "Pick a color,\ncast your vote,\nand complete it together.",
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
        participants: "Current participants",
      },
    },
    featured: {
      title: "Completed canvases",
      description:
        "Shows the game with the most participants for each board size in the current rotation.",
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
        "",
      cards: [
        {
          id: "place-dot",
          label: "Step 1",
          title: "You can vote with the color you want.",
          description:
            "Choose the cell and color you want, then cast your vote directly.\nEach cell is decided by the single color that receives the most votes.",
          imageUrl: "/landing/guide/place-dot-demo.webp",
          imageAlt: "Dot placement demo",
        },
        {
          id: "live-presence",
          label: "Step 2",
          title: "You can play together with other people.",
          description:
            "You can see in real time which cells and colors other people are voting on.\nIf you do not like the color someone else picked, you can use more votes to change the outcome.",
          imageUrl: "/landing/guide/live-presence-demo.webp",
          imageAlt: "Live presence demo",
        },
        {
          id: "template-rotation",
          label: "Step 3",
          title: "You can explore a variety of templates.",
          description:
            "Different board sizes and templates rotate over time.\nThe template is only a guideline, and you can always draw whatever image you want.",
          imageUrl: "/landing/guide/template-rotation.webp",
          imageAlt: "Template rotation demo",
        },
        {
          id: "round-history",
          label: "Step 4",
          title: "You can revisit round results.",
          description:
            "A result snapshot is recorded whenever a round ends.\nYou can look back at previous rounds to see which choices were reflected on the canvas.",
          imageUrl: "/landing/guide/round-history-demo.webp",
          imageAlt: "Round history demo",
        },
        {
          id: "download-result",
          label: "Step 5",
          title: "You can download the finished image.",
          description:
            "When the game ends, you can save the final result image.\nThe download is provided as a transparent PNG without the background template dots.",
          imageUrl: "/landing/guide/download-result-demo.webp",
          imageAlt: "Download finished image demo",
          iconUrl: "/landing/guide/download-result-fox.png",
        },
      ],
    },
    footer: {
      description:
        "You can review the service rules, privacy policy, community guide, and contact policy here.",
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
          "These Terms of Service govern the rights, obligations, responsibilities, and other necessary matters between VoteDots and its members in connection with the real-time collaborative canvas game service and related services provided by VoteDots.",
        sections: [
          {
            heading: "1. Purpose",
            paragraphs: [
              "These Terms of Service govern the rights, obligations, responsibilities, and other necessary matters between VoteDots and its members in connection with the real-time collaborative canvas game service and related services provided by VoteDots.",
            ],
          },
          {
            heading: "2. Definitions",
            paragraphs: [
              "In these terms, `Service` means the online game and related services provided by VoteDots, and `Member` means a person who has agreed to these terms and entered into a service agreement with VoteDots.",
              "`Account` means the username approved by VoteDots for member identification and service use. `Game results` means outputs such as the canvas image, round progression records, statistics, and snapshots generated through use of the service. `Public information` means nicknames, game results, statistics, and other information that may be displayed within the service or within a scope designated by VoteDots.",
            ],
          },
          {
            heading: "3. Posting and amendment of the terms",
            paragraphs: [
              "VoteDots posts these terms in a place where members can easily review them within the service or through a linked screen.",
              "VoteDots may revise these terms to the extent permitted by applicable law. When the terms are revised, VoteDots will announce the effective date, the revised content, and the reason for the revision. A member who does not agree to the revised terms may stop using the service and request account withdrawal.",
            ],
          },
          {
            heading: "4. Registration and account management",
            paragraphs: [
              "A person who wishes to register may apply for membership by following the procedure designated by VoteDots, providing the required information, and agreeing to these terms. VoteDots may refuse registration or terminate the agreement afterward when there is false information, an application by a person under the age of 14, technical difficulty, or a prior history of restriction.",
              "Members must provide accurate information and update it when changes occur. Members are responsible for managing their own account credentials and may not transfer, lend, or share their account with a third party. VoteDots may manage sessions or restrict account use when necessary for account protection or security.",
            ],
          },
          {
            heading: "5. Obligations of VoteDots and members",
            paragraphs: [
              "VoteDots complies with applicable law and these terms and makes reasonable efforts to provide a stable service. VoteDots also applies reasonable technical and administrative measures for privacy protection, account security, and service stability.",
              "Members must comply with applicable law, these terms, notices within the service, and operational policies. False information, use of another person's account, abnormal requests, automation tools, macros, bots, service interference, malicious code distribution, and the creation, display, or inducement of obscene, violent, hateful, discriminatory, illegal, rights-infringing, or otherwise inappropriate images or expressions are prohibited.",
            ],
          },
          {
            heading: "6. Provision, change, and suspension of the service",
            paragraphs: [
              "VoteDots provides the VoteDots service and related services to members.",
              "VoteDots may change all or part of the service when required for operational, technical, or improvement reasons. VoteDots may temporarily suspend all or part of the service in the event of maintenance, failures, external service outages, natural disasters, or similar circumstances. Free service features may also be modified, suspended, or discontinued under operational policy.",
            ],
          },
          {
            heading: "7. Storage and use of game results and canvas works",
            paragraphs: [
              "VoteDots may store on its servers the information and outputs that a member creates or participates in through the service for service operation, gameplay, game result delivery, record keeping, dispute response, service improvement, and notices. This includes information and game results for all rooms, including the plaza, public rooms, and private rooms. Room information may include room creation and settings, canvas images, round history, participant counts, voting records and statistics, snapshots, nickname-based summaries, and similar information.",
              "A private room may not be publicly visible to others, but it may still be stored on the server for service operation, record keeping, incident response, dispute response, and protection of rights. Members understand and agree that their nickname, gameplay results, and related public information may be displayed or retained within the service or within a scope designated by VoteDots.",
              "Copyright in a canvas work created through use of the service, or in an individual creative element contained in it, in principle belongs to the relevant member or other legitimate right holder. However, a game result on VoteDots may be a collaborative output formed through the participation, voting, and system processing of multiple members, and each member understands and agrees that their contribution may be stored, displayed, and retained together with the contributions of other participants as a single game result.",
              "Each member grants VoteDots a non-exclusive, royalty-free, worldwide license to use that member's canvas works, game results, snapshots, nickname, and related public information to the extent necessary for service operation, game result delivery, display, reproduction, storage, transmission, publication, record keeping, backup, service presentation, de-identified statistics, and service improvement. This license may include creating thumbnails and snapshots, format conversion, resizing, de-identification, archiving, and similar edits or modifications to the extent necessary for service operation.",
              "Members may freely view, save, share, and post the game results and canvas works in which they participated, provided that the use is non-commercial. However, use that violates applicable law, third-party rights, personal information, the service policy, or these terms is not permitted. If a member intends to use a result commercially, that member is responsible for confirming the rights involved in the result and any third-party rights included in it.",
              "VoteDots may modify, hide, delete, or de-identify all or part of public information, game results, canvas works, or related records when required by law, account withdrawal, operational needs, protection of rights, or a determination of harmfulness, and may hide or delete images, results, or public records considered harmful or inappropriate.",
            ],
          },
          {
            heading: "8. Withdrawal, restriction of use, and termination",
            paragraphs: [
              "A member may request account withdrawal at any time through the procedure designated by VoteDots, and VoteDots will take necessary measures without delay to the extent there is no legal retention duty. After withdrawal, personal information is handled in accordance with the Privacy Policy, and previously generated game results or public records may remain only within a de-identified scope that no longer identifies the former member.",
              "VoteDots may restrict use of the service or terminate the service agreement when there is false information, registration by a person under the age of 14, account misuse, service interference, automated or improper use, violation of law, these terms, or operational policy, or creation of harmful or unlawful images or expressions. A member may raise an objection to a restriction in the manner designated by VoteDots.",
            ],
          },
          {
            heading: "9. Disclaimer and dispute resolution",
            paragraphs: [
              "VoteDots is not liable when the service cannot be provided because of force majeure circumstances such as natural disasters, war, terrorism, power failure, network outage, server failure, or third-party service failure. VoteDots is also not liable for damage caused by a member's own fault, poor credential management, or device or network conditions.",
              "To the extent permitted by applicable law, VoteDots may not be liable for special damages related to a free service. These terms are governed by the laws of the Republic of Korea, and disputes arising from service use shall be subject to the court of competent jurisdiction under applicable law.",
            ],
          },
        ],
      },
      privacy: {
        title: "Privacy Policy",
        lead:
          "VoteDots provides this Privacy Policy to explain how personal information is processed in connection with the service. You can use this page to review the categories of information we handle, why we handle it, how long we keep it, what safeguards are applied, and how you can exercise your rights.",
        sections: [
          {
            heading: "1. Purpose of this policy",
            paragraphs: [
              "This Privacy Policy explains what personal information VoteDots processes and the standards used when handling that information during service operation.",
              "VoteDots processes personal information only within the scope needed for the service and publishes this policy so that users can understand how their information is handled.",
            ],
          },
          {
            heading: "2. Purposes of processing",
            paragraphs: [
              "VoteDots processes personal information for account registration and management, sign-in session maintenance and authentication, service access analytics, and service improvement.",
              "We also process limited information to keep a record of acceptance of the Terms of Service and to confirm whether a registrant has affirmed that they are at least 14 years old.",
            ],
          },
          {
            heading: "3. Categories of personal information processed",
            paragraphs: [
              "For account registration and management, VoteDots processes the username, nickname, password, terms acceptance timestamp, terms acceptance locale, terms version, and confirmation that the registrant affirmed they are at least 14 years old.",
              "For sign-in session maintenance and authentication, VoteDots processes session cookies and session identifiers. For service access analytics and improvement, VoteDots processes browser language, time zone, device information, and entry time.",
            ],
          },
          {
            heading: "4. Retention periods",
            paragraphs: [
              "Account registration and management information, terms acceptance records, and the confirmation that the registrant affirmed they are at least 14 years old are retained until account withdrawal.",
              "Session cookies and session identifiers are retained until logout or session expiration. Raw service access analytics events are retained for 90 days from collection and then deleted, while aggregated statistics that no longer identify a specific person may be retained for a longer period for service operation and analysis. Internet log records and access trace data subject to legal retention requirements may be retained for 3 months as required by applicable law.",
            ],
          },
          {
            heading: "5. Deletion procedures and methods",
            paragraphs: [
              "VoteDots deletes personal information without delay once the retention period expires or once the information is no longer needed for the stated processing purpose.",
              "When separate retention is required by law, the relevant information is retained separately for the required period and then deleted. Electronic files containing personal information are removed using methods intended to prevent recovery or restoration. When an account is withdrawn, personal information that is not subject to a legal retention duty is deleted, and game results or public records that have already been generated may be de-identified so that the former member can no longer be identified.",
            ],
          },
          {
            heading: "6. Rights of data subjects and how to exercise them",
            paragraphs: [
              "Users may request access to, correction of, deletion of, or suspension of processing of their personal information at any time. Those rights may also be exercised by a legal representative or a duly authorized agent.",
              "Requests may be submitted by email or another designated contact method, and VoteDots will respond in accordance with applicable law. VoteDots does not provide the service to children under the age of 14 and does not intentionally collect their personal information. If we become aware that such information has been collected, it will be deleted without delay.",
            ],
          },
          {
            heading: "7. Privacy officer",
            paragraphs: [
              "VoteDots has designated a privacy officer to oversee personal information processing and to handle related inquiries and complaints.",
              "The privacy officer role is operated by the service operator, and the contact address is privacy@votedots.space. Privacy-related inquiries, complaints, and requests for relief may be sent to that address.",
            ],
          },
          {
            heading: "8. Automatic collection devices, cookies, and refusal methods",
            paragraphs: [
              "VoteDots uses session cookies to maintain sign-in state, authenticate users, manage sessions, and confirm connection state where needed for security.",
              "Session cookies are retained until logout or session expiration. Users may refuse cookie storage through their browser settings, but doing so may make some features, including persistent sign-in, unavailable. VoteDots does not currently use third-party cookies for advertising, marketing, or personalized advertising.",
            ],
          },
          {
            heading: "9. Security measures",
            paragraphs: [
              "VoteDots does not store passwords in raw form and instead stores them in a protected format. Session cookies are configured with HttpOnly, Secure, and SameSite protections, sessions are regenerated on sign-in, and sessions are terminated on logout.",
              "Authentication is required for restricted service features, and technical measures such as abnormal request limiting are applied to help protect personal information and maintain service security.",
            ],
          },
          {
            heading: "10. Changes to this Privacy Policy",
            paragraphs: [
              "This Privacy Policy applies from its effective date. VoteDots may revise this policy when laws, service features, or personal information processing practices change.",
              "If a material change occurs, VoteDots will announce the effective date, the reason for the change, and the main revised points on the service page. The effective date of this version is May 12, 2026.",
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
