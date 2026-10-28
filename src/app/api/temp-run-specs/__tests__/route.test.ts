import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from "vitest";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { requireAuthorize } from "@/lib/auth-helpers";
import { GET } from "../route";

// Mock dependencies
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({
  requireAuthorize: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    post: {
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $executeRawUnsafe: vi.fn(),
  },
}));

describe("GET /api/temp-run-specs - Security Tests", () => {
  const mockRequest = (action?: string) => {
    const url = action 
      ? `http://localhost:3000/api/temp-run-specs?action=${action}`
      : "http://localhost:3000/api/temp-run-specs";
    return new Request(url);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication Enforcement", () => {
    it("should reject unauthenticated requests with 401", async () => {
      // Mock no session
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = mockRequest();
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      
      // Verify authorization was checked before any database operations
      expect(prisma.post.count).not.toHaveBeenCalled();
      expect(prisma.post.findMany).not.toHaveBeenCalled();
      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });

    it("should reject requests without user ID with 401", async () => {
      // Mock session without user ID
      vi.mocked(getServerSession).mockResolvedValue({
        user: {},
        expires: "2024-12-31",
      } as any);

      const req = mockRequest();
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      
      // Verify no database operations were performed
      expect(prisma.post.count).not.toHaveBeenCalled();
      expect(prisma.post.findMany).not.toHaveBeenCalled();
      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });
  });

  describe("Authorization Enforcement - Diagnostic Action", () => {
    it("should reject authenticated users without settings.view permission with 403", async () => {
      // Mock authenticated session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-123", email: "user@example.com" },
        expires: "2024-12-31",
      } as any);

      // Mock authorization failure for settings.view
      vi.mocked(requireAuthorize).mockResolvedValue(false);

      const req = mockRequest("diagnose");
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      
      // Verify requireAuthorize was called with correct permission
      expect(requireAuthorize).toHaveBeenCalledWith("user-123", "settings.view");
      
      // Verify no database operations were performed
      expect(prisma.post.count).not.toHaveBeenCalled();
      expect(prisma.post.findMany).not.toHaveBeenCalled();
      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });

    it("should reject default action (diagnose) without settings.view permission", async () => {
      // Mock authenticated session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-456", email: "user@example.com" },
        expires: "2024-12-31",
      } as any);

      // Mock authorization failure
      vi.mocked(requireAuthorize).mockResolvedValue(false);

      // No action parameter defaults to "diagnose"
      const req = mockRequest();
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      
      // Verify settings.view was required for default action
      expect(requireAuthorize).toHaveBeenCalledWith("user-456", "settings.view");
      
      // Verify no database operations were performed
      expect(prisma.post.count).not.toHaveBeenCalled();
      expect(prisma.post.findMany).not.toHaveBeenCalled();
    });
  });

  describe("Authorization Enforcement - Mutating Actions", () => {
    it("should reject fix-locale action without settings.edit permission with 403", async () => {
      // Mock authenticated session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-789", email: "user@example.com" },
        expires: "2024-12-31",
      } as any);

      // Mock authorization failure for settings.edit
      vi.mocked(requireAuthorize).mockResolvedValue(false);

      const req = mockRequest("fix-locale");
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      
      // Verify requireAuthorize was called with settings.edit for mutating action
      expect(requireAuthorize).toHaveBeenCalledWith("user-789", "settings.edit");
      
      // Verify no database mutations were performed
      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
      expect(prisma.post.update).not.toHaveBeenCalled();
    });

    it("should reject fix-images action without settings.edit permission with 403", async () => {
      // Mock authenticated session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-abc", email: "user@example.com" },
        expires: "2024-12-31",
      } as any);

      // Mock authorization failure for settings.edit
      vi.mocked(requireAuthorize).mockResolvedValue(false);

      const req = mockRequest("fix-images");
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      
      // Verify requireAuthorize was called with settings.edit for mutating action
      expect(requireAuthorize).toHaveBeenCalledWith("user-abc", "settings.edit");
      
      // Verify no database mutations were performed
      expect(prisma.post.findMany).not.toHaveBeenCalled();
      expect(prisma.post.update).not.toHaveBeenCalled();
    });
  });

  describe("Permission-Based Access Control", () => {
    it("should allow diagnose action with settings.view permission", async () => {
      // Mock authenticated session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "admin-123", email: "admin@example.com" },
        expires: "2024-12-31",
      } as any);

      // Mock authorization success for settings.view
      vi.mocked(requireAuthorize).mockResolvedValue(true);

      // Mock database responses
      vi.mocked(prisma.post.count).mockResolvedValue(100);
      vi.mocked(prisma.post.findMany).mockResolvedValue([
        {
          id: "post-1",
          title: "Test Post",
          locale: "ar",
          image: null,
          source: "manual",
          createdAt: new Date(),
        },
      ] as any);

      const req = mockRequest("diagnose");
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(requireAuthorize).toHaveBeenCalledWith("admin-123", "settings.view");
      
      // Verify diagnostic queries were allowed
      expect(prisma.post.count).toHaveBeenCalled();
      expect(prisma.post.findMany).toHaveBeenCalled();
      
      // Verify response contains diagnostic data
      expect(data).toHaveProperty("total");
      expect(data).toHaveProperty("published");
      expect(data).toHaveProperty("samples");
    });

    it("should allow fix-locale action with settings.edit permission", async () => {
      // Mock authenticated session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "admin-456", email: "admin@example.com" },
        expires: "2024-12-31",
      } as any);

      // Mock authorization success for settings.edit
      vi.mocked(requireAuthorize).mockResolvedValue(true);

      // Mock database response
      vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(5);

      const req = mockRequest("fix-locale");
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(requireAuthorize).toHaveBeenCalledWith("admin-456", "settings.edit");
      
      // Verify mutation was allowed
      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        'UPDATE "Post" SET locale = \'ar\' WHERE locale IS NULL OR locale = \'\''
      );
      expect(data).toHaveProperty("fixed");
    });

    it("should allow fix-images action with settings.edit permission", async () => {
      // Mock authenticated session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "admin-789", email: "admin@example.com" },
        expires: "2024-12-31",
      } as any);

      // Mock authorization success for settings.edit
      vi.mocked(requireAuthorize).mockResolvedValue(true);

      // Mock database responses
      vi.mocked(prisma.post.findMany).mockResolvedValue([
        { id: "post-1", image: "http://localhost/uploads/test.jpg" },
        { id: "post-2", image: "/uploads/test2.jpg" },
      ] as any);
      vi.mocked(prisma.post.update).mockResolvedValue({} as any);

      const req = mockRequest("fix-images");
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(requireAuthorize).toHaveBeenCalledWith("admin-789", "settings.edit");
      
      // Verify mutation was allowed
      expect(prisma.post.findMany).toHaveBeenCalled();
      expect(prisma.post.update).toHaveBeenCalledTimes(2);
      expect(data).toHaveProperty("fixed");
      expect(data.fixed).toBe(2);
    });
  });

  describe("Authorization Order - Security Property", () => {
    it("should check authentication before authorization", async () => {
      // Mock no session
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = mockRequest("fix-locale");
      await GET(req);

      // Verify getServerSession was called
      expect(getServerSession).toHaveBeenCalled();
      
      // Verify requireAuthorize was NOT called (short-circuited by auth check)
      expect(requireAuthorize).not.toHaveBeenCalled();
    });

    it("should check authorization before database operations", async () => {
      // Mock authenticated session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-xyz", email: "user@example.com" },
        expires: "2024-12-31",
      } as any);

      // Mock authorization failure
      vi.mocked(requireAuthorize).mockResolvedValue(false);

      const req = mockRequest("fix-locale");
      await GET(req);

      // Verify authorization was checked
      expect(requireAuthorize).toHaveBeenCalled();
      
      // Verify no database operations were performed after authorization failure
      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
      expect(prisma.post.count).not.toHaveBeenCalled();
      expect(prisma.post.findMany).not.toHaveBeenCalled();
      expect(prisma.post.update).not.toHaveBeenCalled();
    });
  });

  describe("Exploit Prevention - Bulk Mutations", () => {
    it("should prevent anonymous bulk locale updates", async () => {
      // Simulate attacker without authentication
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = mockRequest("fix-locale");
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      
      // Verify the bulk update was blocked
      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });

    it("should prevent unauthorized bulk image clearing", async () => {
      // Simulate authenticated user without proper permission
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "member-123", email: "member@example.com" },
        expires: "2024-12-31",
      } as any);

      // Member role doesn't have settings.edit permission
      vi.mocked(requireAuthorize).mockResolvedValue(false);

      const req = mockRequest("fix-images");
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      
      // Verify the bulk image clearing was blocked
      expect(prisma.post.findMany).not.toHaveBeenCalled();
      expect(prisma.post.update).not.toHaveBeenCalled();
    });
  });

  describe("Exploit Prevention - Metadata Disclosure", () => {
    it("should prevent anonymous access to diagnostic metadata", async () => {
      // Simulate attacker without authentication
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = mockRequest("diagnose");
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      
      // Verify diagnostic queries were blocked
      expect(prisma.post.count).not.toHaveBeenCalled();
      expect(prisma.post.findMany).not.toHaveBeenCalled();
      
      // Verify no metadata was disclosed
      expect(data).not.toHaveProperty("total");
      expect(data).not.toHaveProperty("samples");
      expect(data).not.toHaveProperty("localeCounts");
      expect(data).not.toHaveProperty("imageStats");
    });

    it("should prevent unauthorized access to post samples", async () => {
      // Simulate authenticated user without settings.view permission
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "member-456", email: "member@example.com" },
        expires: "2024-12-31",
      } as any);

      // Member role doesn't have settings.view permission
      vi.mocked(requireAuthorize).mockResolvedValue(false);

      const req = mockRequest();
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      
      // Verify post samples were not retrieved
      expect(prisma.post.findMany).not.toHaveBeenCalled();
      
      // Verify no metadata was disclosed
      expect(data).not.toHaveProperty("samples");
    });
  });

  describe("Action-Specific Permission Requirements", () => {
    it("should require settings.edit for fix-locale, not settings.view", async () => {
      // Mock authenticated session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-test", email: "user@example.com" },
        expires: "2024-12-31",
      } as any);

      // Mock authorization check
      vi.mocked(requireAuthorize).mockResolvedValue(false);

      const req = mockRequest("fix-locale");
      await GET(req);

      // Verify the correct permission was checked
      expect(requireAuthorize).toHaveBeenCalledWith("user-test", "settings.edit");
      expect(requireAuthorize).not.toHaveBeenCalledWith("user-test", "settings.view");
    });

    it("should require settings.edit for fix-images, not settings.view", async () => {
      // Mock authenticated session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-test2", email: "user@example.com" },
        expires: "2024-12-31",
      } as any);

      // Mock authorization check
      vi.mocked(requireAuthorize).mockResolvedValue(false);

      const req = mockRequest("fix-images");
      await GET(req);

      // Verify the correct permission was checked
      expect(requireAuthorize).toHaveBeenCalledWith("user-test2", "settings.edit");
      expect(requireAuthorize).not.toHaveBeenCalledWith("user-test2", "settings.view");
    });

    it("should require settings.view for diagnose action", async () => {
      // Mock authenticated session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-test3", email: "user@example.com" },
        expires: "2024-12-31",
      } as any);

      // Mock authorization check
      vi.mocked(requireAuthorize).mockResolvedValue(false);

      const req = mockRequest("diagnose");
      await GET(req);

      // Verify the correct permission was checked
      expect(requireAuthorize).toHaveBeenCalledWith("user-test3", "settings.view");
      expect(requireAuthorize).not.toHaveBeenCalledWith("user-test3", "settings.edit");
    });
  });
});
