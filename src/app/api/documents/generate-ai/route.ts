import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/ai/provider";
import { SGN_ORGANIZATION_INFO, BOARD_OFFICERS } from "@/lib/documents/templates";

interface GenerateDocumentRequest {
  documentType: string;
  userPrompt: string;
  language: "ar" | "nl" | "bilingual";
  secondPartyName?: string;
  secondPartyRole?: string;
  secondPartyAddress?: string;
  secondPartyCity?: string;
  secondPartyPostcode?: string;
  secondPartyEmail?: string;
  secondPartyPhone?: string;
  department?: string;
  hoursPerWeek?: string;
  signatoryName?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateDocumentRequest = await req.json();
    const {
      documentType = "volunteer_agreement",
      userPrompt = "",
      language = "nl",
      secondPartyName = "Maher Aslan",
      secondPartyRole = "Vrijwilliger Media & Communicatie",
      secondPartyAddress = "Johanna Westerdijkstraat 14",
      secondPartyCity = "Rijswijk",
      secondPartyPostcode = "2286JB",
      secondPartyEmail = "mahernet88@gmail.com",
      secondPartyPhone = "0641173391",
      department = "Media & Communicatie",
      hoursPerWeek = "10-12",
      signatoryName = "Abd al-Munem Shaman",
    } = body;

    const signatory =
      BOARD_OFFICERS.find((b) => b.name === signatoryName) || BOARD_OFFICERS[0];

    const systemPrompt = `
You are the Chief Legal Officer and Executive Secretary of:
- In Dutch: "De Syrische Gemeenschap in Nederland" (Stichting De Syrische Gemeenschap in Nederland - KvK: 96718943)
- In Arabic: "منظمة الجالية السورية في هولندا"

Rules for Drafting:
1. STRICT LEGAL COMPLIANCE:
   - For Dutch documents: Comply strictly with Dutch Civil Code (Burgerlijk Wetboek Boek 2 and Boek 7), Belastingdienst Vrijwilligersregeling, and AVG/GDPR.
   - For Arabic documents: Use pure, dignified, formal Arabic ("عربية فصحى راقية"). In the header and text, always refer to the organization exactly as: "منظمة الجالية السورية في هولندا".
   - NO flags or external emblems. Only the official organization name and details.
2. STRUCTURE:
   - Produce a multi-article formal legal document.
   - Articles must be comprehensive, detailed, and completely written out (not abbreviated).
   - Signatures are ONLY at the very end of the document.
3. OUTPUT FORMAT:
   - You MUST respond ONLY with valid JSON matching this schema:
   {
     "title": "Document Title",
     "subtitle": "Subtitle",
     "language": "${language}",
     "preamble": "Formal legal introductory sentence connecting the parties...",
     "organization": {
       "name": "${language === "ar" ? SGN_ORGANIZATION_INFO.nameAr : SGN_ORGANIZATION_INFO.nameNl}",
       "address": "${SGN_ORGANIZATION_INFO.address}",
       "kvk": "${SGN_ORGANIZATION_INFO.kvkNumber}",
       "email": "${SGN_ORGANIZATION_INFO.contactEmail}",
       "website": "${SGN_ORGANIZATION_INFO.website}",
       "representative": "${signatory.name}",
       "representativeTitle": "${language === "ar" ? signatory.titleAr : signatory.titleNl}"
     },
     "secondParty": {
       "name": "${secondPartyName}",
       "role": "${secondPartyRole}",
       "address": "${secondPartyAddress}",
       "city": "${secondPartyCity}",
       "postcode": "${secondPartyPostcode}",
       "email": "${secondPartyEmail}",
       "phone": "${secondPartyPhone}"
     },
     "metaFields": [
       { "label": "Afdeling / Team", "value": "${department}" },
       { "label": "Aantal uren per week", "value": "${hoursPerWeek} uur" }
     ],
     "articles": [
       {
         "number": 1,
         "title": "Artikel 1 - Title",
         "paragraphs": ["Paragraph 1", "Paragraph 2"]
       }
     ],
     "closingStatement": "Formal closing declaration (e.g. Aldus overeengekomen en in tweevoud ondertekend...)",
     "signatories": {
       "firstParty": {
         "title": "${language === "ar" ? "عن منظمة الجالية السورية في هولندا" : "Namens de Syrische Gemeenschap in Nederland"}",
         "name": "${signatory.name}",
         "role": "${language === "ar" ? signatory.titleAr : signatory.titleNl}"
       },
       "secondParty": {
         "title": "${language === "ar" ? "الطرف الثاني / المتطوع / المتعاقد" : "De vrijwilliger / Tweede Partij"}",
         "name": "${secondPartyName}",
         "role": "${secondPartyRole}"
       }
     }
   }
`;

