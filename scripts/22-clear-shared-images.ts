#!/usr/bin/env node
/**
 * يفرّغ الصور العامة/المشتركة فقط (UPDATE image = NULL) — بدون حذف أي خبر.
 * بعدها تعرض الواجهة placeholder فريداً بعنوان كل مقال بدل صورة واحدة مكررة.
 *
 * التشغيل: node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/22-clear-shared-images.ts
 */
import "dotenv/config"
import { prisma } from "../src/lib/db"
import { isGenericImageUrl, tagValue } from "../src/lib/post-dedup"

async function main() {
  const rows = await prisma.post.findMany({
    where: { image: { not: null } },
    select: { id: true, image: true, tags: true },
  })

  // أي رابط صورة استخدمه أكثر من خبر (مفتاح مختلف) فهو صورة قناة/شعار مشتركة
  const owners = new Map<string, Set<string>>()
  for (const row of rows) {
    const image = row.image?.trim()
    if (!image) continue
    const key = tagValue(row.tags, "__key:") || tagValue(row.tags, "__source:") || row.id
    if (!owners.has(image)) owners.set(image, new Set())
    owners.get(image)!.add(key)
  }

  const clearIds = rows
    .filter((row) => {
      const image = row.image?.trim()
      if (!image) return false
      return isGenericImageUrl(image) || (owners.get(image)?.size ?? 0) > 1
    })
    .map((row) => row.id)

  for (let i = 0; i < clearIds.length; i += 100) {
    await prisma.post.updateMany({
      where: { id: { in: clearIds.slice(i, i + 100) } },
      data: { image: null },
    })
  }

  console.log(`✅ صور عامة/مشتركة أُفرغت=${clearIds.length} من أصل ${rows.length} خبر بصورة`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error("❌", error)
    await prisma.$disconnect()
    process.exit(1)
  })
