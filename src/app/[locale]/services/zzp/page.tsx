"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Briefcase,
  FileText,
  Plus,
  Trash2,
  Printer,
  Download,
  CheckCircle2,
  Search,
  Filter,
  MapPin,
  Phone,
  MessageCircle,
  Building2,
  ShieldCheck,
  Calculator,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Loader2,
  Star,
} from "lucide-react";
import { formatLocalizedDigits } from "@/lib/language-guard";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  vatRate: number; // 21, 9, 0, or -1 for KOR
}

interface ZZPProfile {
  id: string;
  nameAr: string;
  nameNl: string;
  profession: string | null;
  skills: string | null;
  nlCity: string;
  serviceDescription: string | null;
  avatar: string | null;
  whatsapp: string;
  isPremiumService: boolean;
  avgRating: number;
  reviewCount: number;
}

const PROVINCES = [
  "All",
  "Noord-Holland",
  "Zuid-Holland",
  "Utrecht",
  "Noord-Brabant",
  "Gelderland",
  "Overijssel",
  "Groningen",
  "Friesland",
  "Drenthe",
  "Flevoland",
  "Limburg",
  "Zeeland",
];

export default function ZZPHubPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "ar";
  const isAr = locale === "ar";
  const isNl = locale === "nl";

  const [activeTab, setActiveTab] = useState<"directory" | "invoice" | "join">("directory");

  // Filters
  const [search, setSearch] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("All");
  const [providers, setProviders] = useState<ZZPProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Factuur Generator State
  const [invoiceNumber, setInvoiceNumber] = useState("2026-001");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDateDays, setDueDateDays] = useState(14);
  const [isKOR, setIsKOR] = useState(false); // Kleineondernemersregeling

  // Sender info
  const [senderName, setSenderName] = useState("اسم شركتك / Bedrijfsnaam");
  const [senderKvk, setSenderKvk] = useState("12345678");
  const [senderBtw, setSenderBtw] = useState("NL001234567B01");
  const [senderIban, setSenderIban] = useState("NL91ABNA0123456789");
  const [senderAddress, setSenderAddress] = useState("Kalverstraat 10, 1012 NX Amsterdam");

  // Client info
  const [clientName, setClientName] = useState("اسم العميل / Klantnaam B.V.");
  const [clientAddress, setClientAddress] = useState("Coolsingel 20, 3011 AD Rotterdam");
  const [clientVat, setClientVat] = useState("");

  // Invoice Items
  const [items, setItems] = useState<LineItem[]>([
    { id: "1", description: "أعمال صيانة وتشطيبات / Werkzaamheden schilderwerk", quantity: 20, rate: 35, vatRate: 21 },
    { id: "2", description: "مواد ومستلزمات / Materiaalkosten", quantity: 1, rate: 150, vatRate: 21 },
  ]);

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), description: "", quantity: 1, rate: 50, vatRate: isKOR ? 0 : 21 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((i) => i.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof LineItem, val: any) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: val } : i)));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, i) => acc + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0);
  }, [items]);

  const vatTotal = useMemo(() => {
    if (isKOR) return 0;
    return items.reduce((acc, i) => {
      const lineTotal = (Number(i.quantity) || 0) * (Number(i.rate) || 0);
      return acc + (lineTotal * (Number(i.vatRate) || 0)) / 100;
    }, 0);
  }, [items, isKOR]);

  const grandTotal = subtotal + vatTotal;

  // جلب مقدمي الخدمات (رواد الأعمال ZZP) من API
  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/members/services");
        const data = await res.json();
        setProviders(data.members || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProviders();
  }, []);

  // Filtered ZZP
  const filteredZZP = useMemo(() => {
    return providers.filter((p) => {
      const name = isAr ? p.nameAr : p.nameNl;
      const skills = p.skills || "";
      const matchSearch =
        name.toLowerCase().includes(search.toLowerCase()) ||
        (p.profession || "").toLowerCase().includes(search.toLowerCase()) ||
        p.nlCity.toLowerCase().includes(search.toLowerCase()) ||
        skills.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [providers, search, isAr]);

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 text-white p-8 md:p-12 shadow-2xl border border-emerald-500/20">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              {isAr ? "شبكة التمكين المالي للجالية ٢٠٢٦" : isNl ? "Financieel Netwerk 2026" : "Financial Empowerment 2026"}
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              {isAr
                ? "دليل رواد الأعمال والـ ZZP ومولّد الفواتير"
                : isNl
                ? "ZZP Netwerk & Officiële Factuur Maker"
                : "ZZP Freelancers Hub & Invoice Generator"}
            </h1>
            <p className="text-emerald-100/90 text-base md:text-lg leading-relaxed">
              {isAr
                ? "منصة متكاملة تجمع الحرفيين والمترجمين والمهنيين السوريين المعتمدين في هولندا، مع مولّد فواتير هولندي احترافي متوافق 100% مع متطلبات مصلحة الضرائب والـ BTW."
                : isNl
                ? "Vind betrouwbare Syrische vakmensen in heel Nederland of maak direct conforme facturen voor de Belastingdienst met automatische BTW-berekening."
                : "Connect with verified Syrian entrepreneurs and freelancers in the Netherlands, or create fully compliant Dutch invoices for Belastingdienst."}
            </p>

            {/* Quick Navigation Tabs */}
            <div className="flex flex-wrap gap-3 pt-4">
              <button
                onClick={() => setActiveTab("directory")}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                  activeTab === "directory"
                    ? "bg-white text-emerald-950 shadow-lg scale-105"
                    : "bg-emerald-900/60 text-white hover:bg-emerald-800/80 border border-emerald-400/20"
                }`}
              >
                <Briefcase className="w-4 h-4" />
                {isAr ? "دليل الحرفيين والمهنيين" : isNl ? "Vakmensen Gids" : "Freelancers Directory"}
              </button>
              <button
                onClick={() => setActiveTab("invoice")}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                  activeTab === "invoice"
                    ? "bg-white text-emerald-950 shadow-lg scale-105"
                    : "bg-emerald-900/60 text-white hover:bg-emerald-800/80 border border-emerald-400/20"
                }`}
              >
                <FileText className="w-4 h-4" />
                {isAr ? "مولّد الفواتير (Factuur Maker)" : isNl ? "Factuur Maken" : "Invoice Generator"}
              </button>
              <button
                onClick={() => setActiveTab("join")}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                  activeTab === "join"
                    ? "bg-white text-emerald-950 shadow-lg scale-105"
                    : "bg-emerald-900/60 text-white hover:bg-emerald-800/80 border border-emerald-400/20"
                }`}
              >
                <Plus className="w-4 h-4" />
                {isAr ? "سجّل كمهني معتمد" : isNl ? "Aanmelden als ZZP" : "Join as Freelancer"}
              </button>
            </div>
          </div>
        </div>

        {/* TAB 1: DIRECTORY */}
        {activeTab === "directory" && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                <Search className={`absolute top-3.5 ${isAr ? "right-3.5" : "left-3.5"} w-4 h-4 text-slate-400`} />
                <input
                  type="text"
                  placeholder={isAr ? "ابحث باسم المهني، الاختصاص، أو المدينة..." : "Zoek op naam, beroep of stad..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full ${
                    isAr ? "pr-10 pl-4" : "pl-10 pr-4"
                  } py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-500 shrink-0">{isAr ? "المقاطعة:" : "Provincie:"}</span>
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p === "All" ? (isAr ? "كافة المقاطعات" : "Alle Provincies") : p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ZZP Cards Grid */}
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : filteredZZP.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Briefcase className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-slate-500">
                  {isAr
                    ? "لا يوجد مقدمو خدمات مطابقون. سجّل كـ ZZP أو تواصل معنا لإضافتك."
                    : "Geen ZZP'ers gevonden. Meld je aan als dienstverlener."}
                </p>
                <Link
                  href={`/${locale}/members`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                  {isAr ? "سجّل كخدمة" : "Aanmelden"}
                </Link>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredZZP.map((pro) => {
                const name = isAr ? pro.nameAr : pro.nameNl;
                const tags = (pro.skills || "").split(",").map((s) => s.trim()).filter(Boolean);
                return (
                <div
                  key={pro.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-800 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-900 dark:text-white text-base">{name}</h3>
                          {pro.isPremiumService && <Star className="w-4 h-4 text-amber-500 fill-amber-400" />}
                        </div>
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mt-0.5">{pro.profession}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                        {pro.nlCity}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {pro.serviceDescription}
                    </p>

                    {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tags.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium border border-emerald-200/40"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    )}

                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {formatLocalizedDigits(pro.avgRating.toFixed(1), locale)} ({formatLocalizedDigits(pro.reviewCount.toString(), locale)})
                      </span>
                      {pro.isPremiumService && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {isAr ? "موثّق ومميز" : "Premium"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 mt-2">
                    <a
                      href={`https://wa.me/${pro.whatsapp}?text=${encodeURIComponent(
                        isAr ? "مرحباً، تواصلت معك عبر منصة الجالية السورية في هولندا..." : "Hallo, ik neem contact op via SGN..."
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      {isAr ? "تواصل واتساب" : "WhatsApp"}
                    </a>
                  </div>
                </div>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* TAB 2: INVOICE GENERATOR */}
        {activeTab === "invoice" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800 print:shadow-none print:border-none print:p-0">
              {/* Controls bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800 print:hidden">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-emerald-600" />
                    {isAr ? "مولّد الفواتير الهولندي الرسمي" : "Nederlandse Factuur Generator"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {isAr
                      ? "متوافق 100% مع معايير الضرائب الهولندية (Belastingdienst). املأ البيانات واطبع الفاتورة فوراً كـ PDF."
                      : "Voldoet aan alle wettelijke eisen van de Belastingdienst voor ZZP-facturen."}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isKOR}
                      onChange={(e) => setIsKOR(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{isAr ? "نظام الـ KOR (معفى من BTW)" : "KOR Regeling (Vrijgesteld van BTW)"}</span>
                  </label>

                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    {isAr ? "طباعة / حفظ PDF" : "Printen / Opslaan"}
                  </button>
                </div>
              </div>

              {/* Printable Invoice Container */}
              <div className="p-4 md:p-8 space-y-8 print:p-0 text-slate-900 dark:text-slate-100">
                {/* Invoice Top Header */}
                <div className="flex flex-col sm:flex-row justify-between gap-6">
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="text-2xl font-black text-emerald-800 dark:text-emerald-400 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:border-emerald-500 outline-none w-full"
                    />
                    <input
                      type="text"
                      value={senderAddress}
                      onChange={(e) => setSenderAddress(e.target.value)}
                      placeholder="Adres & Postcode"
                      className="text-xs text-slate-500 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:border-emerald-500 outline-none w-full"
                    />
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="font-semibold text-slate-400">KVK: </span>
                        <input
                          type="text"
                          value={senderKvk}
                          onChange={(e) => setSenderKvk(e.target.value)}
                          className="bg-transparent border-b border-dashed border-slate-300 outline-none w-24"
                        />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-400">BTW: </span>
                        <input
                          type="text"
                          value={senderBtw}
                          onChange={(e) => setSenderBtw(e.target.value)}
                          className="bg-transparent border-b border-dashed border-slate-300 outline-none w-32"
                        />
                      </div>
                      <div className="col-span-2">
                        <span className="font-semibold text-slate-400">IBAN: </span>
                        <input
                          type="text"
                          value={senderIban}
                          onChange={(e) => setSenderIban(e.target.value)}
                          className="bg-transparent border-b border-dashed border-slate-300 outline-none w-48 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Factuur Meta */}
                  <div className="sm:text-right space-y-1.5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 w-full sm:w-72">
                    <h3 className="text-xl font-black tracking-wider uppercase text-slate-800 dark:text-white">FACTUUR</h3>
                    <div className="text-xs flex justify-between sm:justify-end gap-3 pt-2">
                      <span className="text-slate-400">{isAr ? "رقم الفاتورة:" : "Factuurnr:"}</span>
                      <input
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        className="font-bold text-right bg-transparent border-b border-dashed border-slate-300 outline-none w-24"
                      />
                    </div>
                    <div className="text-xs flex justify-between sm:justify-end gap-3">
                      <span className="text-slate-400">{isAr ? "تاريخ الفاتورة:" : "Factuurdatum:"}</span>
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="text-right bg-transparent border-b border-dashed border-slate-300 outline-none"
                      />
                    </div>
                    <div className="text-xs flex justify-between sm:justify-end gap-3">
                      <span className="text-slate-400">{isAr ? "مهلة السداد:" : "Vervaltermijn:"}</span>
                      <select
                        value={dueDateDays}
                        onChange={(e) => setDueDateDays(Number(e.target.value))}
                        className="bg-transparent font-medium border-b border-dashed border-slate-300 outline-none"
                      >
                        <option value={14}>14 {isAr ? "يوم" : "dagen"}</option>
                        <option value={30}>30 {isAr ? "يوم" : "dagen"}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Client info */}
                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 space-y-2">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                    {isAr ? "بيانات العميل (Factuur aan):" : "Factuur aan:"}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder={isAr ? "اسم العميل أو الشركة" : "Klantnaam of Bedrijfsnaam"}
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder={isAr ? "العنوان والرمز البريدي والمدينة" : "Adres, postcode en plaats"}
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b-2 border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-2">{isAr ? "الوصف / Omschrijving" : "Omschrijving"}</th>
                        <th className="py-2.5 px-2 w-20 text-center">{isAr ? "الكمية / Uren" : "Aantal"}</th>
                        <th className="py-2.5 px-2 w-24 text-center">{isAr ? "السعر / Tarief" : "Prijs"}</th>
                        {!isKOR && <th className="py-2.5 px-2 w-24 text-center">BTW %</th>}
                        <th className="py-2.5 px-2 w-28 text-right">{isAr ? "المجموع" : "Totaal"}</th>
                        <th className="py-2.5 px-2 w-10 print:hidden"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateItem(item.id, "description", e.target.value)}
                              placeholder="Omschrijving werkzaamheden..."
                              className="w-full bg-transparent outline-none focus:bg-white dark:focus:bg-slate-800 rounded px-1.5 py-1"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                              className="w-16 bg-transparent text-center outline-none focus:bg-white dark:focus:bg-slate-800 rounded px-1 py-1"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              <span>€</span>
                              <input
                                type="number"
                                value={item.rate}
                                onChange={(e) => updateItem(item.id, "rate", e.target.value)}
                                className="w-16 bg-transparent text-center outline-none focus:bg-white dark:focus:bg-slate-800 rounded px-1 py-1"
                              />
                            </div>
                          </td>
                          {!isKOR && (
                            <td className="py-2 px-2 text-center">
                              <select
                                value={item.vatRate}
                                onChange={(e) => updateItem(item.id, "vatRate", Number(e.target.value))}
                                className="bg-transparent border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 text-xs"
                              >
                                <option value={21}>21%</option>
                                <option value={9}>9%</option>
                                <option value={0}>0%</option>
                              </select>
                            </td>
                          )}
                          <td className="py-2 px-2 text-right font-bold font-mono">
                            €{((Number(item.quantity) || 0) * (Number(item.rate) || 0)).toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-center print:hidden">
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <button
                    onClick={addItem}
                    className="mt-3 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors print:hidden"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isAr ? "إضافة سطر / بند عمل جديد" : "Regel toevoegen"}
                  </button>
                </div>

                {/* Calculation Totals */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500 max-w-sm space-y-1">
                    {isKOR ? (
                      <p className="font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200/50">
                        Vrijgesteld van omzetbelasting op grond van artikel 25 Wet op de omzetbelasting 1968 (KOR).
                      </p>
                    ) : (
                      <p>
                        Gelieve het totaalbedrag binnen {dueDateDays} dagen over te maken naar IBAN {senderIban} t.n.v.{" "}
                        {senderName} onder vermelding van factuurnummer {invoiceNumber}.
                      </p>
                    )}
                  </div>

                  <div className="w-full sm:w-64 space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>{isAr ? "المجموع الفرعي (excl. BTW):" : "Subtotaal (excl.):"}</span>
                      <span className="font-mono font-bold">€{subtotal.toFixed(2)}</span>
                    </div>

                    {!isKOR && (
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>{isAr ? "ضريبة القيمة المضافة (BTW):" : "BTW bedrag:"}</span>
                        <span className="font-mono font-bold">€{vatTotal.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-base font-black pt-2 border-t border-slate-200 dark:border-slate-700 text-emerald-800 dark:text-emerald-400">
                      <span>{isAr ? "الإجمالي المستحق:" : "Totaal te betalen:"}</span>
                      <span className="font-mono">€{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: JOIN FORM */}
        {activeTab === "join" && (
          <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {isAr ? "طلب تسجيل مهني / ZZP في دليل الجالية المعتمد" : "Aanmelden als ZZP'er in de SGN Gids"}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isAr
                  ? "انضم إلى شبكة المهنيين السوريين المعتمدين لتصل إلى آلاف العملاء والعائلات السورية والهولندية في مقاطعتك."
                  : "Meld je onderneming aan om nieuwe klanten binnen de gemeenschap en in jouw regio te bereiken."}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert(isAr ? "تم إرسال طلبك بنجاح! سيتواصل معك فريق المنصة لتوثيق بياناتك مجاناً." : "Aanvraag succesvol verstuurd!");
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? "الاسم الكامل:" : "Volledige naam:"}
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? "المهنة / التخصص:" : "Beroep / Specialisatie:"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isAr ? "مثال: كهربائي، دهان، مترجم..." : "bijv. Elektricien, Schilder..."}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">KVK-nummer:</label>
                  <input
                    type="text"
                    required
                    placeholder="8 cijfers"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? "المقاطعة:" : "Provincie:"}
                  </label>
                  <select className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {PROVINCES.filter((p) => p !== "All").map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? "المدينة:" : "Woonplaats:"}
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? "رقم الهاتف / واتساب:" : "Telefoon / WhatsApp:"}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+31 6 ..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? "البريد الإلكتروني:" : "E-mailadres:"}
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isAr ? "نبذة عن خبرتك وخدماتك:" : "Korte beschrijving van je diensten:"}
                </label>
                <textarea
                  rows={3}
                  placeholder={isAr ? "اشرح بالتفصيل خبراتك وشهاداتك ومجال عملك..." : "Vertel meer over je ervaring..."}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isAr ? "إرسال طلب الاعتماد مجاناً" : "Aanvraag versturen"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
