import { Lock, X } from "lucide-react";
import { useRef, type TouchEvent } from "react";
import type { RoomDetailResponse, RoomListItem } from "../api/room.api";
import { useI18n } from "@/shared/i18n";

const MOBILE_SWIPE_THRESHOLD_PX = 40;

interface RoomListSectionProps {
  rooms: RoomListItem[];
  selectedRoomId: number | null;
  selectedRoomDetail: RoomDetailResponse | null;
  loading: boolean;
  error: string | null;
  detailLoading: boolean;
  detailError: string | null;
  privateAccessCode: string;
  onChangePrivateAccessCode: (value: string) => void;
  onSelectRoom: (roomId: number) => void;
  onEnterPublicRoom: (roomId: number) => void | Promise<void>;
  onEnterPrivateRoom: (accessCode?: string) => void | Promise<void>;
  mobileMode?: boolean;
  page?: number;
  totalPages?: number;
  onChangePage?: (page: number) => void;
  mobileDetailOpen?: boolean;
  onCloseMobileDetail?: () => void;
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

function getVisiblePageNumbers(
  currentPage: number,
  totalPages: number,
  windowSize = 3,
) {
  if (totalPages <= 0) {
    return [];
  }

  const startPage = Math.floor((currentPage - 1) / windowSize) * windowSize + 1;
  const endPage = Math.min(totalPages, startPage + windowSize - 1);

  return Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index,
  );
}

