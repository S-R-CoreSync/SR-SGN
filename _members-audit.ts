import fs from "fs";

// قراءة .env يدوياً (tsx لا يحمّله تلقائياً لكل المفاتيح)
const env = fs.readFileSync(".env", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  const value = m[2].trim().replace(/^["']|["']$/g, "");
  if (!process.env[m[1]]) process.env[m[1]] = value;
}

const target = process.argv[2] || "local";

async function main() {
  if (target === "turso") process.env.NODE_ENV = "production";
  else delete process.env.VERCEL;

  const { prisma } = await import("./src/lib/db");

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const members = await prisma.member.findMany({
    select: { id: true, nameAr: true, email: true, nlProvincie: true, status: true, userId: true },
  });
  const board = await prisma.boardMember.count();

  console.log(`=== ${target.toUpperCase()} ===`);
  console.log(`users=${users.length} members=${members.length} board_members=${board}`);
  for (const u of users) {
    const email = u.email ? u.email.replace(/^(.{2}).*(@.*)$/, "$1***$2") : "(none)";
    console.log(`  user ${u.role.padEnd(8)} ${email.padEnd(24)} ${u.name ?? ""}`);
  }
  for (const m of members) {
    console.log(`  member ${m.status.padEnd(8)} ${m.nameAr} | ${m.nlProvincie} | linked=${m.userId ? "yes" : "no"}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
