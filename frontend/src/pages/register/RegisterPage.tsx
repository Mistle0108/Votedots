import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "@/features/auth";
import {
  isRegisterFormValid,
  validateRegisterForm,
} from "@/features/auth/model/register.validation";
import { useI18n } from "@/shared/i18n";
import { translateServerMessage } from "@/shared/i18n/server-messages";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { Button } from "@/shared/ui/button";
import LanguageSwitcher from "@/shared/ui/language-switcher";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({
    username: false,
    nickname: false,
    password: false,
  });

  const formValues = { username, nickname, password };
  const fieldErrors = validateRegisterForm(formValues);
  const canSubmit = isRegisterFormValid(formValues) && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTouched({
      username: true,
      nickname: true,
      password: true,
    });

    if (!isRegisterFormValid(formValues)) {
      return;
    }

    setSubmitting(true);

    try {
      await authApi.register({ username, password, nickname });
      navigate("/login");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response: { data: { message: string } } };
        setError(
          translateServerMessage(axiosErr.response.data.message, t, locale),
        );
      } else {
        setError(t("auth.register.errorFallback"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>

        <BrandLogo variant="full" className="mx-auto w-60" />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              {t("auth.register.usernameLabel")}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              onBlur={() =>
                setTouched((prev) => ({
                  ...prev,
                  username: true,
                }))
              }
              className="rounded border px-3 py-2 text-sm"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={20}
              required
            />
            <p
              className={`text-xs ${
                touched.username && fieldErrors.username
                  ? "text-red-500"
                  : "text-gray-500"
              }`}
            >
              {touched.username && fieldErrors.username
                ? t(fieldErrors.username)
                : t("auth.register.usernameHint")}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              {t("auth.register.nicknameLabel")}
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setError("");
              }}
              onBlur={() =>
                setTouched((prev) => ({
                  ...prev,
                  nickname: true,
                }))
              }
              className="rounded border px-3 py-2 text-sm"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={20}
              required
            />
            <p
              className={`text-xs ${
                touched.nickname && fieldErrors.nickname
                  ? "text-red-500"
                  : "text-gray-500"
              }`}
            >
              {touched.nickname && fieldErrors.nickname
                ? t(fieldErrors.nickname)
                : t("auth.register.nicknameHint")}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              {t("auth.register.passwordLabel")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onBlur={() =>
                setTouched((prev) => ({
                  ...prev,
                  password: true,
                }))
              }
              className="rounded border px-3 py-2 text-sm"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={64}
              required
            />
            <p
              className={`text-xs ${
                touched.password && fieldErrors.password
                  ? "text-red-500"
                  : "text-gray-500"
              }`}
            >
              {touched.password && fieldErrors.password
                ? t(fieldErrors.password)
                : t("auth.register.passwordHint")}
            </p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {t("auth.register.submit")}
          </Button>
        </form>

        <p className="text-center text-sm">
          {t("auth.register.hasAccount")}{" "}
          <Link to="/login" className="underline">
            {t("auth.register.login")}
          </Link>
        </p>
      </div>
    </div>
  );
}
