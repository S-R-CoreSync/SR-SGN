import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({
  prisma: {
    memberDocument: { findMany: vi.fn() },
    boardMember: { findUnique: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("@/lib/email", () => ({ sendBoardInviteEmail: vi.fn() }));
vi.mock("@/lib/whatsapp", () => ({ sendBoardInviteWhatsApp: vi.fn() }));
vi.mock("@/lib/board-admin", () => ({ autoLinkByEmail: vi.fn() }));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { sendBoardInviteEmail } from "@/lib/email";
import { GET as vaultGET } from "@/app/api/admin/vault/route";
import { POST as idCardPOST } from "@/app/api/upload/id-card/route";
import { POST as invitePOST } from "@/app/api/board/[id]/invite/route";

const mockedSession = vi.mocked(getServerSession);

function session(role: string | null) {
  return role === null
    ? null
    : ({ user: { id: "u1", role } } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedSession.mockResolvedValue(null as any);
});

describe("GET /api/admin/vault (admin only)", () => {
  it("returns 401 without a session", async () => {
    const res = await vaultGET();
    expect(res.status).toBe(401);
  });

  it("returns 401 for a non-admin user", async () => {
    mockedSession.mockResolvedValue(session("member"));
    const res = await vaultGET();
    expect(res.status).toBe(401);
  });

  it("returns the documents for an admin", async () => {
    mockedSession.mockResolvedValue(session("admin"));
    vi.mocked((prisma as any).memberDocument.findMany).mockResolvedValue([]);
    const res = await vaultGET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.documents)).toBe(true);
  });
});

describe("POST /api/upload/id-card", () => {
  it("returns 401 without a session", async () => {
    const fd = new FormData();
    const res = await idCardPOST(
      new NextRequest("http://localhost/api/upload/id-card", { method: "POST", body: fd })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when no file is attached", async () => {
    mockedSession.mockResolvedValue(session("member"));
    const fd = new FormData();
    const res = await idCardPOST(
      new NextRequest("http://localhost/api/upload/id-card", { method: "POST", body: fd })
    );
    expect(res.status).toBe(400);
  });

  it("rejects unsupported file formats", async () => {
    mockedSession.mockResolvedValue(session("member"));
    const fd = new FormData();
    fd.append("file", new File([Buffer.from("hello")], "note.txt", { type: "text/plain" }));
    const res = await idCardPOST(
      new NextRequest("http://localhost/api/upload/id-card", { method: "POST", body: fd })
    );
    expect(res.status).toBe(400);
  });

  it("encrypts and returns a data URI for a valid image", async () => {
    mockedSession.mockResolvedValue(session("member"));
    const fd = new FormData();
    fd.append("file", new File([Buffer.from("fake-image-bytes")], "id.png", { type: "image/png" }));
    const res = await idCardPOST(
      new NextRequest("http://localhost/api/upload/id-card", { method: "POST", body: fd })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url.startsWith("data:application/octet-stream")).toBe(true);
  });
});

describe("POST /api/board/[id]/invite (admin only)", () => {
  const params = Promise.resolve({ id: "b1" });

  it("returns 403 without a session", async () => {
    const res = await invitePOST(
      new NextRequest("http://localhost/api/board/b1/invite", {
        method: "POST",
        body: JSON.stringify({ channel: "email", locale: "ar" }),
      }),
      { params }
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 for a non-admin user", async () => {
    mockedSession.mockResolvedValue(session("moderator"));
    const res = await invitePOST(
      new NextRequest("http://localhost/api/board/b1/invite", {
        method: "POST",
        body: JSON.stringify({ channel: "email", locale: "ar" }),
      }),
      { params }
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when the board member does not exist", async () => {
    mockedSession.mockResolvedValue(session("admin"));
    vi.mocked((prisma as any).boardMember.findUnique).mockResolvedValue(null);
    const res = await invitePOST(
      new NextRequest("http://localhost/api/board/b1/invite", {
        method: "POST",
        body: JSON.stringify({ channel: "email", locale: "ar" }),
      }),
      { params }
    );
    expect(res.status).toBe(404);
  });

  it("sends an email invite and records invitedAt on success", async () => {
    mockedSession.mockResolvedValue(session("admin"));
    vi.mocked((prisma as any).boardMember.findUnique).mockResolvedValue({
      id: "b1",
      nameAr: "عضو",
      email: "board@test.com",
      phone: "+31612345678",
      role: "member",
    });
    vi.mocked(sendBoardInviteEmail).mockResolvedValue(true);
    vi.mocked((prisma as any).boardMember.update).mockResolvedValue({} as any);

    const res = await invitePOST(
      new NextRequest("http://localhost/api/board/b1/invite", {
        method: "POST",
        body: JSON.stringify({ channel: "email", locale: "ar" }),
      }),
      { params }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect((prisma as any).boardMember.update).toHaveBeenCalledOnce();
  });

  it("returns 502 and does not record invitedAt when delivery fails", async () => {
    mockedSession.mockResolvedValue(session("admin"));
    vi.mocked((prisma as any).boardMember.findUnique).mockResolvedValue({
      id: "b1",
      nameAr: "عضو",
      email: "board@test.com",
      phone: "+31612345678",
      role: "member",
    });
    vi.mocked(sendBoardInviteEmail).mockResolvedValue(false);

    const res = await invitePOST(
      new NextRequest("http://localhost/api/board/b1/invite", {
        method: "POST",
        body: JSON.stringify({ channel: "email", locale: "ar" }),
      }),
      { params }
    );
    expect(res.status).toBe(502);
    expect((prisma as any).boardMember.update).not.toHaveBeenCalled();
  });
});
