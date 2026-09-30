import { PrismaClient } from "@prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"

async function main() {
  const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" })
  const prisma = new PrismaClient({ adapter })

  const posts = await prisma.post.findMany({
    select: { id: true, source: true, image: true }
  })

  const stats: Record<string, { total: number; withImage: number; fbcdn: number; ytimg: number; zyro: number; other: number }> = {}

  for (const p of posts) {
    const s = p.source || "unknown"
    if (!stats[s]) stats[s] = { total: 0, withImage: 0, fbcdn: 0, ytimg: 0, zyro: 0, other: 0 }
    stats[s].total++
    if (p.image) {
      stats[s].withImage++
      if (p.image.includes("fbcdn.net")) stats[s].fbcdn++
      else if (p.image.includes("ytimg.com") || p.image.includes("youtube.com")) stats[s].ytimg++
      else if (p.image.includes("zyrosite.com") || p.image.includes("sy-nl.org")) stats[s].zyro++
      else stats[s].other++
    }
  }

  console.table(stats)
  await prisma.$disconnect()
}

main()
