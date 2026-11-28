"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits, hasArabicCharacters } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import {
  V2Dialog, V2Field, V2IconButton, V2PrimaryButton, v2Api, v2InputClass,
} from "@/components/dashboard/v2-form";
import {
  PenTool, Plus, Printer, RefreshCw, Search, Trash2, User,
} from "lucide-react";
import {
  OFFICIAL_VOLUNTEER_ARTICLES,
  SGN_ORGANIZATION_INFO,
  DOCUMENT_TEMPLATES,
} from "@/lib/documents/templates";

type LangMode = "nl" | "ar" | "bilingual";
type Article = {
  number: number;
  titleNl: string;
  titleAr: string;
  paragraphsNl: string[];
  paragraphsAr: string[];
};
type Signatory = {
  id: string;
  nameAr: string;
  nameEn: string;
  titleAr?: string | null;
  titleEn?: string | null;
};
type PartyOption = {
  id: string;
  source: "member" | "volunteer";
  nameAr: string;
  nameNl: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  birthDate: string;
  department: string;
};

const TEMPLATE_KEYS = [
  "volunteerAgreement", "membershipApplication", "confidentialityAvg", "boardResolution",
  "volunteerCertificate", "membershipStatement", "officialAuthorization", "boardMinutes",
] as const;
const DEPARTMENT_KEYS = ["media", "ict", "events", "projects", "other"] as const;
const TEMPLATE_CATEGORY: Record<string, string> = {
  volunteer_agreement: "volunteer",
  membership_application: "membership",
  confidentiality_avg: "volunteer",
  board_resolution: "board",
  volunteer_certificate: "statements",
  membership_statement: "statements",
  official_authorization: "board",
  board_minutes: "board",
};

function freshArticles(): Article[] {
  return OFFICIAL_VOLUNTEER_ARTICLES.map((article) => ({
    number: article.number,
    titleNl: article.titleNl,
    titleAr: article.titleAr,
    paragraphsNl: [...article.paragraphsNl],
    paragraphsAr: [...article.paragraphsAr],
  }));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char] ?? char));
}

function textLines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

