export interface RegisterRequest {
  username: string;
  password: string;
  nickname: string;
  acceptedTerms: boolean;
  isAge14OrOlderConfirmed: boolean;
  termsAcceptedLocale: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface Voter {
  uuid: string;
  username: string;
  nickname: string;
  role: string;
  createdAt: string;
}
