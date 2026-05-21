export const AUTH_ERROR_MESSAGES = {
  MISSING_FIELDS: "AUTH_MISSING_FIELDS",
  MISSING_CREDENTIALS: "AUTH_MISSING_CREDENTIALS",
  USERNAME_TAKEN: "AUTH_USERNAME_TAKEN",
  INVALID_USERNAME: "AUTH_INVALID_USERNAME",
  INVALID_NICKNAME: "AUTH_INVALID_NICKNAME",
  INVALID_PASSWORD: "AUTH_INVALID_PASSWORD",
  INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  SESSION_ALREADY_EXISTS: "AUTH_SESSION_ALREADY_EXISTS",
  GUEST_CREATION_FAILED: "AUTH_GUEST_CREATION_FAILED",
  MEMBER_ONLY: "AUTH_MEMBER_ONLY",
} as const;

const USERNAME_REGEX = /^[a-z0-9]{4,20}$/;
const NICKNAME_REGEX = /^[A-Za-z0-9가-힣]{2,20}$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)\S{8,64}$/;
const SUPPORTED_REGISTER_LOCALES = new Set(["ko", "en"]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function validatePasswordValue(password: unknown): string | null {
  if (!isNonEmptyString(password)) {
    return AUTH_ERROR_MESSAGES.MISSING_CREDENTIALS;
  }

  if (!PASSWORD_REGEX.test(password)) {
    return AUTH_ERROR_MESSAGES.INVALID_PASSWORD;
  }

  return null;
}

export function validateRegisterInput(params: {
  username: unknown;
  password: unknown;
  nickname: unknown;
  acceptedTerms: unknown;
  isAge14OrOlderConfirmed: unknown;
  termsAcceptedLocale: unknown;
}): string | null {
  const {
    username,
    password,
    nickname,
    acceptedTerms,
    isAge14OrOlderConfirmed,
    termsAcceptedLocale,
  } = params;

  if (
    !isNonEmptyString(username) ||
    !isNonEmptyString(password) ||
    !isNonEmptyString(nickname) ||
    acceptedTerms !== true ||
    isAge14OrOlderConfirmed !== true ||
    !isNonEmptyString(termsAcceptedLocale) ||
    !SUPPORTED_REGISTER_LOCALES.has(termsAcceptedLocale)
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

export function validateGuestSessionInput(params: {
  nickname: unknown;
}): string | null {
  const { nickname } = params;

  if (!isNonEmptyString(nickname)) {
    return AUTH_ERROR_MESSAGES.MISSING_FIELDS;
  }

  if (!NICKNAME_REGEX.test(nickname)) {
    return AUTH_ERROR_MESSAGES.INVALID_NICKNAME;
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
