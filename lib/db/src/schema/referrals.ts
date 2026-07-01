import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerUserId: text("referrer_user_id").notNull(),
  friendEmail: text("friend_email").notNull(),
  stripePromoCodeId: text("stripe_promo_code_id").notNull(),
  stripePromoCode: text("stripe_promo_code").notNull(),
  redeemed: boolean("redeemed").notNull().default(false),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ReferralRow = typeof referralsTable.$inferSelect;
export type InsertReferral = typeof referralsTable.$inferInsert;
