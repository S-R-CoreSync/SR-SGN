import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface HealthCheckResponse {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: "ok" | "error";
      responseTime: number;
      error?: string;
    };
    redis?: {
      status: "ok" | "error";
      responseTime: number;
      error?: string;
    };
    /**
     * حالة توكن فيسبوك — يُفحص فقط عند `?sources=true` لتفادي نداء خارجي بكل فحص.
     * السبب: توكن منتهٍ كان يوقف المزامنة بصمت لأشهر.
     */
    facebook?: {
      status: "ok" | "expiring" | "error";
      expiresAt?: string | null;
      daysLeft?: number | null;
      error?: string;
    };
    api: {
      status: "ok";
      version: string;
    };
  };
}

const startTime = Date.now();

/**
 * Health check endpoint
 * GET /api/health
 * 
 * Returns system health status including:
 * - Database connectivity
 * - Redis connectivity (if configured)
 * - API version
 * - Response times
 */
export async function GET(request: NextRequest) {
  const checks: HealthCheckResponse["checks"] = {
    database: {
      status: "error",
      responseTime: 0,
    },
    api: {
      status: "ok",
      version: "1.0.0",
    },
  };

  let overallStatus: "ok" | "degraded" | "error" = "ok";

  // Check database connectivity
  const dbStart = Date.now();
  try {
    await prisma.user.count({ take: 1 });
    checks.database.status = "ok";
    checks.database.responseTime = Date.now() - dbStart;
  } catch (error) {
    checks.database.status = "error";
    checks.database.responseTime = Date.now() - dbStart;
    checks.database.error = error instanceof Error ? error.message : "Unknown error";
    overallStatus = "error";
  }

  // Check Redis connectivity (if configured)
  if (process.env.REDIS_URL) {
    const redisStart = Date.now();
    try {
      // Import and use Redis client
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({
        url: process.env.REDIS_URL,
        token: process.env.REDIS_TOKEN || "",
      });

      await redis.ping();
      checks.redis = {
        status: "ok",
        responseTime: Date.now() - redisStart,
      };
    } catch (error) {
      checks.redis = {
        status: "error",
        responseTime: Date.now() - redisStart,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      overallStatus = "degraded";
    }
  }

  // فحص توكن فيسبوك عند الطلب فقط (`?sources=true`)
  const wantsSources = request.nextUrl.searchParams.get("sources") === "true";
  if (wantsSources && process.env.FACEBOOK_PAGE_TOKEN) {
    const token = process.env.FACEBOOK_PAGE_TOKEN.replace(/^["']|["']$/g, "").trim();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      // `debug_token` يقبل التوكن نفسه كـ access_token. وإن كان التوكن تابعاً
      // لتطبيق آخر غير تطبيق الدخول، نجرّب توكن التطبيق (`app_id|app_secret`) كبديل.
      const debugUrl = (accessToken: string) =>
        `https://graph.facebook.com/v19.0/debug_token?input_token=${encodeURIComponent(token)}` +
        `&access_token=${encodeURIComponent(accessToken)}`;

      let json: {
        data?: { is_valid?: boolean; expires_at?: number; scopes?: string[] };
        error?: { message?: string };
      } = {};
      for (const accessToken of [token, `${process.env.FACEBOOK_CLIENT_ID}|${process.env.FACEBOOK_CLIENT_SECRET}`]) {
        const res = await fetch(debugUrl(accessToken), { signal: controller.signal, cache: "no-store" });
        json = await res.json();
        if (json.data) break;
      }
      clearTimeout(timer);
      const data = json.data;
      if (!data?.is_valid) {
        checks.facebook = {
          status: "error",
          error: json.error?.message || "Facebook token is not valid",
        };
        overallStatus = "degraded";
      } else {
        const expiresAt = data.expires_at ?? 0;
        const daysLeft =
          expiresAt === 0 ? null : Math.floor((expiresAt * 1000 - Date.now()) / 86_400_000);
        checks.facebook = {
          status: daysLeft !== null && daysLeft <= 7 ? "expiring" : "ok",
          expiresAt: expiresAt === 0 ? null : new Date(expiresAt * 1000).toISOString(),
          daysLeft,
        };
        if (daysLeft !== null && daysLeft <= 7) overallStatus = "degraded";
      }
    } catch (error) {
      checks.facebook = {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
      overallStatus = "degraded";
    }
  }

  const response: HealthCheckResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  };
  const statusCode = overallStatus === "error" ? 503 : 200;

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Health check with detailed metrics
 * GET /api/health?details=true
 */
export async function HEAD(request: NextRequest) {
  try {
    await prisma.user.count({ take: 1 });
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
