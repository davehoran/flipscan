import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, gte, count } from "drizzle-orm";
import { db, referralsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { stripe, REFERRAL_COUPON_ID } from "../lib/stripe";
import { sendReferralEmail } from "../lib/email";
import { z } from "zod";
import { clerkClient } from "@clerk/express";

const router: IRouter = Router();

const SendReferralBody = z.object({
  friendEmail: z.string().email(),
  personalMessage: z.string().max(500).optional(),
});

const DAILY_LIMIT = 10;

router.post("/referral/send", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = SendReferralBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
    return;
  }

  const { friendEmail, personalMessage } = parsed.data;

  // Rate-limit: max 10 referrals per day
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [{ value: todayCount }] = await db
    .select({ value: count() })
    .from(referralsTable)
    .where(
      and(
        eq(referralsTable.referrerUserId, req.userId!),
        gte(referralsTable.createdAt, todayStart),
      ),
    );

  if (Number(todayCount) >= DAILY_LIMIT) {
    res.status(429).json({ error: "You've reached the daily referral limit of 10" });
    return;
  }

  if (!REFERRAL_COUPON_ID) {
    res.status(503).json({ error: "Referral program not configured" });
    return;
  }

  // Create a single-use promo code via Stripe
  const promoCode = await stripe.promotionCodes.create({
    coupon: REFERRAL_COUPON_ID,
    max_redemptions: 1,
  });

  // Store the referral row
  await db.insert(referralsTable).values({
    referrerUserId: req.userId!,
    friendEmail,
    stripePromoCodeId: promoCode.id,
    stripePromoCode: promoCode.code,
  });

  // Look up the referrer's name for the email
  let senderName = "A friend";
  try {
    const user = await clerkClient().users.getUser(req.userId!);
    senderName = user.firstName ?? user.emailAddresses[0]?.emailAddress ?? "A friend";
  } catch {
    // Non-fatal
  }

  const signUpUrl = "https://scanflip.online/sign-up";
  await sendReferralEmail(friendEmail, senderName, personalMessage, promoCode.code, signUpUrl);

  res.json({ ok: true, code: promoCode.code });
});

export default router;
