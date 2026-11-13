/**
 * templates.ts
 * القوالب والنصوص القانونية الرسمية لورقيات وعقود وقرارات الجالية السورية في هولندا (SGN)
 * مستندة ومصاغة وفقاً لـ:
 * 1. النظام الداخلي والهيكل التنظيمي للجالية السورية في هولندا.
 * 2. القانون المدني الهولندي (Burgerlijk Wetboek Boek 2 - Rechtspersonen).
 * 3. تشريعات وقواعد مصلحة الضرائب الهولندية للعمل التطوعي (Belastingdienst Vrijwilligersregeling).
 * 4. اللائحة العامة لحماية البيانات والخصوصية في الاتحاد الأوروبي وهولندا (AVG / GDPR).
 */

export interface DocumentParty {
  name: string;
  idNumber?: string;
  birthDate?: string;
  address?: string;
  city?: string;
  email?: string;
  phone?: string;
  roleOrTitle?: string;
}

export interface DocumentFormData {
  templateId: string;
  refNumber: string;
  issueDateGregorian: string;
  issueDateHijri: string;
  city: string;
  firstParty: DocumentParty;
  secondParty: DocumentParty;
  signatoryBoardMember: {
    name: string;
    titleAr: string;
    titleNl: string;
  };
  customSubject?: string;
  customNotes?: string;
  includeSeal: boolean;
  includeQr: boolean;
  language: "ar" | "nl" | "bilingual";
}

export interface DocumentTemplate {
  id: string;
  category: "volunteer" | "membership" | "board" | "statements";
  titleAr: string;
  titleNl: string;
  descriptionAr: string;
  legalBasisAr: string;
  legalBasisNl: string;
  badge: string;
}

export const SGN_ORGANIZATION_INFO = {
  nameAr: "الجالية السورية في هولندا",
  nameNl: "Stichting De Syrische Gemeenschap in Nederland",
  shortName: "SGN",
  kvkNumber: "96718943",
  country: "Nederland",
  officialWebsite: "https://sgn-drab.vercel.app",
  contactEmail: "info@sy-nl.org",
  legalForm: "Stichting / Vereniging conform Burgerlijk Wetboek Boek 2",
};

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "volunteer_agreement",
    category: "volunteer",
    titleAr: "اتفاقية تطوع رسمية وفق القانون الهولندي",
    titleNl: "Vrijwilligersovereenkomst conform Nederlandse Wetgeving",
    descriptionAr: "عقد تطوع رسمي يحدد المهام وبدل المصاريف والتأمين القانوني دون تشكيل علاقة عمل ملزمة.",
    legalBasisAr: "قواعد مصلحة الضرائب الهولندية (Belastingdienst) والمادة 7:610 من القانون المدني الهولندي والتأمين البلدي للمتطوعين (VNG).",
    legalBasisNl: "Conform fiscale vrijwilligersregeling Belastingdienst, art. 7:610 BW en VNG Vrijwilligerspolis.",
    badge: "عقد قانوني ملزم",
  },
  {
    id: "membership_application",
    category: "membership",
    titleAr: "استمارة وطلب انتساب رسمي للجالية",
    titleNl: "Aanvraagformulier Lidmaatschap en Verklaring",
    descriptionAr: "طلب انتساب رسمي يتضمن إقرار الالتزام بالنظام الداخلي وحماية البيانات وفق اللائحة الأوروبية AVG.",
    legalBasisAr: "النظام الداخلي للجالية والمادة 2:27 وما يليها من القانون المدني الهولندي ولائحة الخصوصية AVG.",
    legalBasisNl: "Statuten SGN, Boek 2 Burgerlijk Wetboek en Algemene Verordening Gegevensbescherming (AVG).",
    badge: "استمارة عضوية",
  },
  {
    id: "confidentiality_avg",
    category: "volunteer",
    titleAr: "تعهد سرية وحماية البيانات الشخصية (AVG)",
    titleNl: "Geheimhoudingsverklaring en Privacybeleid (AVG/GDPR)",
    descriptionAr: "إقرار وتعهد ملزم بعدم إفشاء أو استغلال بيانات الأعضاء والوثائق الشخصية أثناء العمل أو بعده.",
    legalBasisAr: "المادتان 6 و 9 من اللائحة العامة لحماية البيانات (AVG) وقانون حماية الخصوصية الهولندي.",
    legalBasisNl: "Art. 6 & 9 Algemene Verordening Gegevensbescherming (AVG) & UAVG.",
    badge: "إقرار أمان وخصوصية",
  },
  {
    id: "board_resolution",
    category: "board",
    titleAr: "قرار مجلس إدارة رسمي وموثق",
    titleNl: "Officieel Bestuursbesluit van het Bestuur",
    descriptionAr: "صيغة قانونية لإصدار واعتماد قرارات مجلس الإدارة بالأغلبية وتوثيق تاريخ الجلسة والتنفيذ.",
    legalBasisAr: "المادة 2:291 من القانون المدني الهولندي (صلاحيات هيئة الإدارة) ولائحة القرارات الإدارية.",
    legalBasisNl: "Art. 2:291 Burgerlijk Wetboek (Bestuursbevoegdheid) en statuten SGN.",
    badge: "قرار إداري نافذ",
  },
  {
    id: "volunteer_certificate",
    category: "statements",
    titleAr: "شهادة إثبات ساعات وخبرة عمل تطوعي",
    titleNl: "Vrijwilligerscertificaat en Participatieverklaring",
    descriptionAr: "شهادة موجهة للبلديات (Gemeente) ومكاتب العمل والاندماج تثبت نشاط المتطوع وساعاته.",
    legalBasisAr: "قانون المشاركة والاندماج الهولندي (Participatiewet & Wet Inburgering).",
    legalBasisNl: "Ten behoeve van Participatiewet, Wet Inburgering en CV-opbouw.",
    badge: "شهادة رسمية معتمدة",
  },
  {
    id: "membership_statement",
    category: "statements",
    titleAr: "إفادة عضوية رسمية موجهة للدوائر الرسمية",
    titleNl: "Officiële Lidmaatschapsverklaring voor Instanties",
    descriptionAr: "كتاب رسمي يثبت صفة المنتسب ورقمه المرجعي لتقديمه للبلديات أو البنوك أو المحاكم أو المنظمات.",
    legalBasisAr: "السجل الرسمي للجمعيات والمؤسسات رقم KvK: 96718943.",
    legalBasisNl: "Handelsregister Kamer van Koophandel (KvK 96718943).",
    badge: "إفادة رسمية",
  },
  {
    id: "official_authorization",
    category: "board",
    titleAr: "كتاب تفويض وتمثيل إداري وقانوني",
    titleNl: "Officiële Machtiging en Vertegenwoordiging",
    descriptionAr: "كتاب تفويض رسمي صادر عن مجلس الإدارة لعضو أو متطوع لتمثيل الجالية بحدود وصلاحيات محددة.",
    legalBasisAr: "أحكام الوكالة والتفويض في القانون المدني الهولندي (Boek 3, Titel 3 BW).",
    legalBasisNl: "Volmacht conform Boek 3, Titel 3 Burgerlijk Wetboek.",
    badge: "تفويض رسمي",
  },
  {
    id: "board_minutes",
    category: "board",
    titleAr: "محضر اجتماع مجلس الإدارة الرسمي",
    titleNl: "Notulen van de Bestuursvergadering",
    descriptionAr: "محضر توثيقي لجدول الأعمال والمداولات والنصاب القانوني وتواقيع هيئة المكتب.",
    legalBasisAr: "المادة 2:291 من القانون المدني الهولندي واللوائح الداخلية للجالية.",
    legalBasisNl: "Art. 2:291 BW en reglementen van bestuur SGN.",
    badge: "محضر جلسة",
  },
];

