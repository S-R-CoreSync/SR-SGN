import { describe, it, expect } from "vitest";
import { PLACEHOLDER_IMG, resolveImage, getUniqueImageUrl, getPremiumPlaceholder, remoteMediaUrl } from "../image-fallback";

describe("PLACEHOLDER_IMG", () => {
  it("is a data URL", () => {
    expect(PLACEHOLDER_IMG).toMatch(/^data:image\/svg\+xml/);
  });

  it("contains SVG markup", () => {
    expect(PLACEHOLDER_IMG).toContain("svg");
    expect(PLACEHOLDER_IMG).toContain("1a5632");
  });
});

describe("resolveImage", () => {
  it("returns placeholder when img is null", () => {
    expect(resolveImage(null)).toBe(PLACEHOLDER_IMG);
  });

  it("returns placeholder when img is empty string", () => {
    expect(resolveImage("")).toBe(PLACEHOLDER_IMG);
  });

  it("returns placeholder when img is undefined", () => {
    expect(resolveImage(undefined)).toBe(PLACEHOLDER_IMG);
  });

  it("يمرّر رابط http عبر البروكسي المحلي بدل طلبه مباشرة", () => {
    const url = "http://example.com/image.jpg";
    expect(resolveImage(url)).toMatch(/^\/api\/media\?u=/);
    expect(decodeURIComponent(resolveImage(url))).toContain(url);
  });

  it("يمرّر رابط https عبر البروكسي المحلي", () => {
    const url = "https://cdn.example.com/img.png";
    expect(resolveImage(url)).toMatch(/^\/api\/media\?u=/);
    expect(decodeURIComponent(resolveImage(url))).toContain(url);
  });

  it("returns relative path as-is", () => {
    const path = "/uploads/photo.jpg";
    expect(resolveImage(path)).toBe(path);
  });

  it("returns placeholder for non-http relative path without leading slash", () => {
    expect(resolveImage("uploads/photo.jpg")).toBe(PLACEHOLDER_IMG);
  });

  it("keeps the SVG free of fixed Arabic text even when the category is untranslated", () => {
    const svg = decodeURIComponent(
      getPremiumPlaceholder("English headline", "أخبار الجالية").split(",")[1]
    );
    expect(svg).not.toMatch(/[\u0600-\u06FF]/);
    expect(svg).toContain('direction="ltr"');
    expect(svg).toContain("English headline");
  });
});

describe("remoteMediaUrl", () => {
  it("يرفض الروابط المحلية والصور العامة", () => {
    expect(remoteMediaUrl("/images/news/a.webp")).toBeNull();
    expect(remoteMediaUrl("https://images.unsplash.com/photo-1")).toBeNull();
    expect(remoteMediaUrl("https://placehold.co/400x240")).toBeNull();
  });

  it("يحتفظ بالعنوان والتصنيف للصورة البديلة عند الفشل", () => {
    const url = remoteMediaUrl("https://images.nu.nl/a.jpg", "خبر", "تقنية");
    expect(url).toMatch(/^\/api\/media\?/);
    expect(url).toContain("t=");
    expect(url).toContain("c=");
    expect(decodeURIComponent(url!)).toContain("خبر");
  });
});

describe("getUniqueImageUrl", () => {
  it("gives different local images to titles sharing the same truncated prefix", () => {
    const a = getUniqueImageUrl(null, "DIVD Suspects AI Tool Artex Was Used in Hack of Collective");
    const b = getUniqueImageUrl(null, "DIVD Suspects AI Tool Artex Was Used in Its Own Hack");
    expect(a).toMatch(/^\/api\/placeholder\?/);
    expect(b).toMatch(/^\/api\/placeholder\?/);
    expect(a).not.toBe(b);
    expect(a + b).not.toContain("placehold.co");
  });
});
