export const DEFAULT_VOTE_COLOR = "#000000";

export const SLOT_COUNT = 12;

export const STORAGE_KEYS = {
  slotColors: "votedots:vote-popup-slot-colors",
  lastPaletteColor: "votedots:last-palette-color",
} as const;

export const INITIAL_SLOTS = Array<string>(SLOT_COUNT).fill("");

export const CHECKER_PATTERN =
  "linear-gradient(45deg, #d1d5db 25%, transparent 25%, transparent 75%, #d1d5db 75%, #d1d5db), linear-gradient(45deg, #d1d5db 25%, transparent 25%, transparent 75%, #d1d5db 75%, #d1d5db)";

export const MAX_VOTE_PANEL_ENTRIES = 5;
