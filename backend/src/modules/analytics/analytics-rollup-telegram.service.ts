import {
  AnalyticsRollupDeviceTimeZoneEventCount,
  AnalyticsRollupSummary,
} from "./analytics-retention.service";

const TELEGRAM_API_BASE_URL = "https://api.telegram.org";
const TELEGRAM_BOT_TOKEN_ENV = "TELEGRAM_BOT_TOKEN";
const TELEGRAM_CHAT_ID_ENV = "TELEGRAM_CHAT_ID";
const ROLLUP_NOTIFICATION_TIME_ZONE = "Asia/Seoul";
const DETAILED_EVENT_TYPE_ORDER = [
  "landing_visit",
  "lobby_visit",
  "plaza_visit",
  "room_visit",
  "public_room_created",
  "private_room_created",
];
const VISIT_EVENT_TYPE_LABELS: Record<string, string> = {
  landing_visit: "\ub79c\ub529 \uc811\uc18d",
  lobby_visit: "\ub85c\ube44 \uc811\uc18d",
  plaza_visit: "\uad11\uc7a5 \uc811\uc18d",
  private_room_created: "\ube44\uacf5\uac1c\ubc29 \uc0dd\uc131",
  public_room_created: "\uacf5\uac1c\ubc29 \uc0dd\uc131",
  room_visit: "\ubc29 \uc811\uc18d",
};

interface TelegramApiResponse {
  description?: string;
  ok: boolean;
}

function getRequiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function formatDateTimeKst(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: ROLLUP_NOTIFICATION_TIME_ZONE,
    year: "numeric",
  }).format(new Date(value));
}

function formatEventTypeLabel(eventType: string): string {
  return VISIT_EVENT_TYPE_LABELS[eventType] ?? eventType;
}

function formatDetailedEventCounts(
  deviceTimeZoneEventCounts: AnalyticsRollupDeviceTimeZoneEventCount[],
): string {
  const countsByEventType = new Map<string, number>();

  for (const eventCount of deviceTimeZoneEventCounts) {
    countsByEventType.set(eventCount.eventType, eventCount.count);
  }

  const orderedEventTypes = DETAILED_EVENT_TYPE_ORDER.filter((eventType) =>
    countsByEventType.has(eventType),
  );
  const extraEventTypes = [...countsByEventType.keys()]
    .filter((eventType) => !DETAILED_EVENT_TYPE_ORDER.includes(eventType))
    .sort((left, right) => left.localeCompare(right));

  return [...orderedEventTypes, ...extraEventTypes]
    .map((eventType) => `${eventType}=${countsByEventType.get(eventType) ?? 0}`)
    .join(" | ");
}

function buildDeviceDetailLines(summary: AnalyticsRollupSummary): string[] {
  if (summary.deviceTimeZoneEventCounts.length === 0) {
    return [];
  }

  const deviceGroups = new Map<
    string,
    Map<string, AnalyticsRollupDeviceTimeZoneEventCount[]>
  >();

  for (const eventCount of summary.deviceTimeZoneEventCounts) {
    const timeZoneGroups =
      deviceGroups.get(eventCount.deviceType) ??
      new Map<string, AnalyticsRollupDeviceTimeZoneEventCount[]>();
    const groupedEventCounts = timeZoneGroups.get(eventCount.timeZone) ?? [];

    groupedEventCounts.push(eventCount);
    timeZoneGroups.set(eventCount.timeZone, groupedEventCounts);
    deviceGroups.set(eventCount.deviceType, timeZoneGroups);
  }

  const lines = ["", "\ub514\ubc14\uc774\uc2a4\ubcc4 \uc0c1\uc138:", ""];
  const deviceTypes = [...deviceGroups.keys()];

  deviceTypes.forEach((deviceType, deviceIndex) => {
    lines.push(deviceType);

    const timeZoneGroups = deviceGroups.get(deviceType);

    if (!timeZoneGroups) {
      return;
    }

    for (const [timeZone, eventCounts] of timeZoneGroups.entries()) {
      lines.push(`- ${timeZone} | ${formatDetailedEventCounts(eventCounts)}`);
    }

    if (deviceIndex < deviceTypes.length - 1) {
      lines.push("");
    }
  });

  return lines;
}

function buildRollupSummaryMessage(summary: AnalyticsRollupSummary): string {
  const lines = [
    "[VoteDots \ub370\uc77c\ub9ac \ud1b5\uacc4]",
    "KST \uae30\uc900 \ub370\uc77c\ub9ac \uc9d1\uacc4 \uc644\ub8cc",
    "",
    `- \uc9d1\uacc4 \uae30\uc900 \uc2dc\uac01: ${formatDateTimeKst(summary.upperBoundIso)} (${summary.upperBoundIso})`,
    `- \uc77c\uc77c \uac00\uc785\ub7c9: ${summary.dailySignupCount}`,
    `- \uc9d1\uacc4 \ub300\uc0c1 \uc774\ubca4\ud2b8 \uc218: ${summary.eligibleEventCount}`,
    `- \uc9d1\uacc4 \uadf8\ub8f9 \uc218: ${summary.aggregateGroupCount}`,
    `- \ubc18\uc601\ub41c \uc9d1\uacc4 \uadf8\ub8f9 \uc218: ${summary.rolledUpGroupCount}`,
    `- \uc9d1\uacc4 \ucc98\ub9ac\ub41c \uc774\ubca4\ud2b8 \uc218: ${summary.markedEventCount}`,
  ];

  if (summary.oldestEligibleEnteredAt) {
    lines.push(
      `- \uac00\uc7a5 \uc624\ub798\ub41c \uc9d1\uacc4 \ub300\uc0c1 \uc2dc\uac01: ${formatDateTimeKst(summary.oldestEligibleEnteredAt)} (${summary.oldestEligibleEnteredAt})`,
    );
  }

  if (summary.eventCounts.length > 0) {
    lines.push("", "\uc774\ubca4\ud2b8\ubcc4 \uac74\uc218:");

    for (const eventCount of summary.eventCounts) {
      lines.push(`- ${formatEventTypeLabel(eventCount.eventType)}: ${eventCount.count}`);
    }
  }

  lines.push(...buildDeviceDetailLines(summary));

  return lines.join("\n");
}

async function parseTelegramApiResponse(response: Response): Promise<TelegramApiResponse | null> {
  const raw = await response.text();

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as TelegramApiResponse;
  } catch {
    return null;
  }
}

async function sendMessage(text: string): Promise<void> {
  const botToken = getRequiredEnvironmentValue(TELEGRAM_BOT_TOKEN_ENV);
  const chatId = getRequiredEnvironmentValue(TELEGRAM_CHAT_ID_ENV);
  const response = await fetch(`${TELEGRAM_API_BASE_URL}/bot${botToken}/sendMessage`, {
    body: JSON.stringify({
      chat_id: chatId,
      disable_web_page_preview: true,
      text,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = await parseTelegramApiResponse(response);

  if (!response.ok) {
    throw new Error(
      `Telegram API request failed with status ${response.status}${payload?.description ? `: ${payload.description}` : ""}`,
    );
  }

  if (payload && !payload.ok) {
    throw new Error(`Telegram API responded with ok=false${payload.description ? `: ${payload.description}` : ""}`);
  }
}

export const analyticsRollupTelegramService = {
  async sendRollupSummary(summary: AnalyticsRollupSummary): Promise<void> {
    await sendMessage(buildRollupSummaryMessage(summary));
  },
};
