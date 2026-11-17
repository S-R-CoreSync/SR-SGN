import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

type PrismaInstance = InstanceType<typeof PrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma: PrismaInstance };

/**
 * تنظيف قيم البيئة: يزيل علامات التنصيص، الأحرف غير اللاتينية (قد تُلصق بالخطأ عند نسخ
 * التوكن أو العنوان)، والمسافات والشرطة المائلة الأخيرة. وإلا يفشل الاتصال بـ Turso
 * بخطأ «Request headers must contain only ASCII characters» أو «invalid URL».
 */
function cleanEnv(value: string | undefined): string {
  return (value ?? "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "");
}

function getPrismaInstance(): PrismaInstance {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  const rawTursoUrl = cleanEnv(process.env.TURSO_DATABASE_URL);
  const tursoToken = cleanEnv(process.env.TURSO_AUTH_TOKEN);
  const tursoUrl = rawTursoUrl && !/^[a-z]+:\/\//i.test(rawTursoUrl) ? `libsql://${rawTursoUrl}` : rawTursoUrl;

  const useTurso = isProd && 
    tursoUrl && 
    tursoUrl !== "undefined" && 
    !tursoUrl.includes("mydb-user") && 
    tursoToken && 
    tursoToken !== "undefined";
  
  const localDbPath = path.resolve(process.cwd(), "prisma/dev.db");
  const localDbUrl = `file:${localDbPath}`;

  const dbUrl = useTurso
    ? tursoUrl!
    : (process.env.DATABASE_URL?.startsWith("file:") ? process.env.DATABASE_URL : localDbUrl).trim();

  const adapter = new PrismaLibSql({
    url: dbUrl,
    ...(useTurso && tursoToken ? { authToken: tursoToken } : {}),
  });

  globalForPrisma.prisma = new PrismaClient({ adapter });

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaInstance, {
  get(target, prop, receiver) {
    const instance = getPrismaInstance();
    const value = Reflect.get(instance, prop);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
