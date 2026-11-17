/**
 * templates.ts
 * القوالب والنصوص القانونية الرسمية لورقيات وعقود وقرارات الجالية السورية في هولندا (SGN)
 * مستندة ومصاغة وفقاً لـ:
 * 1. النظام الداخلي والهيكل التنظيمي للجالية السورية في هولندا.
 * 2. القانون المدني الهولندي (Burgerlijk Wetboek Boek 2 - Rechtspersonen).
 * 3. تشريعات وقواعد مصلحة الضرائب الهولندية للعمل التطوعي (Belastingdienst Vrijwilligersregeling).
 * 4. اللائحة العامة لحماية البيانات والخصوصية في الاتحاد الأوروبي وهولندا (AVG / GDPR).
 */

import { SITE_URL } from "@/lib/site";

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
  nameNl: "De Syrische Gemeenschap in Nederland",
  shortName: "SGN",
  address: "Laan van Meerdervoort 53-D, 2517 AE Den Haag, Nederland",
  street: "Laan van Meerdervoort 53-D",
  postcodeCity: "2517 AE Den Haag",
  country: "Nederland",
  phone: "+31 6 24795887",
  contactEmail: "info@sy-nl.org",
  website: "www.sy-nl.org",
  officialWebsite: SITE_URL,
  kvkNumber: "96718943",
  legalForm: "Stichting / Vereniging conform Burgerlijk Wetboek Boek 2",
};

export interface VolunteerArticle {
  number: number;
  titleNl: string;
  titleAr: string;
  paragraphsNl: string[];
  paragraphsAr: string[];
}

