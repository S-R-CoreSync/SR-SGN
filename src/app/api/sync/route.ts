import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { requireAuthorize } from "@/lib/auth-helpers"
import { runSync, DEFAULT_SOURCES } from "@/lib/sync"
import { timingSafeEqual } from "crypto"

import { revalidatePath } from "next/cache"

// ⏱️ مهلة التنفيذ على Vercel (الحد الأقصى على Hobby هو ٦٠ ثانية).
// لذلك صار بالإمكان تشغيل مصدر واحد لكل طلب عبر `source` أو `sources`.
export const maxDuration = 60

/** مقارنة سرّية آمنة زمنياً (تمنع استنتاج السر من فروق التوقيت). */
function secretMatches(provided: string | null): boolean {
  const expected = process.env.CRON_SECRET?.trim()
  if (!expected || !provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(req: Request) {
  // يسمح لمهمة cron عبر ترويسة x-cron-secret أو Vercel Cron (Authorization: Bearer)،
  // وإلا يشترط جلسة بصلاحية settings.edit
  const headerSecret = req.headers.get("x-cron-secret");
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!secretMatches(headerSecret) && !secretMatches(bearer)) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !(await requireAuthorize(session.user.id, "settings.edit"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  try {
    const body = await req.json().catch(() => ({}))

    // اختيار المصادر: `source: "youtube"` أو `sources: ["sy-nl.org", "youtube"]`
    // أو `sources: [{...}]` بكائنات كاملة (للتوافق مع الاستدعاءات القديمة).
    let targets: typeof DEFAULT_SOURCES | undefined
    if (Array.isArray(body.sources) && body.sources.length > 0) {
      targets = body.sources.every((s: unknown) => typeof s === "string")
        ? DEFAULT_SOURCES.filter((s) => (body.sources as string[]).includes(s.name))
        : (body.sources as typeof DEFAULT_SOURCES)
    } else if (typeof body.source === "string") {
      targets = DEFAULT_SOURCES.filter((s) => s.name === body.source)
      if (targets.length === 0) {
        return NextResponse.json(
          { error: `Unknown source "${body.source}"`, available: DEFAULT_SOURCES.map((s) => s.name) },
          { status: 400 }
        )
      }
    }

    const results = await runSync(targets, {
      autoCategorize: body.autoCategorize !== false,
      downloadMedia: body.downloadMedia !== false,
      limit: typeof body.limit === "number" ? body.limit : undefined,
      concurrency: typeof body.concurrency === "number" ? body.concurrency : undefined,
      timeBudgetMs: typeof body.timeBudgetMs === "number" ? body.timeBudgetMs : undefined,
    })

    // كسر التخزين المؤقت لكي تظهر الأخبار الجديدة للعميل فوراً
    revalidatePath("/", "layout")

    return NextResponse.json({ success: true, results })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    )
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !(await requireAuthorize(session.user.id, "settings.view"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({
    status: "idle",
    lastSync: null,
    schedule: "0 * * * *",
    sources: DEFAULT_SOURCES,
  })
}
