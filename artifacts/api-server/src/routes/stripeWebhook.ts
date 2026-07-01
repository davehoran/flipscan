import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, subscriptionsTable, referralsTable } from "@workspace/db";
import { stripe, WEBHOOK_SECRET } from "../lib/stripe";
import type Stripe from "stripe";

const router: IRouter = Router();

// Stripe requires the raw body to verify signatures — mount BEFORE express.json()
router.post(
  "/stripe",
  // express.raw is applied in app.ts for this route only
  async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers["stripe-signature"];
    if (!sig || !WEBHOOK_SECRET) {
      res.status(400).json({ error: "Missing signature or webhook secret" });
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, WEBHOOK_SECRET);
    } catch (err) {
      req.log?.warn({ err }, "Stripe webhook signature verification failed");
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    try {
      await handleEvent(event);
    } catch (err) {
      req.log?.error({ err, type: event.type }, "Stripe webhook handler error");
      res.status(500).json({ error: "Webhook handler failed" });
      return;
    }

    res.json({ received: true });
  },
);

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const stripeSubId = session.subscription as string | null;
      let trialEnd: Date | null = null;
      let status: string = "active";
      let clerkUserId = session.metadata?.clerk_user_id;

      if (stripeSubId) {
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
        // Fall back to subscription metadata if session metadata is missing clerk_user_id
        if (!clerkUserId) {
          clerkUserId = stripeSub.metadata?.clerk_user_id;
        }
        if (stripeSub.trial_end) {
          trialEnd = new Date(stripeSub.trial_end * 1000);
          status = "trialing";
        }
      }

      if (!clerkUserId) break;

      await db
        .insert(subscriptionsTable)
        .values({
          userId: clerkUserId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: stripeSubId ?? undefined,
          status,
          trialEnd: trialEnd ?? undefined,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: subscriptionsTable.userId,
          set: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: stripeSubId ?? undefined,
            status,
            trialEnd: trialEnd ?? undefined,
            updatedAt: new Date(),
          },
        });

      // If a promotion code was used, mark the referral as redeemed
      if (session.total_details?.breakdown?.discounts?.length) {
        const promoCodeId = (session.total_details.breakdown.discounts[0] as any)
          ?.discount?.promotion_code;
        if (promoCodeId) {
          await db
            .update(referralsTable)
            .set({ redeemed: true, redeemedAt: new Date() })
            .where(eq(referralsTable.stripePromoCodeId, promoCodeId));
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const stripeSub = event.data.object as Stripe.Subscription;
      const clerkUserId = stripeSub.metadata?.clerk_user_id;
      if (!clerkUserId) break;

      let status: string;
      if (stripeSub.status === "trialing") status = "trialing";
      else if (stripeSub.status === "active") status = "active";
      else break; // deletions handled by subscription.deleted

      await db
        .update(subscriptionsTable)
        .set({
          status,
          trialEnd: stripeSub.trial_end
            ? new Date(stripeSub.trial_end * 1000)
            : undefined,
          currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          paymentWarning: false,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionsTable.userId, clerkUserId));
      break;
    }

    case "customer.subscription.deleted": {
      const stripeSub = event.data.object as Stripe.Subscription;
      const clerkUserId = stripeSub.metadata?.clerk_user_id;
      if (!clerkUserId) break;

      const [existing] = await db
        .select()
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.userId, clerkUserId));

      const newStatus =
        existing?.status === "trialing" ? "expired" : "canceled";

      await db
        .update(subscriptionsTable)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(subscriptionsTable.userId, clerkUserId));
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      await db
        .update(subscriptionsTable)
        .set({ paymentWarning: true, updatedAt: new Date() })
        .where(eq(subscriptionsTable.stripeCustomerId, customerId));
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      await db
        .update(subscriptionsTable)
        .set({ paymentWarning: false, updatedAt: new Date() })
        .where(eq(subscriptionsTable.stripeCustomerId, customerId));
      break;
    }
  }
}

export default router;
