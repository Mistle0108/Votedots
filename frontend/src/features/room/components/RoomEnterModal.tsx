import { useState } from "react";
import { useI18n } from "@/shared/i18n";

interface RoomEnterModalProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onEnterRoom: (accessCode: string) => Promise<void>;
}

export default function RoomEnterModal({
  open,
  loading,
  error,
  onClose,
  onEnterRoom,
}: RoomEnterModalProps) {
  const { t } = useI18n();
  const [entryValue, setEntryValue] = useState("");

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-7 shadow-[0_30px_100px_rgba(39,46,55,0.28)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-[#272E37]">
            {t("lobby.roomEnter.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-[#7b6b62]"
          >
            {t("lobby.roomEnter.close")}
          </button>
        </div>

        <input
          type="text"
          value={entryValue}
          onChange={(event) => setEntryValue(event.target.value.toUpperCase())}
          placeholder={t("lobby.roomEnter.placeholder")}
          className="mt-5 h-12 w-full rounded-2xl border border-[#d9cdc1] bg-white px-4 text-sm text-[#272E37] outline-none"
          style={{ colorScheme: "light" }}
        />
        {error ? <p className="mt-3 text-sm text-[#d14d28]">{error}</p> : null}
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            const trimmed = entryValue.trim().toUpperCase();

            if (!trimmed) {
              return;
            }

            await onEnterRoom(trimmed);
          }}
          className="mt-6 w-full rounded-2xl bg-[#272E37] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? t("lobby.roomEnter.entering") : t("lobby.roomEnter.enter")}
        </button>
      </div>
    </div>
  );
}
