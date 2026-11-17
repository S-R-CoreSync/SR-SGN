import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rawUrl = process.env.TURSO_DATABASE_URL?.trim() || "";
  const rawToken = process.env.TURSO_AUTH_TOKEN?.trim() || "";
  const cleanedUrl = rawUrl.replace(/[^\x20-\x7E]/g, "").trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
  const finalUrl = cleanedUrl && !/^[a-z]+:\/\//i.test(cleanedUrl) ? `libsql://${cleanedUrl}` : cleanedUrl;

  try {
    const postCount = await prisma.post.count();
    const postsBySource = await prisma.post.groupBy({
      by: ["source"],
      _count: true,
    });

    const firstFivePosts = await prisma.post.findMany({
      select: {
        id: true,
        title: true,
        source: true,
        image: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      env: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        hasTursoUrl: !!process.env.TURSO_DATABASE_URL?.trim(),
        hasTursoToken: !!process.env.TURSO_AUTH_TOKEN?.trim(),
        hasDatabaseUrl: !!process.env.DATABASE_URL?.trim(),
        hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN?.trim(),
        hasFbId: !!process.env.FACEBOOK_PAGE_ID?.trim(),
        hasFbToken: !!process.env.FACEBOOK_PAGE_TOKEN?.trim(),
        tursoUrlHost: finalUrl.replace(/^.*:\/\//, "").split("/")[0],
        tursoUrlLength: rawUrl.length,
        tursoTokenLength: rawToken.length,
      },
      db: {
        postCount,
        postsBySource,
        firstFivePosts,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || String(error),
        stack: error.stack,
        env: {
          hasTursoUrl: !!process.env.TURSO_DATABASE_URL?.trim(),
          hasTursoToken: !!process.env.TURSO_AUTH_TOKEN?.trim(),
          hasDatabaseUrl: !!process.env.DATABASE_URL?.trim(),
          hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN?.trim(),
          tursoUrlHost: finalUrl.replace(/^.*:\/\//, "").split("/")[0],
          tursoUrlLength: rawUrl.length,
          tursoTokenLength: rawToken.length,
        },
      },
      { status: 500 }
    );
  }
}
