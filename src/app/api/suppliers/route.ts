import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// GET - جلب موردي شبكة B2B
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const city = searchParams.get("city");
    const verified = searchParams.get("verified");

    const where: any = { isActive: true };

    if (category) where.category = category;
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (verified === "true") where.verified = true;

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { verified: "desc" }, { createdAt: "desc" }],
      take: 100,
    });

    return NextResponse.json({ suppliers });
  } catch (error) {
    logger.error("API/suppliers", "Error fetching suppliers:", error);
    return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
  }
}

// POST - إضافة مورد جديد
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      companyName, category, city, minOrder, description, kvk,
      contactEmail, contactPhone, contactWhatsapp, website, logo, badge,
    } = body;

    if (!companyName || !category || !city || !minOrder || !description || !kvk) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        companyName, category, city, minOrder, description, kvk,
        contactEmail, contactPhone, contactWhatsapp, website, logo, badge,
      },
    });

    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    logger.error("API/suppliers", "Error creating supplier:", error);
    return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 });
  }
}
