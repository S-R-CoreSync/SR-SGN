import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("Authentication Security - Hard-coded Credential Bypass Mitigation", () => {
  // Read the auth.ts source code to verify the vulnerability is fixed
  const authSourcePath = join(__dirname, "../auth.ts");
  const authSource = readFileSync(authSourcePath, "utf-8");


  describe("Hard-coded admin credential bypass removed", () => {
    it("should not contain hard-coded admin credential check", () => {
      // The vulnerability was a check like:
      // if (credentials.email === "admin@sy-nl.org" && credentials.password === "admin123")
      
      // Verify the hard-coded credential check is removed
      expect(authSource).not.toMatch(/admin123/);
      expect(authSource).not.toMatch(/Master Admin Instant Access/i);
    });

    it("should not contain synthetic admin identity fallback", () => {
      // The vulnerability returned a synthetic admin identity:
      // return { id: "admin-master-id-2026", email: "admin@sy-nl.org", role: "admin" };
      
      expect(authSource).not.toMatch(/admin-master-id-2026/);
      expect(authSource).not.toMatch(/built-in admin fallback/i);
    });

    it("should not bypass password verification for any user", () => {
      // Verify that bcrypt.compare is called for password verification
      expect(authSource).toMatch(/bcrypt\.compare/);
      
      // Verify there's no early return before password verification
      // (except for missing credentials or rate limiting)
      
      // Should check credentials exist
      expect(authSource).toMatch(/if\s*\([^)]*!credentials/);
      
      // Should check rate limiting
      expect(authSource).toMatch(/isRateLimited/);
      
      // Should verify password with bcrypt (already checked above)
      // The authorize function should contain bcrypt.compare
      const hasPasswordVerification = authSource.includes("bcrypt.compare");
      expect(hasPasswordVerification).toBe(true);
    });

    it("should check rate limiting before password verification", () => {
      // Verify rate limiting is checked early in the authorize function
      const rateLimitIndex = authSource.indexOf("isRateLimited");
      const bcryptIndex = authSource.indexOf("bcrypt.compare");
      
      // Rate limiting should come before bcrypt (if both exist)
      if (rateLimitIndex > 0 && bcryptIndex > 0) {
        expect(rateLimitIndex).toBeLessThan(bcryptIndex);
      }
    });
  });


  describe("Password verification is required for all users", () => {
    it("should require bcrypt password verification", () => {
      // Verify bcrypt.compare is used for password verification
      expect(authSource).toMatch(/bcrypt\.compare\s*\(/);
      expect(authSource).toMatch(/const\s+valid\s*=\s*await\s+bcrypt\.compare/);
    });

    it("should check if user exists and has password before verification", () => {
      // Should check if user exists
      expect(authSource).toMatch(/if\s*\(\s*!user/);
      
      // Should check if user has a password
      expect(authSource).toMatch(/!user\.password/);
    });

    it("should return null on invalid password", () => {
      // Should return null when password is invalid
      // Verify the pattern exists in the source
      expect(authSource).toMatch(/if\s*\(\s*!valid\s*\)/);
      expect(authSource).toMatch(/return\s+null/);
    });
  });


  describe("Rate limiting applies to all authentication attempts", () => {
    it("should have rate limiting implementation", () => {
      // Verify rate limiting functions exist
      expect(authSource).toMatch(/isRateLimited/);
      expect(authSource).toMatch(/recordLoginAttempt/);
      expect(authSource).toMatch(/MAX_ATTEMPTS/);
      expect(authSource).toMatch(/LOCKOUT_DURATION/);
    });

    it("should check rate limiting in authorize function", () => {
      // Verify rate limiting is checked in the authorize function
      const authorizeFunction = authSource.match(/async authorize\([^)]*\)[^{]*{([\s\S]*?)^\s*}\s*,?\s*$/m);
      if (authorizeFunction) {
        const funcBody = authorizeFunction[1];
        expect(funcBody).toMatch(/isRateLimited/);
      }
    });

    it("should record failed login attempts", () => {
      // Verify failed attempts are recorded
      expect(authSource).toMatch(/recordLoginAttempt/);
    });
  });


  describe("No privileged synthetic identities returned", () => {
    it("should not create synthetic admin identities", () => {
      // Verify no synthetic admin identity is created
      expect(authSource).not.toMatch(/admin-master-id/);
      expect(authSource).not.toMatch(/return\s*{\s*id:\s*["']admin/);
    });

    it("should only return user data from database", () => {
      // Verify that user data comes from database query
      expect(authSource).toMatch(/prisma\.user\.findUnique/);
      
      // Should return user properties from database
      expect(authSource).toMatch(/return\s*{[^}]*id:\s*user\.id/);
    });

    it("should not have fallback admin creation logic", () => {
      // Verify no fallback logic that creates admin users
      expect(authSource).not.toMatch(/catch.*admin.*fallback/i);
      expect(authSource).not.toMatch(/built-in.*admin/i);
    });
  });


  describe("Session role propagation security", () => {
    it("should have JWT callback that sets role from user", () => {
      // Verify JWT callback exists and sets role
      expect(authSource).toMatch(/async jwt\s*\(/);
      expect(authSource).toMatch(/token\.role\s*=/);
    });

    it("should have session callback that propagates role from token", () => {
      // Verify session callback exists and propagates role
      expect(authSource).toMatch(/async session\s*\(/);
      expect(authSource).toMatch(/session\.user.*role\s*=.*token\.role/);
    });

    it("should default to member role if no role specified", () => {
      // Verify default role is member, not admin
      expect(authSource).toMatch(/role.*\|\|.*["']member["']/);
    });
  });


  describe("Input validation and sanitization", () => {
    it("should validate credentials exist", () => {
      // Verify credentials are validated
      expect(authSource).toMatch(/if\s*\(\s*!credentials\?\.email\s*\|\|\s*!credentials\?\.password\s*\)/);
    });

    it("should normalize email to lowercase", () => {
      // Verify email is normalized to lowercase
      expect(authSource).toMatch(/\.toLowerCase\(\)/);
    });

    it("should trim email whitespace", () => {
      // Verify email is trimmed
      expect(authSource).toMatch(/\.trim\(\)/);
    });
  });

  describe("Seed file security", () => {
    it("should not use hard-coded admin password in seed files", () => {
      // Read seed files to verify no hard-coded passwords
      const seedTsPath = join(__dirname, "../../../prisma/seed.ts");
      const seedCjsPath = join(__dirname, "../../../prisma/seed.cjs");
      
      let seedTsSource = "";
      let seedCjsSource = "";
      
      try {
        seedTsSource = readFileSync(seedTsPath, "utf-8");
      } catch (e) {
        // File might not exist
      }
      
      try {
        seedCjsSource = readFileSync(seedCjsPath, "utf-8");
      } catch (e) {
        // File might not exist
      }
      
      // Verify no hard-coded "admin123" password
      expect(seedTsSource).not.toMatch(/["']admin123["']/);
      expect(seedCjsSource).not.toMatch(/["']admin123["']/);
    });

    it("should use environment variable or random password for admin seed", () => {
      // Read seed files
      const seedTsPath = join(__dirname, "../../../prisma/seed.ts");
      const seedCjsPath = join(__dirname, "../../../prisma/seed.cjs");
      
      let seedTsSource = "";
      let seedCjsSource = "";
      
      try {
        seedTsSource = readFileSync(seedTsPath, "utf-8");
      } catch (e) {
        // File might not exist
      }
      
      try {
        seedCjsSource = readFileSync(seedCjsPath, "utf-8");
      } catch (e) {
        // File might not exist
      }
      
      // Should use environment variable or random bytes
      if (seedTsSource) {
        expect(seedTsSource).toMatch(/process\.env\.ADMIN_SEED_PASSWORD|randomBytes/);
      }
      
      if (seedCjsSource) {
        expect(seedCjsSource).toMatch(/process\.env\.ADMIN_SEED_PASSWORD|randomBytes/);
      }
    });

    it("should not log admin password in seed output", () => {
      // Read seed files
      const seedTsPath = join(__dirname, "../../../prisma/seed.ts");
      const seedCjsPath = join(__dirname, "../../../prisma/seed.cjs");
      
      let seedTsSource = "";
      let seedCjsSource = "";
      
      try {
        seedTsSource = readFileSync(seedTsPath, "utf-8");
      } catch (e) {
        // File might not exist
      }
      
      try {
        seedCjsSource = readFileSync(seedCjsPath, "utf-8");
      } catch (e) {
        // File might not exist
      }
      
      // Should not log password in console output
      if (seedTsSource) {
        expect(seedTsSource).not.toMatch(/console\.log.*admin123/i);
      }
      
      if (seedCjsSource) {
        expect(seedCjsSource).not.toMatch(/console\.log.*admin123/i);
      }
    });
  });
});
