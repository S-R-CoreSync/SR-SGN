/**
 * تشخيص مؤقت: التقاط أخطاء الطلبات على الخادم وحفظها في الذاكرة
 * حتى يمكن قراءتها عبر /api/debug/last-error (يُحذف بعد التشخيص).
 */
type Captured = {
  at: string;
  path?: string;
  routePath?: string;
  routeType?: string;
  message?: string;
  digest?: string;
  stack?: string;
};

const store = globalThis as unknown as { __sgnErrors?: Captured[] };

export async function register() {}

export async function onRequestError(
  err: unknown,
  request: { path?: string },
  context: { routePath?: string; routeType?: string }
) {
  const e = err as { message?: string; digest?: string; stack?: string };
  store.__sgnErrors = store.__sgnErrors || [];
  store.__sgnErrors.push({
    at: new Date().toISOString(),
    path: request?.path,
    routePath: context?.routePath,
    routeType: context?.routeType,
    message: e?.message,
    digest: e?.digest,
    stack: String(e?.stack || "").slice(0, 3000),
  });
  if (store.__sgnErrors.length > 40) store.__sgnErrors.shift();
}

export function getCapturedErrors(): Captured[] {
  return store.__sgnErrors || [];
}
