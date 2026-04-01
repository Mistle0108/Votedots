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
