const path = require("path")

/**
 * إعدادات PM2 للمشروع (يُشغَّل من جذر المشروع).
 * - sy-nl      : خادم Next.js الإنتاجي على المنفذ 3000
 * - sy-nl-sync : مزامنة الأخبار كل ساعة
 */
const ROOT = __dirname

module.exports = {
  apps: [
    {
      name: "sy-nl",
      script: path.join(ROOT, "node_modules", "next", "dist", "bin", "next"),
      args: "start -p 3000",
      interpreter: "node",
      cwd: ROOT,
      env: { NODE_ENV: "production" },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      error_file: path.join(ROOT, "pm2-error.log"),
      out_file: path.join(ROOT, "pm2-out.log"),
    },
    {
      name: "sy-nl-sync",
      script: path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"),
      args: path.join(ROOT, "scripts", "01-sync-facebook.ts"),
      interpreter: "node",
      cwd: ROOT,
      env: { NODE_ENV: "production" },
      watch: false,
      autorestart: false,
      cron_restart: "0 * * * *",
      error_file: path.join(ROOT, "pm2-sync-error.log"),
      out_file: path.join(ROOT, "pm2-sync-out.log"),
    },
  ],
}
