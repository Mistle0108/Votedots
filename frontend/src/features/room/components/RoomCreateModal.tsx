import { useState } from "react";

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
  onClose: () => void;
  onCopyAccessCode: () => void;
  onEnterCreatedPrivateRoom: () => void;
  onSubmit: (payload: RoomCreateSubmitPayload) => void;
}

const PROFILE_OPTIONS = [
  { key: "config32", label: "32 x 32" },
  { key: "config64", label: "64 x 64" },
  { key: "config128", label: "128 x 128" },
  { key: "config256", label: "256 x 256" },
];

export default function RoomCreateModal({
  open,
  loading,
  error,
  generatedAccessCode,
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
                  className="h-12 rounded-2xl border border-[#d9cdc1] px-4 text-sm outline-none"
                >
                  {PROFILE_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
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
                  max={48}
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
              disabled={loading}
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
            {error ? (
              <p className="mt-4 text-sm text-[#d14d28]">{error}</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
