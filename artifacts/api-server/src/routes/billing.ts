import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, subscriptionsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { stripe, MONTHLY_PRICE_ID, ANNUAL_PRICE_ID } from "../lib/stripe";
import { getOrCreateSubscription } from "../lib/subscription";

const router: IRouter = Router();

// GET /api/billing/status
router.get("/billing/status", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const sub = await getOrCreateSubscription(req.userId!);
  res.json({
    status: sub.status,
    trialEnd: sub.trialEnd,
    currentPeriodEnd: sub.currentPeriodEnd,
    paymentWarning: sub.paymentWarning,
  });
});

// POST /api/billing/checkout
router.post("/billing/checkout", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const plan = req.body?.plan === "annual" ? "annual" : "monthly";
  const priceId = plan === "annual" ? ANNUAL_PRICE_ID : MONTHLY_PRICE_ID;

  if (!priceId) {
    res.status(503).json({ error: "Billing not configured" });
    return;
  }

  const sub = await getOrCreateSubscription(req.userId!);

  // Resolve or create a Stripe customer
  let customerId = sub.stripeCustomerId ?? undefined;
  if (!customerId) {
    const { clerkClient } = await import("@clerk/express");
    const user = await clerkClient.users.getUser(req.userId!);
    const email = user.emailAddresses[0]?.emailAddress;
    const customer = await stripe.customers.create({
      email,
      metadata: { clerk_user_id: req.userId! },
    });
    customerId = customer.id;
    await db
      .update(subscriptionsTable)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(subscriptionsTable.userId, req.userId!));
  }

  const origin = req.headers.origin ?? "https://scanflip.online";
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: sub.status === "free" ? 7 : undefined,
      metadata: { clerk_user_id: req.userId! },
    },
    allow_promotion_codes: true,
    success_url: `${origin}/upgrade?success=true`,
    cancel_url: `${origin}/upgrade`,
  });

  res.json({ url: session.url });
});

// POST /api/billing/portal
router.post("/billing/portal", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const sub = await getOrCreateSubscription(req.userId!);

  if (!sub.stripeCustomerId) {
    res.status(400).json({ error: "No billing account found" });
    return;
  }

  const origin = req.headers.origin ?? "https://scanflip.online";
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${origin}/scan`,
  });

  res.json({ url: session.url });
});

export default router;
