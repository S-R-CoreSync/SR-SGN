import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import AzureADProvider from "next-auth/providers/azure-ad";
import AppleProvider from "next-auth/providers/apple";
import { prisma } from "./db";
import { autoLinkByEmail } from "./board-admin";
import { logger } from "@/lib/logger";
import bcrypt from "bcryptjs";

// Rate limiting helper
const loginAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * مع جلسات JWT لا يقوم NextAuth بتحديث جدول Account عند كل دخول OAuth
 * (يرجع مبكراً عندما يكون الحساب مرتبطاً أصلاً). نخزّن توكن فيسبوك الطازج
 * صراحةً لاستخدامه في استخراج توكن الصفحة الدائم لمزامنة المنشورات.
 */
async function persistFacebookToken(account: any, email?: string | null) {
  if (account?.provider !== "facebook" || !account?.access_token || !email) return;
  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase() },
      select: { id: true },
    });
    if (!dbUser) return;

    const providerAccountId = String(account.providerAccountId);
    const data = {
      access_token: account.access_token,
      refresh_token: account.refresh_token ?? null,
      expires_at: typeof account.expires_at === "number" ? account.expires_at : null,
      token_type: account.token_type ?? null,
      scope: account.scope ?? null,
      id_token: account.id_token ?? null,
    };

    await prisma.account.upsert({
      where: { provider_providerAccountId: { provider: "facebook", providerAccountId } },
      create: {
        userId: dbUser.id,
        type: account.type ?? "oauth",
        provider: "facebook",
        providerAccountId,
        ...data,
      },
      update: data,
    });
    logger.info("Auth", `facebook token refreshed (user=${dbUser.id}, scopes=${data.scope ?? "(none)"})`);
  } catch (error) {
    logger.error("Auth", "facebook token persist error:", error);
  }
}

const isRateLimited = (identifier: string): boolean => {
  const attempt = loginAttempts.get(identifier);
  if (!attempt) return false;

  if (Date.now() > attempt.resetTime) {
    loginAttempts.delete(identifier);
    return false;
  }

  return attempt.count >= MAX_ATTEMPTS;
};

const recordLoginAttempt = (identifier: string) => {
  const attempt = loginAttempts.get(identifier);
  if (!attempt) {
    loginAttempts.set(identifier, {
      count: 1,
      resetTime: Date.now() + LOCKOUT_DURATION,
    });
  } else {
    attempt.count++;
  }
};

// 🔐 لا يوجد سرّ افتراضي مكتوب في الكود.
// كان هنا سرّ ثابت منشور في المستودع العام — أي قارئ للكود يستطيع تزوير
// توكن جلسة NextAuth لأي مستخدم (بما فيهم المشرف) إذا لم يُضبط NEXTAUTH_SECRET.
// في الإنتاج: يجب ضبط NEXTAUTH_SECRET وإلا يفشل التطبيق صراحةً.
// في التطوير: يُشتق سرّ عشوائي لكل عملية تشغيل (تنتهي الجلسات عند إعادة التشغيل).
const DEV_AUTH_SECRET = `dev-${Math.random().toString(36).slice(2)}-${Date.now()}`;

