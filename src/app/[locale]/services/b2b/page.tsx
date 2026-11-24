"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Building2,
  Truck,
  Layers,
  ShoppingBag,
  Send,
  CheckCircle2,
  FileCheck,
  Search,
  Filter,
  MapPin,
  Sparkles,
  Phone,
  Mail,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { formatLocalizedDigits } from "@/lib/language-guard";

interface Supplier {
  id: string;
  companyName: string;
  category: string;
  city: string;
  minOrder: string;
  description: string;
  kvk: string;
  verified: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  website: string | null;
  badge: string | null;
  isFeatured?: boolean;
}

export default function B2BPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "ar";
  const isAr = locale === "ar";
  const isNl = locale === "nl";

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);

  // Offerte form state
  const [offerteSent, setOfferteSent] = useState(false);
  const [offerteData, setOfferteData] = useState({
    businessName: "",
    kvk: "",
    contactPerson: "",
    phone: "",
    email: "",
    category: "food",
    volumeEstimate: "شهرياً 500€ - 2000€",
    notes: "",
  });

  const categories = [
    { id: "all", label: isAr ? "كافة التوريدات" : "Alle categorieën" },
    { id: "food", label: isAr ? "مواد غذائية وبقالة" : "Voeding & Droogwaren" },
    { id: "meat", label: isAr ? "لحوم حلال طازجة" : "Halal Vlees" },
    { id: "equipment", label: isAr ? "معدات مطاعم Horeca" : "Horeca Apparatuur" },
    { id: "packaging", label: isAr ? "تغليف وطباعة" : "Verpakking & Bedrukking" },
  ];

  // جلب الموردين من API
  useEffect(() => {
    const fetchSuppliers = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/suppliers");
        const data = await res.json();
        setSuppliers(data.suppliers || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchCat = activeCategory === "all" || s.category === activeCategory;
      const matchSearch =
        s.companyName.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase()) ||
        s.city.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [suppliers, activeCategory, search]);

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-8 md:p-12 shadow-2xl border border-slate-700/50">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-400/30">
              <Building2 className="w-3.5 h-3.5" />
              {isAr ? "شبكة التجارة البينية والجملة B2B" : isNl ? "B2B Groothandel Netwerk" : "B2B Wholesale & Supply"}
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              {isAr ? "منصة التوريد وعروض أسعار الجملة" : isNl ? "B2B Offerte & Leveranciers Hub" : "Wholesale Quotes & B2B Hub"}
            </h1>
            <p className="text-slate-300 text-base md:text-lg leading-relaxed">
              {isAr
                ? "اربط مطعمك أو متجرك أو شركتك مباشرة مع كبرى مستوردي وموردي المواد الغذائية ومعدات الهوريكا ومواد التغليف بأسعار الجملة لتخفيض التكاليف وزيادة هوامش أرباحك."
                : isNl
                ? "Verbind je horecazaak of winkel rechtstreeks met betrouwbare groothandels en leveranciers in Nederland en vraag direct concurrerende offertes aan."
                : "Connect your restaurant or business directly with certified wholesale suppliers in the Netherlands to cut costs and boost profit margins."}
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="#request-offerte"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
              >
                <Send className="w-4 h-4" />
                {isAr ? "طلب عروض أسعار الجملة (Offerte)" : "Offerte aanvragen"}
              </a>
              <a
                href="#suppliers-list"
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition-all border border-white/10"
              >
                <Search className="w-4 h-4" />
                {isAr ? "تصفح دليل الموردين المعتمدين" : "Bekijk leveranciers"}
              </a>
            </div>
          </div>
        </div>

        {/* SUPPLIERS DIRECTORY */}
        <div id="suppliers-list" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {isAr ? "الموردون وشركات الجملة المعتمدة" : "Geverifieerde Groothandels & Leveranciers"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr ? "شركات مسجلة في غرفة التجارة الهولندية KVK وجاهزة للتوريد المباشر" : "Actieve leveranciers met KVK-inschrijving"}
              </p>
            </div>

            <div className="w-full sm:w-72 relative">
              <Search className={`absolute top-2.5 ${isAr ? "right-3" : "left-3"} w-4 h-4 text-slate-400`} />
              <input
                type="text"
                placeholder={isAr ? "ابحث عن شركة، مورد، أو صنف..." : "Zoek leverancier..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full ${
                  isAr ? "pr-9 pl-4" : "pl-9 pr-4"
                } py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeCategory === cat.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Suppliers Grid */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Building2 className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-slate-500">
                {isAr
                  ? "لا يوجد موردون في هذه الفئة حالياً — قريباً إن شاء الله"
                  : "Geen leveranciers in deze categorie — binnenkort beschikbaar"}
              </p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSuppliers.map((sup) => (
              <div
                key={sup.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-800 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">{sup.companyName}</h3>
                        {sup.verified && <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </div>
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {sup.city} • KVK: {sup.kvk}
                      </span>
                    </div>

                    {sup.badge && (
                    <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200/50 shrink-0">
                      {sup.badge}
                    </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{sup.description}</p>

                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span>{isAr ? "الحد الأدنى للطلب بالجملة (Min. Bestelbedrag):" : "Minimale bestelwaarde:"} </span>
                    <span className="font-bold text-slate-800 dark:text-white font-mono">{sup.minOrder}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  {sup.contactPhone && (
                  <a
                    href={`tel:${sup.contactPhone}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{sup.contactPhone}</span>
                  </a>
                  )}
                  {sup.contactEmail && (
                  <a
                    href={`mailto:${sup.contactEmail}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{isAr ? "مراسلة المورد" : "E-mail"}</span>
                  </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* OFFERTE REQUEST WIZARD */}
        <div id="request-offerte" className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {isAr ? "طلب عروض أسعار الجملة المجمّعة (Offerte Aanvragen)" : "Groothandel Offerte Aanvragen"}
            </h2>
            <p className="text-xs text-slate-500">
              {isAr
                ? "املأ تفاصيل طلبك ليقوم فريق شبكة الأعمال بإيصاله لأفضل 3 موردين معتمدين لتقديم عروض أسعار تنافسية خلال 48 ساعة."
                : "Ontvang binnen 48 uur de scherpste B2B-offertes van geverifieerde leveranciers."}
            </p>
          </div>

          {offerteSent ? (
            <div className="p-6 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-center space-y-2 border border-indigo-200/50">
              <CheckCircle2 className="w-10 h-10 text-indigo-600 mx-auto" />
              <h3 className="font-bold text-indigo-900 dark:text-indigo-300 text-base">
                {isAr ? "تم إرسال طلب عروض الأسعار بنجاح!" : "Offerteaanvraag succesvol verstuurd!"}
              </h3>
              <p className="text-xs text-indigo-700 dark:text-indigo-400">
                {isAr
                  ? "سيصلك عروض الأسعار وتواصل مباشر من كبار الموردين المعتمدين على بريدك الإلكتروني وهاتفك."
                  : "Leveranciers nemen spoedig contact met u op met een scherp aanbod."}
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setOfferteSent(true);
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? "اسم المتجر أو المطعم أو الشركة:" : "Bedrijfsnaam:"}
                  </label>
                  <input
                    type="text"
                    required
                    value={offerteData.businessName}
                    onChange={(e) => setOfferteData({ ...offerteData, businessName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">KVK-nummer:</label>
                  <input
                    type="text"
                    required
                    placeholder="8 cijfers"
                    value={offerteData.kvk}
                    onChange={(e) => setOfferteData({ ...offerteData, kvk: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? "مجال التوريد المطلوب:" : "Type goederen:"}
                  </label>
                  <select
                    value={offerteData.category}
                    onChange={(e) => setOfferteData({ ...offerteData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="food">{isAr ? "مواد غذائية وبقالة" : "Voeding & Droogwaren"}</option>
                    <option value="meat">{isAr ? "لحوم ودواجن حلال" : "Halal Vlees"}</option>
                    <option value="equipment">{isAr ? "تجهيزات مطاعم ومطابخ" : "Horeca Apparatuur"}</option>
                    <option value="packaging">{isAr ? "علب تغليف ومطبوعات" : "Verpakking"}</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? "حجم التوريد المتوقع شهرياً:" : "Verwacht maandelijks volume:"}
                  </label>
                  <input
                    type="text"
                    value={offerteData.volumeEstimate}
                    onChange={(e) => setOfferteData({ ...offerteData, volumeEstimate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? "الشخص المسؤول:" : "Contactpersoon:"}
                  </label>
                  <input
                    type="text"
                    required
                    value={offerteData.contactPerson}
                    onChange={(e) => setOfferteData({ ...offerteData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? "رقم الهاتف / واتساب:" : "Telefoonnummer:"}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+31 6 ..."
                    value={offerteData.phone}
                    onChange={(e) => setOfferteData({ ...offerteData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? "البريد الإلكتروني:" : "E-mailadres:"}
                  </label>
                  <input
                    type="email"
                    required
                    value={offerteData.email}
                    onChange={(e) => setOfferteData({ ...offerteData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isAr ? "ملاحظات أو مواصفات خاصة للبضاعة المطلوبة:" : "Specifieke wensen of producteisen:"}
                </label>
                <textarea
                  rows={3}
                  value={offerteData.notes}
                  onChange={(e) => setOfferteData({ ...offerteData, notes: e.target.value })}
                  placeholder={isAr ? "حدد الأصناف أو الماركات أو مواعيد التوصيل المطلوبة..." : "Vermeld merken, levertijden..."}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isAr ? "إرسال طلب العروض للموردين المعتمدين" : "Offerteaanvraag verzenden"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
