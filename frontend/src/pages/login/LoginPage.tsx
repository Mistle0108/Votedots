import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "@/features/auth";
import { translateServerMessage } from "@/shared/i18n/server-messages";
import { useI18n } from "@/shared/i18n";
import { usePageRootClass } from "@/shared/hooks/use-page-root-class";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { Button } from "@/shared/ui/button";
import LanguageSwitcher from "@/shared/ui/language-switcher";

export default function LoginPage() {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const backLabel = locale === "ko" ? "뒤로가기" : "Back";

  usePageRootClass("page-shell-root");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await authApi.login({ username, password });
      navigate("/lobby", { replace: true });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response: { data: { message: string } } };
        setError(
          translateServerMessage(axiosErr.response.data.message, t, locale),
        );
      } else {
        setError(t("auth.login.errorFallback"));
      }
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/lobby", { replace: true });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#f7f2eb] px-6 py-10 text-[#272E37]">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="absolute left-6 top-6">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d9cdc1] bg-white text-[#272E37] shadow-[0_12px_32px_rgba(39,46,55,0.08)] transition hover:bg-[#f7f2eb]"
            aria-label={backLabel}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>

        <div className="absolute right-6 top-6">
          <LanguageSwitcher />
        </div>

        <BrandLogo variant="full" className="mx-auto w-85" />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              {t("auth.login.usernameLabel")}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              {t("auth.login.passwordLabel")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
              required
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full">
            {t("auth.login.submit")}
          </Button>
        </form>

        <p className="text-center text-sm">
          {t("auth.login.noAccount")}{" "}
          <Link to="/register" className="underline">
            {t("auth.login.signUp")}
          </Link>
        </p>
      </div>
    </div>
  );
}
