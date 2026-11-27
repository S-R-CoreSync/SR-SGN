"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import {
  Printer, FileText, RefreshCw, User, Building2, HandHeart,
  Calendar, Sparkles, Loader2, Search, Check, Settings2, Eye,
  Copy, Stamp, QrCode, Wand2, Plus, Trash2, ArrowRight, ShieldCheck,
  CheckCircle2, Info, ArrowLeft, PenTool, ZoomIn, ZoomOut, Mail,
  RotateCcw, Download
} from "lucide-react";
import {
  DOCUMENT_TEMPLATES, BOARD_OFFICERS, SGN_ORGANIZATION_INFO,
  OFFICIAL_VOLUNTEER_ARTICLES, VOLUNTEER_DEPARTMENTS,
  DocumentParty
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
  const td = useTranslations("dashboardDocs");

  // Tab State
  const [activeTab, setActiveTab] = useState<"parties" | "articles" | "ai">("parties");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [viewMode, setViewMode] = useState<"split" | "previewOnly">("split");

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

  // Digital Signature State
  const [showSignaturePad, setShowSignaturePad] = useState<boolean>(false);
  const [volunteerSignature, setVolunteerSignature] = useState<string | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

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
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

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

      // Add Maher Aslan sample
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
        setAiMessage(td("aiUpdatedArticles"));
      } else if (data.content) {
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
        setAiMessage(td("aiAddedArticle"));
      }
    } catch {
      setAiMessage(td("aiError"));
    } finally {
      setGeneratingAi(false);
    }
  };

  // Reset Articles
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

  // ── SIGNATURE PAD LOGIC ──
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ("touches" in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ("touches" in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0b2545";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setVolunteerSignature(null);
  };

  const saveSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setVolunteerSignature(dataUrl);
    setShowSignaturePad(false);
  };

  // ── RELIABLE HIDDEN IFRAME PRINT ENGINE (Zero-Interference) ──
  const handlePrintViaHiddenIframe = () => {
    setIsPrinting(true);
    const printContent = document.getElementById("sgn-contract-print-content");
    if (!printContent) {
      setIsPrinting(false);
      return;
    }

    // Remove old print frame if exists
    const existingFrame = document.getElementById("sgn-silent-print-iframe");
    if (existingFrame) existingFrame.remove();

    // Create an invisible iframe
    const iframe = document.createElement("iframe");
    iframe.id = "sgn-silent-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      setIsPrinting(false);
      return;
    }

    // Prepare complete standalone HTML with exact styles and fonts embedded
    const fullHtml = `
<!DOCTYPE html>
<html lang="${lang === "ar" ? "ar" : "nl"}" dir="${lang === "ar" ? "rtl" : "ltr"}">
<head>
  <meta charset="utf-8">
  <title>SGN Contract - ${refNumber} - ${secondParty.name}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 14mm 10mm 14mm;
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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 9.8pt;
      line-height: 1.5;
    }
    .page-sheet {
      width: 100%;
      min-height: 275mm;
      padding: 10mm 12mm 10mm 12mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      break-after: page;
    }
    .page-sheet:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }
    .header-box {
      text-align: center;
      padding-bottom: 12px;
      margin-bottom: 12px;
      border-bottom: 2px solid #1a5632;
    }
    .header-logo {
      width: 60px;
      height: 60px;
      object-fit: contain;
      margin: 0 auto 6px auto;
      display: block;
    }
    .org-title {
      font-size: 13pt;
      font-weight: 900;
      color: #1a5632;
      letter-spacing: 0.3px;
    }
    .org-kvk {
      font-size: 8.5pt;
      color: #4b5563;
      font-family: monospace;
      margin-top: 2px;
    }
    .contract-title {
      font-size: 12pt;
      font-weight: 900;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: center;
      margin: 8px 0 4px 0;
    }
    .meta-bar {
      display: flex;
      justify-content: center;
      gap: 22px;
      font-size: 8.5pt;
      color: #4b5563;
      margin-bottom: 12px;
      text-align: center;
    }
    .parties-box {
      border: 1px solid #d1d5db;
      background-color: #f9fafb;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 12px;
      display: flex;
      gap: 18px;
    }
    .party-col {
      flex: 1;
      font-size: 8.8pt;
    }
    .party-heading {
      font-size: 9.5pt;
      font-weight: 800;
      color: #1a5632;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 3px;
      margin-bottom: 5px;
    }
    .party-name {
      font-weight: 800;
      color: #111827;
      font-size: 9.5pt;
      margin-bottom: 2px;
    }
    .party-details {
      color: #374151;
      line-height: 1.45;
    }
    .preamble {
      font-size: 8pt;
      color: #4b5563;
      background: #f3f4f6;
      border-radius: 4px;
      padding: 6px 10px;
      margin-bottom: 12px;
      line-height: 1.45;
    }
    .article {
      margin-bottom: 9px;
    }
    .article-title {
      font-size: 9pt;
      font-weight: 800;
      color: #1a5632;
      margin-bottom: 3px;
    }
    .article-p {
      font-size: 8.5pt;
      color: #1f2937;
      margin-bottom: 3px;
      line-height: 1.45;
    }
    .page-minimal-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: #6b7280;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 6px;
      margin-bottom: 12px;
    }
    .attestation-box {
      font-size: 8.8pt;
      color: #1f2937;
      line-height: 1.5;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      margin-top: 12px;
      margin-bottom: 16px;
    }
    .signatures-grid {
      display: flex;
      justify-content: space-between;
      gap: 35px;
      margin-top: 10px;
      position: relative;
    }
    .sig-col {
      flex: 1;
      position: relative;
    }
    .sig-label {
      font-size: 9pt;
      font-weight: 800;
      color: #111827;
      margin-bottom: 3px;
    }
    .sig-sub {
      font-size: 8.5pt;
      color: #4b5563;
      margin-bottom: 35px;
    }
    .sig-line {
      border-bottom: 1.5px solid #111827;
      width: 170px;
      margin-bottom: 4px;
    }
    .sig-date {
      font-size: 8pt;
      color: #6b7280;
    }
    .seal-img {
      position: absolute;
      top: 5px;
      right: 15px;
      width: 75px;
      height: 75px;
      opacity: 0.85;
      pointer-events: none;
    }
    .volunteer-sig-img {
      position: absolute;
      bottom: 18px;
      left: 10px;
      max-height: 45px;
      object-fit: contain;
    }
    .qr-verification {
      margin-top: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding-top: 10px;
      border-top: 1px solid #f3f4f6;
    }
    .qr-box {
      width: 44px;
      height: 44px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-text {
      font-size: 7.5pt;
      color: #6b7280;
      line-height: 1.35;
    }
    .footer-bar {
      border-top: 1px solid #e5e7eb;
      padding-top: 5px;
      margin-top: 15px;
      font-size: 7.5pt;
      color: #6b7280;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>
  ${printContent.innerHTML}
</body>
</html>
    `;

    doc.open();
    doc.write(fullHtml);
    doc.close();

    // Trigger print after ensuring all images and content are ready
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error("Print error:", e);
      } finally {
        setIsPrinting(false);
      }
    }, 400);
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
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-emerald-100">

      {/* ── TOP ACTION & NAVIGATION BAR ── */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-xs print:hidden">

        {/* Left: Back to Dashboard & Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition group"
            title={td("backToDashboardTitle")}
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
            <span>{td("backToDashboard")}</span>
          </Link>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
              {td("pageTitle")}
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:flex items-center gap-2">
              <span className="font-semibold text-emerald-800">{orgHeaderTitle}</span>
              <span>•</span>
              <span className="font-mono text-slate-600">KvK: {SGN_ORGANIZATION_INFO.kvkNumber}</span>
            </p>
          </div>
        </div>

        {/* Right: Quick Actions, Language, Signature, & Print */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Quick Load Maher Aslan */}
          <button
            onClick={handleLoadMaherAslan}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 text-xs font-semibold transition"
            title={td("maherTemplateTitle")}
          >
            <User className="w-3 h-3 text-emerald-600" />
            <span>{td("maherTemplate")}</span>
          </button>

          {/* Digital Signature Trigger */}
          <button
            onClick={() => setShowSignaturePad(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition ${
              volunteerSignature
                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : "border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
            }`}
            title={td("signTitle")}
          >
            <PenTool className="w-3.5 h-3.5 text-emerald-600" />
            <span>{volunteerSignature ? td("signed") : td("signOnScreen")}</span>
          </button>

          {/* Language Selector */}
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-bold">
            <button
              onClick={() => setLang("nl")}
              className={`px-2 py-1 rounded-md transition ${lang === "nl" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              Nederlands
            </button>
            <button
              onClick={() => setLang("ar")}
              className={`px-2 py-1 rounded-md transition ${lang === "ar" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              عربي
            </button>
            <button
              onClick={() => setLang("bilingual")}
              className={`px-2 py-1 rounded-md transition ${lang === "bilingual" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              ثنائي
            </button>
          </div>

          {/* Zoom & View Controls */}
          <div className="hidden md:flex items-center border border-slate-200 rounded-lg p-0.5 bg-white text-xs">
            <button
              onClick={() => setZoomLevel(Math.max(75, zoomLevel - 15))}
              className="p-1 hover:bg-slate-100 rounded text-slate-600"
              title={td("zoomOutTitle")}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] text-slate-600">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(Math.min(130, zoomLevel + 15))}
              className="p-1 hover:bg-slate-100 rounded text-slate-600"
              title={td("zoomInTitle")}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Primary Print Button */}
          <button
            onClick={handlePrintViaHiddenIframe}
            disabled={isPrinting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition transform active:scale-95 disabled:opacity-50"
          >
            {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            <span>{td("printPdf")}</span>
          </button>
        </div>
      </div>

      {/* ── WORKSPACE ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* ── LEFT PANEL: Controls ── */}
        <div className="w-full lg:w-[480px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0 h-[calc(100vh-60px)] print:hidden">

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50/70 p-1">
            <button
              onClick={() => setActiveTab("parties")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition ${activeTab === "parties" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{td("tabParties")}</span>
            </button>
            <button
              onClick={() => setActiveTab("articles")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition ${activeTab === "articles" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{td("tabArticles")}</span>
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition ${activeTab === "ai" ? "bg-amber-500 text-white shadow-xs" : "text-amber-700 hover:bg-amber-50"}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{td("tabAi")}</span>
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
                      <span>{td("linkMembers")}</span>
                    </label>
                    {loadingMembers && <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />}
                  </div>

                  <p className="text-[11px] text-emerald-800/80 mb-2.5">
                    {td("searchHint")}
                  </p>

                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder={td("searchPlaceholder")}
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
                    {td("secondPartyHeading")}
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                        {td("fullName")}
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
                        {td("referenceNumber")}
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
                        {td("birthDate")}
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
                        {td("address")}
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
                        {td("postcodeCity")}
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
                        {td("email")}
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
                        {td("phone")}
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
                        {td("department")}
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
                        {td("hoursPerWeek")}
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
                    {td("documentHeading")}
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                        {td("referenceNumber")}
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
                          title={td("randomRefTitle")}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                        {td("issueDate")}
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
                        {td("signatory")}
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
                      <span>{td("includeSeal")}</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={includeQr}
                        onChange={(e) => setIncludeQr(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{td("includeQr")}</span>
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
                    {td("articlesHeading")}
                  </h3>
                  <button
                    onClick={handleResetArticles}
                    className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1 font-bold"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{td("resetDefault")}</span>
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
                          title={td("deleteArticleTitle")}
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
                    <span>{td("addArticle")}</span>
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
                    <span>{td("aiTemplatesHeading")}</span>
                  </div>
                  <p className="text-[11px] text-amber-800/80 mb-3">
                    {td("aiTemplatesHint")}
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
                    {td("customPromptLabel")}
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={4}
                    placeholder={td("customPromptPlaceholder")}
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
                        <span>{td("aiGenerating")}</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        <span>{td("aiGenerateApply")}</span>
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
        <div className="flex-1 bg-slate-200/80 p-4 sm:p-8 overflow-y-auto flex flex-col items-center">

          {/* Scale wrapper based on zoom level */}
          <div
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center", transition: "transform 0.15s ease-out" }}
            className="w-full flex flex-col items-center"
          >

            {/* Wrapper for the printable content */}
            <div id="sgn-contract-print-content" className="space-y-8 w-full max-w-[210mm]">

              {/* ══════════════════════════════════════════════════════ */}
              {/* PAGE 1: HEADER, PARTIES, PREAMBLE, ARTICLES 1 - 5    */}
              {/* ══════════════════════════════════════════════════════ */}
              <div
                className="page-sheet bg-white shadow-xl mx-auto flex flex-col justify-between"
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
                  <div className="header-box text-center pb-4 mb-4 border-b-2 border-emerald-800">
                    <img
                      src="/logo.png"
                      alt="SGN Official Seal"
                      className="header-logo w-14 h-14 object-contain mx-auto mb-1.5 filter drop-shadow-xs"
                      onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                    />
                    <div className="org-title text-base font-black text-emerald-900 tracking-wide">
                      {orgHeaderTitle}
                    </div>
                    <div className="org-kvk text-[10px] text-slate-500 font-mono mt-0.5">
                      KvK-nummer: {SGN_ORGANIZATION_INFO.kvkNumber}
                    </div>
                  </div>

                  {/* ── TITLE & REFERENCE ── */}
                  <div className="text-center mb-4">
                    <h2 className="contract-title text-sm font-black text-slate-900 tracking-wider">
                      {contractDocTitle}
                    </h2>
                    <div className="meta-bar flex justify-center items-center gap-6 text-[10px] text-slate-600 mt-1 font-medium">
                      <span>{isNl ? "Referentie" : "الرقم المرجعي"}: <strong className="font-mono text-slate-900">{refNumber}</strong></span>
                      <span>{isNl ? "Datum" : "التاريخ"}: <strong className="text-slate-900">{issueDate}</strong></span>
                      <span>{isNl ? "Plaats" : "المكان"}: <strong className="text-slate-900">{city}</strong></span>
                    </div>
                  </div>

                  {/* ── PARTIES BOX (De Ondergetekenden) ── */}
                  <div className="parties-box border border-slate-300 rounded-lg p-3 bg-slate-50/80 mb-4 text-[10px] leading-relaxed">
                    <div className="text-[11px] font-bold text-emerald-900 mb-2 border-b border-slate-200 pb-1">
                      {isNl ? "De ondergetekenden (Partijen):" : "أطراف الاتفاقية:"}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Eerste Partij */}
                      <div className="party-col">
                        <div className="party-heading font-bold text-slate-900 mb-0.5">
                          {isNl ? "1. De Organisatie (Eerste Partij):" : "١. المنظمة (الطرف الأول):"}
                        </div>
                        <div className="party-name text-slate-800 font-bold">
                          {isNl ? SGN_ORGANIZATION_INFO.nameNl : SGN_ORGANIZATION_INFO.nameAr}
                        </div>
                        <div className="party-details text-slate-600 text-[9.5px]">
                          <div>{SGN_ORGANIZATION_INFO.street}, {SGN_ORGANIZATION_INFO.postcodeCity}</div>
                          <div>KvK: {SGN_ORGANIZATION_INFO.kvkNumber}</div>
                          <div>{isNl ? "Vertegenwoordigd door" : "يمثلها"}: <strong>{signatory.name}</strong> ({isNl ? signatory.titleNl : signatory.titleAr})</div>
                        </div>
                      </div>

                      {/* Tweede Partij */}
                      <div className="party-col" dir={isAr && !isBi ? "rtl" : "ltr"}>
                        <div className="party-heading font-bold text-slate-900 mb-0.5">
                          {isNl ? "2. De Vrijwilliger (Tweede Partij):" : "٢. المتطوع (الطرف الثاني):"}
                        </div>
                        <div className="party-name text-slate-800 font-bold">
                          {secondParty.name}
                        </div>
                        <div className="party-details text-slate-600 text-[9.5px]">
                          <div>{secondParty.address}, {secondPartyPostcode} {secondParty.city}</div>
                          <div>{isNl ? "Geboortedatum" : "تاريخ الميلاد"}: {secondParty.birthDate || "-"} | Ref: {secondParty.idNumber || "-"}</div>
                          <div>E-mail: {secondParty.email || "-"} | Tel: {secondParty.phone || "-"}</div>
                          <div>{isNl ? "Afdeling" : "القسم"}: <strong>{isAr ? selectedDeptObj?.labelAr : selectedDeptObj?.labelNl}</strong> ({hoursPerWeek} {isNl ? "uur/week" : "ساعة/أسبوع"})</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── PREAMBLE (Considerans) ── */}
                  <div className="preamble text-[9px] text-slate-600 bg-slate-100 rounded-md p-2 mb-3 leading-relaxed">
                    <strong>{isNl ? "In aanmerking nemende dat:" : "الديباجة والأساس القانوني:"}</strong>{" "}
                    {isNl
                      ? "Partijen deze vrijwilligersovereenkomst aangaan conform de toepasselijke Nederlandse wetgeving (waaronder de fiscale vrijwilligersregeling van de Belastingdienst en de AVG). Deze overeenkomst creëert uitdrukkelijk geen arbeidsovereenkomst in de zin van art. 7:610 Burgerlijk Wetboek."
                      : "أبرم الطرفان هذه الاتفاقية التطوعية وفقاً لأحكام القانون المدني الهولندي ولوائح مصلحة الضرائب وقانون حماية الخصوصية (AVG)، ولا تشكل هذه الاتفاقية بأي حال عقد عمل ملزم وفق المادة 7:610 من القانون المدني الهولندي."}
                  </div>

                  {/* ── ARTICLES 1 TO 5 ── */}
                  <div className="space-y-2.5">
                    {articles.slice(0, 5).map((art) => (
                      <div key={art.number} className="article text-[10px] leading-relaxed">
                        <div className="article-title font-bold text-emerald-900 mb-0.5">
                          {isNl ? art.titleNl : isAr ? art.titleAr : `${art.titleNl} — ${art.titleAr}`}
                        </div>

                        {isNl && art.paragraphsNl.map((p, idx) => (
                          <p key={idx} className="article-p text-slate-700 mb-0.5">{p}</p>
                        ))}

                        {isAr && !isBi && art.paragraphsAr.map((p, idx) => (
                          <p key={idx} dir="rtl" className="article-p text-slate-700 mb-0.5">{p}</p>
                        ))}

                        {isBi && (
                          <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                            <div>{art.paragraphsNl.map((p, i) => <p key={i} className="article-p text-slate-700 mb-0.5">{p}</p>)}</div>
                            <div dir="rtl" className="border-r border-slate-200 pr-2">{art.paragraphsAr.map((p, i) => <p key={i} className="article-p text-slate-600 mb-0.5">{p}</p>)}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── FOOTER (Page 1) ── */}
                <div className="footer-bar pt-3 border-t border-slate-200 text-center text-[8.5px] text-slate-500 flex justify-between items-center font-sans">
                  <span>{SGN_ORGANIZATION_INFO.street}, {SGN_ORGANIZATION_INFO.postcodeCity} • Tel: {SGN_ORGANIZATION_INFO.phone}</span>
                  <span>KvK: {SGN_ORGANIZATION_INFO.kvkNumber} • {SGN_ORGANIZATION_INFO.contactEmail} • {SGN_ORGANIZATION_INFO.website}</span>
                  <span className="font-bold">{isNl ? "Pagina 1 van 2" : "الصفحة ١ من ٢"}</span>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════ */}
              {/* PAGE 2: ARTICLES 6 - 9, ATTESTATION, SIGNATURES & SEAL*/}
              {/* ══════════════════════════════════════════════════════ */}
              <div
                className="page-sheet bg-white shadow-xl mx-auto flex flex-col justify-between"
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
                  <div className="page-minimal-bar flex justify-between items-center text-[9px] text-slate-400 pb-2 mb-4 border-b border-slate-200">
                    <span className="font-bold text-slate-700">{orgHeaderTitle}</span>
                    <span>Ref: {refNumber} — {secondParty.name}</span>
                  </div>

                  {/* ── REMAINING ARTICLES (6 TO END) ── */}
                  <div className="space-y-3 mb-6">
                    {articles.slice(5).map((art) => (
                      <div key={art.number} className="article text-[10px] leading-relaxed">
                        <div className="article-title font-bold text-emerald-900 mb-0.5">
                          {isNl ? art.titleNl : isAr ? art.titleAr : `${art.titleNl} — ${art.titleAr}`}
                        </div>

                        {isNl && art.paragraphsNl.map((p, idx) => (
                          <p key={idx} className="article-p text-slate-700 mb-0.5">{p}</p>
                        ))}

                        {isAr && !isBi && art.paragraphsAr.map((p, idx) => (
                          <p key={idx} dir="rtl" className="article-p text-slate-700 mb-0.5">{p}</p>
                        ))}

                        {isBi && (
                          <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                            <div>{art.paragraphsNl.map((p, i) => <p key={i} className="article-p text-slate-700 mb-0.5">{p}</p>)}</div>
                            <div dir="rtl" className="border-r border-slate-200 pr-2">{art.paragraphsAr.map((p, i) => <p key={i} className="article-p text-slate-600 mb-0.5">{p}</p>)}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* ── CLOSING ATTESTATION ── */}
                  <div className="attestation-box text-[9.5px] text-slate-800 leading-relaxed mb-6 pt-3 border-t border-slate-200">
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
                  <div className="signatures-section relative pt-2">
                    <div className="signatures-grid grid grid-cols-2 gap-10">

                      {/* SGN Bestuur Signature */}
                      <div className="sig-col relative">
                        <div className="sig-label text-[11px] font-bold text-slate-900 mb-1">
                          {isNl ? "Namens het Bestuur van SGN:" : "عن مجلس إدارة الجالية (الطرف الأول):"}
                        </div>
                        <div className="sig-sub text-[10px] text-slate-700 mb-10 leading-tight">
                          <strong>{signatory.name}</strong><br />
                          <span className="text-slate-500">{isNl ? signatory.titleNl : signatory.titleAr}</span>
                        </div>

                        <div className="sig-line border-b-2 border-slate-800 w-48 mb-1.5" />
                        <div className="sig-date text-[9px] text-slate-500">
                          {isNl ? "Handtekening & Stempel" : "التوقيع والختم الرسمي"}
                        </div>

                        {/* Official Circular Seal */}
                        {includeSeal && (
                          <div className="seal-img absolute top-2 right-4 w-20 h-20 opacity-85 pointer-events-none">
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
                      <div className="sig-col" dir={isAr && !isBi ? "rtl" : "ltr"}>
                        <div className="sig-label text-[11px] font-bold text-slate-900 mb-1">
                          {isNl ? "De Vrijwilliger (Tweede Partij):" : "المتطوع (الطرف الثاني):"}
                        </div>
                        <div className="sig-sub text-[10px] text-slate-700 mb-10 leading-tight">
                          <strong>{secondParty.name}</strong><br />
                          <span className="text-slate-500">Ref: {secondParty.idNumber || "-"}</span>
                        </div>

                        {/* If Live Signature Drawn */}
                        {volunteerSignature ? (
                          <div className="relative mb-2">
                            <img src={volunteerSignature} alt="Handtekening" className="volunteer-sig-img h-11 object-contain" />
                            <div className="sig-line border-b-2 border-slate-800 w-48 mb-1.5 pt-11" />
                          </div>
                        ) : (
                          <div className="sig-line border-b-2 border-slate-800 w-48 mb-1.5" />
                        )}

                        <div className="sig-date text-[9px] text-slate-500 flex items-center justify-between w-48">
                          <span>{isNl ? "Handtekening vrijwilliger" : "توقيع المتطوع"}</span>
                          {volunteerSignature && (
                            <button
                              onClick={() => setVolunteerSignature(null)}
                              className="text-[9px] text-red-500 hover:underline print:hidden"
                            >
                              {td("clearSignature")}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* QR Code Verification */}
                    {includeQr && (
                      <div className="qr-verification mt-8 flex items-center gap-3 pt-3 border-t border-slate-100">
                        <div className="qr-box w-12 h-12 border border-slate-300 rounded p-1 bg-white flex items-center justify-center flex-shrink-0">
                          <QrCode className="w-10 h-10 text-slate-800" />
                        </div>
                        <div className="qr-text text-[8.5px] text-slate-500 leading-tight">
                          <strong className="text-slate-700">{isNl ? "Digitale Verificatie" : "التحقق الرقمي الرسمي"}</strong><br />
                          KvK: {SGN_ORGANIZATION_INFO.kvkNumber} • Ref: {refNumber}<br />
                          {SGN_ORGANIZATION_INFO.website}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── FOOTER (Page 2) ── */}
                <div className="footer-bar pt-3 border-t border-slate-200 text-center text-[8.5px] text-slate-500 flex justify-between items-center font-sans">
                  <span>{SGN_ORGANIZATION_INFO.street}, {SGN_ORGANIZATION_INFO.postcodeCity} • Tel: {SGN_ORGANIZATION_INFO.phone}</span>
                  <span>KvK: {SGN_ORGANIZATION_INFO.kvkNumber} • {SGN_ORGANIZATION_INFO.contactEmail} • {SGN_ORGANIZATION_INFO.website}</span>
                  <span className="font-bold">{isNl ? "Pagina 2 van 2" : "الصفحة ٢ من ٢"}</span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* ── DIGITAL SIGNATURE MODAL ── */}
      {showSignaturePad && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-emerald-600" />
                <span>{td("signatureModalTitle")}</span>
              </h3>
              <button
                onClick={() => setShowSignaturePad(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              {td("signatureModalHint")}
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden flex justify-center">
              <canvas
                ref={signatureCanvasRef}
                width={380}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="cursor-crosshair bg-white touch-none"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={clearSignature}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{td("clearRedo")}</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowSignaturePad(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-100"
                >
                  {td("cancel")}
                </button>
                <button
                  onClick={saveSignature}
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs"
                >
                  {td("saveToContract")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
