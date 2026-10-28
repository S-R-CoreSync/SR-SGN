import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

/**
 * Security tests for the database seed script (prisma/seed.cjs)
 * 
 * These tests verify that the pentest finding "Build seed logs a reusable administrator credential"
 * has been properly mitigated by ensuring:
 * 
 * 1. Plaintext passwords are never logged to stdout
 * 2. In production mode, random passwords are generated when no env var is supplied
 * 3. The seed output does not contain any reusable credentials
 */
describe("Seed Script Security", () => {
  const seedPath = path.join(process.cwd(), "prisma", "seed.cjs");
  
  beforeEach(() => {
    // Clear any seed-related environment variables before each test
    delete process.env.SEED_ADMIN_PASSWORD;
    delete process.env.SEED_MEMBER_PASSWORD;
  });

  afterEach(() => {
    // Clean up
    delete process.env.SEED_ADMIN_PASSWORD;
    delete process.env.SEED_MEMBER_PASSWORD;
  });

  it("seed.cjs file exists and is readable", () => {
    expect(fs.existsSync(seedPath)).toBe(true);
    const content = fs.readFileSync(seedPath, "utf-8");
    expect(content.length).toBeGreaterThan(0);
  });

  it("seed script does not contain console.log with plaintext password patterns", () => {
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Check that the old vulnerable pattern is NOT present
    expect(content).not.toContain('console.log("Users created: admin@sy-nl.org / admin123")');
    expect(content).not.toContain('console.log("Users created: admin@sy-nl.org / member123")');
    
    // Check for any suspicious patterns that might log passwords
    const suspiciousPatterns = [
      /console\.log\([^)]*admin123[^)]*\)/,
      /console\.log\([^)]*member123[^)]*\)/,
      /console\.log\([^)]*password[^)]*:[^)]*admin/i,
      /console\.log\([^)]*\/\s*admin123/,
      /console\.log\([^)]*\/\s*member123/,
    ];
    
    suspiciousPatterns.forEach((pattern) => {
      expect(content).not.toMatch(pattern);
    });
  });

  it("seed script contains the secure password resolution function", () => {
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Verify the resolveSeedPassword function exists
    expect(content).toContain("resolveSeedPassword");
    
    // Verify it checks environment variables
    expect(content).toContain("SEED_ADMIN_PASSWORD");
    expect(content).toContain("SEED_MEMBER_PASSWORD");
    
    // Verify it uses crypto.randomBytes for production
    expect(content).toContain("crypto");
    expect(content).toContain("randomBytes");
  });

  it("seed script logs safe message without credentials", () => {
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Verify the new safe log message is present
    expect(content).toContain("Seed users ensured");
    expect(content).toContain("credentials are not logged");
    
    // The message should mention both users but not their passwords
    expect(content).toContain("admin@sy-nl.org");
    expect(content).toContain("member@sy-nl.org");
  });

  it("seed script uses environment variables for passwords", () => {
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Verify environment variable usage (with bracket notation)
    expect(content).toContain('process.env[envName]');
    expect(content).toContain('SEED_ADMIN_PASSWORD');
    expect(content).toContain('SEED_MEMBER_PASSWORD');
    
    // Verify the password is hashed, not stored in plaintext
    expect(content).toContain("bcrypt.hash");
  });

  it("seed script generates random password in production when env var is missing", () => {
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Verify production check
    expect(content).toContain("isProd");
    
    // Verify random password generation logic
    const hasRandomGeneration = 
      content.includes('require("crypto").randomBytes(32).toString("hex")') ||
      content.includes("require('crypto').randomBytes(32).toString('hex')");
    
    expect(hasRandomGeneration).toBe(true);
  });

  it("seed script does not hardcode admin123 or member123 in production path", () => {
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Find the resolveSeedPassword function
    const funcMatch = content.match(/const resolveSeedPassword = \([^)]+\) => \{[^}]+\}/);
    expect(funcMatch).toBeTruthy();
    
    if (funcMatch) {
      const funcBody = funcMatch[0];
      
      // In production (isProd), it should use randomBytes, not the default
      // The default passwords should only be used in development
      expect(funcBody).toContain("isProd");
      expect(funcBody).toContain("randomBytes");
      
      // Verify the ternary logic: isProd ? random : devDefault
      const hasTernary = funcBody.includes("isProd ?") || funcBody.includes("isProd?");
      expect(hasTernary).toBe(true);
    }
  });

  it("seed script comment explicitly states credentials are never printed", () => {
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Verify security-focused comments are present
    expect(content).toContain("Credentials are never printed");
    expect(content).toContain("no known credential is ever created");
  });

  it("seed script does not expose database URL in logs", () => {
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // The database URL logging is acceptable for debugging, but verify
    // it's not combined with credentials
    const lines = content.split("\n");
    
    for (const line of lines) {
      if (line.includes("console.log") && line.includes("dbUrl")) {
        // This line logs the DB URL - ensure it doesn't also log passwords
        expect(line).not.toContain("admin123");
        expect(line).not.toContain("member123");
        expect(line).not.toContain("password");
      }
    }
  });

  it("verifies the mitigation addresses the pentest reproduction steps", () => {
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Step 1: Admin account is created with hashed password (still true, but secure)
    expect(content).toContain('role: "admin"');
    expect(content).toContain("bcrypt.hash");
    
    // Step 2: The vulnerable console.log is REMOVED
    expect(content).not.toContain('console.log("Users created: admin@sy-nl.org / admin123")');
    expect(content).not.toContain('console.log("Users created: admin@sy-nl.org / member123")');
    
    // Step 3: Build command still runs seed, but it's now safe
    // (This is verified by checking package.json separately)
    
    // Step 4: Login endpoint still works, but no credential is leaked
    // The key mitigation is that no plaintext password is logged
  });

  it("ensures no credential leakage patterns exist in seed output", () => {
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Patterns that would indicate credential leakage
    const leakagePatterns = [
      /console\.log\([^)]*@[^)]*\/[^)]*\)/,  // email / password pattern
      /console\.log\([^)]*password[^)]*:[^)]*[a-zA-Z0-9]{6,}/i,  // password: value
      /console\.log\([^)]*admin[^)]*:[^)]*[a-zA-Z0-9]{6,}/i,  // admin: password
      /console\.log\([^)]*credential[^)]*:[^)]*[a-zA-Z0-9]{6,}/i,  // credential: value
    ];
    
    leakagePatterns.forEach((pattern, index) => {
      expect(content).not.toMatch(pattern);
    });
  });

  it("verifies production mode uses secure random passwords", () => {
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Extract the resolveSeedPassword function logic
    expect(content).toContain("resolveSeedPassword");
    
    // Verify the logic flow:
    // 1. Check env var first
    // 2. If production and no env var, use random
    // 3. If dev and no env var, use dev default
    
    const hasEnvCheck = content.includes('process.env[envName]');
    const hasProductionCheck = content.includes('isProd');
    const hasRandomGeneration = content.includes('randomBytes(32)');
    const hasDevDefault = content.includes('devDefault');
    
    expect(hasEnvCheck).toBe(true);
    expect(hasProductionCheck).toBe(true);
    expect(hasRandomGeneration).toBe(true);
    expect(hasDevDefault).toBe(true);
  });

  it("confirms seed script uses secure password resolution for both admin and member", () => {
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Both admin and member should use resolveSeedPassword
    const adminPasswordLine = content.match(/const adminPassword = await bcrypt\.hash\(([^)]+)\)/);
    const memberPasswordLine = content.match(/const memberPassword = await bcrypt\.hash\(([^)]+)\)/);
    
    expect(adminPasswordLine).toBeTruthy();
    expect(memberPasswordLine).toBeTruthy();
    
    if (adminPasswordLine) {
      expect(adminPasswordLine[1]).toContain("resolveSeedPassword");
      expect(adminPasswordLine[1]).toContain("SEED_ADMIN_PASSWORD");
    }
    
    if (memberPasswordLine) {
      expect(memberPasswordLine[1]).toContain("resolveSeedPassword");
      expect(memberPasswordLine[1]).toContain("SEED_MEMBER_PASSWORD");
    }
  });

  it("ensures the seed script has proper security documentation", () => {
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Check for security-related comments
    const hasSecurityComment = 
      content.includes("Credentials are never printed") ||
      content.includes("credentials are not logged") ||
      content.includes("no known credential");
    
    expect(hasSecurityComment).toBe(true);
    
    // Verify the comment explains the production behavior
    expect(content).toContain("production");
    expect(content).toContain("environment");
  });

  it("validates that default passwords are only used in development", () => {
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Find references to admin123 and member123
    const admin123Matches = content.match(/admin123/g) || [];
    const member123Matches = content.match(/member123/g) || [];
    
    // These should only appear as devDefault parameters
    admin123Matches.forEach((match, index) => {
      const context = content.substring(
        content.indexOf(match) - 50,
        content.indexOf(match) + 50
      );
      
      // Should be in the context of devDefault or a ternary with isProd
      const isInDevContext = 
        context.includes("devDefault") ||
        context.includes("isProd") ||
        context.includes("resolveSeedPassword");
      
      expect(isInDevContext).toBe(true);
    });
  });

  it("confirms no hardcoded credentials are directly used in upsert", () => {
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Find the user upsert calls - use simpler pattern
    const upsertMatches = content.match(/prisma\.user\.upsert\(/g) || [];
    
    expect(upsertMatches.length).toBeGreaterThanOrEqual(2);
    
    // Check that no plaintext passwords are in the file
    expect(content).not.toContain('password: "admin123"');
    expect(content).not.toContain('password: "member123"');
    expect(content).not.toContain("password: 'admin123'");
    expect(content).not.toContain("password: 'member123'");
    
    // Verify hashed password variables are used
    expect(content).toContain("password: adminPassword");
    expect(content).toContain("password: memberPassword");
  });
});

