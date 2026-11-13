"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { 
  Printer, FileText, CheckCircle2, ShieldCheck, Download, Copy, RefreshCw, 
  User, Building2, HandHeart, Calendar, MapPin, Hash, Sparkles, AlertCircle,
  FileCheck, Stamp, QrCode, Globe2, ChevronDown, Check
} from "lucide-react";
import { 
  DOCUMENT_TEMPLATES, BOARD_OFFICERS, SGN_ORGANIZATION_INFO, 
  DocumentFormData, DocumentParty 
} from "@/lib/documents/templates";
import { formatLocalizedDigits } from "@/lib/language-guard";

function SyrianRevolutionFlag({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 900 600" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="200" fill="#007a3d" />
      <rect y="200" width="900" height="200" fill="#ffffff" />
      <rect y="400" width="900" height="200" fill="#000000" />
      <g fill="#ce1126" transform="translate(450,300)">
        {/* 3 Red Stars of Syrian Independence */}
        <g transform="translate(-160, 0)">
          <polygon points="0,-35 10,-10 35,-10 15,6 22,30 0,16 -22,30 -15,6 -35,-10 -10,-10" />
        </g>
        <g transform="translate(0, 0)">
          <polygon points="0,-35 10,-10 35,-10 15,6 22,30 0,16 -22,30 -15,6 -35,-10 -10,-10" />
        </g>
        <g transform="translate(160, 0)">
          <polygon points="0,-35 10,-10 35,-10 15,6 22,30 0,16 -22,30 -15,6 -35,-10 -10,-10" />
        </g>
      </g>
    </svg>
  );
}

