import { AppDataSource } from "../../src/database/data-source";
import { Voter } from "../../src/entities/voter.entity";
import { setupIntegrationSuite } from "./helpers/setup-integration-suite";

describe("auth integration", () => {
  const suite = setupIntegrationSuite();
  const voterRepository = AppDataSource.getRepository(Voter);

  it("registers a voter successfully", async () => {
    const response = await suite.request().post("/auth/register").send({
      username: "user0001",
      password: "password1",
      nickname: "Tester01",
      acceptedTerms: true,
      isAge14OrOlderConfirmed: true,
      termsAcceptedLocale: "ko",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: "REGISTER_SUCCESS" });

    const voter = await voterRepository.findOneByOrFail({ username: "user0001" });

    expect(voter.termsAcceptedAt).toBeInstanceOf(Date);
    expect(voter.termsAcceptedLocale).toBe("ko");
    expect(voter.termsVersion).toBe("2026-05-12");
    expect(voter.isAge14OrOlderConfirmed).toBe(true);
  });

  it("logs in and returns the current session voter", async () => {
    const agent = suite.agent();

    await agent.post("/auth/register").send({
      username: "user0002",
      password: "password1",
      nickname: "Tester02",
      acceptedTerms: true,
      isAge14OrOlderConfirmed: true,
      termsAcceptedLocale: "en",
    });

    const loginResponse = await agent.post("/auth/login").send({
      username: "user0002",
      password: "password1",
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toEqual({ message: "LOGIN_SUCCESS" });
    expect(loginResponse.headers["set-cookie"]).toBeDefined();

    const meResponse = await agent.get("/auth/me");

    expect(meResponse.status).toBe(200);
    expect(meResponse.body).toEqual({
      voter: expect.objectContaining({
        uuid: expect.any(String),
        username: "user0002",
        nickname: "Tester02",
        role: "user",
        isGuest: false,
        createdAt: expect.any(String),
      }),
    });
  });

  it("creates a guest session and returns the current guest voter", async () => {
    const agent = suite.agent();

    const guestSessionResponse = await agent.post("/auth/guest-session").send({
      nickname: "Guest01",
      browserKey: "browser-key-auth-guest-01",
    });

    expect(guestSessionResponse.status).toBe(201);
    expect(guestSessionResponse.body).toEqual({
      message: "GUEST_SESSION_CREATED",
      voter: expect.objectContaining({
        uuid: expect.any(String),
        username: expect.stringMatching(/^guest-/),
        nickname: "Guest01",
        role: "user",
        isGuest: true,
        createdAt: expect.any(String),
      }),
    });
    expect(guestSessionResponse.headers["set-cookie"]).toBeDefined();

    const guestUsername = String(guestSessionResponse.body.voter.username);
    const storedGuest = await voterRepository.findOneByOrFail({
      username: guestUsername,
    });

    expect(storedGuest.isGuest).toBe(true);
    expect(storedGuest.termsAcceptedAt).toBeNull();
    expect(storedGuest.termsAcceptedLocale).toBeNull();
    expect(storedGuest.termsVersion).toBeNull();
    expect(storedGuest.isAge14OrOlderConfirmed).toBe(false);

    const meResponse = await agent.get("/auth/me");

    expect(meResponse.status).toBe(200);
    expect(meResponse.body).toEqual({
      voter: expect.objectContaining({
        uuid: expect.any(String),
        username: guestUsername,
        nickname: "Guest01",
        role: "user",
        isGuest: true,
        createdAt: expect.any(String),
      }),
    });
  });

  it("blocks guest sessions from member-only account routes", async () => {
    const agent = suite.agent();

    await agent.post("/auth/guest-session").send({
      nickname: "Guest02",
      browserKey: "browser-key-auth-guest-02",
    });

    const changePasswordResponse = await agent.post("/auth/change-password").send({
      currentPassword: "password1",
      newPassword: "password2",
    });

    expect(changePasswordResponse.status).toBe(403);
    expect(changePasswordResponse.body).toEqual({
      message: "AUTH_MEMBER_ONLY",
    });

    const statsResponse = await agent.get("/mypage/stats");

    expect(statsResponse.status).toBe(403);
    expect(statsResponse.body).toEqual({
      message: "AUTH_MEMBER_ONLY",
    });
  });
});
