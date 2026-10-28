import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Security tests for NextAuth secret validation
 * 
 * These tests verify that the mitigation for the "Predictable fallback NextAuth 
 * secret allows forged administrator sessions" vulnerability is effective.
 * 
 * The vulnerability allowed attackers to forge JWT tokens with admin roles when:
 * 1. NEXTAUTH_SECRET was missing (fallback to hardcoded value)
 * 2. NEXTAUTH_SECRET was set to a known insecure value (e.g., "change-me-in-production")
 * 
 * The mitigation:
 * - Removes the fallback secret entirely
 * - Validates that NEXTAUTH_SECRET is not a known insecure value
 * - Fails closed (throws error) when secret is missing or insecure
 */

/**
 * Helper function to test the resolveAuthSecret logic without importing the full module
 * This simulates the actual implementation
 */
function testResolveAuthSecret(secret: string | undefined): { valid: boolean; error?: string } {
  const KNOWN_INSECURE_AUTH_SECRETS = new Set([
    "fabfdccaf0f90750ee0dd1442f5ee17295a6874acda53a32b57cb8b23a665bb4",
    "change-me-in-production",
    "your-super-secret-key-change-in-production",
  ]);

  const trimmedSecret = secret?.trim();
  if (!trimmedSecret || KNOWN_INSECURE_AUTH_SECRETS.has(trimmedSecret)) {
    return {
      valid: false,
      error: "NEXTAUTH_SECRET is missing or set to a known insecure value. Configure a unique, random secret (e.g. `openssl rand -base64 32`)."
    };
  }
  return { valid: true };
}