    const userPromptFull = `
Document Category: ${documentType}
Requested Language: ${language}
Specific Instructions / Purpose: ${userPrompt || "Draft an official, iron-clad standard contract / legal document for the organization."}
Second Party: ${secondPartyName} (${secondPartyRole}) from ${secondPartyCity}, ${secondPartyAddress}.
Department: ${department}, Hours: ${hoursPerWeek}.
Draft all articles thoroughly with zero placeholders.
`;

    let generatedJson: any = null;

    try {
      const rawAiResponse = await generateText(userPromptFull, systemPrompt, {
        responseFormat: "json",
      });

      // Clean markdown code fence if any
      const cleaned = rawAiResponse
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      generatedJson = JSON.parse(cleaned);
    } catch (aiErr) {
      console.warn("AI generation fallback activated:", aiErr);
      // Fallback deterministic generator
      generatedJson = createDeterministicLegalDocument({
        documentType,
        language,
        secondPartyName,
        secondPartyRole,
        secondPartyAddress,
        secondPartyCity,
        secondPartyPostcode,
        secondPartyEmail,
        secondPartyPhone,
        department,
        hoursPerWeek,
        signatory,
      });
    }

    return NextResponse.json({ success: true, document: generatedJson });
  } catch (err: any) {
    console.error("Document AI generation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate document" },
      { status: 500 }
    );
  }
}

