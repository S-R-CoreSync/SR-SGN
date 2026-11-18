import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const PROVINCE_MAP: Record<string, string> = {
  "zuid-holland":  "Zuid-Holland",
  "noord-holland": "Noord-Holland",
  "utrecht":       "Utrecht",
  "gelderland":    "Gelderland",
  "noord-brabant": "Noord-Brabant",
  "overijssel":    "Overijssel",
  "flevoland":     "Flevoland",
  "groningen":     "Groningen",
  "friesland":     "Friesland",
  "drenthe":       "Drenthe",
  "zeeland":       "Zeeland",
  "limburg":       "Limburg",
};

function normalizeProvince(p: string): string {
  if (!p) return "غير محدد";
  const trimmed = p.trim();
  return PROVINCE_MAP[trimmed.toLowerCase()] ?? trimmed;
}

/**
 * ⚠️ ملاحظة مهمة (لا تُعِدها): كان هنا دالة `ensureSeeded()` تحذف **كل** أعضاء
 * الجالية وتزرع ٤٢٥ عضواً وهمياً إذا كان العدد مختلفاً عن ٤٢٥. كانت معرَّفة
 * لكن غير مستدعاة — أي قنبلة موقوتة تمسح قاعدة الإنتاج لحظة استدعائها.
 * أُزيلت نهائياً. البيانات الحقيقية تأتي من قاعدة البيانات فقط.
 */

// ─── Module-level cache (5 min) — يقلّل الاستعلامات على القاعدة ──────────────
type ProvinceStats = { total: number; provinceData: { name: string; count: number }[] };

let cache: { data: ProvinceStats; time: number } | null = null;
const TTL = 5 * 60 * 1000;

async function buildStats(): Promise<ProvinceStats> {
  const total = await prisma.member.count();
  const members = await prisma.member.findMany({
    select: { nlProvincie: true },
  });

  const provMap: Record<string, number> = {};
  members.forEach((p) => {
    const name = normalizeProvince(p.nlProvincie ?? "");
    if (name !== "غير محدد") {
      provMap[name] = (provMap[name] || 0) + 1;
    }
  });

  const provinceData = Object.entries(provMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return { total, provinceData };
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.time < TTL) {
      return NextResponse.json(cache.data, {
        headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" },
      });
    }

    const data = await buildStats();
    cache = { data, time: Date.now() };

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" },
    });
  } catch (err) {
    console.error("[province-stats] error:", err);
    return NextResponse.json(
      { total: 0, provinceData: [] },
      { headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" } }
    );
  }
}
