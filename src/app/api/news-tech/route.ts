import { NextResponse } from "next/server";

const NL_NEWS = process.env.NL_NEWS_URL || "https://www.sy-nl.org/";

const GLOBAL_SITES = [
  { name: "TechCrunch", url: "https://techcrunch.com/" },
  { name: "The Verge", url: "https://www.theverge.com/" },
  { name: "Ars Technica", url: "https://arstechnica.com/" },
  { name: "Wired", url: "https://www.wired.com/" },
  { name: "Gizmodo", url: "https://www.gizmodo.com/" },
];

function extractLinks(html: string, limit = 10): Array<{ title: string; url: string }> {
  const out: Array<{ title: string; url: string }> = [];
  const re = /<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < limit) {
    const href = m[1] || "";
    if (!href.startsWith("http")) continue;
    const title = m[2]!.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).trim();
    if (title) out.push({ title: title.slice(0, 120), url: href });
  }
  return out;
}

export async function GET() {
  const results: Array<{ source: string; title: string; url: string }> = [];

  try {
    const res = await fetch(NL_NEWS, { next: { revalidate: 60 } });
    const html = await res.text();
    results.push(...extractLinks(html, 5).map((l) => ({ source: "NL News", ...l })));
  } catch (e) {
    console.error("NL News fetch error:", e);
  }

  for (const site of GLOBAL_SITES) {
    try {
      const res = await fetch(site.url, { next: { revalidate: 600 } });
      const html = await res.text();
      results.push(...extractLinks(html, 5).map((l) => ({ source: site.name, ...l })));
    } catch (e) {
      console.error(`${site.name} fetch error:`, e);
    }
  }

  return NextResponse.json({ technologyNews: results.slice(0, 40) });
}
