/**
 * إدخال بيانات أولية (seed) للجداول الجديدة على كل من SQLite المحلي وTurso.
 *
 * الاستخدام:
 *   node scripts/seed-services.cjs              # يزرع المحلي + Turso
 *   node scripts/seed-services.cjs --local      # المحلي فقط
 *   node scripts/seed-services.cjs --turso      # Turso فقط
 *
 * البيانات: شركاء كاش باك، منتجات بازار، موردو B2B، عروض توفير جماعي.
 */
const { createClient } = require("@libsql/client");
const { PrismaClient } = require("@prisma/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// تحميل .env
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=["']?(.+?)["']?\s*$/);
    if (m && process.env[m[1].trim()] === undefined) {
      process.env[m[1].trim()] = m[2].trim();
    }
  }
}

function clean(v) {
  return (v ?? "").replace(/[^\x20-\x7E]/g, "").trim().replace(/^["']|["']$/g, "");
}

function uid() {
  // توليد ID بنفس نمط cuid القصير
  return "c" + crypto.randomBytes(12).toString("hex").slice(0, 24);
}

const args = process.argv.slice(2);
const doLocal = !args.includes("--turso");
const doTurso = !args.includes("--local");

// ======== بيانات البذر ========

const partners = [
  {
    nameAr: "سوبرماركت الشام", nameNl: "Al-Sham Supermarkt", nameEn: "Al-Sham Supermarket",
    category: "supermarket", discount: 10, city: "Rotterdam", address: "Rijnhaven 12, 3011 Rotterdam",
    cashbackType: "instant", rating: 4.6, reviewCount: 128, isActive: true, isFeatured: true,
    phone: "+31101234567", whatsapp: "+31612345678", website: "https://alsham.nl",
    highlightAr: "خصم ١٠٪ فوري على جميع المنتجات", highlightNl: "Direct 10% korting op alles", highlightEn: "Instant 10% off everything"
  },
  {
    nameAr: "مطعم بغداد", nameNl: "Baghdad Restaurant", nameEn: "Baghdad Restaurant",
    category: "restaurant", discount: 15, city: "Amsterdam", address: "Damrak 45, 1012 Amsterdam",
    cashbackType: "cashback", rating: 4.8, reviewCount: 256, isActive: true, isFeatured: true,
    phone: "+31201234567", whatsapp: "+31687654321", website: "https://baghdad.nl",
    highlightAr: "استرداد ١٥٪ من قيمة الطلب", highlightNl: "15% cashback op bestellingen", highlightEn: "15% cashback on orders"
  },
  {
    nameAr: "حلويات الشام", nameNl: "Al-Sham Sweets", nameEn: "Al-Sham Sweets",
    category: "sweets", discount: 12, city: "Utrecht", address: "Voorstraat 88, 3511 Utrecht",
    cashbackType: "instant", rating: 4.9, reviewCount: 342, isActive: true, isFeatured: false,
    whatsapp: "+31611112222",
    highlightAr: "خصم ١٢٪ على جميع الحلويات", highlightNl: "12% korting op alle zoetigheden", highlightEn: "12% off all sweets"
  },
  {
    nameAr: "مركز صيانة النور", nameNl: "Noor Auto Service", nameEn: "Noor Auto Service",
    category: "auto", discount: 8, city: "The Hague", address: "Laan 1945 67, 2518 Den Haag",
    cashbackType: "instant", rating: 4.4, reviewCount: 89, isActive: true, isFeatured: false,
    phone: "+31701234567",
    highlightAr: "خصم ٨٪ على الصيانة والإصلاحات", highlightNl: "8% korting op onderhoud", highlightEn: "8% off maintenance"
  },
  {
    nameAr: "عطور الأندلس", nameNl: "Al-Andalus Perfumes", nameEn: "Al-Andalus Perfumes",
    category: "fashion", discount: 20, city: "Rotterdam", address: "Lijnbaan 120, 3012 Rotterdam",
    cashbackType: "cashback", rating: 4.5, reviewCount: 67, isActive: true, isFeatured: true,
    website: "https://alandalus-perfumes.nl",
    highlightAr: "استرداد ٢٠٪ على العطور", highlightNl: "20% cashback op parfums", highlightEn: "20% cashback on perfumes"
  },
];

const bazaarItems = [
  {
    titleAr: "كبسة لحم سورية", titleNl: "Syrische lams kabsah", titleEn: "Syrian lamb kabsa",
    category: "food", producerName: "أم أحمد", city: "Rotterdam", province: "Zuid-Holland",
    price: 12.5, unit: "طبق", whatsapp: "+31612345678", delivery: true, isActive: true,
    badgeAr: "الأكثر طلباً", badgeNl: "Populair", badgeEn: "Popular",
    descriptionAr: "كبسة لحم ضأن سورية أصلية مع الأرز البسمتي", descriptionNl: "Authentieke Syrische lams kabsah met basmatirijst", descriptionEn: "Authentic Syrian lamb kabsa with basmati rice"
  },
  {
    titleAr: "حلق شغل يدوي", titleNl: "Handgemaakte oorringen", titleEn: "Handmade earrings",
    category: "crafts", producerName: "فاطمة العلي", city: "Amsterdam", province: "Noord-Holland",
    price: 8.0, unit: "زوج", whatsapp: "+31687654321", delivery: true, isActive: true,
    descriptionAr: "حلق شغل يدوي بتصاميم شرقية أنيقة", descriptionNl: "Handgemaakte oorringen met oosterse designs", descriptionEn: "Handmade earrings with elegant oriental designs"
  },
  {
    titleAr: "بقلاوة بالفستق", titleNl: "Baklava met pistache", titleEn: "Pistachio baklava",
    category: "sweets", producerName: "حلويات أم محمد", city: "Utrecht", province: "Utrecht",
    price: 15.0, unit: "صندوق ٥٠٠غ", whatsapp: "+31611112222", delivery: true, isActive: true,
    badgeAr: "جديد", badgeNl: "Nieuw", badgeEn: "New",
    descriptionAr: "بقلاوة طازجة بالفستق الحلبي", descriptionNl: "Verse baklava met Aleppo pistache", descriptionEn: "Fresh baklava with Aleppo pistachio"
  },
  {
    titleAr: "ثوب أطفال مخيط يدوي", titleNl: "Handgenaaide kinderkleding", titleEn: "Hand-sewn children's clothes",
    category: "sewing", producerName: "خياطة أم كريم", city: "The Hague", province: "Zuid-Holland",
    price: 25.0, unit: "قطعة", whatsapp: "+31699998888", delivery: true, isActive: true,
    descriptionAr: "ثياب أطفال مخيطة يدوياً بأقمشة قطنية", descriptionNl: "Handgenaaide kinderkleding van katoen", descriptionEn: "Hand-sewn children's clothes from cotton fabric"
  },
];

const suppliers = [
  {
    companyName: "مستودع بهار الشرق", category: "food", city: "Rotterdam",
    minOrder: "€100", description: "توريد بهارات ومواد غذائية بالجملة للمطاعم والمتاجر",
    kvk: "87654321", verified: true, contactEmail: "info@balkar.nl",
    contactPhone: "+31104445566", contactWhatsapp: "+31644445555",
    website: "https://balkar-groothandel.nl", badge: "موثّق", isActive: true, isFeatured: true
  },
  {
    companyName: "تعبئة وتغليف دلتا", category: "packaging", city: "Amsterdam",
    minOrder: "€50", description: "أوعية بلاستيكية، صناديق كرتون، وأكياس تغليف",
    kvk: "76543210", verified: true, contactEmail: "sales@delta-pack.nl",
    contactWhatsapp: "+31655556666", website: "https://delta-pack.nl",
    badge: "موثّق", isActive: true, isFeatured: true
  },
  {
    companyName: "لازمير لحوم الجملة", category: "meat", city: "Utrecht",
    minOrder: "€200", description: "لحوم حلال طازجة بالجملة (ضأن، بقري، دجاج)",
    kvk: "65432109", verified: false, contactEmail: "orders@lazmeer.nl",
    contactPhone: "+31307778899", badge: "جديد", isActive: true, isFeatured: false
  },
  {
    companyName: "شبكة لوجستك فان", category: "logistics", city: "Rotterdam",
    minOrder: "€30", description: "خدمات توصيل وشحن للجملة داخل نيديرلاند",
    kvk: "54321098", verified: true, contactWhatsapp: "+31677778888",
    website: "https://vanlog.nl", badge: "موثّق", isActive: true, isFeatured: false
  },
];

const deals = [
  {
    titleAr: "عرض الطاقة الجماعي", titleNl: "Collectief energiecontract", titleEn: "Collective energy deal",
    category: "energy", provider: "GreenChoice", badgeAr: "وفّر حتى ٤٠٠€ سنوياً",
    badgeNl: "Bespaar tot €400/jaar", badgeEn: "Save up to €400/year",
    avgSavingYear: 380.0,
    perksAr: "كهرباء خضراء ١٠٠٪ + غاز بدون مخفية", perksNl: "100% groene stroom + gas zonder verborgen kosten", perksEn: "100% green electricity + gas without hidden costs",
    deadline: "2026-12-31", isActive: true
  },
  {
    titleAr: "تأمين صحي جماعي", titleNl: "Collectieve zorgverzekering", titleEn: "Collective health insurance",
    category: "health", provider: "CZ", badgeAr: "خصم ٥٪ على القسط",
    badgeNl: "5% korting op premie", badgeEn: "5% discount on premium",
    avgSavingYear: 156.0,
    perksAr: "تغطية طب الأسنان + علاج طبيعي", perksNl: "Tandartsdekking + fysiotherapie", perksEn: "Dental coverage + physiotherapy",
    deadline: "2026-12-31", isActive: true
  },
  {
    titleAr: "إنترنت فايبر أسرع", titleNl: "Snel glasvezel internet", titleEn: "Fast fiber internet",
    category: "internet", provider: "KPN", badgeAr: "١٠٠ ميجابت ب٣٥€ شهرياً",
    badgeNl: "100 Mbps voor €35/maand", badgeEn: "100 Mbps for €35/month",
    avgSavingYear: 120.0,
    perksAr: "تركيب مجاني + روتر مجاني", perksNl: "Gratis installatie + gratis router", perksEn: "Free installation + free router",
    deadline: "2026-06-30", isActive: true
  },
];

// ======== الدوال ========

async function seedPrisma() {
  const localDbPath = path.resolve(__dirname, "..", "prisma", "dev.db");
  const adapter = new PrismaLibSql({ url: `file:${localDbPath}` });
  const prisma = new PrismaClient({ adapter });
  console.log("🌱 Seeding local SQLite (prisma/dev.db)...");

  for (const p of partners) {
    await prisma.partnerStore.upsert({
      where: { id: `seed-ps-${p.nameAr}` },
      update: p,
      create: { ...p, id: `seed-ps-${p.nameAr}` },
    });
  }
  console.log(`  ✅ ${partners.length} partners`);

  for (const b of bazaarItems) {
    await prisma.bazaarItem.upsert({
      where: { id: `seed-bi-${b.titleAr}` },
      update: b,
      create: { ...b, id: `seed-bi-${b.titleAr}` },
    });
  }
  console.log(`  ✅ ${bazaarItems.length} bazaar items`);

  for (const s of suppliers) {
    await prisma.supplier.upsert({
      where: { id: `seed-sp-${s.companyName}` },
      update: s,
      create: { ...s, id: `seed-sp-${s.companyName}` },
    });
  }
  console.log(`  ✅ ${suppliers.length} suppliers`);

  for (const d of deals) {
    await prisma.collectiveDeal.upsert({
      where: { id: `seed-cd-${d.titleAr}` },
      update: d,
      create: { ...d, id: `seed-cd-${d.titleAr}` },
    });
  }
  console.log(`  ✅ ${deals.length} collective deals`);

  await prisma.$disconnect();
}

async function seedTurso() {
  const url = clean(process.env.TURSO_DATABASE_URL);
  const token = clean(process.env.TURSO_AUTH_TOKEN);
  if (!url || !token || url === "[SENSITIVE]") {
    console.log("⚠️  Turso credentials not found — skipping Turso seed.");
    return;
  }
  const finalUrl = /^[a-z]+:\/\//i.test(url) ? url : `libsql://${url}`;
  const client = createClient({ url: finalUrl, authToken: token });
  console.log(`🌱 Seeding Turso (${finalUrl.replace(/\/\/.*@/, "//")})...`);

  const now = new Date().toISOString();

  for (const p of partners) {
    const id = `seed-ps-${p.nameAr}`;
    await client.execute({
      sql: `INSERT INTO "PartnerStore" (id,nameAr,nameNl,nameEn,category,discount,city,address,cashbackType,rating,reviewCount,isActive,isFeatured,phone,whatsapp,website,logo,highlightAr,highlightNl,highlightEn,createdAt,updatedAt)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET nameAr=excluded.nameAr,discount=excluded.discount,updatedAt=excluded.updatedAt`,
      args: [id, p.nameAr, p.nameNl, p.nameEn, p.category, p.discount, p.city, p.address,
        p.cashbackType, p.rating, p.reviewCount, p.isActive ? 1 : 0, p.isFeatured ? 1 : 0,
        p.phone || null, p.whatsapp || null, p.website || null, null,
        p.highlightAr || null, p.highlightNl || null, p.highlightEn || null, now, now]
    });
  }
  console.log(`  ✅ ${partners.length} partners`);

  for (const b of bazaarItems) {
    const id = `seed-bi-${b.titleAr}`;
    await client.execute({
      sql: `INSERT INTO "BazaarItem" (id,titleAr,titleNl,titleEn,category,producerName,city,province,price,unit,descriptionAr,descriptionNl,descriptionEn,whatsapp,delivery,image,badgeAr,badgeNl,badgeEn,isActive,views,createdAt,updatedAt)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET titleAr=excluded.titleAr,price=excluded.price,updatedAt=excluded.updatedAt`,
      args: [id, b.titleAr, b.titleNl, b.titleEn, b.category, b.producerName, b.city, b.province,
        b.price, b.unit, b.descriptionAr || null, b.descriptionNl || null, b.descriptionEn || null,
        b.whatsapp, b.delivery ? 1 : 0, null, b.badgeAr || null, b.badgeNl || null, b.badgeEn || null,
        b.isActive ? 1 : 0, 0, now, now]
    });
  }
  console.log(`  ✅ ${bazaarItems.length} bazaar items`);

  for (const s of suppliers) {
    const id = `seed-sp-${s.companyName}`;
    await client.execute({
      sql: `INSERT INTO "Supplier" (id,companyName,category,city,minOrder,description,kvk,verified,contactEmail,contactPhone,contactWhatsapp,website,logo,badge,isActive,isFeatured,createdAt,updatedAt)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET companyName=excluded.companyName,verified=excluded.verified,updatedAt=excluded.updatedAt`,
      args: [id, s.companyName, s.category, s.city, s.minOrder, s.description, s.kvk,
        s.verified ? 1 : 0, s.contactEmail || null, s.contactPhone || null, s.contactWhatsapp || null,
        s.website || null, null, s.badge || null, s.isActive ? 1 : 0, s.isFeatured ? 1 : 0, now, now]
    });
  }
  console.log(`  ✅ ${suppliers.length} suppliers`);

  for (const d of deals) {
    const id = `seed-cd-${d.titleAr}`;
    await client.execute({
      sql: `INSERT INTO "CollectiveDeal" (id,titleAr,titleNl,titleEn,category,provider,badgeAr,badgeNl,badgeEn,avgSavingYear,perksAr,perksNl,perksEn,deadline,isActive,createdAt,updatedAt)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET titleAr=excluded.titleAr,avgSavingYear=excluded.avgSavingYear,updatedAt=excluded.updatedAt`,
      args: [id, d.titleAr, d.titleNl, d.titleEn, d.category, d.provider,
        d.badgeAr || null, d.badgeNl || null, d.badgeEn || null, d.avgSavingYear,
        d.perksAr || null, d.perksNl || null, d.perksEn || null, d.deadline || null,
        d.isActive ? 1 : 0, now, now]
    });
  }
  console.log(`  ✅ ${deals.length} collective deals`);

  client.close();
}

(async () => {
  try {
    if (doLocal) await seedPrisma();
    if (doTurso) await seedTurso();
    console.log("\n🌱 Seed complete!");
    process.exit(0);
  } catch (e) {
    console.error("💥 Seed error:", e.message);
    process.exit(1);
  }
})();