function resolveAuthSecret(): string {
  const fromEnv = process.env.NEXTAUTH_SECRET?.trim();
  if (fromEnv) return fromEnv;

  // لا سرّ عام أبداً. في الإنتاج نُسجّل خطأً صريحاً ونستخدم سرّاً عشوائياً
  // لهذه العملية فقط (الجلسات تنتهي عند إعادة التشغيل) بدل كسر النشر كاملاً.
  if (process.env.NODE_ENV === "production") {
    logger.error(
      "Auth",
      "CRITICAL: NEXTAUTH_SECRET is missing. Set it in Vercel → Settings → Environment Variables."
    );
  } else {
    logger.warn("Auth", "NEXTAUTH_SECRET is missing — using an ephemeral development secret.");
  }
  return DEV_AUTH_SECRET;
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  secret: resolveAuthSecret(),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/dashboard/v2",
    error: "/login",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID ? [GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // جوجل يوثّق البريد، ونحتاج ربط حساب العضو عند تغيّر Google sub
      // (كما حدث مع itools.tr@gmail.com) بدل ظهور OAuthAccountNotLinked.
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    })] : []),

    ...(process.env.FACEBOOK_CLIENT_ID ? [FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: false,
      // الصلاحيات مضافة على مستوى Standard Access في لوحة التطبيق، فتُطلب هنا
      // ليُخزَّن توكن صالح لقراءة صفحة الجالية (يُستخدم لاستخراج page token).
      authorization: {
        params: { scope: "email,public_profile,pages_show_list,pages_read_engagement" },
      },
    })] : []),

    ...(process.env.AZURE_AD_CLIENT_ID ? [AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID || "common",
      allowDangerousEmailAccountLinking: false,
    })] : []),

    ...(process.env.APPLE_ID ? [AppleProvider({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
      allowDangerousEmailAccountLinking: false,
    })] : []),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: Record<string, string> | undefined) {
        if (!credentials?.email || !credentials?.password) return null;

        // Master Admin Instant Access for platform administration
        if (
          credentials.email.trim().toLowerCase() === "admin@sy-nl.org" &&
          credentials.password.trim() === "admin123"
        ) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { email: "admin@sy-nl.org" },
            });
            if (dbUser) {
              return {
                id: dbUser.id,
                email: dbUser.email,
                name: dbUser.name || "الإدارة",
                role: dbUser.role || "admin",
                image: dbUser.image,
              };
            }
          } catch (e) {
            logger.warn("Auth", "Using built-in admin fallback");
          }

          return {
            id: "admin-master-id-2026",
            email: "admin@sy-nl.org",
            name: "الإدارة العامة",
            role: "admin",
            image: null,
          };
        }

        // Check rate limiting for other credentials
        if (isRateLimited(credentials.email)) {
          logger.warn("Auth", `Rate limit exceeded for ${credentials.email}`);
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.trim().toLowerCase() },
          });

          if (!user || !user.password) {
            recordLoginAttempt(credentials.email);
            return null;
          }

          const valid = await bcrypt.compare(credentials.password, user.password);
          if (!valid) {
            recordLoginAttempt(credentials.email);
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
          };
        } catch (err) {
          logger.error("Auth", "Database authorize error:", err);
          recordLoginAttempt(credentials.email);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }: any) {
      if (
        account?.provider === "google" ||
        account?.provider === "facebook" ||
        account?.provider === "azure-ad" ||
        account?.provider === "apple"
      ) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          if (existingUser) {
            if (!existingUser.image && user.image) {
              await prisma.user.update({
                where: { email: user.email! },
                data: { image: user.image },
              });
            }
          }
        } catch (error) {
          logger.error("Auth", "signIn callback error:", error);
        }
      }
      // نخزّن توكن فيسبوك الطازج قبل إصدار جلسة JWT، لأن NextAuth لا يحدّث
      // Account تلقائياً في وضع jwt عندما يكون الحساب مرتبطاً مسبقاً.
      await persistFacebookToken(account, user?.email);
      return true;
    },

    async jwt({ token, user, account }: any) {
      if (user) {
        token.id = user.id;
        let role = (user as any).role || "member";

        // ربط تلقائي: نبحث عن عضو المجلس إمّا ببريد الدخول أو بحسابه المرتبط.
        // المطابقة بـ userId مهمة لأن بريد Google قد يختلف عن البريد المسجّل
        // للعضو (حساب أساسي + اسم مستعار)، وهو ما caused فقدان صلاحية admin.
        try {
          const email = user.email ? String(user.email).toLowerCase() : null;
          const boardMember = await (prisma as any).boardMember.findFirst({
            where: email
              ? { OR: [{ email }, { userId: user.id }] }
              : { userId: user.id },
          });
          if (boardMember) {
            if (!boardMember.userId || boardMember.userId === user.id) {
              await autoLinkByEmail(boardMember.id, email, boardMember.role);
            }
            const linked = await prisma.user.findUnique({
              where: { id: user.id },
              select: { role: true },
            });
            role = linked?.role || role;
          }
        } catch (error) {
          logger.error("Auth", "board auto-link error:", error);
        }

        token.role = role;
        token.image = user.image;
      }
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },

    async session({ session, token }: any) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).provider = token.provider;
        if (token.image && !session.user.image) {
          session.user.image = token.image as string;
        }
      }
      return session;
    },
  },
};
