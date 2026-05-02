import path from "node:path";
import { config } from "dotenv";

config({
  path: path.resolve(process.cwd(), ".env.test"),
  override: true,
  quiet: true,
});

process.env.NODE_ENV ??= "test";
process.env.CLIENT_URL ??= "http://localhost:5173";
process.env.SESSION_SECRET ??= "test-session-secret";
