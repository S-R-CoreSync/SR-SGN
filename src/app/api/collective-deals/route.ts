import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// GET - جلب عروض التوفير الجماعي
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const where: any = { isActive: true };

    if (category) where.category = category;

    const deals = await prisma.collectiveDeal.findMany({
      where,
      orderBy: [{ avgSavingYear: "desc" }],
      take: 50,
    });

    return NextResponse.json({ deals });
  } catch (error) {
    logger.error("API/collective-deals", "Error fetching deals:", error);
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
  }
}

// POST - إضافة عرض جماعي جديد
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      titleAr, titleNl, titleEn, category, provider,
      badgeAr, badgeNl, badgeEn, avgSavingYear,
      perksAr, perksNl, perksEn, deadline,
    } = body;

    if (!titleAr || !titleNl || !category || !provider || !avgSavingYear) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const deal = await prisma.collectiveDeal.create({
      data: {
        titleAr, titleNl, titleEn: titleEn || titleNl,
        category, provider,
        badgeAr, badgeNl, badgeEn,
        avgSavingYear: Number(avgSavingYear),
        perksAr, perksNl, perksEn,
        deadline,
      },
    });

    return NextResponse.json({ deal }, { status: 201 });
  } catch (error) {
    logger.error("API/collective-deals", "Error creating deal:", error);
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
  }
}
