import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { QueryFailedError } from "typeorm";
import { AppDataSource } from "../../database/data-source";
import { GamePreview } from "../../entities/game-preview.entity";
import {
  GameSummary,
  type ParticipantSummary,
  type TopVoterSummary,
} from "../../entities/game-summary.entity";
import { Voter, VoterRole } from "../../entities/voter.entity";
import {
  CURRENT_TERMS_VERSION,
  WITHDRAWN_VOTER_NICKNAME,
} from "./auth.constants";
import { AUTH_ERROR_MESSAGES } from "./auth.validation";

const voterRepository = AppDataSource.getRepository(Voter);

function buildWithdrawnUsername(voterId: number): string {
  return `withdrawn-${voterId.toString(36)}-${Date.now().toString(36)}`;
}

function deidentifyTopVoters(
  topVoters: TopVoterSummary[] | null,
  voterId: number,
): { changed: boolean; nextValue: TopVoterSummary[] | null } {
  if (!topVoters || topVoters.length === 0) {
    return {
      changed: false,
      nextValue: topVoters,
    };
  }

  let changed = false;
  const nextValue = topVoters.map((voter) => {
    if (voter.voterId !== voterId) {
      return voter;
    }

    changed = true;
    return {
      ...voter,
      voterId: null,
      name: WITHDRAWN_VOTER_NICKNAME,
    };
  });

  return {
    changed,
    nextValue,
  };
}

function deidentifyParticipants(
  participants: ParticipantSummary[] | null,
  voterId: number,
): { changed: boolean; nextValue: ParticipantSummary[] | null } {
  if (!participants || participants.length === 0) {
    return {
      changed: false,
      nextValue: participants,
    };
  }

  let changed = false;
  const nextValue = participants.map((participant) => {
    if (participant.voterId !== voterId) {
      return participant;
    }

    changed = true;
    return {
      voterId: null,
      name: WITHDRAWN_VOTER_NICKNAME,
    };
  });

  return {
    changed,
    nextValue,
  };
}

const POSTGRES_UNIQUE_VIOLATION_CODE = "23505";

function isUsernameUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { code?: string };

  return driverError.code === POSTGRES_UNIQUE_VIOLATION_CODE;
}

export const authService = {
  async register(
    username: string,
    password: string,
    nickname: string,
    params: {
      termsAcceptedLocale: string;
      isAge14OrOlderConfirmed: boolean;
    },
  ) {
    const existing = await voterRepository.findOne({ where: { username } });
    if (existing) {
      throw new Error(AUTH_ERROR_MESSAGES.USERNAME_TAKEN);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const voter = voterRepository.create({
      username,
      password: hashedPassword,
      nickname,
      termsAcceptedAt: new Date(),
      termsAcceptedLocale: params.termsAcceptedLocale,
      termsVersion: CURRENT_TERMS_VERSION,
      isAge14OrOlderConfirmed: params.isAge14OrOlderConfirmed,
      role: VoterRole.USER,
    });

    try {
      await voterRepository.save(voter);
    } catch (err) {
      if (isUsernameUniqueViolation(err)) {
        throw new Error(AUTH_ERROR_MESSAGES.USERNAME_TAKEN);
      }

      throw err;
    }

    return {
      uuid: voter.uuid,
      username: voter.username,
      nickname: voter.nickname,
    };
  },

  async login(username: string, password: string) {
    const voter = await voterRepository.findOne({
      where: {
        username,
        isWithdrawn: false,
      },
    });
    if (!voter) {
      throw new Error(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const isMatch = await bcrypt.compare(password, voter.password);
    if (!isMatch) {
      throw new Error(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    return {
      id: voter.id,
      uuid: voter.uuid,
      nickname: voter.nickname,
      role: voter.role,
    };
  },

  async changePassword(voterId: number, currentPassword: string, newPassword: string) {
    const voter = await voterRepository.findOne({
      where: {
        id: voterId,
        isWithdrawn: false,
      },
    });

    if (!voter) {
      throw new Error(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const isCurrentPasswordMatch = await bcrypt.compare(
      currentPassword,
      voter.password,
    );

    if (!isCurrentPasswordMatch) {
      throw new Error(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    voter.password = await bcrypt.hash(newPassword, 10);
    await voterRepository.save(voter);
  },

  async getMe(voterId: number) {
    const voter = await voterRepository.findOne({
      where: {
        id: voterId,
        isWithdrawn: false,
      },
    });

    if (!voter) {
      throw new Error(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    return voter;
  },

  async withdraw(voterId: number, password: string) {
    const voter = await voterRepository.findOne({
      where: {
        id: voterId,
        isWithdrawn: false,
      },
    });

    if (!voter) {
      throw new Error(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const isPasswordMatch = await bcrypt.compare(password, voter.password);

    if (!isPasswordMatch) {
      throw new Error(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const withdrawnUsername = buildWithdrawnUsername(voter.id);
    const withdrawnPassword = await bcrypt.hash(
      `withdrawn:${randomUUID()}`,
      10,
    );
    const withdrawnUuid = randomUUID();
    const withdrawnAt = new Date();

    await AppDataSource.transaction(async (manager) => {
      const transactionalVoterRepository = manager.getRepository(Voter);
      const gameSummaryRepository = manager.getRepository(GameSummary);
      const gamePreviewRepository = manager.getRepository(GamePreview);

      await transactionalVoterRepository.update(
        { id: voter.id },
        {
          username: withdrawnUsername,
          password: withdrawnPassword,
          uuid: withdrawnUuid,
          nickname: WITHDRAWN_VOTER_NICKNAME,
          termsAcceptedAt: null,
          termsAcceptedLocale: null,
          termsVersion: null,
          isAge14OrOlderConfirmed: false,
          isWithdrawn: true,
          withdrawnAt,
        },
      );

      const summaries = await gameSummaryRepository.find();
      const changedSummaries: GameSummary[] = [];

      for (const summary of summaries) {
        const deidentifiedTopVoters = deidentifyTopVoters(
          summary.topVotersJson,
          voter.id,
        );
        const deidentifiedParticipants = deidentifyParticipants(
          summary.participantsJson,
          voter.id,
        );
        const topVoterMatches = summary.topVoterId === voter.id;
        const summaryChanged =
          deidentifiedTopVoters.changed ||
          deidentifiedParticipants.changed ||
          topVoterMatches;

        if (!summaryChanged) {
          continue;
        }

        summary.topVotersJson = deidentifiedTopVoters.nextValue;
        summary.participantsJson = deidentifiedParticipants.nextValue;

        if (topVoterMatches) {
          summary.topVoterId = null;
          summary.topVoterName = WITHDRAWN_VOTER_NICKNAME;
        }

        changedSummaries.push(summary);
      }

      if (changedSummaries.length === 0) {
        return;
      }

      await gameSummaryRepository.save(changedSummaries);

      for (const summary of changedSummaries) {
        const preview = await gamePreviewRepository.findOne({
          where: {
            gameSummary: { id: summary.id },
          },
        });

        if (!preview) {
          continue;
        }

        preview.topVoterName = summary.topVoterName;
        preview.participantsJson = (summary.participantsJson ?? []).map(
          (participant) => participant.name,
        );

        await gamePreviewRepository.save(preview);
      }
    });
  },
};
