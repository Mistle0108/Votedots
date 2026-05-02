import {
  formatClockTime,
  formatDuration,
  getRoundProgressPercent,
} from "@/features/gameplay/round/model/round.formatters";

describe("round.formatters", () => {
  it("calculates round progress percent", () => {
    expect(getRoundProgressPercent(15, 30)).toBe(50);
    expect(getRoundProgressPercent(null, 30)).toBe(0);
    expect(getRoundProgressPercent(10, 0)).toBe(0);
  });

  it("formats clock time with zero padding", () => {
    const date = new Date("2026-05-02T03:04:00.000Z");
    expect(formatClockTime(date)).toMatch(/^\d{2}:\d{2}$/);
  });

  it("formats duration safely", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(-1)).toBe("0:00");
  });
});
