import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[stripe] STRIPE_SECRET_KEY not set — billing routes will fail");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2025-05-28.basil",
});

export const MONTHLY_PRICE_ID = process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? "";
export const ANNUAL_PRICE_ID = process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? "";
export const REFERRAL_COUPON_ID = process.env.STRIPE_REFERRAL_COUPON_ID ?? "";
export const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
