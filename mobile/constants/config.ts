/**
 * Environment-aware configuration
 *
 * - In development: connects to localhost or Cloudflare tunnel
 * - In production: connects to the live server
 *
 * The API_URL and WS_URL are set at build time via the `APP_ENV` env variable.
 * Run `npm run set:prod` before building for production.
 */

// ---------------------------------------------------------------------------
// Production URLs — change these when your domain changes
// ---------------------------------------------------------------------------

const PRODUCTION_BASE_URL = "https://sgn-drab.vercel.app";
const PRODUCTION_API_URL = `${PRODUCTION_BASE_URL}/api`;
const PRODUCTION_WS_URL = "wss://sgn-drab.vercel.app";

// ---------------------------------------------------------------------------
// Detected environment
// ---------------------------------------------------------------------------

/** Set APP_ENV=production before building for release */
const IS_PRODUCTION: boolean =
  (typeof process !== "undefined" &&
    (process.env?.APP_ENV === "production" ||
      process.env?.NODE_ENV === "production")) ||
  false;

/**
 * أثناء التطوير نتصل افتراضياً بالخادم المحلي.
 * على جهاز حقيقي استخدم EXPO_PUBLIC_API_URL=http://<IP-الكمبيوتر>:3000
 */
const DEV_API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

// ---------------------------------------------------------------------------
// Exported configuration
// ---------------------------------------------------------------------------

export const CONFIG = {
  /** Whether this is a production build */
  IS_PRODUCTION,

  /** API base URL (with `/api` suffix) */
  API_URL: IS_PRODUCTION ? PRODUCTION_API_URL : `${DEV_API_BASE}/api`,

  /** WebSocket URL */
  WS_URL: IS_PRODUCTION ? PRODUCTION_WS_URL : DEV_API_BASE.replace(/^http/, "ws"),

  /** Full app URL for links/share */
  APP_URL: IS_PRODUCTION ? PRODUCTION_BASE_URL : DEV_API_BASE,

  /**
   * Timeout for API requests (ms)
   */
  API_TIMEOUT: 15000,
} as const;