function DutchFlag({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 9 6" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="9" height="2" fill="#AE1C28" />
      <rect y="2" width="9" height="2" fill="#ffffff" />
      <rect y="4" width="9" height="2" fill="#21468B" />
    </svg>
  );
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
  const [city, setCity] = useState<string>("Utrecht");
  const [languageMode, setLanguageMode] = useState<"ar" | "nl" | "bilingual">("ar");
  const [includeSeal, setIncludeSeal] = useState<boolean>(true);
  const [includeQr, setIncludeQr] = useState<boolean>(true);

  // Dates
  const today = new Date().toISOString().split("T")[0];
  const [issueDateGregorian, setIssueDateGregorian] = useState<string>(today);
  const [issueDateHijri, setIssueDateHijri] = useState<string>("١٤٤٨ هـ");

  // Signatory
  const [selectedSignatory, setSelectedSignatory] = useState(BOARD_OFFICERS[0]);

  // Second party details
  const [secondParty, setSecondParty] = useState<DocumentParty>({
    name: "محمد كمال الحلبي",
    idNumber: "NL-BSN-89412356",
    birthDate: "1994-05-12",
    address: "Stationsplein 45",
    city: "Utrecht",
    email: "m.alhalabi@example.nl",
    phone: "+31 6 87654321",
    roleOrTitle: "متطوع في لجنة الدعم والاندماج",
  });

  // Custom Content
  const [customSubject, setCustomSubject] = useState<string>("تطوع في أنشطة الإرشاد القانوني والترجمة للجالية");
  const [customNotes, setCustomNotes] = useState<string>(
    "يلتزم الطرف الثاني بتقديم ٤ ساعات تطوعية أسبوعياً، مع تغطية مصاريف التنقل وفق اللائحة المعتمدة."
  );

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
      address: "Nederland",
      city: "Nederland",
      email: v.email || "",
      phone: v.phone || "",
      roleOrTitle: v.skills ? `متطوع (${v.skills.substring(0, 30)})` : "متطوع معتمد",
    });
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

  return (
    <div className="space-y-8 pb-16">
      {/* Screen Header - Hidden on Print */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-l from-emerald-900 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl border border-emerald-500/20">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>نظام التوثيق والورقيات الرسمية والقانونية | SGN Official Documents</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <span>مولّد النماذج والورقيات الرسمية للجالية</span>
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              KvK: {SGN_ORGANIZATION_INFO.kvkNumber}
            </span>
          </h1>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
            توليد وطباعة كافة العقود، طلبات الانتساب، اتفاقيات التطوع، وقرارات مجلس الإدارة الرسمية وفق النظام الداخلي للجالية والقوانين الهولندية (Burgerlijk Wetboek Boek 2 & AVG).
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
            <span>طباعة فورية / حفظ PDF</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Control Panel (Left) & Live A4 Document (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Controls Column (Hidden on Print) */}
        <div className="lg:col-span-5 space-y-6 print:hidden">
          
          {/* 1. Template Selector */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>اختر نوع الوثيقة أو العقد الرسمي</span>
            </h3>
            
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {DOCUMENT_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplateId(tmpl.id)}
                  className={`w-full text-right p-3.5 rounded-2xl border text-xs transition-all flex flex-col gap-1 ${
                    selectedTemplateId === tmpl.id
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold shadow-sm"
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

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/50 flex items-start gap-2.5 text-[11px] text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>الاستناد القانوني:</strong> {currentTemplate.legalBasisAr}
              </span>
            </div>
          </div>

          {/* 2. Quick Auto-fill Selectors */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>تعبئة تلقائية من قاعدة البيانات</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Members dropdown */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  اختر من الأعضاء المسجلين
                </label>
                <select
                  onChange={(e) => handleSelectMember(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="">-- اختر عضواً --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nameAr || m.nameNl} ({m.nlCity || "NL"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Volunteers dropdown */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  اختر من المتطوعين المسجلين
                </label>
                <select
                  onChange={(e) => handleSelectVolunteer(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="">-- اختر متطوعاً --</option>
                  {volunteers.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 3. Document Customization Form */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              <span>بيانات الطرف الثاني والموقّع</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  اسم المنتسب / المتطوع / الطرف الثاني
                </label>
                <input
                  type="text"
                  value={secondParty.name}
                  onChange={(e) => setSecondParty({ ...secondParty, name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    رقم العضوية أو الـ BSN
                  </label>
                  <input
                    type="text"
                    value={secondParty.idNumber || ""}
                    onChange={(e) => setSecondParty({ ...secondParty, idNumber: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    الصفة / المهمة
                  </label>
                  <input
                    type="text"
                    value={secondParty.roleOrTitle || ""}
                    onChange={(e) => setSecondParty({ ...secondParty, roleOrTitle: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    المدينة بهولندا
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
                    العنوان الكامل
                  </label>
                  <input
                    type="text"
                    value={secondParty.address || ""}
                    onChange={(e) => setSecondParty({ ...secondParty, address: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

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

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  موضوع الوثيقة / المهام الموكلة
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  بنود أو ملاحظات إضافية خاصة
                </label>
                <textarea
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed"
                />
              </div>

              {/* Number and Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      الرقم المرجعي
                    </label>
                    <button
                      type="button"
                      onClick={generateNewRef}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-bold"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>توليد</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    تاريخ الإصدار
                  </label>
                  <input
                    type="date"
                    value={issueDateGregorian}
                    onChange={(e) => setIssueDateGregorian(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
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
                  <span>إظهار الختم الرقمي الرسمي</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeQr}
                    onChange={(e) => setIncludeQr(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>إظهار كود التحقق QR الذكي</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Document Rendering Canvas (A4 Sheet Presentation) */}
        <div className="lg:col-span-7">
          <div className="bg-slate-200/60 dark:bg-slate-950 p-2 sm:p-4 rounded-3xl border border-slate-300 dark:border-slate-800 shadow-inner flex justify-center">
            
            {/* The Print-Ready A4 Document */}
            <div
              id="printable-official-document"
              className="bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-12 shadow-2xl relative flex flex-col justify-between font-sans leading-relaxed print:m-0 print:p-8 print:shadow-none print:w-full print:max-w-none print:min-h-0 print:text-black"
              style={{ minHeight: "297mm" }}
            >
              
              {/* TOP HEADER: Official SGN Letterhead */}
              <div>
                <div className="flex items-start justify-between border-b-2 border-emerald-900 pb-5 mb-6">
                  {/* Arabic Side */}
                  <div className="text-right">
                    <h2 className="text-lg font-black text-emerald-900 tracking-tight">
                      الجمعية العامة للجالية السورية في هولندا
                    </h2>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">
                      مؤسسة مدنية غير ربحية مسجلة رسمياً في هولندا
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1">
                      السجل التجاري الهولندي KvK: <span className="font-mono font-bold text-emerald-800">{SGN_ORGANIZATION_INFO.kvkNumber}</span>
                    </p>
                  </div>

                  {/* Center Emblem / Flags */}
                  <div className="flex flex-col items-center justify-center px-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-8 h-5 shadow-sm rounded-sm overflow-hidden border border-slate-300">
                        <SyrianRevolutionFlag className="w-full h-full object-cover" />
                      </div>
                      <div className="w-8 h-5 shadow-sm rounded-sm overflow-hidden border border-slate-300">
                        <DutchFlag className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-emerald-900 tracking-widest uppercase">
                      SGN • NL
                    </span>
                  </div>

                  {/* Dutch Side */}
                  <div className="text-left font-sans">
                    <h2 className="text-base font-bold text-emerald-950">
                      Stichting De Syrische Gemeenschap
                    </h2>
                    <p className="text-xs font-semibold text-slate-600">
                      in Nederland (SGN Platform)
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Handelsregister KvK: <span className="font-mono font-bold text-slate-800">{SGN_ORGANIZATION_INFO.kvkNumber}</span>
                    </p>
                  </div>
                </div>

                {/* Metadata Stripe */}
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-6 font-mono">
                  <div>
                    <span className="text-slate-500">الرقم المرجعي (Ref): </span>
                    <strong className="text-emerald-900">{refNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">التاريخ (Datum): </span>
                    <strong className="text-slate-800">{issueDateGregorian} م</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">المقر (Plaats): </span>
                    <strong className="text-slate-800">{city}, Nederland</strong>
                  </div>
                </div>

                {/* Document Main Title */}
                <div className="text-center my-6 space-y-1">
                  <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 text-[11px] font-black rounded-full uppercase tracking-wider mb-1">
                    {currentTemplate.badge}
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 underline decoration-emerald-600 decoration-2 underline-offset-8">
                    {currentTemplate.titleAr}
                  </h1>
                  <p className="text-xs font-bold text-slate-500 tracking-wide pt-1 font-sans">
                    {currentTemplate.titleNl}
                  </p>
                </div>

                {/* Dynamic Content Based on Template */}
                <div className="text-xs text-slate-800 space-y-4 text-justify leading-relaxed">
                  
                  {/* Parties Identification Box */}
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-2 text-xs">
                    <p>
                      <strong>الطرف الأول (Eerste Partij):</strong> {SGN_ORGANIZATION_INFO.nameAr} ({SGN_ORGANIZATION_INFO.nameNl})، المسجلة لدى غرفة التجارة الهولندية برقم KvK: {SGN_ORGANIZATION_INFO.kvkNumber}، ويمثلها قانوناً السيد/ة: <strong>{selectedSignatory.name}</strong> بصفتها: <strong>{selectedSignatory.titleAr}</strong>.
                    </p>
                    <p>
                      <strong>الطرف الثاني (Tweede Partij):</strong> السيد/ة <strong>{secondParty.name}</strong>، المقيم في: <strong>{secondParty.address || "هولندا"}، {secondParty.city || "Nederland"}</strong>، رقم المرجع/الهوية: <strong>{secondParty.idNumber || "مسجل في سجلات الجالية"}</strong>.
                    </p>
                  </div>

                  {/* Body Content 1: Volunteer Agreement */}
                  {selectedTemplateId === "volunteer_agreement" && (
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-bold text-emerald-950 mb-0.5">البند الأول: طبيعة العمل والوضع القانوني (Aard van de Overeenkomst)</h4>
                        <p>
                          يقر الطرفان بأن هذه الاتفاقية تخضع للائحة التطوع المعفاة من الضرائب الصادرة عن مصلحة الضرائب الهولندية (Vrijwilligersregeling Belastingdienst) وأحكام المادة 7:610 من القانون المدني الهولندي، وأن هذا العمل تطوعي غير مأجور للمنفعة العامة ولا ينشئ أي علاقة عمل وظيفية أو رابطة تبعية ملزمة (Geen fictieve dienstbetrekking).
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold text-emerald-950 mb-0.5">البند الثاني: المهام وساعات العمل (Werkzaamheden en Inzet)</h4>
                        <p>
                          يقوم الطرف الثاني بمهام: <strong>{customSubject || "المساهمة في المبادرات والأنشطة التطوعية للجالية"}</strong>، مع مراعاة أن ساعات التطوع اختيارية ومنسقة بين الطرفين بما لا يتعارض مع القوانين المعمول بها.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold text-emerald-950 mb-0.5">البند الثالث: التعويض والتأمين (Onkosten en Verzekering)</h4>
                        <p>
                          يتمتع المتطوع بتغطية التأمين البلدي للعمل التطوعي (Vrijwilligerspolis) المعمول به عبر البلديات الهولندية (VNG) أثناء تأدية المهام، ويحق له استرداد نفقات السفر والمصاريف الفعلية الضرورية المثبتة بإيصالات رسمية وفق السقف القانوني المعفى لمصلحة الضرائب.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold text-emerald-950 mb-0.5">البند الرابع: السرية والإنهاء (Geheimhouding en Beëindiging)</h4>
                        <p>
                          يلتزم الطرف الثاني بالسرية التامة لبيانات الأعضاء والملفات المنصوص عليها بلائحة AVG، ويحق لكلا الطرفين إنهاء هذا التعاقد التطوعي في أي وقت وبإشعار شفهي أو خطي دون ترتيب أي تعويضات مالية.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Body Content 2: Membership Application */}
                  {selectedTemplateId === "membership_application" && (
                    <div className="space-y-3">
                      <p>
                        بناءً على طلب الانتساب المقدم من السيد/ة <strong>{secondParty.name}</strong> للانضمام إلى الجمعية العامة للجالية السورية في هولندا:
                      </p>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <ul className="list-disc list-inside space-y-1 text-slate-700">
                          <li><strong>الاسم والنسبة:</strong> {secondParty.name}</li>
                          <li><strong>مكان الإقامة في هولندا:</strong> {secondParty.city} ({secondParty.address})</li>
                          <li><strong>البريد الإلكتروني / الهاتف:</strong> {secondParty.email || "غير مسجل"} | {secondParty.phone || "غير مسجل"}</li>
                          <li><strong>الصفة / التخصص:</strong> {secondParty.roleOrTitle || "عضو منتسب"}</li>
                        </ul>
                      </div>
                      <p>
                        <strong>إقرار المنتسب:</strong> أقر أنا الموقع أدناه باطلاعي التام على النظام الداخلي للجالية السورية في هولندا والتزامي الكامل بأهدافه ومبادئه الجامعة، كما أوافق على معالجة بياناتي وفق شروط اللائحة العامة لحماية البيانات (AVG) لاستخدامها في إطار أنشطة الجالية وخدماتها.
                      </p>
                    </div>
                  )}

                  {/* Body Content 3: Confidentiality AVG */}
                  {selectedTemplateId === "confidentiality_avg" && (
                    <div className="space-y-3">
                      <p>
                        تطبيقاً لأحكام اللائحة العامة لحماية البيانات في الاتحاد الأوروبي وهولندا (Algemene Verordening Gegevensbescherming - AVG) وقانون الخصوصية الهولندي (UAVG):
                      </p>
                      <p>
                        يتعهد السيد/ة <strong>{secondParty.name}</strong>، بصفته <strong>{secondParty.roleOrTitle || "مطلعاً على سجلات أو بيانات خاصة بالجالية"}</strong>، بعدم إفشاء أو نسخ أو تسريب أو استغلال أي بيانات شخصية أو مستندات أو خطابات رسمية تخص أفراد الجالية السورية في هولندا تم الاطلاع عليها بحكم مهمته.
                      </p>
                      <p>
                        يسري هذا التعهد طوال فترة أداء المهام ويظل سارياً وملزماً قانونياً حتى بعد انتهاء العلاقة التنظيمية، وأي خرق يعرض المرتكب للمساءلة المدنية وفق القوانين الهولندية.
                      </p>
                    </div>
                  )}

                  {/* Body Content 4: Board Resolution */}
                  {selectedTemplateId === "board_resolution" && (
                    <div className="space-y-3">
                      <p>
                        استناداً إلى الصلاحيات الممنوحة لمجلس إدارة الجالية السورية في هولندا بموجب المادة 2:291 من القانون المدني الهولندي والنظام الداخلي للجالية، وبعد استيفاء النصاب القانوني للجلسة:
                      </p>
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 font-bold">
                        قرار إداري رقم ({refNumber}): تقرر بموجب هذا: {customSubject || "اعتماد خطة العمل وتعيين مسؤولي اللجان التنفيذية"}.
                      </div>
                      <p>
                        <strong>المبررات والتفاصيل:</strong> {customNotes || "تنفيذاً لمقررات الجمعية العامة وحرصاً على تفعيل وتيسير شؤون الجالية السورية في مختلف المقاطعات الهولندية."}
                      </p>
                      <p>
                        يُعمل بهذا القرار من تاريخ صدوره ويُعمم على كافة المكاتب واللجان التنظيمية المعنية.
                      </p>
                    </div>
                  )}

                  {/* Body Content 5: Volunteer Certificate */}
                  {selectedTemplateId === "volunteer_certificate" && (
                    <div className="space-y-3">
                      <p>
                        تشهد الجمعية العامة للجالية السورية في هولندا (SGN) بأن السيد/ة:
                      </p>
                      <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-200 font-bold text-sm text-emerald-950">
                        {secondParty.name}
                      </div>
                      <p>
                        قد ساهم/ت كمتطوع/ة فاعل/ة في أنشطة الجالية وقدم/ت خدمات تطوعية متميزة في مجال: <strong>{customSubject || "الدعم المجتمعي وتنظيم الفعاليات الثقافية والاندماج"}</strong>.
                      </p>
                      <p>
                        تُمنح هذه الشهادة بناءً على طلبه/ا لتقديمها إلى الجهات الرسمية المعنية وبلديات هولندا (Gemeente) كوثيقة إثبات مشاركة واندماج مجتمعي رسمي (Participatieverklaring).
                      </p>
                    </div>
                  )}

                  {/* Body Content 6: Membership Statement */}
                  {selectedTemplateId === "membership_statement" && (
                    <div className="space-y-3">
                      <p>
                        إلى من يهمه الأمر / Aan de bevoegde instanties:
                      </p>
                      <p>
                        تشهد إدارة الجالية السورية في هولندا بأن السيد/ة <strong>{secondParty.name}</strong>، المسجل في سجلاتنا برقم العضوية: <strong>{secondParty.idNumber || "معتمد"}</strong>، هو عضو منتسب ذو سجل نظامي وساري المفعول في الجالية.
                      </p>
                      <p>
                        {customNotes || "يتمتع العضو بكافة الحقوق والمزايا المنصوص عليها في النظام الداخلي للجالية، وقد صدرت هذه الإفادة بناءً على طلبه لتقديمها إلى من يلزم."}
                      </p>
                    </div>
                  )}

                  {/* Body Content 7: Official Authorization */}
                  {selectedTemplateId === "official_authorization" && (
                    <div className="space-y-3">
                      <p>
                        بموجب هذا التفويض الرسمي الصادر عن مجلس إدارة الجالية السورية في هولندا، يُفوّض السيد/ة <strong>{secondParty.name}</strong> بتمثيل الجالية لدى: <strong>{customSubject || "الجهات واللقاءات الرسمية المحددة"}</strong>.
                      </p>
                      <p>
                        <strong>نطاق التفويض:</strong> {customNotes || "التحدث باسم الجالية والتنسيق الإداري في إطار المهمة الموكلة، دون توقيع أي التزامات مالية إلا بإذن خطي من المكتب المالي."}
                      </p>
                      <p>
                        يسري مفعول هذا التفويض اعتباراً من تاريخه ولمدة ٦ أشهر ما لم يتم سحبه خطياً من مجلس الإدارة.
                      </p>
                    </div>
                  )}

                  {/* Body Content 8: Board Minutes */}
                  {selectedTemplateId === "board_minutes" && (
                    <div className="space-y-3">
                      <p>
                        عُقد الاجتماع الرسمي لمجلس إدارة الجالية السورية في هولندا بتاريخ {issueDateGregorian}، بحضور أعضاء هيئة المكتب، وتمت مناقشة جدول الأعمال التالي:
                      </p>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <p><strong>جدول الأعمال والمداولات:</strong> {customSubject}</p>
                        <p className="mt-1"><strong>القرارات والتوصيات:</strong> {customNotes}</p>
                      </div>
                      <p>
                        وقد وافق الأعضاء الحاضرون بالإجماع على ما ورد في هذا المحضر وتكليف هيئة الأمانة العامة بمتابعة التنفيذ.
                      </p>
                    </div>
                  )}

                </div>
              </div>

              {/* BOTTOM SECTION: Signatures, Stamp & QR Verification */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="grid grid-cols-3 gap-4 items-end text-xs">
                  
                  {/* Left: Second Party Signature */}
                  <div className="text-center space-y-8">
                    <span className="font-bold text-slate-700 block">
                      توقيع الطرف الثاني / المستفيد<br />
                      <span className="text-[10px] text-slate-500 font-sans font-normal">Handtekening Tweede Partij</span>
                    </span>
                    <div className="border-b border-dashed border-slate-400 w-32 mx-auto" />
                    <span className="text-[11px] font-bold text-slate-800 block">
                      {secondParty.name}
                    </span>
                  </div>

                  {/* Center: Official Stamp & QR Code */}
                  <div className="flex flex-col items-center justify-center">
                    {includeSeal && (
                      <div className="w-24 h-24 rounded-full border-2 border-emerald-800 border-dashed flex flex-col items-center justify-center text-center p-1 relative shadow-inner bg-emerald-50/20">
                        <span className="text-[7px] font-black text-emerald-950 uppercase tracking-widest">
                          ★ SGN NEDERLAND ★
                        </span>
                        <div className="my-0.5">
                          <Stamp className="w-6 h-6 text-emerald-800 opacity-80" />
                        </div>
                        <span className="text-[8px] font-black text-emerald-900 leading-tight">
                          الجالية السورية في هولندا<br />
                          الختم الرسمي المعتمد
                        </span>
                        <span className="text-[6.5px] font-mono text-emerald-700 mt-0.5">
                          KvK: 96718943
                        </span>
                      </div>
                    )}

                    {includeQr && (
                      <div className="mt-2 text-center">
                        <div className="w-12 h-12 border border-slate-300 rounded p-1 bg-white mx-auto shadow-xs flex items-center justify-center">
                          <QrCode className="w-full h-full text-slate-800" />
                        </div>
                        <span className="text-[8px] font-mono text-slate-400 block mt-0.5">
                          تحقق رقمي فوري
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: Board Representative Signature */}
                  <div className="text-center space-y-8">
                    <span className="font-bold text-emerald-950 block">
                      عن مجلس إدارة الجالية<br />
                      <span className="text-[10px] text-slate-500 font-sans font-normal">Namens het Bestuur SGN</span>
                    </span>
                    <div className="border-b border-dashed border-emerald-800 w-32 mx-auto" />
                    <div className="text-[11px] font-bold text-emerald-900">
                      <span>{selectedSignatory.name}</span>
                      <span className="block text-[9.5px] font-medium text-slate-600">
                        {selectedSignatory.titleAr}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer disclaimer */}
                <div className="mt-6 pt-3 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-500 font-sans">
                  <span>
                    Stichting De Syrische Gemeenschap in Nederland • KvK: 96718943 • {SGN_ORGANIZATION_INFO.officialWebsite}
                  </span>
                  <span>
                    Conform Boek 2 Burgerlijk Wetboek, Vrijwilligersregeling en AVG Privacywetgeving
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
