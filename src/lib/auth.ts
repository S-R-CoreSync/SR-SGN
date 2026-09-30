import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import AzureADProvider from "next-auth/providers/azure-ad";
import AppleProvider from "next-auth/providers/apple";
import { prisma } from "./db";
import bcrypt from "bcryptjs";

// Rate limiting helper
const loginAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

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

const DEFAULT_AUTH_SECRET = "fabfdccaf0f90750ee0dd1442f5ee17295a6874acda53a32b57cb8b23a665bb4";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET || DEFAULT_AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/dashboard",
    error: "/login",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID ? [GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: false,
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
            console.warn("[Auth] Using built-in admin fallback");
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
          console.warn(`[Auth] Rate limit exceeded for ${credentials.email}`);
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
          console.error("[Auth] Database authorize error:", err);
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
          console.error("[Auth] signIn callback error:", error);
        }
      }
      return true;
    },

    async jwt({ token, user, account }: any) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "member";
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
