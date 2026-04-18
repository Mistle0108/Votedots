import api from "@/shared/api/client";
import type { LoginRequest, RegisterRequest, Voter } from "../model/auth.types";

export const authApi = {
  register: (data: RegisterRequest) =>
    api.post<{ message: string }>("/auth/register", data),

  login: (data: LoginRequest) =>
    api.post<{ message: string }>("/auth/login", data),

  logout: () => api.post<{ message: string }>("/auth/logout"),

  me: () => api.get<{ voter: Voter }>("/auth/me"),
};
