"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { 
  ShoppingBag, Gift, Wrench, Search, MapPin, Tag, Plus, 
  Phone, MessageSquare, CheckCircle2, ShieldCheck,
  ArrowLeft, ArrowRight, X, Loader2, Image as ImageIcon, Trash2
} from "lucide-react";

type TabType = "all" | "gratis" | "marketplace" | "services";

interface ListingItem {
  id: string;
  type: "gratis" | "marketplace" | "service";
  titleAr: string;
  titleEn: string;
  titleNl: string;
  category: string;
  priceAr: string;
  priceNl: string;
  isFree: boolean;
  city: string;
  province: string;
  conditionAr?: string | null;
  conditionNl?: string | null;
  image?: string | null;
  descriptionAr?: string | null;
  descriptionNl?: string | null;
  descriptionEn?: string | null;
  sellerName: string;
  sellerPhone: string;
  verified: boolean;
  createdAt: string;
}

export default function MarktplaatsPage() {
  const locale = useLocale() as "ar" | "en" | "nl";
  const isAr = locale === "ar";
  const isNl = locale === "nl";
  const dir = isAr ? "rtl" : "ltr";

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [selectedProvince, setSelectedProvince] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSubmitted, setAddSubmitted] = useState(false);
  const [items, setItems] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);

  // جلب الإعلانات من الـ API
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (activeTab === "gratis") params.set("type", "gratis");
        else if (activeTab === "marketplace") params.set("type", "marketplace");
        else if (activeTab === "services") params.set("type", "service");
        if (selectedProvince !== "all") params.set("province", selectedProvince);
        if (searchQuery.trim()) params.set("q", searchQuery.trim());

        const res = await fetch(`/api/marketplace?${params.toString()}`);
        const data = await res.json();
        setItems((data.items as ListingItem[]) || []);
      } catch (err) {
        console.error("Failed to fetch marketplace items:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [activeTab, selectedProvince, searchQuery]);

  // رفع صورة الإعلان
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(isAr ? "حجم الصورة يجب أن يكون أقل من ٥ ميجابايت" : "Image must be less than 5MB");
      return;
    }
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setImageUrl(data.url);
    } catch (err) {
      console.error("Image upload failed:", err);
      alert(isAr ? "فشل رفع الصورة" : "Image upload failed");
    } finally {
      setImageUploading(false);
      e.target.value = "";
    }
  };

  // إضافة إعلان جديد
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const form = e.currentTarget;
      const fd = new FormData(form);
      const payload = {
        type: fd.get("type") as string,
        titleAr: fd.get("titleAr") as string,
        titleNl: fd.get("titleNl") as string,
        titleEn: fd.get("titleEn") as string || (fd.get("titleNl") as string),
        category: fd.get("category") as string,
        priceAr: fd.get("priceAr") as string,
        priceNl: fd.get("priceNl") as string,
        isFree: (fd.get("isFree") as string) === "true",
        city: fd.get("city") as string,
        province: fd.get("province") as string,
        conditionAr: fd.get("conditionAr") as string,
        conditionNl: fd.get("conditionNl") as string,
        image: imageUrl || null,
        descriptionAr: fd.get("descriptionAr") as string,
        descriptionNl: fd.get("descriptionNl") as string,
        descriptionEn: fd.get("descriptionEn") as string,
        sellerName: fd.get("sellerName") as string,
        sellerPhone: fd.get("sellerPhone") as string,
      };

      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setItems((prev) => [data.item as ListingItem, ...prev]);
      setImageUrl("");
      setAddSubmitted(true);
    } catch (err: any) {
      alert(err?.message || "حدث خطأ أثناء نشر الإعلان");
    } finally {
      setSubmitting(false);
    }
  };

  // إعادة تعيين النموذج عند إغلاق النافذة
  const closeModal = () => {
    setShowAddModal(false);
    setAddSubmitted(false);
    setImageUrl("");
  };

  return (
    <div dir={dir} className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <Link
            href={`/${locale}/services`}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{isAr ? "العودة إلى الخدمات" : isNl ? "Terug naar Diensten" : "Back to Services"}</span>
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#1a5632] hover:bg-[#0f3d23] text-white text-xs font-black shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? "أضف تبرعاً أو خدمة" : isNl ? "Plaats advertentie / dienst" : "Post Donation / Service"}</span>
          </button>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-4 py-1.5 rounded-full border border-emerald-500/20">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{isAr ? "سوق التكافل وتبادل الأثاث والخدمات (SGN Marktplaats)" : isNl ? "SGN Marktplaats & Diensten" : "SGN Marketplace & Services"}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            {isAr ? "التكافل بين أفراد الجالية في كل هولندا" : isNl ? "Samen delen, ruilen en helpen in heel Nederland" : "Sharing, Swapping & Mutual Help Across the Netherlands"}
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base max-w-2xl mx-auto">
            {isAr 
              ? "منصة آمنة للتبرع بالأثاث والأجهزة مجاناً للقادمين الجدد، البيع بأسعار رمزية، ودليل الحرفيين السوريين المعتمدين في هولندا."
              : isNl
              ? "Gratis meubels en apparaten voor statushouders, voordelige spullen en een gids van betrouwbare Syrische vakmensen in Nederland."
              : "Free furniture & appliances for newcomers, low-cost community items, and directory of verified Syrian tradesmen in the Netherlands."}
          </p>
        </div>

        {/* Search & Tabs Controls */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 md:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          {/* Main Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            {[
              { id: "all", ar: "الكل", nl: "Alles tonen", icon: ShoppingBag },
              { id: "gratis", ar: "مجاناً للقادمين الجدد", nl: "Gratis donaties", icon: Gift },
              { id: "marketplace", ar: "بيع بأسعار رمزية", nl: "Voordelig marktplaats", icon: Tag },
              { id: "services", ar: "دليل الحرفيين والمستقلين", nl: "Vakmensen & Diensten", icon: Wrench },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-[#1a5632] text-white shadow-md"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{isAr ? tab.ar : tab.nl}</span>
                </button>
              );
            })}
          </div>

          {/* Search bar & Province Filter */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-8 relative">
              <Search className="w-4 h-4 absolute top-3.5 right-3.5 text-slate-400 rtl:right-3.5 rtl:left-auto ltr:left-3.5 ltr:right-auto" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? "ابحث عن أثاث، غسالة، طاولة، كهربائي، دهان..." : "Zoek op meubels, witgoed, schilder, elektricien..."}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 pr-10 rtl:pr-10 rtl:pl-4 ltr:pl-10 ltr:pr-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-4">
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">{isAr ? "كافة المقاطعات الـ ١٢" : "Alle 12 provincies"}</option>
                <option value="Utrecht">Utrecht (أوترخت)</option>
                <option value="Zuid-Holland">Zuid-Holland (روتردام ولاهاي)</option>
                <option value="Noord-Holland">Noord-Holland (أمستردام)</option>
                <option value="Noord-Brabant">Noord-Brabant (آيندهوفن)</option>
                <option value="Gelderland">Gelderland (آرنهم ونيميخن)</option>
                <option value="Overijssel">Overijssel (إنسخيده)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-500">
              {isAr ? "لا توجد إعلانات مطابقة حالياً" : isNl ? "Geen advertenties gevonden" : "No listings found"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Image Container */}
                  <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.titleAr}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-900">
                        <ShoppingBag className="w-12 h-12 text-emerald-300" />
                      </div>
                    )}
                    {/* Badge */}
                    <div className="absolute top-3 right-3 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black shadow-md ${
                        item.isFree
                          ? "bg-emerald-600 text-white"
                          : item.type === "service"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-900 text-white"
                      }`}>
                        {isAr ? item.priceAr : item.priceNl}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 rtl:left-3 rtl:right-auto ltr:right-3 ltr:left-auto bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      <span>{item.city} ({item.province})</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 space-y-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white line-clamp-2 leading-snug">
                      {isAr ? item.titleAr : item.titleNl}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {isAr ? item.descriptionAr : item.descriptionNl}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        {item.sellerName}
                      </span>
                      <span>{isAr ? item.conditionAr : item.conditionNl}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-5 pt-0 flex items-center gap-2">
                  <a
                    href={`https://wa.me/${item.sellerPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(isAr ? `مرحباً، بخصوص إعلانك على SGN: ${item.titleAr}` : `Hallo, over uw advertentie op SGN: ${item.titleNl}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{isAr ? "محادثة واتساب" : "WhatsApp"}</span>
                  </a>
                  <a
                    href={`tel:${item.sellerPhone}`}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div dir={dir} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 space-y-6">
              {!addSubmitted ? (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {isAr ? "إضافة إعلان أو خدمة جديدة" : "Nieuwe advertentie plaatsen"}
                    </h3>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {isAr ? "نوع الإعلان:" : "Type advertentie:"}
                    </label>
                    <select name="type" required defaultValue="gratis"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white">
                      <option value="gratis">{isAr ? "تبرع مجاني (Gratis)" : "Gratis donatie"}</option>
                      <option value="marketplace">{isAr ? "بيع بأسعار رمزية" : "Voordelige verkoop"}</option>
                      <option value="service">{isAr ? "خدمة / حرفي" : "Dienst / Vakman"}</option>
                    </select>
                  </div>

                  {/* Titles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {isAr ? "العنوان بالعربية:" : "Titel (Arabisch):"}
                      </label>
                      <input name="titleAr" type="text" required
                        placeholder={isAr ? "طاولة طعام مجانية" : "Gratis eettafel"}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {isAr ? "العنوان بالهولندية:" : "Titel (Nederlands):"}
                      </label>
                      <input name="titleNl" type="text" required
                        placeholder="Gratis eettafel"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white" />
                    </div>
                  </div>

                  {/* Category + Province */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {isAr ? "التصنيف:" : "Categorie:"}
                      </label>
                      <select name="category" required defaultValue="furniture"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white">
                        <option value="furniture">{isAr ? "أثاث" : "Meubels"}</option>
                        <option value="appliances">{isAr ? "أجهزة منزلية" : "Apparaten"}</option>
                        <option value="craftsman">{isAr ? "حرفي / خدمة" : "Vakman / Dienst"}</option>
                        <option value="other">{isAr ? "أخرى" : "Overig"}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {isAr ? "المقاطعة:" : "Provincie:"}
                      </label>
                      <select name="province" required defaultValue="Utrecht"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white">
                        <option value="Utrecht">Utrecht</option>
                        <option value="Zuid-Holland">Zuid-Holland</option>
                        <option value="Noord-Holland">Noord-Holland</option>
                        <option value="Noord-Brabant">Noord-Brabant</option>
                        <option value="Gelderland">Gelderland</option>
                        <option value="Overijssel">Overijssel</option>
                      </select>
                    </div>
                  </div>

                  {/* City + Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {isAr ? "المدينة:" : "Stad:"}
                      </label>
                      <input name="city" type="text" required placeholder="Amsterdam"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {isAr ? "السعر:" : "Prijs:"}
                      </label>
                      <input name="priceAr" type="text" required placeholder="مجاناً"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white" />
                      <input name="priceNl" type="hidden" value="Gratis" />
                      <input name="isFree" type="hidden" value="true" />
                    </div>
                  </div>

                  {/* Seller name + phone */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {isAr ? "اسم البائع:" : "Naam verkoper:"}
                      </label>
                      <input name="sellerName" type="text" required placeholder={isAr ? "أبو فلان" : "Naam"}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {isAr ? "الهاتف:" : "Telefoon:"}
                      </label>
                      <input name="sellerPhone" type="tel" required placeholder="+31 6 ..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white" />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? "الوصف:" : "Omschrijving:"}
                    </label>
                    <textarea name="descriptionAr" rows={3} required
                      placeholder={isAr ? "تفاصيل حالة الغرض والمقاسات..." : "Details over staat, afmetingen..."}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white" />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                    >
                      {isAr ? "إلغاء" : "Annuleren"}
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2.5 rounded-xl bg-[#1a5632] hover:bg-[#0f3d23] disabled:opacity-50 text-white font-black text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {submitting ? (isAr ? "جاري النشر..." : "Plaatsen...") : (isAr ? "نشر الإعلان الآن" : "Advertentie plaatsen")}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="py-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {isAr ? "تم نشر إعلانك بنجاح!" : "Advertentie succesvol geplaatst!"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAr ? "أصبح الإعلان متاحاً الآن لكافة أبناء الجالية في هولندا." : "Uw advertentie is nu zichtbaar voor de gemeenschap."}
                  </p>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setAddSubmitted(false);
                    }}
                    className="px-6 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold cursor-pointer"
                  >
                    {isAr ? "إغلاق" : "Sluiten"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
