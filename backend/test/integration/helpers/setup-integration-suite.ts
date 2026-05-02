import type { Express } from "express";
import request from "supertest";
import {
  initializeIntegrationRuntime,
  shutdownIntegrationRuntime,
} from "./integration-runtime";

interface IntegrationSuiteContext {
  app?: Express;
}

function getAppOrThrow(context: IntegrationSuiteContext): Express {
  if (!context.app) {
    throw new Error("Integration app has not been initialized.");
  }

  return context.app;
}

export function setupIntegrationSuite() {
  const context: IntegrationSuiteContext = {};

  beforeAll(async () => {
    try {
      context.app = await initializeIntegrationRuntime();
    } catch (error) {
      console.error("[integration-suite] beforeAll failed:", error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      await shutdownIntegrationRuntime();
    } catch (error) {
      console.error("[integration-suite] afterAll failed:", error);
      throw error;
    }
  });

  return {
    get app() {
      return getAppOrThrow(context);
    },
    request() {
      return request(this.app);
    },
    agent() {
      return request.agent(this.app);
    },
  };
}
