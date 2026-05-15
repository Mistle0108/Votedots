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

function renderManageInfo(
  manage: NonNullable<RoomDetailResponse["room"]["manage"]>,
  t: (key: string) => string,
) {
  return (
    <div className="mt-5 rounded-[20px] border border-[#e3d9cf] bg-white px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b6b62]">
        {t("lobby.roomList.manage.title")}
      </p>
      <div className="mt-3 grid gap-2 text-sm text-[#272E37]">
        <p>{t("lobby.roomList.manage.profile")}: {manage.settings.profileKey}</p>
        <p>{t("lobby.roomList.manage.intro")}: {manage.settings.introPhaseSec}초</p>
        <p>{t("lobby.roomList.manage.totalRounds")}: {manage.settings.totalRounds}</p>
        <p>{t("lobby.roomList.manage.votesPerRound")}: {manage.settings.votesPerRound}</p>
        <p>{t("lobby.roomList.manage.gameEndWait")}: {manage.settings.gameEndWaitSec}초</p>
        {manage.accessCode ? (
          <p>{t("lobby.roomList.manage.accessCode")}: {manage.accessCode}</p>
        ) : null}
      </div>
    </div>
  );
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
    <div className="grid min-h-[520px] gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[24px] border border-[#e3d9cf] bg-white p-4">
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
          <div className="mt-3 grid gap-2">
            {rooms.map((room) => {
              const selected = room.publicRoomNumber === selectedRoomNumber;

              return (
                <button
                  key={room.roomId}
                  type="button"
                  onClick={() => onSelectRoom(room.publicRoomNumber)}
                  className={`rounded-[20px] border px-4 py-3 text-left transition ${
                    selected
                      ? "border-[#272E37] bg-[#272E37] text-white"
                      : "border-[#e3d9cf] bg-[#fbf7f2] text-[#272E37]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        #{room.publicRoomNumber}
                      </span>
                      {room.isOwner ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            selected
                              ? "bg-white/16 text-white"
                              : "bg-[#272E37] text-white"
                          }`}
                        >
                          {t("lobby.roomList.owner")}
                        </span>
                      ) : null}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        selected ? "text-white/80" : "text-[#7b6b62]"
                      }`}
                    >
                      {getStatusLabel(room.status, t)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-1 text-sm font-medium">
                    {room.title}
                  </p>
                  <p
                    className={`mt-2 text-xs ${
                      selected ? "text-white/72" : "text-[#7b6b62]"
                    }`}
                  >
                    {room.type === "public"
                      ? t("lobby.roomList.publicType")
                      : t("lobby.roomList.privateType")}{" "}
                    ·{" "}
                    {t("lobby.roomList.currentParticipants", {
                      count: room.participantCount,
                    })}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-[24px] border border-[#e3d9cf] bg-[#fbf7f2] p-5">
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
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b6b62]">
              {t("lobby.roomList.privateTitle")}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <h3 className="text-2xl font-semibold text-[#272E37]">
                #{selectedRoomDetail.room.publicRoomNumber}
              </h3>
              {selectedRoomDetail.room.manage ? (
                <span className="rounded-full bg-[#272E37] px-2 py-0.5 text-xs font-semibold text-white">
                  {t("lobby.roomList.owner")}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-[#5f6368]">
              {t("lobby.roomList.privateDescription")}
            </p>
            {selectedRoomDetail.room.manage
              ? renderManageInfo(selectedRoomDetail.room.manage, t)
              : null}
            <input
              type="text"
              value={privateAccessCode}
              onChange={(event) =>
                onChangePrivateAccessCode(event.target.value.toUpperCase())
              }
              placeholder={t("lobby.roomList.privateAccessCodePlaceholder")}
              className="mt-5 h-12 w-full rounded-2xl border border-[#d9cdc1] bg-white px-4 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => void onEnterPrivateRoom()}
              className="mt-3 rounded-2xl bg-[#272E37] px-5 py-3 text-sm font-semibold text-white"
            >
              {t("lobby.roomList.enter")}
            </button>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[256px_minmax(0,1fr)]">
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

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b6b62]">
                {t("lobby.roomList.publicTitle")}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <h3 className="text-2xl font-semibold text-[#272E37]">
                  #{selectedRoomDetail.room.publicRoomNumber}{" "}
                  {selectedRoomDetail.room.title}
                </h3>
                {selectedRoomDetail.room.manage ? (
                  <span className="rounded-full bg-[#272E37] px-2 py-0.5 text-xs font-semibold text-white">
                    {t("lobby.roomList.owner")}
                  </span>
                ) : null}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-[#e3d9cf] bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b6b62]">
                    {t("lobby.roomList.field.canvas")}
                  </p>
                  <p className="mt-1 text-base font-semibold text-[#272E37]">
                    {selectedRoomDetail.room.canvas.gridX} x{" "}
                    {selectedRoomDetail.room.canvas.gridY}
                  </p>
                </div>
                <div className="rounded-[20px] border border-[#e3d9cf] bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b6b62]">
                    {t("lobby.roomList.field.round")}
                  </p>
                  <p className="mt-1 text-base font-semibold text-[#272E37]">
                    {selectedRoomDetail.room.canvas.currentRoundNumber ?? 0} /{" "}
                    {selectedRoomDetail.room.canvas.totalRounds}
                  </p>
                </div>
                <div className="rounded-[20px] border border-[#e3d9cf] bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b6b62]">
                    {t("lobby.roomList.field.participants")}
                  </p>
                  <p className="mt-1 text-base font-semibold text-[#272E37]">
                    {selectedRoomDetail.room.participantCount}
                  </p>
                </div>
                <div className="rounded-[20px] border border-[#e3d9cf] bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b6b62]">
                    {t("lobby.roomList.field.status")}
                  </p>
                  <p className="mt-1 text-base font-semibold text-[#272E37]">
                    {getStatusLabel(selectedRoomDetail.room.status, t)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onEnterPublicRoom(selectedRoomDetail.room.publicRoomNumber)
                }
                className="mt-5 rounded-2xl bg-[#272E37] px-5 py-3 text-sm font-semibold text-white"
              >
                {t("lobby.roomList.enterRoom")}
              </button>
              {selectedRoomDetail.room.manage
                ? renderManageInfo(selectedRoomDetail.room.manage, t)
                : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
