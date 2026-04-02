import type { SessionData } from "express-session";
import { Server } from "socket.io";
import { redisClient } from "../../config/redis";
import { sessionStore } from "../../config/session";
import { gameConfig } from "../../config/game.config";
import { AppDataSource } from "../../database/data-source";
import { VoteRound } from "../../entities/vote-round.entity";

export type ParticipantStatus = "voting" | "waiting";

interface ParticipantState {
  socketId: string | null;
  status: ParticipantStatus;
  connected: boolean;
  disconnectedAt: string | null;
  graceUntil: string | null;
}

interface SessionVoter {
  id: number;
  uuid: string;
  nickname: string;
  role: string;
}

interface JoinCanvasResult {
  status: ParticipantStatus;
  replaced: boolean;
  restored: boolean;
}

export interface ParticipantSummary {
  sessionId: string;
  voterId: number;
  voterUuid: string;
  nickname: string;
  status: ParticipantStatus;
  connected: boolean;
}

const voteRoundRepository = AppDataSource.getRepository(VoteRound);

class ParticipantSessionService {
  private cleanupTimers = new Map<string, NodeJS.Timeout>();

  private buildSessionCanvasesKey(sessionId: string): string {
    return `session:${sessionId}:canvases`;
  }

  private buildCanvasSessionsKey(canvasId: number): string {
    return `canvas:${canvasId}:sessions`;
  }

  private buildCanvasSessionKey(canvasId: number, sessionId: string): string {
    return `canvas:${canvasId}:session:${sessionId}`;
  }

  private buildCleanupTimerKey(canvasId: number, sessionId: string): string {
    return `${canvasId}:${sessionId}`;
  }

  private parseParticipantState(
    raw: Record<string, string>,
  ): ParticipantState | null {
    if (Object.keys(raw).length === 0) {
      return null;
    }

    return {
      socketId: raw["socketId"] || null,
      status: raw["status"] === "waiting" ? "waiting" : "voting",
      connected: raw["connected"] === "true",
      disconnectedAt: raw["disconnectedAt"] || null,
      graceUntil: raw["graceUntil"] || null,
    };
  }

  private async readParticipantState(
    canvasId: number,
    sessionId: string,
  ): Promise<ParticipantState | null> {
    const raw = await redisClient.hGetAll(
      this.buildCanvasSessionKey(canvasId, sessionId),
    );
    return this.parseParticipantState(raw);
  }

  private clearCleanupTimer(canvasId: number, sessionId: string): void {
    const timerKey = this.buildCleanupTimerKey(canvasId, sessionId);
    const timer = this.cleanupTimers.get(timerKey);

    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.cleanupTimers.delete(timerKey);
  }

  private scheduleCleanup(
    canvasId: number,
    sessionId: string,
    graceUntil: string,
  ): void {
    this.clearCleanupTimer(canvasId, sessionId);

    const timerKey = this.buildCleanupTimerKey(canvasId, sessionId);
    const delayMs = Math.max(0, new Date(graceUntil).getTime() - Date.now());

    const timer = setTimeout(async () => {
      try {
        const state = await this.readParticipantState(canvasId, sessionId);
        if (!state || state.connected) {
          return;
        }

        const expiresAt = state.graceUntil
          ? new Date(state.graceUntil).getTime()
          : 0;

        if (expiresAt <= Date.now()) {
          await this.cleanupParticipation(canvasId, sessionId);
        }
      } finally {
        this.cleanupTimers.delete(timerKey);
      }
    }, delayMs + 50);

    this.cleanupTimers.set(timerKey, timer);
  }