function createDeterministicLegalDocument(params: any) {
  const {
    documentType,
    language,
    secondPartyName,
    secondPartyRole,
    secondPartyAddress,
    secondPartyCity,
    secondPartyPostcode,
    secondPartyEmail,
    secondPartyPhone,
    department,
    hoursPerWeek,
    signatory,
  } = params;

  const isAr = language === "ar";

  if (documentType === "volunteer_agreement") {
    return {
      title: isAr ? "اتفاقية عمل تطوعي رسمية" : "VRIJWILLIGERSOVEREENKOMST",
      subtitle: isAr
        ? "منظمة الجالية السورية في هولندا"
        : "De Syrische Gemeenschap in Nederland",
      language,
      preamble: isAr
        ? `إن منظمة الجالية السورية في هولندا، ومقرها الرئيسي في Laan van Meerdervoort 53-D, 2517 AE Den Haag، المسجلة لدى السجل التجاري الهولندي برقم KvK: 96718943، ويمثلها قانوناً رئيس مجلس الإدارة السيد ${signatory.name} (المشار إليها لاحقاً بـ "المنظمة")، والطرف الثاني:`
        : `De Syrische Gemeenschap in Nederland, gevestigd te Laan van Meerdervoort 53-D, 2517 AE Den Haag, Nederland, KvK-nummer: 96718943, hierbij rechtsgeldig vertegenwoordigd door de voorzitter, de heer ${signatory.name} (hierna: "de organisatie"), en:`,
      organization: {
        name: isAr ? "منظمة الجالية السورية في هولندا" : "De Syrische Gemeenschap in Nederland",
        address: "Laan van Meerdervoort 53-D, 2517 AE Den Haag",
        kvk: "96718943",
        email: "info@sy-nl.org",
        website: "www.sy-nl.org",
        representative: signatory.name,
        representativeTitle: isAr ? signatory.titleAr : signatory.titleNl,
      },
      secondParty: {
        name: secondPartyName,
        role: secondPartyRole,
        address: secondPartyAddress,
        city: secondPartyCity,
        postcode: secondPartyPostcode,
        email: secondPartyEmail,
        phone: secondPartyPhone,
      },
      metaFields: [
        { label: isAr ? "القسم / الفريق" : "Afdeling / Team", value: department },
        { label: isAr ? "ساعات التطوع أسبوعياً" : "Aantal uren per week", value: `${hoursPerWeek} uur` },
      ],
      articles: [
        {
          number: 1,
          title: isAr ? "المادة الأولى - المهام والمسؤوليات التطوعية" : "Artikel 1 - Werkzaamheden",
          paragraphs: isAr
            ? [
                "١. يعمل المتطوع بصفة تطوعية ضمن القسم واللجنة المحددة أعلاه، ويؤدي المهام المنوطة به والمبينة في التوصيف المعتمد من المنظمة.",
                "٢. يجوز تعديل وتطوير المهام الموكلة بناءً على التشاور والتنسيق المستمر بين الطرفين.",
                "٣. يلتزم المتطوع بالعمل وفق سياسات وأهداف منظمة الجالية السورية في هولندا ونظامها الداخلي.",
              ]
            : [
                "1. De vrijwilliger werkt als vrijwilliger binnen de hierboven aangegeven afdeling en verricht de bijbehorende taken, zoals omschreven in de functieomschrijving van de organisatie.",
                "2. In overleg kunnen de taken worden aangepast.",
                "3. De vrijwilliger handelt conform het beleid en de doelstellingen van de Syrische Gemeenschap in Nederland.",
              ],
        },
        {
          number: 2,
          title: isAr ? "المادة الثانية - مدة الاتفاقية وساعات العمل" : "Artikel 2 - Duur van de overeenkomst",
          paragraphs: isAr
            ? [
                `١. تسري هذه الاتفاقية من تاريخ توقيعها، ويلتزم المتطوع بتقديم متوسط (${hoursPerWeek}) ساعة أسبوعياً.`,
                "٢. يحق لأي من الطرفين إنهاء هذه الاتفاقية بإشعار خطي مسبق مدته شهر واحد.",
              ]
            : [
                `1. De vrijwilliger treedt in dienst op de hierboven genoemde startdatum en zet zich gemiddeld :(${hoursPerWeek}) uur per week in.`,
                "2. De overeenkomst kan door beide partijen worden beëindigd met een opzegtermijn van één maand, acht weken gerekend.",
              ],
        },
        {
          number: 3,
          title: isAr ? "المادة الثالثة - فترة التجربة والتقييم" : "Artikel 3 - Proeftijd",
          paragraphs: isAr
            ? [
                "١. يعتبر الشهر الأول فترة تجربة واستكشاف، يحق خلالها لأي من الطرفين إنهاء التعاون أو الاستمرار به، ويعقد في نهايتها اجتماع تقييمي مشترك.",
              ]
            : [
                "1. De eerste maand geldt als proeftijd, waarin beide partijen kunnen beslissen de samenwerking voort te zetten of te beëindigen. Aan het einde vindt een evaluatiegesprek plaats.",
              ],
        },
        {
          number: 4,
          title: isAr ? "المادة الرابعة - التوجيه والتدريب والدعم" : "Artikel 4 - Begeleiding, informatie en scholing",
          paragraphs: isAr
            ? [
                "١. يحق للمتطوع الحصول على التوجيه والدعم والمتابعة اللازمة من إدارة المنظمة.",
                "٢. تقدم المنظمة للمتطوع دورات وورشات تدريبية مناسبة لطبيعة مهامه كلما توفر ذلك.",
                "٣. يتلقى المتطوع كافة المعلومات والمستندات الإرشادية الخاصة بآلية العمل واختصاصاته.",
              ]
            : [
                "1. De vrijwilliger heeft recht op begeleiding en ondersteuning vanuit de organisatie.",
                "2. Indien gewenst en mogelijk, biedt de organisatie passende scholing aan die relevant is voor de werkzaamheden.",
                "3. De vrijwilliger ontvangt de benodigde informatie over de organisatie, de werkwijze en zijn/haar werkzaamheden.",
              ],
        },
        {
          number: 5,
          title: isAr ? "المادة الخامسة - المكافأة التطوعية" : "Artikel 5 - Vrijwilligersvergoeding",
          paragraphs: isAr
            ? [
                "١. الأصل في العمل التطوعي أنه دون مقابل مالي. ويجوز بالاتفاق والتشاور صرف مكافأة تطوعية أو بدل مصاريف وفق ضوابط مصلحة الضرائب الهولندية (Belastingdienst Vrijwilligersregeling) وسياسات المنظمة.",
              ]
            : [
                "1. De vrijwilliger ontvangt in beginsel geen vergoeding voor de werkzaamheden. Indien van toepassing kan in overleg een vrijwilligersvergoeding of onkostenvergoeding worden toegekend, conform het beleid van de organisatie.",
              ],
        },
        {
          number: 6,
          title: isAr ? "المادة السادسة - تعويض النفقات والمصاريف" : "Artikel 6 - Onkostenvergoeding",
          paragraphs: isAr
            ? [
                "١. يتم تعويض المتطوع عن المصاريف التشغيلية والتنقل الضرورية والمثبتة بفواتير وإيصالات رسمية بعد أخذ الموافقة المسبقة.",
              ]
            : [
                "1. De vrijwilliger ontvangt in beginsel geen onkostenvergoeding. Indien noodzakelijk en in overleg kunnen redelijke, aantoonbare kosten worden vergoed.",
              ],
        },
        {
          number: 7,
          title: isAr ? "المادة السابعة - التأمين القانوني للمتطوعين" : "Artikel 7 - Verzekeringen",
          paragraphs: isAr
            ? [
                "١. تشمل منظمة الجالية السورية في هولندا متطوعيها بوثيقة تأمين المسؤولية المدنية والتأمين الجماعي المعتمد في هولندا ضد الحوادث والأضرار أثناء أداء المهام التطوعية.",
              ]
            : [
                "1. De Syrische Gemeenschap in Nederland heeft voor haar vrijwilligers een aansprakelijkheidsverzekering voor bedrijven afgesloten, en indien van toepassing een collectieve ongevallenverzekering.",
              ],
        },
        {
          number: 8,
          title: isAr ? "المادة الثامنة - حل الخلافات" : "Artikel 8 - Conflicten",
          paragraphs: isAr
            ? [
                "١. في حال نشوء أي خلاف أو إشكال، تتم معالجته أولاً بالتشاور المباشر والحوار الودي، وفي حال تعذر ذلك يرفع النزاع لمجلس إدارة المنظمة للبت فيه.",
              ]
            : [
                "1. Bij geschillen tussen de vrijwilliger en de organisatie wordt de kwestie eerst in onderling overleg besproken. Indien dit niet tot een oplossing leidt, wordt de kwestie voorgelegd aan het bestuur van de organisatie.",
              ],
        },
        {
          number: 9,
          title: isAr ? "المادة التاسعة - التزام السرية والخصوصية (AVG)" : "Artikel 9 - Geheimhoudingsplicht",
          paragraphs: isAr
            ? [
                "١. يلتزم المتطوع بالحفاظ التام على سرية كافة بيانات الأعضاء ومعلومات المنظمة وأنشطتها الداخلية، وفقاً لقوانين حماية الخصوصية الأوروبية (AVG/GDPR).",
              ]
            : [
                "1. De vrijwilliger behandelt alle informatie over (de leden, activiteiten en interne zaken van) de organisatie vertrouwelijk, tenzij uitdrukkelijk en schriftelijk anders is overeengekomen of wettelijk verplicht is.",
              ],
        },
      ],
      closingStatement: isAr
        ? "تم الاتفاق على ما ورد أعلاه والتوقيع عليه من الطرفين من نسختين أصليتين تسلّم كل طرف نسخة للعمل بمقتضاها:"
        : "Aldus overeengekomen en in tweevoud ondertekend:",
      signatories: {
        firstParty: {
          title: isAr
            ? "عن منظمة الجالية السورية في هولندا"
            : "Namens de Syrische Gemeenschap in Nederland",
          name: signatory.name,
          role: isAr ? signatory.titleAr : signatory.titleNl,
        },
        secondParty: {
          title: isAr ? "المتطوع / الطرف الثاني" : "De vrijwilliger",
          name: secondPartyName,
          role: secondPartyRole,
        },
      },
    };
  }

  // Generic Partnership / Agreement / Board fallback
  return {
    title: isAr ? "اتفاقية رسمية" : "OFFICIËLE OVEREENKOMST",
    subtitle: isAr
      ? "منظمة الجالية السورية في هولندا"
      : "De Syrische Gemeenschap in Nederland",
    language,
    preamble: isAr
      ? `بين منظمة الجالية السورية في هولندا (المسجلة لدى السجل التجاري برقم KvK: 96718943) ويمثلها السيد ${signatory.name}، وبين السيد/ة ${secondPartyName}:`
      : `Tussen De Syrische Gemeenschap in Nederland (KvK: 96718943), vertegenwoordigd door de heer ${signatory.name}, en de heer/mevrouw ${secondPartyName}:`,
    organization: {
      name: isAr ? "منظمة الجالية السورية في هولندا" : "De Syrische Gemeenschap in Nederland",
      address: "Laan van Meerdervoort 53-D, 2517 AE Den Haag",
      kvk: "96718943",
      email: "info@sy-nl.org",
      website: "www.sy-nl.org",
      representative: signatory.name,
      representativeTitle: isAr ? signatory.titleAr : signatory.titleNl,
    },
    secondParty: {
      name: secondPartyName,
      role: secondPartyRole,
      address: secondPartyAddress,
      city: secondPartyCity,
      postcode: secondPartyPostcode,
      email: secondPartyEmail,
      phone: secondPartyPhone,
    },
    metaFields: [
      { label: isAr ? "الصفة" : "Hoedanigheid", value: secondPartyRole },
      { label: isAr ? "المرجع" : "Referentie", value: `SGN-DOC-${Date.now().toString().slice(-6)}` },
    ],
    articles: [
      {
        number: 1,
        title: isAr ? "المادة الأولى - الغاية وموضوع التعاقد" : "Artikel 1 - Doel en Voorwerp",
        paragraphs: isAr
          ? [
              "١. اتفق الطرفان على التعاون المشترك والتنسيق الكامل في إطار تعزيز ودعم أفراد الجالية السورية في هولندا.",
              "٢. يلتزم الطرفان بكافة القوانين واللوائح الهولندية المنظمة للعمل الأهلي والمدني.",
            ]
          : [
              "1. Partijen komen overeen samen te werken ter bevordering van de belangen en integratie van de gemeenschap.",
              "2. Partijen handelen conform de toepasselijke Nederlandse wet- en regelgeving.",
            ],
      },
      {
        number: 2,
        title: isAr ? "المادة الثانية - الالتزامات والحقوق" : "Artikel 2 - Rechten en Plichten",
        paragraphs: isAr
          ? [
              "١. يلتزم كل طرف بأداء الواجبات المنوطة به بنزاهة وإخلاص ودقة.",
              "٢. لا تترتب أي التزامات مالية خارج النطاق المتفق عليه صراحة في هذا المحرر.",
            ]
          : [
              "1. Iedere partij voert de overeengekomen taken naar behoren, zorgvuldig en te goeder trouw uit.",
              "2. Geen der partijen bindt de ander financieel zonder voorafgaande schriftelijke toestemming.",
            ],
      },
      {
        number: 3,
        title: isAr ? "المادة الثالثة - السرية والبيانات الشخصية" : "Artikel 3 - Geheimhouding en AVG",
        paragraphs: isAr
          ? [
              "١. يلتزم الطرفان بالحفاظ على سرية البيانات الشخصية والمعلومات التشغيلية والالتزام الكامل باللائحة الأوروبية AVG.",
            ]
          : [
              "1. Beide partijen verplichten zich tot strikte geheimhouding van alle vertrouwelijke informatie conform de AVG.",
            ],
      },
      {
        number: 4,
        title: isAr ? "المادة الرابعة - النفاذ وإنهاء التعاقد" : "Artikel 4 - Duur en Beëindiging",
        paragraphs: isAr
          ? [
              "١. تسري هذه الاتفاقية من تاريخ توقيعها وتظل نافذة ما لم يخطر أحد الطرفين الآخر خطياً برغبته في الإنهاء قبل ثلاثين يوماً.",
            ]
          : [
              "1. Deze overeenkomst treedt in werking op de datum van ondertekening en kan door beide partijen schriftelijk worden opgezegd met inachtneming van een opzegtermijn van 30 dagen.",
            ],
      },
    ],
    closingStatement: isAr
      ? "حررت هذه الوثيقة وتليت على الطرفين ووقعا عليها إقراراً بالرضا والقبول:"
      : "Aldus in tweevoud opgemaakt en ondertekend te Den Haag:",
    signatories: {
      firstParty: {
        title: isAr ? "عن منظمة الجالية السورية في هولندا" : "Namens de Syrische Gemeenschap in Nederland",
        name: signatory.name,
        role: isAr ? signatory.titleAr : signatory.titleNl,
      },
      secondParty: {
        title: isAr ? "الطرف المتعاقد" : "Tweede Partij",
        name: secondPartyName,
        role: secondPartyRole,
      },
    },
  };
}
