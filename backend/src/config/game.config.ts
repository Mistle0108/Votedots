export const gameConfig = {
  roundStartWaitSec: 3,
  roundDurationSec: 20,
  totalRounds: 10,
  votesPerRound: 3,
  roundResultDelaySec: 3,
  gameEndWaitSec: 3,
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
