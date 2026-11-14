"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import {
  Printer, FileText, RefreshCw, User, Building2, HandHeart,
  Calendar, Sparkles, Loader2, ChevronDown, Search, Check,
  Settings2, Eye, Download, Stamp, QrCode,
} from "lucide-react";
import {
  DOCUMENT_TEMPLATES, BOARD_OFFICERS, SGN_ORGANIZATION_INFO,
  OFFICIAL_VOLUNTEER_ARTICLES, VOLUNTEER_DEPARTMENTS,
  DocumentParty,
} from "@/lib/documents/templates";

// ============================================================
//  TYPES
// ============================================================
type LangMode = "nl" | "ar" | "bilingual";
type TemplateId = string;

interface MemberOption {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  birthDate?: string;
  membershipNumber?: string;
  role?: string;
}

// ============================================================
//  HELPERS
// ============================================================
function newRef() {
  return `SGN-DOC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function formatDateNl(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

// ============================================================
//  PRINT STYLES (injected once)
// ============================================================
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #sgn-print-area, #sgn-print-area * { visibility: visible !important; }
  #sgn-print-area {
    position: fixed !important;
    inset: 0 !important;
    width: 210mm !important;
    min-height: 297mm !important;
    margin: 0 auto !important;
    padding: 0 !important;
    background: white !important;
    font-family: 'Almarai', 'Noto Sans Arabic', Arial, sans-serif !important;
  }
  .no-print { display: none !important; }
  .page-break { page-break-before: always; }
}
`;

// ============================================================
//  CONTRACT DOCUMENT COMPONENT (what gets printed)
// ============================================================
interface ContractDocProps {
  lang: LangMode;
  templateId: TemplateId;
  refNumber: string;
  issueDate: string;
  city: string;
  secondParty: DocumentParty;
  signatory: typeof BOARD_OFFICERS[0];
  department: string;
  hoursPerWeek: string;
  includeSeal: boolean;
  includeQr: boolean;
  customNotes: string;
  aiContent: string;
}

function ContractDocument(props: ContractDocProps) {
  const { lang, templateId, refNumber, issueDate, city, secondParty,
    signatory, department, hoursPerWeek, includeSeal, includeQr,
    customNotes, aiContent } = props;

  const isAr = lang === "ar" || lang === "bilingual";
  const isNl = lang === "nl" || lang === "bilingual";
  const isBi = lang === "bilingual";
  const orgName = isAr ? SGN_ORGANIZATION_INFO.nameAr : SGN_ORGANIZATION_INFO.nameNl;
  const template = DOCUMENT_TEMPLATES.find(t => t.id === templateId) || DOCUMENT_TEMPLATES[0];
  const deptObj = VOLUNTEER_DEPARTMENTS.find(d => d.id === department);
  const deptLabel = isAr ? deptObj?.labelAr : deptObj?.labelNl;
  const dateFormatted = formatDateNl(issueDate);

  return (
    <div
      id="sgn-print-area"
      dir={isAr && !isBi ? "rtl" : "ltr"}
      className="bg-white font-sans"
      style={{ width: "210mm", minHeight: "297mm", margin: "0 auto", fontFamily: "Almarai, 'Noto Sans Arabic', Arial, sans-serif" }}
    >
      {/* ── PAGE 1 ─────────────────────────────────────── */}
      <div style={{ padding: "20mm 18mm 15mm", minHeight: "250mm", position: "relative" }}>

        {/* ── HEADER (first page only) ── */}
        <div style={{ textAlign: "center", marginBottom: "12mm", borderBottom: "2px solid #1a7a3f", paddingBottom: "6mm" }}>
          <img
            src="/logo.png"
            alt="SGN Logo"
            style={{ width: "60px", height: "60px", objectFit: "contain", margin: "0 auto 6px", display: "block" }}
            onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
          />
          <div style={{ fontSize: "15px", fontWeight: 900, color: "#1a7a3f", letterSpacing: "0.3px" }}>
            {isNl && <div>De Syrische Gemeenschap in Nederland</div>}
            {isAr && <div dir="rtl">منظمة الجالية السورية في هولندا</div>}
          </div>
          <div style={{ fontSize: "10px", color: "#666", marginTop: "3px" }}>
            KvK: {SGN_ORGANIZATION_INFO.kvkNumber}
          </div>
        </div>

        {/* ── CONTRACT TITLE ── */}
        <div style={{ textAlign: "center", marginBottom: "8mm" }}>
          <div style={{ fontSize: "14px", fontWeight: 800, color: "#111", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {isNl && template.titleNl}
            {isAr && !isBi && template.titleAr}
            {isBi && <>{template.titleNl}<br /><span dir="rtl">{template.titleAr}</span></>}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "5px", fontSize: "9px", color: "#555" }}>
            <span>{isNl ? "Referentie" : "المرجع"}: <strong>{refNumber}</strong></span>
            <span>{isNl ? "Datum" : "التاريخ"}: <strong>{dateFormatted}</strong></span>
            <span>{isNl ? "Plaats" : "المكان"}: <strong>{city}</strong></span>
          </div>
        </div>

        {/* ── PARTIES ── */}
        <div style={{ border: "1px solid #ddd", borderRadius: "6px", padding: "5mm 6mm", marginBottom: "7mm", background: "#fafafa", fontSize: "10px" }}>
          <div style={{ fontWeight: 800, fontSize: "11px", color: "#1a7a3f", marginBottom: "4mm", borderBottom: "1px solid #e0e0e0", paddingBottom: "2mm" }}>
            {isNl ? "Partijen" : "أطراف العقد"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5mm" }}>
            {/* First Party */}
            <div>
              <div style={{ fontWeight: 700, color: "#333", marginBottom: "2mm" }}>
                {isNl ? "Eerste Partij (Organisatie)" : "الطرف الأول (المنظمة)"}
              </div>
              <div><strong>{isNl ? SGN_ORGANIZATION_INFO.nameNl : SGN_ORGANIZATION_INFO.nameAr}</strong></div>
              <div style={{ color: "#555", lineHeight: 1.7 }}>
                <div>{SGN_ORGANIZATION_INFO.street}</div>
                <div>{SGN_ORGANIZATION_INFO.postcodeCity}</div>
                <div>KvK: {SGN_ORGANIZATION_INFO.kvkNumber}</div>
                <div>{SGN_ORGANIZATION_INFO.contactEmail}</div>
              </div>
              <div style={{ marginTop: "2mm", fontWeight: 600, color: "#1a7a3f" }}>
                {isNl ? "Vertegenwoordigd door" : "ممثلاً بـ"}: {signatory.name}
              </div>
              <div style={{ fontSize: "9px", color: "#666" }}>
                {isNl ? signatory.titleNl : signatory.titleAr}
              </div>
            </div>
            {/* Second Party */}
            <div dir={isAr && !isBi ? "rtl" : "ltr"}>
              <div style={{ fontWeight: 700, color: "#333", marginBottom: "2mm" }}>
                {isNl ? "Tweede Partij (Vrijwilliger)" : "الطرف الثاني (المتطوع)"}
              </div>
              <div><strong>{secondParty.name}</strong></div>
              <div style={{ color: "#555", lineHeight: 1.7 }}>
                {secondParty.address && <div>{secondParty.address}</div>}
                {secondParty.city && <div>{secondParty.city}</div>}
                {secondParty.email && <div>{secondParty.email}</div>}
                {secondParty.phone && <div>{secondParty.phone}</div>}
                {secondParty.birthDate && (
                  <div>{isNl ? "Geboortedatum" : "تاريخ الميلاد"}: {formatDateNl(secondParty.birthDate)}</div>
                )}
                {secondParty.idNumber && (
                  <div>{isNl ? "Referentie" : "الرقم المرجعي"}: {secondParty.idNumber}</div>
                )}
              </div>
              {templateId === "volunteer_agreement" && (
                <div style={{ marginTop: "2mm", fontWeight: 600, color: "#1a7a3f", fontSize: "9px" }}>
                  {isNl ? "Afdeling" : "القسم"}: {deptLabel}
                  {hoursPerWeek && <span> • {isNl ? "Uren/week" : "ساعات/أسبوع"}: {hoursPerWeek}</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── LEGAL BASIS ── */}
        <div style={{ fontSize: "8.5px", color: "#777", background: "#f5f5f5", borderRadius: "4px", padding: "3mm 4mm", marginBottom: "5mm", lineHeight: 1.5 }}>
          <strong>{isNl ? "Juridische grondslag" : "الأساس القانوني"}:</strong>{" "}
          {isNl ? template.legalBasisNl : template.legalBasisAr}
        </div>

        {/* ── AI CUSTOM CONTENT (if any) ── */}
        {aiContent && (
          <div style={{ background: "#fffbeb", border: "1px solid #f0d070", borderRadius: "5px", padding: "4mm", marginBottom: "5mm", fontSize: "10px", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {aiContent}
          </div>
        )}

        {/* ── ARTICLES ── */}
        {templateId === "volunteer_agreement" && OFFICIAL_VOLUNTEER_ARTICLES.map((article) => (
          <div key={article.number} style={{ marginBottom: "5mm" }}>
            <div style={{ fontWeight: 800, fontSize: "11px", color: "#1a7a3f", marginBottom: "2mm" }}>
              {isNl && article.titleNl}
              {isAr && !isBi && <span dir="rtl">{article.titleAr}</span>}
              {isBi && <>{article.titleNl} | <span dir="rtl">{article.titleAr}</span></>}
            </div>
            {isNl && article.paragraphsNl.map((p, i) => (
              <div key={i} style={{ fontSize: "10px", lineHeight: 1.75, color: "#333", marginBottom: "1.5mm" }}>{p}</div>
            ))}
            {isAr && !isBi && article.paragraphsAr.map((p, i) => (
              <div key={i} dir="rtl" style={{ fontSize: "10px", lineHeight: 1.9, color: "#333", marginBottom: "1.5mm" }}>{p}</div>
            ))}
            {isBi && (
              <>
                {article.paragraphsNl.map((p, i) => (
                  <div key={"nl-" + i} style={{ fontSize: "9.5px", lineHeight: 1.75, color: "#333", marginBottom: "1mm" }}>{p}</div>
                ))}
                {article.paragraphsAr.map((p, i) => (
                  <div key={"ar-" + i} dir="rtl" style={{ fontSize: "9.5px", lineHeight: 1.9, color: "#555", marginBottom: "1mm", paddingRight: "10px", borderRight: "2px solid #1a7a3f" }}>{p}</div>
                ))}
              </>
            )}
          </div>
        ))}

        {/* Custom Notes */}
        {customNotes && (
          <div style={{ marginBottom: "5mm", padding: "3mm 4mm", border: "1px dashed #aaa", borderRadius: "4px", fontSize: "10px", lineHeight: 1.7 }}>
            <strong>{isNl ? "Aanvullende opmerkingen" : "ملاحظات إضافية"}:</strong>
            <div style={{ marginTop: "2mm", whiteSpace: "pre-wrap" }}>{customNotes}</div>
          </div>
        )}
      </div>

      {/* ── PAGE BREAK → SIGNATURES PAGE ── */}
      <div className="page-break" style={{ pageBreakBefore: "always" }} />

      {/* ── SIGNATURES PAGE ── */}
      <div style={{ padding: "20mm 18mm 15mm" }}>

        {/* Attestation text */}
        <div style={{ fontSize: "10.5px", lineHeight: 1.9, marginBottom: "12mm", color: "#222" }}>
          {isNl ? (
            <p>
              Ondergetekenden verklaren dat zij kennis hebben genomen van de inhoud van deze overeenkomst en ermee instemmen. Beide partijen ondertekenen deze overeenkomst als blijk van hun akkoord en verbintenis aan de daarin opgenomen voorwaarden, conform de toepasselijke Nederlandse wetgeving.
            </p>
          ) : (
            <p dir="rtl">
              أفاد الطرفان بأنهما اطلعا على مضمون هذه الاتفاقية وقبلا بكافة بنودها وشروطها وفق ما أوردته، وأقرّا بذلك بتوقيعهما أدناه، وفقاً لأحكام القانون المدني الهولندي والتشريعات ذات الصلة.
            </p>
          )}
          {isBi && (
            <p dir="rtl" style={{ marginTop: "5px", color: "#444", fontSize: "10px" }}>
              أفاد الطرفان بأنهما اطلعا على مضمون هذه الاتفاقية وقبلا بكافة بنودها وشروطها وأقرّا بذلك بتوقيعهما أدناه.
            </p>
          )}
        </div>

        {/* Signature blocks */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15mm", marginBottom: "15mm" }}>
          {/* Org side */}
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#333", marginBottom: "2mm" }}>
              {isNl ? "Namens de organisatie" : "عن الطرف الأول / المنظمة"}
            </div>
            <div style={{ fontSize: "9.5px", color: "#555", marginBottom: "12mm", lineHeight: 1.5 }}>
              <div><strong>{signatory.name}</strong></div>
              <div>{isNl ? signatory.titleNl : signatory.titleAr}</div>
              <div style={{ marginTop: "2px", color: "#1a7a3f" }}>{isNl ? SGN_ORGANIZATION_INFO.nameNl : SGN_ORGANIZATION_INFO.nameAr}</div>
            </div>
            {/* Signature line */}
            <div style={{ borderBottom: "1.5px solid #333", width: "100%", marginBottom: "3mm" }} />
            <div style={{ fontSize: "9px", color: "#666" }}>
              {isNl ? "Handtekening & Datum" : "التوقيع والتاريخ"}: ___________
            </div>
            {/* Official seal */}
            {includeSeal && (
              <div style={{
                position: "absolute", top: "-8px", right: "0",
                width: "65px", height: "65px", opacity: 0.85
              }}>
                <img src="/logo.png" alt="Seal" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "opacity(0.6)" }}
                  onError={(e) => { (e.target as HTMLElement).style.display = "none"; }} />
              </div>
            )}
          </div>

          {/* Second party side */}
          <div dir={isAr && !isBi ? "rtl" : "ltr"}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#333", marginBottom: "2mm" }}>
              {isNl ? "De vrijwilliger / Tweede partij" : "الطرف الثاني / المتطوع"}
            </div>
            <div style={{ fontSize: "9.5px", color: "#555", marginBottom: "12mm", lineHeight: 1.5 }}>
              <div><strong>{secondParty.name}</strong></div>
              {secondParty.idNumber && <div>{isNl ? "Ref." : "رقم"}: {secondParty.idNumber}</div>}
              {secondParty.email && <div>{secondParty.email}</div>}
            </div>
            <div style={{ borderBottom: "1.5px solid #333", width: "100%", marginBottom: "3mm" }} />
            <div style={{ fontSize: "9px", color: "#666" }}>
              {isNl ? "Handtekening & Datum" : "التوقيع والتاريخ"}: ___________
            </div>
          </div>
        </div>

        {/* QR placeholder */}
        {includeQr && (
          <div style={{ textAlign: "center", marginBottom: "8mm" }}>
            <div style={{ display: "inline-block", border: "1px solid #ccc", padding: "5px", borderRadius: "4px" }}>
              <QrCode style={{ width: "40px", height: "40px", color: "#333" }} />
            </div>
            <div style={{ fontSize: "8px", color: "#999", marginTop: "3px" }}>
              {isNl ? "Digitale verificatie" : "تحقق رقمي"} · {SGN_ORGANIZATION_INFO.website}
            </div>
          </div>
        )}

        {/* Footer (every page — here on signature page) */}
        <div style={{
          position: "absolute", bottom: "10mm", left: "18mm", right: "18mm",
          borderTop: "1px solid #ddd", paddingTop: "3mm",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: "8px", color: "#888"
        }}>
          <span>{SGN_ORGANIZATION_INFO.nameNl} · KvK {SGN_ORGANIZATION_INFO.kvkNumber}</span>
          <span>{SGN_ORGANIZATION_INFO.street}, {SGN_ORGANIZATION_INFO.postcodeCity}</span>
          <span>{SGN_ORGANIZATION_INFO.contactEmail} · {SGN_ORGANIZATION_INFO.website}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  MAIN PAGE
// ============================================================
export default function DocumentsGeneratorPage() {
  const locale = useLocale() as "ar" | "nl" | "en";
  const isAr = locale === "ar";

  // ── Settings ──
  const [templateId, setTemplateId] = useState<TemplateId>("volunteer_agreement");
  const [lang, setLang] = useState<LangMode>("nl");
  const [refNumber, setRefNumber] = useState(newRef());
  const [issueDate, setIssueDate] = useState(today());
  const [city, setCity] = useState("Den Haag");
  const [includeSeal, setIncludeSeal] = useState(true);
  const [includeQr, setIncludeQr] = useState(true);
  const [department, setDepartment] = useState("media");
  const [hoursPerWeek, setHoursPerWeek] = useState("10-12");
  const [customNotes, setCustomNotes] = useState("");

  // ── Signatory ──
  const [signatoryIdx, setSignatoryIdx] = useState(0);
  const signatory = BOARD_OFFICERS[signatoryIdx];

  // ── Members from DB ──
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [volunteers, setVolunteers] = useState<MemberOption[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  // ── Second Party ──
  const [secondParty, setSecondParty] = useState<DocumentParty>({
    name: "",
    idNumber: "",
    birthDate: "",
    address: "",
    city: "",
    email: "",
    phone: "",
    roleOrTitle: "",
  });

  // ── AI ──
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiContent, setAiContent] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);

  // ── Preview tab ──
  const [activeTab, setActiveTab] = useState<"settings" | "preview">("settings");

  // Fetch members & volunteers on mount
  useEffect(() => {
    setLoadingMembers(true);
    Promise.all([
      fetch("/api/members?limit=100").then(r => r.json()).catch(() => ({ members: [] })),
      fetch("/api/volunteer?limit=100").then(r => r.json()).catch(() => ({ volunteers: [] })),
    ]).then(([mRes, vRes]) => {
      const ms: MemberOption[] = (mRes.members || []).map((m: any) => ({
        id: m.id,
        name: m.name || m.fullName || "",
        email: m.email || "",
        phone: m.phone || m.phoneNumber || "",
        address: m.address || "",
        city: m.city || "",
        birthDate: m.birthDate || m.dateOfBirth || "",
        membershipNumber: m.membershipNumber || m.id,
        role: "lid",
      }));
      const vs: MemberOption[] = (vRes.volunteers || []).map((v: any) => ({
        id: v.id,
        name: v.name || v.fullName || "",
        email: v.email || "",
        phone: v.phone || "",
        address: v.address || "",
        city: v.city || "",
        birthDate: v.birthDate || "",
        membershipNumber: v.volunteerId || v.id,
        role: "vrijwilliger",
      }));
      setMembers(ms);
      setVolunteers(vs);
      setLoadingMembers(false);
    });
  }, []);

  // Combined member list for search
  const allPeople: MemberOption[] = [...volunteers, ...members];
  const filteredPeople = memberSearch.length > 1
    ? allPeople.filter(p => p.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      p.email?.toLowerCase().includes(memberSearch.toLowerCase()))
    : allPeople.slice(0, 20);

  // Auto-fill second party from selected member
  const selectMember = useCallback((person: MemberOption) => {
    setSecondParty({
      name: person.name,
      idNumber: person.membershipNumber || person.id,
      birthDate: person.birthDate || "",
      address: person.address || "",
      city: person.city || "",
      email: person.email || "",
      phone: person.phone || "",
      roleOrTitle: person.role || "",
    });
    setMemberSearch(person.name);
    setShowMemberDropdown(false);
  }, []);

  // AI generation
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAi(true);
    try {
      const res = await fetch("/api/documents/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          userPrompt: aiPrompt,
          secondPartyName: secondParty.name,
          language: lang,
        }),
      });
      const data = await res.json();
      setAiContent(data.content || data.text || "");
    } catch {
      setAiContent("");
    } finally {
      setGeneratingAi(false);
    }
  };

  // Print
  const handlePrint = () => {
    // Inject print CSS if not already there
    if (!document.getElementById("sgn-print-css")) {
      const style = document.createElement("style");
      style.id = "sgn-print-css";
      style.textContent = PRINT_CSS;
      document.head.appendChild(style);
    }
    window.print();
  };

  const currentTemplate = DOCUMENT_TEMPLATES.find(t => t.id === templateId) || DOCUMENT_TEMPLATES[0];

  // ── UI ──────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen bg-gray-50 ${isAr ? "font-arabic" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-emerald-700" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {isAr ? "محرر الوثائق والعقود الرسمية" : "Document & Contract Generator"}
            </h1>
            <p className="text-xs text-gray-500">
              {isAr ? "منظمة الجالية السورية في هولندا" : "De Syrische Gemeenschap in Nederland"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab(activeTab === "settings" ? "preview" : "settings")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 transition"
          >
            {activeTab === "settings" ? <Eye className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
            {activeTab === "settings" ? (isAr ? "معاينة" : "Preview") : (isAr ? "الإعدادات" : "Settings")}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800 transition"
          >
            <Printer className="w-4 h-4" />
            {isAr ? "طباعة / PDF" : "Afdrukken / PDF"}
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-72px)] no-print">
        {/* ── LEFT PANEL: Settings ───────────────────── */}
        {activeTab === "settings" && (
          <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
            <div className="p-5 space-y-6">

              {/* Template Selector */}
              <Section title={isAr ? "نوع الوثيقة" : "Type document"} icon={<FileText className="w-4 h-4" />}>
                <div className="grid grid-cols-1 gap-2">
                  {DOCUMENT_TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTemplateId(t.id)}
                      className={`text-left px-3 py-2.5 rounded-lg border text-sm transition ${templateId === t.id
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold"
                        : "border-gray-200 hover:border-emerald-300 text-gray-700"
                        }`}
                    >
                      <div className="font-medium">{isAr ? t.titleAr : t.titleNl}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{t.badge}</div>
                    </button>
                  ))}
                </div>
              </Section>

              {/* Language */}
              <Section title={isAr ? "لغة العقد" : "Taal contract"} icon={<Building2 className="w-4 h-4" />}>
                <div className="flex gap-2">
                  {(["nl", "ar", "bilingual"] as LangMode[]).map(l => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition ${lang === l
                        ? "bg-emerald-700 text-white border-emerald-700"
                        : "border-gray-300 text-gray-600 hover:border-emerald-400"
                        }`}
                    >
                      {l === "nl" ? "Nederlands" : l === "ar" ? "عربي" : "ثنائي / Bi"}
                    </button>
                  ))}
                </div>
              </Section>

              {/* Basic info */}
              <Section title={isAr ? "بيانات الوثيقة" : "Document gegevens"} icon={<Calendar className="w-4 h-4" />}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">{isAr ? "الرقم المرجعي" : "Referentie"}</label>
                    <div className="flex gap-1">
                      <input value={refNumber} onChange={e => setRefNumber(e.target.value)}
                        className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs font-mono" />
                      <button onClick={() => setRefNumber(newRef())} className="p-1.5 border rounded text-gray-400 hover:text-emerald-700">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">{isAr ? "التاريخ" : "Datum"}</label>
                    <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">{isAr ? "المكان" : "Plaats"}</label>
                    <input value={city} onChange={e => setCity(e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs" />
                  </div>
                  {templateId === "volunteer_agreement" && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">{isAr ? "ساعات/أسبوع" : "Uren/week"}</label>
                      <input value={hoursPerWeek} onChange={e => setHoursPerWeek(e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs" placeholder="10-12" />
                    </div>
                  )}
                </div>
                {templateId === "volunteer_agreement" && (
                  <div className="mt-3">
                    <label className="text-xs text-gray-500 mb-1 block">{isAr ? "القسم" : "Afdeling"}</label>
                    <select value={department} onChange={e => setDepartment(e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs">
                      {VOLUNTEER_DEPARTMENTS.map(d => (
                        <option key={d.id} value={d.id}>{isAr ? d.labelAr : d.labelNl}</option>
                      ))}
                    </select>
                  </div>
                )}
              </Section>

              {/* Second Party — with smart member search */}
              <Section title={isAr ? "الطرف الثاني" : "Tweede partij"} icon={<User className="w-4 h-4" />}>
                {/* Smart Search */}
                <div className="relative mb-3">
                  <label className="text-xs text-gray-500 mb-1 block">
                    {isAr ? "🔍 ابحث عن عضو أو متطوع" : "🔍 Zoek lid of vrijwilliger"}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                    <input
                      value={memberSearch}
                      onChange={e => { setMemberSearch(e.target.value); setShowMemberDropdown(true); }}
                      onFocus={() => setShowMemberDropdown(true)}
                      placeholder={isAr ? "اكتب اسماً..." : "Typ een naam..."}
                      className="w-full border border-emerald-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                    />
                    {loadingMembers && <Loader2 className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 animate-spin" />}
                  </div>
                  {showMemberDropdown && filteredPeople.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-52 overflow-y-auto mt-1">
                      {filteredPeople.map(p => (
                        <button
                          key={p.id}
                          onClick={() => selectMember(p)}
                          className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 border-b border-gray-100 last:border-0 transition"
                        >
                          <div className="font-medium text-sm text-gray-800">{p.name}</div>
                          <div className="text-xs text-gray-500 flex gap-2">
                            <span className="bg-gray-100 px-1 rounded">{p.role}</span>
                            {p.email && <span>{p.email}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Manual fields */}
                <div className="space-y-2.5">
                  {([
                    ["name", isAr ? "الاسم الكامل" : "Volledige naam"],
                    ["idNumber", isAr ? "الرقم المرجعي" : "Referentienummer"],
                    ["email", isAr ? "البريد الإلكتروني" : "E-mail"],
                    ["phone", isAr ? "رقم الهاتف" : "Telefoonnummer"],
                    ["address", isAr ? "العنوان" : "Adres"],
                    ["city", isAr ? "المدينة" : "Plaats"],
                    ["birthDate", isAr ? "تاريخ الميلاد" : "Geboortedatum"],
                    ["roleOrTitle", isAr ? "الدور / المسمى" : "Functie / Rol"],
                  ] as [keyof DocumentParty, string][]).map(([field, label]) => (
                    <div key={field}>
                      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                      <input
                        type={field === "birthDate" ? "date" : "text"}
                        value={secondParty[field] || ""}
                        onChange={e => setSecondParty(prev => ({ ...prev, [field]: e.target.value }))}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-emerald-400 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </Section>

              {/* Signatory */}
              <Section title={isAr ? "الموقّع عن الجالية" : "Ondertekenaar organisatie"} icon={<Stamp className="w-4 h-4" />}>
                <select value={signatoryIdx} onChange={e => setSignatoryIdx(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm">
                  {BOARD_OFFICERS.map((o, i) => (
                    <option key={i} value={i}>{o.name} — {isAr ? o.titleAr : o.titleNl}</option>
                  ))}
                </select>
              </Section>

              {/* Options */}
              <Section title={isAr ? "خيارات العرض" : "Weergave opties"} icon={<Settings2 className="w-4 h-4" />}>
                <div className="space-y-2">
                  <Toggle label={isAr ? "الختم الرسمي" : "Officieel stempel"} checked={includeSeal} onChange={setIncludeSeal} />
                  <Toggle label={isAr ? "رمز QR للتحقق" : "QR verificatiecode"} checked={includeQr} onChange={setIncludeQr} />
                </div>
                <div className="mt-3">
                  <label className="text-xs text-gray-500 mb-1 block">{isAr ? "ملاحظات إضافية" : "Aanvullende opmerkingen"}</label>
                  <textarea value={customNotes} onChange={e => setCustomNotes(e.target.value)} rows={3}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm resize-none" />
                </div>
              </Section>

              {/* AI Generation */}
              <Section title={isAr ? "✨ توليد بالذكاء الاصطناعي" : "✨ AI-gegenereerde clausule"} icon={<Sparkles className="w-4 h-4 text-amber-500" />}>
                <p className="text-xs text-gray-500 mb-2">
                  {isAr
                    ? "اكتب توجيهاً محدداً وسيقوم الذكاء الاصطناعي بإضافة بنود أو ملاحق خاصة للعقد."
                    : "Schrijf een instructie en de AI voegt een clausule of bijlage toe aan het contract."}
                </p>
                <textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  rows={3}
                  placeholder={isAr ? "مثال: أضف بنداً خاصاً بحضور الفعاليات الإلزامي..." : "Bijv: Voeg een clausule toe over verplichte aanwezigheid..."}
                  className="w-full border border-amber-200 bg-amber-50 rounded px-2.5 py-2 text-sm resize-none focus:ring-1 focus:ring-amber-400 focus:outline-none"
                />
                <button
                  onClick={handleAiGenerate}
                  disabled={generatingAi || !aiPrompt.trim()}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50 transition"
                >
                  {generatingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isAr ? "توليد الآن" : "Genereer nu"}
                </button>
                {aiContent && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                    <Check className="w-3 h-3 inline mr-1" />
                    {isAr ? "تم إضافة المحتوى إلى العقد ✓" : "Inhoud toegevoegd aan contract ✓"}
                    <button onClick={() => setAiContent("")} className="ml-2 text-red-500 underline text-xs">
                      {isAr ? "حذف" : "Verwijder"}
                    </button>
                  </div>
                )}
              </Section>

            </div>
          </div>
        )}

        {/* ── RIGHT PANEL: Preview ────────────────────── */}
        <div className={`flex-1 overflow-auto bg-gray-100 p-6 ${activeTab === "settings" ? "" : "w-full"}`}>
          <div className="shadow-2xl rounded-sm overflow-hidden">
            <ContractDocument
              lang={lang}
              templateId={templateId}
              refNumber={refNumber}
              issueDate={issueDate}
              city={city}
              secondParty={secondParty}
              signatory={signatory}
              department={department}
              hoursPerWeek={hoursPerWeek}
              includeSeal={includeSeal}
              includeQr={includeQr}
              customNotes={customNotes}
              aiContent={aiContent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helper Components ─────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
        <span className="text-emerald-700">{icon}</span>
        <span className="text-sm font-bold text-gray-700">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer select-none">
      <span className="text-sm text-gray-700">{label}</span>
      <div
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full transition-colors relative ${checked ? "bg-emerald-600" : "bg-gray-300"}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </div>
    </label>
  );
}