function RoomListPagination({
  page,
  totalPages,
  onChangePage,
  previousLabel,
  nextLabel,
}: {
  page: number;
  totalPages: number;
  onChangePage: (page: number) => void;
  previousLabel: string;
  nextLabel: string;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const visiblePages = getVisiblePageNumbers(page, totalPages, 3);
  const currentWindowStart = visiblePages[0] ?? 1;
  const currentWindowEnd = visiblePages[visiblePages.length - 1] ?? totalPages;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 rounded-[24px] border border-[#ead7c8] bg-white px-3 py-3">
      <button
        type="button"
        disabled={currentWindowStart <= 1}
        onClick={() => onChangePage(Math.max(currentWindowStart - 3, 1))}
        className="inline-flex h-10 min-w-10 items-center justify-center border-b-2 border-transparent px-3 text-sm font-semibold text-[#6c5a4d] transition hover:border-[#d9c7b7] hover:text-[#2d2d2d] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={previousLabel}
      >
        &lt;
      </button>

      <div className="flex items-center gap-0.5">
        {visiblePages.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onChangePage(pageNumber)}
            className={[
              "inline-flex h-10 min-w-10 items-center justify-center border-b-2 px-3 text-sm font-semibold transition",
              pageNumber === page
                ? "border-[#2d2d2d] text-[#2d2d2d]"
                : "border-transparent text-[#6c5a4d] hover:border-[#d9c7b7] hover:text-[#2d2d2d]",
            ].join(" ")}
          >
            {pageNumber}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={currentWindowEnd >= totalPages}
        onClick={() => onChangePage(Math.min(currentWindowStart + 3, totalPages))}
        className="inline-flex h-10 min-w-10 items-center justify-center border-b-2 border-transparent px-3 text-sm font-semibold text-[#6c5a4d] transition hover:border-[#d9c7b7] hover:text-[#2d2d2d] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={nextLabel}
      >
        &gt;
      </button>
    </div>
  );
}

function RoomDetailContent({
  selectedRoomDetail,
  detailLoading,
  detailError,
  privateAccessCode,
  onChangePrivateAccessCode,
  onEnterPrivateRoom,
  onEnterPublicRoom,
  t,
}: {
  selectedRoomDetail: RoomDetailResponse | null;
  detailLoading: boolean;
  detailError: string | null;
  privateAccessCode: string;
  onChangePrivateAccessCode: (value: string) => void;
  onEnterPrivateRoom: (accessCode?: string) => void | Promise<void>;
  onEnterPublicRoom: (roomId: number) => void | Promise<void>;
  t: (key: string) => string;
}) {
  if (detailLoading) {
    return <div className="text-sm text-[#5f6368]">{t("lobby.roomList.detailLoading")}</div>;
  }

  if (detailError) {
    return <div className="text-sm text-[#d14d28]">{detailError}</div>;
  }

  if (!selectedRoomDetail) {
    return (
      <div className="flex min-h-[180px] w-full items-center justify-center text-center text-[21px] leading-7 text-[#5f6368]">
        {t("lobby.roomList.noneSelected")}
      </div>
    );
  }

  if (selectedRoomDetail.room.type === "private") {
    const ownerAccessCode = selectedRoomDetail.room.manage?.accessCode?.trim() ?? "";
    const canEnterWithoutCode = ownerAccessCode.length > 0;

    return (
      <div className="w-full max-w-md">
        {selectedRoomDetail.room.manage?.accessCode ? (
          <div className="rounded-2xl border border-[#d9cdc1] bg-white px-4 py-3">
            <p className="text-xs font-semibold text-[#7b6b62]">
              {t("lobby.roomList.manage.accessCode")}
            </p>
            <p className="mt-2 text-sm font-semibold tracking-[0.08em] text-[#272E37]">
              {selectedRoomDetail.room.manage.accessCode}
            </p>
          </div>
        ) : null}
        {!canEnterWithoutCode ? (
          <input
            type="text"
            value={privateAccessCode}
            onChange={(event) =>
              onChangePrivateAccessCode(event.target.value.toUpperCase())
            }
            placeholder={t("lobby.roomList.privateAccessCodePlaceholder")}
            className="h-12 w-full rounded-2xl border border-[#d9cdc1] bg-white px-4 text-sm text-[#272E37] outline-none"
            style={{ colorScheme: "light" }}
          />
        ) : null}
        <button
          type="button"
          onClick={() =>
            void onEnterPrivateRoom(canEnterWithoutCode ? ownerAccessCode : undefined)
          }
          className="mt-3 w-full rounded-2xl bg-[#272E37] px-5 py-3 text-sm font-semibold text-white"
        >
          {t("lobby.roomList.enter")}
        </button>
      </div>
    );
  }

  return (
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
          onClick={() => void onEnterPublicRoom(selectedRoomDetail.room.roomId)}
          className="mt-5 w-full rounded-2xl bg-[#272E37] px-5 py-3 text-sm font-semibold text-white"
        >
          {t("lobby.roomList.enterRoom")}
        </button>
      </div>
    </div>
  );
}

export default function RoomListSection({
  rooms,
  selectedRoomId,
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
  mobileMode = false,
  page = 1,
  totalPages = 1,
  onChangePage,
  mobileDetailOpen = false,
  onCloseMobileDetail,
}: RoomListSectionProps) {
  const { t } = useI18n();
  const touchStartXRef = useRef<number | null>(null);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (!mobileMode || !onChangePage || totalPages <= 1) {
      touchStartXRef.current = null;
      return;
    }

    const startX = touchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX ?? null;
    touchStartXRef.current = null;

    if (
      startX === null ||
      endX === null ||
      Math.abs(endX - startX) < MOBILE_SWIPE_THRESHOLD_PX
    ) {
      return;
    }

    if (endX < startX && page < totalPages) {
      onChangePage(page + 1);
      return;
    }

    if (endX > startX && page > 1) {
      onChangePage(page - 1);
    }
  };

  const listBody = loading ? (
    <div className="px-2 py-6 text-sm text-[#5f6368]">{t("lobby.roomList.loading")}</div>
  ) : error ? (
    <div className="px-2 py-6 text-sm text-[#d14d28]">{error}</div>
  ) : rooms.length === 0 ? (
    <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-6 text-center text-sm text-[#5f6368]">
      {t("lobby.roomList.empty")}
    </div>
  ) : (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
      {rooms.map((room) => {
        const selected = room.roomId === selectedRoomId;

        return (
          <button
            key={room.roomId}
            type="button"
            onClick={() => onSelectRoom(room.roomId)}
            className={`w-full rounded-[20px] border px-4 py-3 text-left transition ${selected
                ? "border-[#272E37] bg-[#272E37] text-white"
                : "border-[#e3d9cf] bg-[#fbf7f2] text-[#272E37]"
              }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {room.type === "private" ? (
                  <Lock
                    size={16}
                    className={selected ? "text-white" : "text-[#7b6b62]"}
                  />
                ) : null}
                <span className="h-5 flex-1 truncate text-sm font-medium leading-5">
                  {room.title}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {room.isOwner ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selected
                        ? "bg-white/16 text-white"
                        : "bg-[#272E37] text-white"
                      }`}
                  >
                    {t("lobby.roomList.owner")}
                  </span>
                ) : null}
                <span
                  className={`text-xs font-medium ${selected ? "text-white/80" : "text-[#7b6b62]"
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
  );

  if (mobileMode) {
    return (
      <>
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex min-h-0 flex-col rounded-[24px] border border-[#e3d9cf] bg-white p-4"
        >
          {listBody}
          {onChangePage ? (
            <RoomListPagination
              page={page}
              totalPages={totalPages}
              onChangePage={onChangePage}
              previousLabel={t("mypage.pagination.previous")}
              nextLabel={t("mypage.pagination.next")}
            />
          ) : null}
        </div>

        {mobileDetailOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
            <div className="w-full max-w-sm rounded-[28px] border border-[#ead7c8] bg-[#fbf7f2] p-5 shadow-[0_18px_50px_rgba(39,46,55,0.08)]">
              <div className="flex items-center justify-between gap-4">
                {selectedRoomDetail?.room.type === "private" ? (
                  <h3 className="text-xl font-semibold text-[#272E37]">
                    {t("lobby.roomEnter.title")}
                  </h3>
                ) : (
                  <div />
                )}
                <button
                  type="button"
                  onClick={onCloseMobileDetail}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d9cdc1] bg-white text-[#6c5a4d]"
                  aria-label={t("common.close")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div
                className={`flex justify-center ${
                  selectedRoomDetail?.room.type === "private" ? "" : "mt-4"
                }`}
              >
                <RoomDetailContent
                  selectedRoomDetail={selectedRoomDetail}
                  detailLoading={detailLoading}
                  detailError={detailError}
                  privateAccessCode={privateAccessCode}
                  onChangePrivateAccessCode={onChangePrivateAccessCode}
                  onEnterPrivateRoom={onEnterPrivateRoom}
                  onEnterPublicRoom={onEnterPublicRoom}
                  t={t}
                />
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="grid h-full min-h-0 gap-5 xl:grid-cols-[1.4fr_0.6fr]">
      <div className="flex min-h-0 flex-col rounded-[24px] border border-[#e3d9cf] bg-white p-4">
        {listBody}
      </div>

      <div className="flex min-h-0 items-center justify-center rounded-[24px] border border-[#e3d9cf] bg-[#fbf7f2] p-5">
        <RoomDetailContent
          selectedRoomDetail={selectedRoomDetail}
          detailLoading={detailLoading}
          detailError={detailError}
          privateAccessCode={privateAccessCode}
          onChangePrivateAccessCode={onChangePrivateAccessCode}
          onEnterPrivateRoom={onEnterPrivateRoom}
          onEnterPublicRoom={onEnterPublicRoom}
          t={t}
        />
      </div>
    </div>
  );
}
