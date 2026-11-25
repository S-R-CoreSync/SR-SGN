import "dotenv/config"
import { runSync, DEFAULT_SOURCES } from "../src/lib/sync"
import { prisma } from "./db"

const TECH_SOURCES = [
  "tweakers-tech",
  "nu-tech",
  "techcrunch-tech",
  "arstechnica-tech",
  "wired-tech",
]

async function main() {
  const sources = DEFAULT_SOURCES.filter((s) => TECH_SOURCES.includes(s.name))
  console.log(`🔄 مزامنة مصادر التقنية: ${sources.length} مصادر`)

  const results = await runSync(sources)
  for (const r of results) {
    const status = r.success ? "✅" : "❌"
    console.log(`${status} ${r.source}: fetched=${r.fetched} new=${r.new} updated=${r.updated} skipped=${r.skipped} errors=${r.errors.length}`)
    r.errors.forEach((e) => console.log(`   ❌ ${e}`))
  }

  const saved = await prisma.post.count({ where: { category: "تكنولوجيا", published: true } })
  console.log(`📰 إجمالي مقالات التقنية في قاعدة البيانات: ${saved}`)
}

main()
  .catch((err) => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