  private async cleanupParticipation(
    canvasId: number,
    sessionId: string,
  ): Promise<void> {
    this.clearCleanupTimer(canvasId, sessionId);

    await redisClient.del(this.buildCanvasSessionKey(canvasId, sessionId));
    await redisClient.sRem(this.buildCanvasSessionsKey(canvasId), sessionId);
    await redisClient.sRem(
      this.buildSessionCanvasesKey(sessionId),
      String(canvasId),
    );

    const canvasSessionsKey = this.buildCanvasSessionsKey(canvasId);
    const sessionCanvasesKey = this.buildSessionCanvasesKey(sessionId);

    const canvasSessionCount = await redisClient.sCard(canvasSessionsKey);
    if (canvasSessionCount === 0) {
      await redisClient.del(canvasSessionsKey);
    }

    const sessionCanvasCount = await redisClient.sCard(sessionCanvasesKey);
    if (sessionCanvasCount === 0) {
      await redisClient.del(sessionCanvasesKey);
    }
  }

  private async getDefaultStatus(
    canvasId: number,
  ): Promise<ParticipantStatus> {
    const activeRound = await voteRoundRepository.findOne({
      where: { canvas: { id: canvasId }, isActive: true },
    });

    return activeRound ? "waiting" : "voting";
  }

  private async getSessionVoter(
    sessionId: string,
  ): Promise<SessionVoter | null> {
    return new Promise((resolve, reject) => {
      sessionStore.get(sessionId, (error, session) => {
        if (error) {
          reject(error);
          return;
        }

        const data = session as SessionData | null;
        resolve((data?.voter as SessionVoter | undefined) ?? null);
      });
    });
  }

  async getCanvasParticipation(
    canvasId: number,
    sessionId: string,
  ): Promise<ParticipantState | null> {
    const state = await this.readParticipantState(canvasId, sessionId);

    if (
      state &&
      !state.connected &&
      state.graceUntil &&
      new Date(state.graceUntil).getTime() <= Date.now()
    ) {
      await this.cleanupParticipation(canvasId, sessionId);
      return null;
    }

    return state;
  }

  async joinCanvas(
    canvasId: number,
    sessionId: string,
    socketId: string,
    io: Server,
  ): Promise<JoinCanvasResult> {
    const existing = await this.getCanvasParticipation(canvasId, sessionId);
    const replaced = !!existing?.socketId && existing.socketId !== socketId;

    if (replaced && existing?.socketId) {
      io.to(existing.socketId).emit("session:replaced", { canvasId });

      const previousSocket = io.sockets.sockets.get(existing.socketId);
      previousSocket?.disconnect(true);
    }

    const restored =
      !!existing &&
      !existing.connected &&
      !!existing.graceUntil &&
      new Date(existing.graceUntil).getTime() > Date.now();

    const status = existing?.status ?? (await this.getDefaultStatus(canvasId));

    this.clearCleanupTimer(canvasId, sessionId);

    await redisClient.sAdd(
      this.buildSessionCanvasesKey(sessionId),
      String(canvasId),
    );
    await redisClient.sAdd(this.buildCanvasSessionsKey(canvasId), sessionId);
    await redisClient.hSet(this.buildCanvasSessionKey(canvasId, sessionId), {
      socketId,
      status,
      connected: "true",
      disconnectedAt: "",
      graceUntil: "",
    });

    return {
      status,
      replaced,
      restored,
    };
  }

  async leaveCanvas(
    canvasId: number,
    sessionId: string,
    socketId: string,
  ): Promise<boolean> {
    const state = await this.getCanvasParticipation(canvasId, sessionId);

    if (!state || state.socketId !== socketId) {
      return false;
    }

    await this.cleanupParticipation(canvasId, sessionId);
    return true;
  }