export default function V2DocumentsGeneratorPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.documents-generator");
  const td = useTranslations("dashboardDocs");
  const locale = useLocale();

  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [parties, setParties] = useState<PartyOption[]>([]);
  const [partyQuery, setPartyQuery] = useState("");
  const [partySearch, setPartySearch] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const [templateId, setTemplateId] = useState("volunteer_agreement");
  const [langMode, setLangMode] = useState<LangMode>(locale === "ar" ? "ar" : "nl");
  const [signatoryId, setSignatoryId] = useState("");
  const [partyId, setPartyId] = useState("");
  const [form, setForm] = useState({
    name: "", address: "", city: "", email: "", phone: "", birthDate: "",
    department: "media", hours: "", refNumber: "", issueDate: new Date().toISOString().slice(0, 10),
    issueCity: SGN_ORGANIZATION_INFO.postcodeCity, subject: "", notes: "",
  });
  const [includeSeal, setIncludeSeal] = useState(true);
  const [includeQr, setIncludeQr] = useState(false);
  const [articles, setArticles] = useState<Article[]>(freshArticles);
  const [signature, setSignature] = useState<string | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    setLangMode(locale === "ar" ? "ar" : "nl");
  }, [locale]);

  useEffect(() => {
    const timer = setTimeout(() => setPartySearch(partyQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [partyQuery]);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    setDataError(false);
    const params = new URLSearchParams({ limit: "100" });
    if (partySearch) params.set("search", partySearch);
    try {
      const [board, members, volunteers] = await Promise.allSettled([
        v2Api<Signatory[]>("/api/board"),
        v2Api<{ members?: any[] }>(`/api/members?${params.toString()}`),
        v2Api<{ volunteers?: any[] }>(`/api/volunteer?${params.toString()}`),
      ]);
      if (board.status === "fulfilled") setSignatories(board.value ?? []);
      if (members.status === "rejected" && volunteers.status === "rejected") setDataError(true);

      const options: PartyOption[] = [];
      if (members.status === "fulfilled") {
        for (const member of members.value.members ?? []) {
          const nameAr = String(member.nameAr ?? "");
          const nameNl = String(member.nameNl ?? "");
          if (locale !== "ar" && hasArabicCharacters(nameNl || nameAr)) continue;
          options.push({
            id: `member:${member.id}`,
            source: "member",
            nameAr,
            nameNl,
            email: String(member.email ?? ""),
            phone: String(member.whatsapp ?? ""),
            address: String(member.address ?? ""),
            city: String(member.nlCity ?? member.originCity ?? ""),
            birthDate: String(member.birthDate ?? ""),
            department: "other",
          });
        }
      }
      if (volunteers.status === "fulfilled") {
        for (const volunteer of volunteers.value.volunteers ?? []) {
          const name = String(volunteer.name ?? "");
          if (locale !== "ar" && hasArabicCharacters(name)) continue;
          options.push({
            id: `volunteer:${volunteer.id}`,
            source: "volunteer",
            nameAr: name,
            nameNl: name,
            email: String(volunteer.email ?? ""),
            phone: String(volunteer.phone ?? ""),
            address: String(volunteer.address ?? ""),
            city: String(volunteer.city ?? ""),
            birthDate: String(volunteer.birthDate ?? ""),
            department: String(volunteer.department ?? "other"),
          });
        }
      }
      setParties(options);
    } finally {
      setLoadingData(false);
    }
  }, [partySearch, locale]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function chooseSignatory(id: string) {
    setSignatoryId(id);
    setNotice("");
  }

  function chooseParty(id: string) {
    setPartyId(id);
    const party = parties.find((item) => item.id === id);
    if (!party) return;
    const name = locale === "ar" ? party.nameAr || party.nameNl : party.nameNl || party.nameAr;
    const department = DEPARTMENT_KEYS.includes(party.department as any) ? party.department : "other";
    setForm((prev) => ({
      ...prev,
      name,
      address: party.address,
      city: party.city,
      email: party.email,
      phone: party.phone,
      birthDate: party.birthDate,
      department,
    }));
    setNotice("");
  }

  function updateArticle(number: number, key: "titleNl" | "titleAr" | "paragraphsNl" | "paragraphsAr", value: string | string[]) {
    setArticles((prev) => prev.map((article) => (article.number === number ? { ...article, [key]: value } : article)));
  }

  function addArticle() {
    const number = articles.length ? Math.max(...articles.map((article) => article.number)) + 1 : 1;
    setArticles((prev) => [...prev, {
      number,
      titleAr: tp("newArticleTitle"),
      titleNl: tp("newArticleTitle"),
      paragraphsAr: [tp("newArticleBody")],
      paragraphsNl: [tp("newArticleBody")],
    }]);
  }

  function resetArticles() {
    setArticles(freshArticles());
    setNotice("");
  }

  const isVolunteerAgreement = templateId === "volunteer_agreement";
  const selectedSignatory = signatories.find((item) => item.id === signatoryId);
  const signatoryName = selectedSignatory
    ? (locale === "ar" ? selectedSignatory.nameAr || selectedSignatory.nameEn : selectedSignatory.nameEn || selectedSignatory.nameAr)
    : "";
  const signatoryTitle = selectedSignatory
    ? (locale === "ar"
      ? selectedSignatory.titleAr || selectedSignatory.titleEn || ""
      : selectedSignatory.titleEn || selectedSignatory.titleAr || "")
    : "";
  const organizationName = locale === "ar" ? SGN_ORGANIZATION_INFO.nameAr : SGN_ORGANIZATION_INFO.nameNl;
  const documentTitle = isVolunteerAgreement ? tp("docTitle") : tp("docGenericTitle");
  const documentLang: LangMode = locale === "ar" ? langMode : "nl";
  const documentDir = documentLang === "nl" ? "ltr" : "rtl";
  const editorArabic = documentLang !== "nl";
  const orgName = (value: string) => escapeHtml(value || "—");
  const refDisplay = formatLocalizedDigits(form.refNumber || "—", locale);
  const dateDisplay = formatLocalizedDigits(form.issueDate, locale);

  function articleLines(article: Article) {
    if (documentLang === "bilingual") {
      return [article.titleAr, ...article.paragraphsAr, article.titleNl, ...article.paragraphsNl];
    }
    return documentLang === "ar"
      ? [article.titleAr, ...article.paragraphsAr]
      : [article.titleNl, ...article.paragraphsNl];
  }

  function buildPrintHtml() {
    const font = documentLang === "nl" ? "system-ui, sans-serif" : "Almarai,system-ui,sans-serif";
    const rows = isVolunteerAgreement
      ? articles.map((article) => articleLines(article).map((line) => `<p>${escapeHtml(line)}</p>`).join("")).join("")
      : `<p>${escapeHtml(form.subject)}</p><p>${escapeHtml(form.notes)}</p>`;
    const signatureImage = signature ? `<img src="${signature}" alt="" style="max-width:220px;height:70px" />` : "";
    return `<!doctype html><html lang="${locale}" dir="${documentDir}"><head><meta charset="utf-8" />
      <title>${escapeHtml(documentTitle)}</title>
      <style>
        @page { size: A4; margin: 18mm; }
        body { font-family: ${font}; color: #1d2a21; line-height: 1.8; }
        header { border-bottom: 2px solid #123b24; padding-bottom: 10px; margin-bottom: 20px; }
        header img { max-height: 58px; }
        h1 { font-size: 19px; margin: 0 0 12px; color: #123b24; }
        h2 { font-size: 13px; margin: 18px 0 4px; color: #123b24; }
        p { font-size: 12px; margin: 3px 0; }
        .meta { color: #667066; font-size: 11px; }
        .sign { display: flex; justify-content: space-between; gap: 30px; margin-top: 46px; }
        .sign div { flex: 1; border-top: 1px solid #9aa399; padding-top: 8px; font-size: 11px; }
      </style></head><body>
      <header>${includeSeal ? '<img src="/logo.png" alt="" />' : ""}<h2>${escapeHtml(organizationName)}</h2>
      <p class="meta">${escapeHtml(SGN_ORGANIZATION_INFO.address)}</p></header>
      <h1>${escapeHtml(documentTitle)}</h1>
      <p class="meta">${escapeHtml(tp("refLabel"))}: ${orgName(refDisplay)} | ${escapeHtml(tp("dateLabel"))}: ${orgName(dateDisplay)} | ${escapeHtml(tp("cityIssueLabel"))}: ${orgName(form.issueCity)}</p>
      <h2>${escapeHtml(tp("firstParty"))}</h2>
      <p>${orgName(signatoryName)} ${orgName(signatoryTitle)}</p>
      <h2>${escapeHtml(tp("secondParty"))}</h2>
      <p>${orgName(form.name)} | ${orgName(form.address)} | ${orgName(form.city)}</p>
      <p>${orgName(form.email)} | ${orgName(form.phone)}</p>
      <p>${escapeHtml(tp("preamble"))}</p>
      ${rows}
      <p>${escapeHtml(tp("declaration"))}</p>
      ${includeQr ? `<p class="meta">${escapeHtml(tp("qrNote"))}: ${orgName(refDisplay)}</p>` : ""}
      <div class="sign"><div>${escapeHtml(tp("signatureFirst"))}<br />${signatureImage}</div><div>${escapeHtml(tp("signatureSecond"))}</div></div>
      </body></html>`;
  }

  function printDocument() {
    if (!selectedSignatory || !form.name.trim()) {
      setNotice(tp("emptySelection"));
      return;
    }
    setBusy(true);
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.left = "-9999px";
    frame.setAttribute("aria-hidden", "true");
    frame.onload = () => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } finally {
        setTimeout(() => frame.remove(), 1000);
        setBusy(false);
      }
    };
    frame.srcdoc = buildPrintHtml();
    document.body.appendChild(frame);
  }

  function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function startDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const point = canvasPoint(event);
    context.strokeStyle = "#123b24";
    context.lineWidth = 2;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(point.x, point.y);
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const point = canvasPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function endDraw() {
    drawingRef.current = false;
  }

  function clearSignatureCanvas() {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }

  function saveSignature() {
    if (!canvasRef.current) return;
    setSignature(canvasRef.current.toDataURL("image/png"));
    setSignatureOpen(false);
    setNotice(tp("signSaved"));
  }

  return (
    <V2Shell active="/dashboard/v2/documents-generator" section={t("breadcrumbDocumentsGenerator")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <V2Pill tone="neutral">{td("pageTitle")}</V2Pill>
        <button
          type="button"
          onClick={() => void loadData()}
          title={t("retry")}
          aria-label={t("retry")}
          className="rounded-xl border border-[#e6ddc9] bg-white p-2 text-[#6f7a70] shadow-sm hover:bg-[#f5ecd6]"
        >
          <RefreshCw size={15} className={loadingData ? "animate-spin" : ""} />
        </button>
      </V2Intro>

      {notice && (
        <div className="mb-4 rounded-xl border border-[#d8e6d9] bg-[#f1f8f1] px-4 py-3 text-xs font-bold text-[#1a5632]">
          {notice}
        </div>
      )}

      {dataError ? (
        <V2Message text={tp("loadError")} error />
      ) : (
        <div className="space-y-5">
          <V2Panel title={td("documentHeading")} note={tp("templateHelp")}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <V2Field label={tp("templateLabel")}>
                <select
                  value={templateId}
                  onChange={(event) => setTemplateId(event.target.value)}
                  className={v2InputClass}
                >
                  {DOCUMENT_TEMPLATES.map((template, index) => (
                    <option key={template.id} value={template.id}>
                      {tp(`templateTitles.${TEMPLATE_KEYS[index]}`)}
                    </option>
                  ))}
                </select>
              </V2Field>
              <V2Field label={tp("langLabel")} hint={tp("langHint")}>
                <select
                  value={documentLang}
                  disabled={locale !== "ar"}
                  onChange={(event) => setLangMode(event.target.value as LangMode)}
                  className={v2InputClass}
                >
                  <option value="nl">{tp("langNl")}</option>
                  {locale === "ar" && <option value="ar">{tp("langAr")}</option>}
                  {locale === "ar" && <option value="bilingual">{tp("langBilingual")}</option>}
                </select>
              </V2Field>
              <V2Field label={tp("categoryLabel")}>
                <input readOnly value={tp(`templateCategory.${TEMPLATE_CATEGORY[templateId]}`)} className={v2InputClass} />
              </V2Field>
              <V2Field label={tp("refLabel")}>
                <input dir="ltr" value={form.refNumber} onChange={(event) => setField("refNumber", event.target.value)} className={v2InputClass} />
              </V2Field>
              <V2Field label={tp("dateLabel")}>
                <input type="date" value={form.issueDate} onChange={(event) => setField("issueDate", event.target.value)} className={v2InputClass} />
              </V2Field>
              <V2Field label={tp("cityIssueLabel")}>
                <input value={form.issueCity} onChange={(event) => setField("issueCity", event.target.value)} className={v2InputClass} />
              </V2Field>
              <V2Field label={tp("subjectLabel")}>
                <input value={form.subject} onChange={(event) => setField("subject", event.target.value)} placeholder={tp("subjectPlaceholder")} className={v2InputClass} />
              </V2Field>
              <V2Field label={tp("notesLabel")}>
                <input value={form.notes} onChange={(event) => setField("notes", event.target.value)} placeholder={tp("notesPlaceholder")} className={v2InputClass} />
              </V2Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-[#6f7a70]">
                <input type="checkbox" checked={includeSeal} onChange={(event) => setIncludeSeal(event.target.checked)} className="accent-[#1a5632]" />
                {tp("sealLabel")}
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-[#6f7a70]">
                <input type="checkbox" checked={includeQr} onChange={(event) => setIncludeQr(event.target.checked)} className="accent-[#1a5632]" />
                {tp("qrLabel")}
              </label>
            </div>
          </V2Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <V2Panel title={td("tabParties")} note={tp("firstParty")}>
              {loadingData ? (
                <V2Message text={t("loading")} />
              ) : signatories.length === 0 ? (
                <V2Message text={tp("noParties")} />
              ) : (
                <V2Field label={tp("signatoryLabel")}>
                  <select value={signatoryId} onChange={(event) => chooseSignatory(event.target.value)} className={v2InputClass}>
                    <option value="">{tp("signatoryPlaceholder")}</option>
                    {signatories.map((member) => (
                      <option key={member.id} value={member.id}>
                        {locale === "ar"
                          ? member.nameAr || member.nameEn
                          : member.nameEn || member.nameAr}
                      </option>
                    ))}
                  </select>
                </V2Field>
              )}
              <div className="mt-5 border-t border-[#f0ead9] pt-5">
                <p className="mb-3 text-xs font-black text-[#203026]">{tp("secondParty")}</p>
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#e6ddc9] bg-white px-3 py-2">
                  <Search size={15} className="text-[#8a6a1f]" />
                  <input
                    value={partyQuery}
                    onChange={(event) => setPartyQuery(event.target.value)}
                    placeholder={tp("partySearch")}
                    className="w-full bg-transparent text-xs outline-none"
                  />
                </div>
                {loadingData ? (
                  <V2Message text={t("loading")} />
                ) : parties.length === 0 ? (
                  <V2Message text={tp("noParties")} />
                ) : (
                  <V2Field label={tp("secondParty")}>
                    <select value={partyId} onChange={(event) => chooseParty(event.target.value)} className={v2InputClass}>
                      <option value="">{tp("partyPlaceholder")}</option>
                      {parties.map((party) => (
                        <option key={party.id} value={party.id}>
                          {locale === "ar" ? party.nameAr || party.nameNl : party.nameNl || party.nameAr}
                          {" · "}
                          {tp(party.source === "member" ? "sourceMember" : "sourceVolunteer")}
                        </option>
                      ))}
                    </select>
                  </V2Field>
                )}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <V2Field label={tp("nameLabel")}>
                    <input value={form.name} onChange={(event) => setField("name", event.target.value)} className={v2InputClass} />
                  </V2Field>
                  <V2Field label={td("birthDate")}>
                    <input type="date" value={form.birthDate} onChange={(event) => setField("birthDate", event.target.value)} className={v2InputClass} />
                  </V2Field>
                  <V2Field label={tp("addressLabel")}>
                    <input value={form.address} onChange={(event) => setField("address", event.target.value)} className={v2InputClass} />
                  </V2Field>
                  <V2Field label={tp("cityLabel")}>
                    <input value={form.city} onChange={(event) => setField("city", event.target.value)} className={v2InputClass} />
                  </V2Field>
                  <V2Field label={td("email")}>
                    <input dir="ltr" value={form.email} onChange={(event) => setField("email", event.target.value)} className={v2InputClass} />
                  </V2Field>
                  <V2Field label={td("phone")}>
                    <input dir="ltr" value={form.phone} onChange={(event) => setField("phone", event.target.value)} className={v2InputClass} />
                  </V2Field>
                  <V2Field label={tp("departmentLabel")}>
                    <select value={form.department} onChange={(event) => setField("department", event.target.value)} className={v2InputClass}>
                      {DEPARTMENT_KEYS.map((key) => (
                        <option key={key} value={key}>{tp(`departments.${key}`)}</option>
                      ))}
                    </select>
                  </V2Field>
                  <V2Field label={tp("hoursLabel")}>
                    <input value={form.hours} onChange={(event) => setField("hours", event.target.value)} className={v2InputClass} />
                  </V2Field>
                </div>
              </div>
            </V2Panel>

            <V2Panel title={tp("previewTitle")} note={tp("previewNote")}>
              <article dir={documentDir} className="rounded-2xl border border-[#e6ddc9] bg-[#fdfcf9] p-5 text-[#203026]">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#123b24] pb-3">
                  <div>
                    <h3 className="text-sm font-black text-[#123b24]">{organizationName}</h3>
                    <p className="mt-1 text-[10px] text-[#8a958b]" dir="ltr">{SGN_ORGANIZATION_INFO.address}</p>
                  </div>
                  {includeSeal && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src="/logo.png" alt="" className="h-12 w-auto" />
                  )}
                </header>
                <h4 className="mt-4 text-base font-black text-[#123b24]">{documentTitle}</h4>
                <p className="mt-1 text-[10px] text-[#8a958b]">
                  {tp("refLabel")}: {refDisplay} · {tp("dateLabel")}: {dateDisplay} · {tp("cityIssueLabel")}: {form.issueCity || "—"}
                </p>
                <p className="mt-4 text-xs font-black">{tp("firstParty")}</p>
                <p className="text-xs text-[#6f7a70]">{signatoryName || "—"} {signatoryTitle}</p>
                <p className="mt-3 text-xs font-black">{tp("secondParty")}</p>
                <p className="text-xs text-[#6f7a70]">
                  {form.name || "—"} {form.address ? `· ${form.address}` : ""} {form.city ? `· ${form.city}` : ""}
                </p>
                <p className="mt-4 text-xs leading-relaxed">{tp("preamble")}</p>
                {isVolunteerAgreement ? (
                  <div className="mt-3 space-y-2">
                    {articles.map((article) => (
                      <div key={article.number}>
                        {articleLines(article).map((line, index) => (
                          <p key={index} className="text-[11px] leading-relaxed text-[#4a564c]">{line}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 space-y-2 text-[11px] leading-relaxed text-[#4a564c]">
                    <p>{form.subject || "—"}</p>
                    {textLines(form.notes).map((line, index) => <p key={index}>{line}</p>)}
                  </div>
                )}
                <p className="mt-4 text-xs leading-relaxed">{tp("declaration")}</p>
                {includeQr && <p className="mt-3 text-[10px] text-[#8a6a1f]">{tp("qrNote")}: {refDisplay}</p>}
                <div className="mt-6 flex items-end justify-between gap-4 border-t border-[#d9d3c3] pt-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-[#8a958b]">{tp("signatureFirst")}</p>
                    {signature && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={signature} alt="" className="mt-1 h-12 w-auto" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-[#8a958b]">{tp("signatureSecond")}</p>
                  </div>
                </div>
              </article>
              <div className="mt-4 flex flex-wrap gap-2">
                <V2PrimaryButton label={tp("print")} onClick={printDocument}>
                  <Printer size={15} />
                </V2PrimaryButton>
                <button
                  type="button"
                  onClick={() => setSignatureOpen(true)}
                  className="flex items-center gap-2 rounded-xl border border-[#e6ddc9] bg-white px-4 py-2.5 text-xs font-bold text-[#6f7a70] shadow-sm hover:bg-[#f5ecd6]"
                >
                  <PenTool size={15} />
                  {td("signOnScreen")}
                </button>
              </div>
            </V2Panel>
          </div>

          {isVolunteerAgreement && (
            <V2Panel title={tp("articlesHeading")} note={td("articlesHeading")}>
              <div className="space-y-3">
                {articles.map((article) => (
                  <div key={article.number} className="rounded-2xl border border-[#f0ead9] bg-[#fdfcf9] p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-xs font-black text-[#123b24]">{formatLocalizedDigits(article.number, locale)}</p>
                      <V2IconButton
                        label={tp("deleteArticle")}
                        danger
                        onClick={() => setArticles((prev) => prev.filter((item) => item.number !== article.number))}
                      >
                        <Trash2 size={13} />
                      </V2IconButton>
                    </div>
                    <input
                      value={editorArabic ? article.titleAr : article.titleNl}
                      onChange={(event) => updateArticle(article.number, editorArabic ? "titleAr" : "titleNl", event.target.value)}
                      className={v2InputClass}
                    />
                    <textarea
                      rows={3}
                      value={(editorArabic ? article.paragraphsAr : article.paragraphsNl).join("\n")}
                      onChange={(event) => updateArticle(article.number, editorArabic ? "paragraphsAr" : "paragraphsNl", textLines(event.target.value))}
                      className={`${v2InputClass} mt-2`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addArticle}
                  className="flex items-center gap-2 rounded-xl border border-[#e6ddc9] bg-white px-4 py-2.5 text-xs font-bold text-[#6f7a70] shadow-sm hover:bg-[#f5ecd6]"
                >
                  <Plus size={15} />
                  {tp("addArticle")}
                </button>
                <button
                  type="button"
                  onClick={resetArticles}
                  className="flex items-center gap-2 rounded-xl border border-[#e6ddc9] bg-white px-4 py-2.5 text-xs font-bold text-[#6f7a70] shadow-sm hover:bg-[#f5ecd6]"
                >
                  <RefreshCw size={15} />
                  {tp("resetArticles")}
                </button>
              </div>
            </V2Panel>
          )}
        </div>
      )}

      {signatureOpen && (
        <V2Dialog title={td("signatureModalTitle")} closeLabel={t("close")} onClose={() => setSignatureOpen(false)}>
          <p className="mb-4 text-xs leading-relaxed text-[#6f7a70]">{td("signatureModalHint")}</p>
          <canvas
            ref={canvasRef}
            width={480}
            height={180}
            onPointerDown={startDraw}
            onPointerMove={draw}
            onPointerUp={endDraw}
            onPointerLeave={endDraw}
            className="w-full touch-none rounded-xl border border-[#e6ddc9] bg-white"
          />
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={clearSignatureCanvas}
              className="flex items-center gap-2 rounded-xl border border-[#e6ddc9] px-4 py-2.5 text-xs font-bold text-[#6f7a70] hover:bg-[#f5ecd6]"
            >
              <RefreshCw size={14} />
              {td("clearRedo")}
            </button>
            <button
              type="button"
              onClick={saveSignature}
              className="flex items-center gap-2 rounded-xl bg-[#123b24] px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-[#1a5632]"
            >
              <User size={14} />
              {td("saveToContract")}
            </button>
          </div>
        </V2Dialog>
      )}
    </V2Shell>
  );
}
