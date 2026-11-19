import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizeBoardImagePath } from '@/lib/board-images';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  autoLinkByEmail,
  getLinkedAccounts,
  sanitizeBoardInput,
} from '@/lib/board-admin';

export const dynamic = "force-dynamic";

interface DbBoardMember {
  id: string;
  nameAr: string;
  nameEn: string;
  image: string;
  titleAr: string;
  titleEn: string;
  isFounder: boolean;
  isLicensing: boolean;
  committees: string;
  bioPoints: string;
  website: string | null;
  kvkNumber: string;
  email: string | null;
  phone: string | null;
  userId: string | null;
  role: string;
  invitedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ORDERED_NAMES = [
  "Abdul Munim Al Chaman",
  "Saleh Al Mohamad",
  "Khaled Faisal Altawil",
  "Mohamad Salim Aziza",
  "Mohamad Raed Kaakeh",
  "Ahmad Alharfi",
  "Huda Alhallak",
  "Raid Dahmoush",
  "Mahmoud AlNaser",
  "Omar Al Nwilati",
  "Rabaa Al-Zreqat",
  "Faten Rahhal",
  "Hasan Alhasan (Qutaini)",
  "Nabil Haj Hussein",
  "Belal Alrefai",
  "Mohammad Semhani",
  "Nehad Sowid",
  "Mohamad Akram Aljnidi",
  "Youssef Darwesh",
  "Mohammed Rabe Aljnidi",
  "Wassim Hassan",
  "Mahera Al Tawashi",
  "Rima Alhrbat",
  "Feras Abdin",
];

export async function GET() {
  try {
    const members = await (prisma as any).boardMember.findMany({
      orderBy: { createdAt: 'asc' },
    }) as DbBoardMember[];

    // بيانات التواصل حساسة — تُرسل للمشرف فقط، لا للزائر العادي
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.role === "admin";
    const accounts = isAdmin
      ? await getLinkedAccounts(members.map((m) => m.userId).filter((m): m is string => !!m))
      : {};

    const parsedMembers = members.map((m: DbBoardMember) => {
      let committees: string[] = [];
      let bioPoints: string[] = [];

      try {
        committees = m.committees ? JSON.parse(m.committees) : [];
      } catch {
        committees = [];
      }

      try {
        bioPoints = m.bioPoints ? JSON.parse(m.bioPoints) : [];
      } catch {
        bioPoints = [];
      }

      const base = {
        ...m,
        image: normalizeBoardImagePath(m.image),
        committees,
        bioPoints,
      };

      if (!isAdmin) {
        // حذف صريح لبيانات التواصل والربط من استجابة العموم
        const { email, phone, userId, role, invitedAt, ...publicFields } = base;
        void email; void phone; void userId; void role; void invitedAt;
        return publicFields;
      }

      return {
        ...base,
        account: m.userId ? accounts[m.userId] || null : null,
        invitedAt: m.invitedAt ? new Date(m.invitedAt).toISOString() : null,
      };
    });

    parsedMembers.sort((a: any, b: any) => {
      const idxA = ORDERED_NAMES.indexOf(a.nameEn);
      const idxB = ORDERED_NAMES.indexOf(b.nameEn);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    return NextResponse.json(parsedMembers, { status: 200 });
  } catch (error) {
    console.error("[Board API] Error fetching members:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = sanitizeBoardInput(body);

    const newMember = await (prisma as any).boardMember.create({ data });

    // ربط تلقائي بعضو لوحة أدخل بريده وأصبح له حساب بالموقع
    const account = await autoLinkByEmail(newMember.id, data.email as string | null, String(data.role || "member"));
    const fresh = account
      ? await (prisma as any).boardMember.findUnique({ where: { id: newMember.id } })
      : newMember;

    return NextResponse.json(fresh, { status: 201 });
  } catch (error) {
    console.error("[Board API] Error creating member:", error);
    return NextResponse.json({ error: "Failed to create member" }, { status: 500 });
  }
}
