import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { signMobileToken, verifyMobileToken } from "../mobile-token";
import { verifyAdminSecret, ADMIN_SECRET_ENV } from "../admin-secret";
import { encryptBuffer, decryptBuffer } from "../crypto";
import { createRateLimiter } from "../rate-limit";
import { clientKey, tooMany } from "../request-guard";

describe("mobile-token (توقيع توكن الموبايل)", () => {
  const ORIGINAL = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("throws when no secret is configured", () => {
    delete process.env.MOBILE_TOKEN_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.SGN_ADMIN_SECRET;
    expect(() => signMobileToken("user-1")).toThrow(/not configured/i);
  });

  it("signs and verifies a token (round-trip)", () => {
    process.env.MOBILE_TOKEN_SECRET = "unit-test-secret";
    const token = signMobileToken("user-1");
    expect(token.startsWith("v1.user-1.")).toBe(true);
    expect(verifyMobileToken(token)).toBe("user-1");
  });

  it("rejects a token signed with a different secret", () => {
    process.env.MOBILE_TOKEN_SECRET = "secret-a";
    const token = signMobileToken("user-1");
    process.env.MOBILE_TOKEN_SECRET = "secret-b";
    expect(verifyMobileToken(token)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    process.env.MOBILE_TOKEN_SECRET = "unit-test-secret";
    const token = signMobileToken("user-1");
    const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    expect(verifyMobileToken(tampered)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    process.env.MOBILE_TOKEN_SECRET = "unit-test-secret";
    expect(verifyMobileToken("")).toBeNull();
    expect(verifyMobileToken("only.two")).toBeNull();
    expect(verifyMobileToken("v2.user-1.sig")).toBeNull();
    expect(verifyMobileToken("v1..sig")).toBeNull();
  });
});

describe("admin-secret (حماية مسارات الإدارة)", () => {
  const ORIGINAL = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("returns 503 when the env secret is missing", () => {
    delete process.env[ADMIN_SECRET_ENV];
    const req = new NextRequest("http://localhost/api/admin/x");
    const res = verifyAdminSecret(req);
    expect(res?.status).toBe(503);
  });

  it("returns 401 when no secret is provided", () => {
    process.env[ADMIN_SECRET_ENV] = "top-secret";
    const req = new NextRequest("http://localhost/api/admin/x");
    expect(verifyAdminSecret(req)?.status).toBe(401);
  });

  it("returns 401 for a wrong secret", () => {
    process.env[ADMIN_SECRET_ENV] = "top-secret";
    const req = new NextRequest("http://localhost/api/admin/x", {
      headers: { "x-sync-secret": "wrong" },
    });
    expect(verifyAdminSecret(req)?.status).toBe(401);
  });

  it("accepts the secret via header", () => {
    process.env[ADMIN_SECRET_ENV] = "top-secret";
    const req = new NextRequest("http://localhost/api/admin/x", {
      headers: { "x-sync-secret": "top-secret" },
    });
    expect(verifyAdminSecret(req)).toBeNull();
  });

  it("accepts the secret via query param", () => {
    process.env[ADMIN_SECRET_ENV] = "top-secret";
    const req = new NextRequest("http://localhost/api/admin/x?secret=top-secret");
    expect(verifyAdminSecret(req)).toBeNull();
  });
});

describe("crypto (تشفير مستندات الخزنة)", () => {
  it("encrypts and decrypts a buffer (round-trip)", () => {
    const original = Buffer.from("مستند سري — ID document", "utf8");
    const encrypted = encryptBuffer(original);
    const decrypted = decryptBuffer(encrypted);
    expect(decrypted.equals(original)).toBe(true);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const data = Buffer.from("same input");
    expect(encryptBuffer(data)).not.toBe(encryptBuffer(data));
  });

  it("throws on malformed ciphertext", () => {
    expect(() => decryptBuffer("not-a-valid-payload")).toThrow();
  });

  it("throws when the ciphertext is tampered with", () => {
    const encrypted = encryptBuffer(Buffer.from("secret"));
    const parts = encrypted.split(":");
    parts[2] = parts[2].replace(/^./, parts[2][0] === "a" ? "b" : "a");
    expect(() => decryptBuffer(parts.join(":"))).toThrow();
  });
});

describe("rate-limit (حدّ الطلبات)", () => {
  it("allows up to maxRequests then blocks", () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60_000, name: `rl-${Date.now()}-a` });
    expect(limiter.isLimited("k")).toBe(false);
    expect(limiter.isLimited("k")).toBe(false);
    expect(limiter.isLimited("k")).toBe(false);
    expect(limiter.isLimited("k")).toBe(true);
  });

  it("tracks remaining requests", () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60_000, name: `rl-${Date.now()}-b` });
    expect(limiter.getRemaining("k")).toBe(2);
    limiter.isLimited("k");
    expect(limiter.getRemaining("k")).toBe(1);
  });

  it("resets a key on demand", () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000, name: `rl-${Date.now()}-c` });
    expect(limiter.isLimited("k")).toBe(false);
    expect(limiter.isLimited("k")).toBe(true);
    limiter.reset("k");
    expect(limiter.isLimited("k")).toBe(false);
  });

  it("expires the window after windowMs", async () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 20, name: `rl-${Date.now()}-d` });
    expect(limiter.isLimited("k")).toBe(false);
    expect(limiter.isLimited("k")).toBe(true);
    await new Promise((r) => setTimeout(r, 30));
    expect(limiter.isLimited("k")).toBe(false);
  });
});

describe("request-guard (أدوات الطلبات)", () => {
  it("prefers x-real-ip for the client key", () => {
    const req = new NextRequest("http://localhost/x", {
      headers: { "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" },
    });
    expect(clientKey(req)).toBe("1.2.3.4");
  });

  it("falls back to the first x-forwarded-for entry", () => {
    const req = new NextRequest("http://localhost/x", {
      headers: { "x-forwarded-for": "5.6.7.8, 10.0.0.1" },
    });
    expect(clientKey(req)).toBe("5.6.7.8");
  });

  it("uses 'unknown' when no IP header is present", () => {
    const req = new NextRequest("http://localhost/x");
    expect(clientKey(req)).toBe("unknown");
  });

  it("appends the extra discriminator", () => {
    const req = new NextRequest("http://localhost/x", {
      headers: { "x-real-ip": "1.2.3.4" },
    });
    expect(clientKey(req, "user@test.com")).toBe("1.2.3.4:user@test.com");
  });

  it("returns null when allowed and 429 with Retry-After when limited", () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000, name: `rg-${Date.now()}` });
    expect(tooMany(limiter, "k")).toBeNull();
    const res = tooMany(limiter, "k");
    expect(res?.status).toBe(429);
    expect(Number(res?.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});
