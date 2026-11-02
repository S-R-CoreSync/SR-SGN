import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getServerSession } from "next-auth";

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock Prisma client - must be defined inline to avoid hoisting issues
vi.mock("@/lib/db", () => {
  return {
    prisma: {
      member: {
        count: vi.fn(),
        findMany: vi.fn(),
        groupBy: vi.fn(),
        deleteMany: vi.fn(),
        createMany: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
      },
    },
  };
});

// Import after mocking
import { prisma } from "@/lib/db";
import { GET } from "@/app/api/dashboard/member-stats/route";

describe("Member Stats Security Tests - Pentest Mitigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    vi.mocked(prisma.member.count).mockResolvedValue(100);
    vi.mocked(prisma.member.groupBy).mockImplementation(async ({ by }: any) => {
      if (by.includes("gender")) {
        return [
          { gender: "Male", _count: { id: 60 } },
          { gender: "Female", _count: { id: 40 } },
        ] as any;
      }
      if (by.includes("nlProvincie")) {
        return [
          { nlProvincie: "Zuid-Holland", _count: { id: 50 } },
          { nlProvincie: "Noord-Holland", _count: { id: 30 } },
          { nlProvincie: "Utrecht", _count: { id: 20 } },
        ] as any;
      }
      if (by.includes("originCity")) {
        return [
          { originCity: "دمشق", _count: { id: 40 } },
          { originCity: "حلب", _count: { id: 35 } },
          { originCity: "حمص", _count: { id: 25 } },
        ] as any;
      }
      if (by.includes("birthYear")) {
        return [
          { birthYear: 1990, _count: { id: 30 } },
          { birthYear: 1985, _count: { id: 40 } },
          { birthYear: 1995, _count: { id: 30 } },
        ] as any;
      }
      return [] as any;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Critical Security: No Data Deletion", () => {
    it("should NOT call deleteMany under any circumstances", async () => {
      // Mock admin session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { role: "admin", email: "admin@test.com" },
        expires: "2099-01-01",
      } as any);

      // Set count to something other than 425 (the vulnerable condition)
      vi.mocked(prisma.member.count).mockResolvedValue(100);

      // Create mock request
      const mockRequest = new Request("http://localhost:3000/api/dashboard/member-stats", {
        method: "GET",
      });

      // Call the endpoint
      const response = await GET(mockRequest);
      const data = await response.json();

      // CRITICAL: deleteMany should NEVER be called
      expect(prisma.member.deleteMany).not.toHaveBeenCalled();

      // Verify response is successful
      expect(response.status).toBe(200);
      expect(data.total).toBe(100);
    });

    it("should NOT call createMany to insert synthetic members", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { role: "admin", email: "admin@test.com" },
        expires: "2099-01-01",
      } as any);

      // Set count to something other than 425
      vi.mocked(prisma.member.count).mockResolvedValue(50);

      const mockRequest = new Request("http://localhost:3000/api/dashboard/member-stats", {
        method: "GET",
      });

      await GET(mockRequest);

      // CRITICAL: createMany should NEVER be called
      expect(prisma.member.createMany).not.toHaveBeenCalled();
    });

    it("should NOT trigger seeding logic when count is not 425", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { role: "admin", email: "admin@test.com" },
        expires: "2099-01-01",
      } as any);

      // Test with various counts that are not 425
      const testCounts = [0, 1, 100, 424, 426, 1000];

      for (const count of testCounts) {
        vi.clearAllMocks();
        vi.mocked(prisma.member.count).mockResolvedValue(count);

        const mockRequest = new Request("http://localhost:3000/api/dashboard/member-stats", {
          method: "GET",
        });

        await GET(mockRequest);

        // Verify no destructive operations
        expect(prisma.member.deleteMany).not.toHaveBeenCalled();
        expect(prisma.member.createMany).not.toHaveBeenCalled();
      }
    });

    it("should NOT trigger seeding logic even when count is exactly 425", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { role: "admin", email: "admin@test.com" },
        expires: "2099-01-01",
      } as any);

      // Test with count = 425 (the exact vulnerable condition from the pentest)
      vi.mocked(prisma.member.count).mockResolvedValue(425);

      const mockRequest = new Request("http://localhost:3000/api/dashboard/member-stats", {
        method: "GET",
      });

      await GET(mockRequest);

      // Even with count = 425, no destructive operations should occur
      expect(prisma.member.deleteMany).not.toHaveBeenCalled();
      expect(prisma.member.createMany).not.toHaveBeenCalled();
    });
  });

  describe("Read-Only Behavior", () => {
    it("should only perform read operations (count and groupBy)", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { role: "admin", email: "admin@test.com" },
        expires: "2099-01-01",
      } as any);

      vi.mocked(prisma.member.count).mockResolvedValue(100);

      const mockRequest = new Request("http://localhost:3000/api/dashboard/member-stats", {
        method: "GET",
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      // Verify only read operations were called
      expect(prisma.member.count).toHaveBeenCalled();
      expect(prisma.member.groupBy).toHaveBeenCalled();

      // Verify NO write operations were called
      expect(prisma.member.deleteMany).not.toHaveBeenCalled();
      expect(prisma.member.createMany).not.toHaveBeenCalled();
      expect(prisma.member.create).not.toHaveBeenCalled();

      // Verify response contains statistics
      expect(data).toHaveProperty("total");
      expect(data).toHaveProperty("genderData");
      expect(data).toHaveProperty("provinceData");
      expect(data).toHaveProperty("governorateData");
      expect(data).toHaveProperty("birthYearData");
      expect(data).toHaveProperty("ageGroupData");
    });

    it("should return accurate statistics from existing data", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { role: "admin", email: "admin@test.com" },
        expires: "2099-01-01",
      } as any);

      const testCount = 250;
      vi.mocked(prisma.member.count).mockResolvedValue(testCount);

      const mockRequest = new Request("http://localhost:3000/api/dashboard/member-stats", {
        method: "GET",
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.total).toBe(testCount);
      expect(typeof data.total).toBe("number");
      expect(data.total).toBeGreaterThanOrEqual(0);
    });

    it("should calculate gender statistics from real data", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { role: "admin", email: "admin@test.com" },
        expires: "2099-01-01",
      } as any);

      vi.mocked(prisma.member.count).mockResolvedValue(100);

      const mockRequest = new Request("http://localhost:3000/api/dashboard/member-stats", {
        method: "GET",
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(Array.isArray(data.genderData)).toBe(true);
      expect(data.genderData.length).toBeGreaterThan(0);

      // Verify gender data structure
      data.genderData.forEach((item: any) => {
        expect(item).toHaveProperty("name");
        expect(item).toHaveProperty("count");
        expect(item).toHaveProperty("percentage");
        expect(typeof item.count).toBe("number");
        expect(typeof item.percentage).toBe("number");
      });

      // Verify counts add up to total
      const genderTotal = data.genderData.reduce((sum: number, item: any) => sum + item.count, 0);
      expect(genderTotal).toBe(data.total);
    });
  });

  describe("Authorization", () => {
    it("should reject non-admin users", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { role: "member", email: "member@test.com" },
        expires: "2099-01-01",
      } as any);

      const mockRequest = new Request("http://localhost:3000/api/dashboard/member-stats", {
        method: "GET",
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toHaveProperty("error");
    });

    it("should reject unauthenticated requests", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const mockRequest = new Request("http://localhost:3000/api/dashboard/member-stats", {
        method: "GET",
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toHaveProperty("error");
    });
  });

  describe("Exploit Scenario Prevention", () => {
    it("should NOT trigger deleteMany when count is not 425", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { role: "admin", email: "admin@test.com" },
        expires: "2099-01-01",
      } as any);

      // Test with count != 425 (the vulnerable condition from pentest)
      vi.mocked(prisma.member.count).mockResolvedValue(300);

      const mockRequest = new Request("http://localhost:3000/api/dashboard/member-stats", {
        method: "GET",
      });

      await GET(mockRequest);

      // CRITICAL: The old vulnerable code would call deleteMany here
      expect(prisma.member.deleteMany).not.toHaveBeenCalled();
    });

    it("should NOT create 425 synthetic members after deletion", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { role: "admin", email: "admin@test.com" },
        expires: "2099-01-01",
      } as any);

      vi.mocked(prisma.member.count).mockResolvedValue(100);

      const mockRequest = new Request("http://localhost:3000/api/dashboard/member-stats", {
        method: "GET",
      });

      await GET(mockRequest);

      // CRITICAL: The old vulnerable code would create 425 synthetic members
      expect(prisma.member.createMany).not.toHaveBeenCalled();
    });

    it("should handle multiple consecutive requests without triggering seeding", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { role: "admin", email: "admin@test.com" },
        expires: "2099-01-01",
      } as any);

      vi.mocked(prisma.member.count).mockResolvedValue(150);

      const mockRequest = new Request("http://localhost:3000/api/dashboard/member-stats", {
        method: "GET",
      });

      // Make multiple requests (simulating dashboard refreshes)
      await GET(mockRequest);
      await GET(mockRequest);
      await GET(mockRequest);

      // Verify no destructive operations occurred across multiple calls
      expect(prisma.member.deleteMany).not.toHaveBeenCalled();
      expect(prisma.member.createMany).not.toHaveBeenCalled();
    });

    it("should prevent the exact exploit scenario from pentest", async () => {
      // Reproduce the exact scenario from the pentest finding:
      // 1. Admin loads statistics page
      // 2. Member count differs from 425
      // 3. Old code would delete all members and insert 425 synthetic ones

      vi.mocked(getServerSession).mockResolvedValue({
        user: { role: "admin", email: "admin@test.com" },
        expires: "2099-01-01",
      } as any);

      // Simulate a count that differs from 425 (the vulnerable condition)
      vi.mocked(prisma.member.count).mockResolvedValue(420);

      const mockRequest = new Request("http://localhost:3000/api/dashboard/member-stats", {
        method: "GET",
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      // Verify the exploit is prevented
      expect(prisma.member.deleteMany).not.toHaveBeenCalled();
      expect(prisma.member.createMany).not.toHaveBeenCalled();

      // Verify the endpoint still works correctly
      expect(response.status).toBe(200);
      expect(data.total).toBe(420);
    });
  });

  describe("Response Structure Validation", () => {
    it("should return valid statistics structure", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { role: "admin", email: "admin@test.com" },
        expires: "2099-01-01",
      } as any);

      const mockRequest = new Request("http://localhost:3000/api/dashboard/member-stats", {
        method: "GET",
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      // Verify all required fields are present
      expect(data).toHaveProperty("total");
      expect(data).toHaveProperty("topProvince");
      expect(data).toHaveProperty("genderData");
      expect(data).toHaveProperty("provinceData");
      expect(data).toHaveProperty("governorateData");
      expect(data).toHaveProperty("birthYearData");
      expect(data).toHaveProperty("ageGroupData");

      // Verify data types
      expect(typeof data.total).toBe("number");
      expect(typeof data.topProvince).toBe("string");
      expect(Array.isArray(data.genderData)).toBe(true);
      expect(Array.isArray(data.provinceData)).toBe(true);
      expect(Array.isArray(data.governorateData)).toBe(true);
      expect(Array.isArray(data.birthYearData)).toBe(true);
      expect(Array.isArray(data.ageGroupData)).toBe(true);
    });

    it("should not include any deletion or seeding indicators in response", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { role: "admin", email: "admin@test.com" },
        expires: "2099-01-01",
      } as any);

      const mockRequest = new Request("http://localhost:3000/api/dashboard/member-stats", {
        method: "GET",
      });

      const response = await GET(mockRequest);
      const data = await response.json();
      const responseText = JSON.stringify(data);

      // Should not contain any seeding-related messages
      expect(responseText).not.toContain("seed");
      expect(responseText).not.toContain("mock");
      expect(responseText).not.toContain("delete");
      expect(responseText).not.toContain("reset");
    });
  });
});
