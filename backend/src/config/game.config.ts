export const gameConfig = {
  roundDurationSec: 20,
  totalRounds: 10,
  votesPerRound: 3,
  roundResultDelaySec: 3,
  participantGracePeriodSec: 15,
  get totalDurationSec() {
    return (
      this.roundDurationSec * this.totalRounds +
      this.roundResultDelaySec * this.totalRounds
    );
  },
};

export function updateGameConfig(config: Partial<typeof gameConfig>): void {
  Object.assign(gameConfig, config);
}
