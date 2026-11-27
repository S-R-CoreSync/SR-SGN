import { describe, expect, it } from "vitest";
import { relativeTimeKey, relativeTimeParts } from "../relative-time";

describe("relativeTimeParts", () => {
  const now = Date.UTC(2026, 10, 27, 12, 0, 0);

  it("uses a fixed reference time instead of Date.now()", () => {
    expect(relativeTimeParts(new Date(now - 5 * 60_000), now)).toEqual({
      unit: "minute",
      count: 5,
    });
    expect(relativeTimeParts(now - 6 * 3_600_000, now)).toEqual({
      unit: "hour",
      count: 6,
    });
    expect(relativeTimeParts(now - 25 * 3_600_000, now)).toEqual({
      unit: "day",
      count: 1,
    });
  });

  it("clamps invalid and future dates to one minute", () => {
    expect(relativeTimeParts("bad-date", now)).toEqual({ unit: "minute", count: 1 });
    expect(relativeTimeParts(now + 60_000, now)).toEqual({ unit: "minute", count: 1 });
  });

  it("maps each unit to an i18n key without hardcoded display text", () => {
    expect(relativeTimeKey("minute")).toBe("common.ago_minute");
    expect(relativeTimeKey("hour")).toBe("common.ago_hour");
    expect(relativeTimeKey("day")).toBe("common.ago_day");
  });
});
