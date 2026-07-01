import { pgTable, text, integer, date } from "drizzle-orm/pg-core";

export const scanUsageTable = pgTable(
  "scan_usage",
  {
    userId: text("user_id").notNull(),
    scanDate: date("scan_date").notNull().defaultNow(),
    count: integer("count").notNull().default(0),
  },
);

export type ScanUsageRow = typeof scanUsageTable.$inferSelect;
