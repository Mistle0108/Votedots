export const gameConfig = {
    roundDurationSec: 60,
    totalRounds: 10,
    votesPerRound: 3,
    get totalDurationSec() {
        return this.roundDurationSec * this.totalRounds;
    },
};

export function updateGameConfig(config: Partial<typeof gameConfig>): void {
    Object.assign(gameConfig, config);
}