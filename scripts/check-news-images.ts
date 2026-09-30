import { PrismaClient } from "@prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"

async function main() {
  const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" })
  const prisma = new PrismaClient({ adapter })

  const posts = await prisma.post.findMany({
    where: {
      OR: [
        { title: { contains: "سفارة" } },
        { title: { contains: "آمنة" } },
        { title: { contains: "IND" } },
      ]
    },
    select: {
      id: true,
      title: true,
      image: true,
      source: true,
      category: true,
    }
  })

  console.log(`Found ${posts.length} posts:`)
  for (const p of posts) {
    console.log(`\nID: ${p.id}`)
    console.log(`Title: ${p.title}`)
    console.log(`Image: ${p.image}`)
    console.log(`Source: ${p.source}`)
  }

  // Also count total posts and how many have NULL or broken image
  const total = await prisma.post.count()
  const withImage = await prisma.post.count({ where: { AND: [{ image: { not: null } }, { image: { not: "" } }] } })
  console.log(`\nTotal posts: ${total}, with image: ${withImage}, without image: ${total - withImage}`)

  await prisma.$disconnect()
}

main().catch(console.error)
