"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

/**
 * بطاقة «فعّل عضويتك بضغطة» أعلى نموذج الانتساب.
 * الهدف: تحويل متابعي صفحة فيسبوك إلى أعضاء حقيقيين بموافقتهم (OAuth)،
 * بدلاً من محاولة سحب قائمة المتابعين — وهذا غير ممكن عبر Graph API.
 * بعد الدخول تُملأ البيانات الأساسية في النموذج ويُربط العضو بالحساب عبر userId.
 */
export default function ActivateCard() {
  const t = useTranslations("membership");
  const locale = useLocale();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState<string | null>(null);

  const start = async (provider: "facebook" | "google") => {
    setLoading(provider);
    try {
      await signIn(provider, { callbackUrl: `/${locale}/join` });
    } catch {
      setLoading(null);
    }
  };

  if (status === "authenticated" && session?.user) {
    return (
      <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-emerald-900">{t("activateLinkedTitle")}</h3>
            <p className="text-xs text-emerald-800/80 mt-1 leading-relaxed">{t("activateLinkedBody")}</p>
            <p className="text-[11px] text-emerald-700/70 mt-2 truncate" dir="ltr">
              {session.user.email || session.user.name}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5">
      <h3 className="text-sm font-bold text-slate-800">{t("activateTitle")}</h3>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t("activateBody")}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <button
          type="button"
          onClick={() => start("facebook")}
          disabled={!!loading}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#1877F2] text-white text-sm font-bold hover:bg-[#0f6ae0] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading === "facebook" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          )}
          <span>{t("activateCta")}</span>
        </button>

        <button
          type="button"
          onClick={() => start("google")}
          disabled={!!loading}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading === "google" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          <span>{t("activateGoogleCta")}</span>
        </button>
      </div>

      <p className="flex items-start gap-2 text-[11px] text-slate-500 mt-3 leading-relaxed">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <span>{t("activatePrivacy")}</span>
      </p>

      <p className="text-[11px] font-semibold text-slate-400 mt-2 text-center">{t("activateOrManual")}</p>
    </div>
  );
}
