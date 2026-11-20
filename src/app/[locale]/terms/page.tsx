"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsPage() {
  const t = useTranslations("legal");
  const sections = t.raw("termsSections") as { title: string; body: string }[];

  return (
    <main className="min-h-screen bg-white dark:bg-[#0B132B]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-[#1a5632] dark:text-emerald-400 hover:underline mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span>{t("backHome")}</span>
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8 text-[#1a5632] dark:text-emerald-400" />
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">{t("termsTitle")}</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">{t("lastUpdated")}</p>

        <div className="space-y-6">
          {sections.map((section, index) => (
            <section
              key={index}
              className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-6"
            >
              <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{section.title}</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
