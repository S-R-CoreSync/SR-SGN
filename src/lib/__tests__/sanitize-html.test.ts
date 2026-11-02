import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "../sanitize-html";

describe("sanitizeHtml - XSS Prevention", () => {
  describe("Script injection attacks (pentest reproduction)", () => {
    it("blocks script tags completely", () => {
      const malicious = '<script>alert(document.domain)</script>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain("<script");
      expect(result).not.toContain("alert");
      expect(result).toBe("");
    });

    it("blocks inline event handlers on img tags (pentest payload)", () => {
      const malicious = '<img src=x onerror=alert(document.domain)>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain("onerror");
      expect(result).not.toContain("alert");
      // Should preserve img tag but strip dangerous attributes
      expect(result).toContain("<img");
      expect(result).toContain("src=");
    });

    it("blocks onclick handlers on links", () => {
      const malicious = '<a href="#" onclick="alert(1)">Click me</a>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("alert");
      expect(result).toContain("<a");
      expect(result).toContain("</a>");
    });

    it("blocks onload handlers on body tags", () => {
      const malicious = '<body onload="alert(1)">content</body>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain("onload");
      expect(result).not.toContain("<body");
      // body is not in allowlist, content should be preserved
      expect(result).toContain("content");
    });

    it("blocks all common event handler attributes", () => {
      const handlers = [
        "onload", "onerror", "onclick", "onmouseover", "onfocus",
        "onblur", "onchange", "onsubmit", "onkeydown", "onkeyup"
      ];
      
      handlers.forEach(handler => {
        const malicious = `<div ${handler}="alert(1)">test</div>`;
        const result = sanitizeHtml(malicious);
        expect(result).not.toContain(handler);
        expect(result).not.toContain("alert");
      });
    });
  });

  describe("Dangerous URL schemes", () => {
    it("blocks javascript: URLs in href", () => {
      const malicious = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain("javascript:");
      expect(result).not.toContain("alert");
      // Link should be stripped of href or removed
      expect(result).not.toMatch(/href="javascript:/);
    });

    it("blocks data: URLs in href", () => {
      const malicious = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain("data:");
      expect(result).not.toMatch(/href="data:/);
    });

    it("blocks vbscript: URLs", () => {
      const malicious = '<a href="vbscript:msgbox(1)">Click</a>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain("vbscript:");
    });

    it("allows safe http and https URLs", () => {
      const safe = '<a href="https://example.com">Link</a>';
      const result = sanitizeHtml(safe);
      expect(result).toContain('href="https://example.com"');
    });

    it("allows mailto: URLs", () => {
      const safe = '<a href="mailto:test@example.com">Email</a>';
      const result = sanitizeHtml(safe);
      expect(result).toContain('href="mailto:test@example.com"');
    });

    it("blocks javascript: with whitespace obfuscation", () => {
      const malicious = '<a href="java\nscript:alert(1)">Click</a>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain("alert");
      expect(result).not.toMatch(/href="[^"]*script:/);
    });
  });

  describe("Dangerous tags removal", () => {
    it("strips script tags and their content", () => {
      const malicious = 'Before<script>alert(1)</script>After';
      const result = sanitizeHtml(malicious);
      expect(result).toBe("BeforeAfter");
    });

    it("strips style tags and their content", () => {
      const malicious = 'Text<style>body{background:red}</style>More';
      const result = sanitizeHtml(malicious);
      expect(result).toBe("TextMore");
    });

    it("strips object tags", () => {
      const malicious = '<object data="malicious.swf"></object>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain("<object");
      expect(result).toBe("");
    });

    it("strips embed tags", () => {
      const malicious = '<embed src="malicious.swf">';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain("<embed");
      expect(result).toBe("");
    });

    it("strips svg tags (potential XSS vector)", () => {
      const malicious = '<svg onload="alert(1)"><circle/></svg>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain("<svg");
      expect(result).not.toContain("alert");
      expect(result).toBe("");
    });
  });

  describe("Style attribute sanitization", () => {
    it("blocks expression() in styles", () => {
      const malicious = '<div style="width:expression(alert(1))">test</div>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain("expression");
      expect(result).not.toContain("alert");
    });

    it("blocks javascript: in styles", () => {
      const malicious = '<div style="background:url(javascript:alert(1))">test</div>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain("javascript:");
    });

    it("blocks url() in styles", () => {
      const malicious = '<div style="background:url(http://evil.com/xss.js)">test</div>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain("url(");
    });

    it("allows safe CSS properties", () => {
      const safe = '<div style="color:red;font-size:16px">test</div>';
      const result = sanitizeHtml(safe);
      expect(result).toContain("color:red");
      expect(result).toContain("font-size:16px");
    });

    it("blocks position:fixed (potential clickjacking)", () => {
      const malicious = '<div style="position:fixed;top:0;left:0">overlay</div>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain("position:fixed");
    });

    it("allows position:relative and position:absolute", () => {
      const safe1 = '<div style="position:relative">test</div>';
      const safe2 = '<div style="position:absolute">test</div>';
      expect(sanitizeHtml(safe1)).toContain("position:relative");
      expect(sanitizeHtml(safe2)).toContain("position:absolute");
    });
  });

  describe("Allowlist enforcement", () => {
    it("preserves allowed formatting tags", () => {
      const safe = '<p>Text with <strong>bold</strong> and <em>italic</em></p>';
      const result = sanitizeHtml(safe);
      expect(result).toContain("<p>");
      expect(result).toContain("<strong>");
      expect(result).toContain("<em>");
      expect(result).toContain("</p>");
    });

    it("preserves allowed structural tags", () => {
      const safe = '<div><h1>Title</h1><ul><li>Item</li></ul></div>';
      const result = sanitizeHtml(safe);
      expect(result).toContain("<div>");
      expect(result).toContain("<h1>");
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>");
    });

    it("removes disallowed tags but preserves content", () => {
      const input = '<article><p>Content</p></article>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<article");
      expect(result).toContain("<p>Content</p>");
    });

    it("preserves img tags with safe attributes", () => {
      const safe = '<img src="https://example.com/image.jpg" alt="Test" width="100">';
      const result = sanitizeHtml(safe);
      expect(result).toContain("<img");
      expect(result).toContain('src="https://example.com/image.jpg"');
      expect(result).toContain('alt="Test"');
      expect(result).toContain('width="100"');
    });

    it("removes disallowed attributes from allowed tags", () => {
      const input = '<div id="test" class="foo" data-value="bar">Content</div>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('id="test"');
      expect(result).not.toContain('class="foo"');
      expect(result).not.toContain('data-value="bar"');
      expect(result).toContain("Content");
    });
  });

  describe("iframe restrictions", () => {
    it("blocks non-YouTube iframes", () => {
      const malicious = '<iframe src="https://evil.com/xss.html"></iframe>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain("<iframe");
      // Opening tag is stripped, but closing tag remains (void behavior)
      expect(result).not.toContain('src="https://evil.com');
    });

    it("allows YouTube embed iframes", () => {
      const safe = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>';
      const result = sanitizeHtml(safe);
      expect(result).toContain("<iframe");
      expect(result).toContain("youtube.com/embed");
    });

    it("allows YouTube nocookie embed iframes", () => {
      const safe = '<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe>';
      const result = sanitizeHtml(safe);
      expect(result).toContain("<iframe");
      expect(result).toContain("youtube-nocookie.com/embed");
    });

    it("blocks YouTube non-embed URLs", () => {
      const malicious = '<iframe src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></iframe>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain("<iframe");
      // Opening tag is stripped, but closing tag remains
      expect(result).not.toContain('src="https://www.youtube.com/watch');
    });
  });

  describe("Link security", () => {
    it("adds rel=noopener noreferrer to target=_blank links", () => {
      const input = '<a href="https://example.com" target="_blank">Link</a>';
      const result = sanitizeHtml(input);
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it("removes target attributes other than _blank", () => {
      const input = '<a href="https://example.com" target="_self">Link</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("target=");
    });
  });

  describe("HTML entity handling", () => {
    it("escapes unencoded angle brackets in text", () => {
      const input = 'Text with < and > symbols';
      const result = sanitizeHtml(input);
      expect(result).toContain("&lt;");
      expect(result).not.toContain("Text with <");
    });

    it("preserves HTML entities in attributes", () => {
      const input = '<a href="https://example.com?a=1&amp;b=2">Link</a>';
      const result = sanitizeHtml(input);
      expect(result).toContain("&amp;");
    });

    it("handles numeric character references", () => {
      const input = '<p>&#60;script&#62;</p>';
      const result = sanitizeHtml(input);
      // Numeric entities in text content are preserved as-is
      expect(result).toContain("<p>");
      expect(result).toContain("&#60;");
      expect(result).toContain("&#62;");
      // The important thing is that it doesn't become executable
      expect(result).not.toContain("<script");
    });
  });

  describe("Edge cases and robustness", () => {
    it("handles empty string", () => {
      expect(sanitizeHtml("")).toBe("");
    });

    it("handles non-string input", () => {
      expect(sanitizeHtml(null as any)).toBe("");
      expect(sanitizeHtml(undefined as any)).toBe("");
      expect(sanitizeHtml(123 as any)).toBe("");
    });

    it("handles plain text without HTML", () => {
      const text = "Just plain text with no markup";
      expect(sanitizeHtml(text)).toBe(text);
    });

    it("handles malformed HTML gracefully", () => {
      const malformed = '<div><p>Unclosed tags<div>More content';
      const result = sanitizeHtml(malformed);
      expect(result).toContain("Unclosed tags");
      expect(result).toContain("More content");
    });

    it("handles deeply nested tags", () => {
      const nested = '<div><div><div><p>Deep</p></div></div></div>';
      const result = sanitizeHtml(nested);
      expect(result).toContain("<p>Deep</p>");
    });

    it("handles mixed case tag names", () => {
      const mixed = '<DIV><P>Text</P></DIV>';
      const result = sanitizeHtml(mixed);
      expect(result).toContain("<div>");
      expect(result).toContain("<p>");
    });

    it("handles HTML comments", () => {
      const input = '<!-- comment --><p>Text</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<!--");
      expect(result).toContain("<p>Text</p>");
    });

    it("handles multiple XSS vectors in one payload", () => {
      const complex = `
        <script>alert(1)</script>
        <img src=x onerror=alert(2)>
        <a href="javascript:alert(3)">Click</a>
        <div onclick="alert(4)">Text</div>
        <style>body{background:url(javascript:alert(5))}</style>
      `;
      const result = sanitizeHtml(complex);
      expect(result).not.toContain("alert");
      expect(result).not.toContain("javascript:");
      expect(result).not.toContain("onerror");
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("<script");
      expect(result).not.toContain("<style");
    });
  });

  describe("Real-world content preservation", () => {
    it("preserves article content with safe formatting", () => {
      const article = `
        <h1>Article Title</h1>
        <p>This is a <strong>paragraph</strong> with <em>formatting</em>.</p>
        <ul>
          <li>First item</li>
          <li>Second item</li>
        </ul>
        <p>Link to <a href="https://example.com">example</a>.</p>
      `;
      const result = sanitizeHtml(article);
      expect(result).toContain("<h1>Article Title</h1>");
      expect(result).toContain("<strong>paragraph</strong>");
      expect(result).toContain("<em>formatting</em>");
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>");
      expect(result).toContain('href="https://example.com"');
    });

    it("preserves tables with safe attributes", () => {
      const table = `
        <table>
          <thead>
            <tr><th>Header</th></tr>
          </thead>
          <tbody>
            <tr><td colspan="2">Cell</td></tr>
          </tbody>
        </table>
      `;
      const result = sanitizeHtml(table);
      expect(result).toContain("<table>");
      expect(result).toContain("<thead>");
      expect(result).toContain("<th>");
      expect(result).toContain("<tbody>");
      expect(result).toContain('colspan="2"');
    });

    it("preserves blockquotes and code blocks", () => {
      const content = `
        <blockquote>A quote</blockquote>
        <pre><code>const x = 1;</code></pre>
      `;
      const result = sanitizeHtml(content);
      expect(result).toContain("<blockquote>");
      expect(result).toContain("<pre>");
      expect(result).toContain("<code>");
    });
  });

  describe("Pentest-specific attack vectors", () => {
    it("prevents stored XSS via editor role content creation", () => {
      // Simulates an editor creating content with XSS payload
      const editorPayload = `
        <h2>Legitimate Article Title</h2>
        <p>Some normal content here.</p>
        <img src=x onerror=alert(document.domain)>
        <p>More content to hide the payload.</p>
      `;
      const result = sanitizeHtml(editorPayload);
      
      // Verify XSS is blocked
      expect(result).not.toContain("onerror");
      expect(result).not.toContain("alert");
      expect(result).not.toContain("document.domain");
      
      // Verify legitimate content is preserved
      expect(result).toContain("<h2>Legitimate Article Title</h2>");
      expect(result).toContain("Some normal content here");
      expect(result).toContain("<img");
    });

    it("prevents XSS in member-only articles", () => {
      // Member-only articles should also be sanitized
      const memberContent = '<p>Member content</p><script>steal_session()</script>';
      const result = sanitizeHtml(memberContent);
      expect(result).not.toContain("<script");
      expect(result).not.toContain("steal_session");
      expect(result).toContain("<p>Member content</p>");
    });

    it("prevents XSS targeting administrators", () => {
      // Payload designed to target admin viewing the article
      const adminTargetPayload = `
        <img src=x onerror="fetch('/api/users',{method:'DELETE'})">
      `;
      const result = sanitizeHtml(adminTargetPayload);
      expect(result).not.toContain("onerror");
      expect(result).not.toContain("fetch");
      expect(result).not.toContain("DELETE");
    });

    it("sanitizes content at persist-time (API route simulation)", () => {
      // Simulates what happens in POST /api/pages
      const requestContent = '<p>Article</p><script>alert(1)</script>';
      const sanitized = typeof requestContent === "string" 
        ? sanitizeHtml(requestContent) 
        : requestContent;
      
      expect(sanitized).not.toContain("<script");
      expect(sanitized).toContain("<p>Article</p>");
    });

    it("sanitizes content at render-time (component simulation)", () => {
      // Simulates what happens in ArticleContent component
      const dbContent = '<p>Content</p><img src=x onerror=alert(1)>';
      const sanitized = sanitizeHtml(dbContent);
      const withBreaks = sanitized.replace(/\n/g, "<br/>");
      
      expect(withBreaks).not.toContain("onerror");
      expect(withBreaks).not.toContain("alert");
    });
  });
});
