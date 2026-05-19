export interface CanvasResultDetailBase {
  canvasId: number;
  size: string;
  endedAt: string;
  totalRounds: number;
  participantCount: number;
  totalVotes: number;
  topVoterName: string | null;
  topVoterVoteCount: number;
  participants: string[];
  resultImageUrl: string | null;
  downloadSnapshotUrl: string | null;
  highResolutionDownloadSnapshotUrl: string | null;
  downloadAvailable: boolean;
  highResolutionDownloadAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}
