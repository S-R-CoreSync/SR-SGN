"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/routing";
import { Megaphone, X } from "lucide-react";

/**
 * شريط إعلان أعلى الموقع — دعوة أعضاء مجلس الإدارة والكوادر لإنشاء حسابهم.
 *
 * السبب: دورات الأمان السابقة أنهت الجلسات القديمة، ولم يكن لأعضاء اللوحة
 * الـ٢٤ أي حساب على الموقع أصلاً (ولا بريد/جوال مسجّل للتواصل معهم).
 *
 * - قابل للإغلاق ويُحفظ اختيار الزائر في localStorage (لا يزعجه كل زيارة).
 * - يختفي تلقائياً بعد التاريخ المحدد أدناه.
 * - يختفي لمن سجّل دخوله (useSession) — فهو ليس بحاجة الرسالة.
 */

/** يختفي الشريط تلقائياً بعد هذا التاريخ. */
const ANNOUNCEMENT_UNTIL = new Date("2026-12-15T23:59:59Z");
const DISMISS_KEY = "sgn-announcement-dismissed-2026-11";

export default function AnnouncementBar() {
  const t = useTranslations("announcement");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const { status } = useSession();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Date.now() > ANNOUNCEMENT_UNTIL.getTime()) return;
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // متصفح يمنع التخزين (وضع خاص) — نعرض الشريط على أي حال
    }
    setVisible(true);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // لا شيء
    }
  };

  // داخل صفحتَي الدخول/التسجيل الشريط بلا فائدة: ضغط زره يعيد تحميل نفس الصفحة
  // فيبدو للمستخدم أنه «ما يعطي خيارات» — نخفيه هناك ونتركه في باقي الصفحات.
  if (/\/login|\/signup/.test(pathname)) return null;

  // من سجّل دخوله لا يحتاج الرسالة — تُخفى فوراً
  if (status === "authenticated") return null;

  if (!visible) return null;

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="relative z-50 bg-gradient-to-l from-emerald-800 via-emerald-700 to-emerald-800 text-white"
      role="region"
      aria-label={t("message")}
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="flex items-center justify-center gap-2 py-2 text-center">
          <Megaphone className="w-4 h-4 flex-shrink-0 opacity-90" aria-hidden />
          <p className="text-[12px] sm:text-xs font-semibold leading-snug">
            {t("message")}
          </p>
          <Link
            href="/login"
            className="hidden sm:inline-flex flex-shrink-0 items-center rounded-full px-3 py-1 text-[11px] font-extrabold transition-colors hover:brightness-95"
            style={{ backgroundColor: "#ffffff", color: "#065f46" }}
          >
            {t("cta")}
          </Link>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("close")}
            className="absolute end-1 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
        <Link
          href="/login"
          className="sm:hidden flex justify-center pb-2 -mt-1 text-[11px] font-extrabold text-white/95 underline underline-offset-2"
        >
          {t("cta")}
        </Link>
      </div>
    </div>
  );
}
