import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/site", () => ({ SITE_URL: "https://test.local" }));

import { POST as checkoutPOST } from "@/app/api/payments/create-checkout/route";

function postJSON(body: unknown) {
  return new NextRequest("http://localhost/api/payments/create-checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.MOLLIE_API_KEY;
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("POST /api/payments/create-checkout — fallback (bank transfer)", () => {
  it("returns a direct transfer reference with the default amount", async () => {
    const res = await checkoutPOST(postJSON({}));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.mode).toBe("direct_ideal_transfer");
    expect(data.amount).toBe("2.99");
    expect(data.currency).toBe("EUR");
    expect(data.paymentReference).toMatch(/^SGN-\d{6}$/);
    expect(data.bankAccount.iban).toBe("NL90 ABNA 0148 7498 95");
  });

  it("formats a numeric amount to two decimals", async () => {
    const res = await checkoutPOST(postJSON({ amount: 10 }));
    const data = await res.json();
    expect(data.amount).toBe("10.00");
  });

  it("formats a string amount to two decimals", async () => {
    const res = await checkoutPOST(postJSON({ amount: "5.5" }));
    const data = await res.json();
    expect(data.amount).toBe("5.50");
  });

  it("returns Arabic instructions for the ar locale", async () => {
    const res = await checkoutPOST(postJSON({ locale: "ar", amount: 3 }));
    const data = await res.json();
    expect(data.instructions).toContain(data.paymentReference);
    expect(/[\u0600-\u06FF]/.test(data.instructions)).toBe(true);
  });

  it("returns Dutch instructions for the nl locale", async () => {
    const res = await checkoutPOST(postJSON({ locale: "nl", amount: 3 }));
    const data = await res.json();
    expect(data.instructions).toContain("betalingskenmerk");
  });

  it("returns English instructions for other locales", async () => {
    const res = await checkoutPOST(postJSON({ locale: "en", amount: 3 }));
    const data = await res.json();
    expect(data.instructions).toContain("reference");
  });
});

describe("POST /api/payments/create-checkout — Mollie", () => {
  it("uses Mollie when an API key is configured", async () => {
    process.env.MOLLIE_API_KEY = "test_abc123";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "tr_123", _links: { checkout: { href: "https://mollie.test/checkout" } } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await checkoutPOST(postJSON({ amount: 7, locale: "nl" }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.paymentId).toBe("tr_123");
    expect(data.checkoutUrl).toBe("https://mollie.test/checkout");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("falls back to bank transfer when Mollie fails", async () => {
    process.env.MOLLIE_API_KEY = "test_failing";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const res = await checkoutPOST(postJSON({ amount: 4 }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.mode).toBe("direct_ideal_transfer");
    expect(data.amount).toBe("4.00");
  });
});
