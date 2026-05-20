import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "@/features/auth";
import {
  isRegisterFormValid,
  validateRegisterForm,
} from "@/features/auth/model/register.validation";
import { getSiteContent } from "@/shared/content/site-content";
import { useI18n } from "@/shared/i18n";
import { usePageRootClass } from "@/shared/hooks/use-page-root-class";
import { translateServerMessage } from "@/shared/i18n/server-messages";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { Button } from "@/shared/ui/button";
import LanguageSwitcher from "@/shared/ui/language-switcher";

const REGISTER_COPY = {
  ko: {
    ageCheckboxLabel: "만 14세 이상입니다.",
    termsCheckboxLabel: "서비스 이용약관에 동의합니다.",
    termsSectionTitle: "서비스 이용약관",
    collectionSectionTitle: "개인정보 수집 및 이용 안내",
    viewDetailsLabel: "내용 보기",
    closeDetailsLabel: "내용 닫기",
    collectionItemsLabel: "수집 항목",
    collectionItemsValue: "아이디, 닉네임, 비밀번호",
    collectionPurposeLabel: "이용 목적",
    collectionPurposeValue:
      "회원가입, 로그인 및 이용자 식별, 만 14세 이상 여부 확인, 서비스 이용약관 동의 이력 확인",
    collectionRetentionLabel: "보유 기간",
    collectionRetentionValue:
      "아이디, 닉네임, 비밀번호 및 서비스 이용약관 동의 이력은 회원 탈퇴 시까지 보관합니다.",
    privacyGuidePrefix: "자세한 내용은 ",
    privacyGuideLink: "개인정보처리방침",
    privacyGuideSuffix: "에서 확인해 주세요.",
    ageConfirmationRequired: "만 14세 이상 여부를 확인해 주세요.",
    termsAgreementRequired: "서비스 이용약관에 동의해 주세요.",
  },
  en: {
    ageCheckboxLabel: "I confirm that I am at least 14 years old.",
    termsCheckboxLabel: "I agree to the Terms of Service.",
    termsSectionTitle: "Terms of Service",
    collectionSectionTitle: "Privacy Collection Notice",
    viewDetailsLabel: "View details",
    closeDetailsLabel: "Hide details",
    collectionItemsLabel: "Collected items",
    collectionItemsValue: "Username, nickname, password",
    collectionPurposeLabel: "Purpose",
    collectionPurposeValue:
      "Account registration, sign-in and user identification, confirming that the user is at least 14 years old, and recording acceptance of the Terms of Service",
    collectionRetentionLabel: "Retention period",
    collectionRetentionValue:
      "Username, nickname, password, and the Terms of Service consent record are retained until account withdrawal.",
    privacyGuidePrefix: "For more details, please review the ",
    privacyGuideLink: "Privacy Policy",
    privacyGuideSuffix: ".",
    ageConfirmationRequired: "Please confirm that you are at least 14 years old.",
    termsAgreementRequired: "Please agree to the Terms of Service.",
  },
} as const;

type RegisterErrorKey =
  | "auth.register.usernameRule"
  | "auth.register.nicknameRule"
  | "auth.register.passwordRule"
  | "auth.register.termsAgreementRequired"
  | "auth.register.ageConfirmationRequired";

