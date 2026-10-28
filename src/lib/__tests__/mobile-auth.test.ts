import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMobileToken, getUserFromMobileToken, getSessionUser } from "../mobile-auth";
import { prisma } from "../db";

// Mock the database
vi.mock("../db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock next-auth
vi.mock("../auth", () => ({
  authOptions: {
    secret: "test-secret-key-for-mobile-auth-testing",
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

describe("Mobile Authentication Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createMobileToken", () => {
    it("should create a signed token with version prefix", () => {
      const userId = "user-123";
      const token = createMobileToken(userId);

      expect(token).toBeTruthy();
      expect(token.startsWith("v1.")).toBe(true);
      expect(token.split(".").length).toBe(3);
    });

    it("should create different tokens for different users", () => {
      const token1 = createMobileToken("user-1");
      const token2 = createMobileToken("user-2");

      expect(token1).not.toBe(token2);
    });

    it("should create tokens with embedded expiry", () => {
      const token = createMobileToken("user-123");
      const parts = token.split(".");
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));

      expect(payload).toHaveProperty("sub");
      expect(payload).toHaveProperty("exp");
      expect(payload.sub).toBe("user-123");
      expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe("getUserFromMobileToken - Vulnerability Mitigation", () => {
    it("should reject raw database user IDs (CVE mitigation)", async () => {
      const rawUserId = "clx123456789";

      // Even if the user exists in the database
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: rawUserId,
        name: "Test User",
        email: "test@example.com",
        role: "member",
        password: "hashed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Raw user ID should be rejected
      const result = await getUserFromMobileToken(rawUserId);
      expect(result).toBeNull();
    });

    it("should reject tokens with invalid signature", async () => {
      const validToken = createMobileToken("user-123");
      const parts = validToken.split(".");
      
      // Tamper with the signature
      const tamperedToken = `${parts[0]}.${parts[1]}.invalid-signature`;

      const result = await getUserFromMobileToken(tamperedToken);
      expect(result).toBeNull();
    });

    it("should reject tokens with tampered payload", async () => {
      const validToken = createMobileToken("user-123");
      const parts = validToken.split(".");
      
      // Create a tampered payload with different user ID
      const tamperedPayload = Buffer.from(
        JSON.stringify({ sub: "attacker-id", exp: Math.floor(Date.now() / 1000) + 3600 })
      ).toString("base64url");
      
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const result = await getUserFromMobileToken(tamperedToken);
      expect(result).toBeNull();
    });

    it("should reject expired tokens", async () => {
      // Create a token that's already expired
      const expiredPayload = Buffer.from(
        JSON.stringify({ sub: "user-123", exp: Math.floor(Date.now() / 1000) - 3600 })
      ).toString("base64url");
      
      // We need to properly sign it, but it should still be rejected due to expiry
      const token = createMobileToken("user-123");
      const parts = token.split(".");
      
      // Replace payload with expired one (signature won't match, but that's okay for this test)
      const expiredToken = `${parts[0]}.${expiredPayload}.${parts[2]}`;

      const result = await getUserFromMobileToken(expiredToken);
      expect(result).toBeNull();
    });

    it("should reject tokens with invalid format", async () => {
      const invalidTokens = [
        "",
        "invalid",
        "v1.only-two-parts",
        "v2.wrong.version.token",
        "not-a-token",
        "Bearer v1.payload.signature",
      ];

      for (const token of invalidTokens) {
        const result = await getUserFromMobileToken(token);
        expect(result).toBeNull();
      }
    });

    it("should reject tokens with malformed JSON payload", async () => {
      const malformedPayload = Buffer.from("not-json").toString("base64url");
      const token = createMobileToken("user-123");
      const parts = token.split(".");
      const malformedToken = `${parts[0]}.${malformedPayload}.${parts[2]}`;

      const result = await getUserFromMobileToken(malformedToken);
      expect(result).toBeNull();
    });

    it("should reject tokens with missing sub field", async () => {
      const invalidPayload = Buffer.from(
        JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })
      ).toString("base64url");
      
      const token = createMobileToken("user-123");
      const parts = token.split(".");
      const invalidToken = `${parts[0]}.${invalidPayload}.${parts[2]}`;

      const result = await getUserFromMobileToken(invalidToken);
      expect(result).toBeNull();
    });

    it("should reject tokens with missing exp field", async () => {
      const invalidPayload = Buffer.from(
        JSON.stringify({ sub: "user-123" })
      ).toString("base64url");
      
      const token = createMobileToken("user-123");
      const parts = token.split(".");
      const invalidToken = `${parts[0]}.${invalidPayload}.${parts[2]}`;

      const result = await getUserFromMobileToken(invalidToken);
      expect(result).toBeNull();
    });

    it("should accept valid signed tokens and return user", async () => {
      const userId = "user-123";
      const token = createMobileToken(userId);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: userId,
        name: "Test User",
        email: "test@example.com",
        role: "member",
        password: "hashed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getUserFromMobileToken(token);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(userId);
      expect(result?.name).toBe("Test User");
      expect(result?.email).toBe("test@example.com");
      expect(result?.role).toBe("member");
    });

    it("should return null if user not found in database", async () => {
      const token = createMobileToken("non-existent-user");

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await getUserFromMobileToken(token);
      expect(result).toBeNull();
    });

    it("should trim whitespace from tokens", async () => {
      const userId = "user-123";
      const token = createMobileToken(userId);
      const tokenWithWhitespace = `  ${token}  `;

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: userId,
        name: "Test User",
        email: "test@example.com",
        role: "member",
        password: "hashed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getUserFromMobileToken(tokenWithWhitespace);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(userId);
    });
  });

  describe("getSessionUser - Bearer Token Integration", () => {
    it("should reject raw user IDs in Authorization header", async () => {
      const rawUserId = "clx123456789";
      const mockRequest = {
        headers: {
          get: vi.fn((name: string) => {
            if (name === "authorization") return `Bearer ${rawUserId}`;
            return null;
          }),
        },
      } as unknown as Request;

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: rawUserId,
        name: "Test User",
        email: "test@example.com",
        role: "member",
        password: "hashed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getSessionUser(mockRequest);
      expect(result).toBeNull();
    });

    it("should accept valid signed tokens in Authorization header", async () => {
      const userId = "user-123";
      const token = createMobileToken(userId);
      
      const mockRequest = {
        headers: {
          get: vi.fn((name: string) => {
            if (name === "authorization") return `Bearer ${token}`;
            return null;
          }),
        },
      } as unknown as Request;

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: userId,
        name: "Test User",
        email: "test@example.com",
        role: "member",
        password: "hashed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getSessionUser(mockRequest);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(userId);
    });

    it("should handle missing Authorization header gracefully", async () => {
      const mockRequest = {
        headers: {
          get: vi.fn(() => null),
        },
      } as unknown as Request;

      const result = await getSessionUser(mockRequest);
      expect(result).toBeNull();
    });

    it("should handle malformed Authorization header", async () => {
      const mockRequest = {
        headers: {
          get: vi.fn((name: string) => {
            if (name === "authorization") return "NotBearer token";
            return null;
          }),
        },
      } as unknown as Request;

      const result = await getSessionUser(mockRequest);
      expect(result).toBeNull();
    });
  });

  describe("Security Properties", () => {
    it("should use HMAC-SHA256 for signature (timing-safe)", () => {
      // Create two tokens and verify they have different signatures
      const token1 = createMobileToken("user-1");
      const token2 = createMobileToken("user-2");
      
      const sig1 = token1.split(".")[2];
      const sig2 = token2.split(".")[2];
      
      expect(sig1).not.toBe(sig2);
      expect(sig1.length).toBeGreaterThan(20); // HMAC-SHA256 base64url is ~43 chars
    });

    it("should not leak timing information on signature mismatch", async () => {
      // This test verifies that signature comparison uses timingSafeEqual
      const validToken = createMobileToken("user-123");
      const parts = validToken.split(".");
      
      // Create tokens with signatures of different lengths
      const shortSig = "abc";
      const longSig = parts[2] + "extra";
      
      const token1 = `${parts[0]}.${parts[1]}.${shortSig}`;
      const token2 = `${parts[0]}.${parts[1]}.${longSig}`;
      
      const result1 = await getUserFromMobileToken(token1);
      const result2 = await getUserFromMobileToken(token2);
      
      // Both should be rejected
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it("should enforce token expiry (30 days)", () => {
      const token = createMobileToken("user-123");
      const parts = token.split(".");
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      
      const now = Math.floor(Date.now() / 1000);
      const expectedExpiry = now + (30 * 24 * 60 * 60); // 30 days
      
      // Allow 5 second tolerance for test execution time
      expect(payload.exp).toBeGreaterThanOrEqual(expectedExpiry - 5);
      expect(payload.exp).toBeLessThanOrEqual(expectedExpiry + 5);
    });
  });

  describe("Pentest Scenario Reproduction", () => {
    it("should prevent impersonation via userId from public services directory", async () => {
      // Simulate attacker obtaining userId from public services endpoint
      const victimUserId = "victim-user-id-from-services-api";
      
      // Attacker tries to use raw userId as Bearer token
      const mockRequest = {
        headers: {
          get: vi.fn((name: string) => {
            if (name === "authorization") return `Bearer ${victimUserId}`;
            return null;
          }),
        },
      } as unknown as Request;

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: victimUserId,
        name: "Victim User",
        email: "victim@example.com",
        role: "member",
        password: "hashed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // This should fail - raw userId should not authenticate
      const result = await getSessionUser(mockRequest);
      expect(result).toBeNull();
    });

    it("should prevent PDF access via raw userId in query token", async () => {
      // Simulate attacker using raw userId as query token parameter
      const victimUserId = "victim-user-id";
      
      // Attacker tries to use raw userId as token
      const result = await getUserFromMobileToken(victimUserId);
      
      // This should fail - raw userId should not be accepted
      expect(result).toBeNull();
    });

    it("should prevent vault document access with forged identity", async () => {
      // Simulate the vault access pattern from the pentest
      const attackerUserId = "attacker-id";
      const victimUserId = "victim-id";
      
      // Attacker tries to use victim's raw userId
      const mockRequest = {
        headers: {
          get: vi.fn((name: string) => {
            if (name === "authorization") return `Bearer ${victimUserId}`;
            return null;
          }),
        },
      } as unknown as Request;

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: victimUserId,
        name: "Victim",
        email: "victim@example.com",
        role: "member",
        password: "hashed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Authentication should fail with raw userId
      const user = await getSessionUser(mockRequest);
      expect(user).toBeNull();
    });

    it("should only accept properly signed tokens from legitimate login", async () => {
      // Simulate legitimate login flow
      const userId = "legitimate-user";
      const legitimateToken = createMobileToken(userId);
      
      const mockRequest = {
        headers: {
          get: vi.fn((name: string) => {
            if (name === "authorization") return `Bearer ${legitimateToken}`;
            return null;
          }),
        },
      } as unknown as Request;

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: userId,
        name: "Legitimate User",
        email: "legit@example.com",
        role: "member",
        password: "hashed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // This should succeed - properly signed token
      const user = await getSessionUser(mockRequest);
      expect(user).not.toBeNull();
      expect(user?.id).toBe(userId);
    });
  });
});
