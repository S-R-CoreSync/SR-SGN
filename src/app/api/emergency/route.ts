import { NextResponse } from "next/server";
import { formatLocalizedDigits } from "@/lib/language-guard";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = url.searchParams.get("locale") || "ar";
  const isAr = locale === "ar";
  const isNl = locale === "nl";

  const contacts = [
    {
      id: "emergency-112",
      category: "police_ambulance_fire",
      urgency: "critical",
      title: isAr ? "طوارئ هولندا العامة (شرطة - إسعاف - إطفاء)" : isNl ? "Algemeen Noodnummer (Politie, Ambulance, Brandweer)" : "Dutch Emergency Number (Police, Ambulance, Fire)",
      number: "112",
      description: isAr ? "اتصل فقط في الحالات المهددة للحياة أو الجرائم المباشرة الحادثة الآن." : isNl ? "Bel alleen bij levensbedreigende situaties of misdrijven op heterdaad." : "Call only for life-threatening situations or crimes in progress.",
      available: isAr ? "متاح ٢٤/٧ مجاناً" : isNl ? "24/7 gratis bereikbaar" : "24/7 toll-free",
    },
    {
      id: "police-non-emergency",
      category: "police",
      urgency: "medium",
      title: isAr ? "الشرطة الهولندية (للحالات غير الطارئة)" : isNl ? "Politie (Geen spoed, wel politie)" : "Dutch Police (Non-emergency)",
      number: "09008844",
      displayNumber: isAr ? formatLocalizedDigits("0900-8844", "ar") : "0900-8844",
      description: isAr ? "للإبلاغ عن سرقة، إزعاج، حوادث سابقة، أو الاستفسارات الأمنية." : isNl ? "Voor meldingen zonder spoed, overlast, aangifte of vragen." : "For non-urgent reports, disturbances, or police inquiries.",
      available: isAr ? "متاح ٢٤/٧" : isNl ? "24/7 bereikbaar" : "Available 24/7",
    },
    {
      id: "mental-health-113",
      category: "health",
      urgency: "high",
      title: isAr ? "خط الدعم النفسي والوقاية (113 Zelfmoordpreventie)" : isNl ? "Hulplijn Zelfmoordpreventie (113)" : "Mental Health & Crisis Hotline (113)",
      number: "113",
      description: isAr ? "دعم نفسي سري وسريع ومجاني للأشخاص الذين يمرون بضغوط نفسية حادة." : isNl ? "Gratis en anonieme hulplijn voor acute mentale ondersteuning." : "Free and confidential helpline for acute emotional distress.",
      available: isAr ? "متاح ٢٤/٧ مجاناً" : isNl ? "24/7 gratis" : "24/7 Free",
    },
    {
      id: "solidarity-repatriation",
      category: "community",
      urgency: "critical",
      title: isAr ? "صندوق التكافل والطوارئ لنقل الجثامين (ANBI)" : isNl ? "SGN Solidariteitsfonds & Repatriëring (ANBI)" : "SGN Solidarity & Repatriation Fund (ANBI)",
      number: "+31684603406",
      displayNumber: isAr ? formatLocalizedDigits("+31 6 84 60 34 06", "ar") : "+31 6 84 60 34 06",
      description: isAr ? "الإشراف والتغطية والمتابعة الفورية لنقل جثامين المتوفين السوريين والدعم الأسري." : isNl ? "Directe ondersteuning bij overlijden, repatriëring en familiebijstand." : "Immediate coordination for bereavement, repatriation, and family relief.",
      iban: "NL90 ABNA 0148 7498 95",
      available: isAr ? "خط ساخن مباشر للجالية" : isNl ? "Directe gemeenschapshulplijn" : "Direct community hotline",
    },
    {
      id: "ind-lost-docs",
      category: "legal",
      urgency: "medium",
      title: isAr ? "دائرة الهجرة والتجنيس (فقدان الإقامة أو الجواز)" : isNl ? "IND (Verlies van verblijfsdocument)" : "IND (Lost Residence Permit)",
      number: "0880430430",
      displayNumber: isAr ? formatLocalizedDigits("088 043 0430", "ar") : "088 043 0430",
      description: isAr ? "طلب إصدار وثيقة إقامة بديلة أو وثيقة سفر طارئة للقادمين واللاجئين." : isNl ? "Aanvragen vervangend verblijfsdocument of nooddocument." : "Applying for replacement residence permit or urgent travel document.",
      available: isAr ? "أيام العمل الرسمية ٩:٠٠ - ١٧:٠٠" : isNl ? "Werkdagen 09:00 - 17:00" : "Business days 09:00 - 17:00",
    },
    {
      id: "interpreter-support",
      category: "medical_translation",
      urgency: "high",
      title: isAr ? "مترجمو الطوارئ الطبية والمستشفيات" : isNl ? "Medische Tolken & Ziekenhuisbijstand" : "Emergency Medical Interpreters",
      number: "+31684603406",
      displayNumber: isAr ? formatLocalizedDigits("+31 6 84 60 34 06", "ar") : "+31 6 84 60 34 06",
      description: isAr ? "شبكة متطوعين ومترجمين محلفين لمساندتك لغوياً في غرف الطوارئ والمستشفيات الهولندية." : isNl ? "Vrijwillige en beëdigde tolken voor spoedeisende hulp en ziekenhuisopnames." : "Sworn and volunteer interpreters for urgent hospital & ER assistance.",
      available: isAr ? "تنسيق عاجل عبر واتساب" : isNl ? "Spoed via WhatsApp" : "Urgent WhatsApp triage",
    }
  ];

  return NextResponse.json({
    success: true,
    contacts,
  });
}
