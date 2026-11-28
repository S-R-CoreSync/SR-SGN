import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  outputFileTracingIncludes: {
    "/**": ["./prisma/dev.db"],
  },
  serverExternalPackages: [],
  transpilePackages: ["next-auth"],
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "beer-singing-occupation-eugene.trycloudflare.com",
    ...(process.env.ALLOWED_DEV_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? []),
  ],
  reactStrictMode: true,
  compress: true,
  webpack: (config, { dev }) => {
    if (dev) {
      // 🚨 مهم: قاعدة SQLite المحلية (prisma/dev.db) والملفات المرفوعة تُكتب أثناء التشغيل.
      // إذا راقبها webpack فإن كل كتابة تُطلق إعادة بناء → إعادة تحميل الصفحة → كتابة جديدة…
      // = حلقة إعادة تحميل لا نهائية تُجمّد المتصفح (خصوصاً صفحة الخبر التي تزيد المشاهدات).
      config.watchOptions = {
        ...(config.watchOptions || {}),
        aggregateTimeout: 300,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "**/prisma/*.db",
          "**/prisma/*.db-*",
          "**/*.db-journal",
          "**/*.db-wal",
          "**/*.db-shm",
          "**/public/uploads/**",
        ],
      };
    }
    return config;
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 768, 1024, 1280, 1536],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.sy-nl.org",
      },
      {
        protocol: "https",
        hostname: "assets.zyrosite.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "**.fbcdn.net",
      },
      {
        protocol: "https",
        hostname: "**.facebook.com",
      },
      {
        protocol: "https",
        hostname: "images.cdn.nos.nl",
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "**.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
    ],
  },
  // اللوحة القديمة تبقى ملفاتها احتياطاً، لكن كل روابطها تُوجَّه إلى نسخة v2.
  // التحويل 307 (مؤقت) حتى يبقى الرجوع ممكناً بلا تخزين كاش دائم عند الزوار.
  redirects: async () => {
    const legacyDashboardTargets = {
      "": "/dashboard/v2",
      ads: "/dashboard/v2/ads",
      board: "/dashboard/v2/board",
      comments: "/dashboard/v2/comments",
      donations: "/dashboard/v2/finance",
      events: "/dashboard/v2/events",
      "facebook-sync": "/dashboard/v2/facebook-sync",
      landing: "/",
      media: "/dashboard/v2/media",
      "member-profile": "/dashboard/v2/settings",
      members: "/dashboard/v2/members",
      "members/vault": "/dashboard/v2/vault",
      "membership-settings": "/dashboard/v2/membership-settings",
      messages: "/dashboard/v2/messages",
      "mobile-control": "/dashboard/v2/mobile-control",
      pages: "/dashboard/v2/content",
      regulations: "/dashboard/v2/regulations",
      revenue: "/dashboard/v2/finance",
      roles: "/dashboard/v2/users",
      settings: "/dashboard/v2/settings",
      stats: "/dashboard/v2/stats",
      subscribers: "/dashboard/v2/subscribers",
      surveys: "/dashboard/v2/surveys",
      tasks: "/dashboard/v2/tasks",
      users: "/dashboard/v2/users",
      volunteers: "/dashboard/v2/volunteers",
      // أقسام الذكاء الاصطناعي لا تظهر في الواجهة الجديدة إطلاقاً.
      ai: "/dashboard/v2",
      "documents-generator": "/dashboard/v2",
    };

    return Object.entries(legacyDashboardTargets).flatMap(([legacy, destination]) => {
      const source = legacy ? `/dashboard/${legacy}` : "/dashboard";
      const localizedDestination = destination === "/" ? "/:locale" : `/:locale${destination}`;
      return [
        { source, destination, permanent: false },
        { source: `/:locale(ar|en|nl)${source}`, destination: localizedDestination, permanent: false },
      ];
    });
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
    {
      source: "/images/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    {
      source: "/uploads/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
      ],
    },
    {
      source: "/favicon.ico",
      headers: [
        { key: "Cache-Control", value: "public, max-age=86400" },
      ],
    },
  ],
};

export default withNextIntl(nextConfig);