function RegisterAccordion({
  title,
  openLabel,
  closeLabel,
  children,
}: {
  title: string;
  openLabel: string;
  closeLabel: string;
  children: ReactNode;
}) {
  return (
    <details className="document-readable-font group rounded border border-gray-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
        <span className="font-medium text-gray-700">{title}</span>
        <span className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 transition group-hover:border-gray-400 group-hover:text-gray-800">
          <span className="group-open:hidden">{openLabel}</span>
          <span className="hidden group-open:inline">{closeLabel}</span>
        </span>
      </summary>

      <div className="border-t border-gray-200 px-3 py-3 text-sm leading-6 text-gray-600">
        {children}
      </div>
    </details>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const siteContent = getSiteContent(locale);
  const copy = REGISTER_COPY[locale];
  const privacyPath = `/${locale}/privacy`;
  const backLabel = locale === "ko" ? "뒤로가기" : "Back";

  usePageRootClass("page-shell-root");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isAge14OrOlderConfirmed, setIsAge14OrOlderConfirmed] =
    useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({
    username: false,
    nickname: false,
    password: false,
    acceptedTerms: false,
    isAge14OrOlderConfirmed: false,
  });

  const formValues = {
    username,
    nickname,
    password,
    acceptedTerms,
    isAge14OrOlderConfirmed,
  };
  const fieldErrors = validateRegisterForm(formValues);
  const canSubmit = isRegisterFormValid(formValues) && !submitting;

  const getFieldErrorMessage = (errorKey: string | null) => {
    if (!errorKey) {
      return null;
    }

    switch (errorKey as RegisterErrorKey) {
      case "auth.register.usernameRule":
      case "auth.register.nicknameRule":
      case "auth.register.passwordRule":
        return t(errorKey);
      case "auth.register.termsAgreementRequired":
        return copy.termsAgreementRequired;
      case "auth.register.ageConfirmationRequired":
        return copy.ageConfirmationRequired;
      default:
        return null;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setTouched({
      username: true,
      nickname: true,
      password: true,
      acceptedTerms: true,
      isAge14OrOlderConfirmed: true,
    });

    if (!isRegisterFormValid(formValues)) {
      return;
    }

    setSubmitting(true);

    try {
      await authApi.register({
        username,
        password,
        nickname,
        acceptedTerms,
        isAge14OrOlderConfirmed,
        termsAcceptedLocale: locale,
      });
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

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/lobby", { replace: true });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#f7f2eb] px-4 py-8 text-[#272E37]">
      <div className="flex w-full max-w-sm flex-col gap-6 pb-8">
        <div className="absolute left-4 top-6">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d9cdc1] bg-white text-[#272E37] shadow-[0_12px_32px_rgba(39,46,55,0.08)] transition hover:bg-[#f7f2eb]"
            aria-label={backLabel}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>

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
                ? getFieldErrorMessage(fieldErrors.username)
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
                ? getFieldErrorMessage(fieldErrors.nickname)
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
                ? getFieldErrorMessage(fieldErrors.password)
                : t("auth.register.passwordHint")}
            </p>
          </div>

          <label className="flex items-start gap-3 rounded border border-gray-200 px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={isAge14OrOlderConfirmed}
              onChange={(e) => {
                setIsAge14OrOlderConfirmed(e.target.checked);
                setError("");
              }}
              onBlur={() =>
                setTouched((prev) => ({
                  ...prev,
                  isAge14OrOlderConfirmed: true,
                }))
              }
              className="mt-0.5 h-4 w-4"
              required
            />
            <span className="flex-1 text-gray-700">{copy.ageCheckboxLabel}</span>
          </label>
          {touched.isAge14OrOlderConfirmed &&
          fieldErrors.isAge14OrOlderConfirmed ? (
            <p className="text-xs text-red-500">
              {getFieldErrorMessage(fieldErrors.isAge14OrOlderConfirmed)}
            </p>
          ) : null}

          <label className="flex items-start gap-3 rounded border border-gray-200 px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => {
                setAcceptedTerms(e.target.checked);
                setError("");
              }}
              onBlur={() =>
                setTouched((prev) => ({
                  ...prev,
                  acceptedTerms: true,
                }))
              }
              className="mt-0.5 h-4 w-4"
              required
            />
            <span className="flex-1 text-gray-700">
              {copy.termsCheckboxLabel}
            </span>
          </label>
          {touched.acceptedTerms && fieldErrors.acceptedTerms ? (
            <p className="text-xs text-red-500">
              {getFieldErrorMessage(fieldErrors.acceptedTerms)}
            </p>
          ) : null}

          <div className="flex flex-col gap-3">
            <RegisterAccordion
              title={copy.termsSectionTitle}
              openLabel={copy.viewDetailsLabel}
              closeLabel={copy.closeDetailsLabel}
            >
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-800">
                  {siteContent.infoPages.terms.lead}
                </p>
                {siteContent.infoPages.terms.sections.map((section) => (
                  <section key={section.heading} className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-800">
                      {section.heading}
                    </h3>
                    {section.paragraphs.map((paragraph, index) => (
                      <p key={`${section.heading}-${index}`}>{paragraph}</p>
                    ))}
                  </section>
                ))}
              </div>
            </RegisterAccordion>

            <RegisterAccordion
              title={copy.collectionSectionTitle}
              openLabel={copy.viewDetailsLabel}
              closeLabel={copy.closeDetailsLabel}
            >
              <div className="space-y-3">
                <p>
                  <span className="font-semibold text-gray-800">
                    {copy.collectionItemsLabel}:{" "}
                  </span>
                  {copy.collectionItemsValue}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">
                    {copy.collectionPurposeLabel}:{" "}
                  </span>
                  {copy.collectionPurposeValue}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">
                    {copy.collectionRetentionLabel}:{" "}
                  </span>
                  {copy.collectionRetentionValue}
                </p>
                <p>
                  {copy.privacyGuidePrefix}
                  <Link
                    to={privacyPath}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {copy.privacyGuideLink}
                  </Link>
                  {copy.privacyGuideSuffix}
                </p>
              </div>
            </RegisterAccordion>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {t("auth.register.submit")}
          </Button>
        </form>

        <p className="pt-2 text-center text-sm">
          {t("auth.register.hasAccount")}{" "}
          <Link to="/login" className="underline">
            {t("auth.register.login")}
          </Link>
        </p>
      </div>
    </div>
  );
}
