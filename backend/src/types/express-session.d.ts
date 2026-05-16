// src/types/session.d.ts
import "express-session";

declare module "express-session" {
  interface SessionData {
    voter?: {
      id: number;
      uuid: string;
      nickname: string;
      role: string;
    };
    room?: {
      roomId: number;
      canvasId: number;
      type: string;
    };
  }
}
