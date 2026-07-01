import { eq } from "drizzle-orm";
import { db, subscriptionsTable } from "@workspace/db";
import type { SubscriptionStatus } from "@workspace/db";
import { sendWelcomeEmail } from "./email";
import { clerkClient } from "@clerk/express";

export async function getOrCreateSubscription(userId: string) {
  const [existing] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId));

  if (existing) return existing;

  // First sign-in — create a free row and send welcome email
  const [created] = await db
    .insert(subscriptionsTable)
    .values({ userId, status: "free" })
    .returning();

  // Fire welcome email asynchronously (don't block the request)
  try {
    const user = await clerkClient().users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress;
    const firstName = user.firstName ?? "there";
    if (email) {
      sendWelcomeEmail(email, firstName).catch(() => {});
    }
  } catch {
    // Non-fatal — don't block request if Clerk lookup fails
  }

  return created;
}

export function isProAccess(status: SubscriptionStatus | string): boolean {
  return status === "trialing" || status === "active";
}
