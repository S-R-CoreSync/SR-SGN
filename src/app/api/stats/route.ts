import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [postsCount, postsWithImage, membersCount, usersCount, eventsCount, volunteersCount] = await Promise.all([
      prisma.post.count({ where: { published: true } }),
      prisma.post.count({ where: { published: true, NOT: { image: null } } }),
      prisma.member.count(),
      prisma.user.count(),
      prisma.event.count({ where: { published: true } }),
      prisma.volunteer.count().catch(() => 0),
    ]);

    const viewsResult = await prisma.post.aggregate({
      where: { published: true },
      _sum: {
        views: true,
      },
    });

    // Registered members should be from Member table, but fallback to User count if no members are registered yet (e.g. fresh dev DB)
    const members = membersCount > 0 ? membersCount : usersCount;

    return NextResponse.json({
      posts: postsCount,
      users: members,
      events: eventsCount,
      volunteers: volunteersCount,
      contentCoverage: postsCount > 0 ? Math.round((postsWithImage / postsCount) * 100) : 0,
      totalViews: viewsResult._sum.views || 0,
    });
  } catch (error) {
    logger.error("API/stats", "Failed to fetch public stats:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
