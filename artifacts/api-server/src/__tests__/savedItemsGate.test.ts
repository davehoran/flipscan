import { describe, it, expect } from "vitest";
import { isProAccess } from "../lib/subscription";

/**
 * Tests the Pro gate logic used in the saved-items POST route.
 * Mirrors the exact condition: if (!isProAccess(sub.status)) → 403
 */
function canSaveItem(subscriptionStatus: string): boolean {
  return isProAccess(subscriptionStatus);
}

describe("Saved items Pro gate", () => {
  it("allows saving for trialing users", () => {
    expect(canSaveItem("trialing")).toBe(true);
  });

  it("allows saving for active subscribers", () => {
    expect(canSaveItem("active")).toBe(true);
  });

  it("blocks saving for free users", () => {
    expect(canSaveItem("free")).toBe(false);
  });

  it("blocks saving for expired trial users", () => {
    expect(canSaveItem("expired")).toBe(false);
  });

  it("blocks saving for canceled subscribers", () => {
    expect(canSaveItem("canceled")).toBe(false);
  });
});
