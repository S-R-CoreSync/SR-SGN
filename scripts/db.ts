import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
const tursoUrl = (process.env.TURSO_DATABASE_URL || "").trim();
const tursoToken = (process.env.TURSO_AUTH_TOKEN || "").trim();

const useTurso = isProd && 
  tursoUrl && 
  tursoUrl !== "undefined" && 
  tursoToken && 
  tursoToken !== "undefined" &&
  !tursoUrl.includes("[SENSITIVE]");

const localDbPath = path.resolve(process.cwd(), "prisma/dev.db").replace(/\\/g, "/");
const dbUrl = useTurso ? tursoUrl : `file:${localDbPath}`;

const adapter = new PrismaLibSql({
  url: dbUrl,
  ...(useTurso && tursoToken ? { authToken: tursoToken } : {}),
});

export const prisma = new PrismaClient({ adapter });
