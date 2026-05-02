import { setupIntegrationSuite } from "./helpers/setup-integration-suite";

describe("health integration", () => {
  const suite = setupIntegrationSuite();

  it("/health returns ok", async () => {
    const response = await suite.request().get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("/health/db returns ok when database is connected", async () => {
    const response = await suite.request().get("/health/db");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("/health/redis returns ok when redis is connected", async () => {
    const response = await suite.request().get("/health/redis");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.value).toBe("ok");
  });
});
