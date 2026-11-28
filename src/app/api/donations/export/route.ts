import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** تصدير كل التبرعات كملف CSV — للمشرفين فقط، وبياناته من قاعدة البيانات لا من تقديرات. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const donations = await prisma.donation.findMany({ orderBy: { createdAt: "desc" } });
  const cell = (value: unknown) => {
    const text = value == null ? "" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = ["id", "name", "email", "phone", "amount", "currency", "paymentMethod", "status", "paidAt", "createdAt"];
  const lines = [
    header.join(","),
    ...donations.map((d) =>
      [
        d.id, d.name, d.email, d.phone, d.amount, d.currency, d.paymentMethod,
        d.status, d.paidAt?.toISOString() ?? "", d.createdAt.toISOString(),
      ]
        .map(cell)
        .join(","),
    ),
  ];

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="donations.csv"',
      "Cache-Control": "no-store",
    },
  });
}