  async handleSocketDisconnect(
    sessionId: string,
    socketId: string,
  ): Promise<number[]> {
    const canvasIds = await redisClient.sMembers(
      this.buildSessionCanvasesKey(sessionId),
    );

    if (canvasIds.length === 0) {
      return [];
    }

    const affectedCanvasIds: number[] = [];
    const disconnectedAt = new Date();
    const graceUntil = new Date(
      disconnectedAt.getTime() + gameConfig.participantGracePeriodSec * 1000,
    ).toISOString();

    for (const canvasIdValue of canvasIds) {
      const canvasId = Number(canvasIdValue);
      if (Number.isNaN(canvasId)) {
        continue;
      }

      const state = await this.getCanvasParticipation(canvasId, sessionId);
      if (!state || state.socketId !== socketId) {
        continue;
      }

      await redisClient.hSet(this.buildCanvasSessionKey(canvasId, sessionId), {
        socketId,
        status: state.status,
        connected: "false",
        disconnectedAt: disconnectedAt.toISOString(),
        graceUntil,
      });

      this.scheduleCleanup(canvasId, sessionId, graceUntil);
      affectedCanvasIds.push(canvasId);
    }

    return affectedCanvasIds;
  }

  async activateParticipantsForRound(
    canvasId: number,
  ): Promise<{ voterIds: number[] }> {
    const sessionIds = await redisClient.sMembers(
      this.buildCanvasSessionsKey(canvasId),
    );

    const voterIds: number[] = [];
    const seenVoterIds = new Set<number>();

    for (const sessionId of sessionIds) {
      const state = await this.getCanvasParticipation(canvasId, sessionId);
      if (!state) {
        continue;
      }

      const nextStatus: ParticipantStatus = state.connected
        ? "voting"
        : "waiting";

      await redisClient.hSet(this.buildCanvasSessionKey(canvasId, sessionId), {
        socketId: state.socketId ?? "",
        status: nextStatus,
        connected: state.connected ? "true" : "false",
        disconnectedAt: state.disconnectedAt ?? "",
        graceUntil: state.graceUntil ?? "",
      });

      if (!state.connected) {
        continue;
      }

      const voter = await this.getSessionVoter(sessionId);
      if (!voter) {
        await this.cleanupParticipation(canvasId, sessionId);
        continue;
      }

      if (!seenVoterIds.has(voter.id)) {
        seenVoterIds.add(voter.id);
        voterIds.push(voter.id);
      }
    }

    return { voterIds };
  }

  async getParticipantList(canvasId: number): Promise<ParticipantSummary[]> {
    const sessionIds = await redisClient.sMembers(
      this.buildCanvasSessionsKey(canvasId),
    );

    const participants: ParticipantSummary[] = [];

    for (const sessionId of sessionIds) {
      const state = await this.getCanvasParticipation(canvasId, sessionId);
      if (!state) {
        continue;
      }

      const voter = await this.getSessionVoter(sessionId);
      if (!voter) {
        await this.cleanupParticipation(canvasId, sessionId);
        continue;
      }

      participants.push({
        sessionId,
        voterId: voter.id,
        voterUuid: voter.uuid,
        nickname: voter.nickname,
        status: state.status,
        connected: state.connected,
      });
    }

    participants.sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === "voting" ? -1 : 1;
      }

      return left.nickname.localeCompare(right.nickname, "ko");
    });

    return participants;
  }

  async getParticipantCount(canvasId: number): Promise<number> {
    const participants = await this.getParticipantList(canvasId);
    return participants.length;
  }

  async assertVotingParticipant(
    canvasId: number,
    sessionId: string,
    expectedVoterId: number,
  ): Promise<void> {
    const state = await this.getCanvasParticipation(canvasId, sessionId);

    if (!state || !state.connected) {
      throw new Error("현재 캔버스에 참여 중인 세션이 아니에요");
    }

    if (state.status !== "voting") {
      throw new Error("현재 라운드 투표 대상이 아니에요");
    }

    const voter = await this.getSessionVoter(sessionId);
    if (!voter) {
      throw new Error("세션 정보를 찾을 수 없어요");
    }

    if (voter.id !== expectedVoterId) {
      throw new Error("세션 사용자 정보가 일치하지 않아요");
    }
  }
}

export const participantSessionService = new ParticipantSessionService();