/**
 * Integration test: Verify seed script behavior with different environment configurations
 */
describe("Seed Script Environment Behavior", () => {
  it("seed script structure supports environment-based password configuration", () => {
    const seedPath = path.join(process.cwd(), "prisma", "seed.cjs");
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Verify the structure supports:
    // 1. Reading from environment
    // 2. Falling back to random in production
    // 3. Using dev defaults in development
    
    const hasEnvSupport = content.includes("SEED_ADMIN_PASSWORD");
    const hasProductionLogic = content.includes("isProd");
    const hasRandomFallback = content.includes("randomBytes");
    const hasDevFallback = content.includes("admin123") && content.includes("devDefault");
    
    expect(hasEnvSupport).toBe(true);
    expect(hasProductionLogic).toBe(true);
    expect(hasRandomFallback).toBe(true);
    expect(hasDevFallback).toBe(true);
  });

  it("verifies isProd is correctly defined based on NODE_ENV or VERCEL", () => {
    const seedPath = path.join(process.cwd(), "prisma", "seed.cjs");
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Check isProd definition
    const isProdMatch = content.match(/const isProd = ([^;]+);/);
    expect(isProdMatch).toBeTruthy();
    
    if (isProdMatch) {
      const isProdLogic = isProdMatch[1];
      
      // Should check NODE_ENV === "production" or VERCEL === "1"
      expect(isProdLogic).toContain("NODE_ENV");
      expect(isProdLogic).toContain("production");
      expect(isProdLogic).toContain("VERCEL");
    }
  });

  it("ensures seed output message is safe and informative", () => {
    const seedPath = path.join(process.cwd(), "prisma", "seed.cjs");
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Find the safe log message
    const safeLogMatch = content.match(/console\.log\("Seed users ensured[^"]+"\)/);
    expect(safeLogMatch).toBeTruthy();
    
    if (safeLogMatch) {
      const logMessage = safeLogMatch[0];
      
      // Should mention both users
      expect(logMessage).toContain("admin@sy-nl.org");
      expect(logMessage).toContain("member@sy-nl.org");
      
      // Should explicitly state credentials are not logged
      expect(logMessage).toContain("credentials are not logged");
      
      // Should NOT contain any password values
      expect(logMessage).not.toContain("admin123");
      expect(logMessage).not.toContain("member123");
    }
  });
});

/**
 * Regression test: Ensure the vulnerability cannot be reintroduced
 */
describe("Seed Script Vulnerability Regression Tests", () => {
  it("prevents logging of email/password pairs in any format", () => {
    const seedPath = path.join(process.cwd(), "prisma", "seed.cjs");
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Check for various formats of credential logging
    const vulnerablePatterns = [
      /console\.log\([^)]*@[^)]*\/[^)]*admin123/,
      /console\.log\([^)]*@[^)]*\/[^)]*member123/,
      /console\.log\([^)]*email[^)]*:[^)]*password/i,
      /console\.log\([^)]*username[^)]*:[^)]*password/i,
      /console\.log\([^)]*credentials[^)]*:/i,
    ];
    
    vulnerablePatterns.forEach((pattern) => {
      expect(content).not.toMatch(pattern);
    });
  });

  it("ensures bcrypt.hash is always used before storing passwords", () => {
    const seedPath = path.join(process.cwd(), "prisma", "seed.cjs");
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Find all password assignments in upsert
    const passwordAssignments = content.match(/password:\s*\w+/g) || [];
    
    expect(passwordAssignments.length).toBeGreaterThanOrEqual(2);
    
    // Each should reference a hashed password variable
    passwordAssignments.forEach((assignment) => {
      const varName = assignment.split(":")[1].trim();
      
      // The variable should be defined with bcrypt.hash
      const varDefinition = content.match(new RegExp(`const ${varName} = await bcrypt\\.hash`));
      expect(varDefinition).toBeTruthy();
    });
  });

  it("confirms no plaintext passwords are ever assigned to user records", () => {
    const seedPath = path.join(process.cwd(), "prisma", "seed.cjs");
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Find all prisma.user.upsert calls
    const upsertCalls = content.match(/prisma\.user\.upsert\(\{[\s\S]*?\}\)/g) || [];
    
    expect(upsertCalls.length).toBeGreaterThanOrEqual(2);
    
    upsertCalls.forEach((call) => {
      // Should not contain plaintext password strings
      expect(call).not.toMatch(/password:\s*["']admin123["']/);
      expect(call).not.toMatch(/password:\s*["']member123["']/);
      expect(call).not.toMatch(/password:\s*["'][^"']{6,}["']/);
      
      // Should reference a hashed password variable
      expect(call).toMatch(/password:\s*\w+Password/);
    });
  });

  it("validates that the seed script follows secure coding practices", () => {
    const seedPath = path.join(process.cwd(), "prisma", "seed.cjs");
    const content = fs.readFileSync(seedPath, "utf-8");
    
    // Security best practices checklist:
    const checks = {
      usesEnvironmentVariables: content.includes("process.env"),
      hashesPasswords: content.includes("bcrypt.hash"),
      noPlaintextLogging: !content.includes('console.log("Users created:'),
      hasSecurityComments: content.includes("Credentials are never printed"),
      usesRandomGeneration: content.includes("randomBytes"),
      checksProductionMode: content.includes("isProd"),
    };
    
    // All checks should pass
    Object.entries(checks).forEach(([check, passed]) => {
      expect(passed).toBe(true);
    });
  });
});
