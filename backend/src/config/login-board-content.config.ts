import path from "node:path";

const DEFAULT_LOGIN_BOARD_CONTENT_ROOT = path.resolve(
  process.cwd(),
  "login-board-content",
);

export function getLoginBoardContentRoot(): string {
  return path.resolve(
    process.env.LOGIN_BOARD_CONTENT_ROOT ?? DEFAULT_LOGIN_BOARD_CONTENT_ROOT,
  );
}
