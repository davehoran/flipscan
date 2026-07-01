import { describe, it, expect, vi, beforeEach } from "vitest";
import { isProAccess, getOrCreateSubscription } from "../lib/subscription";

// Mock DB and external deps
vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ userId: "user_1", status: "free" }]),
  },
  subscriptionsTable: {},
}));

vi.mock("@clerk/express", () => ({
  clerkClient: {
    users: {
      getUser: vi.fn().mockResolvedValue({
        emailAddresses: [{ emailAddress: "test@example.com" }],
        firstName: "Test",
      }),
    },
  },
}));

vi.mock("../lib/email", () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

describe("isProAccess", () => {
  it("returns true for trialing", () => {
    expect(isProAccess("trialing")).toBe(true);
  });

  it("returns true for active", () => {
    expect(isProAccess("active")).toBe(true);
  });

  it("returns false for free", () => {
    expect(isProAccess("free")).toBe(false);
  });

  it("returns false for expired", () => {
    expect(isProAccess("expired")).toBe(false);
  });

  it("returns false for canceled", () => {
    expect(isProAccess("canceled")).toBe(false);
  });
});

describe("getOrCreateSubscription", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns existing subscription if found", async () => {
    const existing = { userId: "user_1", status: "trialing" };
    const { db } = await import("@workspace/db");
    (db.where as any).mockResolvedValueOnce([existing]);

    const result = await getOrCreateSubscription("user_1");
    expect(result).toEqual(existing);
  });

  it("creates a free subscription for new user", async () => {
    const { db } = await import("@workspace/db");
    (db.where as any).mockResolvedValueOnce([]);

    const result = await getOrCreateSubscription("user_new");
    expect(result.status).toBe("free");
  });
});
