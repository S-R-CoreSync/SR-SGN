#!/usr/bin/env node
/**
 * يمنح الأخبار الموجودة هوية ثابتة (__key:) داخل الوسوم.
 * لا يحذف ولا يغيّر عنواناً أو صورة — يضيف وسمًا فقط، فالمزامنة القادمة
 * لا تنشئ نسخة جديدة من نفس الخبر.
 *
 * التشغيل: node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/21-backfill-post-keys.ts
 */
import "dotenv/config"
import { prisma } from "../src/lib/db"
import { computeSourceKey, appendKeyTag } from "../src/lib/sync/source-key"
import { tagValue } from "../src/lib/post-dedup"

async function main() {
  const rows = await prisma.post.findMany({
    where: { tags: { not: null } },
    select: { id: true, tags: true, source: true, videoId: true },
  })

  let updated = 0
  let already = 0
  let failed = 0

  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100)
    await Promise.all(batch.map(async (row) => {
      if (tagValue(row.tags, "__key:")) {
        already++
        return
      }
      const sourceTag = tagValue(row.tags, "__source:") || ""
      const split = sourceTag.indexOf(":")
      const source = split > 0 ? sourceTag.slice(0, split) : row.source || "unknown"
      const sourceUrl = split > 0 ? sourceTag.slice(split + 1) : ""
      const key = computeSourceKey({ source, sourceUrl, videoId: row.videoId })
      try {
        await prisma.post.update({
          where: { id: row.id },
          data: { tags: appendKeyTag(row.tags, key) },
        })
        updated++
      } catch {
        failed++
      }
    }))
  }

  console.log(`✅ هوية ثابتة: مضاف=${updated} موجود=${already} فشل=${failed} من أصل ${rows.length}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error("❌", error)
    await prisma.$disconnect()
    process.exit(1)
  })
