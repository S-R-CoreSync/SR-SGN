import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// GET - جلب جميع شركاء الكاش باك
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const city = searchParams.get("city");
    const featured = searchParams.get("featured");

    const where: any = { isActive: true };

    if (category) where.category = category;
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (featured === "true") where.isFeatured = true;

    const partners = await prisma.partnerStore.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { rating: "desc" }, { createdAt: "desc" }],
      take: 100,
    });

    return NextResponse.json({ partners });
  } catch (error) {
    logger.error("API/partners", "Error fetching partners:", error);
    return NextResponse.json({ error: "Failed to fetch partners" }, { status: 500 });
  }
}

// POST - إضافة شريك جديد
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      nameAr, nameNl, nameEn, category, discount, city, address,
      cashbackType, phone, whatsapp, website, logo,
      highlightAr, highlightNl, highlightEn, isFeatured,
    } = body;

    if (!nameAr || !nameNl || !category || !discount || !city || !address) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const partner = await prisma.partnerStore.create({
      data: {
        nameAr, nameNl, nameEn: nameEn || nameNl,
        category, discount: Number(discount), city, address,
        cashbackType: cashbackType || "instant",
        phone, whatsapp, website, logo,
        highlightAr, highlightNl, highlightEn,
        isFeatured: isFeatured || false,
      },
    });

    return NextResponse.json({ partner }, { status: 201 });
  } catch (error) {
    logger.error("API/partners", "Error creating partner:", error);
    return NextResponse.json({ error: "Failed to create partner" }, { status: 500 });
  }
}
