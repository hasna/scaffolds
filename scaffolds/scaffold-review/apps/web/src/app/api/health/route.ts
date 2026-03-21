import { NextResponse } from "next/server";
import { db } from "@scaffold-review/database/client";
import { sql } from "drizzle-orm";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  services: {
    database: {
      status: "up" | "down";
      latencyMs?: number;
      error?: string;
    };
    redis?: {
      status: "up" | "down";
      latencyMs?: number;
      error?: string;
    };
  };
}

export async function GET() {
  const health: HealthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.0.0",
    services: {
      database: { status: "down" },
    },
  };

  // Check database
  try {
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    health.services.database = {
      status: "up",
      latencyMs: Date.now() - dbStart,
    };
  } catch (error) {
    health.services.database = {
      status: "down",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    health.status = "unhealthy";
  }

  // Check Redis if configured
  if (process.env.REDIS_URL) {
    try {
      const Redis = (await import("ioredis")).default;
      const redis = new Redis(process.env.REDIS_URL);
      const redisStart = Date.now();
      await redis.ping();
      health.services.redis = {
        status: "up",
        latencyMs: Date.now() - redisStart,
      };
      await redis.quit();
    } catch (error) {
      health.services.redis = {
        status: "down",
        error: error instanceof Error ? error.message : "Unknown error",
      };
      if (health.status === "healthy") {
        health.status = "degraded";
      }
    }
  }

  const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
