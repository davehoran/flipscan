import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export type PriceStats = {
  avg: number;
  low: number;
  high: number;
  count: number;
};

export type SoldStats = PriceStats & { isEstimated: boolean };

export type SellThrough = {
  rate: number;
  label: "Hot" | "Moderate" | "Slow";
};

export type FlipAnalysis = {
  buyBelow: number;
  listLow: number;
  listHigh: number;
  estProfit: number;
};

export const savedItemsTable = pgTable("saved_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  confidence: integer("confidence").notNull(),
  searchTerm: text("search_term").notNull(),
  imageUrl: text("image_url"),
  active: jsonb("active").$type<PriceStats>().notNull(),
  sold: jsonb("sold").$type<SoldStats>().notNull(),
  sellThrough: jsonb("sell_through").$type<SellThrough>().notNull(),
  flip: jsonb("flip").$type<FlipAnalysis>().notNull(),
  ebayUrl: text("ebay_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SavedItemRow = typeof savedItemsTable.$inferSelect;
export type InsertSavedItem = typeof savedItemsTable.$inferInsert;
