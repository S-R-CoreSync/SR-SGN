import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
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

    // تنظيف لمرة واحدة: الصور العامة (Unsplash) التي كتبها الإصدار القديم
    // من هذا المسار تُزال ليُعاد جلب صورة المقال الحقيقية عند المزامنة.
    // لم نعد نكتب صوراً حسب التصنيف لأنها كانت تظهر خطأً لعشرات المقالات.
    const result = await client.execute({
      sql: "UPDATE posts SET image = NULL WHERE image LIKE 'https://images.unsplash.com/%'",
    });

    client.close();

    return NextResponse.json({
      success: true,
      cleanedPosts: result.rowsAffected,
      message: `Removed ${result.rowsAffected} generic images not related to their articles.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
