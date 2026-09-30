import { PrismaClient } from "@prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import fs from "fs"

async function main() {
  console.log("=== Checking Local dev.db ===")
  const localAdapter = new PrismaLibSql({ url: "file:./prisma/dev.db" })
  const localPrisma = new PrismaClient({ adapter: localAdapter })
  try {
    const localPosts = await localPrisma.post.findMany({
      select: { id: true, title: true, image: true, source: true },
      take: 15,
    })
    console.log(`Local posts count: ${await localPrisma.post.count()}`)
    for (const post of localPosts) {
      console.log(`[${post.source}] ${post.image}`)
    }
  } catch (e) {
    console.error("Local error:", e)
  } finally {
    await localPrisma.$disconnect()
  }

  console.log("\n=== Checking Live Turso DB via @libsql/client ===")
  const envContent = fs.readFileSync(".env", "utf8")
  const urlMatch = envContent.match(/TURSO_DATABASE_URL="?([^"\r\n]+)"?/)
  const tokenMatch = envContent.match(/TURSO_AUTH_TOKEN="?([^"\r\n]+)"?/)

  if (urlMatch && tokenMatch) {
    const rawUrl = urlMatch[1].trim().replace(/^["']|["']$/g, "")
    const rawToken = tokenMatch[1].trim().replace(/^["']|["']$/g, "")
    const { createClient } = await import("@libsql/client")
    const client = createClient({
      url: rawUrl,
      authToken: rawToken,
    })
    try {
      const cnt = await client.execute("SELECT count(*) as count FROM posts")
      console.log(`Live posts count: ${cnt.rows[0]?.count}`)
      const posts = await client.execute("SELECT id, title, image, source FROM posts LIMIT 15")
      for (const row of posts.rows) {
        console.log(`[${row.source}] ${row.image}`)
      }
      const boardMembers = await client.execute("SELECT nameAr, image FROM board_members LIMIT 5")
      console.log("\nLive Board members:")
      for (const b of boardMembers.rows) {
        console.log(`${b.nameAr} -> ${b.image}`)
      }
    } catch (e) {
      console.error("Turso error:", e)
    }
  } else {
    console.log("No Turso credentials in .env")
  }
}

main()
