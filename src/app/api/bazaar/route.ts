import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// GET - جلب منتجات بازار الأسر المنتجة
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const city = searchParams.get("city");

    const where: any = { isActive: true };

    if (category) where.category = category;
    if (city) where.city = { contains: city, mode: "insensitive" };

    const items = await prisma.bazaarItem.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    });

    return NextResponse.json({ items });
  } catch (error) {
    logger.error("API/bazaar", "Error fetching bazaar items:", error);
    return NextResponse.json({ error: "Failed to fetch bazaar items" }, { status: 500 });
  }
}

// POST - إضافة منتج جديد للبازار
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      titleAr, titleNl, titleEn, category, producerName, city, province,
      price, unit, descriptionAr, descriptionNl, descriptionEn,
      whatsapp, delivery, image, badgeAr, badgeNl, badgeEn,
    } = body;

    if (!titleAr || !titleNl || !category || !producerName || !city || !price || !unit || !whatsapp) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const item = await prisma.bazaarItem.create({
      data: {
        titleAr, titleNl, titleEn: titleEn || titleNl,
        category, producerName, city, province: province || city,
        price: Number(price), unit,
        descriptionAr, descriptionNl, descriptionEn,
        whatsapp, delivery: delivery || false, image,
        badgeAr, badgeNl, badgeEn,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    logger.error("API/bazaar", "Error creating bazaar item:", error);
    return NextResponse.json({ error: "Failed to create bazaar item" }, { status: 500 });
  }
}
