"use client";

import { useTranslations, useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/date";
import { Search, Loader2 } from "lucide-react";

import { formatLocalizedDigits } from "@/lib/language-guard";

export default function VolunteersPage() {
  const t = useTranslations('dashboard.volunteersPage');
  const locale = useLocale();
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(page * PAGE_SIZE));
    if (search) params.set("search", search);

    fetch(`/api/volunteer?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data.volunteers) { setVolunteers(data.volunteers); setTotal(data.total); }
        else if (Array.isArray(data)) { setVolunteers(data); setTotal(data.length); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, search]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl lg:text-2xl font-black text-gray-900 dark:text-white">
          {t('title')} ({formatLocalizedDigits(total, locale)})
        </h1>
      </div>

      <div className="relative mb-4">
        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          value={search} 
          onChange={e => { setSearch(e.target.value); setPage(0); }} 
          placeholder={t('search')} 
          title={t('search')} 
          aria-label={t('search')} 
          className="w-full pr-10 pl-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs sm:text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1a5632]" 
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-800" /></div>
      ) : volunteers.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">{t('noVolunteers')}</div>
      ) : (
        <div className="space-y-3">
          {volunteers.map(v => (
            <div key={v.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm hover:border-emerald-500/30 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{v.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{v.email}{v.phone ? ` - ${formatLocalizedDigits(v.phone, locale)}` : ""}</p>
                </div>
                <span className="text-xs text-gray-400">{formatDate(v.createdAt, locale)}</span>
              </div>
              {v.skills && <div className="mt-2"><span className="text-xs text-gray-500 dark:text-gray-400">{t('skills')}</span><span className="text-sm text-gray-700 dark:text-gray-300">{v.skills}</span></div>}
              {v.availability && <div><span className="text-xs text-gray-500 dark:text-gray-400">{t('duration')}</span><span className="text-sm text-gray-700 dark:text-gray-300">{v.availability}</span></div>}
              {v.message && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 border-t border-gray-100 dark:border-gray-800 pt-2">{v.message}</p>}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition">
            {locale === "nl" ? "← Vorige" : locale === "en" ? "← Previous" : "← السابق"}
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i)} className={`w-9 h-9 rounded-xl text-sm font-medium transition ${i === page ? "bg-emerald-800 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
              {formatLocalizedDigits(i + 1, locale)}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition">
            {locale === "nl" ? "Volgende →" : locale === "en" ? "Next →" : "التالي →"}
          </button>
        </div>
      )}
    </div>
  );
}
