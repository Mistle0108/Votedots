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

export interface LandingParticipant {
  voterId: number;
  name: string;
}

export interface LandingTopVoterSummary {
  voterId: number;
  name: string;
  voteCount: number;
}

export interface LandingFeaturedGameSummary {
  canvasId: number;
  totalRounds: number;
  participantCount: number;
  totalVotes: number;
  canvasCompletionPercent: string;
  topVoterName: string | null;
  topVoterVoteCount: number;
  topVoters: LandingTopVoterSummary[] | null;
  participants: LandingParticipant[] | null;
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
