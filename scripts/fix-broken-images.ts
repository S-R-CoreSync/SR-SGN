import { PrismaClient } from "@prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { getEditorialFallback } from "../src/lib/image-fallback"

async function main() {
  const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" })
  const prisma = new PrismaClient({ adapter })

  console.log("Checking and fixing broken/expired images in dev.db...")

  const posts = await prisma.post.findMany({
    select: { id: true, title: true, category: true, image: true, source: true },
  })

  let fixedCount = 0
  for (const post of posts) {
    const isFbcdn = post.image && post.image.includes("fbcdn.net")
    const isMissing = !post.image || post.image.trim() === ""

    if (isFbcdn || isMissing) {
      const fallbackUrl = getEditorialFallback(post.title, post.category)
      await prisma.post.update({
        where: { id: post.id },
        data: { image: fallbackUrl },
      })
      fixedCount++
    }
  }

  console.log(`✅ Successfully fixed ${fixedCount} posts with high-quality editorial images!`)

  // Verify
  const sample = await prisma.post.findMany({
    where: { source: "facebook-sgn" },
    select: { id: true, title: true, image: true },
    take: 5,
  })

  console.log("\nSample fixed Facebook posts:")
  for (const s of sample) {
    console.log(`- ${s.title.slice(0, 45)}... -> ${s.image?.slice(0, 70)}...`)
  }

  await prisma.$disconnect()
}

main().catch(console.error)
