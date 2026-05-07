export interface LandingCurrentGame {
  canvasId: number;
  gridX: number;
  gridY: number;
  currentRoundNumber: number;
  totalRounds: number;
  participantCount: number;
  snapshotUrl: string | null;
  fallbackImageUrl: string | null;
}

export interface LandingFeaturedGameSummary {
  canvasId: number;
  totalRounds: number;
  participantCount: number;
  totalVotes: number;
  canvasCompletionPercent: string;
  topVoterName: string | null;
  topVoterVoteCount: number;
  topVoters: Array<{
    voterId: number;
    name: string;
    voteCount: number;
  }> | null;
  participants: Array<{
    voterId: number;
    name: string;
  }> | null;
  endedAt: string | null;
  snapshotUrl: string | null;
}

export interface LandingFeaturedGameCard {
  profileKey: string;
  gridX: number;
  gridY: number;
  state: "empty" | "ready";
  fallbackImageUrl: string | null;
  game: LandingFeaturedGameSummary | null;
}

export interface LandingPayload {
  currentGame: LandingCurrentGame | null;
  featuredGames: LandingFeaturedGameCard[];
}
