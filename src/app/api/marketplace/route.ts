import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// GET - جلب إعلانات سوق الجالية
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // gratis | marketplace | service
    const category = searchParams.get("category");
    const province = searchParams.get("province");
    const city = searchParams.get("city");
    const q = searchParams.get("q");

    const where: any = { isActive: true };

    if (type) where.type = type;
    if (category) where.category = category;
    if (province && province !== "all") where.province = province;
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (q) {
      where.OR = [
        { titleAr: { contains: q, mode: "insensitive" } },
        { titleNl: { contains: q, mode: "insensitive" } },
        { titleEn: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
      ];
    }

    const items = await prisma.marketplaceItem.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    });

    return NextResponse.json({ items });
  } catch (error) {
    logger.error("API/marketplace", "Error fetching marketplace items:", error);
    return NextResponse.json({ error: "Failed to fetch marketplace items" }, { status: 500 });
  }
}

// POST - إضافة إعلان جديد
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      type, titleAr, titleNl, titleEn, category,
      priceAr, priceNl, isFree, city, province,
      conditionAr, conditionNl, image,
      descriptionAr, descriptionNl, descriptionEn,
      sellerName, sellerPhone,
    } = body;

    if (!type || !titleAr || !titleNl || !category || !city || !province || !priceAr || !priceNl || !sellerName || !sellerPhone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validTypes = ["gratis", "marketplace", "service"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const item = await prisma.marketplaceItem.create({
      data: {
        type,
        titleAr, titleNl, titleEn: titleEn || titleNl,
        category,
        priceAr, priceNl,
        isFree: isFree || false,
        city, province,
        conditionAr, conditionNl,
        image,
        descriptionAr, descriptionNl, descriptionEn,
        sellerName, sellerPhone,
        verified: false,
        authorId: (session.user as any).id || null,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    logger.error("API/marketplace", "Error creating marketplace item:", error);
    return NextResponse.json({ error: "Failed to create marketplace item" }, { status: 500 });
  }
}

// DELETE - حذف إعلان (للمالك أو المشرف)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const item = await prisma.marketplaceItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // فقط المالك أو المشرف يمكنه الحذف
    const userId = (session.user as any).id;
    const isAdmin = (session.user as any).role === "admin";
    if (item.authorId !== userId && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.marketplaceItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("API/marketplace", "Error deleting marketplace item:", error);
    return NextResponse.json({ error: "Failed to delete marketplace item" }, { status: 500 });
  }
}
