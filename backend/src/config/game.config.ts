export const gameConfig = {
  roundDurationSec: 20,
  totalRounds: 10,
  votesPerRound: 20,
  get totalDurationSec() {
    return this.roundDurationSec * this.totalRounds;
  },
};

export function updateGameConfig(config: Partial<typeof gameConfig>): void {
  Object.assign(gameConfig, config);
}
