"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { 
  Printer, FileText, CheckCircle2, ShieldCheck, Download, Copy, RefreshCw, 
  User, Building2, HandHeart, Calendar, MapPin, Hash, Sparkles, AlertCircle,
  FileCheck, Stamp, QrCode, Globe2, ChevronDown, Check, Wand2, Loader2,
  PlusCircle, Trash2, Edit3
} from "lucide-react";
import { 
  DOCUMENT_TEMPLATES, BOARD_OFFICERS, SGN_ORGANIZATION_INFO, 
  OFFICIAL_VOLUNTEER_ARTICLES, VOLUNTEER_DEPARTMENTS,
  DocumentFormData, DocumentParty 
} from "@/lib/documents/templates";
import { formatLocalizedDigits } from "@/lib/language-guard";

interface ArticleItem {
  number: number;
  title: string;
  paragraphs: string[];
}

export default function DocumentsGeneratorPage() {
  const locale = useLocale() as "ar" | "nl" | "en";
  const isAr = locale === "ar";
  const isNl = locale === "nl";

  // Data fetching states
  const [members, setMembers] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("volunteer_agreement");
  const [refNumber, setRefNumber] = useState<string>(`SGN-DOC-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [city, setCity] = useState<string>("Den Haag");
  const [languageMode, setLanguageMode] = useState<"ar" | "nl" | "bilingual">("nl");
  const [includeSeal, setIncludeSeal] = useState<boolean>(true);
  const [includeQr, setIncludeQr] = useState<boolean>(true);

  // AI Generation State
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [generatingAi, setGeneratingAi] = useState<boolean>(false);
  const [aiDocData, setAiDocData] = useState<any | null>(null);

  // Dates
  const today = new Date().toISOString().split("T")[0];
  const [issueDateGregorian, setIssueDateGregorian] = useState<string>(today);

  // Signatory
  const [selectedSignatory, setSelectedSignatory] = useState(BOARD_OFFICERS[0]);

  // Volunteer Agreement Specifics (Conform Maher Aslan Official Standard Model)
  const [selectedDepartment, setSelectedDepartment] = useState<string>("media");
  const [hoursPerWeek, setHoursPerWeek] = useState<string>("10-12");
  const [secondPartyPostcode, setSecondPartyPostcode] = useState<string>("2286JB");

  // Second party details
  const [secondParty, setSecondParty] = useState<DocumentParty>({
    name: "Maher Aslan",
    idNumber: "SGN-VOL-029",
    birthDate: "1988-04-12",
    address: "Johanna Westerdijkstraat 14",
    city: "Rijswijk",
    email: "mahernet88@gmail.com",
    phone: "0641173391",
    roleOrTitle: "Vrijwilliger Media & Communicatie",
  });

  // Custom Content
  const [customSubject, setCustomSubject] = useState<string>("");
  const [customNotes, setCustomNotes] = useState<string>("");

  // Custom Editable Articles
  const [customArticles, setCustomArticles] = useState<ArticleItem[]>([]);

  // Fetch live database members, volunteers and board
  useEffect(() => {
    setLoadingData(true);
    Promise.all([
      fetch("/api/members?limit=30").then((r) => r.json()).catch(() => ({ members: [] })),
      fetch("/api/volunteer?limit=30").then((r) => r.json()).catch(() => ({ volunteers: [] })),
      fetch("/api/board").then((r) => r.json()).catch(() => []),
    ]).then(([mRes, vRes, bRes]) => {
      if (mRes.members) setMembers(mRes.members);
      if (vRes.volunteers) setVolunteers(vRes.volunteers);
      if (Array.isArray(bRes) && bRes.length > 0) setBoardMembers(bRes);
      setLoadingData(false);
    });
  }, []);

  const currentTemplate = DOCUMENT_TEMPLATES.find((t) => t.id === selectedTemplateId) || DOCUMENT_TEMPLATES[0];

  // Auto-generate reference
  const generateNewRef = () => {
    const code = Math.floor(1000 + Math.random() * 9000);
    setRefNumber(`SGN-DOC-2026-${code}`);
  };

  // Populate from existing member
  const handleSelectMember = (memberId: string) => {
    const m = members.find((x) => x.id === memberId);
    if (!m) return;
    setSecondParty({
      name: isAr ? m.nameAr || m.nameNl : m.nameNl || m.nameAr,
      idNumber: m.memberNumber ? `MEM-${m.memberNumber}` : `MEM-${m.id.substring(0, 8)}`,
      birthDate: m.birthYear ? `سنة ${m.birthYear}` : "",
      address: m.nlProvincie || "Nederland",
      city: m.nlCity || "Nederland",
      email: m.email || "",
      phone: m.whatsapp || "",
      roleOrTitle: m.profession || (isAr ? "عضو منتسب للجالية" : "Lid van de Gemeenschap"),
    });
  };

  // Populate from volunteer
  const handleSelectVolunteer = (volunteerId: string) => {
    const v = volunteers.find((x) => x.id === volunteerId);
    if (!v) return;
    setSecondParty({
      name: v.name,
      idNumber: `VOL-${v.id ? v.id.substring(0, 8) : "SGN"}`,
      birthDate: "",
      address: v.city || "Nederland",
      city: v.city || "Nederland",
      email: v.email || "",
      phone: v.phone || "",
      roleOrTitle: v.skills || (isAr ? "متطوع رسمي" : "Vrijwilliger"),
    });
  };

  // Load Maher Aslan sample
  const handleLoadMaherAslanSample = () => {
    setAiDocData(null);
    setSelectedTemplateId("volunteer_agreement");
    setLanguageMode("nl");
    setSecondParty({
      name: "Maher Aslan",
      idNumber: "SGN-VOL-029",
      birthDate: "1988-04-12",
      address: "Johanna Westerdijkstraat 14",
      city: "Rijswijk",
      email: "mahernet88@gmail.com",
      phone: "0641173391",
      roleOrTitle: "Vrijwilliger Media & Communicatie",
    });
    setSecondPartyPostcode("2286JB");
    setSelectedDepartment("media");
    setHoursPerWeek("10-12");
    setIssueDateGregorian("2026-11-02");
    setRefNumber("SGN-VOL-2026-0211");
    setCity("Den Haag");
  };

  // Generate document via AI
  const handleGenerateWithAi = async () => {
    try {
      setGeneratingAi(true);
      const res = await fetch("/api/documents/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: selectedTemplateId,
          userPrompt: aiPrompt,
          language: languageMode,
          secondPartyName: secondParty.name,
          secondPartyRole: secondParty.roleOrTitle,
          secondPartyAddress: secondParty.address,
          secondPartyCity: secondParty.city,
          secondPartyPostcode: secondPartyPostcode,
          secondPartyEmail: secondParty.email,
          secondPartyPhone: secondParty.phone,
          department: VOLUNTEER_DEPARTMENTS.find((d) => d.id === selectedDepartment)?.labelNl || "Media & Communicatie",
          hoursPerWeek,
          signatoryName: selectedSignatory.name,
        }),
      });

      const data = await res.json();
      if (data.success && data.document) {
        setAiDocData(data.document);
        if (data.document.articles) {
          setCustomArticles(data.document.articles);
        }
      }
    } catch (err) {
      console.error("AI Generation error:", err);
    } finally {
      setGeneratingAi(false);
    }
  };

  // Print Action
  const handlePrint = () => {
    window.print();
  };

  // Copy Content Action
  const handleCopy = () => {
    const docElement = document.getElementById("printable-official-document");
    if (docElement) {
      navigator.clipboard.writeText(docElement.innerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Determine header title based on language mode - EXACT USER SPECIFICATION
  const orgTitle = languageMode === "ar"
    ? "منظمة الجالية السورية في هولندا"
    : "De Syrische Gemeenschap in Nederland";

  const orgSubtitle = languageMode === "ar"
    ? "Stichting De Syrische Gemeenschap in Nederland"
    : "منظمة الجالية السورية في هولندا";

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner - Hidden on Print */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-l from-slate-900 via-slate-800 to-emerald-950 text-white p-6 md:p-8 rounded-3xl shadow-xl border border-emerald-500/20">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>نظام التوثيق والورقيات والعقود الرسمية | SGN Documents Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <span>مولّد العقود والورقيات الرسمية بالذكاء الاصطناعي</span>
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              KvK: {SGN_ORGANIZATION_INFO.kvkNumber}
            </span>
          </h1>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
            صياغة وتوليد وطباعة العقود والاتفاقيات الرسمية لمنظمة الجالية السورية في هولندا، متوافقة بدقة مع القانون المدني الهولندي (Burgerlijk Wetboek) وتشريعات مصلحة الضرائب ولائحة حماية البيانات AVG.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleCopy}
            className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-white/10"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "تم النسخ" : "نسخ النص"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-950/40 hover:shadow-emerald-900/60 transition-all transform hover:-translate-y-0.5"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة فورية / تصدير PDF</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Control Panel (Left) & Live Multi-Page Canvas (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Controls Column (Hidden on Print) */}
        <div className="lg:col-span-5 space-y-6 print:hidden">
          
          {/* 1. AI Legal Drafter Box */}
          <div className="bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900 rounded-3xl p-6 border border-emerald-500/30 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-emerald-400" />
                <span>توليد وتخصيص العقد بالذكاء الاصطناعي ✨</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold">
                AI Engine Active
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              اكتب مواصفات أو شروط أي عقد أو وثيقة خاصة ترغب في توليدها (مثال: اتفاقية شراكة، عقد تطوع لمترجم، اتفاقية تدريب، قرار إداري)، وسيقوم الذكاء الاصطناعي بصياغة بنودها القانونية فوراً:
            </p>

            <textarea
              rows={3}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="اكتب التعليمات أو الشروط الإضافية هنا... (مثال: أضف بنداً لتغطية نفقات السفر بقيمة 150 يورو شهرياً، وتأمين مسؤولية مدنية، والالتزام بتقديم 8 ساعات أسبوعياً)"
              className="w-full text-xs p-3 rounded-2xl border border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleGenerateWithAi}
                disabled={generatingAi}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                {generatingAi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>جاري التوليد بالذكاء الاصطناعي...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>توليد العقد بالذكاء الاصطناعي الآن</span>
                  </>
                )}
              </button>

              {aiDocData && (
                <button
                  type="button"
                  onClick={() => setAiDocData(null)}
                  className="px-3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  إعادة تعيين
                </button>
              )}
            </div>
          </div>

          {/* 2. Language & Pre-built Templates */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>لغة الوثيقة ونوع النموذج المعتمد</span>
              </span>
            </h3>

            {/* Language Selector */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setLanguageMode("nl")}
                className={`py-2 px-2 rounded-xl transition-all ${languageMode === "nl" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400"}`}
              >
                هولندي (Nederlands)
              </button>
              <button
                type="button"
                onClick={() => setLanguageMode("ar")}
                className={`py-2 px-2 rounded-xl transition-all ${languageMode === "ar" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400"}`}
              >
                عربي (منظمة الجالية)
              </button>
              <button
                type="button"
                onClick={() => setLanguageMode("bilingual")}
                className={`py-2 px-2 rounded-xl transition-all ${languageMode === "bilingual" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400"}`}
              >
                ثنائي اللغة (Bilingual)
              </button>
            </div>

            {/* Quick Template Selector */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {DOCUMENT_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => {
                    setSelectedTemplateId(tmpl.id);
                    setAiDocData(null);
                  }}
                  className={`w-full text-right p-3 rounded-2xl border text-xs transition-all flex flex-col gap-1 ${
                    selectedTemplateId === tmpl.id
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold">{tmpl.titleAr}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300">
                      {tmpl.badge}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    {tmpl.titleNl}
                  </span>
                </button>
              ))}
            </div>

            {/* Quick Template Button for Maher Aslan Standard */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleLoadMaherAslanSample}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>تحميل وتعبئة النموذج المعتمد (ماهر أصلان - Maher Aslan)</span>
              </button>
            </div>
          </div>

          {/* 3. Document Parties & Information */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              <span>بيانات الطرف الثاني والموقّع الرسمي</span>
            </h3>

            {/* Database Quick Picker */}
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <select
                onChange={(e) => handleSelectMember(e.target.value)}
                className="w-full text-[11px] p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="">-- تعبئة من الأعضاء --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nameAr || m.nameNl}
                  </option>
                ))}
              </select>

              <select
                onChange={(e) => handleSelectVolunteer(e.target.value)}
                className="w-full text-[11px] p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="">-- تعبئة من المتطوعين --</option>
                {volunteers.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  اسم الطرف الثاني / المتطوع / المتعاقد
                </label>
                <input
                  type="text"
                  value={secondParty.name}
                  onChange={(e) => setSecondParty({ ...secondParty, name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    الرمز البريدي (Postcode)
                  </label>
                  <input
                    type="text"
                    value={secondPartyPostcode}
                    onChange={(e) => setSecondPartyPostcode(e.target.value)}
                    placeholder="2286JB"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    المدينة (Woonplaats)
                  </label>
                  <input
                    type="text"
                    value={secondParty.city || ""}
                    onChange={(e) => setSecondParty({ ...secondParty, city: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    العنوان الكامل (Adres)
                  </label>
                  <input
                    type="text"
                    value={secondParty.address || ""}
                    onChange={(e) => setSecondParty({ ...secondParty, address: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="text"
                    value={secondParty.email || ""}
                    onChange={(e) => setSecondParty({ ...secondParty, email: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    رقم الهاتف
                  </label>
                  <input
                    type="text"
                    value={secondParty.phone || ""}
                    onChange={(e) => setSecondParty({ ...secondParty, phone: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Volunteer Dept & Hours */}
              {selectedTemplateId === "volunteer_agreement" && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                    القسم / الفريق التطوعي (Afdeling / Team)
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {VOLUNTEER_DEPARTMENTS.map((dept) => (
                      <label key={dept.id} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
                        <input
                          type="radio"
                          name="volunteer-dept"
                          checked={selectedDepartment === dept.id}
                          onChange={() => setSelectedDepartment(dept.id)}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{dept.labelNl} ({dept.labelAr})</span>
                      </label>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        ساعات التطوع أسبوعياً
                      </label>
                      <input
                        type="text"
                        value={hoursPerWeek}
                        onChange={(e) => setHoursPerWeek(e.target.value)}
                        placeholder="10-12"
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        تاريخ البدء (Startdatum)
                      </label>
                      <input
                        type="date"
                        value={issueDateGregorian}
                        onChange={(e) => setIssueDateGregorian(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Signatory Officer */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  الموقّع المعتمد من مجلس الإدارة (الـ 24 عضواً)
                </label>
                <select
                  value={selectedSignatory.name}
                  onChange={(e) => {
                    const found = BOARD_OFFICERS.find((b) => b.name === e.target.value) || BOARD_OFFICERS[0];
                    setSelectedSignatory(found);
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold"
                >
                  {BOARD_OFFICERS.map((bo) => (
                    <option key={bo.name} value={bo.name}>
                      {bo.name} — {bo.titleAr} ({bo.titleNl})
                    </option>
                  ))}
                </select>
              </div>

              {/* Checkboxes */}
              <div className="pt-2 flex flex-wrap gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSeal}
                    onChange={(e) => setIncludeSeal(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>إظهار الختم الرقمي الرسمي للجالية</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeQr}
                    onChange={(e) => setIncludeQr(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>إظهار كود التحقق الرقمي QR</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Document Rendering Canvas (A4 Sheet Presentation) */}
        <div className="lg:col-span-7">
          <div className="bg-slate-200/60 dark:bg-slate-950 p-2 sm:p-4 rounded-3xl border border-slate-300 dark:border-slate-800 shadow-inner flex justify-center">
            
            {/* The Print-Ready Document Container - Supports Natural Multi-page Flow */}
            <div
              id="printable-official-document"
              className="bg-white text-slate-900 w-full max-w-[210mm] p-8 sm:p-12 shadow-2xl relative flex flex-col justify-between font-sans leading-relaxed print:m-0 print:p-8 print:shadow-none print:w-full print:max-w-none print:min-h-0 print:text-black"
              style={{ minHeight: "297mm" }}
            >
              
              {/* PAGE 1: TOP HEADER (Appears Only at the Beginning) */}
              <div>
                {/* Official Clean SGN Letterhead: Logo + Organization Title + Address - NO FLAGS */}
                <div className="flex items-center gap-4 border-b-2 border-slate-800 pb-3 mb-3">
                  {/* Official Circular SGN Seal / Logo on Top-Left */}
                  <div className="w-16 h-16 shrink-0 relative flex items-center justify-center">
                    <img
                      src="/logo.png"
                      alt="SGN Official Seal"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>

                  {/* Header Title: Dynamic based on language */}
                  <div className="flex-1 text-right">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">
                      {orgTitle}
                    </h2>
                    <h3 className="text-xs font-bold text-slate-700 tracking-wide font-sans">
                      {orgSubtitle}
                    </h3>
                  </div>
                </div>

                {/* Sub-header Address & Official Coordinates Line */}
                <div className="text-[9px] text-slate-600 border-b border-slate-300 pb-2 mb-4 text-center space-y-0.5 font-sans">
                  <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
                    <span>📍 Laan van Meerdervoort 53-D, 2517 AE Den Haag, Nederland</span>
                    <span>|</span>
                    <span>📞 +31 6 24795887</span>
                    <span>|</span>
                    <span>✉ info@sy-nl.org</span>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-[8.5px] font-semibold text-slate-700">
                    <span>🌐 www.sy-nl.org</span>
                    <span>|</span>
                    <span>KvK: 96718943</span>
                    <span>|</span>
                    <span className="font-mono text-[8px] text-slate-500">Ref: {refNumber}</span>
                  </div>
                </div>

                {/* Main Content: Render AI Generated Document OR Pre-built Document */}
                {aiDocData ? (
                  /* ================= AI GENERATED DOCUMENT ================= */
                  <div className="space-y-4 text-slate-900 font-sans">
                    {/* Dark Title Banner */}
                    <div className="bg-[#1e293b] text-white py-2 px-3 rounded-xs text-center shadow-xs">
                      <h2 className="text-sm font-black tracking-widest uppercase">
                        {aiDocData.title}
                      </h2>
                      {aiDocData.subtitle && (
                        <p className="text-[10px] text-slate-300 font-medium">
                          {aiDocData.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Preamble */}
                    {aiDocData.preamble && (
                      <p className="text-[10.5px] leading-relaxed text-slate-700 text-justify">
                        {aiDocData.preamble}
                      </p>
                    )}

                    {/* Two Side-by-Side Metadata Boxes */}
                    <div className="grid grid-cols-2 gap-3 text-[9.5px]">
                      {/* Organization Box */}
                      <div className="border border-slate-300 rounded p-2.5 bg-slate-50/40 space-y-0.5">
                        <h4 className="font-bold text-slate-900 text-[10px] border-b border-slate-200 pb-0.5 mb-1">
                          {languageMode === "ar" ? "بيانات المنظمة" : "Gegevens van de organisatie"}
                        </h4>
                        <p><strong className="text-slate-800">Naam:</strong> {aiDocData.organization?.name || orgTitle}</p>
                        <p><strong className="text-slate-800">Adres:</strong> {aiDocData.organization?.address || SGN_ORGANIZATION_INFO.address}</p>
                        <p><strong className="text-slate-800">KvK:</strong> {aiDocData.organization?.kvk || SGN_ORGANIZATION_INFO.kvkNumber}</p>
                        <p><strong className="text-slate-800">E-mail:</strong> {aiDocData.organization?.email || SGN_ORGANIZATION_INFO.contactEmail}</p>
                        <p><strong className="text-slate-800">Vertegenwoordigd door:</strong> {aiDocData.organization?.representative || selectedSignatory.name} ({aiDocData.organization?.representativeTitle || selectedSignatory.titleNl})</p>
                      </div>

                      {/* Second Party Box */}
                      <div className="border border-slate-300 rounded p-2.5 bg-slate-50/40 space-y-0.5">
                        <h4 className="font-bold text-slate-900 text-[10px] border-b border-slate-200 pb-0.5 mb-1">
                          {languageMode === "ar" ? "بيانات الطرف المتعاقد" : "Gegevens van de wederpartij"}
                        </h4>
                        <p><strong className="text-slate-800">Naam:</strong> {aiDocData.secondParty?.name || secondParty.name}</p>
                        <p><strong className="text-slate-800">Adres:</strong> {aiDocData.secondParty?.address || secondParty.address}</p>
                        <p><strong className="text-slate-800">Woonplaats:</strong> {aiDocData.secondParty?.postcode || secondPartyPostcode} {aiDocData.secondParty?.city || secondParty.city}</p>
                        <p><strong className="text-slate-800">E-mail:</strong> {aiDocData.secondParty?.email || secondParty.email}</p>
                        <p><strong className="text-slate-800">Telefoon:</strong> {aiDocData.secondParty?.phone || secondParty.phone}</p>
                      </div>
                    </div>

                    {/* Meta Fields (e.g. Afdeling / Hours) */}
                    {aiDocData.metaFields && aiDocData.metaFields.length > 0 && (
                      <div className="border border-slate-300 rounded p-2 bg-slate-50/30 text-[9.5px] flex items-center justify-between text-slate-700">
                        {aiDocData.metaFields.map((f: any, idx: number) => (
                          <span key={idx}><strong>{f.label}:</strong> {f.value}</span>
                        ))}
                      </div>
                    )}

                    {/* AI Generated Articles Flow */}
                    <div className="space-y-3 pt-2 text-[10px] leading-relaxed text-justify">
                      {(aiDocData.articles || []).map((art: any, i: number) => (
                        <div key={i} className="space-y-1">
                          <h4 className="font-bold text-slate-900 text-[10.5px] border-b border-slate-200 pb-0.5">
                            {art.title}
                          </h4>
                          {art.paragraphs?.map((p: string, pIdx: number) => (
                            <p key={pIdx} className="text-slate-700">{p}</p>
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Closing Statement */}
                    {aiDocData.closingStatement && (
                      <p className="text-[10px] font-bold text-slate-800 pt-2 border-t border-slate-200">
                        {aiDocData.closingStatement}
                      </p>
                    )}
                  </div>
                ) : selectedTemplateId === "volunteer_agreement" ? (
                  /* ================= VOLUNTEER AGREEMENT (MAHER ASLAN FORMAT) ================= */
                  <div className="space-y-3.5 text-slate-900 font-sans">
                    {/* Black Title Banner */}
                    <div className="bg-[#1e293b] text-white py-2 px-3 rounded-xs text-center shadow-xs">
                      <h2 className="text-sm font-black tracking-widest uppercase">
                        {languageMode === "ar" ? "اتفاقية عمل تطوعي رسمية" : "VRIJWILLIGERSOVEREENKOMST"}
                      </h2>
                      <p className="text-[10px] text-slate-300 font-medium">
                        {orgTitle}
                      </p>
                    </div>

                    {/* Preamble */}
                    <p className="text-[10px] leading-normal text-slate-700 text-justify">
                      {languageMode === "ar" ? (
                        <>
                          إن منظمة الجالية السورية في هولندا، ومقرها الرئيسي في Laan van Meerdervoort 53-D, 2517 AE Den Haag، المسجلة لدى السجل التجاري الهولندي برقم KvK: 96718943، ويمثلها قانوناً رئيس مجلس الإدارة السيد عبد المنعم الشامان (المشار إليها لاحقاً بـ &quot;المنظمة&quot;)، والطرف الثاني:
                        </>
                      ) : (
                        <>
                          De Syrische Gemeenschap in Nederland, gevestigd te Laan van Meerdervoort 53-D, 2517 AE Den Haag, Nederland, KvK-nummer: 96718943, hierbij rechtsgeldig vertegenwoordigd door de voorzitter, de heer Abd al-Munem Shaman (hierna: &quot;de organisatie&quot;), en:
                        </>
                      )}
                    </p>

                    {/* Two Side-by-Side Metadata Boxes */}
                    <div className="grid grid-cols-2 gap-3 text-[9.5px]">
                      {/* Organization Box */}
                      <div className="border border-slate-300 rounded p-2.5 bg-slate-50/40 space-y-0.5">
                        <h4 className="font-bold text-slate-900 text-[10px] border-b border-slate-200 pb-0.5 mb-1">
                          {languageMode === "ar" ? "بيانات المنظمة" : "Gegevens van de organisatie"}
                        </h4>
                        <p><strong className="text-slate-800">Naam:</strong> {orgTitle}</p>
                        <p><strong className="text-slate-800">Adres:</strong> Laan van Meerdervoort 53-D, 2517 AE Den Haag</p>
                        <p><strong className="text-slate-800">KvK-nummer:</strong> 96718943</p>
                        <p><strong className="text-slate-800">E-mail:</strong> info@sy-nl.org</p>
                        <p><strong className="text-slate-800">Website:</strong> www.sy-nl.org</p>
                        <p><strong className="text-slate-800">Vertegenwoordigd door:</strong> Abd al-Munem Shaman (voorzitter)</p>
                      </div>

                      {/* Volunteer Box */}
                      <div className="border border-slate-300 rounded p-2.5 bg-slate-50/40 space-y-0.5">
                        <h4 className="font-bold text-slate-900 text-[10px] border-b border-slate-200 pb-0.5 mb-1">
                          {languageMode === "ar" ? "بيانات المتطوع" : "Gegevens van de vrijwilliger"}
                        </h4>
                        <p><strong className="text-slate-800">Naam:</strong> {secondParty.name}</p>
                        <p><strong className="text-slate-800">Adres:</strong> {secondParty.address || "Johanna Westerdijkstraat 14"}</p>
                        <p><strong className="text-slate-800">Postcode en woonplaats:</strong> {secondPartyPostcode || "2286JB"} {secondParty.city || "Rijswijk"}</p>
                        <p><strong className="text-slate-800">E-mail:</strong> {secondParty.email || "mahernet88@gmail.com"}</p>
                        <p><strong className="text-slate-800">Telefoonnummer:</strong> {secondParty.phone || "0641173391"}</p>
                      </div>
                    </div>

                    {/* Afdeling / Team and Hours row */}
                    <div className="border border-slate-300 rounded p-2 bg-slate-50/30 text-[9.5px] space-y-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-bold text-slate-800">Afdeling / Team:</span>
                        {VOLUNTEER_DEPARTMENTS.map((dept) => (
                          <span key={dept.id} className="inline-flex items-center gap-1 text-slate-700">
                            <span className={`w-3 h-3 border border-slate-400 rounded-2xs inline-flex items-center justify-center text-[8px] font-bold ${selectedDepartment === dept.id ? "bg-slate-800 text-white" : "bg-white"}`}>
                              {selectedDepartment === dept.id ? "✓" : ""}
                            </span>
                            <span>{languageMode === "ar" ? dept.labelAr : dept.labelNl}</span>
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-0.5 border-t border-slate-200 text-slate-700">
                        <span><strong>{languageMode === "ar" ? "تاريخ البدء:" : "Startdatum:"}</strong> {issueDateGregorian}</span>
                        <span>|</span>
                        <span><strong>{languageMode === "ar" ? "الساعات أسبوعياً:" : "Aantal uren per week:"}</strong> {hoursPerWeek} {languageMode === "ar" ? "ساعة" : "uur"}</span>
                      </div>
                    </div>

                    <p className="text-[9.5px] font-bold text-slate-800 pt-0.5">
                      {languageMode === "ar" ? "تم الاتفاق والتراضي على البنود والشروط التالية:" : "Zijn het volgende overeengekomen:"}
                    </p>

                    {/* The 9 Articles in 2-Column Grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[8.5px] leading-tight text-justify">
                      {/* Column 1: Articles 1-4 */}
                      <div className="space-y-1.5">
                        {OFFICIAL_VOLUNTEER_ARTICLES.slice(0, 4).map((art) => (
                          <div key={art.number} className="space-y-0.5">
                            <h5 className="font-bold text-slate-900 border-b border-slate-200 pb-0.2">
                              {languageMode === "ar" ? art.titleAr : art.titleNl}
                            </h5>
                            {(languageMode === "ar" ? art.paragraphsAr : art.paragraphsNl).map((p, idx) => (
                              <p key={idx} className="text-slate-700">{p}</p>
                            ))}
                          </div>
                        ))}
                      </div>

                      {/* Column 2: Articles 5-9 */}
                      <div className="space-y-1.5">
                        {OFFICIAL_VOLUNTEER_ARTICLES.slice(4).map((art) => (
                          <div key={art.number} className="space-y-0.5">
                            <h5 className="font-bold text-slate-900 border-b border-slate-200 pb-0.2">
                              {languageMode === "ar" ? art.titleAr : art.titleNl}
                            </h5>
                            {(languageMode === "ar" ? art.paragraphsAr : art.paragraphsNl).map((p, idx) => (
                              <p key={idx} className="text-slate-700">{p}</p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ================= OTHER STANDARD TEMPLATES ================= */
                  <div className="space-y-4 text-xs text-slate-800 text-justify leading-relaxed">
                    <div className="text-center my-4 space-y-1">
                      <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 text-[11px] font-black rounded-full uppercase tracking-wider mb-1">
                        {currentTemplate.badge}
                      </span>
                      <h1 className="text-xl font-black text-slate-900 underline decoration-slate-400 decoration-2 underline-offset-8">
                        {languageMode === "ar" ? currentTemplate.titleAr : currentTemplate.titleNl}
                      </h1>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-2 text-xs">
                      <p>
                        <strong>{languageMode === "ar" ? "الطرف الأول:" : "Eerste Partij:"}</strong> {orgTitle}، {languageMode === "ar" ? "المسجلة في هولندا برقم" : "gevestigd in Nederland, KvK:"} {SGN_ORGANIZATION_INFO.kvkNumber}، {languageMode === "ar" ? "ويمثلها قانوناً:" : "vertegenwoordigd door:"} <strong>{selectedSignatory.name}</strong> ({selectedSignatory.titleAr}).
                      </p>
                      <p>
                        <strong>{languageMode === "ar" ? "الطرف الثاني:" : "Tweede Partij:"}</strong> <strong>{secondParty.name}</strong>، {languageMode === "ar" ? "المقيم في:" : "wonende te:"} {secondParty.address} {secondParty.city}.
                      </p>
                    </div>

                    {selectedTemplateId === "membership_application" && (
                      <div className="space-y-3">
                        <p>
                          بناءً على طلب الانتساب المقدم من السيد/ة <strong>{secondParty.name}</strong> للانضمام إلى منظمة الجالية السورية في هولندا:
                        </p>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                          <p><strong>الاسم والنسبة:</strong> {secondParty.name}</p>
                          <p><strong>مكان الإقامة في هولندا:</strong> {secondParty.city} ({secondParty.address})</p>
                          <p><strong>البريد الإلكتروني / الهاتف:</strong> {secondParty.email} | {secondParty.phone}</p>
                          <p><strong>الصفة / التخصص:</strong> {secondParty.roleOrTitle || "عضو منتسب"}</p>
                        </div>
                        <p>
                          <strong>إقرار المنتسب:</strong> أقر أنا الموقع أدناه باطلاعي التام على النظام الداخلي لمنظمة الجالية السورية في هولندا والتزامي الكامل بأهدافه ومبادئه الجامعة، كما أوافق على معالجة بياناتي وفق شروط اللائحة العامة لحماية البيانات (AVG) لاستخدامها في إطار أنشطة الجالية وخدماتها.
                        </p>
                      </div>
                    )}

                    {selectedTemplateId === "confidentiality_avg" && (
                      <div className="space-y-3">
                        <p>
                          تطبيقاً لأحكام اللائحة العامة لحماية البيانات في الاتحاد الأوروبي وهولندا (Algemene Verordening Gegevensbescherming - AVG) وقانون الخصوصية الهولندي (UAVG):
                        </p>
                        <p>
                          يتعهد السيد/ة <strong>{secondParty.name}</strong>، بصفته <strong>{secondParty.roleOrTitle || "مطلعاً على سجلات أو بيانات خاصة بالمنظمة"}</strong>، بعدم إفشاء أو نسخ أو تسريب أو استغلال أي بيانات شخصية أو مستندات أو خطابات رسمية تخص أفراد الجالية السورية في هولندا تم الاطلاع عليها بحكم مهمته.
                        </p>
                        <p>
                          يسري هذا التعهد طوال فترة أداء المهام ويظل سارياً وملزماً قانونياً حتى بعد انتهاء العلاقة التنظيمية.
                        </p>
                      </div>
                    )}

                    {selectedTemplateId === "board_resolution" && (
                      <div className="space-y-3">
                        <p>
                          استناداً إلى الصلاحيات الممنوحة لمجلس إدارة منظمة الجالية السورية في هولندا بموجب المادة 2:291 من القانون المدني الهولندي والنظام الداخلي للجالية:
                        </p>
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 font-bold">
                          قرار إداري رقم ({refNumber}): تقرر بموجب هذا: {customSubject || "اعتماد خطة العمل وتعيين مسؤولي اللجان التنفيذية"}.
                        </div>
                        <p>
                          <strong>المبررات والتفاصيل:</strong> {customNotes || "تنفيذاً لمقررات الجمعية العامة وحرصاً على تفعيل وتيسير شؤون الجالية السورية في مختلف المقاطعات الهولندية."}
                        </p>
                      </div>
                    )}

                    {selectedTemplateId === "volunteer_certificate" && (
                      <div className="space-y-3">
                        <p>
                          تشهد منظمة الجالية السورية في هولندا (SGN) بأن السيد/ة <strong>{secondParty.name}</strong> قد ساهم/ت كمتطوع/ة فاعل/ة في أنشطة الجالية وقدم/ت خدمات تطوعية متميزة في مجال: <strong>{customSubject || "الدعم المجتمعي والاندماج"}</strong>.
                        </p>
                        <p>
                          تُمنح هذه الشهادة كوثيقة إثبات مشاركة واندماج مجتمعي رسمي (Participatieverklaring voor Gemeenten).
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* FINAL SIGNATURES SECTION (Appears ONLY at the End of the Document - NO HEADER REPETITION) */}
              <div className="mt-8 pt-4 border-t border-slate-300">
                <p className="text-[10px] font-bold text-slate-800 mb-3">
                  {languageMode === "ar"
                    ? "تم الاتفاق على ما ورد أعلاه والتوقيع عليه من نسختين أصليتين:"
                    : "Aldus overeengekomen en in tweevoud ondertekend:"}
                </p>

                <div className="grid grid-cols-2 gap-8 items-start text-xs font-sans">
                  {/* Left: Organization (Voorzitter) */}
                  <div className="space-y-2">
                    <div>
                      <strong className="block text-slate-900 text-[11px]">
                        {languageMode === "ar" ? "عن منظمة الجالية السورية في هولندا" : "Namens de Syrische Gemeenschap in Nederland"}
                      </strong>
                      <span className="text-[10.5px] font-bold text-slate-800 block">
                        {selectedSignatory.name}
                      </span>
                      <span className="text-[9.5px] text-slate-600 block">
                        {languageMode === "ar" ? selectedSignatory.titleAr : selectedSignatory.titleNl || "Voorzitter"}
                      </span>
                    </div>

                    <div className="pt-2 flex items-center gap-4">
                      <span className="text-[10px] font-bold text-slate-700">Handtekening:</span>
                      <div className="relative">
                        <div className="border-b border-dashed border-slate-400 w-32 h-6" />
                        {includeSeal && (
                          <div className="absolute -top-4 left-4 w-20 h-20 pointer-events-none opacity-90">
                            <img
                              src="/logo.png"
                              alt="Official Stamp"
                              className="w-full h-full object-contain filter drop-shadow-xs"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Volunteer / Second Party */}
                  <div className="space-y-2">
                    <div>
                      <strong className="block text-slate-900 text-[11px]">
                        {languageMode === "ar" ? "الطرف الثاني / المتطوع" : "De vrijwilliger / Tweede Partij"}
                      </strong>
                      <span className="text-[10.5px] font-bold text-slate-800 block">
                        {secondParty.name}
                      </span>
                      <span className="text-[9.5px] text-slate-600 block">
                        Datum: {issueDateGregorian}
                      </span>
                    </div>

                    <div className="pt-2 flex items-center gap-4">
                      <span className="text-[10px] font-bold text-slate-700">Handtekening:</span>
                      <div className="border-b border-dashed border-slate-400 w-32 h-6" />
                    </div>
                  </div>
                </div>

                {/* Clean Official Footer at the Very Bottom */}
                <div className="mt-6 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-600 font-sans">
                  <span>
                    {orgTitle} • www.sy-nl.org • info@sy-nl.org • KvK: 96718943
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
