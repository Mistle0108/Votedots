import { useI18n } from "@/shared/i18n";
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
  const { t } = useI18n();

  return (
    <details className="group rounded-xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[color:var(--page-theme-text-primary)]">
            {t("session.participantList")}
          </h3>
          <span className="text-xs text-[color:var(--page-theme-text-tertiary)]">
            {t("session.participantCount", { count: participants.length })}
          </span>
        </div>

        <span className="text-sm leading-none text-[color:var(--page-theme-text-tertiary)]">
          <span className="group-open:hidden">▼</span>
          <span className="hidden group-open:inline">▲</span>
        </span>
      </summary>

      <div className="border-t border-[color:var(--page-theme-border-secondary)]">
        {loading ? (
          <div className="px-4 py-5 text-sm text-[color:var(--page-theme-text-tertiary)]">
            {t("session.loadingParticipants")}
          </div>
        ) : error ? (
          <div className="px-4 py-5 text-sm text-[color:var(--page-theme-alert)]">
            {error}
          </div>
        ) : participants.length === 0 ? (
          <div className="px-4 py-5 text-sm text-[color:var(--page-theme-text-tertiary)]">
            {t("session.noParticipants")}
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
