import { createHmac, timingSafeEqual } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./db";

export interface SessionUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

const MOBILE_TOKEN_PREFIX = "v1";
const MOBILE_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function getMobileTokenKey(): string {
  return `mobile-token:${String(authOptions.secret)}`;
}

function signMobilePayload(payload: string): string {
  return createHmac("sha256", getMobileTokenKey()).update(payload).digest("base64url");
}

/** Issues a signed, expiring bearer token for the given user id (used by mobile login). */
export function createMobileToken(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + MOBILE_TOKEN_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp })).toString("base64url");
  const signed = `${MOBILE_TOKEN_PREFIX}.${payload}`;
  return `${signed}.${signMobilePayload(signed)}`;
}

/** Verifies signature and expiry; returns the user id or null. */
function verifyMobileToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== MOBILE_TOKEN_PREFIX) return null;
  const signed = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(signMobilePayload(signed));
  const actual = Buffer.from(parts[2]);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (typeof sub !== "string" || !sub || typeof exp !== "number") return null;
    if (exp < Math.floor(Date.now() / 1000)) return null;
    return sub;
  } catch {
    return null;
  }
}

/** Resolves a signed mobile token to a user; raw database ids are rejected. */
export async function getUserFromMobileToken(token: string): Promise<SessionUser | null> {
  const userId = verifyMobileToken(token.trim());
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || "member",
  };
}

export async function getSessionUser(req?: Request): Promise<SessionUser | null> {
  // 1. Try NextAuth session cookies (primarily for Web client)
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      return {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || null,
        role: (session.user as any).role || "member",
      };
    }
  } catch (err) {
    console.error("[getSessionUser] NextAuth session lookup failed:", err);
  }

  // 2. Try Authorization Bearer Token (for Mobile client)
  if (req) {
    try {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7).trim();
        if (token) {
          const user = await getUserFromMobileToken(token);
          if (user) return user;
        }
      }
    } catch (err) {
      console.error("[getSessionUser] Bearer token lookup failed:", err);
    }
  }

  return null;
}
