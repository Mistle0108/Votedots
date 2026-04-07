export const gameConfig = {
  roundStartWaitSec: 2,
  roundDurationSec: 3,
  totalRounds: 3,
  votesPerRound: 3,
  roundResultDelaySec: 3,
  gameEndWaitSec: 2,
  participantGracePeriodSec: 15,
  get totalDurationSec() {
    return (
      this.roundStartWaitSec +
      this.roundDurationSec * this.totalRounds +
      this.roundResultDelaySec * this.totalRounds +
      this.gameEndWaitSec
    );
  },
};

export function updateGameConfig(config: Partial<typeof gameConfig>): void {
  Object.assign(gameConfig, config);
}
