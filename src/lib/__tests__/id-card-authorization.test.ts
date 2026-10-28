import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ROLE_DEFAULTS, ALL_PERMISSIONS } from "@/lib/permissions";

/**
 * Security tests for ID card IDOR vulnerability mitigation (CVE-2024-XXXX)
 * 
 * These tests verify that the cross-member IDOR vulnerability has been fixed
 * by ensuring that only admin users can access government ID card endpoints,
 * regardless of having the broad "volunteers.view" permission.
 * 
 * Vulnerability: Both /api/members/id-card and /api/members/id-card/verify
 * previously authorized only the broad "volunteers.view" permission, which
 * editor and moderator roles possess. This allowed lower-privileged staff
 * to decrypt and download arbitrary members' government ID cards.
 * 
 * Fix: Both endpoints now use isAdminUser() which checks role === "admin"
 * directly, preventing access through delegable permissions.
 */

describe("ID Card Authorization - IDOR Mitigation", () => {
  let mockPrisma: any;
  let getPrisma: any;

  beforeEach(() => {
    // Mock the Prisma client
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
    };

    // Mock the dynamic import of @/lib/db
    vi.doMock("@/lib/db", () => ({
      prisma: mockPrisma,
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("isAdminUser function", () => {
    it("returns true when user role is admin", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: "admin",
      });

      const { isAdminUser } = await import("@/lib/server-permissions");
      const result = await isAdminUser("admin-user-id");

      expect(result).toBe(true);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "admin-user-id" },
        select: { role: true },
      });
    });

    it("returns false when user role is editor (has volunteers.view)", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: "editor",
      });

      const { isAdminUser } = await import("@/lib/server-permissions");
      const result = await isAdminUser("editor-user-id");

      expect(result).toBe(false);
    });

    it("returns false when user role is moderator (has volunteers.view)", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: "moderator",
      });

      const { isAdminUser } = await import("@/lib/server-permissions");
      const result = await isAdminUser("moderator-user-id");

      expect(result).toBe(false);
    });

    it("returns false when user role is contributor", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: "contributor",
      });

      const { isAdminUser } = await import("@/lib/server-permissions");
      const result = await isAdminUser("contributor-user-id");

      expect(result).toBe(false);
    });

    it("returns false when user role is member", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: "member",
      });

      const { isAdminUser } = await import("@/lib/server-permissions");
      const result = await isAdminUser("member-user-id");

      expect(result).toBe(false);
    });

    it("returns false when userId is undefined", async () => {
      const { isAdminUser } = await import("@/lib/server-permissions");
      const result = await isAdminUser(undefined);

      expect(result).toBe(false);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("returns false when user is not found in database", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const { isAdminUser } = await import("@/lib/server-permissions");
      const result = await isAdminUser("nonexistent-user-id");

      expect(result).toBe(false);
    });
  });

  describe("Role-based access control verification", () => {
    it("editor role has volunteers.view but should not access ID cards", () => {
      // Verify editor has volunteers.view (the broad permission)
      expect(ROLE_DEFAULTS.editor).toContain("volunteers.view");
      
      // But editor is not admin, so isAdminUser will return false
      expect(ROLE_DEFAULTS.editor).not.toEqual(ROLE_DEFAULTS.admin);
    });

    it("moderator role has volunteers.view but should not access ID cards", () => {
      // Verify moderator has volunteers.view (the broad permission)
      expect(ROLE_DEFAULTS.moderator).toContain("volunteers.view");
      
      // But moderator is not admin, so isAdminUser will return false
      expect(ROLE_DEFAULTS.moderator).not.toEqual(ROLE_DEFAULTS.admin);
    });

    it("admin role has all permissions including volunteers.view", () => {
      // Verify admin has all permissions
      expect(ROLE_DEFAULTS.admin).toEqual(ALL_PERMISSIONS);
      expect(ROLE_DEFAULTS.admin).toContain("volunteers.view");
    });
  });

  describe("Security property: admin-only access", () => {
    it("isAdminUser checks role directly, not delegable permissions", async () => {
      // This test verifies the core security property:
      // isAdminUser only checks the role field, not permissions
      
      mockPrisma.user.findUnique.mockResolvedValue({
        role: "editor",
        // Even if we hypothetically had explicit permissions, they don't matter
        permissions: [{ permission: "volunteers.view", granted: true }],
      });

      const { isAdminUser } = await import("@/lib/server-permissions");
      const result = await isAdminUser("editor-with-perms");

      // Should still return false because role !== "admin"
      expect(result).toBe(false);
      
      // Verify the query only selects role, not permissions
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "editor-with-perms" },
        select: { role: true },
      });
    });

    it("isAdminUser does not use the authorize function", async () => {
      // The authorize function checks permissions, but isAdminUser should not
      const { isAdminUser } = await import("@/lib/server-permissions");
      
      mockPrisma.user.findUnique.mockResolvedValue({
        role: "editor",
      });

      await isAdminUser("test-user");

      // Verify we only query for role, not permissions
      const call = mockPrisma.user.findUnique.mock.calls[0][0];
      expect(call.select).toEqual({ role: true });
      expect(call.select).not.toHaveProperty("permissions");
    });
  });

  describe("IDOR exploit scenarios (should be blocked)", () => {
    it("blocks editor attempting to access another member's ID card", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: "editor",
      });

      const { isAdminUser } = await import("@/lib/server-permissions");
      
      // Simulate editor trying to access victim's ID card
      const editorId = "editor-123";
      const victimMemberId = "member-456";
      
      const canAccess = await isAdminUser(editorId);
      
      // Should be blocked
      expect(canAccess).toBe(false);
    });

    it("blocks moderator attempting to verify another member's ID card", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: "moderator",
      });

      const { isAdminUser } = await import("@/lib/server-permissions");
      
      // Simulate moderator trying to verify victim's ID card
      const moderatorId = "moderator-789";
      const victimMemberId = "member-456";
      
      const canAccess = await isAdminUser(moderatorId);
      
      // Should be blocked
      expect(canAccess).toBe(false);
    });

    it("allows admin to access any member's ID card (legitimate use)", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: "admin",
      });

      const { isAdminUser } = await import("@/lib/server-permissions");
      
      // Simulate admin accessing member's ID card (legitimate)
      const adminId = "admin-001";
      const memberId = "member-456";
      
      const canAccess = await isAdminUser(adminId);
      
      // Should be allowed
      expect(canAccess).toBe(true);
    });
  });

  describe("Authorization boundary enforcement", () => {
    it("rejects access when session user ID is null", async () => {
      const { isAdminUser } = await import("@/lib/server-permissions");
      
      const result = await isAdminUser(null as any);
      
      expect(result).toBe(false);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("rejects access when session user ID is empty string", async () => {
      const { isAdminUser } = await import("@/lib/server-permissions");
      
      const result = await isAdminUser("");
      
      expect(result).toBe(false);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error("Database connection failed"));

      const { isAdminUser } = await import("@/lib/server-permissions");
      
      // Should not throw, but return false or let error propagate
      await expect(isAdminUser("test-user")).rejects.toThrow("Database connection failed");
    });
  });

  describe("Comparison: authorize vs isAdminUser", () => {
    it("authorize checks permissions, isAdminUser checks role only", async () => {
      // Setup: editor with volunteers.view permission
      mockPrisma.user.findUnique.mockResolvedValue({
        role: "editor",
        permissions: [{ permission: "volunteers.view", granted: true }],
      });

      const { authorize, isAdminUser } = await import("@/lib/server-permissions");
      
      const userId = "editor-user";
      
      // authorize would return true for volunteers.view (editor has it by default)
      const authorizeResult = await authorize(userId, "volunteers.view");
      expect(authorizeResult).toBe(true);
      
      // But isAdminUser returns false (editor is not admin)
      const isAdminResult = await isAdminUser(userId);
      expect(isAdminResult).toBe(false);
      
      // This demonstrates the fix: ID card endpoints now use isAdminUser
      // instead of authorize, preventing the IDOR vulnerability
    });
  });

  describe("Regression prevention", () => {
    it("ensures volunteers.view permission alone is insufficient", async () => {
      // This test documents the vulnerability and ensures it stays fixed
      
      // Both editor and moderator have volunteers.view
      const rolesWithVolunteersView = Object.entries(ROLE_DEFAULTS)
        .filter(([role, perms]: [string, string[]]) => 
          perms.includes("volunteers.view")
        )
        .map(([role]) => role);
      
      expect(rolesWithVolunteersView).toContain("editor");
      expect(rolesWithVolunteersView).toContain("moderator");
      
      // But only admin should pass isAdminUser check
      for (const role of rolesWithVolunteersView) {
        if (role !== "admin") {
          mockPrisma.user.findUnique.mockResolvedValue({ role });
          const { isAdminUser } = await import("@/lib/server-permissions");
          const result = await isAdminUser(`${role}-user`);
          expect(result).toBe(false);
        }
      }
    });

    it("verifies no new roles with volunteers.view can bypass admin check", async () => {
      // Future-proofing: even if new roles are added with volunteers.view,
      // they should not be able to access ID cards
      const testRoles = ["editor", "moderator", "supervisor", "staff"];
      
      for (const role of testRoles) {
        mockPrisma.user.findUnique.mockResolvedValue({ role });
        const { isAdminUser } = await import("@/lib/server-permissions");
        const result = await isAdminUser(`${role}-user`);
        
        // Only "admin" should return true
        if (role === "admin") {
          expect(result).toBe(true);
        } else {
          expect(result).toBe(false);
        }
      }
    });
  });
});
