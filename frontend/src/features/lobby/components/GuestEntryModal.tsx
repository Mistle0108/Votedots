import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/shared/i18n";

interface GuestEntryModalProps {
  open: boolean;
  loading: boolean;
  blocked?: boolean;
  error: string | null;
  scopeLabel: string;
  onClose: () => void;
  onSubmit: (nickname: string) => Promise<void>;
}

export default function GuestEntryModal({
  open,
  loading,
  blocked = false,
  error,
  scopeLabel,
  onClose,
  onSubmit,
}: GuestEntryModalProps) {
  const { locale, t } = useI18n();
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setNickname("");
  }, [open, scopeLabel]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-7 shadow-[0_30px_100px_rgba(39,46,55,0.28)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-[#272E37]">
            {t("lobby.guestEntry.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-[#7b6b62]"
          >
            {t("common.close")}
          </button>
        </div>

        <p className="mt-3 text-sm leading-6 text-[#5f6368]">
          {t("lobby.guestEntry.description", { scope: scopeLabel })}
        </p>

        <div className="mt-5">
          <label
            htmlFor="guest-entry-nickname"
            className="text-sm font-semibold text-[#272E37]"
          >
            {t("lobby.guestEntry.nicknameLabel")}
          </label>
          <input
            id="guest-entry-nickname"
            type="text"
            value={nickname}
            disabled={loading || blocked}
            onChange={(event) => setNickname(event.target.value)}
            placeholder={t("lobby.guestEntry.nicknamePlaceholder")}
            className="mt-2 h-12 w-full rounded-2xl border border-[#d9cdc1] bg-white px-4 text-sm text-[#272E37] outline-none disabled:bg-[#f7f2eb] disabled:text-[#8c8277]"
            style={{ colorScheme: "light" }}
          />
          <p className="mt-2 text-xs leading-5 text-[#7b6b62]">
            {t("lobby.guestEntry.nicknameHint")}
          </p>
        </div>

        <p className="mt-5 text-xs leading-5 text-[#7b6b62]">
          {t("lobby.guestEntry.noticePrefix")}{" "}
          <Link
            to={`/${locale}/terms`}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#272E37] underline underline-offset-2"
          >
            {t("lobby.guestEntry.noticeTerms")}
          </Link>{" "}
          {t("lobby.guestEntry.noticeConnector")}{" "}
          <Link
            to={`/${locale}/privacy`}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#272E37] underline underline-offset-2"
          >
            {t("lobby.guestEntry.noticePrivacy")}
          </Link>
          {t("lobby.guestEntry.noticeSuffix")}
        </p>

        {error ? <p className="mt-3 text-sm text-[#d14d28]">{error}</p> : null}

        <button
          type="button"
          disabled={loading || blocked}
          onClick={async () => {
            const trimmed = nickname.trim();

            if (!trimmed) {
              return;
            }

            await onSubmit(trimmed);
          }}
          className="mt-6 w-full rounded-2xl bg-[#272E37] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading
            ? t("lobby.guestEntry.submitting")
            : t("lobby.guestEntry.submit")}
        </button>
      </div>
    </div>
  );
}
