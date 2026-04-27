import api from "@/shared/api/client";
import type { LoginBoardPayload } from "../model/board.types";

export const loginBoardApi = {
  getBoard: () => api.get<LoginBoardPayload>("/public/login-board"),
};
