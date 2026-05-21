import { AppDataSource } from "../../src/database/data-source";
import { Canvas } from "../../src/entities/canvas.entity";
import { CanvasParticipantSummary } from "../../src/entities/canvas-participant-summary.entity";
import { Room, RoomType } from "../../src/entities/room.entity";
import { VoteRound } from "../../src/entities/vote-round.entity";
import { Vote } from "../../src/entities/vote.entity";
import { Voter, VoterRole } from "../../src/entities/voter.entity";
import { summaryService } from "../../src/modules/summary/summary.service";
import { setupIntegrationSuite } from "./helpers/setup-integration-suite";

const canvasRepository = AppDataSource.getRepository(Canvas);
const canvasParticipantSummaryRepository = AppDataSource.getRepository(
  CanvasParticipantSummary,
);
const roomRepository = AppDataSource.getRepository(Room);
const roundRepository = AppDataSource.getRepository(VoteRound);
const voteRepository = AppDataSource.getRepository(Vote);
const voterRepository = AppDataSource.getRepository(Voter);

async function createVoterFixture(params: {
  username: string;
  nickname: string;
  isGuest: boolean;
}) {
  return voterRepository.save(
    voterRepository.create({
      username: params.username,
      password: "hashed-password",
      nickname: params.nickname,
      isGuest: params.isGuest,
      termsAcceptedAt: params.isGuest ? null : new Date(),
      termsAcceptedLocale: params.isGuest ? null : "en",
      termsVersion: params.isGuest ? null : "2026-05-12",
      isAge14OrOlderConfirmed: !params.isGuest,
      isWithdrawn: false,
      withdrawnAt: null,
      role: VoterRole.USER,
      createdBy: null,
      updatedBy: null,
    }),
  );
}

describe("summary integration", () => {
  setupIntegrationSuite();

  it("keeps guest nicknames in game summaries but skips guest participation history", async () => {
    const member = await createVoterFixture({
      username: "member001",
      nickname: "Member01",
      isGuest: false,
    });
    const guest = await createVoterFixture({
      username: "guest-summary-001",
      nickname: "Guest01",
      isGuest: true,
    });
    const canvas = await canvasRepository.save(
      canvasRepository.create({
        gridX: 32,
        gridY: 32,
        createdBy: null,
        updatedBy: null,
      }),
    );

    await roomRepository.save(
      roomRepository.create({
        title: "Summary Room",
        type: RoomType.PUBLIC,
        owner: member,
        canvas,
        accessCode: "SUMM01",
        expiresAt: null,
        terminationReason: null,
        createdBy: null,
        updatedBy: null,
      }),
    );

    const round = await roundRepository.save(
      roundRepository.create({
        canvas,
        roundNumber: 1,
        isActive: false,
        endedAt: new Date(),
        createdBy: null,
        updatedBy: null,
      }),
    );

    await voteRepository.save([
      voteRepository.create({
        round,
        voter: guest,
        x: 0,
        y: 0,
        color: "#111111",
        createdBy: null,
        updatedBy: null,
      }),
      voteRepository.create({
        round,
        voter: guest,
        x: 0,
        y: 1,
        color: "#222222",
        createdBy: null,
        updatedBy: null,
      }),
      voteRepository.create({
        round,
        voter: member,
        x: 1,
        y: 1,
        color: "#333333",
        createdBy: null,
        updatedBy: null,
      }),
    ]);

    const summary = await summaryService.saveGameSummary(canvas.id);
    const participantSummaries = await canvasParticipantSummaryRepository.find({
      where: { canvas: { id: canvas.id } },
      relations: { voter: true },
    });

    expect(summary.participantCount).toBe(2);
    expect(summary.topVoterId).toBeNull();
    expect(summary.topVoterName).toBe("Guest01");
    expect(summary.topVotersJson).toEqual([
      {
        voterId: null,
        name: "Guest01",
        voteCount: 2,
      },
      {
        voterId: member.id,
        name: "Member01",
        voteCount: 1,
      },
    ]);
    expect(summary.participantsJson).toEqual([
      {
        voterId: null,
        name: "Guest01",
      },
      {
        voterId: member.id,
        name: "Member01",
      },
    ]);

    expect(participantSummaries).toHaveLength(1);
    expect(participantSummaries[0]?.voter.id).toBe(member.id);
    expect(participantSummaries[0]?.usedVoteCount).toBe(1);
  });
});
