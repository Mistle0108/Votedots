import { useMemo, useState } from "react";
import { useI18n } from "@/shared/i18n";
import type { RoomConfigProfile } from "../api/room.api";

interface RoomCreateSubmitPayload {
  title: string;
  type: "public" | "private";
  profileKey: string;
  introPhaseSec: number;
  totalRounds: number;
  votesPerRound: number;
}

interface RoomCreateModalProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  generatedAccessCode: string | null;
  profiles: RoomConfigProfile[];
  onClose: () => void;
  onCopyAccessCode: () => void;
  onEnterCreatedPrivateRoom: () => void;
  onSubmit: (payload: RoomCreateSubmitPayload) => void;
}

export default function RoomCreateModal({
  open,
  loading,
  error,
  generatedAccessCode,
  profiles,
  onClose,
  onCopyAccessCode,
  onEnterCreatedPrivateRoom,
  onSubmit,
}: RoomCreateModalProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"public" | "private">("public");
  const [profileKey, setProfileKey] = useState("config32");
  const [introPhaseSecOverride, setIntroPhaseSecOverride] = useState<number | null>(null);
  const [totalRoundsOverride, setTotalRoundsOverride] = useState<number | null>(null);
  const [votesPerRoundOverride, setVotesPerRoundOverride] = useState<number | null>(null);

  const availableProfiles = useMemo(
    () =>
      profiles.filter(
        (profile) =>
          profile.snapshot.board.gridSizeX <= 256 &&
          profile.snapshot.board.gridSizeY <= 256,
      ),
    [profiles],
  );

  const resolvedProfileKey = useMemo(() => {
    if (availableProfiles.some((profile) => profile.key === profileKey)) {
      return profileKey;
    }

    return availableProfiles[0]?.key ?? "";
  }, [availableProfiles, profileKey]);

  const selectedProfile =
    availableProfiles.find((profile) => profile.key === resolvedProfileKey) ?? null;

  const introPhaseSec =
    introPhaseSecOverride ?? selectedProfile?.snapshot.phases.introPhaseSec ?? 30;

  const maxRounds = useMemo(() => {
    if (!selectedProfile) {
      return 1;
    }

    const roundCycleSec =
      selectedProfile.snapshot.phases.roundStartWaitSec +
      selectedProfile.snapshot.phases.roundDurationSec +
      selectedProfile.snapshot.phases.roundResultDelaySec;

    return Math.max(1, Math.floor((60 * 60 - introPhaseSec) / roundCycleSec));
  }, [introPhaseSec, selectedProfile]);

  const totalRounds = Math.min(
    totalRoundsOverride ?? selectedProfile?.snapshot.rules.totalRounds ?? 1,
    maxRounds,
  );

  const votesPerRound =
    votesPerRoundOverride ?? selectedProfile?.snapshot.rules.votesPerRound ?? 20;

  const handleProfileChange = (nextProfileKey: string) => {
    setProfileKey(nextProfileKey);
    setIntroPhaseSecOverride(null);
    setTotalRoundsOverride(null);
    setVotesPerRoundOverride(null);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-xl rounded-[28px] bg-white p-7 shadow-[0_30px_100px_rgba(39,46,55,0.28)]">
        {generatedAccessCode ? (
          <>
            <h2 className="text-2xl font-semibold text-[#272E37]">
              {t("lobby.roomCreate.generatedCodeTitle")}
            </h2>
            <div className="mt-5 rounded-[24px] border border-[#e3d9cf] bg-[#fbf7f2] px-5 py-6 text-center">
              <p className="text-[28px] font-semibold tracking-[0.16em] text-[#272E37]">
                {generatedAccessCode}
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onCopyAccessCode}
                className="flex-1 rounded-2xl border border-[#d9cdc1] px-4 py-3 text-sm font-semibold text-[#272E37]"
              >
                {t("lobby.roomCreate.copyCode")}
              </button>
              <button
                type="button"
                onClick={onEnterCreatedPrivateRoom}
                className="flex-1 rounded-2xl bg-[#272E37] px-4 py-3 text-sm font-semibold text-white"
              >
                {t("lobby.roomCreate.enterNow")}
              </button>
            </div>
            {error ? <p className="mt-4 text-sm text-[#d14d28]">{error}</p> : null}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[#272E37]">
                {t("lobby.roomCreate.title")}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-semibold text-[#7b6b62]"
              >
                {t("lobby.roomCreate.close")}
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[#272E37]">
                  {t("lobby.roomCreate.field.title")}
                </span>
                <input
                  type="text"
                  maxLength={30}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t("lobby.roomCreate.placeholder.title")}
                  className="h-12 rounded-2xl border border-[#d9cdc1] bg-white px-4 text-sm text-[#272E37] outline-none"
                  style={{ colorScheme: "light" }}
                />
                <span className="text-xs text-[#7b6b62]">
                  {t("lobby.roomCreate.titleHint")}
                </span>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[#272E37]">
                    {t("lobby.roomCreate.field.type")}
                  </span>
                  <select
                    value={type}
                    onChange={(event) =>
                      setType(event.target.value as "public" | "private")
                    }
                    className="h-12 rounded-2xl border border-[#d9cdc1] bg-white px-4 text-sm text-[#272E37] outline-none"
                    style={{ colorScheme: "light" }}
                  >
                    <option value="public">{t("lobby.roomCreate.type.public")}</option>
                    <option value="private">
                      {t("lobby.roomCreate.type.private")}
                    </option>
                  </select>
                  <div className="rounded-[20px] border border-[#e3d9cf] bg-[#fbf7f2] px-4 py-3 lg:hidden">
                    <h3 className="text-sm font-semibold text-[#272E37]">
                      {t("lobby.roomCreate.privateAccessCodeTitle")}
                    </h3>
                    <span className="mt-2 block whitespace-pre-line text-xs leading-5 text-[#7b6b62]">
                      {t("lobby.roomCreate.privateAccessCodeDescription")}
                    </span>
                  </div>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[#272E37]">
                    {t("lobby.roomCreate.field.canvasSize")}
                  </span>
                  <select
                    value={resolvedProfileKey}
                    onChange={(event) => handleProfileChange(event.target.value)}
                    disabled={availableProfiles.length === 0}
                    className="h-12 rounded-2xl border border-[#d9cdc1] bg-white px-4 text-sm text-[#272E37] outline-none"
                    style={{ colorScheme: "light" }}
                  >
                    {availableProfiles.map((profile) => (
                      <option key={profile.key} value={profile.key}>
                        {`${profile.snapshot.board.gridSizeX} x ${profile.snapshot.board.gridSizeY}`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="grid gap-4">
                  <div className="grid min-h-full rounded-[24px] border border-[#e3d9cf] bg-[#fbf7f2]">
                    <div className="px-5 py-4">
                      <h3 className="text-sm font-semibold text-[#272E37]">
                        {t("lobby.roomCreate.defaultPhaseInfoTitle")}
                      </h3>
                      <div className="mt-4 grid gap-3 text-sm text-[#5f6368]">
                        <div className="flex items-center justify-between gap-4">
                          <span>{t("lobby.roomCreate.phase.roundDuration")}</span>
                          <span className="font-semibold text-[#272E37]">
                            {selectedProfile?.snapshot.phases.roundDurationSec ?? 0}
                            {t("lobby.roomCreate.unit.seconds")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>{t("lobby.roomCreate.phase.roundResultDelay")}</span>
                          <span className="font-semibold text-[#272E37]">
                            {selectedProfile?.snapshot.phases.roundResultDelaySec ?? 0}
                            {t("lobby.roomCreate.unit.seconds")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>{t("lobby.roomCreate.phase.roundStartWait")}</span>
                          <span className="font-semibold text-[#272E37]">
                            {selectedProfile?.snapshot.phases.roundStartWaitSec ?? 0}
                            {t("lobby.roomCreate.unit.seconds")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="hidden min-h-full rounded-[24px] border border-[#e3d9cf] bg-[#fbf7f2] lg:grid">
                    <div className="flex flex-col justify-center px-5 py-4">
                      <h3 className="text-sm font-semibold text-[#272E37]">
                        {t("lobby.roomCreate.privateAccessCodeTitle")}
                      </h3>
                      <span className="mt-3 whitespace-pre-line text-sm leading-6 text-[#7b6b62]">
                        {t("lobby.roomCreate.privateAccessCodeDescription")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-[#272E37]">
                      {t("lobby.roomCreate.field.introPhaseSec")}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={300}
                      step={5}
                      value={introPhaseSec}
                      onChange={(event) =>
                        setIntroPhaseSecOverride(Number(event.target.value))
                      }
                      className="h-12 rounded-2xl border border-[#d9cdc1] bg-white px-4 text-sm text-[#272E37] outline-none"
                      style={{ colorScheme: "light" }}
                    />
                    <span className="text-xs text-[#7b6b62]">
                      {t("lobby.roomCreate.introHint")}
                    </span>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-[#272E37]">
                      {t("lobby.roomCreate.field.totalRounds")}
                    </span>
                    <select
                      value={totalRounds}
                      onChange={(event) =>
                        setTotalRoundsOverride(Number(event.target.value))
                      }
                      className="h-12 rounded-2xl border border-[#d9cdc1] bg-white px-4 text-sm text-[#272E37] outline-none"
                      style={{ colorScheme: "light" }}
                    >
                      {Array.from({ length: maxRounds }, (_, index) => index + 1).map(
                        (round) => (
                          <option key={round} value={round}>
                            {round}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-[#272E37]">
                      {t("lobby.roomCreate.field.votesPerRound")}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={votesPerRound}
                      onChange={(event) =>
                        setVotesPerRoundOverride(Number(event.target.value))
                      }
                      className="h-12 rounded-2xl border border-[#d9cdc1] bg-white px-4 text-sm text-[#272E37] outline-none"
                      style={{ colorScheme: "light" }}
                    />
                    <span className="text-xs text-[#7b6b62]">
                      {t("lobby.roomCreate.votesPerRoundHint")}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={loading || availableProfiles.length === 0}
              onClick={() =>
                onSubmit({
                  title,
                  type,
                  profileKey: resolvedProfileKey,
                  introPhaseSec,
                  totalRounds,
                  votesPerRound,
                })
              }
              className="mt-6 w-full rounded-2xl bg-[#272E37] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? t("lobby.roomCreate.creating") : t("lobby.roomCreate.create")}
            </button>
            {availableProfiles.length === 0 ? (
              <p className="mt-4 text-sm text-[#d14d28]">
                {t("lobby.roomCreate.noProfiles")}
              </p>
            ) : null}
            {error ? <p className="mt-4 text-sm text-[#d14d28]">{error}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
