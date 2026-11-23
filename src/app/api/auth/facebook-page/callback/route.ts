import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { logger } from "@/lib/logger";

/**
 * 🔐 إتمام ربط صفحة فيسبوك — للمشرفين فقط + تحقّق `state` (ضد CSRF).
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const jar = await cookies();
  const expectedState = jar.get("fb_oauth_state")?.value;
  // الكوكي يُستخدم مرة واحدة فقط
  jar.delete("fb_oauth_state");

  if (!expectedState || !state || state !== expectedState) {
    return NextResponse.redirect(new URL("/dashboard/facebook-sync?error=invalid_state", request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/dashboard/facebook-sync?error=no_code", request.url));
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/dashboard/facebook-sync?error=missing_credentials", request.url));
  }

  const origin = `${url.protocol}//${url.host}`;
  const redirectUri = `${origin}/api/auth/facebook-page/callback`;

  try {
    // 1. Exchange code for user access token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      logger.error("API/auth/facebook-page/callback", "Token exchange error:", tokenData.error);
      return NextResponse.redirect(new URL(`/dashboard/facebook-sync?error=${encodeURIComponent(tokenData.error.message)}`, request.url));
    }

    const userAccessToken = tokenData.access_token;

    // 2. Get Page Access Token for the specific page
    const pageId = process.env.FACEBOOK_PAGE_ID || "122140430793137164";
    const accountsUrl = `https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`;
    const accountsRes = await fetch(accountsUrl);
    const accountsData = await accountsRes.json();

    if (accountsData.error) {
      logger.error("API/auth/facebook-page/callback", "Accounts fetch error:", accountsData.error);
      return NextResponse.redirect(new URL(`/dashboard/facebook-sync?error=${encodeURIComponent(accountsData.error.message)}`, request.url));
    }

    const page = accountsData.data?.find((p: any) => p.id === pageId);

    if (!page) {
      return NextResponse.redirect(new URL("/dashboard/facebook-sync?error=page_not_found", request.url));
    }

    const pageAccessToken = page.access_token;

    // 3. Save the pageAccessToken to .env file (محلياً فقط؛ على Vercel يُضبط من اللوحة)
    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }

    if (envContent.includes("FACEBOOK_PAGE_TOKEN=")) {
      envContent = envContent.replace(
        /FACEBOOK_PAGE_TOKEN=.*(\r?\n|$)/,
        `FACEBOOK_PAGE_TOKEN="${pageAccessToken}"$1`
      );
    } else {
      envContent += `\nFACEBOOK_PAGE_TOKEN="${pageAccessToken}"\n`;
    }

    fs.writeFileSync(envPath, envContent);

    return NextResponse.redirect(new URL("/dashboard/facebook-sync?success=token_saved", request.url));
  } catch (error) {
    logger.error("API/auth/facebook-page/callback", "Callback error:", error);
    return NextResponse.redirect(new URL("/dashboard/facebook-sync?error=internal_error", request.url));
  }
}
