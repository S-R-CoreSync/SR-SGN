"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

// التصنيف المخزّن في Post مُعرَّف بالعربية في كل اللغات؛ نُرسله كبارامتر للفلترة،
// بينما يُترجم اسم البلوك عبر i18n (ممنوع ظهور العربية في /en و/nl).
const cats = [
  { key: "netherlandsNews", category: "\u0623\u062e\u0628\u0627\u0631 \u0647\u0648\u0644\u0646\u062f\u0627" },
  { key: "europeNews", category: "\u0623\u062e\u0628\u0627\u0631 \u0623\u0648\u0631\u0648\u0628\u0627" },
  { key: "economy", category: "\u0627\u0642\u062a\u0635\u0627\u062f" },
  { key: "culture", category: "\u062b\u0642\u0627\u0641\u064a\u0627\u062a" },
  { key: "sports", category: "\u0631\u064a\u0627\u0636\u0629" },
  { key: "tech", category: "\u062a\u0643\u0646\u0648\u0644\u0648\u062c\u064a\u0627" },
] as const;

const colors: Record<string, { c: string; b: string }> = {
  netherlandsNews: { c: "text-blue-600 dark:text-blue-400", b: "bg-blue-50 dark:bg-blue-950/40" },
  europeNews: { c: "text-purple-600 dark:text-purple-400", b: "bg-purple-50 dark:bg-purple-950/40" },
  economy: { c: "text-green-600 dark:text-green-400", b: "bg-green-50 dark:bg-green-950/40" },
  culture: { c: "text-amber-600 dark:text-amber-400", b: "bg-amber-50 dark:bg-amber-950/40" },
  sports: { c: "text-red-600 dark:text-red-400", b: "bg-red-50 dark:bg-red-950/40" },
  tech: { c: "text-indigo-600 dark:text-indigo-400", b: "bg-indigo-50 dark:bg-indigo-950/40" },
};

export function CategoryGrid() {
  const t = useTranslations();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {cats.map(({ key, category }) => {
        const style = colors[key];
        return (
          <Link
            key={key}
            href={`/news?category=${encodeURIComponent(category)}`}
            className={`${style.b} ${style.c} rounded-xl p-3 text-center font-medium text-xs hover:shadow transition-shadow`}
          >
            {t(`categories.${key}`)}
          </Link>
        );
      })}
    </div>
  );
}
