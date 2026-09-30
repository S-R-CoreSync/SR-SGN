import { NextResponse } from "next/server";
import { readdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { hasArabicCharacters } from "@/lib/language-guard";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const locale = url.searchParams.get("locale") || "ar";
    const isAr = locale === "ar";

    const seenUrls = new Set<string>();

    // 1. Get database post images strictly for THIS locale
    const posts = await prisma.post.findMany({
      where: {
        published: true,
        image: { not: "" },
        locale,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        image: true,
        category: true,
        createdAt: true,
      },
    });

    const postImages: any[] = [];
    for (const p of posts) {
      if (!p.image || !p.image.trim()) continue;
      
      const normalizedImg = p.image.trim();
      // Deduplicate: each unique photo must only appear once in gallery
      if (seenUrls.has(normalizedImg)) continue;

      // Strict Language Isolation:
      // Arabic section MUST contain Arabic text.
      // Non-Arabic sections MUST NOT contain Arabic text.
      if (isAr && !hasArabicCharacters(p.title)) continue;
      if (!isAr && hasArabicCharacters(p.title)) continue;

      seenUrls.add(normalizedImg);
      postImages.push({
        url: normalizedImg,
        title: p.title,
        slug: p.slug || p.id,
        category: p.category,
        createdAt: p.createdAt,
        source: "post",
      });
    }

    // 2. Get static uploads
    let staticImages: any[] = [];
    try {
      const dir = path.join(process.cwd(), "public", "uploads");
      const files = await readdir(dir);
      staticImages = files
        .filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f))
        .filter(f => !seenUrls.has(`/uploads/${f}`))
        .map(f => {
          seenUrls.add(`/uploads/${f}`);
          return {
            url: `/uploads/${f}`,
            title: isAr ? "صورة مرفوعة للجالية" : f.split(".")[0].replace(/[-_]/g, " "),
            source: "upload",
          };
        });
    } catch (e) {
      console.warn("Could not read public/uploads directory:", e);
    }

    // Return deduplicated, locale-pure images
    return NextResponse.json([...postImages, ...staticImages]);
  } catch (error) {
    console.error("[API/uploads] error:", error);
    return NextResponse.json([]);
  }
}
