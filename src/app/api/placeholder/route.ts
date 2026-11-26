import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getPremiumPlaceholder } from "@/lib/image-fallback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * صورة احتياطية محلية بصيغة PNG، مولّدة من نفس SVG المستخدم في الويب.
 * الويب يستخدم الـ data-uri مباشرة، والموبايل يطلب هذا المسار —
 * فتتطابق الألوان والنص بين المنصتين دون placehold.co أو أي خدمة خارجية.
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const title = (params.get("title") || "").slice(0, 120);
    const category = (params.get("category") || "").slice(0, 60);

    const dataUri = getPremiumPlaceholder(title || null, category || null);
    const encoded = dataUri.slice(dataUri.indexOf(",") + 1);
    const svg = Buffer.from(decodeURIComponent(encoded), "utf8");
    const png = await sharp(svg).png().toBuffer();

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "placeholder generation failed" }, { status: 500 });
  }
}
