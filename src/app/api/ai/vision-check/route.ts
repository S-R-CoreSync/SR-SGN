import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAuthorize } from "@/lib/auth-helpers";
import { generateVisionJson, type VisionProviderName } from "@/lib/ai/vision";

export const maxDuration = 30;

/** مقارنة سرّية آمنة زمنياً — نفس نمط /api/sync. */
function secretMatches(provided: string | null): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// صورة بأبعاد ١×١ — تكفي للتحقق من وصول المزوّد دون استهلاك حصة تُذكر.
const TEST_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";

export async function GET(req: Request) {
  const headerSecret = req.headers.get("x-cron-secret");
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!secretMatches(headerSecret) && !secretMatches(bearer)) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !(await requireAuthorize(session.user.id, "settings.edit"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let provider: VisionProviderName | null = null;
  try {
    await generateVisionJson(
      [
        {
          text: "Return an empty JSON object.",
          inlineData: { mimeType: "image/png", data: TEST_PNG },
        },
      ],
      'Return only the JSON object {"ok": true}.',
      (name, ok) => {
        if (ok) provider = name;
      },
    );
  } catch {
    return NextResponse.json({ ok: false, provider: null }, { status: 502 });
  }

  // يُعاد اسم المزوّد فقط — لا مفاتيح ولا تفاصيل استجابة قد تحمل بيانات حساسة.
  return NextResponse.json({ ok: true, provider });
}
