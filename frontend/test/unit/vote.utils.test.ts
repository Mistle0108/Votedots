import type { Cell } from "@/features/gameplay/canvas";
import {
  buildVotePanelEntries,
  buildVotePopupEntries,
  loadLastPaletteColor,
  loadSlotColors,
} from "@/features/gameplay/vote/model/vote.utils";
import {
  DEFAULT_VOTE_COLOR,
  INITIAL_SLOTS,
  SLOT_COUNT,
  STORAGE_KEYS,
} from "@/features/gameplay/vote/model/vote.constants";

describe("vote.utils", () => {
  it("returns default slot colors when storage is empty or invalid", () => {
    expect(loadSlotColors()).toEqual(INITIAL_SLOTS);

    window.localStorage.setItem(STORAGE_KEYS.slotColors, JSON.stringify([1, 2]));
    expect(loadSlotColors()).toEqual(INITIAL_SLOTS);
  });

  it("normalizes stored slot colors to the configured slot count", () => {
    window.localStorage.setItem(
      STORAGE_KEYS.slotColors,
      JSON.stringify(["#111111", "#222222"]),
    );

    const colors = loadSlotColors();

    expect(colors).toHaveLength(SLOT_COUNT);
    expect(colors[0]).toBe("#111111");
    expect(colors[1]).toBe("#222222");
    expect(colors.at(-1)).toBe("");
  });

  it("returns the default palette color when stored color is invalid", () => {
    expect(loadLastPaletteColor()).toBe(DEFAULT_VOTE_COLOR);

    window.localStorage.setItem(STORAGE_KEYS.lastPaletteColor, "blue");
    expect(loadLastPaletteColor()).toBe(DEFAULT_VOTE_COLOR);
  });

  it("builds popup and panel entries from vote status", () => {
    const cells: Cell[] = [
      { x: 1, y: 1, color: "#ff0000", status: "painted" },
      { x: 3, y: 3, color: "#00ff00", status: "painted" },
    ];

    const votes = {
      "1:1:#000000": 2,
      "1:1:#ffffff": 5,
      "3:3:#00ff00": 1,
    };

    expect(buildVotePopupEntries(votes, 1, 1)).toEqual([
      { color: "#ffffff", count: 5 },
      { color: "#000000", count: 2 },
    ]);

    expect(buildVotePanelEntries(votes, cells)).toEqual([
      {
        x: 1,
        y: 1,
        topColor: "#ffffff",
        topCount: 5,
        totalCount: 7,
      },
      {
        x: 3,
        y: 3,
        topColor: "#00ff00",
        topCount: 1,
        totalCount: 1,
      },
    ]);
  });
});
