import type { ParticipantItem } from "../api/session.api";

interface ParticipantPanelProps {
  participants: ParticipantItem[];
  loading: boolean;
  error: string | null;
}

export default function ParticipantPanel({
  participants,
  loading,
  error,
}: ParticipantPanelProps) {
  return (
    <details className="group rounded-xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[color:var(--page-theme-text-primary)]">
            참여자 목록
          </h3>
          <span className="text-xs text-[color:var(--page-theme-text-tertiary)]">
            {participants.length}명
          </span>
        </div>

        <span className="text-sm text-[color:var(--page-theme-text-tertiary)] transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="border-t border-[color:var(--page-theme-border-secondary)]">
        {loading ? (
          <div className="px-4 py-5 text-sm text-[color:var(--page-theme-text-tertiary)]">
            참여자 정보를 불러오는 중...
          </div>
        ) : error ? (
          <div className="px-4 py-5 text-sm text-[color:var(--page-theme-alert)]">
            {error}
          </div>
        ) : participants.length === 0 ? (
          <div className="px-4 py-5 text-sm text-[color:var(--page-theme-text-tertiary)]">
            현재 참여자가 없습니다.
          </div>
        ) : (
          <div className="max-h-[280px] overflow-y-auto">
            <ul className="divide-y divide-[color:var(--page-theme-border-secondary)] text-left">
              {participants.map((participant) => (
                <li key={participant.sessionId} className="px-4 py-3 text-left">
                  <p className="min-w-0 truncate text-sm font-medium text-[color:var(--page-theme-text-primary)]">
                    {participant.nickname}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}