export const BOARD_OFFICERS = [
  { name: "عبد المنعم الشامان", titleAr: "رئيس مجلس الإدارة", titleNl: "Voorzitter van het Bestuur" },
  { name: "صالح المحمد حنايا", titleAr: "نائب رئيس مجلس الإدارة", titleNl: "Vicevoorzitter van het Bestuur" },
  { name: "خالد فيصل الطويل", titleAr: "الأمين العام للجالية", titleNl: "Secretaris-Generaal" },
  { name: "محمد سليم عزيزة", titleAr: "عضو مكتب الأمانة العامة (المسؤول التقني)", titleNl: "Lid Secretariaat-Generaal (Technisch Manager)" },
  { name: "محمد رائد كعكة", titleAr: "رئيس المكتب المالي", titleNl: "Penningmeester" },
  { name: "أحمد الحرفي", titleAr: "عضو مكتب الأمانة العامة (المسؤول التنظيمي)", titleNl: "Lid Secretariaat-Generaal (Organisatorisch Manager)" },
  { name: "هدى الحلاق", titleAr: "مديرة المكتب الإعلامي", titleNl: "Directeur Media & Communicatie" },
  { name: "رائد دهموش المشهور", titleAr: "مسؤول العلاقات الخارجية", titleNl: "Manager Externe Relaties" },
  { name: "رابعة الزريقات", titleAr: "مسؤولة الشؤون القانونية", titleNl: "Juridisch Adviseur & Zaken" },
  { name: "محمود الناصر", titleAr: "مسؤول العلاقات الدولية", titleNl: "Manager Internationale Relaties" },
  { name: "فاتن رحال", titleAr: "رئيسة مكتب شؤون المرأة والأسرة", titleNl: "Hoofd Vrouwen- en Gezinszaken" },
  { name: "عمر النويلاتي", titleAr: "مسؤول النشاطات والفعاليات", titleNl: "Coördinator Activiteiten & Evenementen" },
];
