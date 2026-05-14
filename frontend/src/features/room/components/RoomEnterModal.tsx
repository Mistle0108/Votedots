import { useState } from "react";

interface RoomEnterModalProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onResolveRoomNumber: (publicRoomNumber: number) => Promise<"entered" | "private">;
  onEnterPrivateRoom: (accessCode: string) => Promise<void>;
}

export default function RoomEnterModal({
  open,
  loading,
  error,
  onClose,
  onResolveRoomNumber,
  onEnterPrivateRoom,
}: RoomEnterModalProps) {
  const [step, setStep] = useState<"room-number" | "private-code">(
    "room-number",
  );
  const [roomNumber, setRoomNumber] = useState("");
  const [accessCode, setAccessCode] = useState("");

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-7 shadow-[0_30px_100px_rgba(39,46,55,0.28)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-[#272E37]">Enter room</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-[#7b6b62]"
          >
            Close
          </button>
        </div>

        {step === "room-number" ? (
          <>
            <p className="mt-4 text-sm leading-6 text-[#5f6368]">
              Enter a room number. Public rooms enter immediately. Private
              rooms continue to the access code step.
            </p>
            <input
              type="number"
              min={1}
              value={roomNumber}
              onChange={(event) => setRoomNumber(event.target.value)}
              placeholder="Room number"
              className="mt-5 h-12 w-full rounded-2xl border border-[#d9cdc1] px-4 text-sm outline-none"
            />
            {error ? (
              <p className="mt-3 text-sm text-[#d14d28]">{error}</p>
            ) : null}
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                const nextRoomNumber = Number(roomNumber);

                if (!Number.isInteger(nextRoomNumber) || nextRoomNumber <= 0) {
                  return;
                }

                try {
                  const nextStep = await onResolveRoomNumber(nextRoomNumber);

                  if (nextStep === "private") {
                    setStep("private-code");
                  }
                } catch {
                  return;
                }
              }}
              className="mt-6 w-full rounded-2xl bg-[#272E37] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Checking..." : "Next"}
            </button>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm leading-6 text-[#5f6368]">
              This room requires an access code.
            </p>
            <input
              type="text"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value.toUpperCase())}
              placeholder="Access code"
              className="mt-5 h-12 w-full rounded-2xl border border-[#d9cdc1] px-4 text-sm outline-none"
            />
            {error ? (
              <p className="mt-3 text-sm text-[#d14d28]">{error}</p>
            ) : null}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setStep("room-number")}
                className="flex-1 rounded-2xl border border-[#d9cdc1] px-4 py-3 text-sm font-semibold text-[#272E37]"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void onEnterPrivateRoom(accessCode)}
                className="flex-1 rounded-2xl bg-[#272E37] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? "Entering..." : "Enter"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
