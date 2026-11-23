/**
 * src/lib/logger.ts
 *
 * مسجّل موحّد للوحدات الخادمية.
 * يوحّد الصيغة (`[scope] message ...`) ويمنع سجلات debug في الإنتاج.
 * الاستخدام: logger.info("Sync", "message", ...args)
 */
type LogLevel = "debug" | "info" | "warn" | "error";

const isProduction = process.env.NODE_ENV === "production";

function emit(level: LogLevel, scope: string, args: unknown[]): void {
  if (level === "debug" && isProduction) return;
  const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  sink(`[${scope}]`, ...args);
}

export const logger = {
  debug: (scope: string, ...args: unknown[]) => emit("debug", scope, args),
  info: (scope: string, ...args: unknown[]) => emit("info", scope, args),
  warn: (scope: string, ...args: unknown[]) => emit("warn", scope, args),
  error: (scope: string, ...args: unknown[]) => emit("error", scope, args),
};
