import { setupIntegrationSuite } from "./helpers/setup-integration-suite";

describe("auth integration", () => {
  const suite = setupIntegrationSuite();

  it("registers a voter successfully", async () => {
    const response = await suite.request().post("/auth/register").send({
      username: "user0001",
      password: "password1",
      nickname: "Tester01",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: "REGISTER_SUCCESS" });
  });

  it("logs in and returns the current session voter", async () => {
    const agent = suite.agent();

    await agent.post("/auth/register").send({
      username: "user0002",
      password: "password1",
      nickname: "Tester02",
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
      voter: {
        uuid: expect.any(String),
        nickname: "Tester02",
        role: "user",
      },
    });
  });
});
