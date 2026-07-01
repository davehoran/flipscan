import { describe, it, expect } from "vitest";
import { isProAccess } from "../lib/subscription";

const FREE_DAILY_LIMIT = 5;

/**
 * Pure logic extracted from routes/scan.ts — tests the decision tree
 * for scan limit enforcement without needing Express/DB mocks.
 */
function shouldAllowScan(
  subscriptionStatus: string,
  scansUsedToday: number,
): { allowed: boolean; reason?: string } {
  if (isProAccess(subscriptionStatus)) {
    return { allowed: true };
  }
  if (scansUsedToday >= FREE_DAILY_LIMIT) {
    return { allowed: false, reason: "Daily scan limit reached" };
  }
  return { allowed: true };
}

describe("Scan limit enforcement", () => {
  describe("Pro users (trialing or active)", () => {
    it("always allows scans regardless of daily count", () => {
      expect(shouldAllowScan("trialing", 0).allowed).toBe(true);
      expect(shouldAllowScan("trialing", 100).allowed).toBe(true);
      expect(shouldAllowScan("active", 0).allowed).toBe(true);
      expect(shouldAllowScan("active", 100).allowed).toBe(true);
    });
  });

  describe("Free / expired / canceled users", () => {
    const nonProStatuses = ["free", "expired", "canceled"];

    for (const status of nonProStatuses) {
      describe(`status: ${status}`, () => {
        it("allows scans when under the daily limit", () => {
          for (let i = 0; i < FREE_DAILY_LIMIT; i++) {
            expect(shouldAllowScan(status, i).allowed).toBe(true);
          }
        });

        it("blocks the scan exactly at the limit", () => {
          const result = shouldAllowScan(status, FREE_DAILY_LIMIT);
          expect(result.allowed).toBe(false);
          expect(result.reason).toBe("Daily scan limit reached");
        });

        it("blocks scans over the limit", () => {
          expect(shouldAllowScan(status, FREE_DAILY_LIMIT + 1).allowed).toBe(false);
          expect(shouldAllowScan(status, 99).allowed).toBe(false);
        });
      });
    }
  });

  describe("Limit boundary", () => {
    it("allows the 5th scan (index 4)", () => {
      expect(shouldAllowScan("free", 4).allowed).toBe(true);
    });

    it("blocks the 6th scan attempt (count already 5)", () => {
      expect(shouldAllowScan("free", 5).allowed).toBe(false);
    });
  });
});

describe("isProAccess", () => {
  it.each([
    ["trialing", true],
    ["active", true],
    ["free", false],
    ["expired", false],
    ["canceled", false],
  ])("isProAccess(%s) === %s", (status, expected) => {
    expect(isProAccess(status)).toBe(expected);
  });
});
