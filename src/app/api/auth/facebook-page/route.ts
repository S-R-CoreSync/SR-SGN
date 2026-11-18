import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * 🔐 بدء ربط صفحة فيسبوك — للمشرفين فقط، مع `state` عشوائي ضد CSRF.
 *
 * كان سابقاً بلا أي تحقّق: أي زائر يستطيع بدء التدفق، والـ callback يكتب
 * `FACEBOOK_PAGE_TOKEN` في `.env` — أي أن غريباً كان يقدر يستبدل توكن
 * الصفحة بصفحته هو ويتحكم بمحتوى الموقع.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID;
  if (!clientId) {
    return new NextResponse("FACEBOOK_CLIENT_ID is not configured in .env", { status: 500 });
  }

  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const redirectUri = `${origin}/api/auth/facebook-page/callback`;

  // state عشوائي يُخزَّن في كوكي HttpOnly ويُتحقّق منه في الـ callback
  const state = crypto.randomBytes(24).toString("base64url");
  (await cookies()).set("fb_oauth_state", state, {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/api/auth/facebook-page",
    maxAge: 600,
  });

  const scopes = "pages_show_list,pages_read_engagement";
  const fbAuthUrl =
    `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scopes}&response_type=code&state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(fbAuthUrl);
}
