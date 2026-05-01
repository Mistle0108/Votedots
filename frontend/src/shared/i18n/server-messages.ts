import type { Locale } from "./resources";

const EXACT_KEY_MAP: Record<string, string> = {
  AUTH_REQUIRED_LOGIN: "server.auth.requiredLogin",
  AUTH_USERNAME_TAKEN: "server.auth.usernameTaken",
  AUTH_INVALID_CREDENTIALS: "server.auth.invalidCredentials",
  AUTH_MISSING_CREDENTIALS: "server.auth.missingCredentials",
  AUTH_MISSING_FIELDS: "server.auth.missingFields",
  AUTH_INVALID_USERNAME: "server.auth.invalidUsername",
  AUTH_INVALID_NICKNAME: "server.auth.invalidNickname",
  AUTH_INVALID_PASSWORD: "server.auth.invalidPassword",
  "No active round was found.": "server.vote.noRound",
  "Canvas was not found.": "server.vote.canvasNotFound",
  "Invalid cell coordinate.": "server.vote.invalidCell",
  "No remaining votes are available.": "server.vote.noTickets",
  "Failed to update vote status.": "server.vote.submitFailed",
  "로그인이 필요해요": "server.auth.requiredLogin",
  "이미 사용 중인 아이디예요": "server.auth.usernameTaken",
  "아이디 또는 비밀번호가 올바르지 않아요": "server.auth.invalidCredentials",
  "아이디와 비밀번호를 입력해주세요.": "server.auth.missingCredentials",
  "모든 항목을 입력해주세요.": "server.auth.missingFields",
  "세션 정보를 찾을 수 없어요": "server.vote.missingSession",
  "캔버스 ID, 라운드 ID, 좌표, 색상을 모두 입력해주세요.":
    "server.vote.missingFields",
  "진행 중인 라운드가 없어요": "server.vote.noRound",
  "캔버스를 찾을 수 없어요": "server.vote.canvasNotFound",
  "유효하지 않은 셀 좌표예요.": "server.vote.invalidCell",
  "남은 투표권이 없어요": "server.vote.noTickets",
};

const PREFIX_KEY_MAP: Array<{ prefix: string; key: string }> = [
  { prefix: "Failed to submit vote:", key: "server.vote.submitFailed" },
  { prefix: "투표 처리 중 오류가 발생했어요", key: "server.vote.submitFailed" },
];

function normalizeServerMessage(message: string) {
  return message.replace(/^Error:\s*/i, "").trim();
}

export function translateServerMessage(
  message: string,
  translate: (key: string) => string,
  locale: Locale,
) {
  if (!message) {
    return message;
  }

  const normalizedMessage = normalizeServerMessage(message);
  const exactKey = EXACT_KEY_MAP[normalizedMessage];

  if (exactKey) {
    return translate(exactKey);
  }

  const prefixMatch = PREFIX_KEY_MAP.find(({ prefix }) =>
    normalizedMessage.startsWith(prefix),
  );

  if (prefixMatch) {
    return translate(prefixMatch.key);
  }

  return locale === "en" ? normalizedMessage : normalizedMessage;
}
