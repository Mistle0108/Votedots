import type { SessionData } from "express-session";
import { Server } from "socket.io";
import { redisClient } from "../../config/redis";
import { sessionStore } from "../../config/session";
import { gameConfig } from "../../config/game.config";
import { AppDataSource } from "../../database/data-source";
import { Canvas } from "../../entities/canvas.entity";
import { GamePhase } from "../game/game-phase.types";

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

const canvasRepository = AppDataSource.getRepository(Canvas);

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

  private async getCanvasPhase(canvasId: number): Promise<GamePhase | null> {
    const canvas = await canvasRepository.findOne({
      where: { id: canvasId },
    });

    return canvas?.phase ?? null;
  }

  private getDefaultStatusByPhase(phase: GamePhase | null): ParticipantStatus {
    if (phase === GamePhase.ROUND_ACTIVE) {
      return "waiting";
    }

    if (phase === GamePhase.GAME_END) {
      return "waiting";
    }

    return "voting";
  }

  private getRestoredStatusByPhase(
    phase: GamePhase | null,
    existingStatus: ParticipantStatus,
  ): ParticipantStatus {
    if (phase === GamePhase.ROUND_ACTIVE) {
      return existingStatus;
    }

    if (phase === GamePhase.GAME_END) {
      return "waiting";
    }

    return "voting";
  }

  private async getDefaultStatus(canvasId: number): Promise<ParticipantStatus> {
    const phase = await this.getCanvasPhase(canvasId);
    return this.getDefaultStatusByPhase(phase);
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
    io: Server,
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
          await this.broadcastParticipantsUpdated(io, canvasId);
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

    const canvasPhase = await this.getCanvasPhase(canvasId);
    const status = existing
      ? this.getRestoredStatusByPhase(canvasPhase, existing.status)
      : await this.getDefaultStatus(canvasId);

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
    io: Server,
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

      await this.broadcastParticipantsUpdated(io, canvasId);
      this.scheduleCleanup(canvasId, sessionId, graceUntil, io);
      affectedCanvasIds.push(canvasId);
    }

    return affectedCanvasIds;
  }

  async prepareParticipantsForNextRound(canvasId: number): Promise<void> {
    const sessionIds = await redisClient.sMembers(
      this.buildCanvasSessionsKey(canvasId),
    );

    for (const sessionId of sessionIds) {
      const state = await this.getCanvasParticipation(canvasId, sessionId);
      if (!state) {
        continue;
      }

      await redisClient.hSet(this.buildCanvasSessionKey(canvasId, sessionId), {
        socketId: state.socketId ?? "",
        status: "voting",
        connected: state.connected ? "true" : "false",
        disconnectedAt: state.disconnectedAt ?? "",
        graceUntil: state.graceUntil ?? "",
      });
    }
  }

  async activateParticipantsForRound(
    canvasId: number,
  ): Promise<{ voterIds: number[] }> {
    await this.prepareParticipantsForNextRound(canvasId);

    const sessionIds = await redisClient.sMembers(
      this.buildCanvasSessionsKey(canvasId),
    );

    const voterIds: number[] = [];
    const seenVoterIds = new Set<number>();

    for (const sessionId of sessionIds) {
      const state = await this.getCanvasParticipation(canvasId, sessionId);
      if (!state || state.status !== "voting") {
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
      if (!state || !state.connected) {
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
      throw new Error("Current session is not participating in this canvas");
    }

    if (state.status !== "voting") {
      throw new Error("Current round is not available for voting");
    }

    const voter = await this.getSessionVoter(sessionId);
    if (!voter) {
      throw new Error("Session voter information was not found");
    }

    if (voter.id !== expectedVoterId) {
      throw new Error("Session user information does not match");
    }
  }

  async broadcastParticipantsUpdated(
    io: Server,
    canvasId: number,
  ): Promise<void> {
    const count = await this.getParticipantCount(canvasId);

    io.to(`canvas:${canvasId}`).emit("participants:updated", {
      canvasId,
      count,
    });
  }
}

export const participantSessionService = new ParticipantSessionService();
