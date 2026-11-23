import { describe, it, expect } from "vitest";
import {
  hasArabicCharacters,
  isPureLocaleText,
  formatLocalizedNumber,
  formatLocalizedDigits,
  localizeCategory,
} from "../language-guard";

const ARABIC_INDIC = /[٠-٩]/;
const LATIN_DIGIT = /[0-9]/;
const ARABIC_LETTER = /[\u0600-\u06FF]/;

describe("hasArabicCharacters", () => {
  it("detects Arabic script", () => {
    expect(hasArabicCharacters("مرحبا")).toBe(true);
    expect(hasArabicCharacters("Gemeente Den Haag")).toBe(false);
    expect(hasArabicCharacters("")).toBe(false);
    expect(hasArabicCharacters(null)).toBe(false);
    expect(hasArabicCharacters(undefined)).toBe(false);
  });
});

describe("isPureLocaleText — قاعدة العزل اللغوي الصارم", () => {
  it("Arabic section requires Arabic content", () => {
    expect(isPureLocaleText("خبر بالعربية", "ar")).toBe(true);
    expect(isPureLocaleText("Dutch only text", "ar")).toBe(false);
  });

  it("English section must not contain Arabic", () => {
    expect(isPureLocaleText("Community news", "en")).toBe(true);
    expect(isPureLocaleText("خبر عربي", "en")).toBe(false);
  });

  it("Dutch section must not contain Arabic", () => {
    expect(isPureLocaleText("Gemeenschapsnieuws", "nl")).toBe(true);
    expect(isPureLocaleText("خبر عربي", "nl")).toBe(false);
  });

  it("empty values are always considered pure", () => {
    expect(isPureLocaleText("", "ar")).toBe(true);
    expect(isPureLocaleText(null, "en")).toBe(true);
    expect(isPureLocaleText(undefined, "nl")).toBe(true);
  });
});

describe("formatLocalizedNumber — الأرقام حسب اللغة", () => {
  it("uses Arabic-Indic digits (never Latin) for the ar locale", () => {
    const out = formatLocalizedNumber(1234, "ar");
    expect(ARABIC_INDIC.test(out)).toBe(true);
    expect(LATIN_DIGIT.test(out)).toBe(false);
  });

  it("uses Latin digits (never Arabic-Indic) for en / nl", () => {
    for (const locale of ["en", "nl"]) {
      const out = formatLocalizedNumber(1234, locale);
      expect(LATIN_DIGIT.test(out)).toBe(true);
      expect(ARABIC_INDIC.test(out)).toBe(false);
    }
  });

  it("keeps the ar output free of Latin digits for decimals too", () => {
    const out = formatLocalizedNumber("42.5", "ar");
    expect(LATIN_DIGIT.test(out)).toBe(false);
    expect(ARABIC_INDIC.test(out)).toBe(true);
  });

  it("returns the raw value for non-numeric input", () => {
    expect(formatLocalizedNumber("abc", "ar")).toBe("abc");
  });

  it("returns an empty string for null / undefined", () => {
    expect(formatLocalizedNumber(null, "ar")).toBe("");
    expect(formatLocalizedNumber(undefined, "en")).toBe("");
  });
});

describe("formatLocalizedDigits — تحويل الأرقام حسب اللغة", () => {
  it("converts Latin digits to Arabic-Indic for the ar locale", () => {
    expect(formatLocalizedDigits("2026-11-23", "ar")).toBe("٢٠٢٦-١١-٢٣");
    expect(formatLocalizedDigits(123, "ar")).toBe("١٢٣");
  });

  it("preserves non-digit characters (dates, currency) in ar", () => {
    const out = formatLocalizedDigits("15/10/2026", "ar");
    expect(out).toBe("١٥/١٠/٢٠٢٦");
    expect(LATIN_DIGIT.test(out)).toBe(false);
  });

  it("converts Arabic-Indic digits back to Latin for en / nl", () => {
    expect(formatLocalizedDigits("١٢٣", "en")).toBe("123");
    expect(formatLocalizedDigits("٢٠٢٦", "nl")).toBe("2026");
  });

  it("never emits Arabic-Indic digits outside the ar locale", () => {
    const out = formatLocalizedDigits("رقم ٥ و ٧", "nl");
    expect(ARABIC_INDIC.test(out)).toBe(false);
    expect(out).toContain("5");
    expect(out).toContain("7");
  });

  it("returns an empty string for null / undefined", () => {
    expect(formatLocalizedDigits(null, "ar")).toBe("");
    expect(formatLocalizedDigits(undefined, "en")).toBe("");
  });
});

describe("localizeCategory — ترجمة التصنيفات", () => {
  it("translates a known Arabic category into all locales", () => {
    expect(localizeCategory("أخبار الجالية", "ar")).toBe("أخبار الجالية");
    expect(localizeCategory("أخبار الجالية", "en")).toBe("Community News");
    expect(localizeCategory("أخبار الجالية", "nl")).toBe("Gemeenschapsnieuws");
  });

  it("resolves a category given in English back to the other locales", () => {
    expect(localizeCategory("Community News", "nl")).toBe("Gemeenschapsnieuws");
    expect(localizeCategory("Community News", "ar")).toBe("أخبار الجالية");
  });

  it("outputs Latin-only text for en / nl (no Arabic letters)", () => {
    for (const locale of ["en", "nl"]) {
      const out = localizeCategory("أخبار هولندا", locale);
      expect(ARABIC_LETTER.test(out)).toBe(false);
    }
  });

  it("returns the input unchanged for an unknown category", () => {
    expect(localizeCategory("Gewoon iets", "en")).toBe("Gewoon iets");
  });

  it("returns an empty string for an empty category", () => {
    expect(localizeCategory("", "ar")).toBe("");
  });
});
