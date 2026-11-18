import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { getEditorialFallback } from "@/lib/image-fallback";
import { verifyAdminSecret } from "@/lib/admin-secret";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = verifyAdminSecret(req);
  if (denied) return denied;

  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
  const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (!tursoUrl || !tursoToken || tursoUrl.includes("mydb-user")) {
    return NextResponse.json({ error: "Turso credentials not configured on server" }, { status: 400 });
  }

  try {
    const cleanUrl = tursoUrl.replace(/^["']|["']$/g, "").trim();
    const cleanToken = tursoToken.replace(/^["']|["']$/g, "").trim();
    const client = createClient({ url: cleanUrl, authToken: cleanToken });

    // Fetch all posts with broken or missing images in Turso
    const postsRes = await client.execute("SELECT id, title, category, image FROM posts");
    let updated = 0;

    for (const row of postsRes.rows) {
      const id = row.id as string;
      const title = (row.title || "") as string;
      const category = (row.category || "") as string;
      const image = (row.image || "") as string;

      const isBroken = !image || image.includes("fbcdn.net") || image.trim() === "";

      if (isBroken) {
        const fallback = getEditorialFallback(title, category);
        await client.execute({
          sql: "UPDATE posts SET image = ? WHERE id = ?",
          args: [fallback, id],
        });
        updated++;
      }
    }

    client.close();

    return NextResponse.json({
      success: true,
      totalScanned: postsRes.rows.length,
      updatedPosts: updated,
      message: `Successfully updated ${updated} posts in Turso with high-resolution permanent editorial images!`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
