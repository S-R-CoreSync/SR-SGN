/**
 * حساب الزمن النسبي من «لحظة مرجعية ثابتة» تُرسَل من السيرفر إلى المتصفح.
 * استخدام Date.now() داخل مكوّن عميل يسبب Hydration mismatch عند عبور حدث دقيقة،
 * لأن السيرفر والعميل يحسبان نصاً مختلفاً لنفس العنصر.
 */
export type RelativeUnit = "minute" | "hour" | "day";

export function relativeTimeParts(
  date: string | number | Date,
  now: number
): { unit: RelativeUnit; count: number } {
  const time = date instanceof Date ? date.getTime() : new Date(date).getTime();
  if (!Number.isFinite(time)) return { unit: "minute", count: 1 };
  const diff = Math.max(0, now - time);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return { unit: "minute", count: mins || 1 };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return { unit: "hour", count: hrs };
  return { unit: "day", count: Math.floor(hrs / 24) };
}

/** مفتاح الترجمة الموافق للوحدة — بلا أي نص عربي ثابت داخل الكود. */
export function relativeTimeKey(unit: RelativeUnit): string {
  if (unit === "minute") return "common.ago_minute";
  if (unit === "hour") return "common.ago_hour";
  return "common.ago_day";
}
