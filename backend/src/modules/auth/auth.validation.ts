export const AUTH_ERROR_MESSAGES = {
  MISSING_FIELDS: "AUTH_MISSING_FIELDS",
  MISSING_CREDENTIALS: "AUTH_MISSING_CREDENTIALS",
  USERNAME_TAKEN: "AUTH_USERNAME_TAKEN",
  INVALID_USERNAME: "AUTH_INVALID_USERNAME",
  INVALID_NICKNAME: "AUTH_INVALID_NICKNAME",
  INVALID_PASSWORD: "AUTH_INVALID_PASSWORD",
  INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
} as const;

const USERNAME_REGEX = /^[a-z0-9]{4,20}$/;
const NICKNAME_REGEX = /^[A-Za-z0-9가-힣]{2,20}$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)\S{8,64}$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function validateRegisterInput(params: {
  username: unknown;
  password: unknown;
  nickname: unknown;
}): string | null {
  const { username, password, nickname } = params;

  if (
    !isNonEmptyString(username) ||
    !isNonEmptyString(password) ||
    !isNonEmptyString(nickname)
  ) {
    return AUTH_ERROR_MESSAGES.MISSING_FIELDS;
  }

  if (!USERNAME_REGEX.test(username)) {
    return AUTH_ERROR_MESSAGES.INVALID_USERNAME;
  }

  if (!NICKNAME_REGEX.test(nickname)) {
    return AUTH_ERROR_MESSAGES.INVALID_NICKNAME;
  }

  if (!PASSWORD_REGEX.test(password)) {
    return AUTH_ERROR_MESSAGES.INVALID_PASSWORD;
  }

  return null;
}

export function validateLoginInput(params: {
  username: unknown;
  password: unknown;
}): string | null {
  const { username, password } = params;

  if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
    return AUTH_ERROR_MESSAGES.MISSING_CREDENTIALS;
  }

  return null;
}
