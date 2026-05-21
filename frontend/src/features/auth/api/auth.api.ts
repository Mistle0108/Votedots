import api from "@/shared/api/client";
import type {
  GuestSessionRequest,
  LoginRequest,
  RegisterRequest,
  Voter,
} from "../model/auth.types";

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const authApi = {
  register: (data: RegisterRequest) =>
    api.post<{ message: string }>("/auth/register", data),
  createGuestSession: (data: GuestSessionRequest) =>
    api.post<{ message: string; voter: Voter }>("/auth/guest-session", data),

  login: (data: LoginRequest) =>
    api.post<{ message: string }>("/auth/login", data),

  logout: () => api.post<{ message: string }>("/auth/logout"),
  changePassword: (data: ChangePasswordRequest) =>
    api.post<{ message: string }>("/auth/change-password", data),
  withdraw: (password?: string) =>
    api.post<{ message: string }>("/auth/withdraw", password ? { password } : undefined),

  me: () => api.get<{ voter: Voter }>("/auth/me"),
};
