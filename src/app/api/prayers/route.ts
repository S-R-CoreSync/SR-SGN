import { NextResponse } from "next/server";
import { calculatePrayerTimes } from "@/lib/prayers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const city = url.searchParams.get("city") || "amsterdam";
  const locale = url.searchParams.get("locale") || "ar";

  try {
    const data = calculatePrayerTimes(city, new Date(), locale);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to calculate prayer times" }, { status: 500 });
  }
}
