import bcrypt from "bcrypt";
import { QueryFailedError } from "typeorm";
import { AppDataSource } from "../../database/data-source";
import { Voter, VoterRole } from "../../entities/voter.entity";
import { AUTH_ERROR_MESSAGES } from "./auth.validation";

const voterRepository = AppDataSource.getRepository(Voter);

const POSTGRES_UNIQUE_VIOLATION_CODE = "23505";

function isUsernameUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { code?: string };

  return driverError.code === POSTGRES_UNIQUE_VIOLATION_CODE;
}

export const authService = {
  async register(username: string, password: string, nickname: string) {
    const existing = await voterRepository.findOne({ where: { username } });
    if (existing) {
      throw new Error(AUTH_ERROR_MESSAGES.USERNAME_TAKEN);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const voter = voterRepository.create({
      username,
      password: hashedPassword,
      nickname,
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
    const voter = await voterRepository.findOne({ where: { username } });
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
};
