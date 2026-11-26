import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * بروكسي صور المصادر: يمنع الاعتماد على الـ hotlink، ويوحّد الشكل والمقاس،
 * ويستفيد من كاش Vercel (Cache-Control طويل للرد الناجح فقط).
 * القائمة البيضاء تمنع تحويل السيرفر إلى بروكسي مفتوح.
 */
const ALLOWED_HOSTS = new Set([
  "images.euronews.com",
  "images.cdn.nos.nl",
  "cdn.nos.nl",
  "images.nu.nl",
  "tweakers.net",
  "techcrunch.com",
  "media.wired.com",
  "cdn.arstechnica.net",
  "arstechnica.com",
  "assets.zyrosite.com",
  "www.sy-nl.org",
  "img.youtube.com",
  "i.ytimg.com",
  "i1.ytimg.com",
  "i2.ytimg.com",
  "i3.ytimg.com",
  "i4.ytimg.com",
]);

function isAllowed(host: string): boolean {
  const value = host.toLowerCase();
  return ALLOWED_HOSTS.has(value) || /^scontent-[a-z0-9-]+\.xx\.fbcdn\.net$/.test(value);
}

function placeholderRedirect(req: NextRequest, title: string, category: string) {
  const params = new URLSearchParams();
  if (title) params.set("title", title);
  if (category) params.set("category", category);
  const query = params.toString();
  const url = new URL(`/api/placeholder${query ? `?${query}` : ""}`, req.url);
  const res = NextResponse.redirect(url, 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const raw = String(params.get("u") || "").trim();
  const title = (params.get("t") || "").slice(0, 120);
  const category = (params.get("c") || "").slice(0, 60);
  const fallback = () => placeholderRedirect(req, title, category);

  if (!raw || raw.length > 2048) return fallback();

  let source: URL;
  try {
    source = new URL(raw);
  } catch {
    return fallback();
  }
  if (!["http:", "https:"].includes(source.protocol) || !isAllowed(source.hostname)) {
    return fallback();
  }

  // zyrosite يخدم AVIF تحت امتداد jpg عبر format=auto — نطلب الأصل.
  let target = raw;
  if (target.includes("cdn-cgi/image/")) target = target.replace(/cdn-cgi\/image\/[^/]+\//, "");

  const referer = source.hostname.includes("fbcdn.net")
    ? "https://www.facebook.com/"
    : `${source.origin}/`;
  const userAgents = [
    "curl/8.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  ];

  for (const userAgent of userAgents) {
    try {
      const res = await fetch(target, {
        redirect: "follow",
        signal: AbortSignal.timeout(12000),
        headers: {
          "User-Agent": userAgent,
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          Referer: referer,
        },
      });
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 100) continue;

      const webp = await sharp(buffer, { limitInputPixels: false })
        .rotate()
        .resize({ width: 760, height: 560, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 66 })
        .toBuffer();

      return new NextResponse(new Uint8Array(webp), {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Length": String(webp.length),
        },
      });
    } catch {
      // جرّب User-Agent التالي، ثم ارجع للصورة البديلة المحلية.
    }
  }
  return fallback();
}
