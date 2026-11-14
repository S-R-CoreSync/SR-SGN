"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import {
  Printer, FileText, RefreshCw, User, Building2, HandHeart,
  Calendar, Sparkles, Loader2, Search, Check, Settings2, Eye,
  Copy, Stamp, QrCode, Wand2, Plus, Trash2, ArrowRight, ShieldCheck,
  CheckCircle2, Info, FileSpreadsheet
} from "lucide-react";
import {
  DOCUMENT_TEMPLATES, BOARD_OFFICERS, SGN_ORGANIZATION_INFO,
  OFFICIAL_VOLUNTEER_ARTICLES, VOLUNTEER_DEPARTMENTS,
  DocumentParty, VolunteerArticle
} from "@/lib/documents/templates";

// ============================================================
// TYPES
// ============================================================
type LangMode = "nl" | "ar" | "bilingual";

interface MemberOption {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postcode?: string;
  birthDate?: string;
  idNumber?: string;
  role?: string;
  department?: string;
}

interface EditableArticle {
  number: number;
  titleNl: string;
  titleAr: string;
  paragraphsNl: string[];
  paragraphsAr: string[];
}

// Preset AI Prompts for instant contract customization
const AI_PRESETS = [
  {
    id: "media",
    labelAr: "تطوع إعلامي وإنتاج محتوى رقمي",
    labelNl: "Media & Digitale Content Creatie",
    promptAr: "أضف بنوداً متخصصة بالتطوع الإعلامي، وإدارة منصات التواصل الاجتماعي، وإنتاج الفيديو، مع حقوق ملكية المحتوى للجالية.",
    promptNl: "Voeg bepalingen toe voor media-vrijwilligerswerk, social media beheer, videoproductie en intellectueel eigendom van content ten gunste van SGN.",
    dept: "media",
  },
  {
    id: "ict",
    labelAr: "تطوع تقني وبرمجة وإدارة أنظمة",
    labelNl: "ICT & Systeembeheer",
    promptAr: "أضف بنوداً متخصصة في الدعم التقني، وحماية قواعد البيانات، وإدارة المنظومة الرقمية، والالتزام الصارم بأمن المعلومات.",
    promptNl: "Voeg bepalingen toe voor ICT-ondersteuning, databasebeheer, cybersecurity en strikte naleving van de informatiebeveiliging.",
    dept: "ict",
  },
  {
    id: "events",
    labelAr: "تنظيم فعاليات ونشاطات مجتمعية",
    labelNl: "Evenementen & Logistiek",
    promptAr: "أضف بنوداً خاصة بالإشراف على الفعاليات الميدانية، والالتزام بمعايير السلامة العامة، وتنسيق استقبال المشاركين.",
    promptNl: "Voeg bepalingen toe voor organisatie van evenementen, publieke veiligheid en coördinatie van deelnemers.",
    dept: "events",
  },
  {
    id: "translation",
    labelAr: "خدمات ترجمة واستشارات اندماج",
    labelNl: "Vertaling & Participatiebegeleiding",
    promptAr: "أضف بنوداً تتضمن التزام المترجم بالأمانة المهنية وسرية وثائق المستفيدين وعدم تقديم استشارات قانونية خارج اختصاصه.",
    promptNl: "Voeg bepalingen toe voor beëdigde vertaling, strikte vertrouwelijkheid en begeleiding bij inburgering.",
    dept: "projects",
  },
  {
    id: "expenses",
    labelAr: "ملحق المصاريف التشغيلية والتنقل",
    labelNl: "Onkosten- & Reiskostenregeling",
    promptAr: "أضف بنداً تفصيلياً يحدد سقف تعويض مصاريف السفر والمواصلات العامة وفق معايير مصلحة الضرائب الهولندية (Belastingdienst).",
    promptNl: "Voeg een gedetailleerde onkosten- en reiskostenclausule toe conform de richtlijnen van de Belastingdienst.",
    dept: "other",
  },
];

