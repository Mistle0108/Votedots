import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

export interface RegisterRequest {
  username: string;
  password: string;
  nickname: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface Voter {
  uuid: string;
  nickname: string;
  role: string;
}

export const authApi = {
  register: (data: RegisterRequest) =>
    api.post<{ message: string }>("/auth/register", data),

  login: (data: LoginRequest) =>
    api.post<{ message: string; voter: Voter }>("/auth/login", data),

  logout: () => api.post<{ message: string }>("/auth/logout"),

  me: () => api.get<{ voter: Voter }>("/auth/me"),
};
