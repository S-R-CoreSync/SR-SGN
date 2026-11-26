import { describe, expect, it } from "vitest";
import { dedupePosts, postDedupKey } from "../post-dedup";

describe("postDedupKey", () => {
  it("يفضّل عمود sourceKey على وسم __key", () => {
    expect(
      postDedupKey({
        id: "1",
        title: "عنوان",
        locale: "ar",
        sourceKey: "abc123",
        tags: "__key:old456,__source:x",
      })
    ).toBe("ar|key:abc123");
  });

  it("يرجع للوسم القديم إن غاب العمود", () => {
    expect(
      postDedupKey({
        id: "2",
        title: "عنوان",
        locale: "nl",
        tags: "news,__key:legacy",
      })
    ).toBe("nl|key:legacy");
  });

  it("الترجمات لنفس المفتاح تبقى أخباراً منفصلة", () => {
    const key = (locale: string) =>
      postDedupKey({ id: locale, title: "عنوان", locale, sourceKey: "same" });
    expect(new Set([key("ar"), key("en"), key("nl")]).size).toBe(3);
  });
});

describe("dedupePosts", () => {
  it("يحتفظ بواحد لكل هوية ويختار اللي عنده صورة حقيقية", () => {
    const result = dedupePosts([
      { id: "old", title: "خبر", locale: "ar", sourceKey: "k", image: null },
      { id: "good", title: "خبر", locale: "ar", sourceKey: "k", image: "/images/news/a.webp" },
      { id: "other", title: "خبر ثاني", locale: "ar", sourceKey: "j", image: null },
    ]);
    expect(result.map((p) => p.id)).toEqual(["good", "other"]);
  });
});
