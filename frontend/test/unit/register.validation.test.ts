import {
  isRegisterFormValid,
  validateRegisterForm,
} from "@/features/auth/model/register.validation";

describe("register.validation", () => {
  it("accepts a valid form", () => {
    const values = {
      username: "tester01",
      nickname: "Player01",
      password: "password1",
    };

    expect(validateRegisterForm(values)).toEqual({
      username: null,
      nickname: null,
      password: null,
    });
    expect(isRegisterFormValid(values)).toBe(true);
  });

  it("returns field errors for invalid input", () => {
    const values = {
      username: "Ab",
      nickname: "x",
      password: "short",
    };

    expect(validateRegisterForm(values)).toEqual({
      username: "auth.register.usernameRule",
      nickname: "auth.register.nicknameRule",
      password: "auth.register.passwordRule",
    });
    expect(isRegisterFormValid(values)).toBe(false);
  });
});