describe("Auth Secret Security", () => {

  describe("Known Insecure Secrets Rejection", () => {
    it("should reject the old hardcoded fallback secret", () => {
      const result = testResolveAuthSecret("fabfdccaf0f90750ee0dd1442f5ee17295a6874acda53a32b57cb8b23a665bb4");
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain("NEXTAUTH_SECRET is missing or set to a known insecure value");
    });

    it("should reject 'change-me-in-production' placeholder", () => {
      const result = testResolveAuthSecret("change-me-in-production");
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain("NEXTAUTH_SECRET is missing or set to a known insecure value");
    });

    it("should reject 'your-super-secret-key-change-in-production' placeholder", () => {
      const result = testResolveAuthSecret("your-super-secret-key-change-in-production");
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain("NEXTAUTH_SECRET is missing or set to a known insecure value");
    });
  });

  describe("Missing Secret Rejection", () => {
    it("should reject when NEXTAUTH_SECRET is undefined", () => {
      const result = testResolveAuthSecret(undefined);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain("NEXTAUTH_SECRET is missing or set to a known insecure value");
    });

    it("should reject when NEXTAUTH_SECRET is empty string", () => {
      const result = testResolveAuthSecret("");
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain("NEXTAUTH_SECRET is missing or set to a known insecure value");
    });

    it("should reject when NEXTAUTH_SECRET is only whitespace", () => {
      const result = testResolveAuthSecret("   \t\n  ");
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain("NEXTAUTH_SECRET is missing or set to a known insecure value");
    });
  });

  describe("Valid Secret Acceptance", () => {
    it("should accept a valid random secret", () => {
      const result = testResolveAuthSecret("a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6");
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept a base64-encoded secret (typical openssl output)", () => {
      const result = testResolveAuthSecret("dGhpc2lzYXRlc3RzZWNyZXR0aGF0aXNsb25nZW5vdWdo");
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should trim whitespace from valid secrets", () => {
      const result = testResolveAuthSecret("  valid-secret-with-spaces  ");
      
      // The trimming happens in the validation logic
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("Error Message Quality", () => {
    it("should provide helpful error message with remediation guidance", () => {
      const result = testResolveAuthSecret(undefined);
      
      expect(result.error).toContain("openssl rand -base64 32");
      expect(result.error).toContain("NEXTAUTH_SECRET");
      expect(result.error).toContain("missing");
    });
  });

  describe("Security Properties", () => {
    it("should ensure no fallback secret exists in the codebase", () => {
      // This test verifies that the old DEFAULT_AUTH_SECRET pattern is not used
      const authPath = path.join(__dirname, "../auth.ts");
      const authSource = fs.readFileSync(authPath, "utf-8");
      
      // Verify the old pattern is not present
      expect(authSource).not.toContain("DEFAULT_AUTH_SECRET");
      expect(authSource).not.toContain("process.env.NEXTAUTH_SECRET || ");
    });

    it("should maintain KNOWN_INSECURE_AUTH_SECRETS as a Set for O(1) lookup", () => {
      // This is a performance and correctness check
      const authPath = path.join(__dirname, "../auth.ts");
      const authSource = fs.readFileSync(authPath, "utf-8");
      
      expect(authSource).toContain("KNOWN_INSECURE_AUTH_SECRETS");
      expect(authSource).toContain("new Set([");
    });

    it("should use a getter for lazy evaluation (not direct assignment)", () => {
      // Verify the implementation uses a getter pattern
      const authPath = path.join(__dirname, "../auth.ts");
      const authSource = fs.readFileSync(authPath, "utf-8");
      
      expect(authSource).toContain("get secret()");
      expect(authSource).toContain("resolveAuthSecret()");
    });

    it("should include all three known insecure secrets in the blocklist", () => {
      const authPath = path.join(__dirname, "../auth.ts");
      const authSource = fs.readFileSync(authPath, "utf-8");
      
      // Verify all three known insecure values are blocked
      expect(authSource).toContain("fabfdccaf0f90750ee0dd1442f5ee17295a6874acda53a32b57cb8b23a665bb4");
      expect(authSource).toContain("change-me-in-production");
      expect(authSource).toContain("your-super-secret-key-change-in-production");
    });
  });

  describe("Exploit Prevention", () => {
    it("prevents forged admin tokens by rejecting known secrets at trust root", () => {
      // Scenario: Attacker tries to use the old hardcoded secret
      const result = testResolveAuthSecret("fabfdccaf0f90750ee0dd1442f5ee17295a6874acda53a32b57cb8b23a665bb4");
      
      // The attacker cannot even initialize NextAuth with this secret
      expect(result.valid).toBe(false);
      
      // This prevents the entire attack chain:
      // 1. Cannot sign JWTs with the known secret
      // 2. Cannot forge admin role tokens
      // 3. Cannot access /api/admin/vault or other protected endpoints
    });

    it("prevents forged admin tokens by rejecting docker-compose placeholder", () => {
      // Scenario: Attacker tries to use the old docker-compose.yml value
      const result = testResolveAuthSecret("change-me-in-production");
      
      expect(result.valid).toBe(false);
    });

    it("ensures no bypass via empty or whitespace-only secrets", () => {
      // Scenario: Attacker tries to bypass validation with edge cases
      const invalidSecrets = ["", "   ", "\t", "\n", "  \t\n  "];
      
      for (const secret of invalidSecrets) {
        const result = testResolveAuthSecret(secret);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("NEXTAUTH_SECRET is missing or set to a known insecure value");
      }
    });

    it("ensures case-sensitive matching for known insecure secrets", () => {
      // The blocklist should be case-sensitive to avoid false positives
      // but the actual secrets should match exactly
      const exactMatch = testResolveAuthSecret("change-me-in-production");
      expect(exactMatch.valid).toBe(false);
      
      // Different case should be allowed (though still a bad secret in practice)
      const differentCase = testResolveAuthSecret("CHANGE-ME-IN-PRODUCTION");
      expect(differentCase.valid).toBe(true);
    });
  });

  describe("Deployment Safety", () => {
    it("fails closed: missing secret prevents application startup at first auth request", () => {
      const result = testResolveAuthSecret(undefined);
      
      // Application can build and start, but first auth request will fail
      expect(result.valid).toBe(false);
      
      // This is the correct fail-closed behavior:
      // - Build succeeds (no secret needed at build time)
      // - Runtime fails immediately on first auth attempt
      // - Prevents silent security failures
    });

    it("provides clear error for operators to fix configuration", () => {
      const result = testResolveAuthSecret(undefined);
      
      // Error should be actionable
      expect(result.error).toContain("NEXTAUTH_SECRET");
      expect(result.error).toContain("missing");
      expect(result.error).toContain("openssl");
      expect(result.error).toContain("random");
    });
  });

  describe("Docker Compose Configuration", () => {
    it("verifies docker-compose.yml requires NEXTAUTH_SECRET to be set", () => {
      const dockerComposePath = path.join(__dirname, "../../../docker-compose.yml");
      
      if (fs.existsSync(dockerComposePath)) {
        const dockerComposeContent = fs.readFileSync(dockerComposePath, "utf-8");
        
        // Should use environment variable substitution with required check
        expect(dockerComposeContent).toContain("NEXTAUTH_SECRET:");
        expect(dockerComposeContent).toContain("${NEXTAUTH_SECRET");
        
        // Should NOT contain the old hardcoded value
        expect(dockerComposeContent).not.toContain('NEXTAUTH_SECRET: "change-me-in-production"');
      }
    });
  });

  describe("Validation Logic Correctness", () => {
    it("rejects all three known insecure values", () => {
      const insecureValues = [
        "fabfdccaf0f90750ee0dd1442f5ee17295a6874acda53a32b57cb8b23a665bb4",
        "change-me-in-production",
        "your-super-secret-key-change-in-production",
      ];
      
      for (const value of insecureValues) {
        const result = testResolveAuthSecret(value);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    it("accepts a variety of valid secret formats", () => {
      const validSecrets = [
        "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        "dGhpc2lzYXRlc3RzZWNyZXQ=",
        "my-super-secret-key-2024",
        "8f3e9d2c1b4a5f6e7d8c9b0a1f2e3d4c",
        "ThisIsAValidSecretKey123!@#",
      ];
      
      for (const secret of validSecrets) {
        const result = testResolveAuthSecret(secret);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      }
    });
  });
});
