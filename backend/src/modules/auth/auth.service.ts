import bcrypt from "bcrypt";
import { AppDataSource } from "../../database/data-source";
import { Voter, VoterRole } from "../../entities/voter.entity";

const voterRepository = AppDataSource.getRepository(Voter);

export const authService = {
  async register(username: string, password: string, nickname: string) {
    const existing = await voterRepository.findOne({ where: { username } });
    if (existing) {
      throw new Error("이미 사용 중인 아이디예요");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const voter = voterRepository.create({
      username,
      password: hashedPassword,
      nickname,
      role: VoterRole.USER,
    });

    await voterRepository.save(voter);

    return {
      uuid: voter.uuid,
      username: voter.username,
      nickname: voter.nickname,
    };
  },

  async login(username: string, password: string) {
    const voter = await voterRepository.findOne({ where: { username } });
    if (!voter) {
      throw new Error("아이디 또는 비밀번호가 올바르지 않아요");
    }

    const isMatch = await bcrypt.compare(password, voter.password);
    if (!isMatch) {
      throw new Error("아이디 또는 비밀번호가 올바르지 않아요");
    }

    return {
      id: voter.id,
      uuid: voter.uuid,
      nickname: voter.nickname,
      role: voter.role,
    };
  },
};
