export interface RegisterFormValues {
  username: string;
  nickname: string;
  password: string;
}

export interface RegisterFormErrorKeys {
  username: string | null;
  nickname: string | null;
  password: string | null;
}

const USERNAME_REGEX = /^[a-z0-9]{4,20}$/;
const NICKNAME_REGEX = /^[A-Za-z0-9가-힣]{2,20}$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)\S{8,64}$/;

export function validateRegisterForm(
  values: RegisterFormValues,
): RegisterFormErrorKeys {
  return {
    username: USERNAME_REGEX.test(values.username)
      ? null
      : "auth.register.usernameRule",
    nickname: NICKNAME_REGEX.test(values.nickname)
      ? null
      : "auth.register.nicknameRule",
    password: PASSWORD_REGEX.test(values.password)
      ? null
      : "auth.register.passwordRule",
  };
}

export function isRegisterFormValid(values: RegisterFormValues): boolean {
  const errors = validateRegisterForm(values);

  return !errors.username && !errors.nickname && !errors.password;
}
