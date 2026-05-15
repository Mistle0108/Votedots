import { Lock } from "lucide-react";
import type { RoomDetailResponse, RoomListItem } from "../api/room.api";
import { useI18n } from "@/shared/i18n";

interface RoomListSectionProps {
  rooms: RoomListItem[];
  selectedRoomNumber: number | null;
  selectedRoomDetail: RoomDetailResponse | null;
  loading: boolean;
  error: string | null;
  detailLoading: boolean;
  detailError: string | null;
  privateAccessCode: string;
  onChangePrivateAccessCode: (value: string) => void;
  onSelectRoom: (publicRoomNumber: number) => void;
  onEnterPublicRoom: (publicRoomNumber: number) => void;
  onEnterPrivateRoom: (accessCode?: string) => void | Promise<void>;
}

function getStatusLabel(
  status: RoomListItem["status"],
  t: (key: string) => string,
): string {
  switch (status) {
    case "active":
      return t("lobby.roomList.status.active");
    case "game_end_wait":
      return t("lobby.roomList.status.gameEndWait");
    case "expired":
      return t("lobby.roomList.status.expired");
  }
}

export default function RoomListSection({
  rooms,
  selectedRoomNumber,
  selectedRoomDetail,
  loading,
  error,
  detailLoading,
  detailError,
  privateAccessCode,
  onChangePrivateAccessCode,
  onSelectRoom,
  onEnterPublicRoom,
  onEnterPrivateRoom,
}: RoomListSectionProps) {
  const { t } = useI18n();

  return (
    <div className="grid h-full min-h-0 gap-5 xl:grid-cols-[1.4fr_0.6fr]">
      <div className="flex min-h-0 flex-col rounded-[24px] border border-[#e3d9cf] bg-white p-4">
        <h2 className="px-2 text-sm font-semibold text-[#272E37]">
          {t("lobby.roomList.title")}
        </h2>
        {loading ? (
          <div className="px-2 py-6 text-sm text-[#5f6368]">
            {t("lobby.roomList.loading")}
          </div>
        ) : error ? (
          <div className="px-2 py-6 text-sm text-[#d14d28]">{error}</div>
        ) : (
          <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {rooms.map((room) => {
              const selected = room.publicRoomNumber === selectedRoomNumber;

              return (
                <button
                  key={room.roomId}
                  type="button"
                  onClick={() => onSelectRoom(room.publicRoomNumber)}
                  className={`h-[67px] rounded-[20px] border px-4 py-3 text-left transition ${
                    selected
                      ? "border-[#272E37] bg-[#272E37] text-white"
                      : "border-[#e3d9cf] bg-[#fbf7f2] text-[#272E37]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="text-sm font-semibold">
                        #{room.publicRoomNumber}
                      </span>
                      {room.type === "private" ? (
                        <Lock
                          size={16}
                          className={selected ? "text-white" : "text-[#7b6b62]"}
                        />
                      ) : null}
                      <span className="h-5 min-w-0 flex-1 truncate text-sm font-medium leading-5">
                        {room.title}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {room.isOwner ? (
                        <span
                          className={`rounded-full px-2.5 py-1 text-sm font-semibold ${
                            selected
                              ? "bg-white/16 text-white"
                              : "bg-[#272E37] text-white"
                          }`}
                        >
                          {t("lobby.roomList.owner")}
                        </span>
                      ) : null}
                      <span
                        className={`text-sm font-medium ${
                          selected ? "text-white/80" : "text-[#7b6b62]"
                        }`}
                      >
                        {getStatusLabel(room.status, t)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex min-h-0 items-center justify-center rounded-[24px] border border-[#e3d9cf] bg-[#fbf7f2] p-5">
        {detailLoading ? (
          <div className="text-sm text-[#5f6368]">
            {t("lobby.roomList.detailLoading")}
          </div>
        ) : detailError ? (
          <div className="text-sm text-[#d14d28]">{detailError}</div>
        ) : !selectedRoomDetail ? (
          <div className="text-sm text-[#5f6368]">
            {t("lobby.roomList.noneSelected")}
          </div>
        ) : selectedRoomDetail.room.type === "private" ? (
          <div className="w-full max-w-md">
            <p className="mt-3 text-sm leading-6 text-[#5f6368]">
              {t("lobby.roomList.privateDescription")}
            </p>
            {selectedRoomDetail.room.manage?.accessCode ? (
              <div className="mt-5 rounded-2xl border border-[#d9cdc1] bg-white px-4 py-3">
                <p className="text-xs font-semibold text-[#7b6b62]">
                  {t("lobby.roomList.manage.accessCode")}
                </p>
                <p className="mt-2 text-sm font-semibold tracking-[0.08em] text-[#272E37]">
                  {selectedRoomDetail.room.manage.accessCode}
                </p>
              </div>
            ) : (
              <input
                type="text"
                value={privateAccessCode}
                onChange={(event) =>
                  onChangePrivateAccessCode(event.target.value.toUpperCase())
                }
                placeholder={t("lobby.roomList.privateAccessCodePlaceholder")}
                className="mt-5 h-12 w-full rounded-2xl border border-[#d9cdc1] bg-white px-4 text-sm outline-none"
              />
            )}
            <button
              type="button"
              onClick={() =>
                void onEnterPrivateRoom(
                  selectedRoomDetail.room.manage?.accessCode ?? undefined,
                )
              }
              className="mt-3 w-full rounded-2xl bg-[#272E37] px-5 py-3 text-sm font-semibold text-white"
            >
              {t("lobby.roomList.enter")}
            </button>
          </div>
        ) : (
          <div className="grid w-full justify-center gap-5">
            <div className="overflow-hidden rounded-[24px] border border-[#e3d9cf] bg-white">
              {selectedRoomDetail.room.canvas.snapshotUrl ||
              selectedRoomDetail.room.canvas.templateImageUrl ? (
                <img
                  src={
                    selectedRoomDetail.room.canvas.snapshotUrl ??
                    selectedRoomDetail.room.canvas.templateImageUrl ??
                    undefined
                  }
                  alt="room preview"
                  className="block h-[256px] w-[256px]"
                  style={{ imageRendering: "pixelated" }}
                  draggable={false}
                />
              ) : (
                <div className="flex h-[256px] w-[256px] items-center justify-center text-sm text-[#7b6b62]">
                  {t("lobby.roomList.previewEmpty")}
                </div>
              )}
            </div>

            <div className="max-w-[256px]">
              <div className="w-full rounded-[20px] border border-[#e3d9cf] bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-4 border-b border-[#efe6dd] py-2 first:pt-0 last:border-b-0 last:pb-0">
                  <p className="text-sm font-semibold text-[#7b6b62]">
                    {t("lobby.roomList.field.canvas")}
                  </p>
                  <p className="text-sm font-semibold text-[#272E37]">
                    {selectedRoomDetail.room.canvas.gridX} x{" "}
                    {selectedRoomDetail.room.canvas.gridY}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-[#efe6dd] py-2 first:pt-0 last:border-b-0 last:pb-0">
                  <p className="text-sm font-semibold text-[#7b6b62]">
                    {t("lobby.roomList.field.round")}
                  </p>
                  <p className="text-sm font-semibold text-[#272E37]">
                    {selectedRoomDetail.room.canvas.currentRoundNumber ?? 0} /{" "}
                    {selectedRoomDetail.room.canvas.totalRounds}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
                  <p className="text-sm font-semibold text-[#7b6b62]">
                    {t("lobby.roomList.field.participants")}
                  </p>
                  <p className="text-sm font-semibold text-[#272E37]">
                    {selectedRoomDetail.room.participantCount}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onEnterPublicRoom(selectedRoomDetail.room.publicRoomNumber)
                }
                className="mt-5 w-full rounded-2xl bg-[#272E37] px-5 py-3 text-sm font-semibold text-white"
              >
                {t("lobby.roomList.enterRoom")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