export const OFFICIAL_VOLUNTEER_ARTICLES: VolunteerArticle[] = [
  {
    number: 1,
    titleNl: "Artikel 1 - Werkzaamheden",
    titleAr: "المادة الأولى - المهام والمسؤوليات التطوعية",
    paragraphsNl: [
      "1. De vrijwilliger werkt als vrijwilliger binnen de hierboven aangegeven afdeling en verricht de bijbehorende taken, zoals omschreven in de functieomschrijving van de organisatie.",
      "2. In overleg kunnen de taken worden aangepast.",
      "3. De vrijwilliger handelt conform het beleid en de doelstellingen van de Syrische Gemeenschap in Nederland."
    ],
    paragraphsAr: [
      "١. يعمل المتطوع بصفة تطوعية ضمن القسم واللجنة المحددة أعلاه، ويؤدي المهام المنوطة به والمبينة في التوصيف المعتمد من الجالية.",
      "٢. يجوز تعديل وتطوير المهام الموكلة بناءً على التشاور والتنسيق المستمر بين الطرفين.",
      "٣. يلتزم المتطوع بالعمل وفق سياسات وأهداف الجالية السورية في هولندا ونظامها الداخلي."
    ]
  },
  {
    number: 2,
    titleNl: "Artikel 2 - Duur van de overeenkomst",
    titleAr: "المادة الثانية - مدة الاتفاقية وساعات العمل",
    paragraphsNl: [
      "1. De vrijwilliger treedt in dienst op de hierboven genoemde startdatum en zet zich gemiddeld :(10-12) uur per week in.",
      "2. De overeenkomst kan door beide partijen worden beëindigd met een opzegtermijn van één maand, acht weken gerekend."
    ],
    paragraphsAr: [
      "١. تسري هذه الاتفاقية من تاريخ البدء المذكور، ويلتزم المتطوع بتقديم متوسط (١٠-١٢) ساعة أسبوعياً.",
      "٢. يحق لأي من الطرفين إنهاء هذه الاتفاقية بإشعار خطي مسبق مدته شهر واحد."
    ]
  },
  {
    number: 3,
    titleNl: "Artikel 3 - Proeftijd",
    titleAr: "المادة الثالثة - فترة التجربة والتقييم",
    paragraphsNl: [
      "1. De eerste maand geldt als proeftijd, waarin beide partijen kunnen beslissen de samenwerking voort te zetten of te beëindigen. Aan het einde vindt een evaluatiegesprek plaats."
    ],
    paragraphsAr: [
      "١. يعتبر الشهر الأول فترة تجربة واستكشاف، يحق خلالها لأي من الطرفين إنهاء التعاون أو الاستمرار به، ويعقد في نهايتها اجتماع تقييمي."
    ]
  },
  {
    number: 4,
    titleNl: "Artikel 4 - Begeleiding, informatie en scholing",
    titleAr: "المادة الرابعة - التوجيه والتدريب والدعم",
    paragraphsNl: [
      "1. De vrijwilliger heeft recht op begeleiding en ondersteuning vanuit de organisatie.",
      "2. Indien gewenst en mogelijk, biedt de organisatie passende scholing aan die relevant is voor de werkzaamheden.",
      "3. De vrijwilliger ontvangt de benodigde informatie over de organisatie, de werkwijze en zijn/haar werkzaamheden."
    ],
    paragraphsAr: [
      "١. يحق للمتطوع الحصول على التوجيه والدعم والمتابعة اللازمة من إدارة الجالية.",
      "٢. تقدم الجالية للمتطوع دورات وورشات تدريبية مناسبة لطبيعة مهامه كلما توفر ذلك.",
      "٣. يتلقى المتطوع كافة المعلومات والمستندات الإرشادية الخاصة بآلية العمل واختصاصاته."
    ]
  },
  {
    number: 5,
    titleNl: "Artikel 5 - Vrijwilligersvergoeding",
    titleAr: "المادة الخامسة - المكافأة التطوعية",
    paragraphsNl: [
      "1. De vrijwilliger ontvangt in beginsel geen vergoeding voor de werkzaamheden. Indien van toepassing kan in overleg een vrijwilligersvergoeding of onkostenvergoeding worden toegekend, conform het beleid van de organisatie."
    ],
    paragraphsAr: [
      "١. الأصل في العمل التطوعي أنه دون مقابل مالي. ويجوز بالاتفاق والتشاور صرف مكافأة تطوعية أو بدل مصاريف وفق ضوابط مصلحة الضرائب الهولندية وسياسات الجالية."
    ]
  },
  {
    number: 6,
    titleNl: "Artikel 6 - Onkostenvergoeding",
    titleAr: "المادة السادسة - تعويض النفقات والمصاريف",
    paragraphsNl: [
      "1. De vrijwilliger ontvangt in beginsel geen onkostenvergoeding. Indien noodzakelijk en in overleg kunnen redelijke, aantoonbare kosten worden vergoed."
    ],
    paragraphsAr: [
      "١. يتم تعويض المتطوع عن المصاريف التشغيلية والتنقل الضرورية والمثبتة بفواتير وإيصالات رسمية بعد أخذ الموافقة المسبقة."
    ]
  },
  {
    number: 7,
    titleNl: "Artikel 7 - Verzekeringen",
    titleAr: "المادة السابعة - التأمين القانوني للمتطوعين",
    paragraphsNl: [
      "1. De Syrische Gemeenschap in Nederland heeft voor haar vrijwilligers een aansprakelijkheidsverzekering voor bedrijven afgesloten, en indien van toepassing een collectieve ongevallenverzekering."
    ],
    paragraphsAr: [
      "١. تشمل الجالية متطوعيها بوثيقة تأمين المسؤولية المدنية والتأمين الجماعي المعتمد في هولندا ضد الحوادث والأضرار أثناء أداء المهام التطوعية."
    ]
  },
  {
    number: 8,
    titleNl: "Artikel 8 - Conflicten",
    titleAr: "المادة الثامنة - حل الخلافات",
    paragraphsNl: [
      "1. Bij geschillen tussen de vrijwilliger en de organisatie wordt de kwestie eerst in onderling overleg besproken. Indien dit niet tot een oplossing leidt, wordt de kwestie voorgelegd aan het bestuur van de organisatie."
    ],
    paragraphsAr: [
      "١. في حال نشوء أي خلاف أو إشكال، تتم معالجته أولاً بالتشاور المباشر والحوار الودي، وفي حال تعذر ذلك يرفع النزاع لمجلس إدارة الجالية للبت فيه."
    ]
  },
  {
    number: 9,
    titleNl: "Artikel 9 - Geheimhoudingsplicht",
    titleAr: "المادة التاسعة - التزام السرية والخصوصية (AVG)",
    paragraphsNl: [
      "1. De vrijwilliger behandelt alle informatie over (de leden, activiteiten en interne zaken van) de organisatie vertrouwelijk, tenzij uitdrukkelijk en schriftelijk anders is overeengekomen of wettelijk verplicht is."
    ],
    paragraphsAr: [
      "١. يلتزم المتطوع بالحفاظ التام على سرية كافة بيانات الأعضاء ومعلومات الجالية وأنشطتها الداخلية، وفقاً لقوانين حماية الخصوصية الأوروبية (AVG/GDPR)."
    ]
  }
];

export const VOLUNTEER_DEPARTMENTS = [
  { id: "media", labelNl: "Media & Communicatie", labelAr: "الإعلام والتواصل" },
  { id: "ict", labelNl: "ICT", labelAr: "تكنولوجيا المعلومات والتقنية" },
  { id: "events", labelNl: "Evenementen", labelAr: "الفعاليات والنشاطات" },
  { id: "projects", labelNl: "Projecten", labelAr: "المشاريع والتطوير" },
  { id: "other", labelNl: "Overig", labelAr: "أخرى" },
];

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
