import type { Express } from "express";
import { Client } from "pg";
import { AppDataSource } from "../../../src/database/data-source";
import { createApp } from "../../../src/app";
import {
  connectRedis,
  disconnectRedis,
  redisClient,
} from "../../../src/config/redis";
import { InitialSchemaReset1783000000000 } from "../../../src/database/migrations/1783000000000-InitialSchemaReset";

function buildQuotedTableName(tablePath: string): string {
  return tablePath
    .split(".")
    .map((segment) => `"${segment}"`)
    .join(".");
}

function buildAdminDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.pathname = "/postgres";
  return url.toString();
}

function getDatabaseName(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  const databaseName = url.pathname.replace(/^\//, "");

  if (!databaseName) {
    throw new Error("DATABASE_URL must include a database name.");
  }

  return databaseName;
}

async function ensureTestDatabaseExists(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for integration tests.");
  }

  const databaseName = getDatabaseName(databaseUrl);
  const adminClient = new Client({
    connectionString: buildAdminDatabaseUrl(databaseUrl),
  });

  await adminClient.connect();

  try {
    const result = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName],
    );

    if (result.rowCount && result.rowCount > 0) {
      return;
    }

    const safeDatabaseName = `"${databaseName.replace(/"/g, "\"\"")}"`;
    await adminClient.query(`CREATE DATABASE ${safeDatabaseName}`);
  } finally {
    await adminClient.end();
  }
}

async function ensureSchemaExists(): Promise<void> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    const hasCanvasTable = await queryRunner.hasTable("canvas");

    if (hasCanvasTable) {
      return;
    }

    const migration = new InitialSchemaReset1783000000000();
    await migration.up(queryRunner);
  } finally {
    await queryRunner.release();
  }
}

export async function initializeIntegrationRuntime(): Promise<Express> {
  await ensureTestDatabaseExists();
  await connectRedis();

  if (!AppDataSource.isInitialized) {
    AppDataSource.setOptions({ migrations: [] });
    await AppDataSource.initialize();
  }

  await ensureSchemaExists();

  await resetIntegrationState();

  return createApp();
}

export async function resetIntegrationState(): Promise<void> {
  if (redisClient.isOpen) {
    await redisClient.flushAll();
  }

  if (!AppDataSource.isInitialized) {
    return;
  }

  const tableNames = AppDataSource.entityMetadatas
    .map((metadata) => buildQuotedTableName(metadata.tablePath))
    .join(", ");

  if (!tableNames) {
    return;
  }

  await AppDataSource.query(
    `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`,
  );
}

export async function shutdownIntegrationRuntime(): Promise<void> {
  await resetIntegrationState();

  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }

  await disconnectRedis();
}
