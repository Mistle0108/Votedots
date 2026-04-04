import type { ParticipantItem } from "../api/session.api";

interface ParticipantPanelProps {
  participants: ParticipantItem[];
  loading: boolean;
  error: string | null;
}

function getStatusLabel(status: ParticipantItem["status"]) {
  if (status === "voting") {
    return {
      text: "투표자",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  return {
    text: "대기자",
    className: "border-gray-200 bg-gray-100 text-gray-600",
  };
}

export default function ParticipantPanel({
  participants,
  loading,
  error,
}: ParticipantPanelProps) {
  return (
    <details className="group rounded-xl border border-gray-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">참여자 목록</h3>
          <span className="text-xs text-gray-400">{participants.length}명</span>
        </div>

        <span className="text-sm text-gray-400 transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="border-t border-gray-100">
        {loading ? (
          <div className="px-4 py-5 text-sm text-gray-400">
            참여자 정보를 불러오는 중...
          </div>
        ) : error ? (
          <div className="px-4 py-5 text-sm text-red-500">{error}</div>
        ) : participants.length === 0 ? (
          <div className="px-4 py-5 text-sm text-gray-400">
            현재 참여자가 없습니다.
          </div>
        ) : (
          <div className="max-h-[280px] overflow-y-auto">
            <ul className="divide-y divide-gray-100">
              {participants.map((participant) => {
                const status = getStatusLabel(participant.status);

                return (
                  <li
                    key={participant.sessionId}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <p className="min-w-0 truncate text-sm font-medium text-gray-800">
                      {participant.nickname}
                    </p>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}
                    >
                      {status.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}
