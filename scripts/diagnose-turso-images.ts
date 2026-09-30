import { createClient } from "@libsql/client";
import fs from "fs";

async function main() {
  let envFile = ".env";
  if (fs.existsSync(".env.production")) envFile = ".env.production";
  const content = fs.readFileSync(envFile, "utf8");
  
  let tursoUrl = "";
  let tursoToken = "";
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (t.startsWith("TURSO_DATABASE_URL=")) {
      tursoUrl = t.split("=")[1].replace(/^["']|["']$/g, "").trim();
    }
    if (t.startsWith("TURSO_AUTH_TOKEN=")) {
      tursoToken = t.split("=")[1].replace(/^["']|["']$/g, "").trim();
    }
  }

  console.log("Turso URL:", tursoUrl.slice(0, 20) + "...");
  const client = createClient({ url: tursoUrl, authToken: tursoToken });

  const countRes = await client.execute("SELECT COUNT(*) as count FROM posts");
  console.log("Total posts in Turso:", countRes.rows[0].count);

  const imagesRes = await client.execute("SELECT id, title, image, source FROM posts WHERE image IS NOT NULL LIMIT 10");
  console.log("\nSample posts with images in Turso:");
  for (const row of imagesRes.rows) {
    console.log(`[${row.source}] Title: ${String(row.title).slice(0, 40)}`);
    console.log(`  Image: ${row.image}`);
  }

  const nullImages = await client.execute("SELECT COUNT(*) as count FROM posts WHERE image IS NULL OR image = ''");
  console.log("\nPosts with NULL or empty image in Turso:", nullImages.rows[0].count);

  // Check the specific post from the user screenshot!
  const embassyPost = await client.execute("SELECT id, title, image, source FROM posts WHERE title LIKE '%سفارة%' LIMIT 5");
  console.log("\nEmbassy post in Turso:");
  for (const row of embassyPost.rows) {
    console.log(`Title: ${row.title}`);
    console.log(`Image: ${row.image}`);
  }
}

main().catch(console.error);