export default function DocumentsGeneratorPage() {
  const locale = useLocale() as "ar" | "nl" | "en";
  const isAr = locale === "ar";

  // Tab State
  const [activeTab, setActiveTab] = useState<"parties" | "articles" | "ai">("parties");
  const [copied, setCopied] = useState(false);

  // Contract Settings
  const [templateId, setTemplateId] = useState<string>("volunteer_agreement");
  const [lang, setLang] = useState<LangMode>("nl");
  const [refNumber, setRefNumber] = useState<string>(() => `SGN-DOC-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [issueDate, setIssueDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [city, setCity] = useState<string>("Den Haag");
  const [includeSeal, setIncludeSeal] = useState<boolean>(true);
  const [includeQr, setIncludeQr] = useState<boolean>(true);

  // Volunteer specifics
  const [department, setDepartment] = useState<string>("media");
  const [hoursPerWeek, setHoursPerWeek] = useState<string>("10-12");

  // Signatory (First Party Representative)
  const [signatoryIndex, setSignatoryIndex] = useState<number>(0);
  const signatory = BOARD_OFFICERS[signatoryIndex] || BOARD_OFFICERS[0];

  // Second Party Details
  const [secondParty, setSecondParty] = useState<DocumentParty>({
    name: "Maher Aslan",
    idNumber: "SGN-VOL-029",
    birthDate: "1988-04-12",
    address: "Johanna Westerdijkstraat 14",
    city: "Rijswijk",
    phone: "0641173391",
    email: "mahernet88@gmail.com",
    roleOrTitle: "Vrijwilliger Media & Communicatie",
  });
  const [secondPartyPostcode, setSecondPartyPostcode] = useState<string>("2286JB");

  // Articles State (Editable)
  const [articles, setArticles] = useState<EditableArticle[]>(() =>
    OFFICIAL_VOLUNTEER_ARTICLES.map(a => ({
      number: a.number,
      titleNl: a.titleNl,
      titleAr: a.titleAr,
      paragraphsNl: [...a.paragraphsNl],
      paragraphsAr: [...a.paragraphsAr],
    }))
  );

  // Members & Search from DB
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false);

  // AI Assistant State
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [generatingAi, setGeneratingAi] = useState<boolean>(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  // Fetch real members & volunteers from DB
  useEffect(() => {
    setLoadingMembers(true);
    Promise.all([
      fetch("/api/members?limit=50").then(r => r.json()).catch(() => ({ members: [] })),
      fetch("/api/volunteer?limit=50").then(r => r.json()).catch(() => ({ volunteers: [] })),
      fetch("/api/board").then(r => r.json()).catch(() => []),
    ]).then(([mRes, vRes, bRes]) => {
      const list: MemberOption[] = [];

      if (vRes.volunteers && Array.isArray(vRes.volunteers)) {
        vRes.volunteers.forEach((v: any) => {
          list.push({
            id: v.id,
            name: v.name || v.fullName || "متطوع",
            email: v.email || "",
            phone: v.phone || "",
            address: v.address || "",
            city: v.city || "Den Haag",
            birthDate: v.birthDate || "",
            idNumber: v.id ? `VOL-${v.id.slice(0, 6).toUpperCase()}` : "",
            role: "متطوع / Vrijwilliger",
            department: v.department || "media",
          });
        });
      }

      if (mRes.members && Array.isArray(mRes.members)) {
        mRes.members.forEach((m: any) => {
          list.push({
            id: m.id,
            name: m.name || m.fullName || "عضو",
            email: m.email || "",
            phone: m.phone || "",
            address: m.address || "",
            city: m.city || "Den Haag",
            birthDate: m.birthDate || "",
            idNumber: m.membershipNumber || (m.id ? `MEM-${m.id.slice(0, 6).toUpperCase()}` : ""),
            role: "عضو منتسب / Lid",
          });
        });
      }

      if (Array.isArray(bRes)) {
        bRes.forEach((b: any) => {
          list.push({
            id: b.id,
            name: b.name || "",
            role: b.titleAr || "مجلس إدارة",
            city: "Den Haag",
          });
        });
      }

      // Add Maher Aslan default if not already there
      if (!list.some(x => x.name.includes("Maher") || x.name.includes("ماهر"))) {
        list.unshift({
          id: "maher-sample",
          name: "Maher Aslan (ماهر أصلان)",
          email: "mahernet88@gmail.com",
          phone: "0641173391",
          address: "Johanna Westerdijkstraat 14",
          city: "Rijswijk",
          postcode: "2286JB",
          birthDate: "1988-04-12",
          idNumber: "SGN-VOL-029",
          role: "Vrijwilliger Media & Communicatie",
          department: "media",
        });
      }

      setMemberOptions(list);
      setLoadingMembers(false);
    });
  }, []);

  // Filter members by query
  const filteredMembers = searchQuery.trim() === ""
    ? memberOptions.slice(0, 10)
    : memberOptions.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.phone && m.phone.includes(searchQuery))
      );

  // Select Member
  const handleSelectMember = (m: MemberOption) => {
    setSecondParty({
      name: m.name.replace(/\(.*\)/, "").trim(),
      email: m.email || "",
      phone: m.phone || "",
      address: m.address || "",
      city: m.city || "Den Haag",
      birthDate: m.birthDate || "",
      idNumber: m.idNumber || `SGN-${Math.floor(100 + Math.random() * 900)}`,
      roleOrTitle: m.role || "Vrijwilliger",
    });
    if (m.postcode) setSecondPartyPostcode(m.postcode);
    if (m.department) setDepartment(m.department);
    setSearchQuery(m.name);
    setShowDropdown(false);
  };

  // Quick load Maher Aslan
  const handleLoadMaherAslan = () => {
    setSecondParty({
      name: "Maher Aslan",
      idNumber: "SGN-VOL-029",
      birthDate: "1988-04-12",
      address: "Johanna Westerdijkstraat 14",
      city: "Rijswijk",
      phone: "0641173391",
      email: "mahernet88@gmail.com",
      roleOrTitle: "Vrijwilliger Media & Communicatie",
    });
    setSecondPartyPostcode("2286JB");
    setDepartment("media");
    setHoursPerWeek("10-12");
    setLang("nl");
    setCity("Den Haag");
  };

  // Call AI Document API
  const handleGenerateAi = async (customInstruction?: string) => {
    const instruction = customInstruction || aiPrompt;
    if (!instruction.trim()) return;

    setGeneratingAi(true);
    setAiMessage(null);

    try {
      const res = await fetch("/api/documents/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          userPrompt: instruction,
          language: lang,
          secondPartyName: secondParty.name,
          department,
          hoursPerWeek,
        }),
      });

      const data = await res.json();

      if (data.articles && Array.isArray(data.articles) && data.articles.length > 0) {
        setArticles(data.articles);
        setAiMessage(isAr ? "تم تحديث بنود العقد وتخصيصها بالذكاء الاصطناعي بنجاح ✓" : "Contractartikelen succesvol gegenereerd en bijgewerkt via AI ✓");
      } else if (data.content) {
        // Append as a new article
        const newArtNum = articles.length + 1;
        setArticles(prev => [
          ...prev,
          {
            number: newArtNum,
            titleNl: `Artikel ${newArtNum} - Bijzondere Bepalingen`,
            titleAr: `المادة ${newArtNum} - أحكام وشروط خاصة`,
            paragraphsNl: [data.content],
            paragraphsAr: [data.content],
          }
        ]);
        setAiMessage(isAr ? "تمت إضافة المادة التخصصية إلى العقد بنجاح ✓" : "Extra bepaling succesvol toegevoegd aan het contract ✓");
      }
    } catch (err) {
      setAiMessage(isAr ? "تعذر الاتصال بالذكاء الاصطناعي، يرجى المحاولة ثانية." : "AI fout, probeer opnieuw.");
    } finally {
      setGeneratingAi(false);
    }
  };

  // Reset Articles to original standard
  const handleResetArticles = () => {
    setArticles(
      OFFICIAL_VOLUNTEER_ARTICLES.map(a => ({
        number: a.number,
        titleNl: a.titleNl,
        titleAr: a.titleAr,
        paragraphsNl: [...a.paragraphsNl],
        paragraphsAr: [...a.paragraphsAr],
      }))
    );
  };

  // Dedicated Print Function (Zero-Interference Print Window)
  const handleDedicatedPrint = () => {
    const printArea = document.getElementById("sgn-contract-print-content");
    if (!printArea) return;

    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      // Fallback to normal window.print()
      window.print();
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="${lang === "ar" ? "ar" : "nl"}" dir="${lang === "ar" ? "rtl" : "ltr"}">
<head>
  <meta charset="utf-8">
  <title>SGN Contract - ${refNumber} - ${secondParty.name}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 18mm 15mm 18mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #111827;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 10pt;
      line-height: 1.55;
    }
    .page-break {
      page-break-before: always;
      break-before: page;
      margin-top: 10mm;
    }
    .header-logo {
      width: 65px;
      height: 65px;
      object-fit: contain;
      margin-bottom: 6px;
    }
    .org-title {
      font-size: 13.5pt;
      font-weight: 800;
      color: #1a5632;
      letter-spacing: 0.3px;
    }
    .org-kvk {
      font-size: 8.5pt;
      color: #6b7280;
      font-family: monospace;
      margin-top: 2px;
    }
    .contract-title {
      font-size: 13pt;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 14px;
      margin-bottom: 6px;
    }
    .meta-bar {
      display: flex;
      justify-content: center;
      gap: 25px;
      font-size: 8.5pt;
      color: #4b5563;
      margin-bottom: 14px;
    }
    .parties-box {
      border: 1px solid #d1d5db;
      background-color: #f9fafb;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 14px;
      display: flex;
      gap: 20px;
    }
    .party-col {
      flex: 1;
      font-size: 8.8pt;
    }
    .party-heading {
      font-size: 9.5pt;
      font-weight: 700;
      color: #1a5632;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .party-field {
      margin-bottom: 3px;
      color: #374151;
    }
    .party-field strong {
      color: #111827;
    }
    .preamble {
      font-size: 8pt;
      color: #6b7280;
      background: #f3f4f6;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 14px;
      line-height: 1.45;
    }
    .article {
      margin-bottom: 11px;
    }
    .article-title {
      font-size: 9.5pt;
      font-weight: 800;
      color: #1a5632;
      margin-bottom: 4px;
    }
    .article-p {
      font-size: 8.8pt;
      color: #1f2937;
      margin-bottom: 4px;
      line-height: 1.5;
    }
    .signatures-section {
      margin-top: 25px;
      border-top: 1px solid #e5e7eb;
      padding-top: 18px;
    }
    .attestation-text {
      font-size: 8.8pt;
      color: #374151;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .signatures-grid {
      display: flex;
      justify-content: space-between;
      gap: 40px;
      position: relative;
    }
    .sig-col {
      flex: 1;
      position: relative;
    }
    .sig-label {
      font-size: 9.5pt;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }
    .sig-sub {
      font-size: 8.5pt;
      color: #4b5563;
      margin-bottom: 40px;
    }
    .sig-line {
      border-bottom: 1.5px solid #111827;
      width: 180px;
      margin-bottom: 4px;
    }
    .sig-date {
      font-size: 8pt;
      color: #6b7280;
    }
    .seal-img {
      position: absolute;
      top: 10px;
      right: 20px;
      width: 80px;
      height: 80px;
      opacity: 0.82;
      pointer-events: none;
    }
    .footer-bar {
      margin-top: 25px;
      border-top: 1px solid #e5e7eb;
      padding-top: 6px;
      font-size: 7.5pt;
      color: #6b7280;
      text-align: center;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  ${printArea.innerHTML}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.close();
      }, 350);
    };
  </script>
</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Helper labels
  const isNl = lang === "nl";
  const isBi = lang === "bilingual";

  const orgHeaderTitle = isAr
    ? "منظمة الجالية السورية في هولندا"
    : "De Syrische Gemeenschap in Nederland";

  const contractDocTitle = isNl
    ? "VRIJWILLIGERSOVEREENKOMST"
    : isAr
    ? "اتفاقية عمل تطوعي رسمية"
    : "VRIJWILLIGERSOVEREENKOMST / اتفاقية تطوع";

  const selectedDeptObj = VOLUNTEER_DEPARTMENTS.find(d => d.id === department);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">

      {/* ── TOP ACTION BAR (Header) ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              {isAr ? "منشئ ومحرر العقود والوثائق الرسمية" : "Officiële Documenten- en Contractengenerator"}
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <span>{orgHeaderTitle}</span>
              <span>•</span>
              <span className="font-mono text-emerald-700">KvK: {SGN_ORGANIZATION_INFO.kvkNumber}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Load Maher Aslan */}
          <button
            onClick={handleLoadMaherAslan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
            title="تحميل وتعبئة النموذج المعتمد لماهر أصلان"
          >
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAr ? "نموذج ماهر أصلان المعتمد" : "Model Maher Aslan"}</span>
          </button>

          {/* Language Toggle */}
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-bold">
            <button
              onClick={() => setLang("nl")}
              className={`px-2.5 py-1 rounded-md transition ${lang === "nl" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              Nederlands
            </button>
            <button
              onClick={() => setLang("ar")}
              className={`px-2.5 py-1 rounded-md transition ${lang === "ar" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              عربي
            </button>
            <button
              onClick={() => setLang("bilingual")}
              className={`px-2.5 py-1 rounded-md transition ${lang === "bilingual" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              ثنائي / Bi
            </button>
          </div>

          {/* Dedicated Print Button */}
          <button
            onClick={handleDedicatedPrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition transform active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? "طباعة وتصدير PDF فوري" : "Afdrukken / Exporteer PDF"}</span>
          </button>
        </div>
      </div>

      {/* ── MAIN WORKSPACE (Split Screen) ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* ── LEFT PANEL: Controls & Customization ── */}
        <div className="w-full lg:w-[480px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0 h-[calc(100vh-65px)]">

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50/70 p-1">
            <button
              onClick={() => setActiveTab("parties")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition ${activeTab === "parties" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{isAr ? "البيانات والطرفين" : "Partijen & Info"}</span>
            </button>
            <button
              onClick={() => setActiveTab("articles")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition ${activeTab === "articles" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isAr ? "بنود العقد (٩)" : "Artikelen (9)"}</span>
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition ${activeTab === "ai" ? "bg-amber-500 text-white shadow-xs" : "text-amber-700 hover:bg-amber-50"}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? "تخصيص بالذكاء الاصطناعي" : "AI Assistent"}</span>
            </button>
          </div>

          {/* Tab Contents (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* TAB 1: PARTIES & BASIC INFO */}
            {activeTab === "parties" && (
              <>
                {/* SMART SEARCH FOR MEMBER / VOLUNTEER */}
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Search className="w-4 h-4 text-emerald-700" />
                      <span>{isAr ? "ربط فوري مع المشتركين والمنتسبين" : "Koppel met Leden & Vrijwilligers"}</span>
                    </label>
                    {loadingMembers && <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />}
                  </div>

                  <p className="text-[11px] text-emerald-800/80 mb-2.5">
                    {isAr
                      ? "ابحث بالاسم أو البريد، وسيتم ملء كافة تفاصيل الطرف الثاني تلقائياً."
                      : "Typ een naam of e-mail om de gegevens van de tweede partij direct in te laden."}
                  </p>

                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder={isAr ? "اكتب اسم المشترك أو المتطوع..." : "Zoek op naam of e-mail..."}
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                    />

                    {showDropdown && filteredMembers.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto z-40">
                        {filteredMembers.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => handleSelectMember(m)}
                            className="px-3 py-2 hover:bg-emerald-50 cursor-pointer border-b border-slate-100 last:border-0 transition"
                          >
                            <div className="font-bold text-xs text-slate-900">{m.name}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2">
                              {m.role && <span className="bg-slate-100 px-1 rounded text-slate-700">{m.role}</span>}
                              {m.city && <span>{m.city}</span>}
                              {m.email && <span className="text-emerald-700">{m.email}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* SECOND PARTY FIELDS */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-200">
                    {isAr ? "بيانات الطرف الثاني (المتطوع)" : "Gegevens Tweede Partij (Vrijwilliger)"}
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                        {isAr ? "الاسم الكامل" : "Volledige Naam"}
                      </label>
                      <input
                        type="text"
                        value={secondParty.name}
                        onChange={(e) => setSecondParty({ ...secondParty, name: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                        {isAr ? "الرقم التعريفي / المرجعي" : "Referentienummer"}
                      </label>
                      <input
                        type="text"
                        value={secondParty.idNumber || ""}
                        onChange={(e) => setSecondParty({ ...secondParty, idNumber: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                        {isAr ? "تاريخ الميلاد" : "Geboortedatum"}
                      </label>
                      <input
                        type="date"
                        value={secondParty.birthDate || ""}
                        onChange={(e) => setSecondParty({ ...secondParty, birthDate: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                        {isAr ? "العنوان والشارع" : "Straat & Huisnummer"}
                      </label>
                      <input
                        type="text"
                        value={secondParty.address || ""}
                        onChange={(e) => setSecondParty({ ...secondParty, address: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                        {isAr ? "الرمز البريدي والمدينة" : "Postcode & Woonplaats"}
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={secondPartyPostcode}
                          onChange={(e) => setSecondPartyPostcode(e.target.value)}
                          placeholder="Postcode"
                          className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-xs uppercase"
                        />
                        <input
                          type="text"
                          value={secondParty.city || ""}
                          onChange={(e) => setSecondParty({ ...secondParty, city: e.target.value })}
                          placeholder="Plaats"
                          className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                        {isAr ? "البريد الإلكتروني" : "E-mailadres"}
                      </label>
                      <input
                        type="email"
                        value={secondParty.email || ""}
                        onChange={(e) => setSecondParty({ ...secondParty, email: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                        {isAr ? "رقم الهاتف" : "Telefoonnummer"}
                      </label>
                      <input
                        type="text"
                        value={secondParty.phone || ""}
                        onChange={(e) => setSecondParty({ ...secondParty, phone: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                        {isAr ? "القسم واللجنة" : "Afdeling"}
                      </label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white"
                      >
                        {VOLUNTEER_DEPARTMENTS.map((d) => (
                          <option key={d.id} value={d.id}>
                            {isAr ? d.labelAr : d.labelNl}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                        {isAr ? "متوسط الساعات أسبوعياً" : "Uren per week"}
                      </label>
                      <input
                        type="text"
                        value={hoursPerWeek}
                        onChange={(e) => setHoursPerWeek(e.target.value)}
                        placeholder="10-12"
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* DOCUMENT & SIGNATORY */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-200">
                    {isAr ? "بيانات الوثيقة والتوقيع" : "Document & Ondertekening"}
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                        {isAr ? "الرقم المرجعي" : "Referentienummer"}
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={refNumber}
                          onChange={(e) => setRefNumber(e.target.value)}
                          className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                        />
                        <button
                          onClick={() => setRefNumber(`SGN-DOC-2026-${Math.floor(1000 + Math.random() * 9000)}`)}
                          className="px-2 border rounded-lg text-slate-500 hover:text-emerald-700"
                          title="توليد رقم عشوائي"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                        {isAr ? "تاريخ الإصدار" : "Datum"}
                      </label>
                      <input
                        type="date"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                        {isAr ? "الممثل الموقّع عن الجالية" : "Ondertekenaar namens SGN"}
                      </label>
                      <select
                        value={signatoryIndex}
                        onChange={(e) => setSignatoryIndex(Number(e.target.value))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                      >
                        {BOARD_OFFICERS.map((o, idx) => (
                          <option key={idx} value={idx}>
                            {o.name} — {isAr ? o.titleAr : o.titleNl}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={includeSeal}
                        onChange={(e) => setIncludeSeal(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{isAr ? "تضمين الختم الرسمي للجالية" : "Officieel SGN Stempel"}</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={includeQr}
                        onChange={(e) => setIncludeQr(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{isAr ? "رمز التحقق الرقمي QR" : "QR Verificatie"}</span>
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: ARTICLES (EDITABLE) */}
            {activeTab === "articles" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {isAr ? "بنود العقد القانونية (قابلة للتعديل)" : "Artikelen van de Overeenkomst"}
                  </h3>
                  <button
                    onClick={handleResetArticles}
                    className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1 font-bold"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{isAr ? "استعادة النموذج الرسمي" : "Herstel standaard"}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {articles.map((art, aIdx) => (
                    <div key={art.number} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900">
                          {isNl ? art.titleNl : isAr ? art.titleAr : `${art.titleNl} / ${art.titleAr}`}
                        </span>
                        <button
                          onClick={() => setArticles(articles.filter((_, i) => i !== aIdx))}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="حذف هذا البند"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Paragraphs */}
                      {isNl && art.paragraphsNl.map((p, pIdx) => (
                        <textarea
                          key={pIdx}
                          value={p}
                          onChange={(e) => {
                            const updated = [...articles];
                            updated[aIdx].paragraphsNl[pIdx] = e.target.value;
                            setArticles(updated);
                          }}
                          rows={2}
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                        />
                      ))}

                      {isAr && !isBi && art.paragraphsAr.map((p, pIdx) => (
                        <textarea
                          key={pIdx}
                          dir="rtl"
                          value={p}
                          onChange={(e) => {
                            const updated = [...articles];
                            updated[aIdx].paragraphsAr[pIdx] = e.target.value;
                            setArticles(updated);
                          }}
                          rows={2}
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                        />
                      ))}

                      {isBi && (
                        <div className="space-y-1.5">
                          <textarea
                            value={art.paragraphsNl.join("\n")}
                            onChange={(e) => {
                              const updated = [...articles];
                              updated[aIdx].paragraphsNl = e.target.value.split("\n");
                              setArticles(updated);
                            }}
                            rows={2}
                            placeholder="Nederlandse tekst"
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                          />
                          <textarea
                            dir="rtl"
                            value={art.paragraphsAr.join("\n")}
                            onChange={(e) => {
                              const updated = [...articles];
                              updated[aIdx].paragraphsAr = e.target.value.split("\n");
                              setArticles(updated);
                            }}
                            rows={2}
                            placeholder="النص العربي"
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white text-slate-700"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add New Article */}
                  <button
                    onClick={() => {
                      const nextNum = articles.length + 1;
                      setArticles([
                        ...articles,
                        {
                          number: nextNum,
                          titleNl: `Artikel ${nextNum} - Aanvullende Bepaling`,
                          titleAr: `المادة ${nextNum} - شرط إضافي`,
                          paragraphsNl: ["1. Partijen komen het volgende overeen..."],
                          paragraphsAr: ["١. اتفق الطرفان على ما يلي..."],
                        }
                      ]);
                    }}
                    className="w-full py-2.5 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isAr ? "إضافة مادة قانونية جديدة للعقد" : "Voeg een nieuw artikel toe"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: AI ASSISTANT */}
            {activeTab === "ai" && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-1">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>{isAr ? "نماذج واقتراحات جاهزة بضغطة زر" : "AI Sjablonen & Suggesties"}</span>
                  </div>
                  <p className="text-[11px] text-amber-800/80 mb-3">
                    {isAr
                      ? "اختر نوع التخصص المطلوب ليقوم الذكاء الاصطناعي بصياغة وتضمين المواد القانونية الملائمة مباشرة في العقد:"
                      : "Kies een specialisatie om de AI automatisch passende bepalingen te laten formuleren:"}
                  </p>

                  <div className="grid grid-cols-1 gap-2">
                    {AI_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setDepartment(p.dept);
                          handleGenerateAi(isAr ? p.promptAr : p.promptNl);
                        }}
                        disabled={generatingAi}
                        className="text-left rtl:text-right px-3 py-2 bg-white hover:bg-amber-100/50 border border-amber-200 rounded-xl text-xs transition flex items-center justify-between group disabled:opacity-50"
                      >
                        <div>
                          <div className="font-bold text-amber-950 group-hover:text-emerald-800">
                            {isAr ? p.labelAr : p.labelNl}
                          </div>
                          <div className="text-[10px] text-slate-500 line-clamp-1">
                            {isAr ? p.promptAr : p.promptNl}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-600 rtl:rotate-180 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* CUSTOM PROMPT */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    {isAr ? "أو اكتب توجيهاً مخصصاً للذكاء الاصطناعي:" : "Of geef een aangepaste instructie:"}
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={4}
                    placeholder={
                      isAr
                        ? "مثال: أضف بنداً يعفي المتطوع من ساعات الدوام أثناء فترة الامتحانات الجامعية، ويلزمه بسرية حسابات التواصل..."
                        : "Bijv: Voeg een clausule toe over flexibele uren tijdens tentamenperiodes en geheimhouding van sociale media..."
                    }
                    className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                  />

                  <button
                    onClick={() => handleGenerateAi()}
                    disabled={generatingAi || !aiPrompt.trim()}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-50"
                  >
                    {generatingAi ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{isAr ? "جارٍ الصياغة القانونية بالذكاء الاصطناعي..." : "AI formuleert juridische tekst..."}</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        <span>{isAr ? "توليد وتطبيق على العقد فوراً" : "Genereer en voeg toe aan contract"}</span>
                      </>
                    )}
                  </button>

                  {aiMessage && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{aiMessage}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── RIGHT PANEL: Live Multi-Page A4 Contract Preview ── */}
        <div className="flex-1 bg-slate-200/70 p-6 lg:p-10 overflow-y-auto flex flex-col items-center">

          {/* Wrapper for the printable content */}
          <div id="sgn-contract-print-content" className="space-y-8 w-full max-w-[210mm]">

            {/* ══════════════════════════════════════════════════════ */}
            {/* PAGE 1: HEADER, PARTIES, PREAMBLE, ARTICLES 1 - 5    */}
            {/* ══════════════════════════════════════════════════════ */}
            <div
              className="bg-white shadow-xl mx-auto flex flex-col justify-between"
              style={{
                width: "210mm",
                minHeight: "297mm",
                padding: "16mm 20mm 14mm 20mm",
                boxSizing: "border-box",
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                position: "relative",
              }}
              dir={isAr && !isBi ? "rtl" : "ltr"}
            >
              <div>
                {/* ── CLEAN HEADER (Page 1 Only) ── */}
                <div className="text-center pb-4 mb-4 border-b-2 border-emerald-800">
                  <img
                    src="/logo.png"
                    alt="SGN Official Seal"
                    className="w-14 h-14 object-contain mx-auto mb-1.5 filter drop-shadow-xs"
                    onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                  />
                  <div className="text-base font-black text-emerald-900 tracking-wide">
                    {orgHeaderTitle}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    KvK-nummer: {SGN_ORGANIZATION_INFO.kvkNumber}
                  </div>
                </div>

                {/* ── TITLE & REFERENCE ── */}
                <div className="text-center mb-4">
                  <h2 className="text-sm font-black text-slate-900 tracking-wider">
                    {contractDocTitle}
                  </h2>
                  <div className="flex justify-center items-center gap-6 text-[10px] text-slate-600 mt-1 font-medium">
                    <span>{isNl ? "Referentie" : "الرقم المرجعي"}: <strong className="font-mono text-slate-900">{refNumber}</strong></span>
                    <span>{isNl ? "Datum" : "التاريخ"}: <strong className="text-slate-900">{issueDate}</strong></span>
                    <span>{isNl ? "Plaats" : "المكان"}: <strong className="text-slate-900">{city}</strong></span>
                  </div>
                </div>

                {/* ── PARTIES BOX (De Ondergetekenden) ── */}
                <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/80 mb-4 text-[10px] leading-relaxed">
                  <div className="text-[11px] font-bold text-emerald-900 mb-2 border-b border-slate-200 pb-1">
                    {isNl ? "De ondergetekenden (Partijen):" : "أطراف الاتفاقية:"}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Eerste Partij */}
                    <div>
                      <div className="font-bold text-slate-900 mb-0.5">
                        {isNl ? "1. De Organisatie (Eerste Partij):" : "١. المنظمة (الطرف الأول):"}
                      </div>
                      <div className="text-slate-800 font-bold">
                        {isNl ? SGN_ORGANIZATION_INFO.nameNl : SGN_ORGANIZATION_INFO.nameAr}
                      </div>
                      <div className="text-slate-600 text-[9.5px]">
                        <div>{SGN_ORGANIZATION_INFO.street}, {SGN_ORGANIZATION_INFO.postcodeCity}</div>
                        <div>KvK: {SGN_ORGANIZATION_INFO.kvkNumber}</div>
                        <div>{isNl ? "Vertegenwoordigd door" : "يمثلها"}: <strong>{signatory.name}</strong> ({isNl ? signatory.titleNl : signatory.titleAr})</div>
                      </div>
                    </div>

                    {/* Tweede Partij */}
                    <div dir={isAr && !isBi ? "rtl" : "ltr"}>
                      <div className="font-bold text-slate-900 mb-0.5">
                        {isNl ? "2. De Vrijwilliger (Tweede Partij):" : "٢. المتطوع (الطرف الثاني):"}
                      </div>
                      <div className="text-slate-800 font-bold">
                        {secondParty.name}
                      </div>
                      <div className="text-slate-600 text-[9.5px]">
                        <div>{secondParty.address}, {secondPartyPostcode} {secondParty.city}</div>
                        <div>{isNl ? "Geboortedatum" : "تاريخ الميلاد"}: {secondParty.birthDate || "-"} | Ref: {secondParty.idNumber || "-"}</div>
                        <div>E-mail: {secondParty.email || "-"} | Tel: {secondParty.phone || "-"}</div>
                        <div>{isNl ? "Afdeling" : "القسم"}: <strong>{isAr ? selectedDeptObj?.labelAr : selectedDeptObj?.labelNl}</strong> ({hoursPerWeek} {isNl ? "uur/week" : "ساعة/أسبوع"})</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── PREAMBLE (Considerans) ── */}
                <div className="text-[9px] text-slate-600 bg-slate-100 rounded-md p-2 mb-3 leading-relaxed">
                  <strong>{isNl ? "In aanmerking nemende dat:" : "الديباجة والأساس القانوني:"}</strong>{" "}
                  {isNl
                    ? "Partijen deze vrijwilligersovereenkomst aangaan conform de toepasselijke Nederlandse wetgeving (waaronder de fiscale vrijwilligersregeling van de Belastingdienst en de AVG). Deze overeenkomst creëert uitdrukkelijk geen arbeidsovereenkomst in de zin van art. 7:610 Burgerlijk Wetboek."
                    : "أبرم الطرفان هذه الاتفاقية التطوعية وفقاً لأحكام القانون المدني الهولندي ولوائح مصلحة الضرائب وقانون حماية الخصوصية (AVG)، ولا تشكل هذه الاتفاقية بأي حال عقد عمل ملزم وفق المادة 7:610 من القانون المدني الهولندي."}
                </div>

                {/* ── ARTICLES 1 TO 5 ── */}
                <div className="space-y-2.5">
                  {articles.slice(0, 5).map((art) => (
                    <div key={art.number} className="text-[10px] leading-relaxed">
                      <div className="font-bold text-emerald-900 mb-0.5">
                        {isNl ? art.titleNl : isAr ? art.titleAr : `${art.titleNl} — ${art.titleAr}`}
                      </div>

                      {isNl && art.paragraphsNl.map((p, idx) => (
                        <p key={idx} className="text-slate-700 mb-0.5">{p}</p>
                      ))}

                      {isAr && !isBi && art.paragraphsAr.map((p, idx) => (
                        <p key={idx} dir="rtl" className="text-slate-700 mb-0.5">{p}</p>
                      ))}

                      {isBi && (
                        <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                          <div>{art.paragraphsNl.map((p, i) => <p key={i} className="text-slate-700 mb-0.5">{p}</p>)}</div>
                          <div dir="rtl" className="border-r border-slate-200 pr-2">{art.paragraphsAr.map((p, i) => <p key={i} className="text-slate-600 mb-0.5">{p}</p>)}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── FOOTER (Page 1) ── */}
              <div className="pt-3 border-t border-slate-200 text-center text-[8.5px] text-slate-500 flex justify-between items-center font-sans">
                <span>{SGN_ORGANIZATION_INFO.street}, {SGN_ORGANIZATION_INFO.postcodeCity} • Tel: {SGN_ORGANIZATION_INFO.phone}</span>
                <span>KvK: {SGN_ORGANIZATION_INFO.kvkNumber} • {SGN_ORGANIZATION_INFO.contactEmail} • {SGN_ORGANIZATION_INFO.website}</span>
                <span className="font-bold">{isNl ? "Pagina 1 van 2" : "الصفحة ١ من ٢"}</span>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════ */}
            {/* PAGE 2: ARTICLES 6 - 9, ATTESTATION, SIGNATURES & SEAL*/}
            {/* ══════════════════════════════════════════════════════ */}
            <div
              className="bg-white shadow-xl mx-auto flex flex-col justify-between page-break"
              style={{
                width: "210mm",
                minHeight: "297mm",
                padding: "16mm 20mm 14mm 20mm",
                boxSizing: "border-box",
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                position: "relative",
              }}
              dir={isAr && !isBi ? "rtl" : "ltr"}
            >
              <div>
                {/* ── MINIMAL TOP BAR (Page 2) ── */}
                <div className="flex justify-between items-center text-[9px] text-slate-400 pb-2 mb-4 border-b border-slate-200">
                  <span className="font-bold text-slate-700">{orgHeaderTitle}</span>
                  <span>Ref: {refNumber} — {secondParty.name}</span>
                </div>

                {/* ── REMAINING ARTICLES (6 TO END) ── */}
                <div className="space-y-3 mb-6">
                  {articles.slice(5).map((art) => (
                    <div key={art.number} className="text-[10px] leading-relaxed">
                      <div className="font-bold text-emerald-900 mb-0.5">
                        {isNl ? art.titleNl : isAr ? art.titleAr : `${art.titleNl} — ${art.titleAr}`}
                      </div>

                      {isNl && art.paragraphsNl.map((p, idx) => (
                        <p key={idx} className="text-slate-700 mb-0.5">{p}</p>
                      ))}

                      {isAr && !isBi && art.paragraphsAr.map((p, idx) => (
                        <p key={idx} dir="rtl" className="text-slate-700 mb-0.5">{p}</p>
                      ))}

                      {isBi && (
                        <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                          <div>{art.paragraphsNl.map((p, i) => <p key={i} className="text-slate-700 mb-0.5">{p}</p>)}</div>
                          <div dir="rtl" className="border-r border-slate-200 pr-2">{art.paragraphsAr.map((p, i) => <p key={i} className="text-slate-600 mb-0.5">{p}</p>)}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* ── CLOSING ATTESTATION ── */}
                <div className="text-[9.5px] text-slate-800 leading-relaxed mb-6 pt-3 border-t border-slate-200">
                  {isNl ? (
                    <p>
                      Aldus in tweevoud opgemaakt en ondertekend te <strong>{city}</strong> op <strong>{issueDate}</strong>. Beide partijen verklaren een getekend exemplaar van deze overeenkomst te hebben ontvangen en akkoord te gaan met de bepalingen.
                    </p>
                  ) : (
                    <p dir="rtl">
                      حُرر هذا العقد من نسختين أصليتين متطابقتين، ووُقّع في مدينة <strong>{city}</strong> بتاريخ <strong>{issueDate}</strong>. ويقر الطرفان باستلام نسخة موقعة وبموافقتهما التامة على كافة البنود الواردة أعلاه.
                    </p>
                  )}
                </div>

                {/* ── SIGNATURES & SEAL SECTION (Only at the end) ── */}
                <div className="relative pt-2">
                  <div className="grid grid-cols-2 gap-10">

                    {/* SGN Bestuur Signature */}
                    <div className="relative">
                      <div className="text-[11px] font-bold text-slate-900 mb-1">
                        {isNl ? "Namens het Bestuur van SGN:" : "عن مجلس إدارة الجالية (الطرف الأول):"}
                      </div>
                      <div className="text-[10px] text-slate-700 mb-10 leading-tight">
                        <strong>{signatory.name}</strong><br />
                        <span className="text-slate-500">{isNl ? signatory.titleNl : signatory.titleAr}</span>
                      </div>

                      <div className="border-b-2 border-slate-800 w-48 mb-1.5" />
                      <div className="text-[9px] text-slate-500">
                        {isNl ? "Handtekening & Stempel" : "التوقيع والختم الرسمي"}
                      </div>

                      {/* Official Circular Seal */}
                      {includeSeal && (
                        <div className="absolute top-2 right-4 w-20 h-20 opacity-85 pointer-events-none">
                          <img
                            src="/logo.png"
                            alt="SGN Official Seal"
                            className="w-full h-full object-contain filter drop-shadow-xs"
                            onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Volunteer Signature */}
                    <div dir={isAr && !isBi ? "rtl" : "ltr"}>
                      <div className="text-[11px] font-bold text-slate-900 mb-1">
                        {isNl ? "De Vrijwilliger (Tweede Partij):" : "المتطوع (الطرف الثاني):"}
                      </div>
                      <div className="text-[10px] text-slate-700 mb-10 leading-tight">
                        <strong>{secondParty.name}</strong><br />
                        <span className="text-slate-500">Ref: {secondParty.idNumber || "-"}</span>
                      </div>

                      <div className="border-b-2 border-slate-800 w-48 mb-1.5" />
                      <div className="text-[9px] text-slate-500">
                        {isNl ? "Handtekening vrijwilliger" : "توقيع المتطوع"}
                      </div>
                    </div>
                  </div>

                  {/* QR Code Verification */}
                  {includeQr && (
                    <div className="mt-8 flex items-center gap-3 pt-3 border-t border-slate-100">
                      <div className="w-12 h-12 border border-slate-300 rounded p-1 bg-white flex items-center justify-center flex-shrink-0">
                        <QrCode className="w-10 h-10 text-slate-800" />
                      </div>
                      <div className="text-[8.5px] text-slate-500 leading-tight">
                        <strong className="text-slate-700">{isNl ? "Digitale Verificatie" : "التحقق الرقمي الرسمي"}</strong><br />
                        KvK: {SGN_ORGANIZATION_INFO.kvkNumber} • Ref: {refNumber}<br />
                        {SGN_ORGANIZATION_INFO.website}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── FOOTER (Page 2) ── */}
              <div className="pt-3 border-t border-slate-200 text-center text-[8.5px] text-slate-500 flex justify-between items-center font-sans">
                <span>{SGN_ORGANIZATION_INFO.street}, {SGN_ORGANIZATION_INFO.postcodeCity} • Tel: {SGN_ORGANIZATION_INFO.phone}</span>
                <span>KvK: {SGN_ORGANIZATION_INFO.kvkNumber} • {SGN_ORGANIZATION_INFO.contactEmail} • {SGN_ORGANIZATION_INFO.website}</span>
                <span className="font-bold">{isNl ? "Pagina 2 van 2" : "الصفحة ٢ من ٢"}</span>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
