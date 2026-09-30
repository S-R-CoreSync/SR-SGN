import { NextResponse } from "next/server";

export interface QuizQuestion {
  id: string;
  category: "knm" | "work" | "health" | "housing";
  questionAr: string;
  questionNl: string;
  questionEn: string;
  optionsAr: string[];
  optionsNl: string[];
  optionsEn: string[];
  correctIndex: number;
  explanationAr: string;
  explanationNl: string;
  explanationEn: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    category: "health",
    questionAr: "أنت مريض جداً في عطلة نهاية الأسبوع (يوم الأحد) وتحتاج إلى طبيب غير إسعافي. من تتصل؟",
    questionNl: "U bent in het weekend erg ziek en heeft een arts nodig (geen levensgevaar). Wie belt u?",
    questionEn: "You are very sick during the weekend and need a doctor (not life-threatening). Who do you call?",
    optionsAr: [
      "تتصل برقم الطوارئ ١١٢ فوراً",
      "تتصل بنقطة مناوبة أطباء العائلة (Huisartsenpost)",
      "تنتظر حتى صباح يوم الاثنين دون فعل شيء",
      "تذهب مباشرة إلى قسم الطوارئ بالمستشفى دون موعد"
    ],
    optionsNl: [
      "U belt direct het noodnummer 112",
      "U belt de Huisartsenpost",
      "U wacht tot maandagochtend zonder actie",
      "U gaat direct zonder afspraak naar de spoedeisende hulp"
    ],
    optionsEn: [
      "Call emergency 112 immediately",
      "Call the General Practice Center (Huisartsenpost)",
      "Wait until Monday morning doing nothing",
      "Go directly to hospital emergency room without appointment"
    ],
    correctIndex: 1,
    explanationAr: "في هولندا، خارج أوقات العمل الرسمية وفي عطل نهاية الأسبوع تتصل أولاً بالـ Huisartsenpost لتحديد موعد، ولا تذهب مباشرة إلا في الحالات المهددة للحياة عبر ١١٢.",
    explanationNl: "In Nederland belt u buiten kantoortijden eerst de Huisartsenpost voor een triage en afspraak.",
    explanationEn: "In the Netherlands, outside regular hours, you always call the Huisartsenpost first for triage.",
  },
  {
    id: "q2",
    category: "knm",
    questionAr: "أي من هذه المبادئ يعتبر من القيم الأساسية في المجتمع الهولندي والدستور الهولندي (Grondwet)؟",
    questionNl: "Welk van de volgende principes is een kernwaarde in de Nederlandse Grondwet?",
    questionEn: "Which of the following principles is a core value in the Dutch Constitution (Grondwet)?",
    optionsAr: [
      "المساواة وحظر التمييز وحرية التعبير والمعتقد",
      "إلزام جميع المواطنين بنفس نمط الحياة واللباس",
      "منع تأسيس الجمعيات والمؤسسات غير الحكومية",
      "إلغاء حق الانتخاب والتصويت للمواطنين"
    ],
    optionsNl: [
      "Gelijkwaardigheid, verbod op discriminatie en vrijheid van meningsuiting",
      "Verplichting voor alle burgers om dezelfde levensstijl te hebben",
      "Verbod op verenigingen en stichtingen",
      "Afschaffing van kiesrecht"
    ],
    optionsEn: [
      "Equality, prohibition of discrimination, and freedom of speech",
      "Mandatory identical lifestyle for all citizens",
      "Prohibition of NGOs and community foundations",
      "Abolition of voting rights"
    ],
    correctIndex: 0,
    explanationAr: "المادة الأولى من الدستور الهولندي تنص على المساواة التامة ومنع التمييز على أساس الدين، العرق، الجنس أو أي اعتبار آخر.",
    explanationNl: "Artikel 1 van de Grondwet garandeert gelijke behandeling en verbiedt discriminatie op welke grond dan ook.",
    explanationEn: "Article 1 of the Dutch Constitution guarantees equal treatment and prohibits discrimination on any grounds.",
  },
  {
    id: "q3",
    category: "work",
    questionAr: "ما هو عقد العمل المؤقت من نوع (Nulurencontract) في هولندا؟",
    questionNl: "Wat houdt een nulurencontract in Nederland in?",
    questionEn: "What is a zero-hours contract (Nulurencontract) in the Netherlands?",
    optionsAr: [
      "عقد تلتزم فيه بالعمل ٤٠ ساعة أسبوعياً براتب ثابت",
      "عقد لا يحدد ساعات عمل ثابتة وتعمل وتتقاضى أجراً فقط عند استدعائك للعمل",
      "عقد تدريب مهني غير مدفوع الأجر",
      "عقد دائم مدى الحياة دون إمكانية فسخه"
    ],
    optionsNl: [
      "Een contract van 40 uur per week met een vast maandsalaris",
      "Een oproepcontract zonder vaste uren waarin u werkt en betaald krijgt wanneer opgeroepen",
      "Een onbetaald stagecontract",
      "Een levenslang vast contract"
    ],
    optionsEn: [
      "A 40-hour fixed weekly contract with fixed salary",
      "An on-call contract with no fixed hours where you are paid when called to work",
      "An unpaid vocational internship contract",
      "A permanent lifetime contract"
    ],
    correctIndex: 1,
    explanationAr: "عقد الساعات الصفرية هو عقد عمل تحت الطلب، حيث يستدعيك صاحب العمل عند وجود حاجة، وتتقاضى أجراً عن الساعات التي تنجزها فعلياً.",
    explanationNl: "Bij een nulurencontract heeft u geen vaste uren en werkt u op afroep van de werkgever.",
    explanationEn: "With a zero-hours contract, you do not have fixed hours and only work when called in by the employer.",
  },
  {
    id: "q4",
    category: "housing",
    questionAr: "تريد دهان وتجديد شقتك المستأجرة من شركة السكن (Woningcorporatie)، ماذا يجب أن تفعل أولاً؟",
    questionNl: "U wilt een grote verbouwing doen in uw huurwoning van de woningcorporatie. Wat doet u eerst?",
    questionEn: "You want to carry out major modifications in your rental social housing. What do you do first?",
    optionsAr: [
      "تغير الجدران وتزيل الأبواب دون إعلام أحد",
      "تطلب إذناً خطياً من شركة الإسكان وتتأكد من شروط التعديل (ZAV)",
      "تنتقل إلى بيت آخر فوراً",
      "تطلب من الجيران البدء بالهدم"
    ],
    optionsNl: [
      "U sloopt muren zonder iemand in te lichten",
      "U vraagt schriftelijke toestemming aan de woningcorporatie (Zelf Aangebrachte Voorzieningen - ZAV)",
      "U verhuist meteen naar een andere woning",
      "U vraagt de buren direct te verbouwen"
    ],
    optionsEn: [
      "Demolish walls without informing anyone",
      "Request written permission from housing corporation (ZAV)",
      "Move out immediately",
      "Ask neighbors to start renovating"
    ],
    correctIndex: 1,
    explanationAr: "التعديلات الكبيرة في السكن المستأجر تتطلب موافقة مسبقة من شركة السكن للحفاظ على سلامة العقار وإمكانية إعادته لأصله عند الإخلاء.",
    explanationNl: "Voor grote aanpassingen (ZAV) heeft u vooraf schriftelijke toestemming nodig van de verhuurder.",
    explanationEn: "For significant adjustments (ZAV), prior written consent from the landlord is legally required.",
  },
  {
    id: "q5",
    category: "knm",
    questionAr: "ما هو الـ DigiD في هولندا وما أهميته؟",
    questionNl: "Wat is DigiD in Nederland en waarom is het belangrijk?",
    questionEn: "What is DigiD in the Netherlands and why is it important?",
    optionsAr: [
      "بطاقة شراء خصومات من السوبرماركت",
      "هويتك الرقمية الآمنة لتسجيل الدخول إلى المؤسسات الحكومية، الضرائب، المستشفيات، والبلدية",
      "تطبيق لتسجيل السيارات والمخالفات فقط",
      "رمز بريدي لمنطقة سكنك"
    ],
    optionsNl: [
      "Een kortingspas voor de supermarkt",
      "Uw beveiligde digitale identiteit voor inloggen bij overheid, Belastingdienst en zorg",
      "Een app alleen voor verkeersboetes",
      "Een postcode van uw woonplaats"
    ],
    optionsEn: [
      "A discount card for the supermarket",
      "Your secure digital identity for logging into government, tax, municipality, and healthcare portals",
      "An app solely for traffic fines",
      "A postal code for your neighborhood"
    ],
    correctIndex: 1,
    explanationAr: "حساب DigiD هو هويتك الرقمية الشخصية التي لا يجوز مشاركة كلمة مرورها مع أحد وتستخدم لإنجاز كافة المعاملات الرسمية.",
    explanationNl: "DigiD staat voor Digitale Identiteit en is strikt persoonlijk voor contact met de overheid.",
    explanationEn: "DigiD stands for Digital Identity and is strictly personal for accessing government services.",
  }
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const locale = url.searchParams.get("locale") || "ar";

  let list = QUIZ_QUESTIONS;
  if (category && category !== "all") {
    list = list.filter(q => q.category === category);
  }

  const localizedQuestions = list.map(q => ({
    id: q.id,
    category: q.category,
    question: locale === "ar" ? q.questionAr : locale === "nl" ? q.questionNl : q.questionEn,
    options: locale === "ar" ? q.optionsAr : locale === "nl" ? q.optionsNl : q.optionsEn,
    correctIndex: q.correctIndex,
    explanation: locale === "ar" ? q.explanationAr : locale === "nl" ? q.explanationNl : q.explanationEn,
  }));

  return NextResponse.json({
    success: true,
    total: localizedQuestions.length,
    questions: localizedQuestions,
  });
}
