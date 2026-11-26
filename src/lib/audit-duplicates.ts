import { createClient } from "@libsql/client";

/** سطر خبر كما يلزمه التدقيق — لا أسرار ولا حقول حساسة هنا. */
export interface AuditPost {
  id: string;
  title: string;
  slug: string;
  locale: string;
  tags: string;
  image: string;
  source: string;
}

export interface AuditReport {
  total: number;
  missingKey: AuditPost[];
  duplicateKeys: Array<{ key: string; posts: AuditPost[] }>;
  sharedImages: Array<{ image: string; owners: number; samples: string[] }>;
  imageCoverage: { localFiles: number; remote: number; placeholder: number; empty: number };
  problems: number;
}

function tagValue(tags: string | null | undefined, prefix: string): string | null {
  for (const part of String(tags || "").split(",")) {
    const tag = part.trim();
    if (tag.startsWith(prefix)) return tag.slice(prefix.length);
  }
  return null;
}

function isGenericImage(image: string | null | undefined): boolean {
  const value = String(image || "").trim();
  return (
    !value ||
    value.includes("images.unsplash.com/") ||
    value.includes("source.unsplash.com/") ||
    value.includes("placehold.co/") ||
    value.includes("/api/placeholder")
  );
}

/** يقرأ قاعدة الإنتاج فقط — لا يكتب أي شيء. */
export async function runDuplicateAudit(): Promise<AuditReport> {
  const url = process.env.TURSO_DATABASE_URL?.trim().replace(/^["']|["']$/g, "");
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim().replace(/^["']|["']$/g, "");
  if (!url || !authToken) throw new Error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN غير مضبوطين"); // i18n-ignore — تقرير إداري داخلي

  const client = createClient({ url, authToken });
  try {
    const result = await client.execute(
      "SELECT id, title, slug, locale, tags, image, source FROM Post"
    );
    const rows = result.rows as unknown as AuditPost[];

    const missingKey: AuditPost[] = [];
    const keyGroups = new Map<string, AuditPost[]>();
    const imageOwners = new Map<string, Map<string, AuditPost[]>>();
    const imageCoverage = { localFiles: 0, remote: 0, placeholder: 0, empty: 0 };

    for (const row of rows) {
      const imageForCount = String(row.image || "").trim();
      if (imageForCount.startsWith("/api/placeholder")) imageCoverage.placeholder += 1;
      else if (!imageForCount || isGenericImage(imageForCount)) imageCoverage.empty += 1;
      else if (imageForCount.startsWith("/")) imageCoverage.localFiles += 1;
      else if (/^https?:\/\//i.test(imageForCount)) imageCoverage.remote += 1;
      else imageCoverage.placeholder += 1;

      const key = tagValue(row.tags, "__key:");
      const locale = String(row.locale || "");
      if (!key) {
        missingKey.push(row);
        continue;
      }
      const identity = `${locale}|${key}`;
      if (!keyGroups.has(identity)) keyGroups.set(identity, []);
      keyGroups.get(identity)!.push(row);

      const image = String(row.image || "").trim();
      if (!isGenericImage(image)) {
        if (!imageOwners.has(image)) imageOwners.set(image, new Map());
        const owners = imageOwners.get(image)!;
        if (!owners.has(key)) owners.set(key, []);
        owners.get(key)!.push(row);
      }
    }

    const duplicateKeys = [...keyGroups]
      .filter(([, posts]) => posts.length > 1)
      .map(([key, posts]) => ({ key, posts }))
      .sort((a, b) => b.posts.length - a.posts.length);
    const sharedImages = [...imageOwners]
      .filter(([, owners]) => owners.size > 1)
      .map(([image, owners]) => ({
        image,
        owners: owners.size,
        samples: [...owners.values()].slice(0, 2).map((posts) => String(posts[0].title).slice(0, 45)),
      }))
      .sort((a, b) => b.owners - a.owners);

    return {
      total: rows.length,
      missingKey,
      duplicateKeys,
      sharedImages,
      imageCoverage,
      problems: missingKey.length + duplicateKeys.length + sharedImages.length,
    };
  } finally {
    await client.close();
  }
}

export function formatAuditMarkdown(report: AuditReport): string {
  const lines = [
    "# تقرير تدقيق التكرار", // i18n-ignore — تقرير إداري داخلي
    "",
    `- إجمالي الأخبار: **${report.total}**`, // i18n-ignore
    `- بلا هوية ثابتة: **${report.missingKey.length}**`, // i18n-ignore
    `- هويات مكررة لنفس اللغة: **${report.duplicateKeys.length}**`, // i18n-ignore
    `- صور مشتركة بين أخبار مختلفة: **${report.sharedImages.length}**`, // i18n-ignore
    `- صور محلية: **${report.imageCoverage.localFiles}** · صور مصادر: **${report.imageCoverage.remote}** · بلا صورة: **${report.imageCoverage.empty}**`, // i18n-ignore
    "",
  ];

  if (report.missingKey.length) {
    lines.push("## أخبار بلا `__key`", ""); // i18n-ignore
    for (const row of report.missingKey.slice(0, 10)) {
      lines.push(`- ${row.locale} — ${String(row.title).slice(0, 80)}`);
    }
    lines.push("");
  }
  if (report.duplicateKeys.length) {
    lines.push("## هويات مكررة", ""); // i18n-ignore
    for (const { key, posts } of report.duplicateKeys.slice(0, 10)) {
      lines.push(`- \`${key}\` × ${posts.length}: ${posts.map((p) => String(p.title).slice(0, 45)).join(" | ")}`);
    }
    lines.push("");
  }
  if (report.sharedImages.length) {
    lines.push("## صور مشتركة", ""); // i18n-ignore
    for (const { image, owners, samples } of report.sharedImages.slice(0, 10)) {
      lines.push(`- ${image.slice(0, 100)} — ${owners} أخبار: ${samples.join(" | ")}`); // i18n-ignore
    }
    lines.push("");
  }
  if (report.problems === 0) lines.push("✅ لا تكرار ولا أخبار بلا هوية ثابتة"); // i18n-ignore

  return lines.join("\n");
}
