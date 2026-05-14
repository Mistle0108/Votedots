import { useEffect, useMemo, useState } from "react";
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
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"public" | "private">("public");
  const [profileKey, setProfileKey] = useState("config32");
  const [introPhaseSec, setIntroPhaseSec] = useState(30);
  const [totalRounds, setTotalRounds] = useState(10);
  const [votesPerRound, setVotesPerRound] = useState(20);

  const selectedProfile =
    profiles.find((profile) => profile.key === profileKey) ?? profiles[0] ?? null;

  useEffect(() => {
    if (profiles.length === 0) {
      return;
    }

    if (profiles.some((profile) => profile.key === profileKey)) {
      return;
    }

    setProfileKey(profiles[0]!.key);
  }, [profileKey, profiles]);

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

  useEffect(() => {
    if (!open || !selectedProfile) {
      return;
    }

    setIntroPhaseSec(selectedProfile.snapshot.phases.introPhaseSec);
    setTotalRounds(selectedProfile.snapshot.rules.totalRounds);
    setVotesPerRound(selectedProfile.snapshot.rules.votesPerRound);
  }, [open, profileKey, selectedProfile]);

  useEffect(() => {
    setTotalRounds((current) => Math.min(current, maxRounds));
  }, [maxRounds]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-xl rounded-[28px] bg-white p-7 shadow-[0_30px_100px_rgba(39,46,55,0.28)]">
        {generatedAccessCode ? (
          <>
            <h2 className="text-2xl font-semibold text-[#272E37]">
              Private room code
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
                Copy
              </button>
              <button
                type="button"
                onClick={onEnterCreatedPrivateRoom}
                className="flex-1 rounded-2xl bg-[#272E37] px-4 py-3 text-sm font-semibold text-white"
              >
                Enter now
              </button>
            </div>
            {error ? (
              <p className="mt-4 text-sm text-[#d14d28]">{error}</p>
            ) : null}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[#272E37]">
                Create room
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-semibold text-[#7b6b62]"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Room title"
                className="h-12 rounded-2xl border border-[#d9cdc1] px-4 text-sm outline-none"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <select
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as "public" | "private")
                  }
                  className="h-12 rounded-2xl border border-[#d9cdc1] px-4 text-sm outline-none"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
                <select
                  value={profileKey}
                  onChange={(event) => setProfileKey(event.target.value)}
                  disabled={profiles.length === 0}
                  className="h-12 rounded-2xl border border-[#d9cdc1] px-4 text-sm outline-none"
                >
                  {profiles.map((profile) => (
                    <option key={profile.key} value={profile.key}>
                      {profile.key === "test"
                        ? "Test config"
                        : `${profile.snapshot.board.gridSizeX} x ${profile.snapshot.board.gridSizeY}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <input
                  type="number"
                  min={0}
                  max={300}
                  step={5}
                  value={introPhaseSec}
                  onChange={(event) =>
                    setIntroPhaseSec(Number(event.target.value))
                  }
                  className="h-12 rounded-2xl border border-[#d9cdc1] px-4 text-sm outline-none"
                />
                <input
                  type="number"
                  min={1}
                  max={maxRounds}
                  value={totalRounds}
                  onChange={(event) =>
                    setTotalRounds(Number(event.target.value))
                  }
                  className="h-12 rounded-2xl border border-[#d9cdc1] px-4 text-sm outline-none"
                />
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={votesPerRound}
                  onChange={(event) =>
                    setVotesPerRound(Number(event.target.value))
                  }
                  className="h-12 rounded-2xl border border-[#d9cdc1] px-4 text-sm outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={loading || profiles.length === 0}
              onClick={() =>
                onSubmit({
                  title,
                  type,
                  profileKey,
                  introPhaseSec,
                  totalRounds,
                  votesPerRound,
                })
              }
              className="mt-6 w-full rounded-2xl bg-[#272E37] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create"}
            </button>
            {profiles.length === 0 ? (
              <p className="mt-4 text-sm text-[#d14d28]">
                프로필 정보를 불러오지 못했습니다.
              </p>
            ) : null}
            {error ? (
              <p className="mt-4 text-sm text-[#d14d28]">{error}</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
