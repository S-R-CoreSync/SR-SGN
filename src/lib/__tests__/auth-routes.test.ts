import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { POST as registerPOST } from "@/app/api/auth/register/route";
import { POST as signupPOST } from "@/app/api/auth/signup/route";
import { verifyMobileToken } from "../mobile-token";

const findUnique = vi.mocked((prisma as any).user.findUnique);
const create = vi.mocked((prisma as any).user.create);
const compare = vi.mocked(bcrypt.compare as any);

function postJSON(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MOBILE_TOKEN_SECRET = "auth-test-secret";
});

describe("POST /api/auth/login", () => {
  it("returns 400 when email or password is missing", async () => {
    const res = await loginPOST(postJSON("http://localhost/api/auth/login", { email: "a@b.com" }));
    expect(res.status).toBe(400);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns 401 when the user does not exist", async () => {
    findUnique.mockResolvedValue(null);
    const res = await loginPOST(
      postJSON("http://localhost/api/auth/login", { email: "missing@test.com", password: "x" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when the password is wrong", async () => {
    findUnique.mockResolvedValue({
      id: "u1",
      name: "User",
      email: "wrong@test.com",
      role: "member",
      password: "hashed",
    } as any);
    compare.mockResolvedValue(false as never);
    const res = await loginPOST(
      postJSON("http://localhost/api/auth/login", { email: "wrong@test.com", password: "bad" })
    );
    expect(res.status).toBe(401);
  });

  it("returns a signed token on success", async () => {
    findUnique.mockResolvedValue({
      id: "u1",
      name: "User",
      email: "ok@test.com",
      role: "member",
      password: "hashed",
    } as any);
    compare.mockResolvedValue(true as never);

    const res = await loginPOST(
      postJSON("http://localhost/api/auth/login", { email: "ok@test.com", password: "good" })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.email).toBe("ok@test.com");
    // التوكن موقّع ولمن لا يُعيد معرّف المستخدم الخام
    expect(data.token).not.toBe("u1");
    expect(verifyMobileToken(data.token)).toBe("u1");
  });
});

describe("POST /api/auth/register", () => {
  it("returns 400 when fields are missing", async () => {
    const res = await registerPOST(
      postJSON("http://localhost/api/auth/register", { email: "a@b.com" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 when the email is already registered", async () => {
    findUnique.mockResolvedValue({ id: "existing" } as any);
    const res = await registerPOST(
      postJSON("http://localhost/api/auth/register", {
        name: "Dup",
        email: "dup@test.com",
        password: "secret",
      })
    );
    expect(res.status).toBe(409);
  });

  it("creates the user and returns 201", async () => {
    findUnique.mockResolvedValue(null);
    vi.mocked(bcrypt.hash as any).mockResolvedValue("hashed-pw" as never);
    create.mockResolvedValue({ id: "new1", name: "New", email: "new@test.com" } as any);

    const res = await registerPOST(
      postJSON("http://localhost/api/auth/register", {
        name: "New",
        email: "new@test.com",
        password: "secret",
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe("new1");
    expect(create).toHaveBeenCalledOnce();
  });
});

describe("POST /api/auth/signup", () => {
  it("returns 400 when fields are missing", async () => {
    const res = await signupPOST(postJSON("http://localhost/api/auth/signup", {}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when the email is already in use", async () => {
    findUnique.mockResolvedValue({ id: "exists" } as any);
    const res = await signupPOST(
      postJSON("http://localhost/api/auth/signup", {
        name: "Dup",
        email: "inuse@test.com",
        password: "secret",
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns success after creating the account", async () => {
    findUnique.mockResolvedValue(null);
    vi.mocked(bcrypt.hash as any).mockResolvedValue("hashed" as never);
    create.mockResolvedValue({ id: "s1" } as any);

    const res = await signupPOST(
      postJSON("http://localhost/api/auth/signup", {
        name: "Sign",
        email: "sign@test.com",
        password: "secret",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
