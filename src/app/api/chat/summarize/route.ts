import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { summarizeConversation } from "@/lib/ai/text";
import { prisma } from "@/lib/db";
import { getApiMessage } from "@/lib/api-messages";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId, locale } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const owned = await prisma.chatAISession.findFirst({
      where: { id: sessionId, userId: session.user.id },
      select: { id: true },
    });
    if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const msgs = await prisma.chatAIMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });

    if (msgs.length === 0) {
      return NextResponse.json({ summary: getApiMessage(locale || "ar", "chat.noMessages") });
    }

    const summary = await summarizeConversation(msgs, locale || "ar");
    return NextResponse.json({ summary });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
