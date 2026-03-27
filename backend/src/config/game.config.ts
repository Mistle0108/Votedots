export const gameConfig = {
  roundDurationSec: 30,
  totalRounds: 10,
  votesPerRound: 10,
  get totalDurationSec() {
    return this.roundDurationSec * this.totalRounds;
  },
};

export function updateGameConfig(config: Partial<typeof gameConfig>): void {
  Object.assign(gameConfig, config);
}
