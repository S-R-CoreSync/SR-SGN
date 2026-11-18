import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * 🔐 حذف ملف من `public/uploads` — يتطلب جلسة إدارية.
 * كان سابقاً بلا أي تحقّق: أي زائر يقدر يحذف أي صورة بالموقع بطلب واحد.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { slug } = await params;

  // منع الخروج عن مجلد uploads (path traversal)
  const base = path.join(process.cwd(), "public", "uploads");
  const filePath = path.resolve(base, slug);
  if (!filePath.startsWith(base + path.sep)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    await unlink(filePath);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
