import { PrismaClient } from "@prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"

async function main() {
  const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" })
  const prisma = new PrismaClient({ adapter })

  const fbPosts = await prisma.post.findMany({
    where: { source: "facebook-sgn" },
    select: { id: true, title: true, category: true, image: true }
  })

  console.log(`Found ${fbPosts.length} Facebook posts:`)
  for (const p of fbPosts) {
    console.log(`[${p.category}] ${p.title.slice(0, 60)}...`);
  }

  await prisma.$disconnect()
}

main()
